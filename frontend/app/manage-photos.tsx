import { useCallback, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  ScrollView,
  ActivityIndicator,
  Alert,
  useWindowDimensions,
} from 'react-native';
import { Image } from 'expo-image';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useFocusEffect } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useGuardedRouter } from '../utils/useGuardedRouter';
import { profileAPI, attachmentAPI } from '../utils/api';
import { usePhotoUpload, MAX_PHOTOS } from '../utils/usePhotoUpload';
import PhotoCropper from '../components/PhotoCropper';
import ConfirmSheet from '../components/ConfirmSheet';
import { colors, font, radius, spacing } from '../components/theme';
import Loader from '../components/Loader';

type Photo = { id: number; url: string; isPrimary?: boolean };

/**
 * Manage the photos on your profile.
 *
 * Separated from the profile screen because the two want opposite things. The
 * profile shows one photo large and read-only; this needs every photo at once,
 * small, each with its own actions. Cramming both into the header meant a
 * camera button that added a photo and no way at all to remove one or choose
 * which one people see first.
 */
export default function ManagePhotosScreen() {
  const router = useGuardedRouter();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();

  const [photos, setPhotos] = useState<Photo[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<number | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<Photo | null>(null);

  const load = useCallback(async () => {
    try {
      const res = await profileAPI.getMe();
      // profileImageDetails carries the id and the primary flag; profileImages
      // is only urls, which is not enough to act on any of them.
      setPhotos(res.data?.profileImageDetails ?? []);
    } catch {
      // Leaving the previous list on screen beats blanking it - a failed
      // refresh should not look like "you have no photos".
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  const { pick, uploading, cropperProps } = usePhotoUpload({
    count: photos.length,
    onUploaded: load,
  });

  const makePrimary = async (photo: Photo) => {
    if (photo.isPrimary) return;

    // Optimistic: the whole point of the screen is seeing the change land.
    const before = photos;
    setPhotos((p) => p.map((x) => ({ ...x, isPrimary: x.id === photo.id })));
    setBusyId(photo.id);
    try {
      await attachmentAPI.setPrimaryImage(photo.id);
    } catch (e: any) {
      setPhotos(before);
      Alert.alert('Could not update', e?.response?.data?.detail || 'Please try again.');
    } finally {
      setBusyId(null);
    }
  };

  const remove = async () => {
    const photo = confirmDelete;
    setConfirmDelete(null);
    if (!photo) return;

    setBusyId(photo.id);
    try {
      const res = await attachmentAPI.deleteImage(photo.id);
      const promoted = res.data?.newPrimaryId ?? null;
      setPhotos((p) =>
        p.filter((x) => x.id !== photo.id)
          .map((x) => (promoted && x.id === promoted ? { ...x, isPrimary: true } : x))
      );
    } catch (e: any) {
      Alert.alert('Could not delete', e?.response?.data?.detail || 'Please try again.');
    } finally {
      setBusyId(null);
    }
  };

  // Two per row, so a face is big enough to judge - which is the whole reason
  // someone opens this screen.
  const tile = (width - spacing.lg * 2 - spacing.md) / 2;
  const full = photos.length >= MAX_PHOTOS;

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.topBar}>
        <Pressable onPress={() => router.back()} hitSlop={10} accessibilityLabel="Go back">
          <Ionicons name="chevron-back" size={26} color={colors.text} />
        </Pressable>
      </View>

      <ScrollView contentContainerStyle={styles.body}>
        <Text style={styles.title}>Photos</Text>
        <Text style={styles.subtitle}>
          Tap a photo to make it your profile picture. You can add up to {MAX_PHOTOS}.
        </Text>

        {loading ? (
          <View style={{ marginTop: spacing.xl }}><Loader size={34} /></View>
        ) : (
          <View style={styles.grid}>
            {photos.map((photo) => (
              <Pressable
                key={photo.id}
                style={[styles.tile, { width: tile, height: tile * 1.25 }]}
                onPress={() => makePrimary(photo)}
                disabled={busyId != null}
                accessibilityRole="button"
                accessibilityLabel={
                  photo.isPrimary ? 'Profile picture' : 'Make this your profile picture'
                }
              >
                <Image source={{ uri: photo.url }} style={styles.image} contentFit="cover" />

                {photo.isPrimary && (
                  <View style={styles.primaryBadge}>
                    <Ionicons name="checkmark-circle" size={14} color={colors.white} />
                    <Text style={styles.primaryText}>Profile picture</Text>
                  </View>
                )}

                <Pressable
                  style={styles.deleteBtn}
                  onPress={() => setConfirmDelete(photo)}
                  disabled={busyId != null}
                  hitSlop={8}
                  accessibilityLabel="Delete this photo"
                >
                  <Ionicons name="trash-outline" size={16} color={colors.white} />
                </Pressable>

                {busyId === photo.id && (
                  <View style={styles.tileBusy}>
                    <ActivityIndicator color={colors.white} />
                  </View>
                )}
              </Pressable>
            ))}

            {!full && (
              <Pressable
                style={[styles.tile, styles.addTile, { width: tile, height: tile * 1.25 }]}
                onPress={pick}
                disabled={uploading}
                accessibilityRole="button"
                accessibilityLabel="Add a photo"
              >
                {uploading ? (
                  <Loader size={30} />
                ) : (
                  <>
                    <Ionicons name="add" size={30} color={colors.textMuted} />
                    <Text style={styles.addText}>Add photo</Text>
                  </>
                )}
              </Pressable>
            )}
          </View>
        )}

        {!loading && photos.length === 0 && (
          <Text style={styles.empty}>
            Profiles with photos get far more responses. Add one to get started.
          </Text>
        )}

        {full && <Text style={styles.hint}>You have reached the limit of {MAX_PHOTOS} photos.</Text>}
      </ScrollView>

      <ConfirmSheet
        visible={!!confirmDelete}
        title={
          confirmDelete?.isPrimary
            ? 'Delete your profile picture? The next photo will take its place.'
            : 'Delete this photo?'
        }
        confirmLabel="Delete"
        cancelLabel="Cancel"
        onCancel={() => setConfirmDelete(null)}
        onConfirm={remove}
      />

      <PhotoCropper {...cropperProps} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.white },
  topBar: { paddingHorizontal: spacing.lg, paddingVertical: spacing.md },
  body: { paddingHorizontal: spacing.lg, paddingBottom: spacing.xl },
  title: { fontSize: 26, fontWeight: '700', color: colors.text },
  subtitle: { fontSize: font.body, color: '#6B7280', marginTop: spacing.sm, lineHeight: 19 },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.md,
    marginTop: spacing.lg,
  },
  tile: {
    borderRadius: radius.md,
    overflow: 'hidden',
    backgroundColor: colors.bg,
  },
  image: { width: '100%', height: '100%' },
  primaryBadge: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    paddingVertical: 6,
    // Same red as the "New" tag on the home rails, so every badge that marks
    // a fact about the profile (new here, primary photo there) reads as one
    // family of tags rather than one pink and one red.
    backgroundColor: colors.danger,
  },
  primaryText: { color: colors.white, fontSize: font.small, fontWeight: '600' },
  deleteBtn: {
    position: 'absolute',
    top: spacing.sm,
    right: spacing.sm,
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  tileBusy: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0,0,0,0.35)',
  },
  addTile: {
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: colors.border,
    backgroundColor: 'transparent',
  },
  addText: { color: colors.textMuted, fontSize: font.small, fontWeight: '600', marginTop: 4 },
  empty: {
    fontSize: font.body,
    color: colors.textFaint,
    textAlign: 'center',
    marginTop: spacing.xl,
    lineHeight: 19,
  },
  hint: {
    fontSize: font.small,
    color: colors.textFaint,
    textAlign: 'center',
    marginTop: spacing.lg,
  },
});

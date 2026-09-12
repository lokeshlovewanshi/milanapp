import { useCallback, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  ScrollView,
  Switch,
  Alert,
} from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFocusEffect } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useGuardedRouter } from '../utils/useGuardedRouter';
import { profileAPI } from '../utils/api';
import { unregisterPush } from '../utils/notifications';
import { clearConnections } from '../utils/useConnections';
import ConfirmSheet from '../components/ConfirmSheet';
import { colors, font, spacing } from '../components/theme';
import Loader from '../components/Loader';

/**
 * Hiding and deleting, on one screen because members reach for them in the same
 * moment - and because putting them side by side is what makes the difference
 * between them legible.
 *
 * They are deliberately not styled alike. Hiding is a switch: reversible, no
 * confirmation beyond the sheet, and the copy says the account survives.
 * Deleting is a bare destructive row at the bottom with a long, specific
 * confirmation, because someone who taps it and did not mean it has lost their
 * photos, their connections and their history.
 */
export default function HideDeleteProfileScreen() {
  const router = useGuardedRouter();
  const insets = useSafeAreaInsets();

  const [hidden, setHidden] = useState(false);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [confirmingHide, setConfirmingHide] = useState(false);
  const [confirmingDelete, setConfirmingDelete] = useState(false);

  // Re-read on focus rather than once on mount: the member may have changed
  // this on another device, and a stale switch here would silently send the
  // opposite of what they intended.
  useFocusEffect(
    useCallback(() => {
      let active = true;
      profileAPI
        .getMe()
        .then((res) => {
          if (active) setHidden(Boolean(res.data?.hidden));
        })
        .catch(() => {})
        .finally(() => {
          if (active) setLoading(false);
        });
      return () => {
        active = false;
      };
    }, [])
  );

  const applyHidden = async () => {
    setConfirmingHide(false);
    const next = !hidden;

    setHidden(next); // optimistic - reverted below if the call fails
    setBusy(true);
    try {
      await profileAPI.setHidden(next);
    } catch (error: any) {
      setHidden(!next);
      Alert.alert('Could not update', error?.response?.data?.detail || 'Please try again.');
    } finally {
      setBusy(false);
    }
  };

  const applyDelete = async () => {
    setConfirmingDelete(false);
    setBusy(true);
    try {
      await profileAPI.deleteAccount();
      // Detach the device before clearing storage, or this phone keeps
      // receiving pushes for an account that no longer exists.
      await unregisterPush();
      await AsyncStorage.clear();
      clearConnections();
      router.replace('/');
    } catch (error: any) {
      Alert.alert('Could not delete', error?.response?.data?.detail || 'Please try again.');
      setBusy(false);
    }
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.topBar}>
        <Pressable onPress={() => router.back()} hitSlop={10} accessibilityLabel="Go back">
          <Ionicons name="chevron-back" size={26} color={colors.text} />
        </Pressable>
      </View>

      <ScrollView contentContainerStyle={styles.body}>
        <Text style={styles.title}>Hide / Delete Profile</Text>

        {loading ? (
          <View style={{ marginTop: spacing.xl }}><Loader size={34} /></View>
        ) : (
          <>
            <Text style={styles.sectionLabel}>Visibility</Text>

            <View style={styles.card}>
              <View style={styles.cardRow}>
                <View style={styles.cardText}>
                  <Text style={styles.cardTitle}>Hide my profile</Text>
                  <Text style={styles.cardBody}>
                    You stop appearing in browse and search. Your photos, connections and
                    messages stay exactly as they are, and you can turn this off whenever
                    you want.
                  </Text>
                </View>
                <Switch
                  value={hidden}
                  onValueChange={() => setConfirmingHide(true)}
                  disabled={busy}
                  trackColor={{ true: colors.accent, false: '#D1D5DB' }}
                  thumbColor={colors.white}
                />
              </View>

              {hidden && (
                <View style={styles.notice}>
                  <Ionicons name="eye-off-outline" size={16} color="#92400E" />
                  <Text style={styles.noticeText}>
                    Your profile is hidden. Nobody new can find you.
                  </Text>
                </View>
              )}
            </View>

            <Text style={styles.sectionLabel}>Danger zone</Text>

            <View style={styles.card}>
              <Text style={styles.cardTitle}>Delete my account</Text>
              <Text style={styles.cardBody}>
                Your profile stops being visible to anyone and you will be signed out.
                Connection requests you have sent or accepted will no longer show your
                details. This cannot be undone from the app - you would need to contact
                support.
              </Text>

              <Pressable
                style={({ pressed }) => [styles.deleteBtn, pressed && styles.rowPressed]}
                onPress={() => setConfirmingDelete(true)}
                disabled={busy}
                accessibilityRole="button"
              >
                <Text style={styles.deleteBtnText}>Delete my account</Text>
              </Pressable>
            </View>

            <Text style={styles.footnote}>
              Not sure? Hiding your profile does most of what deleting does, and you can
              undo it.
            </Text>
          </>
        )}
      </ScrollView>

      <ConfirmSheet
        visible={confirmingHide}
        title={
          hidden
            ? 'Make your profile visible again?'
            : 'Hide your profile from browse and search?'
        }
        confirmLabel={hidden ? 'Make visible' : 'Hide'}
        cancelLabel="Cancel"
        onCancel={() => setConfirmingHide(false)}
        onConfirm={applyHidden}
        softenConfirm
      />

      <ConfirmSheet
        visible={confirmingDelete}
        title="Delete your account? Your profile and photos will no longer be visible to anyone, and you will be signed out. This cannot be undone from the app."
        confirmLabel="Delete"
        cancelLabel="Cancel"
        onCancel={() => setConfirmingDelete(false)}
        onConfirm={applyDelete}
        softenConfirm
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.white },
  topBar: { paddingHorizontal: spacing.lg, paddingVertical: spacing.md },
  body: { paddingHorizontal: spacing.lg, paddingBottom: spacing.xl },
  title: { fontSize: 26, fontWeight: '700', color: colors.text },
  sectionLabel: {
    fontSize: font.small,
    color: '#9CA3AF',
    marginTop: spacing.xl,
    marginBottom: spacing.sm,
    fontWeight: '600',
  },
  card: {
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: '#E4E4E4',
    borderRadius: 14,
    padding: spacing.lg,
  },
  cardRow: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.md },
  cardText: { flex: 1 },
  cardTitle: { fontSize: font.title, fontWeight: '600', color: colors.text },
  cardBody: {
    fontSize: font.body,
    color: '#6B7280',
    marginTop: spacing.xs,
    lineHeight: 19,
  },
  notice: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: '#FEF3C7',
    borderRadius: 10,
    padding: spacing.md,
    marginTop: spacing.md,
  },
  noticeText: { flex: 1, fontSize: font.small, color: '#92400E' },
  // Outline rather than filled: destructive, but not competing for attention
  // with everything else on the screen.
  deleteBtn: {
    marginTop: spacing.lg,
    borderWidth: 1,
    borderColor: colors.danger,
    borderRadius: 12,
    paddingVertical: 13,
    alignItems: 'center',
  },
  deleteBtnText: { color: colors.danger, fontSize: font.title, fontWeight: '600' },
  rowPressed: { opacity: 0.6 },
  footnote: {
    fontSize: font.small,
    color: colors.textFaint,
    marginTop: spacing.xl,
    textAlign: 'center',
    lineHeight: 17,
  },
});

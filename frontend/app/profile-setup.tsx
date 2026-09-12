import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from 'react-native';
import FormScroll from '../components/FormScroll';
import { Image } from 'expo-image';
import { useState, useEffect, useCallback } from 'react';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useLocalSearchParams } from 'expo-router';
import { profileAPI } from '../utils/api';
import { useGuardedRouter } from '../utils/useGuardedRouter';
import { usePhotoUpload, MAX_PHOTOS } from '../utils/usePhotoUpload';
import PhotoCropper from '../components/PhotoCropper';
import SectionForm from '../components/SectionForm';
import { SECTIONS, SECTION_ORDER, buildPayload, missingRequiredKeys } from '../components/sectionSchema';
import { auth, colors, font, radius, spacing, photoHeight } from '../components/theme';
import Loader from '../components/Loader';

/** Server returns either a list or a single image, depending on the endpoint. */
const readPhotos = (data: any): string[] =>
  data?.profileImages?.length ? data.profileImages : data?.profileImage ? [data.profileImage] : [];

/**
 * The wizard's own order, not SECTION_ORDER.
 *
 * Photos come second, straight after who you are: a profile with a face gets
 * answered and one without mostly does not, so asking early is asking while
 * someone is still willing. About me is last because writing prose is the
 * highest-effort thing here, and an empty textarea on step one is where people
 * put the phone down.
 *
 * "other" is deliberately absent. Weight, complexion and blood group are worth
 * having and not worth blocking a new member on; they are reachable from the
 * profile screen once the account exists.
 */
const STEPS = ['basic', 'photos', 'education', 'religion', 'family', 'contact', 'about'] as const;

/** Thumbnails share the photo shape, so the grid previews the real crop. */
const THUMB_W = 104;
const THUMB_H = photoHeight(THUMB_W);

/**
 * Guided "complete your profile" flow.
 *
 * Every field and option list comes from sectionSchema and /reference/options -
 * the same source the edit sheets use. This screen previously carried its own
 * copies of the height, rashi, nakshatra, education, income, state and city
 * arrays, so adding a city to the database did not add it here, and the two
 * screens could disagree about what a valid value even was.
 *
 * Each step saves as you advance rather than everything at the end, so someone
 * who abandons halfway keeps what they filled in, and the completion score
 * climbs as they go.
 */
export default function ProfileSetupScreen() {
  const router = useGuardedRouter();
  const insets = useSafeAreaInsets();

  /**
   * Register navigates here with `replace`, so on the first run there is no
   * screen behind this one. `router.back()` then fell out of the stack to the
   * welcome route, which looked exactly like being signed out - and tapping
   * "Create new account" there really did start a second account.
   *
   * First run therefore offers Skip and goes to the feed; later visits, opened
   * from the profile tab, still just close.
   */
  const { first, step: stepParam } = useLocalSearchParams<{ first?: string; step?: string }>();
  const isFirstRun = first === '1';

  const exit = useCallback(() => {
    // router.back() assumes there is a previous screen in the stack. That is
    // true whenever this opened from within the app, but not if `first=1`
    // ever gets lost while this is the first screen - a web page refresh
    // mid-onboarding, say. canGoBack() catches that case rather than leaving
    // Done as a silent dead end.
    if (isFirstRun || !router.router.canGoBack()) router.replace('/(tabs)/home');
    else router.back();
  }, [isFirstRun, router]);

  // Lets a caller that already knows Basic details are done - the "Complete
  // your profile" card on Home - open straight on Photos instead of making
  // someone step back through a section they already filled in.
  const initialStep = (() => {
    const idx = STEPS.indexOf(stepParam as any);
    return idx >= 0 ? idx : 0;
  })();

  const [step, setStep] = useState(initialStep);
  const [values, setValues] = useState<Record<string, Record<string, any>>>({});
  const [errors, setErrors] = useState<Set<string>>(new Set());
  const [photos, setPhotos] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const refreshPhotos = useCallback(async () => {
    const me = await profileAPI.getMe();
    setPhotos(readPhotos(me.data));
  }, []);

  const { pick, uploading, cropperProps } = usePhotoUpload({
    count: photos.length,
    onUploaded: refreshPhotos,
  });


  const current = STEPS[step];
  const isPhotoStep = current === 'photos';
  const spec = isPhotoStep ? null : SECTIONS[current];

  // Load every section up front. A handful of small requests once beats a
  // spinner between each step of a flow the user is trying to get through.
  //
  // Fetched per ENDPOINT rather than per section, because sections no longer
  // map one-to-one onto them: "other" reads the same basic payload as "basic",
  // and "about" the same family payload as "family". Iterating sections would
  // ask the server for each of those twice and get the same bytes back.
  useEffect(() => {
    let alive = true;

    const endpoints = Array.from(new Set(SECTION_ORDER.map((key) => SECTIONS[key].get)));

    Promise.all(
      endpoints.map((get) =>
        profileAPI[get]()
          .then((res) => [get, res.data ?? {}] as const)
          .catch(() => [get, {}] as const)
      )
    )
      .then((entries) => {
        if (!alive) return;
        const byEndpoint = Object.fromEntries(entries);
        // Each section gets its own copy, so editing one never mutates the
        // other section that happens to share a payload.
        setValues(
          Object.fromEntries(
            SECTION_ORDER.map((key) => [key, { ...(byEndpoint[SECTIONS[key].get] ?? {}) }])
          )
        );
      })
      .finally(() => alive && setLoading(false));

    profileAPI
      .getMe()
      .then((res) => alive && setPhotos(readPhotos(res.data)))
      .catch(() => {});

    return () => {
      alive = false;
    };
  }, []);

  const set = useCallback(
    (key: string, value: any) => {
      if (!spec) return;
      setValues((prev) => ({
        ...prev,
        [spec.key]: { ...(prev[spec.key] ?? {}), [key]: value },
      }));
      setErrors((prev) => {
        if (!prev.has(key)) return prev;
        const next = new Set(prev);
        next.delete(key);
        return next;
      });
    },
    [spec]
  );

  /** Persist the current section, then move on. */
  const next = async () => {
    if (spec) {
      setSaving(true);
      try {
        const missing = missingRequiredKeys(spec, values[spec.key] ?? {});
        if (missing.length > 0) {
          setErrors(new Set(missing));
          setSaving(false);
          return;
        }
        setErrors(new Set());

        await profileAPI[spec.patch](buildPayload(spec, values[spec.key] ?? {}));
      } catch (error: any) {
        Alert.alert(
          'Could not save',
          error?.response?.data?.message || error?.response?.data?.detail || 'Please try again'
        );
        setSaving(false);
        return;
      }
      setSaving(false);
    }

    if (step < STEPS.length - 1) setStep(step + 1);
    else exit();
  };


  if (loading) {
    return (
      <View style={styles.center}>
        <Loader size={38} />
      </View>
    );
  }

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.topBar}>
        {step > 0 ? (
          <TouchableOpacity hitSlop={12} onPress={() => setStep(step - 1)} accessibilityLabel="Back">
            <Ionicons name="arrow-back" size={26} color={colors.heading} />
          </TouchableOpacity>
        ) : isFirstRun ? (
          // A word, not an X. Right after signing up, a close button reads as
          // "discard this account" - Skip says what actually happens.
          <TouchableOpacity hitSlop={12} onPress={exit} accessibilityLabel="Skip for now">
            <Text style={styles.skip}>Skip</Text>
          </TouchableOpacity>
        ) : (
          <TouchableOpacity hitSlop={12} onPress={exit} accessibilityLabel="Close">
            <Ionicons name="close" size={26} color={colors.heading} />
          </TouchableOpacity>
        )}
        <Text style={styles.stepCount}>
          Step {step + 1} of {STEPS.length}
        </Text>
      </View>

      {/* A filling bar reads as tangible movement; a bare counter does not. */}
      <View style={styles.track}>
        <View style={[styles.fill, { width: `${((step + 1) / STEPS.length) * 100}%` }]} />
      </View>

      <FormScroll contentContainerStyle={styles.scroll}>
        <Text style={styles.title}>{spec ? spec.title : 'Your photos'}</Text>
        <Text style={styles.subtitle}>
          {spec ? spec.subtitle : 'Profiles with a photo get far more responses'}
        </Text>

        {spec ? (
          <SectionForm spec={spec} values={values[spec.key] ?? {}} onChange={set} errors={errors} />
        ) : (
          <View style={styles.photoGrid}>
            {photos.map((uri, i) => (
              <Image key={i} source={{ uri }} style={styles.photo} contentFit="cover" />
            ))}
            {photos.length < MAX_PHOTOS && (
              <TouchableOpacity
                style={styles.addPhoto}
                onPress={pick}
                disabled={uploading}
                activeOpacity={0.7}
              >
                {uploading ? (
                  <Loader size={38} />
                ) : (
                  <>
                    <Ionicons name="camera-outline" size={26} color={colors.textMuted} />
                    <Text style={styles.addPhotoText}>Add photo</Text>
                  </>
                )}
              </TouchableOpacity>
            )}
          </View>
        )}

        <View style={{ height: spacing.xl }} />
      </FormScroll>

      {/* Back sits beside Save rather than replacing it: the thumb is already
          down here, so stepping back costs one tap instead of a reach to the
          top-left corner. Icon-only and outlined, so it never competes with
          the primary action. */}
      <View style={[styles.footer, { paddingBottom: insets.bottom + spacing.md }]}>
        {step > 0 && (
          <TouchableOpacity
            style={styles.back}
            activeOpacity={0.7}
            onPress={() => setStep(step - 1)}
            disabled={saving}
            accessibilityLabel="Previous step"
          >
            <Ionicons name="arrow-back" size={22} color={colors.heading} />
          </TouchableOpacity>
        )}

        <TouchableOpacity
          style={[styles.save, saving && styles.saveDisabled]}
          activeOpacity={0.85}
          onPress={next}
          disabled={saving}
        >
          {saving ? (
            <ActivityIndicator color={colors.white} />
          ) : (
            <Text style={styles.saveText}>
              {step === STEPS.length - 1 ? 'Done' : 'Save & continue'}
            </Text>
          )}
        </TouchableOpacity>
      </View>

      <PhotoCropper {...cropperProps} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.bg },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
  },
  stepCount: { fontSize: font.body, color: colors.fieldLabel, fontWeight: '600' },
  skip: { fontSize: font.title, color: colors.brand, fontWeight: '600' },
  track: {
    height: 3,
    backgroundColor: colors.hairline,
    marginHorizontal: spacing.lg,
    borderRadius: 2,
    overflow: 'hidden',
  },
  fill: { height: 3, backgroundColor: auth.crimson },
  scroll: { paddingHorizontal: spacing.lg, paddingTop: spacing.lg, paddingBottom: spacing.xl },
  title: { fontSize: 26, fontWeight: 'bold', color: colors.heading, marginBottom: 4 },
  subtitle: { fontSize: font.label, color: colors.fieldLabel, marginBottom: spacing.sm },

  photoGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.md, marginTop: spacing.lg },
  photo: { width: THUMB_W, height: THUMB_H, borderRadius: 10, backgroundColor: colors.surface },
  addPhoto: {
    width: THUMB_W,
    height: THUMB_H,
    borderRadius: 10,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: colors.border,
    backgroundColor: 'transparent',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  addPhotoText: { fontSize: font.small, color: colors.textMuted, fontWeight: '600' },

  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    backgroundColor: colors.bg,
    borderTopWidth: 1,
    borderTopColor: colors.hairline,
  },
  back: {
    width: 54,
    height: 54,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  save: {
    flex: 1,
    height: 54,
    borderRadius: radius.sm,
    backgroundColor: auth.crimson,
    alignItems: 'center',
    justifyContent: 'center',
  },
  saveDisabled: { opacity: 0.6 },
  saveText: { color: colors.white, fontSize: 17, fontWeight: 'bold' },
});

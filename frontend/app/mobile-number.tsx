import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator } from 'react-native';
import { useEffect, useState } from 'react';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { profileAPI } from '../utils/api';
import { useGuardedRouter } from '../utils/useGuardedRouter';
import { HOME, WIZARD } from '../utils/afterAuth';
import FormScroll from '../components/FormScroll';
import SectionForm from '../components/SectionForm';
import Loader from '../components/Loader';
import { type SectionSpec } from '../components/sectionSchema';
import { auth, colors, font, radius, spacing } from '../components/theme';

/**
 * The first thing a new member is asked for, on its own screen.
 *
 * Mobile number is also a field on Basic details, and stays there so it can be
 * corrected later. This screen exists because it is the one detail worth
 * asking for before anything else - a profile nobody can be reached on is not
 * much use to a family looking at it - and asking for it alone, first, gets a
 * far better answer than burying it at the end of a long form.
 *
 * Deliberately NOT a step in the profile-setup wizard: it is shown once, on
 * the way out of sign-up, and never appears in "complete your profile". That
 * is also why there is no "Step 1 of N" counter - claiming a position in a
 * sequence this screen is not part of would be contradicted by the very next
 * screen, which calls itself step 1.
 *
 * Everything else is the wizard's own chrome, down to reusing SectionForm for
 * the field itself, so arriving at Basic details next feels like the same flow
 * rather than a different app.
 */

/**
 * A one-field slice of the `basic` section.
 *
 * Points at the same get/patch pair, so what is saved here is read straight
 * back by the wizard's Basic details step and shown already filled in - the
 * number is asked for once, not twice.
 */
const MOBILE_SPEC: SectionSpec = {
  key: 'basic',
  title: 'Contact Number',
  subtitle: 'So families can reach you about your profile',
  get: 'getBasicInfo',
  patch: 'updateBasicInfo',
  fields: [
    {
      key: 'mobileNo',
      label: 'Mobile number / मोबाइल नंबर',
      kind: 'text',
      keyboard: 'phone-pad',
      placeholder: '10-digit number',
      required: true,
    },
  ],
};

export default function MobileNumberScreen() {
  const router = useGuardedRouter();
  const insets = useSafeAreaInsets();

  const [values, setValues] = useState<Record<string, any>>({});
  const [errors, setErrors] = useState<Set<string>>(new Set());
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);

  // Anyone who already has a number goes straight past this. destinationFor
  // sends every unfinished profile here, not only new ones - someone who
  // signed up weeks ago and stopped halfway should not be asked again for
  // something they have already given.
  useEffect(() => {
    let cancelled = false;
    profileAPI
      .getBasicInfo()
      .then((res) => {
        if (cancelled) return;
        if (res?.data?.mobileNo) {
          router.replace(WIZARD);
          return;
        }
        setLoading(false);
      })
      .catch(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
  }, [router]);

  const set = (key: string, value: any) => {
    setValues((prev) => ({ ...prev, [key]: value }));
    if (errors.size) setErrors(new Set());
  };

  const save = async () => {
    // Ten digits, never starting below 6 - the range Indian mobile numbers
    // actually use.
    const digits = String(values.mobileNo ?? '').replace(/\D/g, '');
    if (!/^[6-9]\d{9}$/.test(digits)) {
      setErrors(new Set(['mobileNo']));
      return;
    }

    setSaving(true);
    try {
      await profileAPI.updateBasicInfo({ mobileNo: digits });
    } catch {
      // Deliberately swallowed. The number is asked for again on Basic
      // details, which is the very next screen, so a failed save here must not
      // trap anyone on the first screen of the app.
    } finally {
      setSaving(false);
      router.replace(WIZARD);
    }
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
        {/* A word, not an X - the wizard's own reasoning: right after signing
            up, a close button reads as "discard this account". */}
        <TouchableOpacity hitSlop={12} onPress={() => router.replace(HOME)} accessibilityLabel="Skip for now">
          <Text style={styles.skip}>Skip</Text>
        </TouchableOpacity>
      </View>

      <FormScroll contentContainerStyle={styles.scroll}>
        <Text style={styles.title}>{MOBILE_SPEC.title}</Text>
        <Text style={styles.subtitle}>{MOBILE_SPEC.subtitle}</Text>

        <SectionForm spec={MOBILE_SPEC} values={values} onChange={set} errors={errors} />

        <View style={{ height: spacing.xl }} />
      </FormScroll>

      <View style={[styles.footer, { paddingBottom: insets.bottom + spacing.md }]}>
        <TouchableOpacity
          style={[styles.save, saving && styles.saveDisabled]}
          activeOpacity={0.85}
          onPress={save}
          disabled={saving}
        >
          {saving ? (
            <ActivityIndicator color={colors.white} />
          ) : (
            <Text style={styles.saveText}>Save &amp; continue</Text>
          )}
        </TouchableOpacity>
      </View>
    </View>
  );
}

// Taken from profile-setup verbatim, so the two screens cannot drift apart.
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
  skip: { fontSize: font.title, color: colors.brand, fontWeight: '600' },
  scroll: { paddingHorizontal: spacing.lg, paddingTop: spacing.lg, paddingBottom: spacing.xl },
  title: { fontSize: 26, fontWeight: 'bold', color: colors.heading, marginBottom: 4 },
  subtitle: { fontSize: font.label, color: colors.fieldLabel, marginBottom: spacing.sm },
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

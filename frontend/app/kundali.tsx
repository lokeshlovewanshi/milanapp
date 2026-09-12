import { useCallback, useMemo, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator, Alert } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useFocusEffect } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useGuardedRouter } from '../utils/useGuardedRouter';
import { profileAPI } from '../utils/api';
import FormScroll from '../components/FormScroll';
import SectionForm from '../components/SectionForm';
import KundaliCard from '../components/KundaliCard';
import { SECTIONS } from '../components/sectionSchema';
import { shareKundali } from '../utils/shareProfile';
import { colors, font, radius, spacing, auth, serif } from '../components/theme';
import Loader from '../components/Loader';

/**
 * The three fields a chart cannot be calculated without, in the order someone
 * would say them: the date, the time, then the place.
 *
 * Taken from the existing sections rather than redeclared, so the birth-place
 * picker keeps its city list and its coordinates and the date keeps its picker.
 * A hand-rolled copy here would be free-text boxes, and free text is how that
 * column came to hold "Nihal" - a name a kundali cannot be computed from.
 *
 * They do not live together: the date of birth is part of Basic details and the
 * other two are part of Religion, so this screen reads and writes two
 * endpoints. That split is the profile's, not this screen's, and hiding it here
 * is better than making someone visit two forms to generate one chart.
 */
const BASIC_FIELDS = ['dateOfBirth'] as const;
const RELIGION_FIELDS = ['timeOfBirth', 'placeOfBirth'] as const;
const REQUIRED = [...BASIC_FIELDS, ...RELIGION_FIELDS] as const;

/** What each missing field is called when the notice has to name it. */
const LABELS: Record<string, string> = {
  dateOfBirth: 'date of birth',
  timeOfBirth: 'birth time',
  placeOfBirth: 'birth place',
};

/** "a", "a and b", "a, b and c" - so the notice reads like a sentence. */
const listOf = (parts: string[]): string =>
  parts.length <= 1
    ? (parts[0] ?? '')
    : `${parts.slice(0, -1).join(', ')} and ${parts[parts.length - 1]}`;

/**
 * Kundali, on its own screen.
 *
 * Previously the only way in was to scroll to the bottom of your own profile,
 * and the only thing a member missing their birth time saw there was an error
 * telling them to go and edit a form they then had to find. This asks for
 * exactly the two missing fields and generates the chart in the same place.
 */
export default function KundaliScreen() {
  const router = useGuardedRouter();
  const insets = useSafeAreaInsets();

  const [values, setValues] = useState<Record<string, any>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  // Whether the three birth fields are actually saved on the server, as
  // opposed to merely typed into the form. Driving the form/chart switch off
  // this instead of off `missing` (computed from live, unsaved `values`) is
  // what keeps the chart from replacing the form the instant someone finishes
  // typing the third field, before Save has ever been pressed - which used to
  // both look like an unwanted navigation and skip persisting the details.
  const [persisted, setPersisted] = useState(false);

  const load = useCallback(async () => {
    try {
      // Both sections, in parallel - one of the three fields lives in each, and
      // waiting for them in turn would double the wait for no reason.
      const [basic, religion] = await Promise.all([
        profileAPI.getBasicInfo().catch(() => null),
        profileAPI.getReligionInfo().catch(() => null),
      ]);
      const merged = { ...(basic?.data ?? {}), ...(religion?.data ?? {}) };
      setValues(merged);
      setPersisted(
        REQUIRED.every((key) => {
          const v = merged[key];
          return v !== null && v !== undefined && String(v).trim() !== '';
        })
      );
    } catch {
      // An empty form is the right fallback: it asks for the three fields,
      // which is what someone with no record needs anyway.
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  const missing = useMemo(
    () => REQUIRED.filter((key) => {
      const v = values[key];
      return v === null || v === undefined || String(v).trim() === '';
    }),
    [values]
  );

  const spec = useMemo(() => {
    const pick = (section: keyof typeof SECTIONS, keys: readonly string[]) =>
      SECTIONS[section].fields.filter((f) => keys.includes(f.key));

    return {
      ...SECTIONS.religion,
      title: 'Birth details',
      subtitle: 'A kundali is calculated from these three',
      // Ordered date, time, place rather than section by section - this is one
      // form to the person filling it in, not a seam between two profiles.
      fields: [
        ...pick('basic', BASIC_FIELDS),
        ...pick('religion', RELIGION_FIELDS),
      ],
    };
  }, []);

  const save = async () => {
    setSaving(true);
    try {
      // Two patches, because the fields belong to two sections. Both endpoints
      // ignore any key that is absent, so sending one field does not disturb
      // the rest of either section.
      await Promise.all([
        profileAPI.updateBasicInfo({ dateOfBirth: values.dateOfBirth ?? null }),
        profileAPI.updateReligionInfo({
          placeOfBirth: values.placeOfBirth ?? null,
          timeOfBirth: values.timeOfBirth ?? null,
        }),
      ]);

      try {
        // Generated right away so "Save & Generate" does what it says. A
        // failure here (an unrecognised place, say) is not fatal to the save -
        // KundaliCard's own Generate button, shown once persisted flips true,
        // covers the retry.
        await profileAPI.generateKundali();
      } catch {
        // Swallowed deliberately - see above.
      }

      // Re-read rather than trusting local state: the server normalises the
      // birth place to a known city, and the chart is calculated from that.
      // This is also what flips `persisted`, swapping the form for the chart.
      await load();
    } catch (e: any) {
      Alert.alert('Could not save', e?.response?.data?.detail || 'Please try again.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.topBar}>
        <TouchableOpacity
          style={styles.back}
          hitSlop={10}
          onPress={() => router.back()}
          accessibilityLabel="Go back"
        >
          <Ionicons name="arrow-back" size={20} color={auth.crimson} />
        </TouchableOpacity>
        <Text style={styles.title}>Kundali</Text>
        {persisted ? (
          <TouchableOpacity
            style={styles.back}
            hitSlop={10}
            onPress={() => shareKundali(values)}
            accessibilityLabel="Share Kundali"
          >
            <Ionicons name="share-social" size={19} color={auth.crimson} />
          </TouchableOpacity>
        ) : (
          <View style={styles.back} />
        )}
      </View>

      {loading ? (
        <View style={styles.center}>
          <Loader size={38} />
        </View>
      ) : !persisted ? (
        <FormScroll contentContainerStyle={styles.form}>
          {missing.length > 0 && (
            <View style={styles.notice}>
              <Ionicons name="information-circle-outline" size={18} color={auth.maroon} />
              <Text style={styles.noticeText}>
                {`Add your ${listOf(missing.map((k) => LABELS[k] ?? k))} to generate your kundali.`}
              </Text>
            </View>
          )}

          <SectionForm
            spec={spec as any}
            values={values}
            onChange={(key: string, value: any) =>
              setValues((prev) => ({ ...prev, [key]: value }))
            }
          />

          <TouchableOpacity activeOpacity={0.9} onPress={save} disabled={saving}>
            <LinearGradient
              colors={[auth.crimson, auth.crimsonDeep]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={[styles.cta, saving && styles.dim]}
            >
              {saving ? (
                <ActivityIndicator color={colors.white} size="small" />
              ) : (
                <Ionicons name="sparkles" size={18} color={colors.white} />
              )}
              <Text style={styles.ctaText}>
                {saving ? 'Saving…' : 'Save & Generate / बनाएं'}
              </Text>
            </LinearGradient>
          </TouchableOpacity>
        </FormScroll>
      ) : (
        <FormScroll contentContainerStyle={styles.form}>
          {/* Both fields present, so the card can do its own thing - it fetches
              a stored chart and only calls the Lambda when there is none. */}
          <KundaliCard />

          <TouchableOpacity
            style={styles.editLink}
            onPress={() => router.push('/edit-profile?section=religion')}
          >
            <Ionicons name="create-outline" size={15} color={auth.crimson} />
            <Text style={styles.editText}>Edit birth details</Text>
          </TouchableOpacity>
        </FormScroll>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.sm,
  },
  back: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.white,
  },
  title: { fontFamily: serif, fontSize: 22, color: auth.maroon },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  // spacing.lg horizontally, the same inset edit-profile uses. SectionForm
  // draws its rows full-bleed and expects the screen to provide the margin, so
  // without this the labels and inputs sit hard against the left edge.
  form: { paddingHorizontal: spacing.lg, paddingBottom: spacing.xl },

  notice: {
    flexDirection: 'row',
    gap: spacing.sm,
    alignItems: 'flex-start',
    backgroundColor: '#FDE7EA',
    borderRadius: radius.md,
    padding: spacing.md,
    marginBottom: spacing.sm,
  },
  noticeText: { flex: 1, fontSize: font.small, color: auth.maroon, lineHeight: 18 },

  cta: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    height: 52,
    borderRadius: radius.md,
    marginTop: spacing.lg,
  },
  dim: { opacity: 0.7 },
  ctaText: { color: colors.white, fontSize: 17, fontWeight: '700' },

  editLink: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: spacing.lg,
  },
  editText: { color: auth.crimson, fontSize: font.body, fontWeight: '600' },
});

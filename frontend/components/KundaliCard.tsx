import { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  ActivityIndicator,
  useWindowDimensions,
} from 'react-native';
import { SvgXml } from 'react-native-svg';
import { Image } from 'expo-image';
import Ionicons from '@expo/vector-icons/Ionicons';
import { profileAPI } from '../utils/api';
import { shareKundali } from '../utils/shareProfile';
import { auth, colors, font, radius, spacing } from './theme';
import Loader from './Loader';

const KUNDALI_ICON = require('../assets/images/kundali-icon.png');

type Kundali = {
  ascendant?: { rashi?: string; rashi_en?: string; degree_in_sign?: number };
  moon_sign?: string;
  nakshatra?: string;
  nakshatra_pada?: number;
  manglik?: boolean;
  manglik_rule?: string;
  svg?: string;
  planets?: { name: string; label: string; rashi: string; house: number; retrograde?: boolean }[];
};

/**
 * Birth chart, generated on demand.
 *
 * Not fetched with the rest of the profile: it needs a Lambda round trip that
 * can cold-start into a couple of seconds, and most visits to this screen are
 * not about the kundali. So it stays a button until someone asks for it, and
 * the screen stays fast for everyone else.
 *
 * The chart arrives as SVG from the Lambda and is rendered with SvgXml rather
 * than redrawn here. Redrawing would mean reimplementing the north Indian
 * house layout in React Native and keeping two versions of that geometry in
 * step - the sort of duplication that quietly diverges.
 */
export default function KundaliCard() {
  const { width } = useWindowDimensions();
  const [chart, setChart] = useState<Kundali | null>(null);
  const [loading, setLoading] = useState(false);
  // True while the mount-time fetch runs, so the card shows a spinner rather
  // than flashing the Generate button at someone whose chart already exists.
  const [checking, setChecking] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // A generated chart is stored server-side, keyed to the birth details it was
  // calculated from. Fetch it up front so a kundali generated once is simply
  // there on every later visit - the button is only for the first time (or
  // when the fetch fails, where it doubles as a retry).
  useEffect(() => {
    let alive = true;
    profileAPI
      .getKundali()
      .then((res) => {
        if (alive && res.data?.svg) setChart(res.data);
      })
      .catch(() => {
        // No stored chart, missing birth details, or the chart service is
        // down. All three resolve to the same screen: the Generate button,
        // whose own error handling names the real problem when pressed.
      })
      .finally(() => {
        if (alive) setChecking(false);
      });
    return () => {
      alive = false;
    };
  }, []);

  const generate = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await profileAPI.generateKundali();
      setChart(res.data);
    } catch (e: any) {
      // The server's message is the useful one here - it names the field to
      // fill in ("Add your time of birth...") or the place it did not
      // recognise. A generic "something went wrong" would send the member
      // hunting.
      setError(
        e?.response?.data?.detail ||
          e?.response?.data?.message ||
          'Could not generate your kundali. Please try again.'
      );
    } finally {
      setLoading(false);
    }
  };

  // Square, and never wider than the card. The Lambda draws on a 400x400
  // viewBox, so it scales cleanly to whatever this is.
  const size = Math.min(width - spacing.lg * 4, 340);

  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <Image source={KUNDALI_ICON} style={styles.icon} contentFit="contain" />
        <View style={styles.headerText}>
          <Text style={styles.title}>Kundali</Text>
          <Text style={styles.subtitle}>
            North Indian birth chart from your date, time and place of birth
          </Text>
        </View>
      </View>

      {checking ? (
        <View style={styles.checking}>
          <Loader size={34} />
        </View>
      ) : chart?.svg ? (
        <>
          <View style={styles.chartWrap}>
            <SvgXml xml={chart.svg} width={size} height={size} />
          </View>

          <View style={styles.facts}>
            <Fact label="Lagna" value={chart.ascendant?.rashi} />
            <Fact label="Rashi" value={chart.moon_sign} />
            <Fact
              label="Nakshatra"
              value={
                chart.nakshatra
                  ? `${chart.nakshatra}${chart.nakshatra_pada ? ` (${chart.nakshatra_pada})` : ''}`
                  : undefined
              }
            />
            <Fact label="Manglik" value={chart.manglik === undefined ? undefined : chart.manglik ? 'Yes' : 'No'} />
          </View>

          {/* Families disagree on the manglik rule - some drop the 2nd house,
              some add the 5th - so the rule used is shown rather than
              presenting the answer as settled fact. */}
          {!!chart.manglik_rule && <Text style={styles.rule}>{chart.manglik_rule}</Text>}

          <View style={styles.actionRow}>
            <Pressable
              style={({ pressed }) => [styles.shareBtn, pressed && styles.pressed]}
              onPress={() => shareKundali({}, chart)}
              accessibilityRole="button"
              accessibilityLabel="Share Kundali"
            >
              <Ionicons name="share-social" size={16} color={colors.white} />
              <Text style={styles.shareBtnText}>Share Kundali / जन्म पत्रिका शेयर करें</Text>
            </Pressable>

            <Pressable onPress={generate} disabled={loading} style={styles.regen}>
              <Text style={styles.regenText}>
                {loading ? 'Generating…' : 'Regenerate'}
              </Text>
            </Pressable>
          </View>
        </>
      ) : (
        <>
          <Pressable
            style={({ pressed }) => [styles.button, pressed && styles.pressed, loading && styles.disabled]}
            onPress={generate}
            disabled={loading}
            accessibilityRole="button"
          >
            {loading ? (
              <ActivityIndicator color={colors.white} size="small" />
            ) : (
              <Ionicons name="sparkles" size={16} color={colors.white} />
            )}
            <Text style={styles.buttonText}>
              {loading ? 'Generating your chart…' : 'Generate Kundali Chart'}
            </Text>
          </Pressable>

          {!!error && (
            <View style={styles.errorBox}>
              <Ionicons name="alert-circle-outline" size={16} color="#92400E" />
              <Text style={styles.errorText}>{error}</Text>
            </View>
          )}
        </>
      )}
    </View>
  );
}

function Fact({ label, value }: { label: string; value?: string }) {
  if (!value) return null;
  return (
    <View style={styles.fact}>
      <Text style={styles.factLabel}>{label}</Text>
      <Text style={styles.factValue}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.white,
    borderRadius: radius.lg,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: '#E4E4E4',
    padding: spacing.lg,
    marginTop: spacing.md,
  },
  header: { flexDirection: 'row', gap: spacing.sm, alignItems: 'flex-start' },
  icon: { width: 30, height: 30 },
  checking: { paddingVertical: spacing.xl, alignItems: 'center' },
  headerText: { flex: 1 },
  title: { fontSize: font.title, fontWeight: '700', color: colors.text },
  subtitle: { fontSize: font.small, color: '#6B7280', marginTop: 2, lineHeight: 16 },
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    backgroundColor: auth.crimsonLight,
    borderRadius: radius.md,
    paddingVertical: 13,
    marginTop: spacing.lg,
  },
  pressed: { opacity: 0.85 },
  disabled: { opacity: 0.7 },
  buttonText: { color: colors.white, fontSize: font.title, fontWeight: '600' },
  chartWrap: {
    alignItems: 'center',
    marginTop: spacing.lg,
    backgroundColor: '#FFFDF7',
    borderRadius: radius.md,
    paddingVertical: spacing.md,
  },
  facts: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: spacing.lg,
  },
  fact: { width: '50%', paddingVertical: spacing.sm },
  factLabel: { fontSize: font.small, color: '#9CA3AF' },
  factValue: { fontSize: font.body, color: colors.text, fontWeight: '600', marginTop: 1 },
  actionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: spacing.md,
    gap: spacing.sm,
  },
  shareBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#8B5CF6',
    borderRadius: radius.sm,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  shareBtnText: {
    color: colors.white,
    fontSize: 12,
    fontWeight: '700',
  },
  rule: { fontSize: font.small, color: colors.textFaint, marginTop: spacing.xs, lineHeight: 16 },
  regen: { alignSelf: 'center', paddingVertical: spacing.sm, paddingHorizontal: 8 },
  regenText: { color: colors.accent, fontSize: font.body, fontWeight: '600' },
  errorBox: {
    flexDirection: 'row',
    gap: spacing.sm,
    alignItems: 'flex-start',
    backgroundColor: '#FEF3C7',
    borderRadius: radius.md,
    padding: spacing.md,
    marginTop: spacing.md,
  },
  errorText: { flex: 1, fontSize: font.small, color: '#92400E', lineHeight: 17 },
});

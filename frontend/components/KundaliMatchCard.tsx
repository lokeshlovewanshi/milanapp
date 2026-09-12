import { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  ActivityIndicator,
  useWindowDimensions,
} from 'react-native';
import { Image } from 'expo-image';
import { SvgXml } from 'react-native-svg';
import Ionicons from '@expo/vector-icons/Ionicons';
import { profileAPI } from '../utils/api';
import { auth, colors, font, radius, spacing } from './theme';

const KUNDALI_ICON = require('../assets/images/kundali-icon.png');

type Koota = { name: string; score: number; max: number; detail: string };

type MatchResponse = {
  match?: {
    score: number;
    maximum: number;
    percentage: number;
    verdict: string;
    kootas: Koota[];
    note?: string;
    boy?: { nakshatra: string; rashi: string };
    girl?: { nakshatra: string; rashi: string };
  };
  theirs?: { svg?: string; moon_sign?: string; nakshatra?: string; manglik?: boolean;
             ascendant?: { rashi?: string } } | null;
  mine?: { manglik?: boolean } | null;
  theirName?: string;
};

/**
 * Guna milan against the profile being viewed, plus their chart.
 *
 * Generated on request rather than with the page. Matching may have to build
 * either chart first, which costs a Lambda round trip that can cold-start, and
 * most profile views are not about the horoscope.
 */
export default function KundaliMatchCard({
  profileId,
  name,
}: {
  profileId: string;
  name?: string | null;
}) {
  const { width } = useWindowDimensions();
  const [data, setData] = useState<MatchResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const run = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await profileAPI.matchKundali(profileId);
      setData(res.data);
    } catch (e: any) {
      // The server's message names the missing piece - whose birth details are
      // incomplete, or which birth place is not a known city - which is the
      // only thing the member can act on.
      setError(
        e?.response?.data?.detail ||
          e?.response?.data?.message ||
          'Could not match kundalis. Please try again.'
      );
    } finally {
      setLoading(false);
    }
  };

  const m = data?.match;
  const size = Math.min(width - spacing.lg * 4, 320);

  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <Ionicons name="sparkles" size={18} color={colors.accent} />
        <View style={styles.headerText}>
          <Text style={styles.title}>Kundali Milan</Text>
          <Text style={styles.subtitle}>
            Ashtakoota guna milan{name ? ` with ${name}` : ''}
          </Text>
        </View>
      </View>

      {!m ? (
        <>
          <Pressable
            style={({ pressed }) => [
              styles.kundaliActionCard,
              pressed && styles.pressed,
              loading && styles.dim,
            ]}
            onPress={run}
            disabled={loading}
            accessibilityRole="button"
            accessibilityLabel="Check Kundali Compatibility"
          >
            <View style={styles.iconWrap}>
              {loading ? (
                <ActivityIndicator size="small" color={colors.accent} />
              ) : (
                <Image source={KUNDALI_ICON} style={styles.kundaliIcon} contentFit="contain" />
              )}
            </View>
            <View style={styles.rowText}>
              <Text style={styles.rowTitle}>
                {loading ? 'Matching horoscopes...' : 'Check Kundali Compatibility'}
              </Text>
              <Text style={styles.rowSub}>
                Ashtakoota 36 Guna Milan & North Indian birth chart
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color={colors.textFaint} />
          </Pressable>

          {!!error && (
            <View style={styles.errorBox}>
              <Ionicons name="alert-circle-outline" size={16} color="#92400E" />
              <Text style={styles.errorText}>{error}</Text>
            </View>
          )}
        </>
      ) : (
        <>
          <View style={styles.scoreRow}>
            <Text style={styles.score}>{m.score}</Text>
            <Text style={styles.outOf}>/ {m.maximum}</Text>
            <View style={styles.verdictWrap}>
              <Text style={styles.verdict}>{m.verdict}</Text>
              <Text style={styles.pct}>{m.percentage}% compatible</Text>
            </View>
          </View>

          {/* A bar per koota, because the total hides which one is failing -
              and families care about which, not the sum. */}
          <View style={styles.kootas}>
            {m.kootas.map((k) => (
              <View key={k.name} style={styles.koota}>
                <Text style={styles.kootaName}>{k.name}</Text>
                <View style={styles.track}>
                  <View
                    style={[
                      styles.fill,
                      { width: `${(k.score / k.max) * 100}%` },
                      k.score === 0 && styles.fillZero,
                    ]}
                  />
                </View>
                <Text style={styles.kootaScore}>
                  {k.score}/{k.max}
                </Text>
              </View>
            ))}
          </View>

          {/* Ashtakoota does not score manglik at all - it is judged separately,
              and many families weigh it more heavily than the total. Leaving it
              off a 90% score would be the misleading thing to do. */}
          {(data?.theirs?.manglik || data?.mine?.manglik) && (
            <View style={styles.manglik}>
              <Ionicons name="information-circle-outline" size={16} color="#92400E" />
              <Text style={styles.manglikText}>
                {data?.mine?.manglik && data?.theirs?.manglik
                  ? 'Both charts are manglik.'
                  : data?.theirs?.manglik
                    ? `${name || 'This profile'} is manglik, you are not.`
                    : `You are manglik, ${name || 'this profile'} is not.`}{' '}
                Manglik dosha is judged separately and is not part of the 36 points.
              </Text>
            </View>
          )}

          {!!data?.theirs?.svg && (
            <>
              <Text style={styles.sectionLabel}>
                {name ? `${name}'s kundali` : 'Their kundali'}
              </Text>
              <View style={styles.chartWrap}>
                <SvgXml xml={data.theirs.svg} width={size} height={size} />
              </View>
              <View style={styles.facts}>
                <Fact label="Lagna" value={data.theirs.ascendant?.rashi} />
                <Fact label="Rashi" value={data.theirs.moon_sign} />
                <Fact label="Nakshatra" value={data.theirs.nakshatra} />
                <Fact
                  label="Manglik"
                  value={data.theirs.manglik === undefined ? undefined : data.theirs.manglik ? 'Yes' : 'No'}
                />
              </View>
            </>
          )}

          {!!m.note && <Text style={styles.note}>{m.note}</Text>}

          <Pressable onPress={run} disabled={loading} style={styles.again}>
            <Text style={styles.againText}>{loading ? 'Matching…' : 'Match again'}</Text>
          </Pressable>
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
  headerText: { flex: 1 },
  title: { fontSize: font.title, fontWeight: '700', color: colors.text },
  subtitle: { fontSize: font.small, color: '#6B7280', marginTop: 2 },
  kundaliActionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    backgroundColor: '#FFF8F9',
    borderWidth: 1,
    borderColor: '#FCE7F0',
    borderRadius: radius.md,
    padding: spacing.md,
    marginTop: spacing.md,
  },
  iconWrap: {
    width: 44,
    height: 44,
    borderRadius: radius.sm,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#FBD5E5',
  },
  kundaliIcon: { width: 30, height: 30 },
  rowText: { flex: 1 },
  rowTitle: { fontSize: font.body, fontWeight: '700', color: colors.text },
  rowSub: { fontSize: font.small - 1, color: colors.textMuted, marginTop: 2 },
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
  dim: { opacity: 0.7 },
  buttonText: { color: colors.white, fontSize: font.title, fontWeight: '600' },
  scoreRow: { flexDirection: 'row', alignItems: 'baseline', gap: spacing.xs, marginTop: spacing.lg },
  score: { fontSize: 40, fontWeight: '800', color: colors.accent },
  outOf: { fontSize: font.title, color: colors.textFaint },
  verdictWrap: { flex: 1, alignItems: 'flex-end' },
  verdict: { fontSize: font.title, fontWeight: '700', color: colors.text },
  pct: { fontSize: font.small, color: '#6B7280' },
  kootas: { marginTop: spacing.lg, gap: spacing.sm },
  koota: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  kootaName: { width: 96, fontSize: font.small, color: '#6B7280' },
  track: { flex: 1, height: 6, borderRadius: 3, backgroundColor: '#EFEFEF', overflow: 'hidden' },
  fill: { height: 6, borderRadius: 3, backgroundColor: colors.accent },
  // A zero koota is the thing families look for, so it is not just a short bar.
  fillZero: { backgroundColor: colors.danger },
  kootaScore: { width: 42, textAlign: 'right', fontSize: font.small, color: colors.text },
  manglik: {
    flexDirection: 'row',
    gap: spacing.sm,
    backgroundColor: '#FEF3C7',
    borderRadius: radius.md,
    padding: spacing.md,
    marginTop: spacing.lg,
  },
  manglikText: { flex: 1, fontSize: font.small, color: '#92400E', lineHeight: 17 },
  sectionLabel: {
    fontSize: font.small,
    color: '#9CA3AF',
    marginTop: spacing.xl,
    fontWeight: '600',
  },
  chartWrap: {
    alignItems: 'center',
    marginTop: spacing.sm,
    backgroundColor: '#FFFDF7',
    borderRadius: radius.md,
    paddingVertical: spacing.md,
  },
  facts: { flexDirection: 'row', flexWrap: 'wrap', marginTop: spacing.md },
  fact: { width: '50%', paddingVertical: spacing.xs },
  factLabel: { fontSize: font.small, color: '#9CA3AF' },
  factValue: { fontSize: font.body, color: colors.text, fontWeight: '600' },
  note: { fontSize: font.small, color: colors.textFaint, marginTop: spacing.lg, lineHeight: 16 },
  again: { alignSelf: 'flex-start', paddingVertical: spacing.md },
  againText: { color: colors.accent, fontSize: font.body, fontWeight: '600' },
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

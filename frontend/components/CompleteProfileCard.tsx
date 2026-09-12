import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import Svg, { Circle, Defs, LinearGradient as SvgGradient, Stop } from 'react-native-svg';
import Ionicons from '@expo/vector-icons/Ionicons';
import { colors, font, radius, spacing, auth, serif } from './theme';

const KUNDALI_ICON = require('../assets/images/kundali-icon.png');

const RING = 50;
const STROKE = 5;
const R = (RING - STROKE) / 2 - 2;
const CIRCUMFERENCE = 2 * Math.PI * R;

type Props = {
  /** 0-100. Drives the ring and the copy. */
  completion: number;
  onAddDetails: () => void;
  onKundali: () => void;
};

/**
 * The prompt a new member lands on: how complete their profile is, why it is
 * worth finishing, and the way in.
 *
 * Laid out in one column. The supplied design is two - benefits on the left, a
 * photograph and the kundali card on the right - which works at the width it
 * was drawn for and does not survive a 360dp phone: the right column alone was
 * 170dp, leaving the benefit text about 150dp to wrap "Your information is
 * always protected" into four lines. Stacked, every line has the full width and
 * the reading order is the same one the design intends.
 *
 * The couple photograph is left out for a different reason: HomeBanner shows
 * that same picture, and this card replaces it rather than sitting beside it,
 * so nothing is lost. Two of the same photograph on one screen would be.
 */
export default function CompleteProfileCard({ completion, onAddDetails, onKundali }: Props) {
  const pct = Math.max(0, Math.min(100, Math.round(completion)));
  // strokeDashoffset counts DOWN from the full circumference as the value
  // rises: the offset is the length of the gap, not the length of the arc.
  const offset = CIRCUMFERENCE * (1 - pct / 100);

  return (
    <LinearGradient
      colors={['#FFF9FB', '#FDECEF']}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={styles.card}
    >
      <View style={styles.headerRow}>
        <View style={styles.ringWrap}>
          <Svg width={RING} height={RING}>
            {/* A real gradient along the arc, not two flat halves - SVG can do
                this where a View cannot, which is why the ring is SVG. */}
            <Defs>
              <SvgGradient id="ringSweep" x1="0" y1="0" x2="1" y2="1">
                <Stop offset="0" stopColor="#F43F5E" />
                <Stop offset="1" stopColor="#E11D48" />
              </SvgGradient>
            </Defs>
            <Circle cx={RING / 2} cy={RING / 2} r={R} stroke="#FFE4E6" strokeWidth={STROKE} fill="none" />
            <Circle
              cx={RING / 2}
              cy={RING / 2}
              r={R}
              stroke="url(#ringSweep)"
              strokeWidth={STROKE}
              strokeDasharray={`${CIRCUMFERENCE}`}
              strokeDashoffset={`${offset}`}
              strokeLinecap="round"
              fill="none"
              // Without this the arc starts at three o'clock; a progress ring
              // that does not start at the top reads as a random slice.
              transform={`rotate(-90 ${RING / 2} ${RING / 2})`}
            />
          </Svg>
          <View style={styles.ringLabel}>
            <Text style={[styles.ringText, { color: '#E11D48' }]}>{pct}%</Text>
          </View>
        </View>

        <View style={styles.headerText}>
          <Text style={styles.title}>Complete your profile</Text>
          <Text style={styles.subtitle}>Add more details to get better matches</Text>
        </View>
      </View>

      <TouchableOpacity activeOpacity={0.9} onPress={onAddDetails} accessibilityRole="button">
        <LinearGradient
          colors={['#5B84C9', '#3260AE']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={styles.cta}
        >
          <Text style={styles.ctaText} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.8}>
            Complete Profile / प्रोफ़ाइल बनाएं
          </Text>
          <Ionicons name="arrow-forward" size={18} color={colors.white} />
        </LinearGradient>
      </TouchableOpacity>

      <TouchableOpacity
        style={styles.kundali}
        activeOpacity={0.9}
        onPress={onKundali}
        accessibilityRole="button"
      >
        <Image source={KUNDALI_ICON} style={styles.kundaliIcon} contentFit="contain" />

        <View style={styles.kundaliText}>
          <Text style={styles.kundaliTitle}>Generate Your Kundali / कुंडली बनाएं</Text>
          <Text style={styles.kundaliBody} numberOfLines={1}>
            Find your match with astrology
          </Text>
        </View>

        <Ionicons
          name="chevron-forward"
          size={22}
          color="#000000"
          style={styles.kundaliArrow}
        />
      </TouchableOpacity>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  card: {
    marginHorizontal: spacing.md,
    marginTop: spacing.md,
    borderRadius: radius.lg,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    shadowColor: '#B3124E',
    shadowOpacity: 0.12,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 8 },
    elevation: 5,
  },

  headerRow: { flexDirection: 'row', alignItems: 'center', marginBottom: spacing.sm },
  ringWrap: {
    width: RING,
    height: RING,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.sm,
  },
  ringLabel: { ...StyleSheet.absoluteFillObject, alignItems: 'center', justifyContent: 'center' },
  ringText: { fontSize: 12, fontWeight: '700', color: auth.iconRed },

  headerText: { flex: 1 },
  title: { fontFamily: serif, fontSize: 17, lineHeight: 21, color: auth.maroon },
  subtitle: { marginTop: 2, color: '#6B7280', fontSize: font.small, lineHeight: 16 },



  cta: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    height: 42,
    borderRadius: radius.md,
    marginTop: spacing.sm,
  },
  ctaText: { color: colors.white, fontSize: 15, fontWeight: '700' },

  kundali: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.white,
    borderRadius: radius.md,
    padding: spacing.sm,
    marginTop: spacing.sm,
    borderWidth: 1,
    borderColor: '#FCE7F0',
  },
  // The chart drawing carries its own gold frame, so no pink disc behind it -
  // a badge inside a badge just muddies both.
  kundaliIcon: { width: 38, height: 38, marginRight: spacing.sm },
  kundaliText: { flex: 1 },
  badge: {
    alignSelf: 'flex-start',
    backgroundColor: '#F1F1F1',
    color: '#6B7280',
    fontSize: 11,
    fontWeight: '700',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 999,
    overflow: 'hidden',
    marginBottom: 4,
  },
  kundaliTitle: { color: auth.maroon, fontSize: font.body, fontWeight: '700' },
  kundaliBody: { color: '#6B7280', fontSize: font.small, marginTop: 1, lineHeight: 16 },
  // Bare chevron, no disc behind it. The filled circle read as a second button
  // competing with the one above it, when the whole row is already the target.
  kundaliArrow: { marginLeft: spacing.sm },
});

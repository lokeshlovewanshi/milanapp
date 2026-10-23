import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useRouter } from 'expo-router';
import { colors, spacing } from './theme';

/**
 * Masthead banner on the home screen:
 * Royal, auspicious matrimony card celebrating the Lodha Parinay initiative.
 */
export default function HomeBanner() {
  const router = useRouter();

  return (
    <TouchableOpacity
      activeOpacity={0.92}
      onPress={() => router.push('/about')}
      accessibilityRole="button"
      accessibilityLabel="About Lodha Parinay"
      style={styles.wrapper}
    >
      <LinearGradient
        colors={['#A31B31', '#7F1123', '#4E0713']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.card}
      >
        {/* Background Decorative Rings / Traditional Watermark */}
        <View pointerEvents="none" style={styles.decoRingLarge} />
        <View pointerEvents="none" style={styles.decoRingMedium} />
        <View pointerEvents="none" style={styles.decoRingSmall} />
        <View pointerEvents="none" style={styles.decoRingBottom} />

        {/* Auspicious Emblem */}
        <View style={styles.badgeOuter}>
          <LinearGradient
            colors={['rgba(255, 235, 180, 0.35)', 'rgba(255, 255, 255, 0.12)']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.badgeInner}
          >
            <Ionicons name="heart" size={26} color="#FFF5F5" />
          </LinearGradient>
        </View>

        {/* Eyebrow Pill */}
        <View style={styles.pill}>
          <Ionicons name="sparkles" size={11} color="#FFDF99" style={{ marginRight: 4 }} />
          <Text style={styles.eyebrow}>लोधा समाज की अभिनव पहल</Text>
          <Ionicons name="sparkles" size={11} color="#FFDF99" style={{ marginLeft: 4 }} />
        </View>

        {/* Royal Title */}
        <Text style={styles.title}>लोधा परिणय</Text>

        {/* Golden Ornamental Rule */}
        <View style={styles.ornamentRow}>
          <View style={styles.ornamentLine} />
          <View style={styles.ornamentDiamond} />
          <View style={styles.ornamentLine} />
        </View>

        {/* Subtitle / Objective */}
        <Text style={styles.body}>
          समाज के युवक-युवतियों के परिचय एवं वैवाहिक संबंधों हेतु एक डिजिटल प्रकल्प।
        </Text>

        {/* Classy Footer Action Pill */}
        <View style={styles.actionPill}>
          <Text style={styles.actionText}>विस्तार से जानें</Text>
          <Ionicons name="chevron-forward" size={12} color="#FFF2EE" />
        </View>
      </LinearGradient>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    marginHorizontal: spacing.md,
    marginTop: spacing.md,
    borderRadius: 22,
    shadowColor: '#4E0713',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.28,
    shadowRadius: 12,
    elevation: 6,
  },
  card: {
    alignItems: 'center',
    paddingVertical: spacing.lg + 2,
    paddingHorizontal: spacing.lg,
    borderRadius: 22,
    borderWidth: 1.2,
    borderColor: 'rgba(255, 220, 160, 0.3)',
    overflow: 'hidden',
    position: 'relative',
  },

  /* Decorative Watermark Circles */
  decoRingLarge: {
    position: 'absolute',
    top: -45,
    right: -45,
    width: 170,
    height: 170,
    borderRadius: 85,
    borderWidth: 1.5,
    borderColor: 'rgba(255, 215, 130, 0.08)',
  },
  decoRingMedium: {
    position: 'absolute',
    top: -25,
    right: -25,
    width: 130,
    height: 130,
    borderRadius: 65,
    borderWidth: 1,
    borderColor: 'rgba(255, 215, 130, 0.12)',
  },
  decoRingSmall: {
    position: 'absolute',
    top: -5,
    right: -5,
    width: 90,
    height: 90,
    borderRadius: 45,
    borderWidth: 1,
    borderColor: 'rgba(255, 215, 130, 0.16)',
  },
  decoRingBottom: {
    position: 'absolute',
    bottom: -35,
    left: -35,
    width: 140,
    height: 140,
    borderRadius: 70,
    borderWidth: 1.2,
    borderColor: 'rgba(255, 215, 130, 0.09)',
  },

  /* Auspicious Badge */
  badgeOuter: {
    padding: 3,
    borderRadius: 30,
    backgroundColor: 'rgba(255, 220, 160, 0.25)',
    marginBottom: spacing.sm,
  },
  badgeInner: {
    width: 52,
    height: 52,
    borderRadius: 26,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 235, 190, 0.5)',
  },

  /* Eyebrow Pill */
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.12)',
    paddingHorizontal: 12,
    paddingVertical: 3.5,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 225, 160, 0.35)',
    marginBottom: 6,
  },
  eyebrow: {
    color: '#FFE2A8',
    fontSize: 12.5,
    fontWeight: '700',
    letterSpacing: 0.3,
  },

  /* Title */
  title: {
    color: colors.white,
    fontSize: 29,
    fontWeight: '900',
    textAlign: 'center',
    letterSpacing: 0.5,
    textShadowColor: 'rgba(0, 0, 0, 0.35)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 6,
  },

  /* Golden Ornament */
  ornamentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginTop: 6,
    marginBottom: 4,
  },
  ornamentLine: {
    width: 32,
    height: 1,
    backgroundColor: 'rgba(255, 225, 160, 0.5)',
  },
  ornamentDiamond: {
    width: 6,
    height: 6,
    transform: [{ rotate: '45deg' }],
    backgroundColor: '#FFE2A8',
  },

  /* Subtitle */
  body: {
    color: '#FFF2EE',
    fontSize: 13.5,
    textAlign: 'center',
    lineHeight: 21,
    marginTop: 6,
    paddingHorizontal: spacing.xs,
    maxWidth: 340,
    opacity: 0.95,
  },

  /* Action Pill */
  actionPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: spacing.md,
    paddingHorizontal: 12,
    paddingVertical: 4.5,
    borderRadius: 14,
    backgroundColor: 'rgba(255, 255, 255, 0.14)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.22)',
  },
  actionText: {
    color: '#FFF5F2',
    fontSize: 12,
    fontWeight: '700',
  },
});

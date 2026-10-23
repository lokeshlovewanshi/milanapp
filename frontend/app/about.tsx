import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useGuardedRouter } from '../utils/useGuardedRouter';
import { auth, colors, font, spacing } from '../components/theme';

export default function AboutScreen() {
  const router = useGuardedRouter();
  const insets = useSafeAreaInsets();

  return (
    <View style={[styles.screen, { paddingTop: insets.top }]}>
      <View style={styles.topBar}>
        <Pressable onPress={() => router.back()} hitSlop={12} accessibilityLabel="Go back">
          <Ionicons name="chevron-back" size={27} color={colors.text} />
        </Pressable>
        <Text style={styles.topTitle}>About Lodha Parinay</Text>
        <View style={styles.topSpacer} />
      </View>

      <ScrollView contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + spacing.xl }]}>
        <LinearGradient
          colors={['#A31B31', '#7F1123', '#4E0713']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.hero}
        >
          {/* Subtle Decorative Rings */}
          <View pointerEvents="none" style={styles.heroDecoRing} />
          <View pointerEvents="none" style={styles.heroDecoRing2} />

          <View style={styles.badgeOuter}>
            <LinearGradient
              colors={['rgba(255, 235, 180, 0.35)', 'rgba(255, 255, 255, 0.12)']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.heroIcon}
            >
              <Ionicons name="heart" size={28} color="#FFF5F5" />
            </LinearGradient>
          </View>

          <View style={styles.pill}>
            <Ionicons name="sparkles" size={11} color="#FFDF99" style={{ marginRight: 4 }} />
            <Text style={styles.eyebrow}>लोधा समाज की अभिनव पहल</Text>
            <Ionicons name="sparkles" size={11} color="#FFDF99" style={{ marginLeft: 4 }} />
          </View>

          <Text style={styles.heroTitle}>लोधा परिणय</Text>

          {/* Ornamental Divider */}
          <View style={styles.ornamentRow}>
            <View style={styles.ornamentLine} />
            <View style={styles.ornamentDiamond} />
            <View style={styles.ornamentLine} />
          </View>

          <Text style={styles.heroBody}>
            समाज के युवक-युवतियों के परिचय एवं वैवाहिक संबंधों हेतु एक डिजिटल प्रकल्प।
          </Text>
        </LinearGradient>

        <InfoCard icon="bulb-outline" title="परिकल्पना एवं प्रस्तुति">
          लोधा समाज शिक्षा फाउंडेशन, मध्यप्रदेश
        </InfoCard>

        <InfoCard icon="code-slash-outline" title="डिजाइन एवं डेवलपमेंट">
          इंजीनियर लोकेश पिता श्री हरिसिंह लववंशी{`\n`}
          ग्राम निहाल, सारंगपुर, जिला राजगढ़ (म.प्र.)
        </InfoCard>

        <View style={styles.sectionHeader}>
          <Ionicons name="people-outline" size={19} color={auth.crimson} />
          <Text style={styles.sectionTitle}>विशेष सहयोग</Text>
        </View>

        <View style={styles.supportCard}>
          <Text style={styles.supportName}>श्री हरिसिंह लववंशी</Text>
          <Text style={styles.supportRole}>संरक्षक सदस्य, लोधा समाज शिक्षा फाउंडेशन</Text>
          <View style={styles.rule} />
          <Text style={styles.supportBody}>
            श्री हरिसिंह लववंशी फाउंडेशन के संरक्षक सदस्य के रूप में संस्था के शैक्षणिक एवं सामाजिक उद्देश्यों के प्रति अपना सहयोग एवं सहभागिता प्रदान कर रहे हैं। उनके सुपुत्र इंजीनियर लोकेश लववंशी द्वारा युवक-युवतियों के परिचय एवं वैवाहिक संबंधों के उद्देश्य से इस डिजिटल प्रकल्प का डिजाइन एवं डेवलपमेंट किया गया है।
          </Text>
        </View>

        <Text style={styles.footer}>विश्वास • परिचय • जीवनसाथी</Text>
      </ScrollView>
    </View>
  );
}

function InfoCard({ icon, title, children }: { icon: keyof typeof Ionicons.glyphMap; title: string; children: React.ReactNode }) {
  return (
    <View style={styles.infoCard}>
      <View style={styles.infoIcon}>
        <Ionicons name={icon} size={20} color={auth.crimson} />
      </View>
      <View style={styles.infoText}>
        <Text style={styles.cardTitle}>{title}</Text>
        <Text style={styles.cardBody}>{children}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  topBar: {
    height: 54,
    paddingHorizontal: spacing.lg,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.white,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#E9E2DF',
  },
  topTitle: { fontSize: font.body, fontWeight: '700', color: colors.text },
  topSpacer: { width: 27 },
  content: { padding: spacing.lg, gap: spacing.md },
  hero: {
    alignItems: 'center',
    paddingVertical: spacing.xl,
    paddingHorizontal: spacing.lg,
    borderRadius: 22,
    borderWidth: 1.2,
    borderColor: 'rgba(255, 220, 160, 0.3)',
    overflow: 'hidden',
    position: 'relative',
    shadowColor: '#4E0713',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.28,
    shadowRadius: 12,
    elevation: 6,
  },
  heroDecoRing: {
    position: 'absolute',
    top: -40,
    right: -40,
    width: 160,
    height: 160,
    borderRadius: 80,
    borderWidth: 1.5,
    borderColor: 'rgba(255, 215, 130, 0.08)',
  },
  heroDecoRing2: {
    position: 'absolute',
    bottom: -30,
    left: -30,
    width: 130,
    height: 130,
    borderRadius: 65,
    borderWidth: 1.2,
    borderColor: 'rgba(255, 215, 130, 0.09)',
  },
  badgeOuter: {
    padding: 3,
    borderRadius: 34,
    backgroundColor: 'rgba(255, 220, 160, 0.25)',
    marginBottom: spacing.sm,
  },
  heroIcon: {
    width: 58,
    height: 58,
    borderRadius: 29,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 235, 190, 0.5)',
  },
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
  heroTitle: {
    color: colors.white,
    fontSize: 30,
    fontWeight: '900',
    textAlign: 'center',
    letterSpacing: 0.5,
    textShadowColor: 'rgba(0, 0, 0, 0.35)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 6,
  },
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
  heroBody: {
    color: '#FFF2EE',
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 22,
    marginTop: 6,
    maxWidth: 350,
  },
  infoCard: {
    flexDirection: 'row',
    gap: spacing.md,
    padding: spacing.lg,
    borderRadius: 16,
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: '#EEE6E3',
  },
  infoIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FCE9E5',
  },
  infoText: { flex: 1 },
  cardTitle: { color: auth.maroon, fontSize: 16, fontWeight: '800', marginBottom: 4 },
  cardBody: { color: colors.textMuted, fontSize: 14, lineHeight: 23 },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', gap: 7, marginTop: spacing.sm },
  sectionTitle: { color: auth.maroon, fontSize: 18, fontWeight: '800' },
  supportCard: {
    padding: spacing.lg,
    borderRadius: 16,
    backgroundColor: '#FFF9F7',
    borderLeftWidth: 4,
    borderLeftColor: auth.crimson,
  },
  supportName: { color: colors.text, fontSize: 17, fontWeight: '800' },
  supportRole: { color: auth.olive, fontSize: 13, fontWeight: '700', lineHeight: 20, marginTop: 3 },
  rule: { height: StyleSheet.hairlineWidth, backgroundColor: '#E8D9D4', marginVertical: spacing.md },
  supportBody: { color: colors.textMuted, fontSize: 14, lineHeight: 24 },
  footer: { color: auth.olive, fontSize: 13, textAlign: 'center', fontWeight: '700', marginTop: spacing.sm },
});

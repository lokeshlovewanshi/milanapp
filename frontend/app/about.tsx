import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
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
        <View style={styles.hero}>
          <View style={styles.heroIcon}>
            <Ionicons name="heart" size={32} color={colors.white} />
          </View>
          <Text style={styles.eyebrow}>लोधा समाज शिक्षा फाउंडेशन की अभिनव पहल</Text>
          <Text style={styles.heroTitle}>लोधा परिणय</Text>
          <Text style={styles.heroBody}>
            समाज के युवक-युवतियों के परिचय एवं वैवाहिक संबंधों हेतु एक डिजिटल प्रकल्प।
          </Text>
        </View>

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

function InfoCard({ icon, title, children }: { icon: keyof typeof Ionicons.glyphMap; title: string; children: string }) {
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
    padding: spacing.xl,
    borderRadius: 22,
    backgroundColor: auth.maroon,
  },
  heroIcon: {
    width: 62,
    height: 62,
    borderRadius: 31,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.16)',
    marginBottom: spacing.md,
  },
  eyebrow: { textAlign: 'center', color: '#F7D5CD', fontSize: 14, fontWeight: '700', lineHeight: 23 },
  heroTitle: { color: colors.white, fontSize: 29, fontWeight: '800', marginTop: 5 },
  heroBody: { color: '#FFF2EE', fontSize: 15, textAlign: 'center', lineHeight: 24, marginTop: spacing.sm },
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

import { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Linking } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useGuardedRouter } from '../utils/useGuardedRouter';
import { useMembership } from '../utils/membership';
import PlanPicker from '../components/PlanPicker';
import { VerifiedBadge } from '../components/BrandIcons';
import TrustRow from '../components/TrustRow';
import { auth, colors, font, radius, spacing } from '../components/theme';

/**
 * Membership plans.
 *
 * The plans themselves are PlanPicker, which the home feed also renders - the
 * pricing table is the same decision wherever someone meets it, and two copies
 * would eventually disagree about what Gold includes.
 */
export default function SubscriptionScreen() {
  const router = useGuardedRouter();
  const insets = useSafeAreaInsets();
  const { membership } = useMembership();

  const [openSafety, setOpenSafety] = useState(false);

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.topBar}>
        <TouchableOpacity
          style={styles.back}
          hitSlop={10}
          onPress={() => router.back()}
          accessibilityLabel="Go back"
        >
          <Ionicons name="arrow-back" size={22} color="#000000" />
        </TouchableOpacity>
        <Text style={styles.topTitle}>Membership</Text>
        <View style={styles.back} />
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: insets.bottom + spacing.xl }}
      >
        <View style={styles.hero}>
          <View style={styles.crown}>
            <Ionicons name="diamond" size={20} color={auth.iconRed} />
          </View>
          <View style={styles.heroText}>
            <Text style={styles.heroTitle}>Choose your plan</Text>
            <Text style={styles.heroBody}>
              Unlock premium features and find your perfect match
            </Text>
          </View>
        </View>

        <TouchableOpacity
          style={styles.webBtn}
          activeOpacity={0.85}
          onPress={() => Linking.openURL('https://www.lovewanshisamaj.in/membership')}
        >
          <Ionicons name="globe-outline" size={18} color="#FFFFFF" />
          <Text style={styles.webBtnText}>Manage & Upgrade on Web Portal ↗</Text>
        </TouchableOpacity>

        {!!membership && (
          <View style={styles.current}>
            <VerifiedBadge size={17} />
            <Text style={styles.currentText}>
              {membership.label} is active
              {membership.expiresAt
                ? ` until ${new Date(membership.expiresAt).toLocaleDateString('en-IN', {
                    day: 'numeric',
                    month: 'short',
                    year: 'numeric',
                  })}`
                : ''}
              .
            </Text>
          </View>
        )}

        <PlanPicker />

        <TouchableOpacity
          style={styles.safety}
          activeOpacity={0.85}
          onPress={() => setOpenSafety((v) => !v)}
          accessibilityRole="button"
        >
          <View style={styles.safetyIcon}>
            <Ionicons name="shield-checkmark" size={17} color={auth.iconRed} />
          </View>
          <View style={styles.safetyText}>
            <Text style={styles.safetyTitle}>Safe, Secure &amp; Trusted</Text>
            <Text style={styles.safetyBody}>100% secure payments. Cancel anytime.</Text>
          </View>
          <Ionicons
            name={openSafety ? 'chevron-up' : 'chevron-down'}
            size={20}
            color="#000000"
          />
        </TouchableOpacity>

        {openSafety && (
          <View style={styles.safetyMore}>
            <Text style={styles.safetyLine}>
              Payments are handled by the payment provider. Card and UPI details are entered on
              their page and never reach this app or our servers.
            </Text>
            <Text style={styles.safetyLine}>
              A plan does not renew on its own. When it ends, you go back to the free plan until
              you choose otherwise.
            </Text>
            <Text style={styles.safetyLine}>
              Contact details are only ever shared with members you have connected with, on any
              plan.
            </Text>
          </View>
        )}

        <TrustRow />
      </ScrollView>
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
  back: { width: 38, height: 38, alignItems: 'center', justifyContent: 'center' },
  topTitle: { fontSize: font.heading, fontWeight: '700', color: '#000000' },

  hero: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.lg,
  },
  crown: {
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: '#FCE8EE',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.md,
  },
  heroText: { flex: 1 },
  heroTitle: { fontSize: 22, fontWeight: '700', color: colors.text },
  heroBody: { fontSize: font.body, color: '#6B7280', marginTop: 2, lineHeight: 18 },

  webBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    marginHorizontal: spacing.md,
    marginBottom: spacing.md,
    backgroundColor: '#8B5CF6',
    borderRadius: radius.md,
    paddingVertical: 13,
  },
  webBtnText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
  },

  current: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginHorizontal: spacing.md,
    marginBottom: spacing.sm,
    padding: spacing.md,
    borderRadius: radius.md,
    backgroundColor: '#E8F4FE',
  },
  currentText: { flex: 1, fontSize: font.body, color: '#0B5A96', lineHeight: 18 },

  safety: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: spacing.md,
    marginTop: spacing.sm,
    padding: spacing.md,
    borderRadius: radius.md,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: '#EFE0DA',
    backgroundColor: '#FFFBFC',
  },
  safetyIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#FCE8EE',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.sm,
  },
  safetyText: { flex: 1 },
  safetyTitle: { fontSize: font.title, fontWeight: '700', color: colors.text },
  safetyBody: { fontSize: font.small, color: '#6B7280', marginTop: 1 },

  safetyMore: {
    marginHorizontal: spacing.md,
    marginTop: spacing.sm,
    padding: spacing.md,
    borderRadius: radius.md,
    backgroundColor: colors.surface,
    gap: spacing.sm,
  },
  safetyLine: { fontSize: font.small, color: '#4B5563', lineHeight: 18 },
});

import { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  useWindowDimensions,
} from 'react-native';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import Ionicons from '@expo/vector-icons/Ionicons';
import { VerifiedBadge, type BadgeTone } from './BrandIcons';
import { activateMembership, useMembership } from '../utils/membership';
import { billingAPI } from '../utils/api';
import { startCheckout, isPaymentConfigured, defaultProviderLabel } from '../utils/payments';
import { auth, colors, font, radius, spacing } from './theme';

/** The medal photos per tier. */
const MEDALS: Record<string, number> = {
  bronze: require('../assets/images/medals/bronze.png'),
  silver: require('../assets/images/medals/silver.png'),
  gold: require('../assets/images/medals/gold.png'),
};

/** Choose-this-tier button gradients. */
const BUTTON_GRADIENTS: Record<string, readonly [string, string]> = {
  bronze: ['#C27D38', '#8E4B10'],
  silver: ['#A0AAB5', '#6A7684'],
  gold: ['#F5C542', '#C79A1E'],
};

export type PlanItem = {
  id: string;
  name: string;
  tier: 'bronze' | 'silver' | 'gold';
  months: number;
  basePrice: number;
  payablePrice: number;
  isFree: boolean;
  savingsPercentage?: number;
  pitch: string;
  tone: BadgeTone;
  features: string[];
  popular?: boolean;
};

const DEFAULT_PLANS: PlanItem[] = [
  {
    id: 'bronze_3m',
    name: 'Bronze',
    tier: 'bronze',
    months: 3,
    basePrice: 1499,
    payablePrice: 999,
    isFree: false,
    savingsPercentage: 33,
    pitch: 'Ideal for 3 months active search',
    tone: 'blue',
    features: [
      'Direct Mobile & WhatsApp Contact Numbers',
      '36 Guna Vedic Kundali Milan',
      'Unlimited Connection Requests',
      'Full Biodata & Family Details',
      'Verified Community Badge',
    ],
  },
  {
    id: 'silver_6m',
    name: 'Silver',
    tier: 'silver',
    months: 6,
    basePrice: 2499,
    payablePrice: 1799,
    isFree: false,
    savingsPercentage: 28,
    pitch: 'Best for 6 months comprehensive search',
    tone: 'silver',
    features: [
      'Direct Mobile & WhatsApp Contact Numbers',
      '36 Guna Vedic Kundali Milan',
      'Unlimited Connection Requests',
      'Full Biodata & Family Details',
      'Verified Community Badge',
    ],
  },
  {
    id: 'gold_12m',
    name: 'Gold',
    tier: 'gold',
    months: 12,
    basePrice: 4999,
    payablePrice: 0,
    isFree: true,
    savingsPercentage: 100,
    pitch: 'Complete 1-Year Access & Welcome Offer',
    tone: 'gold',
    popular: true,
    features: [
      'Direct Mobile & WhatsApp Contact Numbers',
      '36 Guna Vedic Kundali Milan',
      'Unlimited Connection Requests',
      'Full Biodata & Family Details',
      'Verified Community Badge',
    ],
  },
];

const rupees = (n: number) => `₹${n.toLocaleString('en-IN')}`;

export default function PlanPicker() {
  const { width } = useWindowDimensions();
  const { membership, refresh } = useMembership();
  const [plans, setPlans] = useState<PlanItem[]>(DEFAULT_PLANS);
  const [busy, setBusy] = useState<string | null>(null);

  const cardWidth = Math.min(Math.max(width * 0.76, 260), 320);

  useEffect(() => {
    billingAPI
      .getPlans()
      .then((res) => {
        const raw = res?.data;
        if (Array.isArray(raw) && raw.length > 0) {
          const parsed: PlanItem[] = raw.map((p: any) => {
            const tierStr = (p.tier || 'gold').toLowerCase() as 'bronze' | 'silver' | 'gold';
            const base = (p.pricePaise || 0) / 100;
            const payable = (p.payablePaise || 0) / 100;
            const free = Boolean(p.freeWithPromo || payable === 0 || p.freeOnSignup);

            let tone: BadgeTone = 'gold';
            if (tierStr === 'silver') tone = 'silver';
            else if (tierStr === 'bronze') tone = 'blue';

            return {
              id: p.code || `${tierStr}_${p.durationMonths || 3}m`,
              name: p.name || 'Membership',
              tier: tierStr,
              months: p.durationMonths || 3,
              basePrice: base,
              payablePrice: payable,
              isFree: free,
              savingsPercentage: p.savingsPercentage || (base > payable ? Math.round(((base - payable) / base) * 100) : 0),
              pitch:
                p.durationMonths === 12
                  ? 'Complete 1-Year Access & Welcome Offer'
                  : p.durationMonths === 6
                  ? 'Best for 6 months comprehensive search'
                  : 'Ideal for 3 months active search',
              tone,
              popular: p.durationMonths === 12 || tierStr === 'gold',
              features: [
                'Direct Mobile & WhatsApp Contact Numbers',
                '36 Guna Vedic Kundali Milan',
                'Unlimited Connection Requests',
                'Full Biodata & Family Details',
                'Verified Community Badge',
              ],
            };
          });
          setPlans(parsed);
        }
      })
      .catch(() => {});
  }, []);

  const choose = async (plan: PlanItem) => {
    // Free offer: activate directly without opening payment gateway
    if (plan.isFree || plan.payablePrice === 0) {
      setBusy(plan.id);
      try {
        await activateMembership({
          planId: plan.id,
          label: `${plan.name} - ${plan.months} Months`,
          tier: plan.tier,
          months: plan.months,
          promo: true,
        });
        await refresh();
        Alert.alert(
          `${plan.name} Activated!`,
          `Your ${plan.months}-month ${plan.name} membership is active with full access.`
        );
      } finally {
        setBusy(null);
      }
      return;
    }

    setBusy(plan.id);
    try {
      const outcome = await startCheckout({
        id: plan.id,
        label: `${plan.name} - ${plan.months} Months`,
        price: plan.payablePrice,
        months: plan.months,
      });

      if (outcome.status === 'success') {
        await activateMembership({
          planId: plan.id,
          label: plan.name,
          tier: plan.tier,
          months: plan.months,
        });
        await refresh();
        Alert.alert('Payment Successful', `Your ${plan.name} membership is now active.`);
      } else if (outcome.status === 'pending') {
        Alert.alert(
          'Payment Processing',
          'Your payment is being confirmed. Membership will activate shortly.'
        );
      } else if (outcome.status === 'failed') {
        Alert.alert('Payment Failed', outcome.message);
      }
    } catch (e: any) {
      Alert.alert('Payment Unavailable', e?.message || 'Please try again.');
    } finally {
      setBusy(null);
    }
  };

  const hasAnyFreeOffer = plans.some((p) => p.isFree);

  return (
    <View>
      {hasAnyFreeOffer && (
        <View style={styles.offer}>
          <Ionicons name="gift" size={16} color="#A5122F" />
          <Text style={styles.offerText}>
            🎉 Special Welcome Promotion: 100% Free Plan available for all members!
          </Text>
        </View>
      )}

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.row}
      >
        {plans.map((plan) => {
          const isCurrentActive =
            membership?.planId === plan.id ||
            (membership?.tier === plan.tier && membership?.active);
          const perMonth = Math.round(plan.payablePrice / plan.months);

          return (
            <View
              key={plan.id}
              style={[
                styles.card,
                { width: cardWidth },
                plan.popular && styles.cardPopular,
              ]}
            >
              {plan.popular && (
                <View style={styles.popular}>
                  <Text style={styles.popularText}>
                    {plan.isFree ? 'WELCOME OFFER' : 'MOST POPULAR'}
                  </Text>
                </View>
              )}

              <View style={styles.cardHead}>
                <View>
                  <Text style={styles.tierName}>{plan.name} Plan</Text>
                  <Text style={styles.durationSubtitle}>{plan.months} Months Duration</Text>
                </View>
                <Image
                  source={MEDALS[plan.tier] || MEDALS.gold}
                  style={styles.medal}
                  contentFit="contain"
                />
              </View>

              <View style={styles.priceRow}>
                {plan.isFree ? (
                  <View style={styles.priceCol}>
                    <View style={styles.priceInner}>
                      <Text style={styles.priceFree}>FREE</Text>
                      <Text style={styles.struckThrough}>{rupees(plan.basePrice)}</Text>
                    </View>
                    <Text style={styles.perMonthText}>₹0/month (100% OFF)</Text>
                  </View>
                ) : (
                  <View style={styles.priceCol}>
                    <View style={styles.priceInner}>
                      <Text style={styles.price}>{rupees(plan.payablePrice)}</Text>
                      {plan.basePrice > plan.payablePrice && (
                        <Text style={styles.struckThrough}>{rupees(plan.basePrice)}</Text>
                      )}
                    </View>
                    <Text style={styles.perMonthText}>
                      {rupees(perMonth)}/month
                      {plan.savingsPercentage && plan.savingsPercentage > 0 ? ` (Save ${plan.savingsPercentage}%)` : ''}
                    </Text>
                  </View>
                )}
              </View>

              <Text style={styles.pitch}>{plan.pitch}</Text>

              <View style={styles.rule} />

              <View style={styles.accessHeader}>
                <Text style={styles.accessHeaderText}>🌟 All Plans Include Full Access:</Text>
              </View>

              {plan.features.map((f) => (
                <View key={f} style={styles.feature}>
                  <VerifiedBadge size={16} tone={plan.tone} />
                  <Text style={styles.featureText}>{f}</Text>
                </View>
              ))}

              <View style={styles.grow} />

              {isCurrentActive ? (
                <View style={styles.activeBtn}>
                  <Ionicons name="checkmark-circle" size={18} color={colors.white} />
                  <Text style={styles.activeText}>Current Active Plan</Text>
                </View>
              ) : (
                <TouchableOpacity
                  style={busy === plan.id && styles.dim}
                  activeOpacity={0.9}
                  disabled={!!busy}
                  onPress={() => choose(plan)}
                  accessibilityRole="button"
                >
                  <LinearGradient
                    colors={
                      BUTTON_GRADIENTS[plan.tier] ?? [auth.crimsonLight, auth.crimsonDeep]
                    }
                    style={styles.chooseBtn}
                  >
                    <Text style={styles.chooseText}>
                      {busy === plan.id
                        ? 'Activating…'
                        : plan.isFree
                        ? `Activate Free (${plan.months}M)`
                        : `Choose ${plan.name} (${rupees(plan.payablePrice)})`}
                    </Text>
                  </LinearGradient>
                </TouchableOpacity>
              )}
            </View>
          );
        })}
      </ScrollView>

      {!isPaymentConfigured && !hasAnyFreeOffer && (
        <Text style={styles.note}>
          Paid plans need the {defaultProviderLabel} account switched on before they can be
          purchased.
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  offer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginHorizontal: spacing.md,
    marginTop: spacing.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: 10,
    borderRadius: radius.md,
    backgroundColor: '#FDF2F4',
    borderWidth: 1,
    borderColor: '#F8D7DE',
  },
  offerText: {
    flex: 1,
    fontSize: 13,
    fontWeight: '600',
    color: '#A5122F',
    lineHeight: 18,
  },

  row: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    gap: spacing.md,
    alignItems: 'stretch',
  },
  card: {
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: '#EFE0DA',
    backgroundColor: colors.white,
    padding: spacing.lg,
    shadowColor: '#000000',
    shadowOpacity: 0.06,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 2,
  },
  cardPopular: {
    borderColor: auth.crimsonLight,
    borderWidth: 2,
  },

  popular: {
    position: 'absolute',
    top: -1,
    alignSelf: 'center',
    right: 0,
    left: 0,
    marginHorizontal: 'auto',
    backgroundColor: auth.crimsonLight,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderBottomLeftRadius: radius.sm,
    borderBottomRightRadius: radius.sm,
    alignItems: 'center',
    width: 140,
  },
  popularText: {
    color: colors.white,
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.5,
  },

  cardHead: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: spacing.sm,
  },
  tierName: {
    fontSize: 20,
    fontWeight: '800',
    color: colors.text,
  },
  durationSubtitle: {
    fontSize: font.small,
    color: colors.textMuted,
    fontWeight: '600',
    marginTop: 2,
  },
  medal: {
    width: 32,
    height: 32,
  },

  priceRow: {
    marginTop: spacing.md,
  },
  priceCol: {
    flexDirection: 'column',
  },
  priceInner: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 8,
  },
  price: {
    fontSize: 28,
    fontWeight: '800',
    color: colors.danger,
  },
  priceFree: {
    fontSize: 28,
    fontWeight: '900',
    color: '#15803D',
  },
  struckThrough: {
    fontSize: 16,
    color: colors.textFaint,
    textDecorationLine: 'line-through',
  },
  perMonthText: {
    fontSize: 12,
    color: colors.textMuted,
    marginTop: 2,
    fontWeight: '600',
  },

  pitch: {
    fontSize: font.body,
    color: colors.text,
    marginTop: spacing.sm,
    lineHeight: 18,
  },
  rule: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: colors.border,
    marginVertical: spacing.md,
  },

  accessHeader: {
    marginBottom: spacing.sm,
  },
  accessHeaderText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#4B5563',
    textTransform: 'uppercase',
    letterSpacing: 0.3,
  },

  feature: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
    marginBottom: 8,
  },
  featureText: {
    flex: 1,
    fontSize: 13,
    color: colors.text,
    lineHeight: 18,
  },

  grow: {
    flex: 1,
    minHeight: spacing.md,
  },

  chooseBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    borderRadius: radius.md,
    height: 46,
    marginTop: spacing.sm,
    overflow: 'hidden',
  },
  activeBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: '#15803D',
    borderRadius: radius.md,
    height: 46,
    marginTop: spacing.sm,
  },
  activeText: {
    color: colors.white,
    fontSize: 14,
    fontWeight: '700',
  },
  chooseText: {
    color: colors.white,
    fontSize: 14,
    fontWeight: '700',
  },
  dim: {
    opacity: 0.7,
  },

  note: {
    fontSize: font.small,
    color: colors.textFaint,
    textAlign: 'center',
    marginHorizontal: spacing.lg,
    lineHeight: 16,
  },
});

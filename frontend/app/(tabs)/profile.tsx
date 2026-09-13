import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Dimensions,
  Linking,
} from 'react-native';
import { useState, useCallback } from 'react';
import { LinearGradient } from 'expo-linear-gradient';
import { useFocusEffect } from 'expo-router';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { profileAPI, likeAPI } from '../../utils/api';
import { useGuardedRouter } from '../../utils/useGuardedRouter';
import AppDrawer, { defaultDrawerItems } from '../../components/AppDrawer';
import EnhanceProfileCard from '../../components/EnhanceProfileCard';
import CompletionRing from '../../components/CompletionRing';
import DetailCard from '../../components/DetailCard';
import { rowsFor } from '../../components/sectionRows';
import PhotoCarousel from '../../components/PhotoCarousel';
import { useReference } from '../../utils/useReference';
import { shareProfile } from '../../utils/shareProfile';
import Loader from '../../components/Loader';
import {
  colors,
  font,
  radius,
  spacing,
  profileCode,
  profileName,
  photoHeight,
  auth,
} from '../../components/theme';

const { width } = Dimensions.get('window');
// Derived from PHOTO_ASPECT so the header never re-crops what the user framed.
const HEADER_H = photoHeight(width);






export default function ProfileScreen() {
  const router = useGuardedRouter();
  const insets = useSafeAreaInsets();
  // Profiles store codes ("VEG"); the cards show labels ("Vegetarian").
  const { label } = useReference();

  const [user, setUser] = useState<any>(null);
  const [sentCount, setSentCount] = useState(0);
  const [receivedCount, setReceivedCount] = useState(0);
  const [connectedCount, setConnectedCount] = useState(0);


  const photos: string[] = user?.profileImages?.length
    ? user.profileImages
    : user?.profileImage
      ? [user.profileImage]
      : [];

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [])
  );

  const loadData = async () => {
    try {
      const [meRes, sentRes, receivedRes] = await Promise.all([
        profileAPI.getMe(),
        likeAPI.getSentLikes(),
        likeAPI.getReceivedLikes(),
      ]);
      setUser(meRes.data);

      const sent = sentRes.data || [];
      const received = receivedRes.data || [];
      setSentCount(sent.length);
      setReceivedCount(received.length);

      const isAccepted = (l: any) => (l.status || '').toLowerCase() === 'accepted';
      setConnectedCount(sent.filter(isAccepted).length + received.filter(isAccepted).length);
    } catch (error) {
      console.error('Failed to load profile:', error);
    }
  };

  const [menuOpen, setMenuOpen] = useState(false);

  const completion = Number(user?.profileCompletion ?? 0);
  const openSection = (key: string) => router.push(`/edit-profile?section=${key}`);

  if (!user) {
    return (
      <View style={styles.loading}>
        <Loader size={38} />
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      <View style={styles.header}>
        {/* Same carousel as the public profile, so both screens behave alike
            when there is more than one photo. */}
        <PhotoCarousel
          photos={photos}
          height={HEADER_H}
          name={profileName(user)}
          code={profileCode(user)}
          gender={(user as any)?.gender}
        />


        <View style={[styles.headerTop, { paddingTop: insets.top + spacing.sm }]}>
          <TouchableOpacity
            style={styles.circleBtn}
            onPress={() => setMenuOpen(true)}
            accessibilityLabel="Open menu"
          >
            <Ionicons name="menu" size={20} color={colors.white} />
          </TouchableOpacity>

          <View style={styles.headerBadges}>
            <TouchableOpacity
              style={styles.circleBtn}
              onPress={() => shareProfile(user, { isOwnProfile: true })}
              accessibilityLabel="Share my profile"
            >
              <Ionicons name="share-social-outline" size={18} color={colors.white} />
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.circleBtn}
              onPress={() => router.push('/manage-photos')}
              accessibilityLabel="Manage photos"
            >
              <Ionicons name="camera-outline" size={18} color={colors.white} />
            </TouchableOpacity>
          </View>
        </View>

      </View>

      <View style={styles.body}>
        <LinearGradient
          colors={['#FFF9FB', '#FDECEF']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.completionCard}
        >
          <View style={styles.completionTop}>
            <CompletionRing percent={completion} size={46} />
            <View style={styles.completionText}>
              <Text style={styles.completionTitle}>Complete your profile</Text>
              <Text style={styles.completionHint}>
                Add more details to get better matches
              </Text>
            </View>
          </View>

          {/* Goes to the full guided flow, not a single section - the point of
              this card is finishing everything that is missing. */}
          <TouchableOpacity
            activeOpacity={0.85}
            onPress={() => router.push('/profile-setup')}
            accessibilityRole="button"
          >
            <LinearGradient
              colors={['#5B84C9', '#3260AE']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.primaryBtn}
            >
              <Text style={styles.primaryBtnText} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.8}>
                Complete Profile / प्रोफ़ाइल बनाएं
              </Text>
              <Ionicons name="arrow-forward" size={15} color={colors.white} />
            </LinearGradient>
          </TouchableOpacity>
        </LinearGradient>

        <View style={styles.stats}>
          <Stat label="Sent" value={sentCount} onPress={() => router.push('/(tabs)/likes')} />
          <View style={styles.statDivider} />
          <Stat label="Received" value={receivedCount} onPress={() => router.push('/(tabs)/likes')} />
          <View style={styles.statDivider} />
          <Stat
            label="Connected"
            value={connectedCount}
            onPress={() => router.push('/(tabs)/shortlist?tab=connected')}
          />
        </View>

        {/* Kundali and biodata, as two rows rather than two cards further down */}
        <EnhanceProfileCard />

        {/* Membership opens web portal directly to comply with Google Play individual account policy */}
        <TouchableOpacity
          style={styles.membership}
          activeOpacity={0.85}
          onPress={() => Linking.openURL('https://www.lovewanshisamaj.in/membership').catch(() => router.push('/subscription'))}
          accessibilityRole="button"
          accessibilityLabel="Membership"
        >
          <LinearGradient
            colors={['#EC4899', '#8B5CF6']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.membershipIconWrap}
          >
            <Ionicons name="diamond" size={17} color={colors.white} />
          </LinearGradient>
          <View style={styles.membershipText}>
            <Text style={styles.membershipTitle}>Membership / सदस्यता</Text>
            <Text style={styles.membershipBody}>
              Visit website to explore plans &amp; benefits ↗
            </Text>
          </View>
          <Ionicons name="open-outline" size={18} color={colors.textMuted} />
        </TouchableOpacity>

        <DetailCard
          title="Basic Details"
          subtitle="Brief outline of personal information"
          onEdit={() => openSection('basic')}
          rows={rowsFor('basic', user, label)}
        />

        {/* The fields that used to crowd Basic Details */}
        <DetailCard
          title="Other Details"
          subtitle="Helps families shortlist you"
          onEdit={() => openSection('other')}
          rows={rowsFor('other', user, label)}
        />

        <DetailCard
          title="About Me"
          subtitle="Describe yourself in a few words"
          body={user.aboutMyself}
          onEdit={() => openSection('about')}
          emptyHint="Profiles with a short intro get noticeably more responses"
        />

        <DetailCard
          title="Education & Career"
          subtitle="What you studied and what you do"
          onEdit={() => openSection('education')}
          rows={rowsFor('education', user, label)}
        />

        <DetailCard
          title="Religion & Astro"
          subtitle="Details families often look for"
          onEdit={() => openSection('religion')}
          rows={rowsFor('religion', user, label)}
        />

        <DetailCard
          title="Family"
          subtitle="Your family background"
          onEdit={() => openSection('family')}
          rows={rowsFor('family', user, label)}
        />

        <DetailCard
          title="Contact"
          subtitle="Only shared with profiles you connect with"
          onEdit={() => openSection('contact')}
          rows={rowsFor('contact', user, label)}
        />

        {/* Share Profile Row moved to bottom */}
        <TouchableOpacity
          style={styles.shareProfileRow}
          activeOpacity={0.85}
          onPress={() => shareProfile(user, { isOwnProfile: true })}
          accessibilityRole="button"
          accessibilityLabel="Share my profile"
        >
          <LinearGradient
            colors={['#8B5CF6', '#EC4899']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.shareIconWrap}
          >
            <Ionicons name="share-social" size={16} color={colors.white} />
          </LinearGradient>
          <View style={styles.shareTextWrap}>
            <Text style={styles.shareTitle}>Share My Profile / प्रोफ़ाइल शेयर करें</Text>
            <Text style={styles.shareSubtitle}>Share your profile &amp; photo with family &amp; matches</Text>
          </View>
          <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
        </TouchableOpacity>

        {/* Hiding, deleting and logging out in Account & Settings */}
        <TouchableOpacity
          style={styles.settingRow}
          onPress={() => router.push('/account-settings')}
          activeOpacity={0.8}
        >
          <Ionicons name="settings-outline" size={18} color={colors.text} />
          <View style={styles.settingCopy}>
            <Text style={styles.settingTitle}>Account &amp; Settings</Text>
            <Text style={styles.settingSubtitle}>
              Visibility, deleting your account, and support
            </Text>
          </View>
          <Ionicons name="chevron-forward" size={18} color={colors.textFaint} />
        </TouchableOpacity>

        <View style={{ height: 32 }} />
      </View>

      <AppDrawer
        visible={menuOpen}
        onClose={() => setMenuOpen(false)}
        name={user?.name}
        memberId={user?.id}
        avatarUrl={photos?.[0] ?? null}
        items={defaultDrawerItems(router.push)}
      />

    </ScrollView>
  );
}

function Stat({ label, value, onPress }: { label: string; value: number; onPress?: () => void }) {
  return (
    <TouchableOpacity style={styles.stat} activeOpacity={onPress ? 0.7 : 1} onPress={onPress}>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.surface },
  loading: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.bg },

  header: { height: HEADER_H, backgroundColor: colors.surface },
  headerTop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    paddingHorizontal: spacing.lg,
    flexDirection: 'row',
    // space-between, not flex-end: the menu is first in the markup and belongs
    // on the left, where a drawer handle is looked for. flex-end pushed it over
    // to sit with the photo buttons, so the row read as four unrelated controls
    // huddled in one corner.
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  headerBadges: { flexDirection: 'row', gap: spacing.sm },
  circleBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    minWidth: 36,
    height: 36,
    paddingHorizontal: 10,
    borderRadius: 18,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'center',
  },

  body: { padding: spacing.md, gap: spacing.md, marginTop: -spacing.sm },

  completionCard: {
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.accentSoft,
    padding: spacing.md,
    gap: spacing.sm,
  },
  completionTop: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  completionText: { flex: 1, gap: 2 },
  completionTitle: { fontSize: 15, fontWeight: '700', color: auth.maroon },
  completionHint: { fontSize: 12, color: '#6B7280', lineHeight: 16 },

  primaryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    height: 38,
    borderRadius: radius.sm,
  },
  primaryBtnText: { color: colors.white, fontSize: 14, fontWeight: '700' },

  stats: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.bg,
    borderRadius: 14,
    paddingVertical: 10,
  },
  shareProfileRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.white,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#E8DEF8',
    padding: spacing.md,
    gap: spacing.sm,
  },
  shareIconWrap: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
  },
  shareTextWrap: {
    flex: 1,
    gap: 2,
  },
  shareTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.text,
  },
  shareSubtitle: {
    fontSize: 12,
    color: colors.textMuted,
  },
  membership: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.white,
    borderRadius: 14,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: '#EFE0DA',
    padding: spacing.md,
    marginTop: spacing.md,
  },
  membershipIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.sm,
  },
  membershipText: { flex: 1 },
  membershipTitle: { fontSize: font.title, fontWeight: '700', color: colors.text },
  membershipBody: { fontSize: font.small, color: '#6B7280', marginTop: 1 },
  stat: { flex: 1, alignItems: 'center', gap: 1 },
  statValue: { fontSize: 16, fontWeight: 'bold', color: colors.text },
  statLabel: { fontSize: 12, color: colors.textMuted },
  statDivider: { width: 1, height: 22, backgroundColor: colors.hairline },



  logout: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    paddingVertical: 14,
    borderRadius: 14,
    backgroundColor: colors.bg,
    marginTop: spacing.sm,
  },
  logoutText: { color: colors.danger, fontSize: font.title, fontWeight: '600' },
  settingRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
    paddingVertical: 14,
    paddingHorizontal: spacing.md,
    borderRadius: 14,
    backgroundColor: colors.bg,
    marginTop: spacing.sm,
  },
  settingCopy: { flex: 1 },
  settingTitle: { color: colors.text, fontSize: font.title, fontWeight: '600' },
  settingSubtitle: { color: colors.textFaint, fontSize: font.small, marginTop: 2 },
  deleteText: { color: colors.textFaint, fontSize: font.small, fontWeight: '600' },
});

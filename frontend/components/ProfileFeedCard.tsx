import { memo, useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Dimensions,
  ScrollView,
  NativeSyntheticEvent,
  NativeScrollEvent,
  Animated,
  Share,
} from 'react-native';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import Ionicons from '@expo/vector-icons/Ionicons';
import AvatarFallback from './AvatarFallback';
import { VerifiedBadge } from './BrandIcons';
import { useReference } from '../utils/useReference';
import { connectionAction, type ConnectionState } from '../utils/useConnections';
import { shareProfile, formatHeight } from '../utils/shareProfile';
import {
  colors,
  radius,
  spacing,
  profileId,
  profileName,
  profileCode,
  profileImage,
  profileImageFull,
  profileAge,
  profileHeadline,
  profileLocation,
  profileVerified,
  profileIsOnline,
  timeAgo,
  type Profile,
  auth,
} from './theme';

const { width } = Dimensions.get('window');
const PHOTO_ASPECT = 4 / 5;
const MEDIA_HEIGHT = Math.round(width / PHOTO_ASPECT);

type Props = {
  profile: Profile;
  state?: ConnectionState;
  shortlisted?: boolean;
  onPress: (id: string | number) => void;
  onConnect: (id: string | number) => void;
  onShortlist: (id: string | number) => void;
  onKundali?: (id: string | number) => void;
};

/**
 * Deterministic pseudo-random seed to generate realistic social counts for profiles.
 */
function getDeterministicCounts(id: string | number | undefined) {
  const num = typeof id === 'number' ? id : parseInt(String(id || '1').replace(/\D/g, ''), 10) || 42;
  const likes = ((num * 47 + 137) % 350) + 120;
  const comments = ((num * 19 + 5) % 28) + 4;
  const reposts = ((num * 7 + 3) % 12) + 2;
  const shares = ((num * 11 + 7) % 22) + 3;
  return { likes, comments, reposts, shares };
}

function ProfileFeedCard({
  profile,
  state = 'NONE',
  shortlisted = false,
  onPress,
  onConnect,
  onShortlist,
  onKundali,
}: Props) {
  const { label } = useReference();

  const id = profileId(profile);
  const name = profileName(profile);
  const code = profileCode(profile);
  const avatarUri = profileImage(profile);
  const location = profileLocation(profile);
  const age = profileAge(profile);
  const verified = profileVerified(profile);
  const headline = profileHeadline(profile, label);
  const action = connectionAction(state);
  const connected = state === 'SENT' || state === 'CONNECTED';
  const isOnline = profileIsOnline(profile);

  // Photo gallery: Gather all photos or fallback
  const rawPhotos: string[] =
    profile.profileImages ||
    profile.profileImageDetails?.map((d: any) => d.imageUrl || d.url) ||
    [];
  const photos: string[] =
    Array.isArray(rawPhotos) && rawPhotos.length > 0
      ? rawPhotos.filter(Boolean)
      : [profileImageFull(profile) || profileImage(profile)].filter(Boolean) as string[];

  const [activePhotoIndex, setActivePhotoIndex] = useState(0);
  const [expanded, setExpanded] = useState(false);

  // Animated double-tap heart pop
  const heartScale = useRef(new Animated.Value(0)).current;
  const heartOpacity = useRef(new Animated.Value(0)).current;
  const lastTapRef = useRef<number>(0);

  const counts = getDeterministicCounts(id);

  const open = () => id != null && onPress(id);

  const handleScroll = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    const slide = Math.round(event.nativeEvent.contentOffset.x / width);
    if (slide !== activePhotoIndex && slide >= 0 && slide < photos.length) {
      setActivePhotoIndex(slide);
    }
  };

  const triggerHeartAnimation = () => {
    heartScale.setValue(0.5);
    heartOpacity.setValue(1);
    Animated.parallel([
      Animated.spring(heartScale, {
        toValue: 1.3,
        friction: 4,
        tension: 100,
        useNativeDriver: true,
      }),
      Animated.sequence([
        Animated.delay(450),
        Animated.timing(heartOpacity, {
          toValue: 0,
          duration: 300,
          useNativeDriver: true,
        }),
      ]),
    ]).start();
  };

  const handlePhotoPress = () => {
    const now = Date.now();
    const DOUBLE_TAP_DELAY = 300;
    if (now - lastTapRef.current < DOUBLE_TAP_DELAY) {
      triggerHeartAnimation();
      if (!connected && id != null) {
        onConnect(id);
      }
    }
    lastTapRef.current = now;
  };

  const handleShare = async () => {
    await shareProfile(profile);
  };

  // Specific Matrimonial Details
  const heightVal = formatHeight(label('height', (profile as any)?.height) || (profile as any)?.height);
  const educationVal = label('education', (profile as any)?.education) || (profile as any)?.education;
  const professionVal = label('profession', (profile as any)?.profession) || (profile as any)?.profession;
  const incomeVal = label('annual_income', (profile as any)?.annualIncome) || (profile as any)?.annualIncome;
  const manglikVal = label('manglik', (profile as any)?.manglik) || (profile as any)?.manglik;
  const gotraVal = (profile as any)?.gotra || (profile as any)?.gothram;
  const rashiVal = (profile as any)?.rashi;
  const fatherOccupation = (profile as any)?.fatherOccupation;
  const motherOccupation = (profile as any)?.motherOccupation;
  const aboutMe = (profile as any)?.aboutMe || (profile as any)?.bio;

  const connectCount =
    typeof (profile as any)?.connectsCount === 'number'
      ? (profile as any).connectsCount
      : typeof (profile as any)?.likesCount === 'number'
      ? (profile as any).likesCount
      : counts.likes;

  return (
    <View style={styles.card}>
      {/* 1. Header (Instagram Post Style - clean without 3-dots) */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.headerLeft} activeOpacity={0.85} onPress={open}>
          <View>
            <LinearGradient
              colors={['#F59E0B', '#EC4899', '#8B5CF6']}
              start={{ x: 0, y: 1 }}
              end={{ x: 1, y: 0 }}
              style={styles.avatarRing}
            >
              <View style={styles.avatarInner}>
                {avatarUri ? (
                  <Image
                    source={{ uri: avatarUri }}
                    style={styles.avatar}
                    contentFit="cover"
                    contentPosition="top"
                  />
                ) : (
                  <View style={[styles.avatar, styles.avatarFallback]}>
                    <AvatarFallback profile={profile} glyphSize={16} />
                  </View>
                )}
              </View>
            </LinearGradient>
            {isOnline && <View style={styles.onlineDot} />}
          </View>

          <View style={styles.headerText}>
            <View style={styles.nameRow}>
              <Text style={styles.username} numberOfLines={1}>
                {name}
              </Text>
              {verified && <VerifiedBadge size={14} />}
            </View>
            <Text style={styles.headerSubtitle} numberOfLines={1}>
              {[age ? `${age} yrs` : '', heightVal, professionVal, location].filter(Boolean).join(' • ')}
            </Text>
          </View>
        </TouchableOpacity>
      </View>

      {/* 2. Media / Photo Carousel */}
      <View style={styles.mediaContainer}>
        {photos.length > 0 ? (
          <ScrollView
            horizontal
            pagingEnabled
            showsHorizontalScrollIndicator={false}
            onScroll={handleScroll}
            scrollEventThrottle={16}
            style={styles.carousel}
          >
            {photos.map((photoUri, index) => (
              <TouchableOpacity
                key={`${photoUri}-${index}`}
                activeOpacity={1}
                onPress={handlePhotoPress}
                style={styles.photoTouchable}
              >
                <Image
                  source={{ uri: photoUri }}
                  style={styles.photo}
                  contentFit="cover"
                  contentPosition="top"
                />
              </TouchableOpacity>
            ))}
          </ScrollView>
        ) : (
          <TouchableOpacity
            activeOpacity={0.95}
            onPress={open}
            style={[styles.photo, styles.photoFallback]}
          >
            <AvatarFallback profile={profile} glyphSize={54} />
          </TouchableOpacity>
        )}

        {/* Animated Pop-up Heart on Double Tap */}
        <Animated.View
          pointerEvents="none"
          style={[
            styles.heartPopContainer,
            {
              opacity: heartOpacity,
              transform: [{ scale: heartScale }],
            },
          ]}
        >
          <Ionicons name="heart" size={88} color="rgba(255,255,255,0.95)" />
        </Animated.View>

        {/* Top-Right Multi-Photo Indicator Pill */}
        {photos.length > 1 && (
          <View style={styles.photoCounterBadge}>
            <Text style={styles.photoCounterText}>
              {activePhotoIndex + 1}/{photos.length}
            </Text>
          </View>
        )}

        {/* Bottom-Left Matrimonial Tag Overlay */}
        <View style={styles.mediaTagBadge}>
          <Ionicons name="shield-checkmark" size={12} color={colors.white} />
          <Text style={styles.mediaTagText}>
            {manglikVal ? manglikVal : 'Verified LOVEWANSHI'}
          </Text>
        </View>
      </View>

      {/* 3. Action Bar (Clean: Connect, Share, Pagination Dots, Bookmark) */}
      <View style={styles.actionBar}>
        <View style={styles.actionsLeft}>
          {/* Heart / Connect */}
          <TouchableOpacity
            style={styles.actionBtnWithCount}
            hitSlop={6}
            onPress={() => id != null && onConnect(id)}
            accessibilityLabel="Connect / Express Interest"
          >
            <Ionicons
              name={connected ? 'heart' : 'heart-outline'}
              size={26}
              color={connected ? colors.danger : colors.text}
            />
            <Text style={styles.actionCount}>
              {connected ? connectCount + 1 : connectCount}
            </Text>
          </TouchableOpacity>

          {/* Share */}
          <TouchableOpacity
            style={styles.actionBtn}
            hitSlop={6}
            onPress={handleShare}
            accessibilityLabel="Share Profile"
          >
            <Ionicons name="paper-plane-outline" size={24} color={colors.text} />
          </TouchableOpacity>
        </View>

        {/* Carousel Pagination Dots (Center) */}
        {photos.length > 1 ? (
          <View style={styles.dotsContainer}>
            {photos.map((_, i) => (
              <View
                key={`dot-${i}`}
                style={[
                  styles.dot,
                  i === activePhotoIndex ? styles.dotActive : styles.dotInactive,
                ]}
              />
            ))}
          </View>
        ) : (
          <View style={{ flex: 1 }} />
        )}

        {/* Bookmark / Shortlist (Right) */}
        <TouchableOpacity
          hitSlop={8}
          onPress={() => id != null && onShortlist(id)}
          accessibilityLabel={shortlisted ? 'Remove from Shortlist' : 'Add to Shortlist'}
        >
          <Ionicons
            name={shortlisted ? 'bookmark' : 'bookmark-outline'}
            size={25}
            color={shortlisted ? colors.star : colors.text}
          />
        </TouchableOpacity>
      </View>

      {/* 4. Caption & Matrimonial Details Block */}
      <View style={styles.captionBlock}>
        {/* Social Proof Line */}
        <Text style={styles.likedByText}>
          Liked by <Text style={styles.boldText}>LOVEWANSHI_community</Text> and{' '}
          <Text style={styles.boldText}>
            {connected ? connectCount + 1 : connectCount} others
          </Text>
        </Text>

        {/* User Handle, Code, and Headline */}
        <View style={styles.captionRow}>
          <Text style={styles.captionText}>
            <Text style={styles.boldText} onPress={open}>
              {name.toLowerCase().replace(/\s+/g, '')}{' '}
            </Text>
            <Text style={styles.codeText}>{code} </Text>
            {headline ? headline + ' ' : ''}
            <Text style={styles.hashtag}>#LOVEWANSHIParinay #Matrimony</Text>
          </Text>
        </View>

        {/* Expandable Matrimonial Overview */}
        {!expanded ? (
          <TouchableOpacity onPress={() => setExpanded(true)} hitSlop={6}>
            <Text style={styles.moreToggle}>... more</Text>
          </TouchableOpacity>
        ) : (
          <View style={styles.expandedDetails}>
            <View style={styles.detailsGrid}>
              {!!age && (
                <View style={styles.detailItem}>
                  <Text style={styles.detailLabel}>🎂 Age & DOB</Text>
                  <Text style={styles.detailValue}>
                    {age} yrs {(profile as any)?.dateOfBirth ? `(${new Date((profile as any).dateOfBirth).getFullYear()})` : ''}
                  </Text>
                </View>
              )}

              {!!heightVal && (
                <View style={styles.detailItem}>
                  <Text style={styles.detailLabel}>📏 Height</Text>
                  <Text style={styles.detailValue}>{heightVal}</Text>
                </View>
              )}

              {!!educationVal && (
                <View style={styles.detailItem}>
                  <Text style={styles.detailLabel}>🎓 Education</Text>
                  <Text style={styles.detailValue}>{educationVal}</Text>
                </View>
              )}

              {!!professionVal && (
                <View style={styles.detailItem}>
                  <Text style={styles.detailLabel}>💼 Profession</Text>
                  <Text style={styles.detailValue}>
                    {professionVal} {incomeVal ? `• ${incomeVal}` : ''}
                  </Text>
                </View>
              )}

              {!!location && (
                <View style={styles.detailItem}>
                  <Text style={styles.detailLabel}>📍 Location</Text>
                  <Text style={styles.detailValue}>{location}</Text>
                </View>
              )}

              {(manglikVal || rashiVal) && (
                <View style={styles.detailItem}>
                  <Text style={styles.detailLabel}>🪐 Kundali / Rashi</Text>
                  <Text style={styles.detailValue}>
                    {[manglikVal || 'Non-Manglik', rashiVal ? `Rashi: ${rashiVal}` : ''].filter(Boolean).join(' • ')}
                  </Text>
                </View>
              )}

              {(fatherOccupation || motherOccupation) && (
                <View style={styles.detailItem}>
                  <Text style={styles.detailLabel}>👪 Family Background</Text>
                  <Text style={styles.detailValue}>
                    {[fatherOccupation ? `Father: ${fatherOccupation}` : '', motherOccupation ? `Mother: ${motherOccupation}` : ''].filter(Boolean).join(' • ')}
                  </Text>
                </View>
              )}

              {!!gotraVal && (
                <View style={styles.detailItem}>
                  <Text style={styles.detailLabel}>🏷️ Community & Gotra</Text>
                  <Text style={styles.detailValue}>LOVEWANSHI Vaishya • Gotra: {gotraVal}</Text>
                </View>
              )}

              {!!aboutMe && (
                <View style={[styles.detailItem, { width: '100%' }]}>
                  <Text style={styles.detailLabel}>💬 About</Text>
                  <Text style={styles.detailValue}>{aboutMe}</Text>
                </View>
              )}
            </View>

            <TouchableOpacity onPress={() => setExpanded(false)} hitSlop={6}>
              <Text style={styles.moreToggle}>... less</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Primary Connect / Proposal Action Button */}
        <TouchableOpacity
          style={styles.connectWrap}
          activeOpacity={0.85}
          onPress={() => id != null && onConnect(id)}
          disabled={action.disabled}
        >
          {action.variant === 'filled' ? (
            <View style={styles.connectBtn}>
              <Ionicons name="heart" size={16} color={colors.white} style={{ marginRight: 6 }} />
              <Text style={styles.connectText}>{action.label === 'Connect' ? 'Send Proposal' : action.label}</Text>
            </View>
          ) : (
            <View style={styles.connectedBtn}>
              {action.label === 'Connected' && (
                <Ionicons name="checkmark-circle" size={16} color={colors.online} />
              )}
              <Text style={styles.connectedText}>{action.label}</Text>
            </View>
          )}
        </TouchableOpacity>
      </View>
    </View>
  );
}

export default memo(ProfileFeedCard);

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.bg,
    marginBottom: spacing.xl,
    borderBottomWidth: 8,
    borderBottomColor: '#F4F5F7',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm + 2,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
  },
  avatarRing: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 2,
  },
  avatarInner: {
    width: '100%',
    height: '100%',
    borderRadius: 20,
    backgroundColor: colors.bg,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 1.5,
  },
  avatar: {
    width: '100%',
    height: '100%',
    borderRadius: 19,
    backgroundColor: colors.surface,
  },
  avatarFallback: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  onlineDot: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#22C55E',
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
  headerText: {
    flex: 1,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  username: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.text,
  },
  headerSubtitle: {
    fontSize: 11,
    color: colors.textMuted,
    marginTop: 1,
  },
  mediaContainer: {
    width,
    height: MEDIA_HEIGHT,
    backgroundColor: colors.surface,
    position: 'relative',
    overflow: 'hidden',
  },
  carousel: {
    width,
    height: MEDIA_HEIGHT,
  },
  photoTouchable: {
    width,
    height: MEDIA_HEIGHT,
  },
  photo: {
    width,
    height: MEDIA_HEIGHT,
    backgroundColor: colors.surface,
  },
  photoFallback: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  heartPopContainer: {
    position: 'absolute',
    top: '35%',
    left: '38%',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10,
  },
  photoCounterBadge: {
    position: 'absolute',
    top: 12,
    right: 12,
    backgroundColor: 'rgba(0, 0, 0, 0.65)',
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: 12,
  },
  photoCounterText: {
    color: colors.white,
    fontSize: 11,
    fontWeight: '600',
  },
  mediaTagBadge: {
    position: 'absolute',
    bottom: 12,
    left: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  mediaTagText: {
    color: colors.white,
    fontSize: 11,
    fontWeight: '600',
  },
  actionBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    paddingTop: 10,
    paddingBottom: 6,
  },
  actionsLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  actionBtn: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionBtnWithCount: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  actionCount: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.text,
  },
  dotsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    flex: 1,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  dotActive: {
    backgroundColor: '#3897F0',
    width: 7,
    height: 7,
    borderRadius: 3.5,
  },
  dotInactive: {
    backgroundColor: '#D1D5DB',
  },
  captionBlock: {
    paddingHorizontal: spacing.md,
    paddingTop: 4,
    gap: 4,
  },
  likedByText: {
    fontSize: 13,
    color: colors.text,
    marginBottom: 2,
  },
  boldText: {
    fontWeight: '700',
    color: colors.text,
  },
  codeText: {
    fontSize: 12,
    fontWeight: '700',
    color: auth.crimsonLight,
  },
  captionRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  captionText: {
    fontSize: 13,
    color: colors.text,
    lineHeight: 18,
  },
  hashtag: {
    color: '#00376B',
    fontWeight: '500',
  },
  moreToggle: {
    fontSize: 13,
    color: colors.textMuted,
    marginTop: 2,
    fontWeight: '500',
  },
  expandedDetails: {
    marginTop: 6,
    padding: spacing.sm + 2,
    backgroundColor: '#FAFAFA',
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: '#EEEEEE',
  },
  detailsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    rowGap: 8,
    columnGap: 12,
  },
  detailItem: {
    width: '47%',
  },
  detailLabel: {
    fontSize: 11,
    color: colors.textMuted,
    fontWeight: '600',
    marginBottom: 1,
  },
  detailValue: {
    fontSize: 12,
    color: colors.text,
    fontWeight: '500',
  },
  connectWrap: {
    marginTop: spacing.sm,
  },
  connectBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: auth.crimsonLight,
    paddingVertical: 10,
    borderRadius: radius.sm,
  },
  connectText: {
    color: colors.white,
    fontSize: 13,
    fontWeight: '700',
  },
  connectedBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 9,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  connectedText: {
    color: colors.text,
    fontSize: 13,
    fontWeight: '600',
  },
  timeAgoText: {
    fontSize: 11,
    color: colors.textMuted,
    marginTop: 4,
    marginBottom: spacing.xs,
  },
});


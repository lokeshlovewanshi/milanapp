import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Platform,
  Alert,
  RefreshControl,
} from 'react-native';
import { useState, useEffect, useCallback, useRef } from 'react';
import { Image } from 'expo-image';
import { useFocusEffect } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { profileAPI, shortlistAPI, notificationAPI, viewsAPI } from '../../utils/api';
import { useGuardedRouter } from '../../utils/useGuardedRouter';
import { useConnections } from '../../utils/useConnections';
import { registerForPush, onNotificationReceived } from '../../utils/notifications';
import AppDrawer, { defaultDrawerItems } from '../../components/AppDrawer';
import CompleteProfileCard from '../../components/CompleteProfileCard';
import HomeBanner from '../../components/HomeBanner';
import BrowseProfilesBanner from '../../components/BrowseProfilesBanner';
import HomeRail from '../../components/HomeRail';
import TrustRow from '../../components/TrustRow';
import TopStories from '../../components/TopStories';
import ProfileFeedCard from '../../components/ProfileFeedCard';
import FeedSkeleton from '../../components/FeedSkeleton';
import {
  colors,
  font,
  spacing,
  auth,
  profileId,
  profileName,
  profileCode,
  profileImage,
  type Profile,
} from '../../components/theme';
import Loader from '../../components/Loader';

/** How many profiles a rail carries. */
const RAIL_SIZE = 12;

const PAGE_SIZE = 10;

export default function HomeScreen() {
  const router = useGuardedRouter();
  const insets = useSafeAreaInsets();

  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [stories, setStories] = useState<Profile[]>([]);
  const [storiesRefreshKey, setStoriesRefreshKey] = useState(0);
  const [visitors, setVisitors] = useState<Profile[]>([]);

  /**
   * Newest members, straight off the feed rather than from another request.
   *
   * getUsers already sorts by createdAt DESC with id DESC as the tiebreak, so
   * the head of page 0 IS the newest profiles - fetching them again would be
   * the same rows over the same wire for the same answer.
   */
  const newest = profiles.slice(0, RAIL_SIZE);
  const [myId, setMyId] = useState<string | number | null>(null);
  const [myImage, setMyImage] = useState<string | null>(null);
  const [myName, setMyName] = useState<string | null>(null);
  const [myMemberId, setMyMemberId] = useState<string | null>(null);
  const [myGender, setMyGender] = useState<string | null>(null);
  const [isVerified, setIsVerified] = useState<boolean | null>(null);
  // `verified: false` is also the default for a newly created account. The
  // moderation status distinguishes an unsubmitted profile (created) from one
  // that an admin is actually reviewing (pending).
  const [profileStatus, setProfileStatus] = useState<string | null>(null);
  // Null until /user answers, so neither hero flashes before we know which one
  // this member should be seeing.
  const [completion, setCompletion] = useState<number | null>(null);

  /**
   * Whether the prompt still has something to ask for.
   *
   * Driven by the two things it actually nags about - the five Basic Details
   * fields and at least one photo - rather than by the completion percentage.
   * The percentage counts every field on the profile, so it sits below 100 for
   * a long time after someone has done the essentials, and the card would have
   * followed them around for weeks with nothing useful left to say.
   *
   * Null while unknown, so nothing flashes before /user answers.
   */
  const [needsSetup, setNeedsSetup] = useState<boolean | null>(null);
  // Whether Basic details specifically is already done, so the Complete
  // Profile card can send someone straight to Photos instead of back through
  // a step they already filled in.
  const [basicDone, setBasicDone] = useState(false);
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [feedError, setFeedError] = useState<string | null>(null);
  const [unread, setUnread] = useState(0);
  const [menuOpen, setMenuOpen] = useState(false);

  // Seeded from the server so profiles already requested in an earlier session
  // render as "Request sent" instead of offering Connect again.
  const { stateOf, connect, withdraw, accept } = useConnections();

  // One tap cycles the request through its states, so the feed button always
  // does the obvious thing: ask, take back, or respond.
  const handleConnect = useCallback(
    (id: string | number) => {
      if (isVerified === false) {
        Alert.alert(
          profileStatus === 'pending' ? 'Profile Under Review' : 'Complete Your Profile',
          profileStatus === 'pending'
            ? 'Your profile is under review. Please wait for admin approval before sending connection requests.'
            : 'Please complete your profile first to send connection requests.'
        );
        return;
      }
      const state = stateOf(id);
      if (state === 'SENT') return withdraw(id);
      if (state === 'RECEIVED') return accept(id);
      if (state === 'CONNECTED') return;
      return connect(id);
    },
    [isVerified, profileStatus, stateOf, connect, withdraw, accept]
  );

  // Optimistic set - the feed reflects the tap immediately rather than waiting
  // for the round trip, and reverts if the request fails.
  const [shortlisted, setShortlisted] = useState<Set<string>>(new Set());

  const readPage = (res: any) => {
    const body = res?.data;
    const list = body?.content ?? body ?? [];
    return Array.isArray(list) ? list : [];
  };

  const loadPage = useCallback(async (next: number, replace = false) => {
    // The browse feed is gender-filtered; "See all" on the next screen is not.
    const res = await profileAPI.getProfiles(next, PAGE_SIZE, true);
    const list = readPage(res);

    setProfiles((prev) => (replace ? list : [...prev, ...list]));
    setHasMore(list.length === PAGE_SIZE);
    setPage(next);
    return list;
  }, []);

  /** Loads the feed and, when requested, the profile rails above it. */
  const bootstrap = useCallback(async (includeRails = true) => {
    let feed: Profile[] = [];
    try {
      setFeedError(null);
      feed = await loadPage(0, true);
      if (feed && feed.length > 0) {
        AsyncStorage.setItem('cached_feed_profiles', JSON.stringify(feed)).catch(() => {});
      }
    } catch (error: any) {
      console.log('Failed to load feed:', error?.message);
      setFeedError(error?.message || 'Failed to load feed');
    } finally {
      setLoading(false);
    }

    if (!includeRails) return;

    // Both rails are decoration around the feed, so they are fetched after it
    // and each failure is swallowed separately. A rail that will not load
    // should leave the feed alone rather than blank the screen.

    // The feed's own first rows are the fallback, which is what the rail used
    // to show before /user/stories existed. Without this the rail is simply
    // absent against any server that does not have the endpoint yet - which is
    // every deployed one until the backend ships - and an empty ring where a
    // row of faces belongs reads as a broken screen, not a missing feature.
    const fallback = feed.slice(0, 12);
    await Promise.all([
      profileAPI
        .getStories(12)
        .then((res) => {
          const list = Array.isArray(res.data) ? res.data : [];
          setStories(list.length ? list : fallback);
        })
        .catch(() => setStories(fallback)),

      viewsAPI
        .getProfileViews(0, 12)
        .then((res) => {
          const body = res?.data;
          const rows = body?.content ?? (Array.isArray(body) ? body : []);
          // The view rows wrap the profile; older responses used a different key
          // for the same thing, so both are accepted.
          const people = (rows as any[])
            .map((v) => v?.viewerProfile ?? v?.viewedBy ?? v)
            .filter((p) => p && profileId(p) != null);

          // The same person visiting twice is one suggestion, and the rows come
          // back newest first, so the first sighting of an id is the one to keep.
          const seen = new Set<string>();
          setVisitors(
            people.filter((p) => {
              const key = String(profileId(p));
              if (seen.has(key)) return false;
              seen.add(key);
              return true;
            })
          );
        })
        .catch(() => setVisitors([])),
    ]);
  }, [loadPage]);

  const refreshUnread = useCallback(() => {
    notificationAPI
      .unreadCount()
      .then((res) => setUnread(Number(res.data?.count ?? 0)))
      .catch(() => {});
  }, []);

  /** Refreshes the signed-in member after an admin approval changes `verified`. */
  const applyCurrentMember = useCallback((me: any) => {
    setMyId(profileId(me) ?? me?.id ?? me?.userProfileId ?? me?.displayId ?? null);
    setMyName(profileName(me));
    setMyMemberId(profileCode(me));
    setMyImage(profileImage(me));
    setMyGender(me?.gender ?? null);
    setCompletion(Number(me?.profileCompletion ?? 0));
    const moderationStatus = me?.status == null ? null : String(me.status).toLowerCase();
    // The admin approval transaction writes both values. Accept either one on
    // the client so a delayed/read-replica response with only APPROVED never
    // leaves a genuinely approved member behind the review banner.
    setIsVerified(me?.verified === true || moderationStatus === 'approved');
    setProfileStatus(moderationStatus);

    const filled = (v: any) => v !== null && v !== undefined && String(v).trim() !== '';
    const basic =
      filled(me.name) &&
      filled(me.gender) &&
      filled(me.dateOfBirth) &&
      filled(me.maritalStatus) &&
      filled(me.mobileNo);
    const hasPhoto =
      (me.profileImageDetails?.length ?? 0) > 0 ||
      (me.profileImages?.length ?? 0) > 0 ||
      filled(me.profileImage);

    setBasicDone(basic);
    setNeedsSetup(!basic || !hasPhoto);
  }, []);

  const refreshCurrentMember = useCallback(async () => {
    try {
      const res = await profileAPI.getMe();
      applyCurrentMember(res.data ?? {});
    } catch (error: any) {
      console.log('Failed to refresh current profile:', error?.message);
      setNeedsSetup(false);
    }
  }, [applyCurrentMember]);

  useEffect(() => {
    // 1. Instant cached feed display if available
    AsyncStorage.getItem('cached_feed_profiles')
      .then((cached) => {
        if (cached) {
          try {
            const list = JSON.parse(cached);
            if (Array.isArray(list) && list.length > 0) {
              setProfiles(list);
              setLoading(false);
            }
          } catch {}
        }
      })
      .catch(() => {});

    // 2. Fetch fresh feed and user details
    bootstrap();
    refreshCurrentMember();
    AsyncStorage.getItem('user_data').catch(() => {});

    // Home is the first authenticated screen, so this is where the device
    // registers for push. Safe to repeat - the backend upserts by token.
    registerForPush();
    refreshUnread();

    // Bump the badge the moment a push lands while the app is open.
    return onNotificationReceived(refreshUnread);
  }, [bootstrap, refreshCurrentMember, refreshUnread]);

  // Coming back from the notifications screen should clear the badge.
  useFocusEffect(
    useCallback(() => {
      refreshUnread();
      refreshCurrentMember();
    }, [refreshCurrentMember, refreshUnread]),
  );

  const onRefresh = async () => {
    setRefreshing(true);
    try {
      // Refresh every visible data source, including both story rails. The
      // refresh key tells TopStories to discard its local cached response.
      await Promise.all([bootstrap(true), refreshCurrentMember(), refreshUnread()]);
      setStoriesRefreshKey((current) => current + 1);
    } finally {
      setRefreshing(false);
    }
  };

  const onEndReached = async () => {
    if (loadingMore || !hasMore || loading) return;
    setLoadingMore(true);
    try {
      await loadPage(page + 1);
    } catch (error: any) {
      console.log('Failed to load more:', error?.message);
    } finally {
      setLoadingMore(false);
    }
  };

  const openProfile = useCallback(
    (id: string | number) => router.push(`/profile-detail/${id}`),
    [router]
  );

  // Read through a ref rather than closing over `shortlisted` directly. Naming
  // the state in the dependency array would give every card a new callback each
  // time any profile is shortlisted, which is exactly the re-render that
  // memoising ProfileFeedCard is meant to stop.
  const shortlistedRef = useRef(shortlisted);
  shortlistedRef.current = shortlisted;

  const handleShortlist = useCallback(async (id: string | number) => {
    if (isVerified === false && profileStatus === 'pending') {
      Alert.alert(
        'Profile Under Review',
        'Your profile is under review. Please wait for admin approval before adding profiles to your shortlist.'
      );
      return;
    }

    const key = String(id);
    const isOn = shortlistedRef.current.has(key);

    setShortlisted((prev) => {
      const next = new Set(prev);
      if (isOn) next.delete(key);
      else next.add(key);
      return next;
    });

    try {
      if (isOn) await shortlistAPI.remove(id);
      else await shortlistAPI.add(id);
    } catch (error: any) {
      setShortlisted((prev) => {
        const next = new Set(prev);
        if (isOn) next.add(key);
        else next.delete(key);
        return next;
      });
      const message =
        error.response?.data?.message ||
        error.response?.data?.detail ||
        error.message ||
        'Failed to update shortlist';
      const underReview = /under verification|under review|admin approval/i.test(String(message));
      Alert.alert(underReview ? 'Profile Under Review' : 'Error', underReview
        ? 'Your profile is under review. Please wait for admin approval before adding profiles to your shortlist.'
        : message);
    }
  }, [isVerified, profileStatus]);

  const renderHeader = useCallback(
    () => (
      <View>
        {/* Featured Stories rail - positioned at the very top of the app */}
        <TopStories
          myId={myId}
          myImage={myImage}
          fallbackProfiles={stories.length > 0 ? stories : newest}
          refreshKey={storiesRefreshKey}
          onPressProfile={openProfile}
          onPressMine={() => router.push('/profile-setup?step=photos')}
        />

        {isVerified === false && profileStatus === 'pending' && (
          <View style={styles.reviewBanner}>
            <Ionicons name="information-circle" size={18} color="#2563EB" />
            <Text style={styles.reviewText}>Profile Under Review</Text>
          </View>
        )}

        {needsSetup ? (
          <CompleteProfileCard
            completion={completion ?? 0}
            onAddDetails={() =>
              router.push(basicDone ? '/profile-setup?step=photos' : '/profile-setup')
            }
            onKundali={() => router.push('/kundali')}
          />
        ) : (
          <View>
            <HomeBanner />
            <BrowseProfilesBanner onPress={() => router.push('/all-profiles?mode=swipe')} />
          </View>
        )}

        {/* Suggested for you rail */}
        <HomeRail
          title="Suggested for you"
          profiles={newest}
          variant="filled"
          stateOf={stateOf}
          onConnect={handleConnect}
          onPressProfile={openProfile}
          onShortlist={handleShortlist}
          isShortlisted={(id) => shortlisted.has(String(id))}
          onSeeAll={() => router.push('/all-profiles')}
        />

        {/* Feed Header */}
        <View style={styles.feedHeader}>
          <View style={styles.feedHeaderTitleRow}>
            <Ionicons name="sparkles" size={18} color={auth.crimsonLight} />
            <Text style={styles.feedHeading}>Explore Profiles</Text>
          </View>
          <TouchableOpacity
            onPress={() => router.push('/all-profiles')}
            hitSlop={8}
            accessibilityRole="button"
          >
            <Text style={styles.seeAll}>See all</Text>
          </TouchableOpacity>
        </View>
      </View>
    ),
    [
      myId,
      myImage,
      stories,
      newest,
      openProfile,
      router,
      isVerified,
      profileStatus,
      basicDone,
      needsSetup,
      completion,
      stateOf,
      handleConnect,
      handleShortlist,
      shortlisted,
    ]
  );

  const renderFeedItem = useCallback(
    ({ item, index }: { item: Profile; index: number }) => {
      const id = profileId(item);
      return (
        <View>
          {/* Insert Recently visited rail before 2nd card */}
          {index === 1 && visitors.length > 0 && (
            <HomeRail
              title="Recently visited your profile"
              profiles={visitors}
              variant="outline"
              stateOf={stateOf}
              onConnect={handleConnect}
              onPressProfile={openProfile}
              onShortlist={handleShortlist}
              isShortlisted={(sid) => shortlisted.has(String(sid))}
              onSeeAll={() => router.push('/recent-visitors')}
            />
          )}

          {/* Membership-plan promotion intentionally hidden until plans are re-enabled. */}

          <ProfileFeedCard
            profile={item}
            state={stateOf(id)}
            shortlisted={shortlisted.has(String(id))}
            onPress={openProfile}
            onConnect={handleConnect}
            onShortlist={handleShortlist}
            onKundali={() => router.push('/kundali')}
          />
        </View>
      );
    },
    [visitors, stateOf, handleConnect, openProfile, handleShortlist, shortlisted, router]
  );

  const renderFooter = useCallback(
    () => (
      <View>
        {loadingMore && (
          <View style={styles.loadingMore}>
            <Loader size={26} />
          </View>
        )}

        {!hasMore && profiles.length > 0 && (
          <Text style={styles.endText}>{"You've seen all available profiles"}</Text>
        )}

        {/* Trust badges at the very end */}
        <TrustRow />
      </View>
    ),
    [loadingMore, hasMore, profiles.length]
  );

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.topBar}>
        <TouchableOpacity
          hitSlop={8}
          onPress={() => setMenuOpen(true)}
          accessibilityLabel="Open menu"
        >
          <Ionicons name="menu" size={28} color="#000000" />
        </TouchableOpacity>

        <View style={styles.topBarTitle}>
          <Text style={styles.wordmark}>Lodha Parinay</Text>
          <Ionicons name="chevron-down" size={14} color="#1A1A1A" style={{ marginLeft: 3, marginTop: 3 }} />
        </View>

        <TouchableOpacity
          hitSlop={8}
          onPress={() => router.push('/notifications')}
          accessibilityLabel={unread > 0 ? `Notifications, ${unread} unread` : 'Notifications'}
        >
          <Ionicons
            name={unread > 0 ? 'notifications' : 'notifications-outline'}
            size={26}
            color="#000000"
          />
          {unread > 0 && (
            <View style={styles.badge}>
              <Text style={styles.badgeText}>{unread > 99 ? '99+' : unread}</Text>
            </View>
          )}
        </TouchableOpacity>
      </View>

      {loading && profiles.length === 0 ? (
        <FeedSkeleton />
      ) : feedError && profiles.length === 0 ? (
        <View style={styles.errorContainer}>
          <Ionicons name="cloud-offline-outline" size={56} color="#9CA3AF" />
          <Text style={styles.errorTitle}>Couldn&apos;t load feed</Text>
          <Text style={styles.errorBody}>
            Please check your internet connection and try again.
          </Text>
          <TouchableOpacity
            style={styles.retryBtn}
            activeOpacity={0.8}
            onPress={onRefresh}
            accessibilityRole="button"
          >
            <Ionicons name="reload" size={16} color="#FFFFFF" style={{ marginRight: 6 }} />
            <Text style={styles.retryText}>Retry</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={profiles}
          keyExtractor={(item, index) => `${profileId(item) ?? 'p'}-${index}`}
          renderItem={renderFeedItem}
          ListHeaderComponent={renderHeader()}
          ListFooterComponent={renderFooter()}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scroll}
          onEndReached={onEndReached}
          onEndReachedThreshold={0.5}
          initialNumToRender={2}
          maxToRenderPerBatch={3}
          windowSize={5}
          removeClippedSubviews={Platform.OS === 'android'}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor={colors.accent}
            />
          }
        />
      )}

      <AppDrawer
        visible={menuOpen}
        onClose={() => setMenuOpen(false)}
        name={myName}
        memberId={myMemberId}
        avatarUrl={myImage}
        gender={myGender}
        items={defaultDrawerItems(router.push)}
      />
    </View>
  );
}

const styles = StyleSheet.create({

  reviewBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: '#EFF6FF',
    marginHorizontal: spacing.md,
    marginTop: spacing.md,
    marginBottom: spacing.xs,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#BFDBFE',
  },
  reviewText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#2563EB',
  },

  scroll: { paddingBottom: 28 },
  container: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.hairline,
  },
  topBarTitle: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  wordmark: {
    fontSize: 20,
    color: '#1A1A1A',
    fontWeight: '600',
    fontStyle: 'italic',
    letterSpacing: -0.2,
    ...Platform.select({
      ios: { fontFamily: 'Snell Roundhand' },
      android: { fontFamily: 'serif' },
    }),
  },
  badge: {
    position: 'absolute',
    top: -4,
    right: -6,
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    paddingHorizontal: 4,
    backgroundColor: colors.danger,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: colors.bg,
  },
  badgeText: {
    color: colors.white,
    fontSize: 10,
    fontWeight: 'bold',
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sectionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    paddingTop: spacing.md,
    paddingBottom: spacing.sm,
  },
  sectionTitle: {
    fontSize: font.label,
    fontWeight: '600',
    color: colors.text,
  },
  seeAll: {
    fontSize: font.body,
    fontWeight: '600',
    color: colors.link,
  },
  feedHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    paddingTop: spacing.xl,
    paddingBottom: spacing.sm,
  },
  feedHeaderTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  feedHeading: {
    fontSize: font.title,
    fontWeight: '700',
    color: colors.text,
  },
  loadingMore: {
    paddingVertical: spacing.lg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  footer: {
    paddingVertical: spacing.xl,
  },
  endText: {
    textAlign: 'center',
    color: colors.textMuted,
    fontSize: font.body,
    paddingVertical: spacing.xl,
  },
  empty: {
    alignItems: 'center',
    paddingVertical: 64,
    gap: spacing.md,
  },
  emptyText: {
    color: colors.textMuted,
    fontSize: font.label,
  },
  errorContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.xl,
    paddingTop: 80,
  },
  errorTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1F2937',
    marginTop: spacing.md,
  },
  errorBody: {
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
    marginTop: 6,
    lineHeight: 20,
  },
  retryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: auth.crimson,
    paddingHorizontal: 22,
    paddingVertical: 10,
    borderRadius: 8,
    marginTop: spacing.lg,
  },
  retryText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#FFFFFF',
  },
});

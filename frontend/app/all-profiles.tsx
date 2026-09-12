import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  TextInput,
  RefreshControl,
  Alert,
} from 'react-native';
import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { profileAPI, shortlistAPI } from '../utils/api';
import { useGuardedRouter } from '../utils/useGuardedRouter';
import { useConnections, connectionAction } from '../utils/useConnections';
import { getPassedIds, markConnected, markPassed } from '../utils/passedProfiles';
import ProfileRow from '../components/ProfileRow';
import SwipeDeck from '../components/SwipeDeck';
import Loader from '../components/Loader';
import ProfileFilterSheet, { type ProfileFilters, hasActiveFilters } from '../components/ProfileFilterSheet';
import {
  colors,
  font,
  radius,
  spacing,
  profileId,
  profileMatches,
  type Profile,
} from '../components/theme';

const PAGE_SIZE = 20;
type Mode = 'list' | 'swipe';

/**
 * All profiles.
 *
 * Defaults to the list, which is what "See all" on the home feed implies, with
 * a toggle into the swipe deck for browsing one at a time. Both modes share the
 * same paginated data, so switching never refetches.
 */
export default function AllProfilesScreen() {
  const router = useGuardedRouter();
  const insets = useSafeAreaInsets();
  // "Browse profiles" on home links straight into the swipe deck rather than
  // the list - that button already promises "browse", and landing on a list
  // would mean the very next thing to do is find and tap the mode toggle.
  const { mode: initialMode } = useLocalSearchParams<{ mode?: string }>();

  const [mode, setMode] = useState<Mode>(initialMode === 'swipe' ? 'swipe' : 'list');
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [swipeProfiles, setSwipeProfiles] = useState<Profile[]>([]);
  const [index, setIndex] = useState(0);
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const { stateOf, connect, withdraw, accept } = useConnections();

  // Read through a ref so loadPage does not take stateOf as a dependency.
  // It changes identity whenever a connection changes, and loadPage sits
  // behind an effect - depending on it directly would refetch page 0 and
  // reset the deck every time the member pressed Connect.
  const stateRef = useRef(stateOf);
  stateRef.current = stateOf;

  const [filters, setFilters] = useState<ProfileFilters>({});
  const [filterSheetOpen, setFilterSheetOpen] = useState(false);

  const [isVerified, setIsVerified] = useState<boolean | null>(null);

  // Marital status defaults to the caller's own, as asked - people generally
  // browse within their own status. It is only a starting point: Reset in the
  // sheet clears it, and nothing here re-applies it after that.
  useEffect(() => {
    profileAPI
      .getMe()
      .then((res) => {
        setIsVerified(res?.data?.verified === true);
        const own = res?.data?.maritalStatus;
        if (own) setFilters((prev) => ({ ...prev, maritalStatus: prev.maritalStatus ?? own }));
      })
      .catch(() => {});
  }, []);



  const loadPage = useCallback(
    async (next: number, replace = false) => {
      try {
        const [res, passed] = await Promise.all([
          profileAPI.getProfiles(next, PAGE_SIZE, false, filters),
          getPassedIds(),
        ]);
        const body = res?.data;
        const rawList: Profile[] = Array.isArray(body?.content ?? body) ? (body?.content ?? body) : [];
        // "All profiles" (list mode) shows every profile, full stop - a left
        // swipe only means "skip this in the card deck", not "hide it forever".
        setProfiles((prev) => (replace ? rawList : [...prev, ...rawList]));

        // The swipe deck excludes anyone already dealt with: swiped left once
        // already on this device, or connected to.
        //
        // Connection state is checked from the server's list rather than the
        // on-device one so that connecting from the website also takes the card
        // out of the deck on the phone. Anything other than NONE counts - a
        // request sent, received, or accepted all mean this is no longer a
        // stranger to decide about.
        //
        // hasMore still reflects the server's page size, not the filtered
        // count, so paging keeps requesting full pages rather than stopping
        // early because a page happened to be mostly passed profiles.
        const swipeList = rawList.filter((p) => {
          const id = profileId(p);
          if (id == null) return true;
          if (passed.has(String(id))) return false;
          return stateRef.current(id) === 'NONE';
        });
        setSwipeProfiles((prev) => (replace ? swipeList : [...prev, ...swipeList]));

        setHasMore(rawList.length === PAGE_SIZE);
        setPage(next);
        return rawList;
      } catch (e: any) {
        throw e;
      }
    },
    [filters]
  );

  useEffect(() => {
    setLoading(true);
    setHasMore(true);
    setIndex(0);
    loadPage(0, true)
      .catch((e: any) => console.log('Failed to load profiles:', e?.message))
      .finally(() => setLoading(false));
    // Re-runs whenever the applied filters change - loadPage already carries
    // them, so this is really "filters changed, reload from page 0".
  }, [loadPage]);

  const fetchMore = useCallback(async () => {
    if (loadingMore || !hasMore || loading) return;
    setLoadingMore(true);
    try {
      await loadPage(page + 1);
    } catch (e: any) {
      console.log('Failed to load more:', e?.message);
    } finally {
      setLoadingMore(false);
    }
  }, [loadingMore, hasMore, loading, page, loadPage]);

  // In swipe mode there is no scroll position to trigger paging, so top the
  // deck up before it runs dry.
  useEffect(() => {
    if (mode !== 'swipe') return;
    if (swipeProfiles.length - index > 4) return;
    fetchMore();
  }, [mode, index, swipeProfiles.length, fetchMore]);

  const onRefresh = () => {
    setRefreshing(true);
    setIndex(0);
    setHasMore(true);
    loadPage(0, true)
      .catch(() => {})
      .finally(() => setRefreshing(false));
  };

  const handleShortlist = async (id: string | number) => {
    try {
      await shortlistAPI.add(id);
    } catch (error: any) {
      Alert.alert('Error', error?.response?.data?.detail || 'Failed to shortlist');
    }
  };

  const openProfile = (id: string | number) => router.push(`/profile-detail/${id}`);

  const data = useMemo(() => {
    if (!query.trim()) return profiles;
    return profiles.filter((p) => profileMatches(p, query));
  }, [profiles, query]);

  const deckDone = mode === 'swipe' && !loading && !swipeProfiles[index] && !hasMore;

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.topBar}>
        <TouchableOpacity hitSlop={8} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={styles.title}>All profiles</Text>
        <View style={styles.topBarActions}>
          <TouchableOpacity
            hitSlop={8}
            onPress={() => setMode((m) => (m === 'list' ? 'swipe' : 'list'))}
            accessibilityLabel={mode === 'list' ? 'Switch to card view' : 'Switch to list view'}
          >
            <Ionicons
              name={mode === 'list' ? 'albums-outline' : 'list-outline'}
              size={24}
              color={colors.text}
            />
          </TouchableOpacity>
        </View>
      </View>

      <ProfileFilterSheet
        visible={filterSheetOpen}
        value={filters}
        onApply={setFilters}
        onClose={() => setFilterSheetOpen(false)}
      />

      {loading ? (
        <View style={styles.center}>
          <Loader size={38} />
        </View>
      ) : mode === 'swipe' ? (
        deckDone ? (
          <View style={styles.center}>
            <View style={styles.empty}>
              <Ionicons name="checkmark-done-outline" size={56} color={colors.textFaint} />
              <Text style={styles.emptyTitle}>You&apos;ve seen everyone</Text>
              <Text style={styles.emptyText}>Switch to list view to browse again</Text>
              <TouchableOpacity style={styles.pillBtn} onPress={() => setIndex(0)}>
                <Text style={styles.pillText}>Start over</Text>
              </TouchableOpacity>
            </View>
          </View>
        ) : (
          <SwipeDeck
            profiles={swipeProfiles}
            index={index}
            onSwipe={(direction, profile) => {
              const id = profileId(profile);
              if (direction === 'right' && id != null) {
                if (isVerified === false) {
                  Alert.alert(
                    'Complete Your Profile',
                    'Please complete your profile first to send connection requests.'
                  );
                  return;
                }
                connect(id);
                // Also taken out of the deck, so it does not reappear on a
                // cold start before connection state has loaded.
                markConnected(id);
              }
              // Swiping left is a pass, kept on-device so this face does not
              // resurface next time the deck opens - see utils/passedProfiles.
              else if (direction === 'left' && id != null) markPassed(id);
              setIndex((i) => i + 1);
            }}
            onShortlist={handleShortlist}
            onOpen={openProfile}
          />
        )
      ) : (
        <>
          <View style={styles.searchWrap}>
            <Ionicons name="search" size={17} color={colors.textMuted} />
            <TextInput
              style={styles.search}
              placeholder="Search by name or ID"
              placeholderTextColor={colors.textMuted}
              value={query}
              onChangeText={setQuery}
              autoCapitalize="none"
            />
            {!!query && (
              <TouchableOpacity hitSlop={8} onPress={() => setQuery('')} accessibilityLabel="Clear">
                <Ionicons name="close-circle" size={17} color={colors.textMuted} />
              </TouchableOpacity>
            )}
          </View>

          <TouchableOpacity
            style={[styles.filterPill, hasActiveFilters(filters) && styles.filterPillActive]}
            activeOpacity={0.8}
            onPress={() => setFilterSheetOpen(true)}
            accessibilityLabel="Filter profiles"
          >
            <Ionicons
              name="options-outline"
              size={17}
              color={hasActiveFilters(filters) ? colors.white : colors.text}
            />
            <Text style={[styles.filterPillText, hasActiveFilters(filters) && styles.filterPillTextActive]}>
              Filter
            </Text>
          </TouchableOpacity>

          <FlatList
            data={data}
            keyExtractor={(item, i) => `${profileId(item) ?? 'p'}-${i}`}
            showsVerticalScrollIndicator={false}
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={onRefresh}
                tintColor={colors.accent}
              />
            }
            renderItem={({ item }) => {
              const id = profileId(item);
              const state = stateOf(id);
              const action = connectionAction(state);
              return (
                <ProfileRow
                  profile={item}
                  action={{
                    ...action,
                    onPress: () => {
                      if (id == null) return;
                      if (isVerified === false && state !== 'SENT' && state !== 'RECEIVED') {
                        Alert.alert(
                          'Complete Your Profile',
                          'Please complete your profile first to send connection requests.'
                        );
                        return;
                      }
                      if (state === 'SENT') withdraw(id);
                      else if (state === 'RECEIVED') accept(id);
                      else if (state !== 'CONNECTED') connect(id);
                    },
                  }}
                  onPress={() => id != null && openProfile(id)}
                />
              );
            }}
            // Searching filters the pages already loaded, so paging while a
            // query is active would append results the filter then hides.
            onEndReached={query ? undefined : fetchMore}
            onEndReachedThreshold={0.6}
            ListFooterComponent={
              loadingMore ? (
                <View style={styles.footer}>
                  <Loader size={38} />
                </View>
              ) : !hasMore && profiles.length > 0 && !query ? (
                <Text style={styles.endText}>No more profiles</Text>
              ) : null
            }
            ListEmptyComponent={
              <View style={styles.empty}>
                <Ionicons
                  name={query ? 'search-outline' : 'people-outline'}
                  size={48}
                  color={colors.textFaint}
                />
                <Text style={styles.emptyTitle}>
                  {query ? 'No matches' : 'No profiles yet'}
                </Text>
                <Text style={styles.emptyText}>
                  {query
                    ? `Nothing loaded matches “${query}”`
                    : 'Check back soon for new profiles.'}
                </Text>
              </View>
            }
          />
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
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
  title: {
    fontSize: font.heading,
    fontWeight: '600',
    color: colors.text,
  },
  topBarActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.lg,
  },
  filterPill: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: 6,
    marginHorizontal: spacing.md,
    marginBottom: spacing.sm,
    paddingHorizontal: spacing.md,
    height: 34,
    borderRadius: radius.pill,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  filterPillActive: {
    backgroundColor: colors.text,
    borderColor: colors.text,
  },
  filterPillText: {
    fontSize: font.label,
    fontWeight: '600',
    color: colors.text,
  },
  filterPillTextActive: {
    color: colors.white,
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  searchWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    margin: spacing.md,
    paddingHorizontal: spacing.md,
    height: 38,
    borderRadius: radius.md,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  search: {
    flex: 1,
    fontSize: font.label,
    color: colors.text,
    padding: 0,
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
    paddingTop: 64,
    paddingHorizontal: spacing.xl,
    gap: spacing.sm,
  },
  emptyTitle: {
    fontSize: font.title,
    fontWeight: '600',
    color: colors.text,
    marginTop: spacing.sm,
  },
  emptyText: {
    fontSize: font.body,
    color: colors.textMuted,
    textAlign: 'center',
  },
  pillBtn: {
    marginTop: spacing.lg,
    paddingHorizontal: 24,
    paddingVertical: 10,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.link,
  },
  pillText: {
    color: colors.link,
    fontSize: font.label,
    fontWeight: '600',
  },
});

import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  TextInput,
  Alert,
  RefreshControl,
} from 'react-native';
import { useState, useCallback, useMemo } from 'react';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFocusEffect } from 'expo-router';
import { likeAPI } from '../../utils/api';
import { useGuardedRouter } from '../../utils/useGuardedRouter';
import { useConnections } from '../../utils/useConnections';
import { confirmAction } from '../../utils/confirm';
import ProfileRow, { type RowAction } from '../../components/ProfileRow';
import {
  auth,
  colors,
  font,
  radius,
  spacing,
  cardShadow,
  profileId,
  profileMatches,
  formatFullTimeAgo,
  type Profile,
} from '../../components/theme';
import Loader from '../../components/Loader';

type Tab = 'received' | 'sent';
type SortKey = 'recent' | 'name';

type LikeItem = {
  raw: any;
  profile: Profile;
  status: string;
  at?: string;
};

/**
 * Interests / Matches screen matching mockup:
 * - Segmented tabs with red active underline
 * - Modern rounded search bar
 * - Sort by Recent dropdown
 * - Clean cards with clear hierarchy, map pin, full relative timestamps & status chips
 */
export default function LikesScreen() {
  const router = useGuardedRouter();
  const insets = useSafeAreaInsets();

  const [tab, setTab] = useState<Tab>('received');
  const [received, setReceived] = useState<LikeItem[]>([]);
  const [sent, setSent] = useState<LikeItem[]>([]);
  const [sort, setSort] = useState<SortKey>('recent');
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const { refresh: refreshConnections } = useConnections();

  const normalise = (item: any): LikeItem => {
    const p = item.likedProfile || item.profile || item.user || {};
    let status = String(item.status ?? '').toLowerCase();
    if (status === 'rejected') status = 'declined';

    return {
      raw: item,
      profile: {
        ...p,
        city: p.city || p.presentAddress || '',
        state: p.state || '',
      },
      status,
      at: item.likedAt || item.liked_at || item.createdAt,
    };
  };

  const load = useCallback(async () => {
    try {
      const [recRes, sentRes] = await Promise.all([
        likeAPI.getReceivedLikes(),
        likeAPI.getSentLikes(),
      ]);

      const clean = (res: any) =>
        (Array.isArray(res?.data) ? res.data : (res?.data?.content ?? []))
          .map(normalise)
          .filter((x: LikeItem) => profileId(x.profile) != null);

      setReceived(clean(recRes));
      setSent(clean(sentRes));
    } catch {
      Alert.alert('Error', 'Failed to load interests');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  const onRefresh = () => {
    setRefreshing(true);
    load();
  };

  const act = async (fn: () => Promise<any>, failure: string) => {
    try {
      await fn();
      await Promise.all([load(), refreshConnections()]);
    } catch (error: any) {
      Alert.alert('Error', error?.response?.data?.detail || failure);
    }
  };

  const data = useMemo(() => {
    const list = tab === 'received' ? received : sent;
    const q = query.trim().toLowerCase();
    const copy = q ? list.filter((x) => profileMatches(x.profile, query)) : [...list];
    if (sort === 'name') {
      copy.sort((a, b) =>
        String(a.profile.name ?? '').localeCompare(String(b.profile.name ?? ''))
      );
    } else {
      copy.sort((a, b) => new Date(b.at ?? 0).getTime() - new Date(a.at ?? 0).getTime());
    }
    return copy;
  }, [tab, received, sent, sort, query]);

  const actionFor = (item: LikeItem): RowAction => {
    const id = profileId(item.profile);
    if (id == null) return { label: '—', variant: 'muted', disabled: true };

    if (item.status === 'accepted') {
      return { label: 'Connected', variant: 'connected', disabled: true };
    }

    if (tab === 'received') {
      if (item.status === 'declined') return { label: 'Declined', variant: 'muted', disabled: true };
      return {
        label: 'Accept',
        variant: 'filled',
        onPress: () => act(() => likeAPI.acceptLike(id), 'Failed to accept'),
      };
    }

    return {
      label: 'Withdraw',
      variant: 'muted',
      onPress: () =>
        confirmAction('Withdraw request', 'Cancel your connection request?', 'Withdraw', () =>
          act(() => likeAPI.unlikeProfile(id), 'Failed to withdraw')
        ),
    };
  };

  const dismissFor = (item: LikeItem) => {
    const id = profileId(item.profile);
    if (id == null) return undefined;

    if (tab === 'received') {
      if (item.status === 'declined') return undefined;
      return () =>
        confirmAction('Decline interest', 'Decline this request?', 'Decline', () =>
          act(() => likeAPI.declineLike(id), 'Failed to decline')
        );
    }

    return () =>
      confirmAction('Withdraw request', 'Cancel your connection request?', 'Withdraw', () =>
        act(() => likeAPI.unlikeProfile(id), 'Failed to cancel')
      );
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.back}
          hitSlop={10}
          onPress={() => router.back()}
          accessibilityLabel="Go back"
        >
          <Ionicons name="arrow-back" size={22} color="#111827" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Interests</Text>
      </View>

      {/* Segmented Sub-Tabs */}
      <View style={styles.tabs}>
        <TouchableOpacity
          style={[styles.tab, tab === 'received' && styles.tabActive]}
          onPress={() => setTab('received')}
          activeOpacity={0.8}
        >
          <Ionicons
            name="person-outline"
            size={17}
            color={tab === 'received' ? '#111827' : '#6B7280'}
          />
          <Text style={[styles.tabText, tab === 'received' && styles.tabTextActive]}>
            {received.length} Received
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tab, tab === 'sent' && styles.tabActive]}
          onPress={() => setTab('sent')}
          activeOpacity={0.8}
        >
          <Ionicons
            name={tab === 'sent' ? 'heart' : 'heart-outline'}
            size={17}
            color={tab === 'sent' ? auth.crimson : '#6B7280'}
          />
          <Text style={[styles.tabText, tab === 'sent' && styles.tabTextActive]}>
            {sent.length} Sent
          </Text>
        </TouchableOpacity>
      </View>

      {/* Search Bar */}
      <View style={styles.searchWrap}>
        <Ionicons name="search" size={18} color="#9CA3AF" />
        <TextInput
          style={styles.search}
          placeholder="Search by name or ID"
          placeholderTextColor="#9CA3AF"
          value={query}
          onChangeText={setQuery}
          autoCapitalize="none"
        />
        {!!query && (
          <TouchableOpacity hitSlop={8} onPress={() => setQuery('')} accessibilityLabel="Clear search">
            <Ionicons name="close-circle" size={18} color="#9CA3AF" />
          </TouchableOpacity>
        )}
      </View>

      {/* Sort Row */}
      <View style={styles.sortRow}>
        <TouchableOpacity
          style={styles.sortButton}
          activeOpacity={0.75}
          onPress={() => setSort((s) => (s === 'recent' ? 'name' : 'recent'))}
        >
          <Text style={styles.sortLabel}>
            Sort by <Text style={styles.sortValue}>{sort === 'recent' ? 'Recent' : 'Name'}</Text>
          </Text>
          <Ionicons name="chevron-down" size={15} color="#111827" style={styles.sortChevron} />
        </TouchableOpacity>

        <TouchableOpacity
          hitSlop={8}
          onPress={() => setSort((s) => (s === 'recent' ? 'name' : 'recent'))}
          accessibilityLabel="Change sort order"
        >
          <Ionicons name="swap-vertical" size={20} color="#6B7280" />
        </TouchableOpacity>
      </View>

      {/* List */}
      {loading ? (
        <View style={styles.center}>
          <Loader size={38} />
        </View>
      ) : (
        <FlatList
          data={data}
          keyExtractor={(item, i) => `${profileId(item.profile) ?? 'l'}-${i}`}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.accent} />
          }
          renderItem={({ item }) => (
            <ProfileRow
              profile={item.profile}
              meta={item.at ? formatFullTimeAgo(item.at, tab === 'sent' ? 'Sent' : 'Received') : undefined}
              online={!!(item.profile as any)?.isOnline}
              action={actionFor(item)}
              onDismiss={dismissFor(item)}
              dismissLabel={tab === 'received' ? 'Decline' : 'Withdraw'}
              onPress={() => {
                const id = profileId(item.profile);
                if (id != null) router.push(`/profile-detail/${id}`);
              }}
            />
          )}
          ListEmptyComponent={
            <View style={styles.empty}>
              <Ionicons name="heart-outline" size={48} color={colors.textFaint} />
              <Text style={styles.emptyTitle}>
                {query
                  ? 'No matches'
                  : tab === 'received'
                    ? 'No interests yet'
                    : 'No requests sent'}
              </Text>
              <Text style={styles.emptyText}>
                {query
                  ? `Nothing loaded matches “${query}”`
                  : tab === 'received'
                    ? 'When someone connects with you, they’ll appear here'
                    : 'Profiles you connect with will appear here'}
              </Text>
              {!query && (
                <TouchableOpacity
                  style={styles.browseBtn}
                  onPress={() => router.push('/all-profiles')}
                >
                  <Text style={styles.browseText}>Browse profiles</Text>
                </TouchableOpacity>
              )}
            </View>
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FAFAFA',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 12,
    backgroundColor: colors.white,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#111827',
  },
  back: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },

  tabs: {
    flexDirection: 'row',
    backgroundColor: colors.white,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 14,
    borderBottomWidth: 2.5,
    borderBottomColor: 'transparent',
  },
  tabActive: {
    borderBottomColor: auth.crimson,
  },
  tabText: {
    fontSize: 14,
    color: '#6B7280',
    fontWeight: '500',
  },
  tabTextActive: {
    color: '#111827',
    fontWeight: '700',
  },

  searchWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginHorizontal: 16,
    marginTop: 14,
    paddingHorizontal: 14,
    height: 44,
    borderRadius: 12,
    backgroundColor: '#F3F4F6',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  search: {
    flex: 1,
    fontSize: 14,
    color: '#111827',
    padding: 0,
  },

  sortRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  sortButton: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  sortLabel: {
    fontSize: 13.5,
    color: '#6B7280',
  },
  sortValue: {
    fontWeight: '700',
    color: '#111827',
  },
  sortChevron: {
    marginLeft: 3,
    marginTop: 1,
  },

  listContent: {
    paddingBottom: 40,
  },

  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  empty: {
    alignItems: 'center',
    paddingTop: 60,
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
  browseBtn: {
    marginTop: spacing.lg,
    paddingHorizontal: 24,
    paddingVertical: 10,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.link,
  },
  browseText: {
    color: colors.link,
    fontSize: font.label,
    fontWeight: '600',
  },
});

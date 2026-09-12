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
import { useState, useCallback, useMemo, useEffect } from 'react';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFocusEffect, useLocalSearchParams } from 'expo-router';
import { shortlistAPI, likeAPI } from '../../utils/api';
import { useGuardedRouter } from '../../utils/useGuardedRouter';
import { useConnections, connectionAction } from '../../utils/useConnections';
import { confirmAction } from '../../utils/confirm';
import ProfileRow from '../../components/ProfileRow';
import Loader from '../../components/Loader';
import {
  auth,
  colors,
  font,
  radius,
  spacing,
  profileId,
  profileMatches,
  unwrapProfile,
  formatFullTimeAgo,
  type Profile,
} from '../../components/theme';

type Tab = 'connected' | 'saved';
type SortKey = 'recent' | 'name';

/**
 * Saved & Connected profiles screen matching mockup:
 * - Segmented tabs with red active indicator
 * - Modern rounded search bar
 * - Sort by Recent dropdown
 * - Clean cards with clear hierarchy, map pin, full relative timestamps & status chips
 */
export default function ShortlistScreen() {
  const router = useGuardedRouter();
  const insets = useSafeAreaInsets();

  const { tab: tabParam } = useLocalSearchParams<{ tab?: string }>();
  const [tab, setTab] = useState<Tab>(tabParam === 'connected' ? 'connected' : 'saved');
  const [items, setItems] = useState<Profile[]>([]);
  const [connected, setConnected] = useState<Profile[]>([]);
  const [sort, setSort] = useState<SortKey>('recent');
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const { stateOf, connect, withdraw, accept } = useConnections();

  useEffect(() => {
    if (tabParam === 'connected' || tabParam === 'saved') setTab(tabParam);
  }, [tabParam]);

  const load = useCallback(async () => {
    try {
      const [res, recRes, sentRes] = await Promise.all([
        shortlistAPI.getAll(),
        likeAPI.getReceivedLikes().catch(() => null),
        likeAPI.getSentLikes().catch(() => null),
      ]);
      const list = res.data?.content ?? res.data ?? [];
      setItems((Array.isArray(list) ? list : []).map(unwrapProfile));

      const accepted = (r: any) => {
        const rows = r?.data?.content ?? r?.data ?? [];
        return (Array.isArray(rows) ? rows : [])
          .filter((x: any) => String(x?.status ?? '').toUpperCase() === 'ACCEPTED')
          .map(unwrapProfile);
      };

      const seen = new Set<string>();
      setConnected(
        [...accepted(recRes), ...accepted(sentRes)].filter((p) => {
          const key = String(profileId(p));
          if (!key || seen.has(key)) return false;
          seen.add(key);
          return true;
        })
      );
    } catch {
      Alert.alert('Error', 'Failed to load shortlist');
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

  const handleRemove = (id: string | number) => {
    confirmAction('Remove from shortlist', 'Remove this profile?', 'Remove', async () => {
      const before = items;
      setItems((prev) => prev.filter((p) => String(profileId(p)) !== String(id)));
      try {
        await shortlistAPI.remove(id);
      } catch {
        setItems(before);
        Alert.alert('Error', 'Failed to remove');
      }
    });
  };

  const handleDisconnect = (id: string | number) => {
    confirmAction(
      'Remove Connection',
      'Are you sure you want to disconnect from this profile?',
      'Disconnect',
      async () => {
        const before = connected;
        setConnected((prev) => prev.filter((p) => String(profileId(p)) !== String(id)));
        try {
          await withdraw(id);
        } catch {
          setConnected(before);
          Alert.alert('Error', 'Failed to remove connection');
        }
      }
    );
  };

  const data = useMemo(() => {
    const source = tab === 'saved' ? items : connected;
    const q = query.trim().toLowerCase();
    const copy = q ? source.filter((p) => profileMatches(p, query)) : [...source];
    if (sort === 'name') {
      copy.sort((a, b) =>
        String(a.name ?? '').localeCompare(String(b.name ?? ''))
      );
    } else {
      copy.sort((a, b) => {
        const atA = (a as any).shortlistedAt || (a as any).createdAt || 0;
        const atB = (b as any).shortlistedAt || (b as any).createdAt || 0;
        return new Date(atB).getTime() - new Date(atA).getTime();
      });
    }
    return copy;
  }, [items, connected, tab, query, sort]);

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Shortlist</Text>
        <Text style={styles.headerCount}>
          {data.length} {data.length === 1 ? 'profile' : 'profiles'}
        </Text>
      </View>

      {/* Segmented Sub-Tabs */}
      <View style={styles.tabs}>
        <TouchableOpacity
          style={[styles.tab, tab === 'connected' && styles.tabActive]}
          onPress={() => setTab('connected')}
          activeOpacity={0.8}
        >
          <Ionicons
            name="people-outline"
            size={17}
            color={tab === 'connected' ? '#111827' : '#6B7280'}
          />
          <Text style={[styles.tabText, tab === 'connected' && styles.tabTextActive]}>
            {connected.length} Connected
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tab, tab === 'saved' && styles.tabActive]}
          onPress={() => setTab('saved')}
          activeOpacity={0.8}
        >
          <Ionicons
            name={tab === 'saved' ? 'bookmark' : 'bookmark-outline'}
            size={17}
            color={tab === 'saved' ? auth.crimson : '#6B7280'}
          />
          <Text style={[styles.tabText, tab === 'saved' && styles.tabTextActive]}>
            {items.length} Shortlisted
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
          keyExtractor={(item, i) => `${profileId(item) ?? 's'}-${i}`}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.accent} />
          }
          renderItem={({ item }) => {
            const id = profileId(item);
            const state = stateOf(id);
            const action =
              tab === 'connected' || state === 'CONNECTED'
                ? {
                    label: 'Connected',
                    variant: 'connected' as const,
                    disabled: true,
                  }
                : {
                    ...connectionAction(state),
                    onPress: () => {
                      if (id == null) return;
                      if (state === 'SENT') withdraw(id);
                      else if (state === 'RECEIVED') accept(id);
                      else connect(id);
                    },
                  };

            const timestamp = (item as any).shortlistedAt || (item as any).createdAt;
            const meta = timestamp
              ? formatFullTimeAgo(timestamp, tab === 'connected' ? 'Connected' : 'Shortlisted')
              : undefined;

            return (
              <ProfileRow
                profile={item}
                action={action}
                meta={meta}
                online={!!(item as any)?.isOnline}
                onDismiss={
                  id != null
                    ? () => (tab === 'connected' ? handleDisconnect(id) : handleRemove(id))
                    : undefined
                }
                dismissLabel={tab === 'connected' ? 'Disconnect' : 'Remove'}
                onPress={() => id != null && router.push(`/profile-detail/${id}`)}
              />
            );
          }}
          ListEmptyComponent={
            <View style={styles.empty}>
              <Ionicons
                name={query ? 'search-outline' : tab === 'connected' ? 'people-outline' : 'bookmark-outline'}
                size={48}
                color={colors.textFaint}
              />
              <Text style={styles.emptyTitle}>
                {query ? 'No matches' : tab === 'connected' ? 'No connections yet' : 'Nothing shortlisted yet'}
              </Text>
              <Text style={styles.emptyText}>
                {query
                  ? `No saved profile matches “${query}”`
                  : tab === 'connected'
                    ? 'Profiles you connect with will show up here'
                    : 'Tap the bookmark on a profile to save it here'}
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
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
    backgroundColor: colors.white,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#111827',
  },
  headerCount: {
    fontSize: 13,
    color: '#6B7280',
    fontWeight: '500',
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

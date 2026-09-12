import {
  View,
  Text,
  StyleSheet,
  SectionList,
  TouchableOpacity,
  RefreshControl,
} from 'react-native';
import { useState, useEffect, useCallback, useMemo } from 'react';
import { Image } from 'expo-image';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { notificationAPI } from '../utils/api';
import { useGuardedRouter } from '../utils/useGuardedRouter';
import { onNotificationReceived } from '../utils/notifications';
import { colors, font, spacing, timeAgo } from '../components/theme';
import Loader from '../components/Loader';

const PAGE_SIZE = 20;

type Item = {
  id: number;
  type: string;
  title: string;
  body?: string;
  actorId?: string | null;
  actorName?: string | null;
  actorImage?: string | null;
  read: boolean;
  createdAt: string;
};

/**
 * The call to action on each row matching Image 3.
 */
const ACTIONS: Record<string, string> = {
  LIKE_RECEIVED: 'View Request',
  LIKE_ACCEPTED: 'View Profile',
  PROFILE_VIEW: 'View Profile',
  MESSAGE: 'View Profile',
  BROADCAST: 'View Matches',
  PROFILE_VERIFIED: 'View Profile',
};

/** Fallback glyph for a row whose actor has no photo. */
const ICONS: Record<string, any> = {
  LIKE_RECEIVED: 'heart',
  LIKE_ACCEPTED: 'checkmark-circle',
  PROFILE_VIEW: 'eye',
  MESSAGE: 'chatbubble',
  BROADCAST: 'sparkles',
  PROFILE_VERIFIED: 'shield-checkmark',
};

const DAY = 24 * 60 * 60 * 1000;

/**
 * Bucket by age into 'Recent' and 'Older' (matching Image 3).
 */
function groupByAge(items: Item[]) {
  const now = Date.now();
  const buckets: Record<string, Item[]> = { Recent: [], Older: [] };

  for (const item of items) {
    const at = new Date(item.createdAt).getTime();
    const age = Number.isNaN(at) ? Infinity : now - at;
    if (age < 2 * DAY || !item.read) {
      buckets.Recent.push(item);
    } else {
      buckets.Older.push(item);
    }
  }

  return Object.entries(buckets)
    .filter(([, data]) => data.length > 0)
    .map(([title, data]) => ({ title, data }));
}

export default function NotificationsScreen() {
  const router = useGuardedRouter();
  const insets = useSafeAreaInsets();

  const [items, setItems] = useState<Item[]>([]);
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const loadPage = useCallback(async (next: number, replace = false) => {
    const res = await notificationAPI.list(next, PAGE_SIZE);
    const body = res?.data;
    const list: Item[] = body?.content ?? (Array.isArray(body) ? body : []);

    setItems((prev) => (replace ? list : [...prev, ...list]));
    setHasMore(body?.last === undefined ? list.length === PAGE_SIZE : !body.last);
    setPage(next);
  }, []);

  const load = useCallback(async () => {
    try {
      await loadPage(0, true);
      await notificationAPI.markAllRead();
    } catch (error: any) {
      console.log('Failed to load notifications:', error?.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [loadPage]);

  useEffect(() => {
    load();
    return onNotificationReceived(() => load());
  }, [load]);

  const fetchMore = async () => {
    if (loadingMore || !hasMore || loading) return;
    setLoadingMore(true);
    try {
      await loadPage(page + 1);
    } catch {
      // Silent: the list simply stops growing.
    } finally {
      setLoadingMore(false);
    }
  };

  const open = (item: Item) => {
    if (item.actorId) router.push(`/profile-detail/${item.actorId}`);
    else if (item.type === 'BROADCAST') router.push('/(tabs)/home');
  };

  const sections = useMemo(() => groupByAge(items), [items]);

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.topBar}>
        <TouchableOpacity hitSlop={10} onPress={() => router.back()} accessibilityLabel="Go back">
          <Ionicons name="chevron-back" size={26} color="#1E293B" />
        </TouchableOpacity>
      </View>

      <Text style={styles.title}>What&apos;s New?</Text>

      {loading ? (
        <View style={styles.center}>
          <Loader size={38} />
        </View>
      ) : (
        <SectionList
          sections={sections}
          keyExtractor={(item, i) => `${item.id ?? 'n'}-${i}`}
          showsVerticalScrollIndicator={false}
          stickySectionHeadersEnabled={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => {
                setRefreshing(true);
                load();
              }}
              tintColor="#B3122E"
            />
          }
          renderSectionHeader={({ section }) => (
            <Text style={styles.sectionHeader}>{section.title}</Text>
          )}
          renderItem={({ item, section }) => {
            const action = ACTIONS[item.type] ?? 'View';
            const actionable = !!item.actorId || item.type === 'BROADCAST';
            const isRecent = section.title === 'Recent';

            return (
              <View style={[styles.row, isRecent ? styles.rowRecent : styles.rowOlder]}>
                <TouchableOpacity
                  activeOpacity={actionable ? 0.8 : 1}
                  onPress={() => open(item)}
                  accessibilityLabel={item.actorName || item.title}
                >
                  {item.actorImage ? (
                    <Image
                      source={{ uri: item.actorImage }}
                      style={styles.avatar}
                      contentFit="cover"
                      contentPosition="top"
                    />
                  ) : (
                    <View style={styles.avatarFallback}>
                      <Ionicons
                        name={ICONS[item.type] ?? 'notifications'}
                        size={22}
                        color="#B3122E"
                      />
                    </View>
                  )}
                </TouchableOpacity>

                <View style={styles.contentCol}>
                  <View style={styles.textRow}>
                    <Text style={styles.messageText}>
                      <Text style={styles.messageTitle}>{item.title} </Text>
                      {item.body && item.body !== item.title ? (
                        <Text style={styles.messageBody}>{item.body}</Text>
                      ) : null}
                    </Text>
                    <Text style={styles.time}>{timeAgo(item.createdAt)}</Text>
                  </View>

                  {actionable && !!action && (
                    <TouchableOpacity
                      style={styles.actionBtn}
                      activeOpacity={0.75}
                      onPress={() => open(item)}
                      accessibilityRole="button"
                    >
                      <Text style={styles.actionText}>{action}</Text>
                    </TouchableOpacity>
                  )}
                </View>
              </View>
            );
          }}
          onEndReached={fetchMore}
          onEndReachedThreshold={0.6}
          ListFooterComponent={
            loadingMore ? (
              <View style={styles.footer}>
                <Loader size={38} />
              </View>
            ) : null
          }
          ListEmptyComponent={
            <View style={styles.empty}>
              <Ionicons name="notifications-outline" size={48} color={colors.textFaint} />
              <Text style={styles.emptyTitle}>Nothing yet</Text>
              <Text style={styles.emptyText}>
                Connection requests and updates will appear here
              </Text>
            </View>
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFFFFF' },
  topBar: {
    paddingHorizontal: spacing.md,
    paddingTop: spacing.xs,
    paddingBottom: 2,
  },
  title: {
    fontSize: 26,
    fontWeight: '700',
    color: '#1E293B',
    paddingHorizontal: spacing.md,
    marginTop: 4,
    marginBottom: spacing.xs,
  },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },

  sectionHeader: {
    fontSize: 16,
    fontWeight: '700',
    color: '#334155',
    paddingHorizontal: spacing.md,
    paddingTop: spacing.md,
    paddingBottom: spacing.xs,
  },

  row: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    paddingHorizontal: spacing.md,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#F8FAFC',
  },
  rowRecent: {
    backgroundColor: '#FFF0F3',
  },
  rowOlder: {
    backgroundColor: '#FFFFFF',
  },

  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#F1F5F9',
  },
  avatarFallback: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FDD8DF',
  },

  contentCol: {
    flex: 1,
  },
  textRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 8,
  },
  messageText: {
    flex: 1,
    fontSize: 14,
    lineHeight: 20,
    color: '#1E293B',
  },
  messageTitle: {
    fontWeight: '700',
    color: '#1E293B',
  },
  messageBody: {
    fontWeight: '400',
    color: '#334155',
  },
  time: {
    fontSize: 12.5,
    color: '#64748B',
    marginTop: 1,
    fontWeight: '500',
  },

  actionBtn: {
    alignSelf: 'flex-start',
    marginTop: 8,
    paddingHorizontal: 14,
    paddingVertical: 5,
    borderRadius: 6,
    borderWidth: 1.2,
    borderColor: '#B3122E',
    backgroundColor: 'transparent',
  },
  actionText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#B3122E',
  },

  footer: { paddingVertical: spacing.lg },
  empty: { alignItems: 'center', paddingTop: 80, paddingHorizontal: spacing.xl },
  emptyTitle: {
    fontSize: font.title,
    fontWeight: '600',
    color: colors.text,
    marginTop: spacing.md,
  },
  emptyText: {
    fontSize: font.body,
    color: colors.textMuted,
    textAlign: 'center',
    marginTop: spacing.xs,
    lineHeight: 20,
  },
});

import { View, Text, StyleSheet, FlatList, TouchableOpacity, Alert, RefreshControl } from 'react-native';
import { useCallback, useState } from 'react';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFocusEffect } from 'expo-router';
import { ticketAPI } from '../../utils/api';
import { useGuardedRouter } from '../../utils/useGuardedRouter';
import { colors, font, radius, spacing, cardShadow } from '../../components/theme';
import Loader from '../../components/Loader';

type Ticket = {
  id: number;
  subject: string;
  status: 'OPEN' | 'CLOSED';
  updatedAt: string;
};

function timeAgo(iso?: string) {
  if (!iso) return '';
  const diffMs = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diffMs / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  return `${days}d ago`;
}

/** A member's own support queries - raised from Help & Support, answered by an admin. */
export default function MyTicketsScreen() {
  const router = useGuardedRouter();
  const insets = useSafeAreaInsets();

  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  /** At most one can exist - the backend rejects a second open ticket. */
  const openTicket = tickets.find((t) => t.status === 'OPEN');

  const load = useCallback(async () => {
    try {
      const res = await ticketAPI.list();
      setTickets(Array.isArray(res.data) ? res.data : []);
    } catch {
      Alert.alert('Error', 'Failed to load your tickets');
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

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.back} hitSlop={10} onPress={() => router.back()} accessibilityLabel="Go back">
          <Ionicons name="arrow-back" size={20} color="#000000" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>My Tickets</Text>
        {/* Only one open ticket at a time - the backend refuses a second, so
            offering the button would be a promise it cannot keep. With one
            open, this jumps straight to that thread instead. */}
        <TouchableOpacity
          style={styles.newBtn}
          onPress={() =>
            openTicket
              ? router.push(`/support/${openTicket.id}`)
              : router.push('/support/new')
          }
          accessibilityLabel={openTicket ? 'Go to your open ticket' : 'Raise a new query'}
        >
          <Ionicons name={openTicket ? 'chatbubble-ellipses' : 'add'} size={22} color={colors.white} />
        </TouchableOpacity>
      </View>

      {loading ? (
        <View style={styles.center}>
          <Loader size={38} />
        </View>
      ) : (
        <FlatList
          data={tickets}
          keyExtractor={(item) => String(item.id)}
          contentContainerStyle={styles.list}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.accent} />}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={[styles.row, cardShadow]}
              onPress={() => router.push(`/support/${item.id}`)}
              activeOpacity={0.8}
            >
              <View style={styles.rowText}>
                <Text style={styles.rowSubject} numberOfLines={1}>
                  {item.subject}
                </Text>
                <Text style={styles.rowMeta}>{timeAgo(item.updatedAt)}</Text>
              </View>
              <View style={[styles.badge, item.status === 'OPEN' ? styles.badgeOpen : styles.badgeClosed]}>
                <Text style={[styles.badgeText, item.status === 'OPEN' ? styles.badgeTextOpen : styles.badgeTextClosed]}>
                  {item.status === 'OPEN' ? 'Open' : 'Closed'}
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color={colors.textFaint} />
            </TouchableOpacity>
          )}
          ListEmptyComponent={
            <View style={styles.empty}>
              <Ionicons name="chatbubbles-outline" size={48} color={colors.textFaint} />
              <Text style={styles.emptyTitle}>No tickets yet</Text>
              <Text style={styles.emptyText}>Have a question or an issue? Raise a query and we'll get back to you.</Text>
              <TouchableOpacity style={styles.raiseBtn} onPress={() => router.push('/support/new')}>
                <Text style={styles.raiseText}>Raise a query</Text>
              </TouchableOpacity>
            </View>
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    gap: spacing.sm,
  },
  headerTitle: { flex: 1, fontSize: font.heading, fontWeight: '600', color: colors.text },
  back: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.white,
    ...cardShadow,
  },
  newBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.accent,
  },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  list: { paddingHorizontal: spacing.lg, paddingBottom: spacing.xl, gap: spacing.sm },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: colors.white,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
  },
  rowText: { flex: 1 },
  rowSubject: { fontSize: font.title, fontWeight: '600', color: colors.text },
  rowMeta: { fontSize: font.small, color: colors.textMuted, marginTop: 2 },
  badge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: radius.pill },
  badgeOpen: { backgroundColor: colors.accentSoft },
  badgeClosed: { backgroundColor: '#EFEFEF' },
  badgeText: { fontSize: font.caption, fontWeight: '700' },
  badgeTextOpen: { color: colors.accent },
  badgeTextClosed: { color: colors.textMuted },
  empty: { alignItems: 'center', paddingTop: 72, paddingHorizontal: spacing.xl, gap: spacing.sm },
  emptyTitle: { fontSize: font.title, fontWeight: '600', color: colors.text, marginTop: spacing.sm },
  emptyText: { fontSize: font.body, color: colors.textMuted, textAlign: 'center' },
  raiseBtn: {
    marginTop: spacing.lg,
    paddingHorizontal: 24,
    paddingVertical: 10,
    borderRadius: radius.pill,
    backgroundColor: colors.accent,
  },
  raiseText: { color: colors.white, fontSize: font.label, fontWeight: '600' },
});

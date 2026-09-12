import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TextInput,
  TouchableOpacity,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useCallback, useRef, useState } from 'react';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFocusEffect, useLocalSearchParams } from 'expo-router';
import { ticketAPI } from '../../utils/api';
import { useGuardedRouter } from '../../utils/useGuardedRouter';
import { colors, font, radius, spacing, cardShadow } from '../../components/theme';
import Loader from '../../components/Loader';

type TicketMessage = {
  id: number;
  senderType: 'USER' | 'ADMIN';
  senderName?: string;
  message: string;
  createdAt: string;
};

type TicketDetail = {
  id: number;
  subject: string;
  status: 'OPEN' | 'CLOSED';
  messages: TicketMessage[];
};

function formatTime(iso?: string) {
  if (!iso) return '';
  return new Date(iso).toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

/** One ticket's conversation - a member replies while it's open, and can reopen it once it's closed. */
export default function TicketThreadScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useGuardedRouter();
  const insets = useSafeAreaInsets();
  const listRef = useRef<FlatList>(null);

  const [ticket, setTicket] = useState<TicketDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [draft, setDraft] = useState('');
  const [sending, setSending] = useState(false);
  const [reopening, setReopening] = useState(false);

  const load = useCallback(async () => {
    try {
      const res = await ticketAPI.get(id);
      setTicket(res.data);
    } catch {
      Alert.alert('Error', 'Failed to load this ticket');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  const send = async () => {
    if (!draft.trim() || sending) return;
    setSending(true);
    try {
      const res = await ticketAPI.addMessage(id, draft.trim());
      setTicket(res.data);
      setDraft('');
      setTimeout(() => listRef.current?.scrollToEnd({ animated: true }), 100);
    } catch {
      Alert.alert('Error', 'Could not send your message');
    } finally {
      setSending(false);
    }
  };

  const reopen = async () => {
    setReopening(true);
    try {
      const res = await ticketAPI.reopen(id);
      setTicket(res.data);
    } catch {
      Alert.alert('Error', 'Could not reopen this ticket');
    } finally {
      setReopening(false);
    }
  };

  if (loading || !ticket) {
    return (
      <View style={[styles.container, styles.center, { paddingTop: insets.top }]}>
        <Loader size={38} />
      </View>
    );
  }

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <View style={[styles.container, { paddingTop: insets.top }]}>
        <View style={styles.header}>
          <TouchableOpacity style={styles.back} hitSlop={10} onPress={() => router.back()} accessibilityLabel="Go back">
            <Ionicons name="arrow-back" size={20} color="#000000" />
          </TouchableOpacity>
          <View style={{ flex: 1 }}>
            <Text style={styles.headerTitle} numberOfLines={1}>
              {ticket.subject}
            </Text>
            <Text style={[styles.statusText, ticket.status === 'CLOSED' && styles.statusTextClosed]}>
              {ticket.status === 'OPEN' ? 'Open' : 'Closed'}
            </Text>
          </View>
        </View>

        <FlatList
          ref={listRef}
          data={ticket.messages}
          keyExtractor={(m) => String(m.id)}
          contentContainerStyle={styles.thread}
          onContentSizeChange={() => listRef.current?.scrollToEnd({ animated: false })}
          renderItem={({ item }) => (
            <View style={[styles.bubble, item.senderType === 'USER' ? styles.bubbleMine : styles.bubbleTheirs]}>
              {item.senderType === 'ADMIN' && (
                <Text style={styles.bubbleSender}>{item.senderName || 'Support Team'}</Text>
              )}
              <Text style={[styles.bubbleText, item.senderType === 'USER' && styles.bubbleTextMine]}>
                {item.message}
              </Text>
              <Text style={[styles.bubbleTime, item.senderType === 'USER' && styles.bubbleTimeMine]}>
                {formatTime(item.createdAt)}
              </Text>
            </View>
          )}
        />

        {ticket.status === 'OPEN' ? (
          <View style={[styles.inputRow, { paddingBottom: Math.max(insets.bottom, spacing.md) }]}>
            <TextInput
              style={styles.input}
              placeholder="Write a message..."
              placeholderTextColor={colors.textFaint}
              value={draft}
              onChangeText={setDraft}
              multiline
            />
            <TouchableOpacity
              style={[styles.sendBtn, (!draft.trim() || sending) && styles.sendBtnDisabled]}
              onPress={send}
              disabled={!draft.trim() || sending}
            >
              <Ionicons name="send" size={18} color={colors.white} />
            </TouchableOpacity>
          </View>
        ) : (
          <View style={[styles.closedBar, { paddingBottom: Math.max(insets.bottom, spacing.md) }]}>
            <Text style={styles.closedText}>This ticket is closed.</Text>
            <TouchableOpacity style={styles.reopenBtn} onPress={reopen} disabled={reopening}>
              <Text style={styles.reopenText}>{reopening ? 'Reopening...' : 'Reopen ticket'}</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  center: { alignItems: 'center', justifyContent: 'center' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    gap: spacing.sm,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.hairline,
  },
  headerTitle: { fontSize: font.title, fontWeight: '600', color: colors.text },
  statusText: { fontSize: font.small, color: colors.accent, fontWeight: '600', marginTop: 1 },
  statusTextClosed: { color: colors.textMuted },
  back: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.white,
    ...cardShadow,
  },
  thread: { paddingHorizontal: spacing.lg, paddingVertical: spacing.md, gap: spacing.sm },
  bubble: {
    maxWidth: '80%',
    borderRadius: radius.lg,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  bubbleTheirs: {
    alignSelf: 'flex-start',
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.hairline,
  },
  bubbleMine: {
    alignSelf: 'flex-end',
    backgroundColor: colors.accent,
  },
  bubbleSender: { fontSize: font.caption, fontWeight: '700', color: colors.accent, marginBottom: 2 },
  bubbleText: { fontSize: font.label, color: colors.text },
  bubbleTextMine: { color: colors.white },
  bubbleTime: { fontSize: font.caption, color: colors.textFaint, marginTop: 4, alignSelf: 'flex-end' },
  bubbleTimeMine: { color: 'rgba(255,255,255,0.75)' },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: spacing.sm,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.hairline,
    backgroundColor: colors.white,
  },
  input: {
    flex: 1,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.lg,
    paddingHorizontal: spacing.md,
    paddingVertical: 10,
    fontSize: font.label,
    color: colors.text,
    maxHeight: 110,
  },
  sendBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.accent,
  },
  sendBtnDisabled: { opacity: 0.4 },
  closedBar: {
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.hairline,
    backgroundColor: colors.white,
  },
  closedText: { fontSize: font.body, color: colors.textMuted },
  reopenBtn: {
    paddingHorizontal: 24,
    paddingVertical: 10,
    borderRadius: radius.pill,
    backgroundColor: colors.accent,
  },
  reopenText: { color: colors.white, fontSize: font.label, fontWeight: '600' },
});

import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import { useState } from 'react';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ticketAPI } from '../../utils/api';
import { useGuardedRouter } from '../../utils/useGuardedRouter';
import { LinearGradient } from 'expo-linear-gradient';
import { auth, colors, font, radius, spacing, cardShadow } from '../../components/theme';

/** The form behind "Raise a query" on Help & Support. */
export default function NewTicketScreen() {
  const router = useGuardedRouter();
  const insets = useSafeAreaInsets();

  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const canSubmit = subject.trim().length > 0 && message.trim().length > 0 && !submitting;

  /**
   * Sends the member to the ticket they already have open.
   *
   * The backend allows only one at a time, so a second would be answered in a
   * thread neither side can see from the other. The list call is only to find
   * its id - the refusal itself is the server's.
   */
  const goToOpenTicket = async () => {
    try {
      const res = await ticketAPI.list();
      const open = (Array.isArray(res.data) ? res.data : []).find((t: any) => t.status === 'OPEN');
      if (open) {
        router.replace(`/support/${open.id}`);
        return;
      }
    } catch {
      // Falling through to the list is still better than staying on a form
      // that cannot submit.
    }
    router.replace('/support');
  };

  const submit = async () => {
    if (!canSubmit) return;
    setSubmitting(true);
    try {
      const res = await ticketAPI.create({ subject: subject.trim(), message: message.trim() });
      router.replace(`/support/${res.data.id}`);
    } catch (error: any) {
      // 409 means an open ticket already exists. That is not an error the
      // member can act on by retrying - the useful move is to take them to the
      // thread they already have.
      if (error?.response?.status === 409) {
        Alert.alert(
          'You already have an open ticket',
          error?.response?.data?.detail ||
            'Please reply on your existing ticket instead of raising a new one.',
          [{ text: 'Open it', onPress: goToOpenTicket }],
        );
        return;
      }
      Alert.alert('Error', 'Could not submit your query - please try again');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <View style={[styles.container, { paddingTop: insets.top }]}>
        <View style={styles.header}>
          <TouchableOpacity style={styles.back} hitSlop={10} onPress={() => router.back()} accessibilityLabel="Go back">
            <Ionicons name="arrow-back" size={20} color="#000000" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Raise a Query</Text>
        </View>

        <ScrollView contentContainerStyle={styles.body} keyboardShouldPersistTaps="handled">
          <Text style={styles.label}>Subject</Text>
          <TextInput
            style={styles.input}
            placeholder="A short summary of your issue"
            placeholderTextColor={colors.textFaint}
            value={subject}
            onChangeText={setSubject}
            maxLength={200}
          />

          <Text style={styles.label}>Message</Text>
          <TextInput
            style={[styles.input, styles.textarea]}
            placeholder="Describe your question or issue in detail"
            placeholderTextColor={colors.textFaint}
            value={message}
            onChangeText={setMessage}
            multiline
            textAlignVertical="top"
          />

          {/* The crimson gradient every primary button on home uses, rather
              than the rose accent - this is the same kind of commitment. */}
          <TouchableOpacity
            style={[styles.submitBtn, !canSubmit && styles.submitBtnDisabled]}
            onPress={submit}
            disabled={!canSubmit}
            activeOpacity={0.85}
          >
            <LinearGradient
              colors={[auth.crimson, auth.crimsonDeep]}
              start={{ x: 0, y: 0 }}
              end={{ x: 0, y: 1 }}
              style={styles.submitFill}
            >
              <Text style={styles.submitText}>{submitting ? 'Submitting...' : 'Submit'}</Text>
            </LinearGradient>
          </TouchableOpacity>
        </ScrollView>
      </View>
    </KeyboardAvoidingView>
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
  headerTitle: { fontSize: font.heading, fontWeight: '600', color: colors.text },
  back: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.white,
    ...cardShadow,
  },
  body: { paddingHorizontal: spacing.lg, paddingBottom: spacing.xl, gap: spacing.xs },
  label: {
    fontSize: font.small,
    color: colors.textMuted,
    fontWeight: '600',
    marginTop: spacing.lg,
    marginBottom: spacing.xs,
  },
  input: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: 10,
    fontSize: font.label,
    color: colors.text,
    backgroundColor: colors.white,
  },
  textarea: { minHeight: 140, paddingTop: 10 },
  submitBtn: {
    marginTop: spacing.xl,
    borderRadius: radius.pill,
    // The gradient paints the fill, so the button itself must clip to the
    // pill - otherwise the corners square off over the rounded shape.
    overflow: 'hidden',
  },
  submitFill: { paddingVertical: 14, alignItems: 'center' },
  submitBtnDisabled: { opacity: 0.5 },
  submitText: { color: colors.white, fontSize: font.title, fontWeight: '700' },
});

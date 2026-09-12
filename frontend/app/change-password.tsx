import { useCallback, useState } from 'react';
import { View, Text, StyleSheet, Pressable, ActivityIndicator } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useFocusEffect } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useGuardedRouter } from '../utils/useGuardedRouter';
import { profileAPI } from '../utils/api';
import FormScroll from '../components/FormScroll';
import FormField from '../components/FormField';
import { auth, colors, font, radius, spacing } from '../components/theme';
import Loader from '../components/Loader';

/**
 * Create or change your password.
 *
 * One screen for both, because from the member's side they are the same
 * intention - "I want a password" - and which one applies is not something they
 * should have to know. Somebody who joined with Google has no current password
 * to type; somebody who registered with the form does. `passwordSet` on the
 * profile decides, so the screen asks for exactly what exists.
 *
 * The server enforces the same rule independently. This only controls what is
 * on screen.
 */
export default function ChangePasswordScreen() {
  const router = useGuardedRouter();
  const insets = useSafeAreaInsets();

  const [passwordSet, setPasswordSet] = useState<boolean | null>(null);
  const [current, setCurrent] = useState('');
  const [next, setNext] = useState('');
  const [confirm, setConfirm] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  useFocusEffect(
    useCallback(() => {
      let alive = true;
      profileAPI
        .getMe()
        .then((res) => {
          if (alive) setPasswordSet(res.data?.passwordSet !== false);
        })
        .catch(() => {
          // Assume a password exists, so the form asks for the current one.
          // Over-asking is recoverable; under-asking would present a form the
          // server then rejects, which reads as a broken screen.
          if (alive) setPasswordSet(true);
        });
      return () => {
        alive = false;
      };
    }, [])
  );

  const creating = passwordSet === false;

  const submit = async () => {
    setError(null);

    if (next.length < 8) {
      setError('Your password must be at least 8 characters.');
      return;
    }
    if (next !== confirm) {
      setError('The two passwords do not match.');
      return;
    }
    if (!creating && !current.trim()) {
      setError('Please enter your current password.');
      return;
    }

    setSaving(true);
    try {
      await profileAPI.changePassword(next, creating ? undefined : current);
      setDone(true);
    } catch (e: any) {
      setError(
        e?.response?.data?.detail ||
          e?.response?.data?.message ||
          'Could not update your password. Please try again.'
      );
    } finally {
      setSaving(false);
    }
  };

  // The back button renders immediately, before passwordSet is known - a
  // screen that is blank but for a spinner while /user loads reads as
  // broken, especially since nothing about the back button depends on that
  // answer. Only the form itself, which needs passwordSet to know whether to
  // ask for a current password, waits.
  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.topBar}>
        <Pressable onPress={() => router.back()} hitSlop={10} accessibilityLabel="Go back">
          <Ionicons name="chevron-back" size={26} color={colors.text} />
        </Pressable>
      </View>

      {passwordSet === null ? (
        <View style={[styles.container, styles.center]}>
          <Loader size={38} />
        </View>
      ) : (
      <FormScroll contentContainerStyle={styles.body}>
        <Text style={styles.title}>{creating ? 'Create Password' : 'Change Password'}</Text>
        <Text style={styles.subtitle}>
          {creating
            ? 'You signed in with Google, so this account has no password yet. Adding one lets you sign in either way.'
            : 'Choose a new password for your account. It must be at least 8 characters.'}
        </Text>

        {done ? (
          <View style={styles.doneBox}>
            <Ionicons name="checkmark-circle" size={20} color="#166534" />
            <Text style={styles.doneText}>
              {creating
                ? 'Password created. You can now sign in with your email and password, or with Google.'
                : 'Password updated.'}
            </Text>
          </View>
        ) : (
          <>
            {!creating && (
              <FormField
                icon="lock-closed-outline"
                secure
                placeholder="Current password"
                value={current}
                onChangeText={setCurrent}
                autoComplete="current-password"
                textContentType="password"
              />
            )}

            <FormField
              icon="key-outline"
              secure
              placeholder={creating ? 'Password' : 'New password'}
              value={next}
              onChangeText={setNext}
              autoComplete="new-password"
              textContentType="newPassword"
            />

            <FormField
              icon="key-outline"
              secure
              placeholder="Confirm password"
              value={confirm}
              onChangeText={setConfirm}
              autoComplete="new-password"
              textContentType="newPassword"
            />

            {!!error && (
              <View style={styles.errorBox}>
                <Ionicons name="alert-circle-outline" size={16} color="#92400E" />
                <Text style={styles.errorText}>{error}</Text>
              </View>
            )}

            <Pressable
              style={({ pressed }) => [styles.button, pressed && styles.pressed, saving && styles.dim]}
              onPress={submit}
              disabled={saving}
              accessibilityRole="button"
            >
              {saving ? (
                <ActivityIndicator color={colors.white} size="small" />
              ) : (
                <Text style={styles.buttonText}>
                  {creating ? 'Create Password' : 'Update Password'}
                </Text>
              )}
            </Pressable>
          </>
        )}
      </FormScroll>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.white },
  center: { alignItems: 'center', justifyContent: 'center' },
  topBar: { paddingHorizontal: spacing.lg, paddingVertical: spacing.md },
  body: { paddingHorizontal: spacing.lg, paddingBottom: spacing.xl },
  title: { fontSize: 26, fontWeight: '700', color: colors.text },
  subtitle: {
    fontSize: font.body,
    color: '#6B7280',
    marginTop: spacing.sm,
    marginBottom: spacing.lg,
    lineHeight: 19,
  },
  button: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: auth.crimsonLight,
    borderRadius: radius.md,
    paddingVertical: 14,
    marginTop: spacing.lg,
  },
  pressed: { opacity: 0.85 },
  dim: { opacity: 0.7 },
  buttonText: { color: colors.white, fontSize: font.title, fontWeight: '600' },
  errorBox: {
    flexDirection: 'row',
    gap: spacing.sm,
    alignItems: 'flex-start',
    backgroundColor: '#FEF3C7',
    borderRadius: radius.md,
    padding: spacing.md,
    marginTop: spacing.md,
  },
  errorText: { flex: 1, fontSize: font.small, color: '#92400E', lineHeight: 17 },
  doneBox: {
    flexDirection: 'row',
    gap: spacing.sm,
    alignItems: 'flex-start',
    backgroundColor: '#DCFCE7',
    borderRadius: radius.md,
    padding: spacing.md,
  },
  doneText: { flex: 1, fontSize: font.body, color: '#166534', lineHeight: 19 },
});

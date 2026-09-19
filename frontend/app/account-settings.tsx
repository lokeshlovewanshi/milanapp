import { useCallback, useState } from 'react';
import { View, Text, StyleSheet, Pressable, ScrollView } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFocusEffect } from 'expo-router';
import { useGuardedRouter } from '../utils/useGuardedRouter';
import { profileAPI } from '../utils/api';
import { unregisterPush } from '../utils/notifications';
import { clearConnections } from '../utils/useConnections';
import ConfirmSheet from '../components/ConfirmSheet';
import { colors, font, spacing } from '../components/theme';

type Row = {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  href: string;
};

const MANAGE_ACCOUNT: Row[] = [
  { icon: 'eye-off-outline', label: 'Hide/Delete Profile', href: '/hide-delete-profile' },
];

const SUPPORT: Row[] = [
  { icon: 'headset-outline', label: 'Help & Support', href: '/help-support' },
];

/**
 * Account settings.
 *
 * Only rows that lead somewhere real are listed. The reference design also
 * showed Privacy Settings, Opening Messages and Notification Settings, and
 * those are deliberately absent: none of them exist yet, and a
 * row that opens an empty screen is worse than no row - it reads as a broken
 * app rather than an unfinished one. They belong here as soon as they have
 * something behind them.
 *
 * Logout is pinned to the bottom, away from everything else, so it is never
 * the thing you hit while aiming for the row above it.
 */
export default function AccountSettingsScreen() {
  const router = useGuardedRouter();
  const insets = useSafeAreaInsets();
  const [confirmingLogout, setConfirmingLogout] = useState(false);

  // Null until known, which keeps the password row off screen for that moment
  // rather than showing "Change Password" and correcting itself to "Create
  // Password" once the profile arrives.
  const [passwordSet, setPasswordSet] = useState<boolean | null>(null);
  const [emailVerified, setEmailVerified] = useState(true);

  useFocusEffect(
    useCallback(() => {
      let alive = true;
      profileAPI
        .getMe()
        .then((res) => {
          if (alive) {
            setPasswordSet(res.data?.passwordSet !== false);
            setEmailVerified(res.data?.emailVerified !== false);
          }
        })
        .catch(() => {
          if (alive) setPasswordSet(true);
        });
      return () => {
        alive = false;
      };
    }, [])
  );

  // Google members are offered "Create Password" - calling it "Change" would
  // ask them to change something they never had.
  const manageAccount: Row[] =
    passwordSet === null
      ? MANAGE_ACCOUNT
      : [
          {
            icon: 'lock-closed-outline',
            label: passwordSet ? 'Change Password' : 'Create Password',
            href: '/change-password',
          },
          // Keep this visible even after confirmation. Previously a confirmed
          // address made the whole feature disappear, so members could not
          // tell that email verification exists or check their status.
          {
            icon: emailVerified ? 'checkmark-circle-outline' : 'mail-unread-outline',
            label: emailVerified ? 'Email Verified' : 'Verify Email',
            href: '/verify-email',
          },
          ...MANAGE_ACCOUNT,
        ];

  const doLogout = async () => {
    setConfirmingLogout(false);
    // Detach this device first, or the next person to sign in here keeps
    // receiving the previous member's notifications.
    await unregisterPush();
    await AsyncStorage.clear();
    // Connection state is held in memory, not in storage, so clearing storage
    // does not touch it. Without this the next person to sign in on this phone
    // would briefly see the previous member's Connect/Withdraw buttons.
    clearConnections();
    router.replace('/');
  };

  const renderRow = (row: Row) => (
    <Pressable
      key={row.label}
      style={({ pressed }) => [styles.row, pressed && styles.rowPressed]}
      onPress={() => router.push(row.href)}
      accessibilityRole="button"
    >
      <Ionicons name={row.icon} size={20} color={colors.text} />
      <Text style={styles.rowLabel}>{row.label}</Text>
      <Ionicons name="chevron-forward" size={18} color={colors.textFaint} />
    </Pressable>
  );

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.topBar}>
        <Pressable onPress={() => router.back()} hitSlop={10} accessibilityLabel="Go back">
          <Ionicons name="chevron-back" size={26} color={colors.text} />
        </Pressable>
      </View>

      <ScrollView contentContainerStyle={styles.body}>
        <Text style={styles.title}>Account &amp; Settings</Text>

        <Text style={styles.sectionLabel}>Manage Account</Text>
        <View style={styles.group}>{manageAccount.map(renderRow)}</View>

        <Text style={styles.sectionLabel}>Support</Text>
        <View style={styles.group}>{SUPPORT.map(renderRow)}</View>
      </ScrollView>

      <Pressable
        style={({ pressed }) => [
          styles.logout,
          { paddingBottom: insets.bottom + spacing.lg },
          pressed && styles.rowPressed,
        ]}
        onPress={() => setConfirmingLogout(true)}
        accessibilityRole="button"
      >
        <Ionicons name="log-out-outline" size={20} color="#6B7280" />
        <Text style={styles.logoutText}>Logout</Text>
      </Pressable>

      <ConfirmSheet
        visible={confirmingLogout}
        title="Are you sure you want to Sign out?"
        confirmLabel="Yes"
        cancelLabel="No"
        onCancel={() => setConfirmingLogout(false)}
        onConfirm={doLogout}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.white },
  topBar: { paddingHorizontal: spacing.lg, paddingVertical: spacing.md },
  body: { paddingHorizontal: spacing.lg, paddingBottom: spacing.xl },
  title: { fontSize: 26, fontWeight: '700', color: colors.text },
  sectionLabel: {
    fontSize: font.small,
    color: '#9CA3AF',
    marginTop: spacing.xl,
    marginBottom: spacing.xs,
    fontWeight: '600',
  },
  group: {},
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: 18,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#E4E4E4',
  },
  rowPressed: { opacity: 0.6 },
  rowLabel: { flex: 1, fontSize: font.title, color: colors.text, fontWeight: '500' },
  logout: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: '#E4E4E4',
    backgroundColor: '#FAFAFA',
  },
  logoutText: { fontSize: font.title, color: '#6B7280', fontWeight: '600' },
});

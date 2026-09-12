import { useEffect } from 'react';
import { Stack, useRouter } from 'expo-router';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import WebShell from '../components/WebShell';
import UpdateGate from '../components/UpdateGate';
import { onNotificationTapped } from '../utils/notifications';

export default function RootLayout() {
  const router = useRouter();

  useEffect(() => {
    const unsub = onNotificationTapped((data) => {
      if (data?.link) {
        router.push(data.link as any);
      } else if (data?.profileId) {
        router.push(`/profile-detail/${data.profileId}` as any);
      } else if (data?.actorId) {
        router.push(`/profile-detail/${data.actorId}` as any);
      } else if (data?.type === 'PROFILE_VERIFIED' || data?.type === 'NEW_PROFILE_VERIFIED') {
        router.push('/notifications' as any);
      }
    });
    return unsub;
  }, [router]);

  return (
    <SafeAreaProvider>
      <GestureHandlerRootView style={{ flex: 1 }}>
        {/* Checked once per cold start, above everything else so a required
            update can block the app before any screen underneath is usable. */}
        <UpdateGate />
        {/* Caps the app to a readable column in a desktop browser. A no-op on
            native, so the phone builds are untouched. */}
        <WebShell>
        <Stack screenOptions={{ headerShown: false }}>
          <Stack.Screen name="index" />
          <Stack.Screen name="login" />
          <Stack.Screen name="register" />
          <Stack.Screen name="profile-setup" />
          <Stack.Screen name="edit-profile" />
          <Stack.Screen name="notifications" />
          <Stack.Screen name="(tabs)" />
          <Stack.Screen name="search" />
          <Stack.Screen name="search-results" />
          <Stack.Screen name="profile-detail/[id]" />
          <Stack.Screen name="account-settings" />
          <Stack.Screen name="help-support" />
          <Stack.Screen name="support/index" />
          <Stack.Screen name="support/new" />
          <Stack.Screen name="support/[id]" />
          <Stack.Screen name="hide-delete-profile" />
          <Stack.Screen name="manage-photos" />
        </Stack>
        </WebShell>
      </GestureHandlerRootView>
    </SafeAreaProvider>
  );
}

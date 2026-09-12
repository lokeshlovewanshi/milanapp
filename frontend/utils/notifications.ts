import { Platform } from 'react-native';
import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { notificationAPI } from './api';

const TOKEN_KEY = 'push_token';

/**
 * Push notification setup.
 *
 * Uses getDevicePushTokenAsync, NOT getExpoPushTokenAsync. The backend talks to
 * Firebase directly via the Admin SDK, so it needs the raw FCM registration
 * token. An Expo push token ("ExponentPushToken[...]") only works against
 * Expo's own push service and Firebase would reject it.
 *
 * Topic subscription for broadcasts is handled server-side on registration -
 * expo-notifications has no topic API.
 */

/** Show a banner even when the app is in the foreground. */
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

/**
 * Android requires a channel before any notification will display. Creating it
 * is idempotent, so this runs on every launch.
 */
async function ensureAndroidChannel() {
  if (Platform.OS !== 'android') return;

  // Must match the channelId PushService sets on outgoing messages, or Android
  // silently drops them into a default low-importance channel.
  await Notifications.setNotificationChannelAsync('default', {
    name: 'Default',
    importance: Notifications.AndroidImportance.HIGH,
    vibrationPattern: [0, 250, 250, 250],
    lightColor: '#EC4899',
  });
}

/**
 * Ask for permission and hand the resulting token to the backend.
 *
 * Safe to call on every login: registering the same token twice is an upsert
 * server-side, and re-subscribing to the broadcast topic is idempotent.
 *
 * Returns the token, or null when push is unavailable - simulators have no push
 * capability, and the user may have declined.
 */
export async function registerForPush(): Promise<string | null> {
  // Only iOS simulators genuinely cannot receive push. Android emulators with
  // Google Play Services do get FCM, so guarding on Device.isDevice alone would
  // block testing on the emulator - which is where this gets developed.
  if (!Device.isDevice && Platform.OS === 'ios') {
    console.log('[push] iOS simulators cannot receive push notifications.');
    return null;
  }

  await ensureAndroidChannel();

  const existing = await Notifications.getPermissionsAsync();
  let status = existing.status;

  if (status !== 'granted') {
    const asked = await Notifications.requestPermissionsAsync();
    status = asked.status;
  }

  if (status !== 'granted') {
    console.log('[push] Permission denied.');
    return null;
  }

  try {
    // Raw FCM token on Android, APNs token on iOS.
    const devicePushToken = await Notifications.getDevicePushTokenAsync();
    const token = String(devicePushToken.data);

    await notificationAPI.registerToken({ token, platform: Platform.OS });
    await AsyncStorage.setItem(TOKEN_KEY, token);

    return token;
  } catch (error: any) {
    console.log('[push] Could not register:', error?.message);
    return null;
  }
}

/**
 * Detach this device from the account on logout.
 *
 * Without this the next person to sign in on the phone keeps receiving the
 * previous user's notifications until their token happens to rotate.
 */
export async function unregisterPush(): Promise<void> {
  const token = await AsyncStorage.getItem(TOKEN_KEY);
  if (!token) return;

  try {
    await notificationAPI.unregisterToken({ token });
  } catch (error: any) {
    console.log('[push] Could not unregister:', error?.message);
  } finally {
    await AsyncStorage.removeItem(TOKEN_KEY);
  }
}

/**
 * Fires when the user taps a notification.
 *
 * PushService puts `type` and `actorId` in the data payload, so the caller can
 * route to the right screen. Returns an unsubscribe function.
 */
export function onNotificationTapped(
  handler: (data: Record<string, any>) => void
): () => void {
  const sub = Notifications.addNotificationResponseReceivedListener((response) => {
    handler(response.notification.request.content.data ?? {});
  });
  return () => sub.remove();
}

/** Fires while the app is open, so the badge can update without a refetch. */
export function onNotificationReceived(handler: () => void): () => void {
  const sub = Notifications.addNotificationReceivedListener(() => handler());
  return () => sub.remove();
}

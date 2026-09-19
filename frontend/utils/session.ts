import AsyncStorage from '@react-native-async-storage/async-storage';
import { router } from 'expo-router';
import { clearConnections } from './useConnections';

/** Remove all data belonging to the current member from this device. */
export async function clearLocalSession(): Promise<void> {
  try {
    // Includes the token, saved email, cached profiles, searches, membership,
    // notification token and every other persisted user value.
    await AsyncStorage.clear();
  } finally {
    // This cache is in memory, so AsyncStorage.clear cannot remove it.
    clearConnections();
  }
}

/**
 * Remove protected navigation history before opening a public route.
 * Android Back from the resulting root screen exits the app.
 */
export function resetToSignedOut(route: '/' | '/login' = '/'): void {
  try {
    router.dismissAll();
  } catch {
    // The navigator may not yet be mounted during a cold-start API request.
  }
  router.replace(route);
}

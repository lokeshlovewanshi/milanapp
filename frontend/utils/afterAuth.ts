import AsyncStorage from '@react-native-async-storage/async-storage';

/**
 * Where to send someone once they are signed in.
 *
 * Both Google buttons used to decide from context rather than from the
 * account: the one on the sign-up screen always went to profile setup, the one
 * on sign-in always went home. Same endpoint, same account, different
 * destination depending on which button was tapped - so an existing member who
 * happened to tap Continue with Google on the sign-up screen was sent to
 * "complete your profile" every single time.
 *
 * Deciding from `profileCompletion` fixes it in both directions. A brand new
 * account still lands on setup, and someone whose profile is unfinished is
 * taken there even if they arrived through sign-in.
 */
export const HOME = '/(tabs)/home';
/**
 * A brand new account starts on the mobile-number screen, which continues to
 * the wizard itself. It is one screen with one field rather than a step, and
 * it never appears in "complete your profile" - see app/mobile-number.tsx.
 */
export const SETUP = '/mobile-number?first=1';
/** The wizard proper, for anyone already past the mobile-number screen. */
export const WIZARD = '/profile-setup?first=1';

/** Store the session. Shared so the two screens cannot drift apart again. */
export async function persistSession(data: any): Promise<void> {
  if (data?.token) {
    await AsyncStorage.setItem('auth_token', data.token);
  }
  if (data?.expiresIn) {
    await AsyncStorage.setItem('token_expiry', String(Date.now() + data.expiresIn));
  }
}

/**
 * @param data the auth response, which carries profileCompletion
 * @returns the route to replace with
 */
export function destinationFor(data: any): string {
  // Treated as unfinished when absent, because an older build of the API does
  // not send it - and sending someone to setup they do not need is a smaller
  // failure than dropping a half-finished profile into the feed.
  const completion = Number(data?.profileCompletion ?? 0);
  return completion > 0 ? HOME : SETUP;
}

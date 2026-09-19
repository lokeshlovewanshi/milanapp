import { View, Text, StyleSheet, TouchableOpacity, Alert, InteractionManager } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useCallback, useState } from 'react';
import { useFocusEffect } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import AuthHero from '../components/AuthHero';
import { PrimaryButton, SecondaryButton, GoogleButton, OrRule } from '../components/AuthButtons';
import { useGuardedRouter } from '../utils/useGuardedRouter';
import { authAPI, profileAPI } from '../utils/api';
import { isGoogleConfigured, signInWithGoogle } from '../utils/googleSignIn';
import { persistSession, destinationFor } from '../utils/afterAuth';
import { auth as authTheme } from '../components/theme';
import Loader from '../components/Loader';

/**
 * The screen the app opens on: sign in, sign up, or continue with Google.
 *
 * It went away for a while, on the reasoning that a new visitor has only one
 * thing to do and a menu costs a tap on the way to it. That is true of a new
 * visitor and wrong about everyone else - a returning member who had been
 * signed out landed on a sign-up form and had to find the link at its foot to
 * get to the one they wanted. Naming both routes costs one tap and removes that
 * whole failure.
 */
export default function WelcomeScreen() {
  const router = useGuardedRouter();

  // null while the token is being read. Rendering the buttons first and then
  // redirecting makes a signed-in member watch the sign-in screen flash past
  // on every cold start.
  const [signedIn, setSignedIn] = useState<boolean | null>(null);
  const [loading, setLoading] = useState(false);

  /**
   * On focus, not on mount.
   *
   * This screen is the root route, so it stays mounted underneath everything
   * else. A mount-only check meant that anything landing back here - closing
   * profile setup, or Android recreating the process after the photo picker -
   * showed Login/Signup to someone who was still signed in. It read as having
   * been logged out, and tapping Signup then really did start a second account.
   */
  useFocusEffect(
    useCallback(() => {
      let active = true;

      (async () => {
        const token = await AsyncStorage.getItem('auth_token');
        if (!active) return;

        if (token) {
          setSignedIn(true);
          // Do this on cold start too. Without it, a newly registered member
          // could close the OTP screen, reopen the app, and bypass email
          // confirmation using the stored session token.
          try {
            const me = await profileAPI.getMe();
            if (!active) return;
            router.replace(me.data?.emailVerified === false ? '/verify-email' : '/(tabs)/home');
          } catch {
            // Keep the prior session behavior if a transient network failure
            // prevents the profile lookup; the server remains authoritative.
            if (!active) return;
            router.replace('/(tabs)/home');
          }
        } else {
          setSignedIn(false);
        }
      })();

      return () => {
        active = false;
      };
    }, [router]),
  );

  const onGooglePress = async () => {
    if (!isGoogleConfigured) {
      Alert.alert(
        'Google Sign-In not configured',
        'Set EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID in .env, then rebuild the app.'
      );
      return;
    }

    setLoading(true);
    try {
      const idToken = await signInWithGoogle();
      if (!idToken) return; // user cancelled

      const res = await authAPI.googleAuth({ idToken });
      await persistSession(res.data);

      // Returning from Google's native account-picker Activity, Fabric is still
      // re-mounting this surface - navigating in that frame corrupts the view
      // tree ("addViewAt: The specified child already has a parent").
      setLoading(false);
      InteractionManager.runAfterInteractions(() => {
        // The account decides where to go, not the button that was pressed: an
        // existing member and a brand new one both arrive through this one
        // control, and only one of them needs profile setup.
        router.replace(destinationFor(res.data));
      });
      return;
    } catch (error: any) {
      console.error('Google Auth Error:', error);
      Alert.alert(
        'Google Sign-In Failed',
        error.response?.data?.message ||
          error.response?.data?.detail ||
          error.message ||
          'Please try again'
      );
    } finally {
      setLoading(false);
    }
  };

  if (signedIn !== false) {
    return (
      <View style={styles.splash}>
        <Loader size={38} />
      </View>
    );
  }

  return (
    <AuthHero
      title="Welcome"
      titleLead={<Ionicons name="heart" size={20} color={authTheme.blush} />}
      titleAccessory={<Ionicons name="heart" size={20} color={authTheme.blush} />}
      subtitle="Sign in or create your profile to get started"
      tagline={['Find your perfect match', 'with astrology']}
    >
      {/* Google first, and only on this screen. This is the one route that
          finishes here - it signs you in without a second screen - where Login
          and Signup both only promise another form. On the login and sign-up
          screens themselves it stays below the fields, because there the form
          is what you came for. */}
      <GoogleButton testID="landing-google-btn" loading={loading} onPress={onGooglePress} />

      <OrRule />

      <PrimaryButton
        testID="landing-login-btn"
        label="Login / लॉगिन"
        icon="person-outline"
        loading={loading}
        onPress={() => router.push('/login')}
      />

      <View style={styles.gap}>
        <SecondaryButton
          testID="landing-signup-btn"
          label="Signup / प्रोफ़ाइल बनाएँ"
          icon="person-add-outline"
          onPress={() => router.push('/register')}
        />
      </View>

      {/* No destination of its own yet - the privacy policy is still to be
          written, and it is a blocking Play Store item tracked separately. Help
          & Support is where someone with a question about either would actually
          get an answer, so it goes there rather than nowhere. */}
      <View style={styles.legal}>
        <Text style={styles.legalText}>By continuing, you agree to our</Text>
        <TouchableOpacity onPress={() => router.push('/help-support')} activeOpacity={0.7}>
          <Text style={styles.legalLink}>Terms &amp; Privacy Policy</Text>
        </TouchableOpacity>
      </View>
    </AuthHero>
  );
}

const styles = StyleSheet.create({
  splash: {
    flex: 1,
    backgroundColor: authTheme.cream,
    alignItems: 'center',
    justifyContent: 'center',
  },
  gap: { marginTop: 12 },
  legal: { alignItems: 'center', marginTop: 16 },
  legalText: { fontSize: 13, color: authTheme.muted },
  legalLink: { fontSize: 13, fontWeight: '700', color: authTheme.link, marginTop: 2 },
});

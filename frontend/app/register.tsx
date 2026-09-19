import { View, Text, StyleSheet, TouchableOpacity, Alert, InteractionManager } from 'react-native';
import FormField from '../components/FormField';
import AuthHero from '../components/AuthHero';
import { PrimaryButton, GoogleButton, OrRule } from '../components/AuthButtons';
import { auth as authTheme } from '../components/theme';

import { useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { authAPI, otpAPI } from '../utils/api';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useGuardedRouter } from '../utils/useGuardedRouter';
import { isGoogleConfigured, signInWithGoogle } from '../utils/googleSignIn';
import { persistSession, destinationFor } from '../utils/afterAuth';

export default function RegisterScreen() {
  const router = useGuardedRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);

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
        // Decided from the account, not from the fact that this is the sign-up
        // screen - an existing member tapping Continue with Google here was
        // being sent to profile setup every time.
        router.replace(destinationFor(res.data));
      });
      return;
    } catch (error: any) {
      console.error('Google Auth Error:', error);
      Alert.alert(
        'Google Signup Failed',
        error.response?.data?.message ||
          error.response?.data?.detail ||
          error.message ||
          'Please try again'
      );
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async () => {
    if (!email || !password || !confirmPassword) {
      Alert.alert('Error', 'Please fill in all fields');
      return;
    }
    if (password !== confirmPassword) {
      Alert.alert('Error', 'Passwords do not match');
      return;
    }
    if (password.length < 6) {
      Alert.alert('Error', 'Password must be at least 6 characters');
      return;
    }
    setLoading(true);
    try {
      // Email and password only. Name and mobile are asked for in Basic
      // Details instead - name is required there, mobile is not. Sign-up is the
      // worst place to ask for anything optional: every field is a chance to
      // stop before an account exists at all.
      const response = await authAPI.register({ email, password });

      const token = response.data?.token || response.data || '';
      const user = response.data?.user || { email };

      if (typeof token === 'string' && token.length > 0) {
        await AsyncStorage.setItem('auth_token', token);
      }
      await AsyncStorage.setItem('user_data', JSON.stringify(user));

      // A password registration is not usable until its address is confirmed.
      // Google registration bypasses this because Google has already verified
      // the email in its ID token.
      try {
        await otpAPI.request(email.trim(), 'VERIFY_EMAIL');
        router.replace('/verify-email?sent=1');
      } catch (otpError: any) {
        Alert.alert(
          'Email confirmation required',
          otpError?.response?.data?.detail || 'We could not send the code. Please try again from the confirmation screen.'
        );
        router.replace('/verify-email');
      }
    } catch (error: any) {
      console.error('Caught error in handleRegister:', error);
      if (error.response?.status === 409) {
        Alert.alert('Account Exists', 'An account with this email already exists. Please login instead.');
      } else {
        const errMsg = error.response?.data?.detail || error.message || 'Please try again';
        Alert.alert('Registration Failed', errMsg);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthHero
      title="Create Account"
      titleAccessory={<Ionicons name="heart" size={22} color="#B3122E" />}
      subtitle="Join us to find your perfect match"
      onBack={() => router.back()}
    >
      <FormField
        testID="register-email-input"
        label="Email"
        icon="mail-outline"
        placeholder="Enter your email address"
        value={email}
        onChangeText={setEmail}
        keyboardType="email-address"
        autoCapitalize="none"
        autoComplete="email"
        textContentType="emailAddress"
      />

      <FormField
        testID="register-password-input"
        label="Password"
        icon="lock-closed-outline"
        placeholder="Create a password"
        value={password}
        onChangeText={setPassword}
        secure
        autoComplete="new-password"
        textContentType="newPassword"
      />

      <FormField
        testID="register-confirm-password-input"
        label="Confirm Password"
        icon="shield-checkmark-outline"
        placeholder="Re-enter your password"
        value={confirmPassword}
        onChangeText={setConfirmPassword}
        secure
        autoComplete="new-password"
        textContentType="newPassword"
      />

      {/* Same order as sign-in, so the two screens do not swap the position of
          the button under your thumb. */}
      <View style={styles.googleGap}>
        <GoogleButton testID="register-google-btn" loading={loading} onPress={onGooglePress} />
      </View>

      <OrRule />

      <PrimaryButton
        testID="register-submit-btn"
        label={loading ? 'Creating… / बना रहे हैं…' : 'Create Account / अकाउंट बनाएं'}
        icon="heart-outline"
        loading={loading}
        onPress={handleRegister}
      />

      <View style={styles.footer}>
        <Text style={styles.footerText}>Already have an account? </Text>
        <TouchableOpacity
          testID="register-login-link"
          onPress={() => router.push('/login')}
          activeOpacity={0.7}
        >
          <Text style={styles.footerLink}>Login</Text>
        </TouchableOpacity>
      </View>
    </AuthHero>
  );
}

const styles = StyleSheet.create({
  googleGap: { marginTop: 2 },
  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    flexWrap: 'wrap',
    marginTop: 14,
  },
  footerText: { fontSize: 14, color: authTheme.muted },
  footerLink: { fontSize: 14, fontWeight: '700', color: authTheme.link },
});

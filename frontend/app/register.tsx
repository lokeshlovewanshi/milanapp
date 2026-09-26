import { View, Text, StyleSheet, TouchableOpacity, Alert, InteractionManager } from 'react-native';
import FormField from '../components/FormField';
import AuthHero from '../components/AuthHero';
import { PrimaryButton, GoogleButton, OrRule } from '../components/AuthButtons';
import OtpInput from '../components/OtpInput';
import { auth as authTheme } from '../components/theme';

import { useState } from 'react';
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
  const [otpCode, setOtpCode] = useState('');
  const [otpSent, setOtpSent] = useState(false);
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
      // Do not create or sign in an account here. The password remains only in
      // this screen's state until the member proves control of the email.
      await otpAPI.request(email.trim(), 'SIGNUP');
      setOtpSent(true);
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

  const verifySignup = async (code: string) => {
    if (code.length !== 4 || loading) return;
    setLoading(true);
    try {
      const response = await authAPI.registerAfterOtp({
        email: email.trim(),
        password,
        code,
      });
      await persistSession(response.data);
      router.replace(destinationFor(response.data));
    } catch (error: any) {
      Alert.alert(
        'Verification Failed',
        error.response?.data?.detail || error.response?.data?.message || 'That code is not correct. Please try again.'
      );
      setOtpCode('');
    } finally {
      setLoading(false);
    }
  };

  const resendSignupOtp = async () => {
    setLoading(true);
    try {
      await otpAPI.request(email.trim(), 'SIGNUP');
      Alert.alert('Code Sent', `A new code was sent to ${email.trim()}.`);
    } catch (error: any) {
      Alert.alert('Could Not Send Code', error.response?.data?.detail || 'Please try again.');
    } finally {
      setLoading(false);
    }
  };

  if (otpSent) {
    return (
      <AuthHero
        title="Verify Your Email"
        subtitle={`Enter the 4-digit code sent to ${email.trim()}`}
        onBack={() => {
          setOtpSent(false);
          setOtpCode('');
        }}
      >
        <Text style={styles.otpLabel}>Verification code</Text>
        <OtpInput length={4} value={otpCode} onChange={setOtpCode} onComplete={verifySignup} />

        <TouchableOpacity disabled={loading} onPress={resendSignupOtp} style={styles.resend}>
          <Text style={styles.resendText}>Resend code</Text>
        </TouchableOpacity>

        <PrimaryButton
          label={loading ? 'Verifying…' : 'Verify & Create Account'}
          icon="checkmark-outline"
          loading={loading}
          onPress={() => verifySignup(otpCode)}
        />
      </AuthHero>
    );
  }

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
        label={loading ? 'Sending code…' : 'Continue'}
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
  otpLabel: { fontSize: 14, fontWeight: '700', color: authTheme.label, marginBottom: 10 },
  resend: { alignSelf: 'center', paddingVertical: 16 },
  resendText: { color: authTheme.link, fontWeight: '700', fontSize: 14 },
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

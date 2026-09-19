import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  InteractionManager,
} from "react-native";
import FormField from "../components/FormField";
import AuthHero from "../components/AuthHero";
import { PrimaryButton, GoogleButton, OrRule } from "../components/AuthButtons";
import { auth as authTheme } from "../components/theme";

import { useState, useEffect } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { authAPI, profileAPI } from "../utils/api";
import Ionicons from '@expo/vector-icons/Ionicons';
import { useGuardedRouter } from "../utils/useGuardedRouter";
import { isGoogleConfigured, signInWithGoogle } from "../utils/googleSignIn";
import { persistSession, destinationFor } from "../utils/afterAuth";

export default function LoginScreen() {
  const router = useGuardedRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    AsyncStorage.getItem("user_email")
      .then((saved) => {
        if (saved) setEmail(saved);
      })
      .catch(() => {});
  }, []);

  const onGooglePress = async () => {
    if (!isGoogleConfigured) {
      Alert.alert(
        "Google Sign-In not configured",
        "Set EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID in .env, then rebuild the app.",
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
        // Same rule as the sign-up screen: an unfinished profile goes to setup
        // whichever button got you here.
        router.replace(destinationFor(res.data));
      });
      return;
    } catch (error: any) {
      console.error("Google Auth Error:", error);

      // 410 Gone means the account was deleted or blocked. Both states can be
      // restored, but must return to admin review before becoming active.
      if (error.response?.status === 410) {
        setLoading(false);
        Alert.alert(
          "Account unavailable",
          "This account was deleted or blocked. Restore it for admin review?",
          [
            { text: "Cancel", style: "cancel" },
            { text: "Restore my account", onPress: () => restoreGoogleAccount() },
          ]
        );
        return;
      }

      Alert.alert(
        "Google Login Failed",
        error.response?.data?.message ||
          error.response?.data?.detail ||
          error.message ||
          "Please try again",
      );
    } finally {
      setLoading(false);
    }
  };

  /**
   * Re-runs the Google sign-in picker for a fresh token, only once the user
   * has confirmed they want to restore - the token from the failed attempt
   * already made a round trip to our server and back, and ID tokens are
   * short-lived enough that a second verify isn't guaranteed to land within
   * their window.
   */
  const restoreGoogleAccount = async () => {
    setLoading(true);
    try {
      const idToken = await signInWithGoogle();
      if (!idToken) {
        setLoading(false);
        return; // user cancelled the picker
      }
      const response = await authAPI.restoreGoogle({ idToken });
      await persistSession(response.data);
      setLoading(false);
      InteractionManager.runAfterInteractions(() => {
        router.replace(destinationFor(response.data));
      });
    } catch (error: any) {
      Alert.alert(
        "Could not restore account",
        error.response?.data?.message || error.response?.data?.detail || "Please try again."
      );
      setLoading(false);
    }
  };

  const handleLogin = async () => {
    const trimmedEmail = email.trim();
    if (!trimmedEmail || !password) {
      Alert.alert("Error", "Please enter your email and password");
      return;
    }

    setLoading(true);
    try {
      const response = await authAPI.login({ email: trimmedEmail, password });

      await persistSession(response.data);
      await AsyncStorage.setItem("user_email", trimmedEmail);

      // Password accounts that have not confirmed their address must finish
      // OTP verification before they can enter the app. Google login does not
      // use this path because its identity token already verifies the email.
      let needsEmailVerification = false;
      try {
        const me = await profileAPI.getMe();
        needsEmailVerification = me.data?.emailVerified === false;
      } catch {
        // A temporary profile refresh failure must not turn a successful login
        // into a false "Login Failed" message. The launch guard will retry.
      }
      router.replace(needsEmailVerification ? "/verify-email" : destinationFor(response.data));
    } catch (error: any) {
      console.error("Login Error:", error);

      // 410 Gone means the password was correct but the account is deleted or
      // blocked. Restoration sends it back to admin review.
      if (error.response?.status === 410) {
        Alert.alert(
          "Account unavailable",
          "This account was deleted or blocked. Restore it for admin review?",
          [
            { text: "Cancel", style: "cancel" },
            { text: "Restore my account", onPress: () => restoreAccount() },
          ]
        );
        return;
      }

      const errorMessage =
        error.response?.data?.message ||
        error.response?.data?.detail ||
        error.message ||
        "Invalid email or password. Please try again.";
      Alert.alert("Login Failed", errorMessage);
    } finally {
      setLoading(false);
    }
  };

  /** Same credentials already typed in - re-checked server-side, not resent blindly. */
  const restoreAccount = async () => {
    setLoading(true);
    try {
      const response = await authAPI.restore({ email, password });
      await persistSession(response.data);
      await AsyncStorage.setItem("user_email", email);
      router.replace(destinationFor(response.data));
    } catch (error: any) {
      Alert.alert(
        "Could not restore account",
        error.response?.data?.message || error.response?.data?.detail || "Please try again."
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthHero
      title="Welcome Back"
      titleAccessory={<Ionicons name="heart" size={22} color="#B3122E" />}
      subtitle="Sign in to continue your journey"
      onBack={() => router.back()}
    >
      <FormField
        testID="login-email-input"
        label="Email"
        icon="mail-outline"
        placeholder="Enter your email address"
        value={email}
        onChangeText={setEmail}
        keyboardType="email-address"
        autoCapitalize="none"
        autoComplete="email"
        textContentType="emailAddress"
        returnKeyType="next"
      />

      <FormField
        testID="login-password-input"
        label="Password"
        icon="lock-closed-outline"
        placeholder="Enter your password"
        value={password}
        onChangeText={setPassword}
        secure
        autoComplete="password"
        textContentType="password"
        returnKeyType="done"
        onSubmitEditing={handleLogin}
      />

      <TouchableOpacity
        testID="login-forgot-btn"
        style={styles.forgotWrap}
        activeOpacity={0.7}
        onPress={() =>
          router.push(
            // Carried across so the reset screen does not ask for an address
            // that was just typed in the field above it.
            email.trim() ? `/forgot-password?email=${encodeURIComponent(email.trim())}` : '/forgot-password'
          )
        }
      >
        <Text style={styles.forgot}>Forgot Password?</Text>
      </TouchableOpacity>

      {/* Google above the divider and Login below it, as in the comp. Reads as
          "the quick way, or the usual way" rather than burying the option
          people increasingly reach for first. */}
      <GoogleButton testID="login-google-btn" loading={loading} onPress={onGooglePress} />

      <OrRule />

      <PrimaryButton
        testID="login-submit-btn"
        label={loading ? "Logging in..." : "Login"}
        icon="lock-open-outline"
        loading={loading}
        onPress={handleLogin}
      />

      <View style={styles.footer}>
        <Text style={styles.footerText}>Don&apos;t have an account? </Text>
        <TouchableOpacity
          testID="login-register-link"
          onPress={() => router.push("/register")}
          activeOpacity={0.7}
        >
          <Text style={styles.footerLink}>Create an Account</Text>
        </TouchableOpacity>
      </View>
    </AuthHero>
  );
}

const styles = StyleSheet.create({
  forgotWrap: { alignSelf: "flex-end", paddingVertical: 2, marginBottom: 12 },
  forgot: { fontSize: 14, fontWeight: "600", color: authTheme.link },
  footer: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    flexWrap: "wrap",
    marginTop: 14,
  },
  footerText: { fontSize: 14, color: authTheme.muted },
  footerLink: { fontSize: 14, fontWeight: "700", color: authTheme.link },
});

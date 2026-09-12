import { useEffect, useRef, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useLocalSearchParams } from 'expo-router';
import { useGuardedRouter } from '../utils/useGuardedRouter';
import { otpAPI } from '../utils/api';
import AuthHero from '../components/AuthHero';
import FormField from '../components/FormField';
import OtpInput from '../components/OtpInput';
import { PrimaryButton } from '../components/AuthButtons';
import { auth as authTheme } from '../components/theme';

type Step = 'email' | 'code';

/** Seconds before "Resend code" becomes tappable again. */
const RESEND_AFTER = 30;

/**
 * Reset a forgotten password with a code emailed to the account address.
 *
 * Two steps on one screen rather than three screens. The code and the new
 * password are entered together because the server redeems them together - it
 * hands back no intermediate token, so there is nothing to carry between a
 * "verify" screen and a "new password" screen anyway.
 */
export default function ForgotPasswordScreen() {
  const router = useGuardedRouter();
  const params = useLocalSearchParams<{ email?: string }>();

  const [step, setStep] = useState<Step>('email');
  const [email, setEmail] = useState(params.email ?? '');
  const [code, setCode] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');

  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const [cooldown, setCooldown] = useState(0);
  // null = still checking. Checked once up front so a server with no mail
  // credentials configured fails here, with an explanation, instead of after
  // the person has already typed their email and tapped "Send code".
  const [mailAvailable, setMailAvailable] = useState<boolean | null>(null);

  useEffect(() => {
    otpAPI.status()
      .then((res) => setMailAvailable(Boolean(res.data?.emailEnabled)))
      .catch(() => setMailAvailable(true)); // unknown - don't block on a status check failing
  }, []);

  const timer = useRef<ReturnType<typeof setInterval> | null>(null);
  useEffect(() => () => { if (timer.current) clearInterval(timer.current); }, []);

  const startCooldown = () => {
    setCooldown(RESEND_AFTER);
    if (timer.current) clearInterval(timer.current);
    timer.current = setInterval(() => {
      setCooldown((n) => {
        if (n <= 1 && timer.current) clearInterval(timer.current);
        return n - 1;
      });
    }, 1000);
  };

  const message = (e: any, fallback: string) =>
    e?.response?.data?.detail || e?.response?.data?.message || fallback;

  const sendCode = async (resend = false) => {
    setError(null);
    if (!email.trim()) {
      setError('Please enter your email address.');
      return;
    }

    setBusy(true);
    try {
      await otpAPI.request(email.trim(), 'RESET_PASSWORD');
      setStep('code');
      startCooldown();
      if (resend) setCode('');
    } catch (e: any) {
      setError(message(e, 'Could not send the code. Please try again.'));
    } finally {
      setBusy(false);
    }
  };

  const submit = async () => {
    setError(null);

    if (code.length !== 4) {
      setError('Please enter the 4-digit code from your email.');
      return;
    }
    if (password.length < 8) {
      setError('Your new password must be at least 8 characters.');
      return;
    }
    if (password !== confirm) {
      setError('The two passwords do not match.');
      return;
    }

    setBusy(true);
    try {
      await otpAPI.resetPassword(email.trim(), code, password);
      setDone(true);
    } catch (e: any) {
      setError(message(e, 'Could not reset your password. Please check your code and try again.'));
    } finally {
      setBusy(false);
    }
  };

  if (mailAvailable === false) {
    return (
      <AuthHero
        title="Forgot Password"
        subtitle="This isn't available right now"
        onBack={() => router.back()}
      >
        <View style={styles.doneBox}>
          <Ionicons name="alert-circle" size={20} color="#B3122E" />
          <Text style={styles.doneText}>
            Password reset by email isn't set up on this server right now. Please contact support.
          </Text>
        </View>
      </AuthHero>
    );
  }

  if (done) {
    return (
      <AuthHero
        title="Password Reset"
        subtitle="You can sign in with your new password"
        onBack={() => router.replace('/login')}
      >
        <View style={styles.doneBox}>
          <Ionicons name="checkmark-circle" size={20} color="#166534" />
          <Text style={styles.doneText}>
            Your password has been changed. Use it to sign in from here on.
          </Text>
        </View>

        <PrimaryButton
          label="Back to Login"
          icon="lock-open-outline"
          onPress={() => router.replace('/login')}
        />
      </AuthHero>
    );
  }

  const isOtpReady = code.length === 4;

  return (
    <AuthHero
      title="Forgot Password"
      subtitle={
        step === 'email'
          ? 'We will email you a code to reset it'
          : `Enter the 4-digit code sent to ${email.trim()}`
      }
      onBack={() => (step === 'code' ? setStep('email') : router.back())}
    >
      {step === 'email' ? (
        <>
          <FormField
            label="Email"
            icon="mail-outline"
            placeholder="Enter your email address"
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            autoCapitalize="none"
            autoComplete="email"
            textContentType="emailAddress"
            returnKeyType="send"
            onSubmitEditing={() => sendCode()}
          />

          {!!error && <ErrorNote text={error} />}

          <PrimaryButton
            label={busy ? 'Sending…' : 'Send Code'}
            icon="mail-outline"
            loading={busy}
            onPress={() => sendCode()}
          />

          <Text style={styles.note}>
            If an account exists for that address, a 4-digit code will arrive within a
            minute. Check your spam folder too.
          </Text>
        </>
      ) : (
        <>
          <View style={styles.otpHeaderRow}>
            <Text style={styles.label}>4-digit verification code</Text>
            {isOtpReady && (
              <View style={styles.verifiedBadge}>
                <Ionicons name="checkmark-circle" size={14} color="#166534" />
                <Text style={styles.verifiedText}>Code entered</Text>
              </View>
            )}
          </View>
          <OtpInput length={4} value={code} onChange={setCode} />

          <TouchableOpacity
            style={styles.resend}
            disabled={cooldown > 0 || busy}
            onPress={() => sendCode(true)}
          >
            <Text style={[styles.resendText, cooldown > 0 && styles.resendMuted]}>
              {cooldown > 0 ? `Resend code in ${cooldown}s` : 'Resend code'}
            </Text>
          </TouchableOpacity>

          <View style={[styles.passwordSection, !isOtpReady && styles.disabledSection]} pointerEvents={isOtpReady ? 'auto' : 'none'}>
            <FormField
              label="New Password"
              icon="key-outline"
              secure
              placeholder={isOtpReady ? "At least 8 characters" : "Enter 4-digit code above first"}
              value={password}
              onChangeText={setPassword}
              autoComplete="new-password"
              textContentType="newPassword"
              editable={isOtpReady}
            />

            <FormField
              label="Confirm Password"
              icon="shield-checkmark-outline"
              secure
              placeholder={isOtpReady ? "Re-enter your new password" : "Enter 4-digit code above first"}
              value={confirm}
              onChangeText={setConfirm}
              autoComplete="new-password"
              textContentType="newPassword"
              editable={isOtpReady}
            />
          </View>

          {!!error && <ErrorNote text={error} />}

          <PrimaryButton
            label={busy ? 'Saving…' : 'Reset Password'}
            icon="lock-closed-outline"
            loading={busy}
            disabled={!isOtpReady || busy}
            onPress={submit}
          />
        </>
      )}
    </AuthHero>
  );
}

function ErrorNote({ text }: { text: string }) {
  return (
    <View style={styles.errorBox}>
      <Ionicons name="alert-circle-outline" size={16} color="#92400E" />
      <Text style={styles.errorText}>{text}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  otpHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  label: { fontSize: 13, fontWeight: '700', color: authTheme.label },
  verifiedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#DCFCE7',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  verifiedText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#166534',
  },
  passwordSection: {
    marginTop: 6,
  },
  disabledSection: {
    opacity: 0.5,
  },
  resend: { alignSelf: 'flex-end', paddingVertical: 10, marginBottom: 4 },
  resendText: { fontSize: 14, fontWeight: '600', color: authTheme.link },
  resendMuted: { color: authTheme.muted, fontWeight: '500' },
  note: {
    fontSize: 13,
    color: authTheme.muted,
    lineHeight: 18,
    marginTop: 14,
    textAlign: 'center',
  },
  errorBox: {
    flexDirection: 'row',
    gap: 8,
    alignItems: 'flex-start',
    backgroundColor: '#FEF3C7',
    borderRadius: 12,
    padding: 12,
    marginTop: 4,
    marginBottom: 10,
  },
  errorText: { flex: 1, fontSize: 13, color: '#92400E', lineHeight: 17 },
  doneBox: {
    flexDirection: 'row',
    gap: 8,
    alignItems: 'flex-start',
    backgroundColor: '#DCFCE7',
    borderRadius: 12,
    padding: 12,
    marginBottom: 16,
  },
  doneText: { flex: 1, fontSize: 14, color: '#166534', lineHeight: 19 },
});

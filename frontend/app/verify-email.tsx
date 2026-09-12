import { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useGuardedRouter } from '../utils/useGuardedRouter';
import { otpAPI, profileAPI } from '../utils/api';
import AuthHero from '../components/AuthHero';
import OtpInput from '../components/OtpInput';
import { PrimaryButton } from '../components/AuthButtons';
import { auth as authTheme } from '../components/theme';

const RESEND_AFTER = 30;

/**
 * Confirm the address an account signed up with.
 *
 * Reachable rather than forced: nothing in the app is gated on a verified
 * address today, and turning it into a wall would lock out every member who
 * joined before this existed. It is here so the flow works and so verification
 * can be required later without a second build.
 */
export default function VerifyEmailScreen() {
  const router = useGuardedRouter();

  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [cooldown, setCooldown] = useState(0);

  // The address comes from the session rather than a field. Letting someone
  // type it would let them "verify" an address that is not on the account.
  useEffect(() => {
    profileAPI
      .getMe()
      .then((res) => {
        setEmail(res.data?.email ?? '');
        if (res.data?.emailVerified) setDone(true);
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (cooldown <= 0) return;
    const t = setTimeout(() => setCooldown((n) => n - 1), 1000);
    return () => clearTimeout(t);
  }, [cooldown]);

  const message = (e: any, fallback: string) =>
    e?.response?.data?.detail || e?.response?.data?.message || fallback;

  const send = async () => {
    setError(null);
    setBusy(true);
    try {
      await otpAPI.request(email, 'VERIFY_EMAIL');
      setSent(true);
      setCooldown(RESEND_AFTER);
    } catch (e: any) {
      setError(message(e, 'Could not send the code. Please try again.'));
    } finally {
      setBusy(false);
    }
  };

  const verify = async (value: string) => {
    setError(null);
    setBusy(true);
    try {
      await otpAPI.verifyEmail(email, value);
      setDone(true);
    } catch (e: any) {
      setError(message(e, 'That code is not correct.'));
    } finally {
      setBusy(false);
    }
  };

  if (done) {
    return (
      <AuthHero title="Email Confirmed" subtitle="Your address is verified" onBack={() => router.back()}>
        <View style={styles.doneBox}>
          <Ionicons name="checkmark-circle" size={20} color="#166534" />
          <Text style={styles.doneText}>
            {email ? `${email} is confirmed.` : 'Your email address is confirmed.'}
          </Text>
        </View>
        <PrimaryButton label="Done" icon="checkmark-outline" onPress={() => router.back()} />
      </AuthHero>
    );
  }

  return (
    <AuthHero
      title="Confirm Email"
      subtitle={sent ? `Enter the 4-digit code sent to ${email}` : 'We will email you a 4-digit verification code'}
      onBack={() => router.back()}
    >
      {sent ? (
        <>
          <Text style={styles.label}>4-digit verification code</Text>
          {/* Verifies on the 4th digit automatically */}
          <OtpInput length={4} value={code} onChange={setCode} onComplete={verify} />

          <TouchableOpacity
            style={styles.resend}
            disabled={cooldown > 0 || busy}
            onPress={send}
          >
            <Text style={[styles.resendText, cooldown > 0 && styles.resendMuted]}>
              {cooldown > 0 ? `Resend code in ${cooldown}s` : 'Resend code'}
            </Text>
          </TouchableOpacity>

          {!!error && (
            <View style={styles.errorBox}>
              <Ionicons name="alert-circle-outline" size={16} color="#92400E" />
              <Text style={styles.errorText}>{error}</Text>
            </View>
          )}

          <PrimaryButton
            label={busy ? 'Checking…' : 'Confirm'}
            icon="checkmark-outline"
            loading={busy}
            onPress={() => verify(code)}
          />
        </>
      ) : (
        <>
          <Text style={styles.body}>
            {email
              ? `We will send a code to ${email} to confirm it is yours.`
              : 'Loading your account…'}
          </Text>

          {!!error && (
            <View style={styles.errorBox}>
              <Ionicons name="alert-circle-outline" size={16} color="#92400E" />
              <Text style={styles.errorText}>{error}</Text>
            </View>
          )}

          <PrimaryButton
            label={busy ? 'Sending…' : 'Send Code'}
            icon="mail-outline"
            loading={busy || !email}
            onPress={send}
          />
        </>
      )}
    </AuthHero>
  );
}

const styles = StyleSheet.create({
  label: { fontSize: 13, fontWeight: '700', color: authTheme.label, marginBottom: 8 },
  body: { fontSize: 14, color: authTheme.muted, lineHeight: 20, marginBottom: 18 },
  resend: { alignSelf: 'flex-end', paddingVertical: 10, marginBottom: 4 },
  resendText: { fontSize: 14, fontWeight: '600', color: authTheme.link },
  resendMuted: { color: authTheme.muted, fontWeight: '500' },
  errorBox: {
    flexDirection: 'row',
    gap: 8,
    alignItems: 'flex-start',
    backgroundColor: '#FEF3C7',
    borderRadius: 12,
    padding: 12,
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

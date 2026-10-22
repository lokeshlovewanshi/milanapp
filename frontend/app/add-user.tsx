import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  Modal,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useGuardedRouter } from '../utils/useGuardedRouter';
import { authAPI, otpAPI } from '../utils/api';
import { persistSession } from '../utils/afterAuth';
import { colors, font, radius, spacing, auth } from '../components/theme';

const MARITAL_STATUS_OPTIONS = [
  { code: 'NEVER_MARRIED', label: 'Never Married / अविवाहित' },
  { code: 'MARRIED', label: 'Married / विवाहित' },
  { code: 'DIVORCED', label: 'Divorced / तलाक' },
  { code: 'WIDOWED', label: 'Widowed / विधवा/विधुर' },
  { code: 'AWAITING_DIVORCE', label: 'Awaiting Divorce' },
];

const GENDER_OPTIONS = [
  { code: 'Male', label: 'Male / वर (पुरुष)' },
  { code: 'Female', label: 'Female / वधू (महिला)' },
];

const CREATED_BY_OPTIONS = [
  { code: 'SELF', label: 'Self / स्वयं' },
  { code: 'PARENTS', label: 'Parents / माता-पिता' },
  { code: 'SIBLING', label: 'Sibling / भाई-बहन' },
  { code: 'RELATIVE', label: 'Relative / रिश्तेदार' },
  { code: 'FRIEND', label: 'Friend / मित्र' },
];

export default function AddUserScreen() {
  const router = useGuardedRouter();
  const insets = useSafeAreaInsets();

  // Account details
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [mobileNo, setMobileNo] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  // OTP details
  const [otpCode, setOtpCode] = useState('');
  const [otpSent, setOtpSent] = useState(false);
  const [otpSending, setOtpSending] = useState(false);
  const [resendTimer, setResendTimer] = useState(0);

  // Profile details
  const [gender, setGender] = useState('Male');
  const [maritalStatus, setMaritalStatus] = useState('MARRIED');
  const [profileCreatedBy, setProfileCreatedBy] = useState('SELF');

  // Date of Birth fields
  const [dobDay, setDobDay] = useState('');
  const [dobMonth, setDobMonth] = useState('');
  const [dobYear, setDobYear] = useState('');

  // Other details
  const [gotra, setGotra] = useState('');
  const [state, setState] = useState('');
  const [city, setCity] = useState('');
  const [profession, setProfession] = useState('');
  const [education, setEducation] = useState('');

  const [loading, setLoading] = useState(false);
  const [successData, setSuccessData] = useState<any>(null);

  // Countdown timer effect
  useEffect(() => {
    let interval: any;
    if (resendTimer > 0) {
      interval = setInterval(() => {
        setResendTimer((prev) => (prev > 0 ? prev - 1 : 0));
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [resendTimer]);

  const handleSendOtp = async () => {
    const trimmedEmail = email.trim();
    if (!trimmedEmail || !trimmedEmail.includes('@')) {
      Alert.alert('Invalid Email', 'Please enter a valid email address first.');
      return;
    }
    setOtpSending(true);
    try {
      await otpAPI.request(trimmedEmail, 'SIGNUP');
      setOtpSent(true);
      setResendTimer(60);
      Alert.alert('OTP Sent', `A 4-digit verification code has been sent to ${trimmedEmail}`);
    } catch (error: any) {
      const msg =
        error.response?.data?.message ||
        error.response?.data?.detail ||
        error.message ||
        'Failed to send OTP code.';
      Alert.alert('Could Not Send OTP', msg);
    } finally {
      setOtpSending(false);
    }
  };

  const handleCreateAccount = async () => {
    const trimmedName = name.trim();
    const trimmedEmail = email.trim();
    const trimmedMobile = mobileNo.trim();
    const trimmedPassword = password.trim();
    const trimmedOtp = otpCode.trim();

    if (!trimmedName) {
      Alert.alert('Required', 'Please enter full name.');
      return;
    }
    if (!trimmedEmail) {
      Alert.alert('Required', 'Please enter email address.');
      return;
    }
    if (!otpSent) {
      Alert.alert('OTP Required', 'Please tap "Send OTP" to verify the email address before creating the account.');
      return;
    }
    if (!trimmedOtp || trimmedOtp.length < 4) {
      Alert.alert('OTP Required', 'Please enter the 4-digit verification code sent to your email.');
      return;
    }
    if (!trimmedMobile || trimmedMobile.length < 10) {
      Alert.alert('Mobile Number Required', 'Please enter a valid 10-digit mobile number.');
      return;
    }
    if (!trimmedPassword || trimmedPassword.length < 6) {
      Alert.alert('Password Required', 'Password must be at least 6 characters.');
      return;
    }

    // Format Date of Birth
    let formattedDob: string | undefined = undefined;
    if (dobYear && dobMonth && dobDay) {
      const y = dobYear.padStart(4, '2000');
      const m = dobMonth.padStart(2, '01');
      const d = dobDay.padStart(2, '01');
      formattedDob = `${y}-${m}-${d}T00:00:00`;
    }

    setLoading(true);
    try {
      const payload = {
        name: trimmedName,
        email: trimmedEmail,
        mobileNo: trimmedMobile,
        password: trimmedPassword,
        code: trimmedOtp,
        gender,
        maritalStatus,
        profileCreatedBy,
        dateOfBirth: formattedDob,
        gotra: gotra.trim() || undefined,
        state: state.trim() || undefined,
        city: city.trim() || undefined,
        profession: profession.trim() || undefined,
        education: education.trim() || undefined,
      };

      const res = await authAPI.registerAfterOtp(payload);
      setSuccessData({
        ...res.data,
        createdName: trimmedName,
        createdEmail: trimmedEmail,
        createdGender: gender,
        createdMaritalStatus: maritalStatus,
      });
    } catch (error: any) {
      console.error('Failed to create account:', error);
      const msg =
        error.response?.data?.detail ||
        error.response?.data?.message ||
        error.message ||
        'Failed to verify and create account. Please check your OTP code and try again.';
      Alert.alert('Creation Failed', msg);
    } finally {
      setLoading(false);
    }
  };

  const handleSwitchAccount = async () => {
    if (successData?.token) {
      await persistSession(successData);
      router.replace('/(tabs)/home');
    }
  };

  const handleStayCurrent = () => {
    setSuccessData(null);
    router.back();
  };

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <View style={[styles.container, { paddingTop: insets.top }]}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backBtn}
            onPress={() => router.back()}
            hitSlop={10}
            accessibilityRole="button"
          >
            <Ionicons name="arrow-back" size={24} color={colors.text} />
          </TouchableOpacity>
          <View style={styles.headerTextWrap}>
            <Text style={styles.headerTitle}>Add Another Account</Text>
            <Text style={styles.headerSubtitle}>नया प्रोफाइल / यूजर अकाउंट जोड़ें</Text>
          </View>
        </View>

        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* Info Card */}
          <View style={styles.infoBox}>
            <Ionicons name="information-circle" size={20} color="#2563EB" />
            <Text style={styles.infoText}>
              You can create another account for a family member or normal/married user. An email OTP verification will be required to confirm their account.
            </Text>
          </View>

          {/* Section 1: Account & Verification */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>1. Account &amp; Verification / अकाउंट विवरण</Text>

            <Text style={styles.label}>Full Name / पूरा नाम *</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g. Ramesh Lodha"
              placeholderTextColor={colors.textMuted}
              value={name}
              onChangeText={setName}
            />

            <Text style={styles.label}>Email Address / ईमेल *</Text>
            <View style={styles.emailRow}>
              <TextInput
                style={[styles.input, { flex: 1, marginBottom: 0 }]}
                placeholder="e.g. user@example.com"
                placeholderTextColor={colors.textMuted}
                keyboardType="email-address"
                autoCapitalize="none"
                value={email}
                onChangeText={setEmail}
              />
              <TouchableOpacity
                style={[styles.otpBtn, otpSending && styles.otpBtnDisabled]}
                onPress={handleSendOtp}
                disabled={otpSending || resendTimer > 0}
              >
                {otpSending ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <Text style={styles.otpBtnText}>
                    {resendTimer > 0 ? `${resendTimer}s` : otpSent ? 'Resend' : 'Send OTP'}
                  </Text>
                )}
              </TouchableOpacity>
            </View>

            {otpSent && (
              <View style={styles.otpBox}>
                <Text style={styles.label}>Enter 4-Digit OTP / कोड दर्ज करें *</Text>
                <TextInput
                  style={[styles.input, styles.otpInput]}
                  placeholder="• • • •"
                  placeholderTextColor={colors.textMuted}
                  keyboardType="number-pad"
                  maxLength={4}
                  value={otpCode}
                  onChangeText={setOtpCode}
                />
                <Text style={styles.otpHint}>
                  Check your inbox or spam folder for the code sent to {email.trim()}
                </Text>
              </View>
            )}

            <Text style={styles.label}>Mobile Number / मोबाइल नंबर *</Text>
            <TextInput
              style={styles.input}
              placeholder="10-digit mobile number"
              placeholderTextColor={colors.textMuted}
              keyboardType="phone-pad"
              maxLength={10}
              value={mobileNo}
              onChangeText={setMobileNo}
            />

            <Text style={styles.label}>Password / पासवर्ड *</Text>
            <View style={styles.passwordRow}>
              <TextInput
                style={[styles.input, { flex: 1, marginBottom: 0 }]}
                placeholder="At least 6 characters"
                placeholderTextColor={colors.textMuted}
                secureTextEntry={!showPassword}
                value={password}
                onChangeText={setPassword}
              />
              <TouchableOpacity
                style={styles.eyeBtn}
                onPress={() => setShowPassword(!showPassword)}
                hitSlop={8}
              >
                <Ionicons
                  name={showPassword ? 'eye-off-outline' : 'eye-outline'}
                  size={20}
                  color={colors.textMuted}
                />
              </TouchableOpacity>
            </View>
          </View>

          {/* Section 2: Personal & Matrimonial Details */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>2. Personal Details / व्यक्तिगत जानकारी</Text>

            <Text style={styles.label}>Profile Created By / प्रोफाइल किसके लिए है</Text>
            <View style={styles.chipsWrap}>
              {CREATED_BY_OPTIONS.map((opt) => (
                <TouchableOpacity
                  key={opt.code}
                  style={[styles.chip, profileCreatedBy === opt.code && styles.chipActive]}
                  onPress={() => setProfileCreatedBy(opt.code)}
                >
                  <Text
                    style={[
                      styles.chipText,
                      profileCreatedBy === opt.code && styles.chipTextActive,
                    ]}
                  >
                    {opt.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={styles.label}>Gender / लिंग *</Text>
            <View style={styles.chipsWrap}>
              {GENDER_OPTIONS.map((opt) => (
                <TouchableOpacity
                  key={opt.code}
                  style={[styles.chip, gender === opt.code && styles.chipActive]}
                  onPress={() => setGender(opt.code)}
                >
                  <Text style={[styles.chipText, gender === opt.code && styles.chipTextActive]}>
                    {opt.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={styles.label}>Marital Status / वैवाहिक स्थिति *</Text>
            <View style={styles.chipsWrap}>
              {MARITAL_STATUS_OPTIONS.map((opt) => (
                <TouchableOpacity
                  key={opt.code}
                  style={[
                    styles.chip,
                    maritalStatus === opt.code && styles.chipActive,
                    opt.code === 'MARRIED' && styles.marriedChipHighlight,
                  ]}
                  onPress={() => setMaritalStatus(opt.code)}
                >
                  {opt.code === 'MARRIED' && (
                    <Ionicons
                      name="heart"
                      size={14}
                      color={maritalStatus === 'MARRIED' ? '#fff' : auth.crimson}
                      style={{ marginRight: 4 }}
                    />
                  )}
                  <Text
                    style={[
                      styles.chipText,
                      maritalStatus === opt.code && styles.chipTextActive,
                      opt.code === 'MARRIED' &&
                        maritalStatus !== opt.code && { color: auth.crimson, fontWeight: '700' },
                    ]}
                  >
                    {opt.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={styles.label}>Date of Birth / जन्म तिथि (DD / MM / YYYY)</Text>
            <View style={styles.dobRow}>
              <TextInput
                style={[styles.input, styles.dobInput]}
                placeholder="DD"
                placeholderTextColor={colors.textMuted}
                keyboardType="number-pad"
                maxLength={2}
                value={dobDay}
                onChangeText={setDobDay}
              />
              <Text style={styles.dobSlash}>/</Text>
              <TextInput
                style={[styles.input, styles.dobInput]}
                placeholder="MM"
                placeholderTextColor={colors.textMuted}
                keyboardType="number-pad"
                maxLength={2}
                value={dobMonth}
                onChangeText={setDobMonth}
              />
              <Text style={styles.dobSlash}>/</Text>
              <TextInput
                style={[styles.input, styles.dobInput, { flex: 1.5 }]}
                placeholder="YYYY"
                placeholderTextColor={colors.textMuted}
                keyboardType="number-pad"
                maxLength={4}
                value={dobYear}
                onChangeText={setDobYear}
              />
            </View>

            <Text style={styles.label}>Gotra / गोत्र</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g. Kashyap, Garg"
              placeholderTextColor={colors.textMuted}
              value={gotra}
              onChangeText={setGotra}
            />

            <View style={styles.row}>
              <View style={{ flex: 1, marginRight: 8 }}>
                <Text style={styles.label}>State / राज्य</Text>
                <TextInput
                  style={styles.input}
                  placeholder="State"
                  placeholderTextColor={colors.textMuted}
                  value={state}
                  onChangeText={setState}
                />
              </View>
              <View style={{ flex: 1, marginLeft: 8 }}>
                <Text style={styles.label}>City / शहर</Text>
                <TextInput
                  style={styles.input}
                  placeholder="City"
                  placeholderTextColor={colors.textMuted}
                  value={city}
                  onChangeText={setCity}
                />
              </View>
            </View>

            <Text style={styles.label}>Profession / व्यवसाय</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g. Agriculture, Business, Engineer"
              placeholderTextColor={colors.textMuted}
              value={profession}
              onChangeText={setProfession}
            />

            <Text style={styles.label}>Education / शिक्षा</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g. Graduate, B.Tech, M.A."
              placeholderTextColor={colors.textMuted}
              value={education}
              onChangeText={setEducation}
            />
          </View>

          {/* Submit Button */}
          <TouchableOpacity
            style={[styles.submitBtn, loading && styles.submitBtnDisabled]}
            onPress={handleCreateAccount}
            disabled={loading}
            activeOpacity={0.85}
          >
            {loading ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <>
                <Ionicons name="person-add" size={18} color="#fff" style={{ marginRight: 8 }} />
                <Text style={styles.submitBtnText}>Verify &amp; Create Account</Text>
              </>
            )}
          </TouchableOpacity>

          <View style={{ height: 40 }} />
        </ScrollView>

        {/* Success Modal */}
        <Modal visible={!!successData} transparent animationType="fade">
          <View style={styles.modalBackdrop}>
            <View style={styles.modalCard}>
              <View style={styles.successIconWrap}>
                <Ionicons name="checkmark-circle" size={54} color="#10B981" />
              </View>
              <Text style={styles.modalTitle}>Account Created!</Text>
              <Text style={styles.modalSubtitle}>
                New account for <Text style={{ fontWeight: '700' }}>{successData?.createdName}</Text> has been created and verified.
              </Text>

              <View style={styles.modalDetails}>
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Email:</Text>
                  <Text style={styles.detailVal}>{successData?.createdEmail}</Text>
                </View>
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Status:</Text>
                  <Text style={styles.detailVal}>{successData?.createdMaritalStatus}</Text>
                </View>
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Gender:</Text>
                  <Text style={styles.detailVal}>{successData?.createdGender}</Text>
                </View>
              </View>

              <View style={styles.modalActions}>
                <TouchableOpacity
                  style={[styles.modalBtn, styles.modalBtnPrimary]}
                  onPress={handleSwitchAccount}
                  activeOpacity={0.85}
                >
                  <Text style={styles.modalBtnPrimaryText}>Switch to New Account</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.modalBtn, styles.modalBtnSecondary]}
                  onPress={handleStayCurrent}
                  activeOpacity={0.85}
                >
                  <Text style={styles.modalBtnSecondaryText}>Stay in Current Account</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    backgroundColor: colors.white,
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  backBtn: {
    padding: spacing.xs,
    marginRight: spacing.sm,
  },
  headerTextWrap: {
    flex: 1,
  },
  headerTitle: {
    fontSize: font.title,
    fontWeight: '700',
    color: colors.text,
  },
  headerSubtitle: {
    fontSize: font.small,
    color: colors.textMuted,
    marginTop: 2,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: spacing.md,
  },
  infoBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#EFF6FF',
    borderRadius: radius.md,
    padding: spacing.md,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: '#BFDBFE',
    gap: spacing.sm,
  },
  infoText: {
    flex: 1,
    fontSize: font.small,
    color: '#1E40AF',
    lineHeight: 18,
  },
  section: {
    backgroundColor: colors.white,
    borderRadius: radius.lg,
    padding: spacing.lg,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 3,
    elevation: 1,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.text,
    marginBottom: spacing.md,
    paddingBottom: spacing.xs,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#E2E8F0',
  },
  label: {
    fontSize: font.small,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 6,
    marginTop: 8,
  },
  input: {
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderRadius: radius.md,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: font.body,
    color: colors.text,
    marginBottom: spacing.xs,
  },
  emailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: spacing.xs,
  },
  otpBtn: {
    backgroundColor: auth.crimson,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: radius.md,
    justifyContent: 'center',
    alignItems: 'center',
    minWidth: 84,
  },
  otpBtnDisabled: {
    opacity: 0.6,
  },
  otpBtnText: {
    color: colors.white,
    fontSize: font.small,
    fontWeight: '700',
  },
  otpBox: {
    backgroundColor: '#FFFBEB',
    borderWidth: 1,
    borderColor: '#FDE68A',
    borderRadius: radius.md,
    padding: spacing.md,
    marginVertical: spacing.sm,
  },
  otpInput: {
    backgroundColor: colors.white,
    textAlign: 'center',
    fontSize: 22,
    fontWeight: '700',
    letterSpacing: 8,
  },
  otpHint: {
    fontSize: 12,
    color: '#92400E',
    marginTop: 4,
  },
  passwordRow: {
    flexDirection: 'row',
    alignItems: 'center',
    position: 'relative',
  },
  eyeBtn: {
    position: 'absolute',
    right: 12,
    padding: 6,
  },
  chipsWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: spacing.sm,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 7,
    paddingHorizontal: 12,
    borderRadius: radius.full,
    backgroundColor: '#F1F5F9',
    borderWidth: 1,
    borderColor: '#CBD5E1',
  },
  chipActive: {
    backgroundColor: auth.crimson,
    borderColor: auth.crimson,
  },
  marriedChipHighlight: {
    borderColor: '#FECDD3',
    backgroundColor: '#FFF1F2',
  },
  chipText: {
    fontSize: font.small,
    color: colors.text,
    fontWeight: '500',
  },
  chipTextActive: {
    color: colors.white,
    fontWeight: '700',
  },
  dobRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: spacing.xs,
  },
  dobInput: {
    flex: 1,
    textAlign: 'center',
    marginBottom: 0,
  },
  dobSlash: {
    fontSize: 18,
    color: colors.textMuted,
    fontWeight: '600',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  submitBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: auth.crimson,
    paddingVertical: 14,
    borderRadius: radius.md,
    marginTop: spacing.sm,
    shadowColor: auth.crimson,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.25,
    shadowRadius: 5,
    elevation: 3,
  },
  submitBtnDisabled: {
    opacity: 0.6,
  },
  submitBtnText: {
    color: colors.white,
    fontSize: font.body,
    fontWeight: '700',
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.lg,
  },
  modalCard: {
    width: '100%',
    backgroundColor: colors.white,
    borderRadius: radius.xl,
    padding: spacing.xl,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 5,
  },
  successIconWrap: {
    marginBottom: spacing.sm,
  },
  modalTitle: {
    fontSize: font.title,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 6,
  },
  modalSubtitle: {
    fontSize: font.small,
    color: colors.textMuted,
    textAlign: 'center',
    marginBottom: spacing.md,
    lineHeight: 18,
  },
  modalDetails: {
    width: '100%',
    backgroundColor: '#F8FAFC',
    borderRadius: radius.md,
    padding: spacing.md,
    marginBottom: spacing.lg,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 4,
  },
  detailLabel: {
    fontSize: font.small,
    color: colors.textMuted,
  },
  detailVal: {
    fontSize: font.small,
    fontWeight: '600',
    color: colors.text,
  },
  modalActions: {
    width: '100%',
    gap: spacing.sm,
  },
  modalBtn: {
    width: '100%',
    paddingVertical: 12,
    borderRadius: radius.md,
    alignItems: 'center',
  },
  modalBtnPrimary: {
    backgroundColor: auth.crimson,
  },
  modalBtnPrimaryText: {
    color: colors.white,
    fontSize: font.body,
    fontWeight: '700',
  },
  modalBtnSecondary: {
    backgroundColor: '#F1F5F9',
  },
  modalBtnSecondaryText: {
    color: colors.text,
    fontSize: font.body,
    fontWeight: '600',
  },
});

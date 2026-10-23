import React, { useState, useEffect, useCallback } from 'react';
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
  Keyboard,
} from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useGuardedRouter } from '../utils/useGuardedRouter';
import api, { authAPI, otpAPI, profileAPI } from '../utils/api';
import { persistSession } from '../utils/afterAuth';
import {
  getSavedAccounts,
  saveAccount,
  removeAccount,
  switchActiveAccount,
  type SavedAccount,
} from '../utils/multiAccount';
import { colors, font, radius, spacing, auth } from '../components/theme';

const MARITAL_STATUS_OPTIONS = [
  { code: 'NEVER_MARRIED', label: 'Never Married / अविवाहित' },
  { code: 'MARRIED', label: 'Married / विवाहित' },
  { code: 'DIVORCED', label: 'Divorced / तलाक' },
  { code: 'WIDOWED', label: 'Widowed / विधवा/विधुर' },
  { code: 'AWAITING_DIVORCE', label: 'Awaiting Divorce' },
];

const GENDER_OPTIONS = [
  { code: 'Male', label: 'Male / पुरुष' },
  { code: 'Female', label: 'Female / महिला' },
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

  // Mode: 'create' (Register new) by default or 'open' (Log in / Switch to existing)
  const [activeTab, setActiveTab] = useState<'create' | 'open'>('create');

  // Saved accounts
  const [savedAccounts, setSavedAccounts] = useState<SavedAccount[]>([]);

  // Login form state
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [showLoginPassword, setShowLoginPassword] = useState(false);
  const [loginLoading, setLoginLoading] = useState(false);

  // Keyboard height for dynamic scrolling above keyboard
  const [keyboardHeight, setKeyboardHeight] = useState(0);

  // Registration details
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

  // Load saved accounts
  const refreshSavedAccounts = useCallback(async () => {
    try {
      const list = await getSavedAccounts();
      setSavedAccounts(list);
    } catch {}
  }, []);

  useEffect(() => {
    refreshSavedAccounts();
  }, [refreshSavedAccounts]);

  // Keyboard event listeners
  useEffect(() => {
    const showSub = Keyboard.addListener(
      Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow',
      (e) => setKeyboardHeight(e.endCoordinates.height)
    );
    const hideSub = Keyboard.addListener(
      Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide',
      () => setKeyboardHeight(0)
    );
    return () => {
      showSub.remove();
      hideSub.remove();
    };
  }, []);

  // Countdown timer for OTP
  useEffect(() => {
    let interval: any;
    if (resendTimer > 0) {
      interval = setInterval(() => {
        setResendTimer((prev) => (prev > 0 ? prev - 1 : 0));
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [resendTimer]);

  // Handle switching to a saved account
  const handleOpenAccount = async (acc: SavedAccount) => {
    try {
      setLoginLoading(true);
      await switchActiveAccount(acc);
      Alert.alert('Account Opened', `Welcome, ${acc.name}!`);
      router.replace('/(tabs)/home');
    } catch (e: any) {
      Alert.alert('Error', e?.message || 'Failed to switch account');
    } finally {
      setLoginLoading(false);
    }
  };

  // Handle removing a saved account
  const handleRemoveAccount = async (idOrEmail: string | number) => {
    Alert.alert(
      'Remove Account',
      'Are you sure you want to remove this account from this device?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: async () => {
            await removeAccount(idOrEmail);
            refreshSavedAccounts();
          },
        },
      ]
    );
  };

  // Handle Login to an existing account
  const handleLoginExisting = async () => {
    const trimmedEmail = loginEmail.trim();
    const trimmedPass = loginPassword.trim();

    if (!trimmedEmail || !trimmedPass) {
      Alert.alert('Required', 'Please enter email and password.');
      return;
    }

    setLoginLoading(true);
    try {
      const res = await authAPI.login({ email: trimmedEmail, password: trimmedPass });
      const data = res.data;
      await persistSession(data);
      await AsyncStorage.setItem('user_email', trimmedEmail);

      let fetchedName = 'Member';
      let fetchedId: string | number = Date.now();
      let fetchedMemberId: string | null = null;
      let fetchedImage: string | null = null;
      let fetchedGender: string | null = null;
      let fetchedMaritalStatus: string | null = null;

      try {
        const meRes = await profileAPI.getMe();
        const me = meRes.data;
        fetchedName = me?.name || 'Member';
        fetchedId = me?.id ?? me?.userProfileId ?? Date.now();
        fetchedMemberId = me?.displayId || me?.memberId || null;
        fetchedImage = me?.profileImage || null;
        fetchedGender = me?.gender || null;
        fetchedMaritalStatus = me?.maritalStatus || null;
      } catch {}

      await saveAccount({
        id: fetchedId,
        email: trimmedEmail,
        name: fetchedName,
        token: data.token,
        memberId: fetchedMemberId,
        avatarUrl: fetchedImage,
        gender: fetchedGender,
        maritalStatus: fetchedMaritalStatus,
      });

      Alert.alert('Account Opened', `Welcome back, ${fetchedName}!`);
      router.replace('/(tabs)/home');
    } catch (error: any) {
      const msg =
        error.response?.data?.message ||
        error.response?.data?.detail ||
        error.message ||
        'Could not log in. Please check your credentials.';
      Alert.alert('Login Failed', msg);
    } finally {
      setLoginLoading(false);
    }
  };

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

    // Format and validate Date of Birth
    let formattedDob: string | undefined = undefined;
    if (dobDay.trim() || dobMonth.trim() || dobYear.trim()) {
      let dNum = parseInt(dobDay.trim(), 10);
      let mNum = parseInt(dobMonth.trim(), 10);
      let yNum = parseInt(dobYear.trim(), 10);

      // Auto-correct if user accidentally swapped day and month (e.g. entered day=12, month=28)
      if (mNum > 12 && dNum <= 12) {
        const temp = dNum;
        dNum = mNum;
        mNum = temp;
      }

      const currentYear = new Date().getFullYear();
      if (
        isNaN(dNum) ||
        dNum < 1 ||
        dNum > 31 ||
        isNaN(mNum) ||
        mNum < 1 ||
        mNum > 12 ||
        isNaN(yNum) ||
        yNum < 1920 ||
        yNum > currentYear
      ) {
        Alert.alert(
          'Invalid Date of Birth',
          'Please enter a valid Date of Birth:\n• Day (DD): 1 - 31\n• Month (MM): 1 - 12\n• Year (YYYY): e.g. 1998'
        );
        return;
      }

      const y = String(yNum).padStart(4, '2000');
      const m = String(mNum).padStart(2, '01');
      const d = String(dNum).padStart(2, '01');
      formattedDob = `${y}-${m}-${d}T00:00:00`;
    } else {
      Alert.alert('Date of Birth Required', 'Please enter your complete Date of Birth (Day, Month, and Year).');
      return;
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
      const resData = res.data;

      // Explicitly persist profile fields (DOB, Marital Status, Gender, etc.) to guarantee they are updated
      if (resData?.token) {
        const authHeader = { headers: { Authorization: `Bearer ${resData.token}` } };
        try {
          await api.patch(
            '/user/profile',
            {
              maritalStatus,
              gender,
              dateOfBirth: formattedDob,
              gotra: gotra.trim() || undefined,
              state: state.trim() || undefined,
              city: city.trim() || undefined,
              profession: profession.trim() || undefined,
              education: education.trim() || undefined,
              profileCreatedBy,
            },
            authHeader
          );
        } catch (patchErr) {
          console.log('Explicit profile patch fallback error:', patchErr);
        }

        try {
          await api.patch(
            '/user/profile/basic',
            {
              name: trimmedName,
              gender,
              maritalStatus,
              dateOfBirth: formattedDob,
              mobileNo: trimmedMobile,
              profileCreatedBy,
            },
            authHeader
          );
        } catch (basicErr) {
          console.log('Explicit basic patch fallback error:', basicErr);
        }
      }

      // Pre-save account in saved accounts with true user ID
      if (resData?.token) {
        await saveAccount({
          id: resData?.userId ?? resData?.id ?? Date.now(),
          email: trimmedEmail,
          name: trimmedName,
          token: resData.token,
          gender,
          maritalStatus,
        });
      }

      setSuccessData({
        ...resData,
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
      await AsyncStorage.setItem('user_email', successData?.createdEmail ?? email);
      await AsyncStorage.removeItem('cached_feed_profiles');
      await AsyncStorage.removeItem('cached_suggested_profiles');
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
      keyboardVerticalOffset={Platform.OS === 'ios' ? insets.top : 0}
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
            <Text style={styles.headerSubtitle}>अकाउंट खोलें या नया अकाउंट बनाएं</Text>
          </View>
        </View>

        {/* Tab Switcher */}
        <View style={styles.tabContainer}>
          <TouchableOpacity
            style={[styles.tabBtn, activeTab === 'create' && styles.tabBtnActive]}
            onPress={() => setActiveTab('create')}
            activeOpacity={0.8}
          >
            <Ionicons
              name="person-add-outline"
              size={18}
              color={activeTab === 'create' ? colors.white : colors.text}
              style={{ marginRight: 6 }}
            />
            <Text style={[styles.tabBtnText, activeTab === 'create' && styles.tabBtnTextActive]}>
              Create New / नया बनाएं
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.tabBtn, activeTab === 'open' && styles.tabBtnActive]}
            onPress={() => setActiveTab('open')}
            activeOpacity={0.8}
          >
            <Ionicons
              name="log-in-outline"
              size={18}
              color={activeTab === 'open' ? colors.white : colors.text}
              style={{ marginRight: 6 }}
            />
            <Text style={[styles.tabBtnText, activeTab === 'open' && styles.tabBtnTextActive]}>
              Open Account / लॉग इन
            </Text>
          </TouchableOpacity>
        </View>

        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={[
            styles.scrollContent,
            { paddingBottom: Math.max(keyboardHeight + 80, 240) },
          ]}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="on-drag"
        >
          {activeTab === 'open' ? (
            /* TAB 1: OPEN EXISTING ACCOUNT */
            <View>
              {/* Saved accounts on this device */}
              {savedAccounts.length > 0 && (
                <View style={styles.section}>
                  <View style={styles.sectionHeaderRow}>
                    <Ionicons name="people" size={20} color={auth.crimson} />
                    <Text style={styles.sectionTitle}>Accounts on this device / उपलब्ध अकाउंट</Text>
                  </View>
                  <Text style={styles.subtext}>
                    Tap any account below to open it immediately:
                  </Text>

                  {savedAccounts.map((acc) => (
                    <View key={String(acc.id || acc.email)} style={styles.accountCard}>
                      <View style={styles.accountAvatar}>
                        <Ionicons
                          name={acc.gender?.toLowerCase().startsWith('f') ? 'woman' : 'person'}
                          size={22}
                          color={auth.crimson}
                        />
                      </View>
                      <View style={styles.accountInfo}>
                        <Text style={styles.accountName} numberOfLines={1}>
                          {acc.name}
                        </Text>
                        <Text style={styles.accountEmail} numberOfLines={1}>
                          {acc.email}
                        </Text>
                        {!!acc.memberId && (
                          <Text style={styles.accountIdText}>ID: {acc.memberId}</Text>
                        )}
                      </View>

                      <TouchableOpacity
                        style={styles.openAccountBtn}
                        onPress={() => handleOpenAccount(acc)}
                        activeOpacity={0.8}
                      >
                        <Text style={styles.openAccountBtnText}>Open</Text>
                      </TouchableOpacity>

                      <TouchableOpacity
                        style={styles.removeAccountBtn}
                        onPress={() => handleRemoveAccount(acc.id || acc.email)}
                        hitSlop={8}
                      >
                        <Ionicons name="trash-outline" size={18} color="#94A3B8" />
                      </TouchableOpacity>
                    </View>
                  ))}
                </View>
              )}

              {/* Login with another account */}
              <View style={styles.section}>
                <View style={styles.sectionHeaderRow}>
                  <Ionicons name="key" size={20} color={auth.crimson} />
                  <Text style={styles.sectionTitle}>
                    {savedAccounts.length > 0
                      ? 'Log In to Another Account / अन्य अकाउंट खोलें'
                      : 'Log In to Open Account / अकाउंट खोलें'}
                  </Text>
                </View>
                <Text style={styles.subtext}>
                  Enter the email and password of the account you want to open:
                </Text>

                <Text style={styles.label}>Email Address / ईमेल *</Text>
                <TextInput
                  style={styles.input}
                  placeholder="e.g. user@example.com"
                  placeholderTextColor={colors.textMuted}
                  value={loginEmail}
                  onChangeText={setLoginEmail}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoCorrect={false}
                />

                <Text style={styles.label}>Password / पासवर्ड *</Text>
                <View style={styles.passwordRow}>
                  <TextInput
                    style={[styles.input, { flex: 1, marginBottom: 0 }]}
                    placeholder="Enter password"
                    placeholderTextColor={colors.textMuted}
                    value={loginPassword}
                    onChangeText={setLoginPassword}
                    secureTextEntry={!showLoginPassword}
                    autoCapitalize="none"
                  />
                  <TouchableOpacity
                    style={styles.eyeBtn}
                    onPress={() => setShowLoginPassword((prev) => !prev)}
                    hitSlop={8}
                  >
                    <Ionicons
                      name={showLoginPassword ? 'eye-off-outline' : 'eye-outline'}
                      size={20}
                      color={colors.textMuted}
                    />
                  </TouchableOpacity>
                </View>

                <TouchableOpacity
                  style={[styles.submitBtn, loginLoading && styles.submitBtnDisabled]}
                  onPress={handleLoginExisting}
                  disabled={loginLoading}
                  activeOpacity={0.85}
                >
                  {loginLoading ? (
                    <ActivityIndicator size="small" color="#fff" />
                  ) : (
                    <>
                      <Ionicons name="log-in" size={20} color="#fff" style={{ marginRight: 8 }} />
                      <Text style={styles.submitBtnText}>Log In &amp; Open Account</Text>
                    </>
                  )}
                </TouchableOpacity>
              </View>
            </View>
          ) : (
            /* TAB 2: CREATE NEW ACCOUNT */
            <View>
              {/* Info Card */}
              <View style={styles.infoBox}>
                <Ionicons name="information-circle" size={20} color="#2563EB" />
                <Text style={styles.infoText}>
                  Create a new account for a family member or normal/married user. An email OTP verification is required to confirm their identity.
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
                    placeholder="e.g. name@example.com"
                    placeholderTextColor={colors.textMuted}
                    value={email}
                    onChangeText={(val) => {
                      setEmail(val);
                      setOtpSent(false);
                    }}
                    keyboardType="email-address"
                    autoCapitalize="none"
                    autoCorrect={false}
                  />
                  <TouchableOpacity
                    style={[styles.sendOtpBtn, (otpSending || resendTimer > 0) && styles.sendOtpBtnDisabled]}
                    onPress={handleSendOtp}
                    disabled={otpSending || resendTimer > 0}
                    activeOpacity={0.8}
                  >
                    {otpSending ? (
                      <ActivityIndicator size="small" color="#fff" />
                    ) : (
                      <Text style={styles.sendOtpBtnText}>
                        {resendTimer > 0 ? `${resendTimer}s` : otpSent ? 'Resend' : 'Send OTP'}
                      </Text>
                    )}
                  </TouchableOpacity>
                </View>

                {otpSent && (
                  <View style={styles.otpSuccessBox}>
                    <Ionicons name="checkmark-circle" size={16} color="#10B981" />
                    <Text style={styles.otpSuccessText}>
                      OTP sent! Check inbox or spam folder.
                    </Text>
                  </View>
                )}

                <Text style={styles.label}>Email Verification OTP Code / ओटीपी कोड *</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Enter 4-digit OTP from email"
                  placeholderTextColor={colors.textMuted}
                  value={otpCode}
                  onChangeText={setOtpCode}
                  keyboardType="number-pad"
                  maxLength={6}
                />

                <Text style={styles.label}>Mobile Number / मोबाइल नंबर *</Text>
                <TextInput
                  style={styles.input}
                  placeholder="10-digit mobile number"
                  placeholderTextColor={colors.textMuted}
                  value={mobileNo}
                  onChangeText={setMobileNo}
                  keyboardType="phone-pad"
                  maxLength={12}
                />

                <Text style={styles.label}>Password / पासवर्ड *</Text>
                <View style={styles.passwordRow}>
                  <TextInput
                    style={[styles.input, { flex: 1, marginBottom: 0 }]}
                    placeholder="Min 6 characters"
                    placeholderTextColor={colors.textMuted}
                    value={password}
                    onChangeText={setPassword}
                    secureTextEntry={!showPassword}
                    autoCapitalize="none"
                  />
                  <TouchableOpacity
                    style={styles.eyeBtn}
                    onPress={() => setShowPassword((prev) => !prev)}
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

              {/* Section 2: Profile Status & Basics */}
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>2. Personal Details / व्यक्तिगत विवरण</Text>

                <Text style={styles.label}>Profile For / यह प्रोफाइल किसके लिए है? *</Text>
                <View style={styles.chipRow}>
                  {CREATED_BY_OPTIONS.map((opt) => (
                    <TouchableOpacity
                      key={opt.code}
                      style={[styles.optionChip, profileCreatedBy === opt.code && styles.optionChipActive]}
                      onPress={() => setProfileCreatedBy(opt.code)}
                    >
                      <Text style={[styles.optionChipText, profileCreatedBy === opt.code && styles.optionChipTextActive]}>
                        {opt.label}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>

                <Text style={styles.label}>Gender / लिंग *</Text>
                <View style={styles.chipRow}>
                  {GENDER_OPTIONS.map((opt) => (
                    <TouchableOpacity
                      key={opt.code}
                      style={[styles.optionChip, gender === opt.code && styles.optionChipActive]}
                      onPress={() => setGender(opt.code)}
                    >
                      <Text style={[styles.optionChipText, gender === opt.code && styles.optionChipTextActive]}>
                        {opt.label}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>

                <Text style={styles.label}>Marital Status / वैवाहिक स्थिति *</Text>
                <View style={styles.chipRow}>
                  {MARITAL_STATUS_OPTIONS.map((opt) => (
                    <TouchableOpacity
                      key={opt.code}
                      style={[styles.optionChip, maritalStatus === opt.code && styles.optionChipActive]}
                      onPress={() => setMaritalStatus(opt.code)}
                    >
                      <Text style={[styles.optionChipText, maritalStatus === opt.code && styles.optionChipTextActive]}>
                        {opt.label}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>

                <Text style={styles.label}>Date of Birth / जन्म तिथि *</Text>
                <View style={styles.dobRow}>
                  <TextInput
                    style={[styles.input, styles.dobInput]}
                    placeholder="DD"
                    placeholderTextColor={colors.textMuted}
                    value={dobDay}
                    onChangeText={setDobDay}
                    keyboardType="number-pad"
                    maxLength={2}
                  />
                  <TextInput
                    style={[styles.input, styles.dobInput]}
                    placeholder="MM"
                    placeholderTextColor={colors.textMuted}
                    value={dobMonth}
                    onChangeText={setDobMonth}
                    keyboardType="number-pad"
                    maxLength={2}
                  />
                  <TextInput
                    style={[styles.input, styles.dobYearInput]}
                    placeholder="YYYY"
                    placeholderTextColor={colors.textMuted}
                    value={dobYear}
                    onChangeText={setDobYear}
                    keyboardType="number-pad"
                    maxLength={4}
                  />
                </View>

                <Text style={styles.label}>Gotra / गोत्र</Text>
                <TextInput
                  style={styles.input}
                  placeholder="e.g. Kashyap"
                  placeholderTextColor={colors.textMuted}
                  value={gotra}
                  onChangeText={setGotra}
                />
              </View>

              {/* Section 3: Location & Career */}
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>3. Location &amp; Profession / स्थान और व्यवसाय</Text>

                <Text style={styles.label}>State / राज्य</Text>
                <TextInput
                  style={styles.input}
                  placeholder="e.g. Madhya Pradesh"
                  placeholderTextColor={colors.textMuted}
                  value={state}
                  onChangeText={setState}
                />

                <Text style={styles.label}>City / शहर</Text>
                <TextInput
                  style={styles.input}
                  placeholder="e.g. Bhopal"
                  placeholderTextColor={colors.textMuted}
                  value={city}
                  onChangeText={setCity}
                />

                <Text style={styles.label}>Education / शिक्षा</Text>
                <TextInput
                  style={styles.input}
                  placeholder="e.g. B.Tech, MBA"
                  placeholderTextColor={colors.textMuted}
                  value={education}
                  onChangeText={setEducation}
                />

                <Text style={styles.label}>Profession / पेशा</Text>
                <TextInput
                  style={styles.input}
                  placeholder="e.g. Software Engineer, Business"
                  placeholderTextColor={colors.textMuted}
                  value={profession}
                  onChangeText={setProfession}
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
            </View>
          )}

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
                  <Text style={styles.modalBtnPrimaryText}>Open This Account Now</Text>
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
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: colors.white,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    gap: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  tabBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: radius.md,
    backgroundColor: '#F1F5F9',
  },
  tabBtnActive: {
    backgroundColor: auth.crimson,
  },
  tabBtnText: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.text,
  },
  tabBtnTextActive: {
    color: colors.white,
    fontWeight: '700',
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
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
  },
  sectionTitle: {
    fontSize: font.body,
    fontWeight: '700',
    color: colors.text,
  },
  subtext: {
    fontSize: 13,
    color: colors.textMuted,
    marginBottom: spacing.md,
    marginTop: 2,
  },
  accountCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.md,
    backgroundColor: '#F8FAFC',
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginBottom: spacing.sm,
    gap: spacing.sm,
  },
  accountAvatar: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: '#FEE2E2',
    alignItems: 'center',
    justifyContent: 'center',
  },
  accountInfo: {
    flex: 1,
  },
  accountName: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.text,
  },
  accountEmail: {
    fontSize: 12,
    color: colors.textMuted,
    marginTop: 1,
  },
  accountIdText: {
    fontSize: 11,
    color: auth.crimson,
    fontWeight: '600',
    marginTop: 1,
  },
  openAccountBtn: {
    backgroundColor: auth.crimson,
    paddingVertical: 6,
    paddingHorizontal: 14,
    borderRadius: radius.full,
  },
  openAccountBtnText: {
    color: colors.white,
    fontSize: 12,
    fontWeight: '700',
  },
  removeAccountBtn: {
    padding: 6,
  },
  label: {
    fontSize: font.small,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 6,
    marginTop: spacing.sm,
  },
  input: {
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: Platform.OS === 'ios' ? 12 : 9,
    fontSize: font.body,
    color: colors.text,
    marginBottom: spacing.sm,
  },
  emailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.sm,
  },
  sendOtpBtn: {
    backgroundColor: auth.crimson,
    paddingVertical: Platform.OS === 'ios' ? 12 : 11,
    paddingHorizontal: 16,
    borderRadius: radius.md,
    justifyContent: 'center',
    alignItems: 'center',
    minWidth: 85,
  },
  sendOtpBtnDisabled: {
    backgroundColor: '#94A3B8',
  },
  sendOtpBtnText: {
    color: colors.white,
    fontSize: font.small,
    fontWeight: '700',
  },
  otpSuccessBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#ECFDF5',
    padding: spacing.sm,
    borderRadius: radius.sm,
    marginBottom: spacing.sm,
  },
  otpSuccessText: {
    color: '#065F46',
    fontSize: 12,
    fontWeight: '500',
  },
  passwordRow: {
    flexDirection: 'row',
    alignItems: 'center',
    position: 'relative',
    marginBottom: spacing.sm,
  },
  eyeBtn: {
    position: 'absolute',
    right: 12,
    padding: 4,
  },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
    marginBottom: spacing.sm,
  },
  optionChip: {
    paddingVertical: 7,
    paddingHorizontal: 12,
    borderRadius: radius.full,
    borderWidth: 1,
    borderColor: '#CBD5E1',
    backgroundColor: '#F8FAFC',
  },
  optionChipActive: {
    backgroundColor: auth.crimson,
    borderColor: auth.crimson,
  },
  optionChipText: {
    fontSize: font.small,
    color: colors.text,
    fontWeight: '500',
  },
  optionChipTextActive: {
    color: colors.white,
    fontWeight: '700',
  },
  dobRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginBottom: spacing.sm,
  },
  dobInput: {
    flex: 1,
    textAlign: 'center',
    marginBottom: 0,
  },
  dobYearInput: {
    flex: 1.5,
    textAlign: 'center',
    marginBottom: 0,
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
    backgroundColor: '#94A3B8',
    shadowOpacity: 0,
    elevation: 0,
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
    backgroundColor: colors.white,
    borderRadius: radius.xl,
    padding: spacing.xl,
    width: '100%',
    maxWidth: 360,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 10,
    elevation: 5,
  },
  successIconWrap: {
    marginBottom: spacing.md,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.text,
    marginBottom: spacing.xs,
  },
  modalSubtitle: {
    fontSize: font.small,
    color: colors.textMuted,
    textAlign: 'center',
    lineHeight: 18,
    marginBottom: spacing.lg,
  },
  modalDetails: {
    width: '100%',
    backgroundColor: '#F8FAFC',
    borderRadius: radius.md,
    padding: spacing.md,
    marginBottom: spacing.lg,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    gap: 6,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  detailLabel: {
    fontSize: 12,
    color: colors.textMuted,
    fontWeight: '500',
  },
  detailVal: {
    fontSize: 12,
    color: colors.text,
    fontWeight: '700',
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
    justifyContent: 'center',
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
    fontSize: font.small,
    fontWeight: '600',
  },
});

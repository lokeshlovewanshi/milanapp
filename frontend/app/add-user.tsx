import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
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
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useGuardedRouter } from '../utils/useGuardedRouter';
import axios from 'axios';
import api, { authAPI, otpAPI, profileAPI, API_URL } from '../utils/api';
import { persistSession } from '../utils/afterAuth';
import {
  getSavedAccounts,
  saveAccount,
  removeAccount,
  switchActiveAccount,
  type SavedAccount,
} from '../utils/multiAccount';
import { colors, font, radius, spacing, auth } from '../components/theme';
import SectionForm from '../components/SectionForm';
import FormScroll, { useKeyboardHeight } from '../components/FormScroll';
import {
  SECTIONS,
  buildPayload,
  missingRequiredKeys,
} from '../components/sectionSchema';
import ChipRow from '../components/ChipRow';
import FormField from '../components/FormField';

const PROFILE_CREATED_BY_OPTIONS = [
  { code: 'SELF', label: 'Self / स्वयं' },
  { code: 'PARENTS', label: 'Parents / माता-पिता' },
  { code: 'SIBLING', label: 'Sibling / भाई-बहन' },
  { code: 'RELATIVE', label: 'Relative / रिश्तेदार' },
  { code: 'FRIEND', label: 'Friend / मित्र' },
];

export default function AddUserScreen() {
  const router = useGuardedRouter();
  const insets = useSafeAreaInsets();
  const keyboard = useKeyboardHeight();

  // Mode: 'create' (Register new) or 'open' (Log in / Switch to existing)
  const [activeTab, setActiveTab] = useState<'create' | 'open'>('create');

  // Saved accounts on device
  const [savedAccounts, setSavedAccounts] = useState<SavedAccount[]>([]);

  // Login form state (Tab 1: Open Account)
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [loginLoading, setLoginLoading] = useState(false);

  // Registration credentials (Tab 2: Create New)
  const [accEmail, setAccEmail] = useState('');
  const [accPassword, setAccPassword] = useState('');
  const [accConfirmPassword, setAccConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [profileCreatedBy, setProfileCreatedBy] = useState('SELF');

  // OTP state
  const [otpCode, setOtpCode] = useState('');
  const [otpSent, setOtpSent] = useState(false);
  const [otpSending, setOtpSending] = useState(false);
  const [resendTimer, setResendTimer] = useState(0);

  // Profile sections form values
  const [formValues, setFormValues] = useState<Record<string, Record<string, any>>>({
    basic: { gender: 'MALE', maritalStatus: 'NEVER_MARRIED' },
    education: {},
    religion: {},
    contact: { country: 'India' },
    family: {},
    other: {},
    about: {},
  });

  const [submitting, setSubmitting] = useState(false);
  const [errors, setErrors] = useState<Set<string>>(new Set());

  // Success modal
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

  // Resend OTP countdown timer
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

  // Login existing account
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

  // Send OTP
  const handleSendOtp = async () => {
    const trimmedEmail = accEmail.trim();
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
        error.response?.data?.detail ||
        error.response?.data?.message ||
        error.message ||
        'Failed to send OTP code.';
      Alert.alert('Could Not Send OTP', msg);
    } finally {
      setOtpSending(false);
    }
  };

  // Field change handler for SectionForm
  const handleFieldChange = useCallback((sectionKey: string, key: string, value: any) => {
    setFormValues((prev) => ({
      ...prev,
      [sectionKey]: {
        ...(prev[sectionKey] ?? {}),
        [key]: value,
      },
    }));
    setErrors((prev) => {
      if (!prev.has(key)) return prev;
      const next = new Set(prev);
      next.delete(key);
      return next;
    });
  }, []);

  // Validate and Submit Entire Form
  const handleCreateAccount = async () => {
    const trimmedEmail = accEmail.trim();
    const trimmedPassword = accPassword.trim();
    const trimmedConfirm = accConfirmPassword.trim();
    const trimmedOtp = otpCode.trim();

    // Check credentials
    if (!trimmedEmail || !trimmedEmail.includes('@')) {
      Alert.alert('Email Required', 'Please enter a valid email address.');
      return;
    }
    if (!otpSent) {
      Alert.alert('Verification Required', 'Please tap "Send OTP" to verify your email address.');
      return;
    }
    if (!trimmedOtp || trimmedOtp.length < 4) {
      Alert.alert('OTP Required', 'Please enter the 4-digit code sent to your email.');
      return;
    }
    if (!trimmedPassword || trimmedPassword.length < 6) {
      Alert.alert('Password Required', 'Password must be at least 6 characters.');
      return;
    }
    if (trimmedPassword !== trimmedConfirm) {
      Alert.alert('Password Mismatch', 'Password and Confirm Password do not match.');
      return;
    }

    // Check required fields in Basic details
    const basicMissing = missingRequiredKeys(SECTIONS.basic, formValues.basic ?? {});
    if (basicMissing.length > 0) {
      setErrors(new Set(basicMissing));
      Alert.alert(
        'Required Fields',
        'Please fill in all required basic details (Full Name, Gender, Date of Birth, Marital Status, Mobile Number).'
      );
      return;
    }
    setErrors(new Set());

    setSubmitting(true);
    try {
      const basicValues = formValues.basic ?? {};
      const regPayload = {
        name: String(basicValues.name || '').trim(),
        email: trimmedEmail,
        mobileNo: String(basicValues.mobileNo || '').trim(),
        password: trimmedPassword,
        code: trimmedOtp,
        profileCreatedBy,
        gender: basicValues.gender || 'MALE',
        maritalStatus: basicValues.maritalStatus || 'NEVER_MARRIED',
        dateOfBirth: basicValues.dateOfBirth,
        height: basicValues.height,
        state: formValues.contact?.state,
        city: formValues.contact?.city,
        gotra: formValues.religion?.gotra,
        profession: formValues.education?.profession,
        education: formValues.education?.education,
      };

      const regRes = await authAPI.registerAfterOtp(regPayload);
      const resData = regRes.data;
      const token = resData?.token;

      if (!token) {
        throw new Error('No authentication token received.');
      }

      // Dedicated client with new user's Bearer token to prevent any token leaking
      const dedicatedClient = axios.create({
        baseURL: API_URL,
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        timeout: 20000,
      });

      // Patch all sections to guarantee complete profile synchronization and score calculation in backend
      try {
        const basicPayload = buildPayload(SECTIONS.basic, basicValues);
        if (Object.keys(basicPayload).length > 0) {
          await dedicatedClient.patch('/user/profile/basic', basicPayload);
        }
      } catch (e) {
        console.log('Basic patch error:', e);
      }

      if (formValues.education && Object.keys(formValues.education).length > 0) {
        try {
          const eduPayload = buildPayload(SECTIONS.education, formValues.education);
          if (Object.keys(eduPayload).length > 0) {
            await dedicatedClient.patch('/user/profile/education', eduPayload);
          }
        } catch (e) {
          console.log('Education patch error:', e);
        }
      }

      if (formValues.religion && Object.keys(formValues.religion).length > 0) {
        try {
          const relPayload = buildPayload(SECTIONS.religion, formValues.religion);
          if (Object.keys(relPayload).length > 0) {
            await dedicatedClient.patch('/user/profile/religion', relPayload);
          }
        } catch (e) {
          console.log('Religion patch error:', e);
        }
      }

      if (formValues.contact && Object.keys(formValues.contact).length > 0) {
        try {
          const conPayload = buildPayload(SECTIONS.contact, formValues.contact);
          if (Object.keys(conPayload).length > 0) {
            await dedicatedClient.patch('/user/profile/contact', conPayload);
          }
        } catch (e) {
          console.log('Contact patch error:', e);
        }
      }

      if (formValues.family && Object.keys(formValues.family).length > 0) {
        try {
          const famPayload = buildPayload(SECTIONS.family, formValues.family);
          if (Object.keys(famPayload).length > 0) {
            await dedicatedClient.patch('/user/profile/family', famPayload);
          }
        } catch (e) {
          console.log('Family patch error:', e);
        }
      }

      if (formValues.other && Object.keys(formValues.other).length > 0) {
        try {
          const otherPayload = buildPayload(SECTIONS.other, formValues.other);
          if (Object.keys(otherPayload).length > 0) {
            await dedicatedClient.patch('/user/profile/basic', otherPayload);
          }
        } catch (e) {
          console.log('Other patch error:', e);
        }
      }

      if (formValues.about && (formValues.about.aboutMyself || formValues.about.partnerPreferences)) {
        try {
          const aboutPayload = buildPayload(SECTIONS.about, formValues.about);
          if (Object.keys(aboutPayload).length > 0) {
            await dedicatedClient.patch('/user/profile/family', aboutPayload);
          }
        } catch (e) {
          console.log('About patch error:', e);
        }
      }

      // Pre-save to saved accounts on this device
      await saveAccount({
        id: resData?.userId ?? resData?.id ?? Date.now(),
        email: trimmedEmail,
        name: basicValues.name || 'Member',
        token,
        gender: basicValues.gender,
        maritalStatus: basicValues.maritalStatus,
      });

      // Show success modal
      setSuccessData({
        ...resData,
        createdName: basicValues.name || 'Member',
        createdEmail: trimmedEmail,
        createdGender: basicValues.gender,
        createdMaritalStatus: basicValues.maritalStatus,
        token,
      });
    } catch (error: any) {
      console.error('Failed to create account:', error);
      const msg =
        error.response?.data?.detail ||
        error.response?.data?.message ||
        error.message ||
        'Failed to verify and create account. Please check your OTP and credentials.';
      Alert.alert('Creation Failed', msg);
    } finally {
      setSubmitting(false);
    }
  };

  // Open the newly created account immediately
  const handleSwitchAccount = async () => {
    if (successData?.token) {
      await persistSession(successData);
      await AsyncStorage.setItem('user_email', successData?.createdEmail ?? accEmail.trim());
      await AsyncStorage.removeItem('cached_feed_profiles');
      await AsyncStorage.removeItem('cached_suggested_profiles');
      router.replace('/(tabs)/home');
    }
  };

  // Stay in current account
  const handleStayCurrent = () => {
    setSuccessData(null);
    refreshSavedAccounts();
    setActiveTab('open');
  };

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={Platform.OS === 'ios' ? insets.top : 0}
    >
      <View style={[styles.container, { paddingTop: insets.top }]}>
        {/* Header Bar */}
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backBtn}
            onPress={() => router.back()}
            hitSlop={10}
            accessibilityRole="button"
          >
            <Ionicons name="arrow-back" size={24} color={colors.heading} />
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

        {activeTab === 'open' ? (
          /* =========================================================================
             TAB 1: OPEN EXISTING ACCOUNT / LOG IN
             ========================================================================= */
          <FormScroll
            style={{ flex: 1 }}
            contentContainerStyle={[styles.scrollContent, { paddingBottom: 120 }]}
            showsVerticalScrollIndicator={false}
          >
            {/* Saved Accounts on this Device */}
            {savedAccounts.length > 0 && (
              <View style={styles.sectionCard}>
                <View style={styles.sectionHeaderRow}>
                  <Ionicons name="people" size={20} color={auth.crimson} />
                  <Text style={styles.sectionTitle}>Accounts on this device / उपलब्ध अकाउंट</Text>
                </View>
                <Text style={styles.sectionSubtitle}>
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
                      <View style={styles.accountMetaRow}>
                        {!!acc.memberId && (
                          <Text style={styles.accountIdText}>ID: {acc.memberId}</Text>
                        )}
                        {!!acc.maritalStatus && (
                          <Text style={styles.accountStatusText}>
                            {acc.maritalStatus.replace('_', ' ')}
                          </Text>
                        )}
                      </View>
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

            {/* Login to Another Account */}
            <View style={styles.sectionCard}>
              <View style={styles.sectionHeaderRow}>
                <Ionicons name="key" size={20} color={auth.crimson} />
                <Text style={styles.sectionTitle}>
                  {savedAccounts.length > 0
                    ? 'Log In to Another Account / अन्य अकाउंट खोलें'
                    : 'Log In to Open Account / अकाउंट खोलें'}
                </Text>
              </View>
              <Text style={styles.sectionSubtitle}>
                Enter the email and password of the account you want to open:
              </Text>

              <FormField
                label="Email"
                icon="mail-outline"
                placeholder="Enter your email address"
                value={loginEmail}
                onChangeText={setLoginEmail}
                keyboardType="email-address"
                autoCapitalize="none"
              />

              <FormField
                label="Password"
                icon="lock-closed-outline"
                placeholder="Enter password"
                value={loginPassword}
                onChangeText={setLoginPassword}
                secure
              />

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
          </FormScroll>
        ) : (
          /* =========================================================================
             TAB 2: CREATE NEW ACCOUNT (ALL FIELDS ONE BY ONE, NO STEP BOXES)
             ========================================================================= */
          <FormScroll
            style={{ flex: 1 }}
            contentContainerStyle={[
              styles.scrollContent,
              { paddingBottom: Math.max(keyboard + 40, 140) },
            ]}
            showsVerticalScrollIndicator={false}
          >
            {/* 1. Account Credentials & Verification */}
            <View style={styles.sectionCard}>
              <View style={styles.sectionHeaderRow}>
                <Ionicons name="shield-checkmark" size={20} color={auth.crimson} />
                <Text style={styles.sectionTitle}>Account &amp; Security / अकाउंट और पासवर्ड</Text>
              </View>
              <Text style={styles.sectionSubtitle}>
                Enter email, set your password, and verify with OTP
              </Text>

              {/* Email with Send OTP button */}
              <Text style={styles.fieldLabel}>Email Address / ईमेल *</Text>
              <View style={styles.emailRow}>
                <TextInput
                  style={[styles.textInput, { flex: 1 }]}
                  placeholder="name@example.com"
                  placeholderTextColor={colors.textMuted}
                  value={accEmail}
                  onChangeText={(val) => {
                    setAccEmail(val);
                    setOtpSent(false);
                  }}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoCorrect={false}
                />
                <TouchableOpacity
                  style={[
                    styles.sendOtpBtn,
                    (otpSending || resendTimer > 0) && styles.sendOtpBtnDisabled,
                  ]}
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
                    OTP sent! Check your inbox or spam folder.
                  </Text>
                </View>
              )}

              {/* OTP Code */}
              <Text style={styles.fieldLabel}>Email Verification OTP Code / ओटीपी कोड *</Text>
              <TextInput
                style={styles.textInput}
                placeholder="Enter 4-digit OTP from email"
                placeholderTextColor={colors.textMuted}
                value={otpCode}
                onChangeText={setOtpCode}
                keyboardType="number-pad"
                maxLength={6}
              />

              {/* Password */}
              <Text style={styles.fieldLabel}>Password / पासवर्ड *</Text>
              <View style={styles.passwordRow}>
                <TextInput
                  style={[styles.textInput, { flex: 1, marginBottom: 0 }]}
                  placeholder="Min 6 characters"
                  placeholderTextColor={colors.textMuted}
                  value={accPassword}
                  onChangeText={setAccPassword}
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

              {/* Confirm Password */}
              <Text style={styles.fieldLabel}>Confirm Password / पासवर्ड पुष्टि *</Text>
              <View style={styles.passwordRow}>
                <TextInput
                  style={[styles.textInput, { flex: 1, marginBottom: 0 }]}
                  placeholder="Re-enter password"
                  placeholderTextColor={colors.textMuted}
                  value={accConfirmPassword}
                  onChangeText={setAccConfirmPassword}
                  secureTextEntry={!showConfirmPassword}
                  autoCapitalize="none"
                />
                <TouchableOpacity
                  style={styles.eyeBtn}
                  onPress={() => setShowConfirmPassword((prev) => !prev)}
                  hitSlop={8}
                >
                  <Ionicons
                    name={showConfirmPassword ? 'eye-off-outline' : 'eye-outline'}
                    size={20}
                    color={colors.textMuted}
                  />
                </TouchableOpacity>
              </View>

              {/* Profile Created By */}
              <Text style={styles.fieldLabel}>Profile For / यह प्रोफाइल किसके लिए है? *</Text>
              <ChipRow
                chips={PROFILE_CREATED_BY_OPTIONS}
                selected={[profileCreatedBy]}
                onPress={(code) => setProfileCreatedBy(code)}
              />
            </View>

            {/* 2. Basic Details (Full Name, Gender, Date of Birth, Height, Marital Status, Mobile Number) */}
            <View style={styles.sectionCard}>
              <View style={styles.sectionHeaderRow}>
                <Ionicons name="person" size={20} color={auth.crimson} />
                <Text style={styles.sectionTitle}>{SECTIONS.basic.title}</Text>
              </View>
              <Text style={styles.sectionSubtitle}>{SECTIONS.basic.subtitle}</Text>

              <SectionForm
                spec={SECTIONS.basic}
                values={formValues.basic ?? {}}
                onChange={(k, v) => handleFieldChange('basic', k, v)}
                errors={errors}
              />
            </View>

            {/* 3. Education & Profession */}
            <View style={styles.sectionCard}>
              <View style={styles.sectionHeaderRow}>
                <Ionicons name="school" size={20} color={auth.crimson} />
                <Text style={styles.sectionTitle}>{SECTIONS.education.title}</Text>
              </View>
              <Text style={styles.sectionSubtitle}>{SECTIONS.education.subtitle}</Text>

              <SectionForm
                spec={SECTIONS.education}
                values={formValues.education ?? {}}
                onChange={(k, v) => handleFieldChange('education', k, v)}
                errors={errors}
              />
            </View>

            {/* 4. Religion & Astro */}
            <View style={styles.sectionCard}>
              <View style={styles.sectionHeaderRow}>
                <Ionicons name="planet" size={20} color={auth.crimson} />
                <Text style={styles.sectionTitle}>{SECTIONS.religion.title}</Text>
              </View>
              <Text style={styles.sectionSubtitle}>{SECTIONS.religion.subtitle}</Text>

              <SectionForm
                spec={SECTIONS.religion}
                values={formValues.religion ?? {}}
                onChange={(k, v) => handleFieldChange('religion', k, v)}
                errors={errors}
              />
            </View>

            {/* 5. Contact & Location */}
            <View style={styles.sectionCard}>
              <View style={styles.sectionHeaderRow}>
                <Ionicons name="location" size={20} color={auth.crimson} />
                <Text style={styles.sectionTitle}>{SECTIONS.contact.title}</Text>
              </View>
              <Text style={styles.sectionSubtitle}>{SECTIONS.contact.subtitle}</Text>

              <SectionForm
                spec={SECTIONS.contact}
                values={formValues.contact ?? {}}
                onChange={(k, v) => handleFieldChange('contact', k, v)}
                errors={errors}
              />
            </View>

            {/* 6. Family Details */}
            <View style={styles.sectionCard}>
              <View style={styles.sectionHeaderRow}>
                <Ionicons name="people-circle" size={20} color={auth.crimson} />
                <Text style={styles.sectionTitle}>{SECTIONS.family.title}</Text>
              </View>
              <Text style={styles.sectionSubtitle}>{SECTIONS.family.subtitle}</Text>

              <SectionForm
                spec={SECTIONS.family}
                values={formValues.family ?? {}}
                onChange={(k, v) => handleFieldChange('family', k, v)}
                errors={errors}
              />
            </View>

            {/* 7. Other Details & About Me */}
            <View style={styles.sectionCard}>
              <View style={styles.sectionHeaderRow}>
                <Ionicons name="document-text" size={20} color={auth.crimson} />
                <Text style={styles.sectionTitle}>About Me &amp; Lifestyle / अपने बारे में</Text>
              </View>
              <Text style={styles.sectionSubtitle}>Share about yourself, physical details, and partner preferences</Text>

              <SectionForm
                spec={SECTIONS.other}
                values={formValues.other ?? {}}
                onChange={(k, v) => handleFieldChange('other', k, v)}
                errors={errors}
              />

              <View style={{ marginTop: spacing.lg }}>
                <SectionForm
                  spec={SECTIONS.about}
                  values={formValues.about ?? {}}
                  onChange={(k, v) => handleFieldChange('about', k, v)}
                  errors={errors}
                />
              </View>
            </View>

            {/* Submit Button */}
            <TouchableOpacity
              style={[styles.submitBtn, submitting && styles.submitBtnDisabled]}
              onPress={handleCreateAccount}
              disabled={submitting}
              activeOpacity={0.85}
            >
              {submitting ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <>
                  <Ionicons name="person-add" size={20} color="#fff" style={{ marginRight: 8 }} />
                  <Text style={styles.submitBtnText}>Verify &amp; Create Account</Text>
                </>
              )}
            </TouchableOpacity>
          </FormScroll>
        )}

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
    backgroundColor: colors.bg,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
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
    color: colors.heading,
  },
  headerSubtitle: {
    fontSize: font.small,
    color: colors.textMuted,
    marginTop: 2,
  },
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: colors.surface,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    gap: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
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
  scrollContent: {
    padding: spacing.lg,
  },
  sectionCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.lg,
    marginBottom: spacing.lg,
    borderWidth: 1,
    borderColor: colors.border,
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
    color: colors.heading,
  },
  sectionSubtitle: {
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
  accountMetaRow: {
    flexDirection: 'row',
    gap: 8,
    alignItems: 'center',
    marginTop: 2,
  },
  accountIdText: {
    fontSize: 11,
    color: auth.crimson,
    fontWeight: '600',
  },
  accountStatusText: {
    fontSize: 10,
    color: '#64748B',
    backgroundColor: '#E2E8F0',
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 4,
    textTransform: 'capitalize',
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
  fieldLabel: {
    fontSize: font.small,
    fontWeight: '600',
    color: colors.fieldLabel,
    marginBottom: 6,
    marginTop: spacing.sm,
  },
  textInput: {
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
  submitBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: auth.crimson,
    paddingVertical: 14,
    borderRadius: radius.md,
    marginTop: spacing.md,
    marginBottom: spacing.xl,
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
  /* Modal */
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.lg,
  },
  modalCard: {
    backgroundColor: colors.surface,
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
    color: colors.heading,
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

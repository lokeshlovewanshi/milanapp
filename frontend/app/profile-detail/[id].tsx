import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  Linking,
  Share,
} from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { useState, useEffect, useCallback } from 'react';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { profileAPI, shortlistAPI, viewsAPI } from '../../utils/api';
import { useGuardedRouter } from '../../utils/useGuardedRouter';
import { useReference } from '../../utils/useReference';
import { useConnections, connectionAction } from '../../utils/useConnections';
import { shareProfile } from '../../utils/shareProfile';
import PhotoCarousel from '../../components/PhotoCarousel';
import DetailCard from '../../components/DetailCard';
import { LinearGradient } from 'expo-linear-gradient';
import KundaliMatchCard from '../../components/KundaliMatchCard';
import { rowsFor } from '../../components/sectionRows';
import Loader from '../../components/Loader';
import {
  colors,
  font,
  radius,
  spacing,
  profileName,
  profileCode,
  profileAge,
  profileIsOnline,
  auth,
} from '../../components/theme';





/**
 * Someone else's profile.
 *
 * Uses the same PhotoCarousel and DetailCard components as your own profile, so
 * the two screens read identically - only the pencil is absent and a connect
 * footer is added.
 *
 * Contact details - and so the WhatsApp button - are gated by the API, not
 * here: they reach this screen only for a verified member with an active
 * membership, or for someone already connected. This screen simply renders
 * what it was given, so the rule lives in one place and cannot drift.
 */
export default function ProfileDetailScreen() {
  const router = useGuardedRouter();
  const insets = useSafeAreaInsets();
  const { id } = useLocalSearchParams<{ id: string }>();

  // Profiles store codes ("H_66", "VEG"); every row must render the label.
  const { label } = useReference();
  const { stateOf, connect, withdraw, accept } = useConnections();

  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [shortlisted, setShortlisted] = useState(false);
  const [isViewerVerified, setIsViewerVerified] = useState<boolean | null>(null);

  const load = useCallback(async () => {
    if (!id) return;
    try {
      const [res, meRes] = await Promise.all([
        id === 'me' ? profileAPI.getMe() : profileAPI.getProfile(id),
        profileAPI.getMe().catch(() => null),
      ]);
      setProfile(res.data);
      const verified = meRes?.data?.verified === true;
      setIsViewerVerified(verified);
      setErrorMessage(null);

      if (id !== 'me' && verified) {
        // Only log views and notify if the viewer is verified
        viewsAPI.addView({ profileId: id }).catch(() => {});
      }
    } catch (error: any) {
      console.log('Failed to load profile:', error?.message);
      const msg =
        error?.response?.data?.detail ||
        error?.response?.data?.message ||
        'This profile is not available or is under verification.';
      setErrorMessage(msg);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    load();
  }, [load]);

  const toggleShortlist = async () => {
    if (!id) return;
    if (isViewerVerified === false) {
      Alert.alert(
        'Profile Under Review',
        'Your profile is under review. Please wait for admin approval before adding profiles to your shortlist.'
      );
      return;
    }
    const was = shortlisted;
    setShortlisted(!was);
    try {
      if (was) await shortlistAPI.remove(id);
      else await shortlistAPI.add(id);
    } catch (error: any) {
      setShortlisted(was);
      const message =
        error?.response?.data?.message ||
        error?.response?.data?.detail ||
        error?.message ||
        'Failed to update shortlist';
      const underReview = /under verification|under review|admin approval/i.test(String(message));
      Alert.alert(underReview ? 'Profile Under Review' : 'Error', underReview
        ? 'Your profile is under review. Please wait for admin approval before adding profiles to your shortlist.'
        : message);
    }
  };

  const handleShare = async () => {
    if (!profile) return;
    await shareProfile(profile);
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <Loader size={38} />
      </View>
    );
  }

  if (!profile) {
    return (
      <View style={[styles.center, { paddingHorizontal: 32, gap: 16 }]}>
        <Ionicons name="time-outline" size={54} color="#D97706" />
        <Text style={{ fontSize: 17, fontWeight: '700', color: colors.text, textAlign: 'center' }}>
          {errorMessage || 'Profile Unavailable'}
        </Text>
        <TouchableOpacity
          style={{ paddingVertical: 10, paddingHorizontal: 20, backgroundColor: colors.accent, borderRadius: 8 }}
          onPress={() => router.back()}
        >
          <Text style={{ color: '#FFF', fontWeight: '600' }}>Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const photos: string[] = profile.profileImages?.length
    ? profile.profileImages
    : profile.profileImage
      ? [profile.profileImage]
      : [];

  const isMine = id === 'me';
  const state = stateOf(id);
  const action = connectionAction(state);
  const connected = state === 'CONNECTED';
  // The API sets this only for the profile owner or an accepted connection.
  const contactDetailsVisible = isMine || Boolean(profile.contactDetailsVisible);
  const age = profileAge(profile);

  const onAction = () => {
    if (!id) return;
    if (isViewerVerified === false && state !== 'SENT' && state !== 'RECEIVED') {
      Alert.alert(
        'Profile Under Review',
        'Your profile is under review. Please wait for admin approval before sending connection requests.'
      );
      return;
    }
    if (state === 'SENT') withdraw(id);
    else if (state === 'RECEIVED') accept(id);
    else if (state !== 'CONNECTED') connect(id);
  };

  /**
   * The member's WhatsApp number, digits only, or '' when there is none.
   *
   * Redacted by the API for anyone not entitled to it - a viewer who is
   * connected - so the button
   * below simply does not render, with no permission rule duplicated here to
   * fall out of step with the server.
   */
  const whatsapp = String((profile as any)?.whatsappNo ?? '').replace(/\D/g, '');

  const openWhatsApp = async () => {
    // wa.me wants the country code. Ten digits means a local number that was
    // stored without one; anything longer already carries it.
    const number = whatsapp.length === 10 ? `91${whatsapp}` : whatsapp;
    const url = `whatsapp://send?phone=${number}`;

    // The app first, the web fallback second: on a phone with WhatsApp
    // installed the deep link opens the conversation directly, while wa.me
    // bounces through the browser to get there.
    try {
      if (await Linking.canOpenURL(url)) {
        await Linking.openURL(url);
        return;
      }
    } catch {
      // Fall through - canOpenURL throws on some Android configurations
      // rather than answering false.
    }

    try {
      await Linking.openURL(`https://wa.me/${number}`);
    } catch {
      Alert.alert('WhatsApp', `Could not open WhatsApp. The number is +${number}.`);
    }
  };

  return (
    <View style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false}>
        <View>
          <PhotoCarousel
            photos={photos}
            name={profileName(profile)}
            age={age}
            code={profileCode(profile)}
            gender={(profile as any)?.gender}
            online={profileIsOnline(profile)}
          />

          <TouchableOpacity
            style={[styles.back, { top: insets.top + spacing.sm }]}
            onPress={() => router.back()}
            accessibilityLabel="Back"
          >
            <Ionicons name="arrow-back" size={22} color={colors.white} />
          </TouchableOpacity>

          {/* Top Actions (Share & Bookmark) */}
          {!isMine && (
            <View style={[styles.topActions, { top: insets.top + spacing.sm }]}>
              <TouchableOpacity
                style={styles.circleBtn}
                onPress={handleShare}
                accessibilityLabel="Share profile"
              >
                <Ionicons name="paper-plane-outline" size={19} color={colors.white} />
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.circleBtn}
                onPress={toggleShortlist}
                accessibilityLabel={shortlisted ? 'Remove from shortlist' : 'Save to shortlist'}
              >
                <Ionicons
                  name={shortlisted ? 'bookmark' : 'bookmark-outline'}
                  size={19}
                  color={shortlisted ? colors.danger : colors.white}
                />
              </TouchableOpacity>
            </View>
          )}

        </View>

        <View style={styles.body}>
          {/* First, above the detail cards. Matching horoscopes is the question
              families open a profile to answer, and at the bottom it sat behind
              six cards of scrolling - far enough down that it was easy to never
              find. It stays a button rather than running on load because it
              costs a Lambda round trip that can cold-start. Not shown on your
              own profile: matching yourself is meaningless, and the backend
              refuses it anyway. */}
          {!isMine && !!id && <KundaliMatchCard profileId={id} name={profileName(profile)} />}

          <DetailCard
            title="Basic Details"
            subtitle="Brief outline of personal information"
rows={rowsFor('basic', profile, label)}
          />

          <DetailCard
            title="About Me"
            subtitle="In their own words"
            body={profile.aboutMyself}
          />

          <DetailCard
            title="Education & Career"
            subtitle="What they studied and what they do"
rows={rowsFor('education', profile, label)}
          />

          <DetailCard
            title="Religion & Astro"
            subtitle="Details families often look for"
rows={rowsFor('religion', profile, label)}
          />

          <DetailCard
            title="Family"
            subtitle="Their family background"
            rows={rowsFor('family', profile, label)}
          />

          {/* Contact details require an active membership plan — the backend
              redacts them if the viewer has no plan, so we check if any contact
              field is actually present in the response. */}
          {contactDetailsVisible ? (
            <DetailCard
              title="Contact Details"
              subtitle={
                isMine
                  ? "Your contact details"
                  : "Shared after your connection was accepted"
              }
              rows={rowsFor('contact', profile, label)}
            />
          ) : (
            <View style={styles.locked}>
              <Ionicons name="lock-closed-outline" size={22} color={colors.fieldLabel} />
              <View style={styles.lockedContent}>
                <Text style={styles.lockedTitle}>Contact Details</Text>
                <Text style={styles.blurredContact}>••••• •••••   •••••••••••••••</Text>
                <Text style={styles.lockedText}>
                  Phone number and address are shared after this profile accepts your connection request.
                </Text>
              </View>
            </View>
          )}

          <View style={{ height: 100 }} />
        </View>
      </ScrollView>

      {!isMine && (
        <View style={[styles.footer, { paddingBottom: insets.bottom + spacing.md }]}>

          {/* Opens WhatsApp on this member's number.

              Only rendered when the number is actually present, and the
              backend only sends it to profiles that have connected - so this
              appears exactly when the contact details were meant to be
              shared, with no separate permission check to keep in step. */}
          {!!whatsapp && (
            <TouchableOpacity
              style={styles.whatsapp}
              activeOpacity={0.85}
              onPress={openWhatsApp}
              accessibilityLabel={`Message ${profileName(profile)} on WhatsApp`}
            >
              <Ionicons name="logo-whatsapp" size={26} color={colors.white} />
            </TouchableOpacity>
          )}

          {/* The same gradient the Login button uses, not a flat fill of its
              start colour - crimson to crimsonDeep, left to right. A solid
              crimson is close enough to pass in a diff and visibly different
              beside the real thing. The muted state stays flat: a withdrawn or
              already-sent request is not a primary action. */}
          <TouchableOpacity
            style={styles.actionWrap}
            activeOpacity={0.88}
            onPress={onAction}
            disabled={action.disabled}
          >
            {action.variant === 'muted' ? (
              <View style={[styles.actionBtn, styles.actionMuted]}>
                <Text style={[styles.actionText, styles.actionTextMuted]}>{action.label}</Text>
              </View>
            ) : (
              <LinearGradient
                colors={[auth.crimson, auth.crimsonDeep]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.actionBtn}
              >
                <Text style={styles.actionText}>{action.label}</Text>
              </LinearGradient>
            )}
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.surface },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.bg },

  back: {
    position: 'absolute',
    left: spacing.lg,
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: 'rgba(0,0,0,0.45)',
    alignItems: 'center',
    justifyContent: 'center',
  },

  body: { padding: spacing.md, marginTop: -spacing.sm },

  locked: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    backgroundColor: colors.bg,
    borderRadius: 14,
    padding: spacing.lg,
  },
  lockedContent: { flex: 1, gap: 4 },
  lockedTitle: { fontSize: font.body, fontWeight: '700', color: colors.textMuted },
  blurredContact: { fontSize: 15, letterSpacing: 2, color: colors.textFaint, opacity: 0.55 },
  lockedText: { fontSize: font.body, color: colors.textMuted, lineHeight: 19 },

  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    backgroundColor: colors.bg,
    borderTopWidth: 1,
    borderTopColor: colors.hairline,
  },
  /**
   * Square, so it reads as a secondary action beside the full-width Connect
   * button rather than competing with it. WhatsApp's own green, because a
   * recoloured WhatsApp mark is not recognisable at 26px.
   */
  whatsapp: {
    width: 54,
    height: 54,
    borderRadius: radius.sm,
    backgroundColor: '#25D366',
    alignItems: 'center',
    justifyContent: 'center',
  },
  topActions: {
    position: 'absolute',
    right: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  circleBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0,0,0,0.45)',
  },
  save: {
    position: 'absolute',
    right: spacing.md,
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0,0,0,0.35)',
  },
  // The wrapper carries the flex; the fill inside carries the shape, because a
  // LinearGradient cannot be given flex and a height and still centre reliably.
  actionWrap: { flex: 1 },
  actionBtn: {
    height: 52,
    borderRadius: radius.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionMuted: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  actionText: { color: colors.white, fontSize: 17, fontWeight: 'bold' },
  actionTextMuted: { color: colors.text },
});

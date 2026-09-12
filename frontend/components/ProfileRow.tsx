import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Image } from 'expo-image';
import Ionicons from '@expo/vector-icons/Ionicons';
import AvatarFallback from './AvatarFallback';
import { useReference } from '../utils/useReference';
import { formatHeight, cleanValue } from '../utils/shareProfile';
import {
  auth,
  colors,
  font,
  radius,
  spacing,
  profileName,
  profileImage,
  profileAge,
  profileLocation,
  profileIsOnline,
  type Profile,
} from './theme';

export type RowAction = {
  label: string;
  /** filled = crimson, connected = light green chip, muted = grey chip, outline = bordered */
  variant?: 'filled' | 'connected' | 'muted' | 'outline';
  onPress?: () => void;
  disabled?: boolean;
};

type Props = {
  profile: Profile;
  action?: RowAction;
  /** Trailing X. Omit to hide it. */
  onDismiss?: () => void;
  dismissLabel?: string;
  /**
   * Full descriptive timestamp string, e.g. "Sent 2 weeks ago", "Received 3 days ago".
   * Displayed at top-right of the card.
   */
  meta?: string;
  /** Green dot on the avatar. */
  online?: boolean;
  ringed?: boolean;
  onPress?: () => void;
};

const AVATAR = 52;

/**
 * Enhanced list card for Matches (Interests), Shortlisted, and All Profiles.
 * Matches design mockup with clear text hierarchy, location pin icon,
 * full timestamp text, and status chips.
 */
export default function ProfileRow({
  profile,
  action,
  onDismiss,
  dismissLabel = 'Remove',
  meta,
  online,
  ringed = true,
  onPress,
}: Props) {
  const { label } = useReference();

  const uri = profileImage(profile);
  const age = profileAge(profile);
  const heightRaw = label('height', (profile as any)?.height) || (profile as any)?.height;
  const height = formatHeight(heightRaw);

  const gotra = cleanValue((profile as any)?.gotra || (profile as any)?.gothram);
  const profession = cleanValue(
    label('profession', (profile as any)?.profession) ||
    (profile as any)?.profession ||
    (profile as any)?.occupation ||
    label('employed_in', (profile as any)?.employedIn)
  );

  // First detail line: Age • Height • Gotra (or Profession)
  const detailParts = [
    age ? `${age} yrs` : '',
    height,
    gotra || profession,
  ].filter(Boolean);
  const primaryDetail = detailParts.join(' • ');

  const location = cleanValue(
    [(profile as any)?.city || (profile as any)?.workCity, (profile as any)?.state]
      .filter(Boolean)
      .join(', ') || profileLocation(profile)
  );

  const avatar = uri ? (
    <Image source={{ uri }} style={styles.avatar} contentFit="cover" contentPosition="top" />
  ) : (
    <View style={[styles.avatar, styles.avatarFallback]}>
      <AvatarFallback profile={profile} glyphSize={22} />
    </View>
  );

  const isUserOnline = online !== undefined ? online : profileIsOnline(profile);
  const isConnectedAction =
    action?.variant === 'connected' ||
    (action?.label && action.label.toLowerCase() === 'connected');

  return (
    <TouchableOpacity style={styles.card} activeOpacity={0.88} onPress={onPress}>
      {/* Avatar with Ring and Online dot */}
      <View style={styles.avatarWrapper}>
        <View style={ringed ? styles.ring : styles.plain}>{avatar}</View>
        {isUserOnline && <View style={styles.onlineDot} />}
      </View>

      {/* Profile Details */}
      <View style={styles.content}>
        {/* Full Name */}
        <Text style={styles.name} numberOfLines={1}>
          {profileName(profile)}
        </Text>

        {/* Age • Height • Gotra / Profession */}
        {!!primaryDetail && (
          <Text style={styles.primaryDetail} numberOfLines={1}>
            {primaryDetail}
          </Text>
        )}

        {/* Location with Red Map Pin */}
        {!!location && (
          <View style={styles.locationRow}>
            <Ionicons name="location-sharp" size={13} color="#E53935" style={styles.locationIcon} />
            <Text style={styles.locationText} numberOfLines={1}>
              {location}
            </Text>
          </View>
        )}
      </View>

      {/* Right Column: Meta timestamp at top, Actions at bottom */}
      {(!!meta || !!action || !!onDismiss) && (
        <View style={[styles.rightCol, !meta && styles.rightColCentered]}>
          {!!meta && (
            <Text style={styles.metaTime} numberOfLines={1}>
              {meta}
            </Text>
          )}

          {(!!action || !!onDismiss) && (
            <View style={styles.actionsWrapper}>
              {!!action && (
                <TouchableOpacity
                  activeOpacity={0.85}
                  onPress={action.onPress}
                  disabled={action.disabled}
                  style={[
                    styles.chip,
                    isConnectedAction && styles.chipConnected,
                    action.variant === 'filled' && !isConnectedAction && styles.chipFilled,
                    action.variant === 'outline' && !isConnectedAction && styles.chipOutline,
                    action.variant === 'muted' && !isConnectedAction && styles.chipMuted,
                    action.disabled && !isConnectedAction && styles.chipDisabled,
                  ]}
                >
                  <Text
                    style={[
                      styles.chipText,
                      isConnectedAction && styles.chipConnectedText,
                      action.variant === 'filled' && !isConnectedAction && styles.chipFilledText,
                      action.variant === 'outline' && !isConnectedAction && styles.chipOutlineText,
                      action.variant === 'muted' && !isConnectedAction && styles.chipMutedText,
                    ]}
                  >
                    {action.label}
                  </Text>
                </TouchableOpacity>
              )}

              {!!onDismiss && (
                <TouchableOpacity
                  hitSlop={8}
                  onPress={onDismiss}
                  accessibilityLabel={dismissLabel}
                  style={styles.dismissBtn}
                >
                  <Ionicons name="close" size={15} color="#C62828" />
                </TouchableOpacity>
              )}
            </View>
          )}
        </View>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.white,
    marginHorizontal: 16,
    marginBottom: 10,
    paddingHorizontal: 14,
    paddingVertical: 14,
    minHeight: 92,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#F1EBE6',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1.5 },
    shadowOpacity: 0.04,
    shadowRadius: 5,
    elevation: 2,
    gap: 12,
  },

  avatarWrapper: {
    position: 'relative',
  },
  ring: {
    width: AVATAR + 4,
    height: AVATAR + 4,
    borderRadius: (AVATAR + 4) / 2,
    borderWidth: 1.5,
    borderColor: '#E8D9DC',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surface,
  },
  plain: {
    width: AVATAR + 4,
    height: AVATAR + 4,
    borderRadius: (AVATAR + 4) / 2,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surface,
  },
  avatar: {
    width: AVATAR,
    height: AVATAR,
    borderRadius: AVATAR / 2,
  },
  avatarFallback: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surface,
  },
  onlineDot: {
    position: 'absolute',
    right: 1,
    bottom: 1,
    width: 13,
    height: 13,
    borderRadius: 6.5,
    backgroundColor: '#10B981',
    borderWidth: 2,
    borderColor: colors.white,
  },

  content: {
    flex: 1,
    justifyContent: 'center',
    gap: 3,
  },
  name: {
    fontSize: 16,
    fontWeight: '700',
    color: '#111827',
  },

  primaryDetail: {
    fontSize: 13,
    fontWeight: '500',
    color: '#4B5563',
    lineHeight: 18,
  },

  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 1,
  },
  locationIcon: {
    marginRight: 3,
    marginLeft: -1,
  },
  locationText: {
    fontSize: 12.5,
    color: '#4B5563',
    flex: 1,
  },

  rightCol: {
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    alignSelf: 'stretch',
    minHeight: 56,
  },
  rightColCentered: {
    justifyContent: 'center',
  },

  metaTime: {
    fontSize: 11,
    fontWeight: '400',
    color: '#6B7280',
    marginBottom: 4,
  },

  actionsWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },

  chip: {
    paddingHorizontal: 11,
    paddingVertical: 6,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 70,
  },
  chipText: {
    fontSize: 12,
    fontWeight: '600',
  },
  chipConnected: {
    backgroundColor: '#E8F5E9',
    borderWidth: 1,
    borderColor: '#C8E6C9',
  },
  chipConnectedText: {
    color: '#2E7D32',
    fontSize: 12,
    fontWeight: '600',
  },
  chipFilled: {
    backgroundColor: auth.crimson,
  },
  chipFilledText: {
    color: colors.white,
    fontSize: 12,
    fontWeight: '700',
  },
  chipOutline: {
    backgroundColor: colors.white,
    borderWidth: 1.5,
    borderColor: auth.crimson,
  },
  chipOutlineText: {
    color: auth.crimson,
    fontSize: 12,
    fontWeight: '700',
  },
  chipMuted: {
    backgroundColor: '#F3F4F6',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  chipMutedText: {
    color: '#374151',
    fontSize: 12,
    fontWeight: '600',
  },
  chipDisabled: {
    opacity: 0.65,
  },

  dismissBtn: {
    width: 30,
    height: 30,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F9FAFB',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
});

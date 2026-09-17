import { useCallback, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useFocusEffect } from 'expo-router';
import AvatarFallback from './AvatarFallback';
import StableImage from './StableImage';
import { storyAPI } from '../utils/api';
import {
  colors,
  spacing,
  profileId,
  profileName,
  profileImage,
  unwrapProfile,
  type Profile,
} from './theme';

const SIZE = 66;

type Props = {
  myId?: string | number | null;
  myImage?: string | null;
  fallbackProfiles?: Profile[];
  onPressProfile: (id: string | number) => void;
  onPressMine?: () => void;
};

/**
 * Featured stories rail at the very top of the home screen, styled like Instagram stories.
 * Shows the user's avatar at index 0 followed by featured members with vibrant gradient story rings.
 */
export default function TopStories({
  myId,
  myImage,
  fallbackProfiles = [],
  onPressProfile,
  onPressMine,
}: Props) {
  const [profiles, setProfiles] = useState<Profile[]>([]);

  useFocusEffect(
    useCallback(() => {
      let alive = true;
      storyAPI
        .getTopStories()
        .then((res) => {
          const raw = res.data?.content ?? res.data ?? [];
          const list = (Array.isArray(raw) ? raw : []).map(unwrapProfile);
          if (alive && list.length > 0) setProfiles(list);
        })
        // The parent already supplies a current feed fallback. Do not replace
        // it with a second request's newly-signed URLs on each Home rerender.
        .catch(() => {});
      return () => {
        alive = false;
      };
    }, [])
  );

  const isMe = (p: Profile) => {
    if (!myId) return false;
    const pId = profileId(p);
    const pDisplayId = (p as any)?.displayId;
    const pUserId = (p as any)?.userProfileId;
    const myIdStr = String(myId).trim().toUpperCase();
    const cleanId = (v: any) => (v != null ? String(v).trim().toUpperCase() : '');
    return (
      cleanId(pId) === myIdStr ||
      cleanId(pDisplayId) === myIdStr ||
      cleanId(pUserId) === myIdStr ||
      (myIdStr.startsWith('JM') && cleanId(pId) === myIdStr.replace(/^JM0*/, '')) ||
      (cleanId(pId).startsWith('JM') && cleanId(pId).replace(/^JM0*/, '') === myIdStr) ||
      (myIdStr.startsWith('JM') && cleanId(pUserId) === myIdStr.replace(/^JM0*/, ''))
    );
  };

  const rawList = profiles.length > 0 ? profiles : fallbackProfiles;
  const displayList = rawList.filter((p) => !isMe(p));

  return (
    <View style={styles.wrap}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.list}
      >
        {/* Your Story / Profile */}
        <TouchableOpacity
          style={styles.item}
          activeOpacity={0.85}
          onPress={onPressMine}
          accessibilityRole="button"
          accessibilityLabel="Your profile"
        >
          <View style={styles.myAvatarWrap}>
            {myImage ? (
              <StableImage
                uri={myImage}
                style={styles.avatar}
                contentFit="cover"
                contentPosition="top"
              />
            ) : (
              <View style={[styles.avatar, styles.fallback]}>
                <Ionicons name="person" size={26} color={colors.textFaint} />
              </View>
            )}
            <View style={styles.addBadge}>
              <Ionicons name="add" size={14} color={colors.white} />
            </View>
          </View>
          <Text style={styles.name} numberOfLines={1}>
            Your story
          </Text>
        </TouchableOpacity>

        {/* Featured Profiles */}
        {displayList.map((profile, index) => {
          const rawId = (profile as any)?.displayId || (profile as any)?.userProfileId || profileId(profile);
          const id =
            rawId != null && !isNaN(Number(rawId)) && Number(rawId) > 0 && !String(rawId).startsWith('JM')
              ? `JM${String(rawId).padStart(5, '0')}`
              : rawId;
          const uri = profileImage(profile);

          return (
            <TouchableOpacity
              key={String(id ?? index)}
              style={styles.item}
              activeOpacity={0.85}
              onPress={() => id != null && onPressProfile(id)}
              accessibilityRole="button"
              accessibilityLabel={`Featured story: ${profileName(profile)}`}
            >
              <LinearGradient
                colors={['#F59E0B', '#EC4899', '#8B5CF6']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.ring}
              >
                <View style={styles.inset}>
                  {uri ? (
                    <StableImage
                      uri={uri}
                      style={styles.avatar}
                      contentFit="cover"
                      contentPosition="top"
                    />
                  ) : (
                    <View style={[styles.avatar, styles.fallback]}>
                      <AvatarFallback profile={profile} glyphSize={26} />
                    </View>
                  )}
                </View>
              </LinearGradient>

              <Text style={styles.name} numberOfLines={1}>
                {profileName(profile)}
              </Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>
      <View style={styles.bottomBorder} />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    backgroundColor: colors.bg,
    paddingTop: spacing.sm,
  },
  list: {
    paddingHorizontal: spacing.md,
    gap: spacing.md,
    paddingBottom: spacing.sm,
  },
  item: {
    width: SIZE + 8,
    alignItems: 'center',
  },
  myAvatarWrap: {
    width: SIZE,
    height: SIZE,
    borderRadius: SIZE / 2,
    borderWidth: 1.5,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surface,
  },
  addBadge: {
    position: 'absolute',
    right: -1,
    bottom: -1,
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: colors.link,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: colors.bg,
  },
  ring: {
    width: SIZE,
    height: SIZE,
    borderRadius: SIZE / 2,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 2.5,
  },
  inset: {
    width: '100%',
    height: '100%',
    borderRadius: SIZE / 2,
    backgroundColor: colors.white,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 2,
  },
  avatar: {
    width: '100%',
    height: '100%',
    borderRadius: SIZE / 2,
    backgroundColor: colors.surface,
  },
  fallback: {
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  name: {
    marginTop: 5,
    fontSize: 11,
    fontWeight: '500',
    color: colors.text,
    textAlign: 'center',
    width: '100%',
  },
  bottomBorder: {
    height: 1,
    backgroundColor: colors.hairline,
  },
});

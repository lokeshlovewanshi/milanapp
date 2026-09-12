import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import Ionicons from '@expo/vector-icons/Ionicons';
import {
  colors,
  font,
  storyRing,
  spacing,
  profileId,
  profileName,
  profileImage,
  type Profile,
} from './theme';

type Props = {
  profiles: Profile[];
  myImage?: string | null;
  onPressProfile: (id: string | number) => void;
  onPressMine?: () => void;
};

const SIZE = 68;

/**
 * The story rail from Instagram's home screen, repurposed to surface newly
 * joined profiles. The gradient ring is the whole point visually, so it is a
 * real LinearGradient with a white inset rather than a coloured border.
 */
export default function StoryRail({ profiles, myImage, onPressProfile, onPressMine }: Props) {
  return (
    <View style={styles.wrap}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.list}
      >
        <TouchableOpacity style={styles.item} activeOpacity={0.8} onPress={onPressMine}>
          <View style={styles.plainRing}>
            {myImage ? (
              <Image source={{ uri: myImage }} style={styles.avatar} contentFit="cover" contentPosition="top" />
            ) : (
              <View style={[styles.avatar, styles.avatarFallback]}>
                <Ionicons name="person" size={26} color={colors.textFaint} />
              </View>
            )}
            <View style={styles.addBadge}>
              <Ionicons name="add" size={14} color={colors.white} />
            </View>
          </View>
          <Text style={styles.label} numberOfLines={1}>
            Your profile
          </Text>
        </TouchableOpacity>

        {profiles.map((item, index) => {
          const id = profileId(item);
          const uri = profileImage(item);
          return (
            <TouchableOpacity
              key={`${id ?? 'story'}-${index}`}
              style={styles.item}
              activeOpacity={0.8}
              onPress={() => id != null && onPressProfile(id)}
            >
              <LinearGradient
                colors={storyRing}
                start={{ x: 0, y: 1 }}
                end={{ x: 1, y: 0 }}
                style={styles.ring}
              >
                <View style={styles.ringInner}>
                  {uri ? (
                    <Image source={{ uri }} style={styles.avatar} contentFit="cover" contentPosition="top" />
                  ) : (
                    <View style={[styles.avatar, styles.avatarFallback]}>
                      <Ionicons name="person" size={26} color={colors.textFaint} />
                    </View>
                  )}
                </View>
              </LinearGradient>
              <Text style={styles.label} numberOfLines={1}>
                {profileName(item)}
              </Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>
      <View style={styles.rule} />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    backgroundColor: colors.bg,
  },
  list: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    gap: spacing.lg,
  },
  item: {
    width: SIZE + 8,
    alignItems: 'center',
  },
  ring: {
    width: SIZE,
    height: SIZE,
    borderRadius: SIZE / 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ringInner: {
    width: SIZE - 5,
    height: SIZE - 5,
    borderRadius: (SIZE - 5) / 2,
    backgroundColor: colors.bg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  plainRing: {
    width: SIZE,
    height: SIZE,
    borderRadius: SIZE / 2,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatar: {
    width: SIZE - 11,
    height: SIZE - 11,
    borderRadius: (SIZE - 11) / 2,
    backgroundColor: colors.surface,
  },
  avatarFallback: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  addBadge: {
    position: 'absolute',
    right: 0,
    bottom: 0,
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: colors.bg,
  },
  label: {
    marginTop: 6,
    fontSize: font.small,
    color: colors.text,
    maxWidth: SIZE + 6,
    textAlign: 'center',
  },
  rule: {
    height: 1,
    backgroundColor: colors.hairline,
  },
});

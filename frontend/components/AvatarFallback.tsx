import { StyleSheet } from 'react-native';
import { Image } from 'expo-image';
import Ionicons from '@expo/vector-icons/Ionicons';
import { colors, unwrapProfile, type Profile } from './theme';

const MALE = require('../assets/images/avatar-male.png');
const FEMALE = require('../assets/images/avatar-female.png');

/**
 * The illustration to stand in for someone who has not uploaded a photo, or
 * null when we have no business guessing.
 *
 * Gender is stored as "Male"/"Female", but most profiles have not filled it in
 * yet. Those get the plain silhouette rather than a coin-flip between two
 * drawings - showing a member a picture of the wrong person is worse than
 * showing them no picture, and it is the sort of wrong that looks deliberate.
 */
const illustrationFor = (item: Profile) => {
  const gender = String(unwrapProfile(item)?.gender ?? '').trim().toLowerCase();
  if (gender.startsWith('m')) return MALE;
  if (gender.startsWith('f')) return FEMALE;
  return null;
};

type Props = {
  profile: Profile;
  /** Size of the neutral silhouette, used only when gender is unknown. */
  glyphSize?: number;
};

/**
 * Drop-in contents for an empty photo frame.
 *
 * Renders inside whatever box the caller already draws - the rails, rows and
 * cards each have their own shape and rounding - so this only decides *what*
 * goes in the hole, never how big the hole is.
 */
export default function AvatarFallback({ profile, glyphSize = 34 }: Props) {
  const source = illustrationFor(profile);

  if (!source) {
    return <Ionicons name="person" size={glyphSize} color={colors.textFaint} />;
  }

  // contain, not cover. These are square drawings and several of the frames
  // they sit in are not - cover would crop the face, which is the one part
  // that has to survive.
  return <Image source={source} style={styles.fill} contentFit="contain" transition={120} />;
}

const styles = StyleSheet.create({
  fill: { width: '100%', height: '100%' },
});

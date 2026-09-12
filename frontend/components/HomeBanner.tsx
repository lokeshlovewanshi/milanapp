import { View, Text, StyleSheet } from 'react-native';
import { Image } from 'expo-image';
import Ionicons from '@expo/vector-icons/Ionicons';
import { colors, font, radius, spacing, auth, serif } from './theme';

// The same file the sign-in screen uses, deliberately. Two copies of one
// photograph would be two things to keep in step, and this is already bundled.
const HERO = require('../assets/images/auth-hero.jpg');

/**
 * The masthead on the home screen: the couple, the rings, and the promise.
 *
 * Photo on the left and type on the right rather than type over the image, for
 * the same reason as the auth screens - the source is a tall portrait, so
 * covering a short wide strip with it crops to the band the faces are in and
 * puts maroon type across them.
 */
export default function HomeBanner() {
  return (
    <View style={styles.card}>
      <Image
        source={HERO}
        style={styles.photo}
        contentFit="cover"
        contentPosition="top center"
        transition={200}
      />

      <View style={styles.text}>
        <View style={styles.rings}>
          <View style={styles.ring} />
          <View style={[styles.ring, styles.ringOverlap]} />
        </View>

        <Text style={styles.wordmark} numberOfLines={1}>
          Forever Together
        </Text>

        <View style={styles.rule}>
          <View style={styles.ruleLine} />
          <Ionicons name="heart" size={11} color={auth.blush} />
          <View style={styles.ruleLine} />
        </View>

        <Text style={styles.tagline} numberOfLines={1}>
          Find your perfect match
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    marginHorizontal: spacing.md,
    marginTop: spacing.md,
    height: 150,
    borderRadius: radius.lg,
    overflow: 'hidden',
    backgroundColor: '#FBE4E6',
  },
  // Roughly the source's own aspect at this height, so almost nothing is
  // cropped and the couple sit as they do on the sign-in screen.
  photo: { width: '38%', height: '100%' },
  text: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.sm,
  },

  rings: { flexDirection: 'row', marginBottom: 6 },
  ring: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    borderColor: '#C97B6E',
  },
  ringOverlap: { marginLeft: -8 },

  wordmark: {
    fontFamily: serif,
    fontSize: 22,
    lineHeight: 28,
    color: auth.maroon,
    textAlign: 'center',
  },
  rule: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 4 },
  ruleLine: { width: 26, height: 1, backgroundColor: auth.blush },
  tagline: {
    fontSize: font.small,
    color: '#6B5A3A',
    textAlign: 'center',
    marginTop: 4,
  },
});

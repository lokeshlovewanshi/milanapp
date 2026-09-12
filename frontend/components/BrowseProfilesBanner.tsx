import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { colors, font, radius, spacing, auth } from './theme';

type Props = {
  onPress: () => void;
};

/**
 * Takes over the masthead's spot once there is nothing left to complete.
 *
 * CompleteProfileCard's whole reason to exist is a nag with a next step; once
 * a profile is done, HomeBanner underneath it is decoration with no action -
 * fine for a moment, but the member came here to do something. This is that
 * something: one tap straight into the swipe deck, skipping the list view
 * entirely, since "browse" is exactly what a swipe deck already is.
 */
export default function BrowseProfilesBanner({ onPress }: Props) {
  return (
    <TouchableOpacity style={styles.card} activeOpacity={0.85} onPress={onPress}>
      <View style={styles.iconWrap}>
        <Ionicons name="search" size={20} color={colors.white} />
      </View>
      <View style={styles.textWrap}>
        <Text style={styles.title}>Browse Profiles</Text>
        <Text style={styles.subtitle}>प्रोफाइल देखें</Text>
      </View>
      <Ionicons name="chevron-forward" size={20} color={auth.crimson} />
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    marginHorizontal: spacing.md,
    marginTop: spacing.md,
    padding: spacing.md,
    borderRadius: radius.lg,
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: '#F0D9DC',
  },
  iconWrap: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: auth.crimson,
    alignItems: 'center',
    justifyContent: 'center',
  },
  textWrap: { flex: 1 },
  title: { fontSize: font.title, fontWeight: '700', color: colors.text },
  subtitle: { fontSize: font.small, color: colors.textMuted, marginTop: 1 },
});

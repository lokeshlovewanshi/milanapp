import { View, Text, StyleSheet } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { colors, radius, spacing } from './theme';

/**
 * The reassurance strip at the foot of the home screen.
 *
 * Static copy, and honest about it: each claim is about how the product is run
 * rather than about any particular profile. Nothing here reads a per-profile
 * "verified" flag, because no such flag exists yet - see the note in home.tsx.
 */
const ITEMS: { icon: keyof typeof Ionicons.glyphMap; lines: [string, string] }[] = [
  { icon: 'shield-checkmark', lines: ['Verified', 'Profiles'] },
  { icon: 'person', lines: ['100% Safe &', 'Secure'] },
  { icon: 'chatbubble-ellipses', lines: ['Easy', 'Communication'] },
  { icon: 'people', lines: ['Trusted by', 'Families'] },
];

export default function TrustRow() {
  return (
    <View style={styles.wrap}>
      {ITEMS.map((item) => (
        <View key={item.icon} style={styles.item}>
          {/* The tick's blue, deepened. Same claim as the badge beside a name,
              but four icons in a row of pale blue read as washed out where a
              single 14dp tick reads as bright. */}
          <Ionicons name={item.icon} size={20} color={colors.verifiedDeep} />
          <Text style={styles.line}>{item.lines[0]}</Text>
          <Text style={styles.line}>{item.lines[1]}</Text>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flexDirection: 'row',
    marginHorizontal: spacing.md,
    marginTop: spacing.xl,
    paddingVertical: spacing.lg,
    borderRadius: radius.md,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: '#EFE0DA',
    backgroundColor: '#FFFBFA',
  },
  item: { flex: 1, alignItems: 'center', paddingHorizontal: 4 },
  line: {
    fontSize: 11,
    color: '#6B7280',
    textAlign: 'center',
    marginTop: 2,
    lineHeight: 14,
  },
});

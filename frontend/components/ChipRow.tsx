import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { auth, colors, font, spacing } from './theme';

export type Chip = { code: string; label: string };

type Props = {
  chips: Chip[];
  /** Codes currently selected. Selected chips get the pink tint treatment. */
  selected?: string[];
  onPress: (code: string) => void;
  /** Shows an x on each chip, for the "currently selected" strip. */
  removable?: boolean;
  /** Small grey caption above, e.g. "Suggested City/State(s) to add:". */
  caption?: string;
};

/**
 * Wrapping row of pill chips.
 *
 * Serves three jobs from the reference screens, because they are the same
 * control with different data:
 *  - "Suggested X to add" - tap to append, unselected styling
 *  - segmented choice ("Doesn't Matter" / "Well known colleges only") - one is selected
 *  - the selected strip above a picker's search box, with removable x
 */
export default function ChipRow({
  chips,
  selected = [],
  onPress,
  removable = false,
  caption,
}: Props) {
  if (chips.length === 0) return null;

  return (
    <View style={styles.wrap}>
      {!!caption && <Text style={styles.caption}>{caption}</Text>}
      <View style={styles.row}>
        {chips.map((chip) => {
          const isOn = selected.includes(chip.code);
          return (
            <TouchableOpacity
              key={chip.code}
              style={[styles.chip, isOn && styles.chipOn]}
              activeOpacity={0.7}
              onPress={() => onPress(chip.code)}
            >
              <Text style={[styles.chipText, isOn && styles.chipTextOn]} numberOfLines={1}>
                {chip.label}
              </Text>
              {removable && (
                <Ionicons name="close" size={13} color={auth.crimson} style={styles.x} />
              )}
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    gap: spacing.sm,
  },
  caption: {
    fontSize: font.body,
    color: colors.fieldLabel,
  },
  row: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.bg,
  },
  chipOn: {
    // Tint plus a border, matching the reference's selected state - a solid
    // fill would compete with the Save button for attention. The border is the
    // palette's lighter highlight red, not the button maroon: at 1px a
    // near-black red reads as grey.
    backgroundColor: colors.accentSoft,
    borderColor: colors.highlightBorder,
  },
  chipText: {
    fontSize: font.label,
    color: colors.fieldValue,
  },
  chipTextOn: {
    color: colors.fieldValue,
    fontWeight: '600',
  },
  x: {
    marginLeft: 1,
  },
});

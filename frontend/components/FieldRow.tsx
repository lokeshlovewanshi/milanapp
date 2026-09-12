import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { colors, font, spacing } from './theme';

type Props = {
  label: string;
  /** Rendered large under the label. Falls back to the placeholder when empty. */
  value?: string | null;
  placeholder?: string;
  onPress?: () => void;
  /** Hides the hairline under the last row in a group. */
  last?: boolean;
  /** Shows a red asterisk after the label. */
  required?: boolean;
  /** Shows a red "Required" line under the field instead of an alert popup. */
  error?: boolean;
};

/**
 * One editable field: small grey label, large value beneath, hairline under.
 *
 * Deliberately not a bordered input box. The reference screens use underlined
 * rows so a form of a dozen fields reads as a list rather than a wall of boxes,
 * and the value gets the visual weight instead of the container.
 */
export default function FieldRow({
  label,
  value,
  placeholder = 'Select',
  onPress,
  last = false,
  required = false,
  error = false,
}: Props) {
  const filled = !!value && String(value).trim().length > 0;

  return (
    <TouchableOpacity
      style={styles.wrap}
      activeOpacity={onPress ? 0.6 : 1}
      onPress={onPress}
      disabled={!onPress}
    >
      <Text style={styles.label}>
        {label}
        {required && <Text style={styles.asterisk}> *</Text>}
      </Text>
      <Text style={[styles.value, !filled && styles.placeholder]} numberOfLines={2}>
        {filled ? value : placeholder}
      </Text>
      {error && <Text style={styles.error}>Required</Text>}
      {!last && <View style={styles.rule} />}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  wrap: {
    paddingTop: spacing.lg,
  },
  label: {
    fontSize: font.body,
    fontWeight: '600',
    color: colors.fieldLabel,
    marginBottom: 6,
  },
  value: {
    fontSize: 17,
    color: colors.fieldValue,
    paddingBottom: spacing.md,
  },
  placeholder: {
    color: colors.textFaint,
  },
  asterisk: {
    color: colors.danger,
  },
  error: {
    fontSize: font.small,
    color: colors.danger,
    marginTop: -4,
    marginBottom: spacing.sm,
  },
  rule: {
    height: 1,
    backgroundColor: colors.hairline,
  },
});

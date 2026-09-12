import { memo, useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, TextInputProps } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { auth } from './theme';

type Props = Omit<TextInputProps, 'style' | 'secureTextEntry'> & {
  /** Leading glyph, e.g. "mail-outline". */
  icon: keyof typeof Ionicons.glyphMap;
  value: string;
  onChangeText: (text: string) => void;
  /** Renders the masked field plus its own show/hide toggle. */
  secure?: boolean;
  /**
   * Caption above the field, e.g. "Email".
   *
   * Optional because a labelled field and a placeholder-only one are both in
   * use: the auth screens label every field, per the comp, while the sheets
   * elsewhere rely on the placeholder alone.
   */
  label?: string;
};

/**
 * One labelled row of a sign-in form: icon, input, and - for passwords - the
 * reveal toggle.
 *
 * Memoised, and that is the point of the component rather than a nicety. These
 * screens hold every field in one `useState` apiece on the screen component, so
 * a single keystroke re-rendered the whole 380-line tree: both fields, the
 * logo, the Google button, the footer. That is what the typing lag was. Wrapped
 * in `memo`, a keystroke re-renders only the field whose `value` changed - the
 * others see identical props and are skipped.
 *
 * Two things keep that working, and both are easy to undo by accident:
 *
 *  - `onChangeText` must be referentially stable. Passing a `useState` setter
 *    directly is stable; passing an inline arrow (`onChangeText={(t) => ...}`)
 *    creates a new function every render and defeats the memo entirely.
 *  - the reveal toggle keeps its state HERE rather than on the screen. Hoisting
 *    it up would make every toggle re-render the whole form again, which is the
 *    problem this exists to avoid.
 */
function FormField({ icon, value, onChangeText, secure = false, label, ...rest }: Props) {
  const [revealed, setRevealed] = useState(false);

  return (
    <View style={styles.wrap}>
      {!!label && <Text style={styles.label}>{label}</Text>}
      <View style={styles.container}>
        <Ionicons name={icon} size={20} color={auth.amber} style={styles.icon} />
        <TextInput
          style={styles.input}
          placeholderTextColor="#9AA0A6"
          value={value}
          onChangeText={onChangeText}
          secureTextEntry={secure && !revealed}
          autoCapitalize={secure ? 'none' : rest.autoCapitalize ?? 'none'}
          autoCorrect={false}
          textContentType={secure ? 'password' : rest.textContentType}
          {...rest}
        />
        {secure && (
          <TouchableOpacity
            style={styles.eye}
            onPress={() => setRevealed((r) => !r)}
            accessibilityRole="button"
            accessibilityLabel={revealed ? 'Hide password' : 'Show password'}
            hitSlop={8}
          >
            <Ionicons name={revealed ? 'eye-off' : 'eye'} size={20} color="#9AA0A6" />
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { marginBottom: 11 },
  label: {
    fontSize: 13,
    fontWeight: '700',
    color: auth.label,
    marginBottom: 5,
  },
  container: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: auth.line,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
  },
  icon: {
    marginRight: 10,
  },
  input: {
    flex: 1,
    // 13 keeps a 48dp row with the label above it - still an easy target, and
    // the four dp saved per field is what lets sign-up's five fit one screen.
    paddingVertical: 13,
    fontSize: 15,
    color: '#1A1A1A',
  },
  eye: {
    padding: 8,
  },
});

export default memo(FormField);

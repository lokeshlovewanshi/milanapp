import { useRef, useState } from 'react';
import { View, TextInput, StyleSheet, Pressable } from 'react-native';
import { auth } from './theme';

const LENGTH = 6;

/**
 * Six boxes that behave like one field.
 *
 * A single hidden input behind six painted boxes, rather than six real inputs
 * wired together. Six inputs is the obvious build and it fights the platform
 * the whole way: autofill from the SMS/mail suggestion drops the entire code
 * into the first box, backspace on an empty box has to reach backwards by hand,
 * and paste only ever fills one. One input gets all three for free, and the
 * boxes become presentation.
 */
export default function OtpInput({
  value,
  onChange,
  onComplete,
  length = 4,
  autoFocus = true,
}: {
  value: string;
  onChange: (code: string) => void;
  /** Fired once all digits land, so the user need not press a button. */
  onComplete?: (code: string) => void;
  length?: number;
  autoFocus?: boolean;
}) {
  const input = useRef<TextInput>(null);
  const [focused, setFocused] = useState(false);

  const handle = (raw: string) => {
    // Strip anything that is not a digit
    const digits = raw.replace(/\D/g, '').slice(0, length);
    onChange(digits);
    if (digits.length === length) onComplete?.(digits);
  };

  return (
    <Pressable style={styles.row} onPress={() => input.current?.focus()}>
      {Array.from({ length }).map((_, i) => {
        const char = value[i] ?? '';
        // The caret sits on the first empty box, or the last one when full.
        const active = focused && (i === value.length || (value.length === length && i === length - 1));
        return (
          <View key={i} style={[styles.box, active && styles.boxActive]}>
            <TextInput
              style={styles.boxText}
              value={char}
              editable={false}
              pointerEvents="none"
            />
          </View>
        );
      })}

      <TextInput
        ref={input}
        style={styles.hidden}
        value={value}
        onChangeText={handle}
        keyboardType="number-pad"
        maxLength={length}
        autoFocus={autoFocus}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        textContentType="oneTimeCode"
        autoComplete="one-time-code"
        accessibilityLabel={`${length} digit code`}
      />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 12, marginVertical: 4 },
  box: {
    width: 48,
    height: 48,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    backgroundColor: '#F9FAFB',
    alignItems: 'center',
    justifyContent: 'center',
  },
  boxActive: {
    borderColor: '#9CA3AF',
    backgroundColor: '#FFFFFF',
  },
  boxText: {
    fontSize: 20,
    fontWeight: '600',
    color: '#1F2937',
    textAlign: 'center',
    padding: 0,
  },
  // Not display:none - a field that is not laid out cannot hold focus or raise
  // the keyboard on Android.
  hidden: { position: 'absolute', opacity: 0, width: 1, height: 1 },
});

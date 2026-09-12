import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Ionicons from '@expo/vector-icons/Ionicons';
import { GoogleG } from './BrandIcons';
import { auth } from './theme';

/**
 * The primary action on the sign-in and sign-up cards.
 *
 * A gradient here, even though gradients were stripped out of this app once
 * before. That removal was about a pink-to-rose sweep that made one button look
 * like a different product from the flat screen beside it; this is the fill the
 * comp specifies for both auth screens, and both use it, so there is nothing
 * for it to disagree with.
 */
export function PrimaryButton({
  label,
  icon,
  loading,
  disabled,
  onPress,
  testID,
}: {
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
  loading?: boolean;
  disabled?: boolean;
  onPress: () => void;
  testID?: string;
}) {
  return (
    <TouchableOpacity
      testID={testID}
      onPress={onPress}
      disabled={loading || disabled}
      activeOpacity={0.88}
      accessibilityRole="button"
    >
      <LinearGradient
        colors={[auth.crimson, auth.crimsonDeep]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={[styles.primary, (loading || disabled) && styles.dim]}
      >
        {loading ? (
          <ActivityIndicator color="#FFFFFF" size="small" />
        ) : (
          <Ionicons name={icon} size={19} color="#FFFFFF" />
        )}
        {/* One line, shrinking rather than wrapping: a bilingual label is
            about twice the width of either language alone, and a button that
            grows to two lines pushes everything below it down the screen. */}
        <Text style={styles.primaryText} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.75}>
          {label}
        </Text>
      </LinearGradient>
    </TouchableOpacity>
  );
}

/**
 * The second action on the landing card, under the primary one.
 *
 * Outlined rather than a second fill: two filled crimson buttons stacked would
 * give a first-time visitor no way to tell which one the screen expects, and
 * the choice between signing in and signing up is not a coin toss - the label
 * you match is the one you want.
 */
export function SecondaryButton({
  label,
  icon,
  onPress,
  testID,
}: {
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
  onPress: () => void;
  testID?: string;
}) {
  return (
    <TouchableOpacity
      testID={testID}
      style={styles.secondary}
      onPress={onPress}
      activeOpacity={0.85}
      accessibilityRole="button"
    >
      <Ionicons name={icon} size={19} color={auth.crimson} />
      <Text
        style={styles.secondaryText}
        numberOfLines={1}
        adjustsFontSizeToFit
        minimumFontScale={0.75}
      >
        {label}
      </Text>
    </TouchableOpacity>
  );
}

/**
 * "Continue with Google".
 *
 * Google's brand guidelines require their mark on their own light surface, so
 * this stays white-on-outline rather than picking up the maroon around it.
 */
export function GoogleButton({
  loading,
  onPress,
  testID,
}: {
  loading?: boolean;
  onPress: () => void;
  testID?: string;
}) {
  return (
    <TouchableOpacity
      testID={testID}
      style={[styles.google, loading && styles.dim]}
      onPress={onPress}
      disabled={loading}
      activeOpacity={0.85}
      accessibilityRole="button"
    >
      <GoogleG size={19} />
      <Text style={styles.googleText}>Continue with Google</Text>
    </TouchableOpacity>
  );
}

/** The "OR" rule between the two sign-in routes. */
export function OrRule() {
  return (
    <View style={styles.orRow}>
      <View style={styles.orLine} />
      <Text style={styles.orText}>OR</Text>
      <View style={styles.orLine} />
    </View>
  );
}

const styles = StyleSheet.create({
  primary: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    borderRadius: 12,
    paddingVertical: 14,
  },
  primaryText: { color: '#FFFFFF', fontSize: 17, fontWeight: '700' },
  dim: { opacity: 0.7 },

  secondary: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: auth.line,
    paddingVertical: 14,
  },
  secondaryText: { color: auth.crimson, fontSize: 17, fontWeight: '700' },

  google: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: auth.line,
    paddingVertical: 13,
  },
  googleText: { fontSize: 15, fontWeight: '700', color: '#1A1A1A' },

  orRow: { flexDirection: 'row', alignItems: 'center', gap: 12, marginVertical: 13 },
  orLine: { flex: 1, height: 1, backgroundColor: auth.line },
  orText: { fontSize: 13, color: '#9AA0A6', fontWeight: '600' },
});

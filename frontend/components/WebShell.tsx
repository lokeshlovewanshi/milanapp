import { ReactNode } from 'react';
import { Platform, StyleSheet, View, useWindowDimensions } from 'react-native';
import { colors } from './theme';

/**
 * Constrains the app to a readable column on large screens.
 *
 * Every screen here was laid out for a phone, where `flex: 1` and full-width
 * rows are exactly right. Rendered in a 1600px browser window those same rules
 * stretch a login button across the entire monitor and spread a profile card's
 * label and value to opposite ends of the desk. The content is not wrong, it
 * just has no upper bound.
 *
 * So rather than rewriting every screen with breakpoints, the whole app is
 * capped and centred once, here. The phone layouts then behave on desktop the
 * way they already behave on a phone.
 *
 * MAX_WIDTH is 940px rather than something wider because this is a single
 * column of cards and photos. Text lines past roughly 75 characters get hard to
 * track back to the next line, and a feed built from portrait images looks
 * stretched and thin when it is much wider than this. It is close to what
 * Instagram and other single-column feeds settle on, for the same reasons.
 *
 * A no-op on native: `Platform.OS !== 'web'` returns the children untouched, so
 * this cannot affect the Android or iOS builds. The gutter and background only
 * appear once there is actually room for them.
 */

const MAX_WIDTH = 940;

/** Below this the viewport is phone-shaped already and needs no help. */
const DESKTOP_BREAKPOINT = 1000;

export default function WebShell({ children }: { children: ReactNode }) {
  const { width } = useWindowDimensions();

  if (Platform.OS !== 'web' || width < DESKTOP_BREAKPOINT) {
    return <>{children}</>;
  }

  return (
    <View style={styles.backdrop}>
      <View style={[styles.column, { maxWidth: MAX_WIDTH }]}>{children}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  // A neutral surround, so the centred column reads as the page rather than as
  // a phone-shaped window floating in the brand colour.
  backdrop: {
    flex: 1,
    alignItems: 'center',
    backgroundColor: '#F1F1F1',
  },
  column: {
    flex: 1,
    width: '100%',
    backgroundColor: colors.white,
    // Only a hint of separation. A heavy shadow or a rounded card would make
    // the app look like a phone emulator embedded in a web page.
    borderLeftWidth: StyleSheet.hairlineWidth,
    borderRightWidth: StyleSheet.hairlineWidth,
    borderColor: '#E4E4E4',
  },
});

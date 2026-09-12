import { useEffect, useRef } from 'react';
import { Animated, Easing, StyleSheet, View, Text } from 'react-native';
import Svg, { Circle, Defs, LinearGradient, Stop } from 'react-native-svg';
import { auth, colors, font, spacing } from './theme';

const STROKE_RATIO = 0.1;
/** How much of the ring the moving arc covers. Under a third reads as a comet. */
const ARC = 0.3;

type Props = {
  size?: number;
  /** One line under the ring, e.g. "Loading profiles". */
  label?: string;
};

/**
 * The app's loading indicator.
 *
 * A tapering crimson arc sweeping a pale track, rather than the platform
 * spinner. ActivityIndicator is grey on Android and system-blue on iOS, so the
 * one moment every screen has in common was also the one moment that looked
 * like neither this app nor itself across the two platforms.
 *
 * Rotation runs on the native driver, so it keeps turning smoothly while the
 * JavaScript thread is busy doing the very work being waited on - which is
 * exactly when a stuttering spinner looks broken.
 */
export default function Loader({ size = 34, label }: Props) {
  const spin = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.timing(spin, {
        toValue: 1,
        duration: 950,
        easing: Easing.linear,
        useNativeDriver: true,
      })
    );
    loop.start();
    return () => loop.stop();
  }, [spin]);

  const rotate = spin.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '360deg'] });

  const stroke = Math.max(2, Math.round(size * STROKE_RATIO));
  const r = (size - stroke) / 2;
  const circumference = 2 * Math.PI * r;

  return (
    <View style={styles.wrap}>
      <Animated.View style={{ width: size, height: size, transform: [{ rotate }] }}>
        <Svg width={size} height={size}>
          <Defs>
            {/* Fades the tail out, so the arc reads as trailing the head rather
                than as a bar that happens to be spinning. */}
            <LinearGradient id="loaderSweep" x1="0" y1="0" x2="1" y2="1">
              <Stop offset="0" stopColor={auth.iconRed} stopOpacity="1" />
              <Stop offset="1" stopColor={auth.crimsonLight} stopOpacity="0.15" />
            </LinearGradient>
          </Defs>

          <Circle
            cx={size / 2}
            cy={size / 2}
            r={r}
            stroke="#F5D6DF"
            strokeWidth={stroke}
            fill="none"
          />
          <Circle
            cx={size / 2}
            cy={size / 2}
            r={r}
            stroke="url(#loaderSweep)"
            strokeWidth={stroke}
            strokeDasharray={`${circumference * ARC} ${circumference}`}
            strokeLinecap="round"
            fill="none"
          />
        </Svg>
      </Animated.View>

      {!!label && <Text style={styles.label}>{label}</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { alignItems: 'center', justifyContent: 'center' },
  label: {
    marginTop: spacing.md,
    fontSize: font.body,
    color: colors.textMuted,
  },
});

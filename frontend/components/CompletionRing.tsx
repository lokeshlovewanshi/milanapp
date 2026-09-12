import { View, Text, StyleSheet } from 'react-native';

type Props = {
  percent: number;
  size?: number;
  stroke?: number;
};

/**
 * Circular completion indicator.
 *
 * Drawn with two rotated half-circle borders rather than react-native-svg: the
 * project has no SVG dependency, and pulling one in for a single ring would add
 * a native module to a build that has already been fragile.
 *
 * The technique - two semicircles each rotated by an angle derived from the
 * percentage, clipped by their parent halves - renders identically on both
 * platforms and costs nothing at runtime.
 */
export default function CompletionRing({ percent, size = 56, stroke = 5 }: Props) {
  const clamped = Math.max(0, Math.min(100, Math.round(percent)));
  const half = size / 2;

  // First half-turn fills 0-50%, second fills 50-100%.
  const firstAngle = clamped <= 50 ? (clamped / 50) * 180 : 180;
  const secondAngle = clamped > 50 ? ((clamped - 50) / 50) * 180 : 0;

  const arc = {
    width: size,
    height: size,
    borderRadius: half,
    borderWidth: stroke,
    borderTopColor: 'transparent',
    borderRightColor: 'transparent',
  } as const;

  return (
    <View style={{ width: size, height: size }}>
      {/* Track */}
      <View
        style={[
          styles.track,
          {
            width: size,
            height: size,
            borderRadius: half,
            borderWidth: stroke,
          },
        ]}
      />

      {/* Right half hosts the 0-50% sweep. */}
      <View style={[styles.clip, { width: half, height: size, left: half }]}>
        <View
          style={[
            styles.arc,
            arc,
            { left: -half, borderColor: '#F43F5E', transform: [{ rotate: `${firstAngle - 135}deg` }] },
          ]}
        />
      </View>

      {/* Left half hosts the 50-100% sweep. */}
      <View style={[styles.clip, { width: half, height: size, left: 0 }]}>
        <View
          style={[
            styles.arc,
            arc,
            { left: 0, borderColor: '#F43F5E', transform: [{ rotate: `${secondAngle + 45}deg` }] },
          ]}
        />
      </View>

      <View style={[styles.center, { width: size, height: size }]}>
        <Text style={[styles.value, { fontSize: size * 0.28 }]}>{clamped}%</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  track: {
    position: 'absolute',
    borderColor: '#FFE4E6',
  },
  clip: {
    position: 'absolute',
    top: 0,
    overflow: 'hidden',
  },
  arc: {
    position: 'absolute',
    top: 0,
  },
  center: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
  },
  value: {
    fontWeight: 'bold',
    color: '#F43F5E',
  },
});

export { };
export const ringLabel = (percent: number) =>
  percent >= 90 ? 'Looking great' : percent >= 60 ? 'Almost complete' : 'Profile incomplete';

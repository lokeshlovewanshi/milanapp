import Svg, { Circle, Defs, G, LinearGradient, Path, Stop } from 'react-native-svg';

/**
 * The two marks that have to look like themselves rather than like this app.
 *
 * Drawn as SVG rather than shipped as PNGs. Both are small and sit next to text
 * that scales, and a raster mark at 16dp is either blurry on a 3x screen or a
 * 48px asset carried at three densities. These also come out with a genuinely
 * transparent background, which a screenshot of a logo on black does not.
 */

/**
 * Google's four-colour G.
 *
 * The official geometry, not an approximation - Google's branding terms for
 * "Sign in with Google" require their own mark, and Ionicons' `logo-google`
 * (which this replaces) is a single-colour redraw that those terms do not
 * allow on a sign-in button.
 */
export function GoogleG({ size = 19 }: { size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 48 48">
      <Path
        fill="#4285F4"
        d="M45.12 24.5c0-1.56-.14-3.06-.4-4.5H24v8.51h11.84c-.51 2.75-2.06 5.08-4.39 6.64v5.52h7.11c4.16-3.83 6.56-9.47 6.56-16.17z"
      />
      <Path
        fill="#34A853"
        d="M24 46c5.94 0 10.92-1.97 14.56-5.33l-7.11-5.52c-1.97 1.32-4.49 2.1-7.45 2.1-5.73 0-10.58-3.87-12.31-9.07H4.34v5.7C7.96 41.07 15.4 46 24 46z"
      />
      <Path
        fill="#FBBC05"
        d="M11.69 28.18C11.25 26.86 11 25.45 11 24s.25-2.86.69-4.18v-5.7H4.34C2.85 17.09 2 20.45 2 24s.85 6.91 2.34 9.88l7.35-5.7z"
      />
      <Path
        fill="#EA4335"
        d="M24 10.75c3.23 0 6.13 1.11 8.41 3.29l6.31-6.31C34.91 4.18 29.93 2 24 2 15.4 2 7.96 6.93 4.34 14.12l7.35 5.7c1.73-5.2 6.58-9.07 12.31-9.07z"
      />
    </Svg>
  );
}

/** Lobes around the badge's rim. Twelve reads as scalloped; fewer reads as a cog. */
const LOBES = 12;
const LOBE_RING = 16.8;
const LOBE_R = 5.4;
const CORE_R = 18.6;

/**
 * The verification badge: a scalloped blue rosette with a white tick.
 *
 * The rosette is a ring of overlapping circles behind one central circle, all
 * filled from the same gradient, rather than one hand-written path. Twelve arcs
 * joined by hand is a long string nobody can adjust later; this way the lobe
 * count and depth are three numbers above.
 */
/**
 * The badge comes in three metals as well as blue.
 *
 * Each is a light-to-dark pair rather than one flat colour, because the rosette
 * only reads as a minted badge if it has a highlight and a shadow side - a flat
 * gold circle just looks yellow. The gradient runs top to bottom so all four
 * catch the light from the same direction.
 */
const TONES = {
  // The palette's Pro Supreme blue as the shadow side, a tint of the same hue
  // as the highlight - the rosette only reads as minted metal with both.
  blue: ['#5B84C9', '#3260AE'],
  gold: ['#F5C542', '#C8901A'],
  silver: ['#D8DEE6', '#9AA6B4'],
} as const;

export type BadgeTone = keyof typeof TONES;

export function VerifiedBadge({
  size = 14,
  tone = 'blue',
}: {
  size?: number;
  tone?: BadgeTone;
}) {
  const lobes = Array.from({ length: LOBES }, (_, i) => {
    const angle = (i / LOBES) * Math.PI * 2;
    return {
      cx: 24 + Math.cos(angle) * LOBE_RING,
      cy: 24 + Math.sin(angle) * LOBE_RING,
    };
  });

  const [light, dark] = TONES[tone];
  // Unique per tone. Two of these on one screen sharing an id would both take
  // whichever gradient rendered last, which is how a gold badge turns silver.
  const fillId = `verifiedFill_${tone}`;
  // Silver and gold are pale enough that a white tick disappears into them.
  const tickColor = tone === 'blue' ? '#FFFFFF' : '#5A4409';

  return (
    <Svg width={size} height={size} viewBox="0 0 48 48">
      <Defs>
        <LinearGradient id={fillId} x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0" stopColor={light} />
          <Stop offset="1" stopColor={dark} />
        </LinearGradient>
      </Defs>

      <G fill={`url(#${fillId})`}>
        {lobes.map((lobe, i) => (
          <Circle key={i} cx={lobe.cx} cy={lobe.cy} r={LOBE_R} />
        ))}
        <Circle cx={24} cy={24} r={CORE_R} />
      </G>

      {/* Stroked rather than filled, so the tick keeps an even weight and round
          ends at any size - a filled outline of the same shape goes spindly
          once this is drawn at 14dp. */}
      <Path
        d="M15.5 24.6 L21.4 30.5 L32.8 18.4"
        stroke={tickColor}
        strokeWidth={5}
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
    </Svg>
  );
}

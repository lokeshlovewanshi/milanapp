import { ReactNode, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  useWindowDimensions,
  LayoutChangeEvent,
} from 'react-native';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import FormScroll from './FormScroll';
import { auth, serif } from './theme';

const HERO = require('../assets/images/auth-hero.jpg');

/** How far the card is pulled up over the photo. */
const CARD_OVERLAP = 26;
/** Breathing room under the card. */
const SCROLL_PAD = 18;
/** Below this the photo is a slit, so the screen scrolls instead. */
const MIN_HERO = 190;
/** Above this a tablet turns the hero into a poster. */
const MAX_HERO = 430;

type Props = {
  /** Card heading, e.g. "Welcome Back". Rendered in the display serif. */
  title: string;
  /** One line under the heading. */
  subtitle: string;
  /** Shown to the right of the heading, as in the comp. */
  titleAccessory?: ReactNode;
  /** Shown to the left of the heading, for the landing screen's paired hearts. */
  titleLead?: ReactNode;
  /**
   * The two lines under the wordmark. Defaulted rather than required, so the
   * screens that were here first keep the line they were written with and only
   * the landing screen has to say what it wants.
   */
  tagline?: readonly [string, string];
  onBack?: () => void;
  /** The form. */
  children: ReactNode;
};

/**
 * The shared shell for sign-in and sign-up: photographic hero, wordmark, and a
 * white card carrying the form.
 *
 * One component rather than the same JSX pasted into both screens, for the
 * reason the two screens have already caused trouble once - they had drifted
 * far enough apart to send the same account to two different destinations. A
 * shell they both consume cannot drift.
 *
 * Everything fits one screen: no scrolling to reach the button you came for.
 *
 * The hero takes whatever height the card leaves, measured rather than guessed.
 * A fixed fraction cannot work when the two screens carry different forms -
 * sign-up has five fields to sign-in's two, so the same fraction that frames
 * the couple nicely on one pushes the other's button off the bottom. Measuring
 * means each screen ends up exactly full, and a device this was never tried on
 * gets the same treatment.
 *
 * Below MIN_HERO the photo would be a letterbox slit, so it stops there and the
 * content is allowed to scroll instead - which is the honest outcome on a small
 * screen with a five-field form, and still keeps the keyboard behaviour that
 * FormScroll provides.
 *
 * Photo and wordmark are two columns, not text floated over a full-bleed image,
 * and that is load-bearing. The source is far taller than any hero strip, so
 * `cover` across the full width crops it vertically and lands the couple's
 * faces exactly where the wordmark goes. Giving the photo its own column of
 * roughly the source's own aspect ratio means almost nothing is cropped, the
 * couple sit where the comp puts them, and the type is never fighting a face
 * for contrast on any screen size.
 */
export default function AuthHero({
  title,
  subtitle,
  titleAccessory,
  titleLead,
  tagline = ['Find the one who', 'completes your story.'],
  onBack,
  children,
}: Props) {
  const { height } = useWindowDimensions();
  const insets = useSafeAreaInsets();

  const [cardHeight, setCardHeight] = useState(0);
  const onCardLayout = (e: LayoutChangeEvent) => {
    const h = Math.round(e.nativeEvent.layout.height);
    // Only grow-or-settle, and ignore sub-pixel jitter: feeding every layout
    // straight back into the hero height that determines this layout is a loop
    // that can oscillate forever on a fractional value.
    setCardHeight((prev) => (Math.abs(prev - h) > 1 ? h : prev));
  };

  // CARD_OVERLAP is added back because the card is pulled up over the hero, so
  // that much of its height costs nothing.
  const available = height - insets.bottom - SCROLL_PAD + CARD_OVERLAP;
  const heroHeight = cardHeight
    ? Math.min(Math.max(available - cardHeight, MIN_HERO), MAX_HERO)
    : Math.min(Math.max(height * 0.42, MIN_HERO), MAX_HERO);

  // The wordmark's full treatment needs room. Rather than let it collide with
  // the card, it drops the least load-bearing parts first: the tagline, then
  // the rings, and the type comes down a size.
  const roomy = heroHeight >= 300;
  // Just below MIN_HERO, so the mark survives even on the shortest hero. It
  // costs nothing there: the brand column has room the photo column does not.
  const mid = heroHeight >= 185;

  return (
    <View style={styles.container}>
      <FormScroll contentContainerStyle={styles.scroll}>
        <View style={[styles.hero, { height: heroHeight }]}>
          <View style={styles.photoCol}>
            <Image
              source={HERO}
              style={StyleSheet.absoluteFill}
              contentFit="cover"
              // Top, not centre. A tall hero has no vertical overflow to
              // position, so this only bites on the short one sign-up gets -
              // and there, centring crops the band the faces are in. Anchoring
              // the top keeps the faces and gives up the flowers at the bottom,
              // which is the right thing to lose.
              contentPosition="top center"
              transition={200}
            />
            {/* Feathers the photo into the cream column so the two read as one
                scene rather than a photo pasted next to a panel. */}
            <LinearGradient
              colors={['rgba(252,242,238,0)', auth.cream]}
              start={{ x: 0, y: 0.5 }}
              end={{ x: 1, y: 0.5 }}
              style={styles.feather}
              pointerEvents="none"
            />
          </View>

          <View style={[styles.brand, { paddingTop: insets.top + 8 }]}>
            {mid && (
              <View style={styles.rings}>
                <View style={styles.ring} />
                <View style={[styles.ring, styles.ringOverlap]} />
              </View>
            )}

            <Text style={[styles.wordmark, !roomy && styles.wordmarkTight]}>Forever</Text>
            <Text style={[styles.wordmark, !roomy && styles.wordmarkTight]}>Together</Text>

            <View style={styles.rule}>
              <View style={styles.ruleLine} />
              <Ionicons name="heart" size={13} color={auth.blush} />
              <View style={styles.ruleLine} />
            </View>

            {roomy && (
              <>
                <Text style={styles.tagline}>{tagline[0]}</Text>
                <Text style={styles.tagline}>{tagline[1]}</Text>
              </>
            )}
          </View>

          {onBack && (
            <TouchableOpacity
              testID="auth-back-btn"
              style={[styles.back, { top: insets.top + 8 }]}
              onPress={onBack}
              hitSlop={10}
              accessibilityRole="button"
              accessibilityLabel="Go back"
            >
              <Ionicons name="arrow-back" size={22} color={auth.maroon} />
            </TouchableOpacity>
          )}
        </View>

        {/* Pulled up over the hero so the card overlaps the photo rather than
            butting against it, as in the comp. */}
        <View style={styles.card} onLayout={onCardLayout}>
          {/* The accessory is nested inside the Text rather than sat beside it
              in a row. As siblings the heading had to share a line's width with
              it and got ellipsised to "Welcom..." once the layout settled;
              nested, the glyph is just another character in the run. */}
          <Text style={styles.cardTitle} numberOfLines={1}>
            {titleLead ? <Text>{titleLead}  </Text> : null}
            {title}
            {titleAccessory ? <Text>  {titleAccessory}</Text> : null}
          </Text>
          <Text style={styles.cardSubtitle}>{subtitle}</Text>

          {children}
        </View>
      </FormScroll>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: auth.cream },
  scroll: { paddingBottom: SCROLL_PAD },

  hero: { width: '100%', flexDirection: 'row', backgroundColor: auth.cream },
  // The asset is 740x1230 (0.60); this column lands near that on a phone, so
  // `cover` trims a little from the sides and nothing from the couple.
  photoCol: { width: '52%', height: '100%' },
  feather: { position: 'absolute', top: 0, bottom: 0, right: 0, width: '28%' },
  brand: {
    width: '48%',
    alignItems: 'center',
    paddingHorizontal: 10,
  },

  // Two outlined circles, offset - the interlocking-rings mark from the comp.
  // Drawn rather than shipped as an asset: it is two borders, and an image
  // would be another file to keep in sync with the palette.
  rings: { flexDirection: 'row', marginTop: 2, marginBottom: 6 },
  ring: {
    width: 34,
    height: 34,
    borderRadius: 17,
    borderWidth: 3,
    borderColor: '#C97B6E',
  },
  ringOverlap: { marginLeft: -13 },

  wordmark: {
    fontFamily: serif,
    fontSize: 34,
    lineHeight: 40,
    color: auth.maroon,
    textAlign: 'center',
  },
  rule: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 8 },
  ruleLine: { width: 34, height: 1, backgroundColor: auth.blush },
  wordmarkTight: { fontSize: 27, lineHeight: 32 },
  tagline: {
    fontSize: 13,
    lineHeight: 18,
    color: auth.olive,
    textAlign: 'center',
    marginTop: 2,
  },

  back: {
    position: 'absolute',
    left: 16,
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.82)',
  },

  card: {
    marginTop: -CARD_OVERLAP,
    marginHorizontal: 14,
    backgroundColor: '#FFFFFF',
    borderRadius: 26,
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 16,
    // Soft, wide and barely there - the comp's card lifts off the paper without
    // a visible edge.
    shadowColor: '#7B1220',
    shadowOpacity: 0.08,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 8 },
    elevation: 4,
  },
  cardTitle: {
    fontFamily: serif,
    fontSize: 29,
    lineHeight: 36,
    color: auth.maroon,
    textAlign: 'center',
  },
  cardSubtitle: {
    fontSize: 14,
    color: auth.muted,
    textAlign: 'center',
    marginTop: 2,
    marginBottom: 16,
  },
});

import { Platform } from 'react-native';

/**
 * Shared design tokens.
 *
 * The layout language is Instagram's - story rail, feed cards, flat rows with a
 * trailing action button - but on a light surface with the app's existing pink
 * accent instead of Instagram's blue, so these screens sit next to the
 * login/register screens without a jarring switch.
 */

/**
 * The one colour a primary button is ever filled with.
 *
 * Same value as the landing screen's background, so Log in and Sign up read as
 * the same product as the screen that sent you to them. Declared above `colors`
 * so `accentAlt` can point at it rather than repeating the literal - two copies
 * of a brand colour drift apart the first time someone tweaks one.
 */
const BRAND = '#F43F5E';

export const colors = {
  // Surfaces
  bg: '#FFFFFF',
  surface: '#FAFAFA',
  elevated: '#FFFFFF',

  // Text
  text: '#262626',
  textMuted: '#8E8E8E',
  textFaint: '#C7C7C7',

  // Editor typography. The edit sheets use a slate heading and a cooler grey
  // for field labels than the feed does - matching the reference screens, where
  // form chrome reads as quieter than content.
  heading: '#2E3E4E',
  fieldLabel: '#7A8794',
  fieldValue: '#1F2933',

  // Lines
  border: '#DBDBDB',
  hairline: '#EFEFEF',

  // Accent - the pink used for highlights and small chrome.
  accent: '#EC4899',
  /**
   * Fill behind a selected chip, a highlighted plan, a tinted card.
   *
   * From the supplied palette ("Self-Service Highlight"). Warmer and less
   * saturated than the old #FCE7F0, so a selected row reads as marked rather
   * than as a second button competing with Save.
   */
  accentSoft: '#FBE8EA',
  /**
   * The outline that goes with `accentSoft`.
   *
   * Its own token rather than reusing the maroon button fill: at 1px a
   * near-black red disappears into the border grey, and the palette gives a
   * lighter red specifically for this.
   */
  highlightBorder: '#E66B7B',

  /** Primary button fill. `accentAlt` is the older name for the same colour. */
  brand: BRAND,
  accentAlt: BRAND,

  // Secondary action colour, used where Instagram uses blue.
  link: '#3260AE',

  // Status
  online: '#22C55E',
  star: '#F59E0B',
  danger: '#ED4956',
  white: '#FFFFFF',

  /**
   * The verification tick, and the trust strip that makes the same promise.
   *
   * Blue rather than the app's red, and deliberately the blue every other app
   * uses for this. A tick in the brand colour reads as decoration; this one is
   * a claim about the person, and it should look like the claim people already
   * know how to read.
   */
  verified: '#3260AE',
  /**
   * The deeper blue, for anything that carries white text or needs weight.
   *
   * The tick's blue is tuned to read on a white card at 14dp; at the size of a
   * button fill or a row of trust icons it goes pale and washed out.
   */
  verifiedDeep: '#3260AE',
} as const;

/** Story-ring sweep. Instagram runs warm; this leans into the app's pink. */
export const storyRing = ['#F59E0B', '#EC4899', '#8B5CF6'] as const;

/** Primary button sweep - identical to login/register so buttons match. */
export const accentGradient = ['#EC4899', '#F43F5E'] as const;

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
} as const;

export const radius = {
  sm: 8,
  md: 10,
  lg: 16,
  pill: 24,
} as const;

export const font = {
  caption: 11,
  small: 12,
  body: 13,
  label: 14,
  title: 15,
  heading: 18,
} as const;

/**
 * Profile records come back from several endpoints with slightly different
 * shapes (`/users` returns the profile flat, `/views` nests it under `profile`,
 * and image fields have been spelled both ways). These readers keep that mess
 * in one place instead of spread across every screen.
 */
export type Profile = Record<string, any>;

export const unwrapProfile = (item: Profile): Profile =>
  item?.likedProfile ?? item?.profile ?? item?.user ?? item?.viewerProfile ?? item?.viewedBy ?? item ?? {};

export const profileId = (item: Profile): string | number | undefined => {
  const p = unwrapProfile(item);
  return p.id ?? p.profileId ?? item?.id;
};

export const profileName = (item: Profile): string => {
  const p = unwrapProfile(item);
  return p.name || p.fullName || 'Anonymous';
};

/**
 * Display code shown under the name, e.g. GM00147.
 *
 * The API returns ids in JM format ("JM00147") - UserProfileMapper runs every
 * id through CommonUtils.convertToJMFormat - and the UI swaps that prefix for
 * "GM". The JM prefix is stripped rather than kept alongside GM, so a bare
 * numeric id and one already carrying "JM" both land on the same "GM#####".
 */
export const profileCode = (item: Profile): string => {
  const p = unwrapProfile(item);
  if (p.code) return String(p.code);

  const id = profileId(item);
  if (id == null) return '';

  const raw = String(id);
  const digits = raw.startsWith('JM') ? raw.slice(2) : raw.padStart(5, '0');
  return `GM${digits}`;
};

/**
 * The numeric id behind whatever someone typed into an ID box.
 *
 * Members read their code off the screen as "GM00234" and type it back that
 * way, so anything that only accepts digits rejects the one form the app itself
 * displays. Stripping to digits accepts "GM00234", "JM00234", "00234" and
 * "234" as the same person, which they are.
 */
export const parseProfileId = (input: string): number | null => {
  const digits = String(input ?? '').replace(/\D/g, '');
  if (!digits) return null;
  const id = Number(digits);
  return Number.isFinite(id) && id > 0 ? id : null;
};

/**
 * Does this profile match what was typed into a search box - by name or by id?
 *
 * One helper rather than a filter written at each list, because "search" should
 * mean the same thing on every screen that offers it. The lists used to match
 * on name alone, so the code printed under everybody's name was the one thing
 * you could read off a profile and not then search for.
 */
export const profileMatches = (item: Profile, query: string): boolean => {
  const q = query.trim().toLowerCase();
  if (!q) return true;

  if (profileName(item).toLowerCase().includes(q)) return true;

  const code = profileCode(item).toLowerCase();
  if (code && code.includes(q)) return true;

  // Compares the numbers rather than the strings, so a code typed without its
  // leading zeros still finds the row that has them.
  const typed = parseProfileId(q);
  const actual = parseProfileId(code);
  return typed !== null && actual !== null && typed === actual;
};

/** Thumbnail-sized (~4KB) - the default for a small round avatar or a list row. */
export const profileImage = (item: Profile): string | null => {
  const p = unwrapProfile(item);
  return (
    p.profileImage ||
    p.profile_image ||
    p.imageUrl ||
    (Array.isArray(p.profileImages) ? p.profileImages[0] : null) ||
    null
  );
};

/**
 * Full-resolution original, for the few places a photo is shown large enough
 * to be worth the extra bytes: the home rail's portrait card, the swipe deck,
 * the full-screen feed photo. Falls back to the thumbnail field for any
 * response shape that predates profileImageFull, rather than showing nothing.
 */
export const profileImageFull = (item: Profile): string | null => {
  const p = unwrapProfile(item);
  return p.profileImageFull || profileImage(item);
};

/**
 * Resolves a stored code to its display label.
 *
 * Pass the `label` function from useReference. Without it the raw value is
 * returned, which is why list rows showed "H_66" and "SOFTWARE_ENGINEER" -
 * profiles store codes, and only screens that looked the code up rendered
 * anything readable.
 */
export type LabelFn = (category: string, code?: string | null) => string;

const resolve = (label: LabelFn | undefined, category: string, value?: string | null): string => {
  if (!value) return '';
  return label ? label(category, value) || String(value) : String(value);
};

export const profileLocation = (item: Profile): string => {
  const p = unwrapProfile(item);
  const parts = [p.city, p.state].filter(Boolean);
  return parts.length ? parts.join(', ') : '';
};

/** "24 yrs · 5' 6" · Software Engineer · Bhopal, MP" - skipping anything missing. */
export const profileSubtitle = (item: Profile, label?: LabelFn): string => {
  const p = unwrapProfile(item);
  const age = profileAge(item);
  const ageStr = age ? `${age} yrs` : '';
  const heightStr = resolve(label, 'height', p.height);
  const profStr = resolve(label, 'profession', p.profession);
  const locStr = profileLocation(item);

  return [
    ageStr,
    heightStr,
    profStr,
    locStr,
  ]
    .filter(Boolean)
    .join(' · ');
};

/**
 * Whether to show the verification tick next to someone's name.
 *
 * Vetting is a human job and nothing records the outcome yet, so this defaults
 * to true and every profile shows the tick. It reads the flag first rather than
 * returning a bare `true` so that the day the column exists, switching the app
 * over is a change to this one default and nothing else - every screen already
 * asks the right question.
 */
export const profileVerified = (item: Profile): boolean => {
  const p = unwrapProfile(item);
  const flag = p.verified ?? p.isVerified ?? p.profileVerified;
  return flag === undefined || flag === null ? true : Boolean(flag);
};

/** Whether the user is currently online (active within 5 min). */
export const profileIsOnline = (item: Profile): boolean => {
  const p = unwrapProfile(item);
  return Boolean(p.isOnline ?? p.online);
};

/** Years from date of birth, or null when it is missing or unparseable. */
export const profileAge = (item: Profile): number | null => {
  const p = unwrapProfile(item);
  const raw = p.dateOfBirth ?? p.dob;
  if (!raw) return null;

  const dob = new Date(raw);
  if (Number.isNaN(dob.getTime())) return null;

  const now = new Date();
  let age = now.getFullYear() - dob.getFullYear();
  // Birthday not reached this year yet.
  const monthDiff = now.getMonth() - dob.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && now.getDate() < dob.getDate())) age -= 1;

  return age > 0 && age < 120 ? age : null;
};

/**
 * The summary lines shown on a feed card: profession, employer, education and
 * earnings, with codes resolved and anything missing dropped.
 *
 * Returned as an array rather than one joined string so the card can wrap onto
 * separate lines the way a matrimony listing reads, instead of one long run-on.
 */
export const profileHighlights = (item: Profile, label?: LabelFn): string[] => {
  const p = unwrapProfile(item);

  const work = [
    resolve(label, 'employed_in', p.employedIn),
    resolve(label, 'profession', p.profession),
  ]
    .filter(Boolean)
    .join(' - ');

  const company = p.organization || p.workCity || '';
  const earning = resolve(label, 'annual_income', p.annualIncome);
  const education = resolve(label, 'education', p.education);

  return [
    [work, company].filter(Boolean).join(' · '),
    [education, earning && `Earns ${earning}`].filter(Boolean).join(' · '),
  ].filter(Boolean);
};

/** "R B, 29 · 5' 6" · Chandigarh" style identity line. */
export const profileHeadline = (item: Profile, label?: LabelFn): string => {
  const p = unwrapProfile(item);
  const age = profileAge(item);

  return [
    age ? `${age} yrs` : '',
    resolve(label, 'height', p.height),
    profileLocation(item),
  ]
    .filter(Boolean)
    .join(' · ');
};

/** Full descriptive relative time formatting for cards: e.g. "Sent 2 weeks ago", "Received 3 days ago" */
export const formatFullTimeAgo = (value?: string | number | Date, prefix?: string): string => {
  if (!value) return '';
  const then = new Date(value).getTime();
  if (Number.isNaN(then)) return '';
  const diffMs = Date.now() - then;
  const mins = Math.max(0, Math.floor(diffMs / 60000));

  let timeStr = '';
  if (mins < 1) {
    return prefix ? `${prefix} just now` : 'Just now';
  } else if (mins < 60) {
    timeStr = mins === 1 ? '1 minute ago' : `${mins} minutes ago`;
  } else {
    const hours = Math.floor(mins / 60);
    if (hours < 24) {
      timeStr = hours === 1 ? '1 hour ago' : `${hours} hours ago`;
    } else {
      const days = Math.floor(hours / 24);
      if (days < 7) {
        timeStr = days === 1 ? '1 day ago' : `${days} days ago`;
      } else if (days < 30) {
        const weeks = Math.floor(days / 7);
        timeStr = weeks === 1 ? '1 week ago' : `${weeks} weeks ago`;
      } else if (days < 365) {
        const months = Math.floor(days / 30);
        timeStr = months === 1 ? '1 month ago' : `${months} months ago`;
      } else {
        const years = Math.floor(days / 365);
        timeStr = years === 1 ? '1 year ago' : `${years} years ago`;
      }
    }
  }

  return prefix ? `${prefix} ${timeStr}` : timeStr;
};

/** Relative time for "viewed 2 hours ago" or "2 weeks ago" style labels. */
export const timeAgo = (value?: string | number | Date): string => {
  return formatFullTimeAgo(value);
};

/**
 * The one shape a profile photo is ever displayed at.
 *
 * Photos used to be cropped to 3:4 at upload but shown in a near-square header
 * (width x 1.05). `cover` then rescaled the tall image to fill the wider box and
 * trimmed the overflow off the top and bottom - roughly 130px on a normal phone,
 * taken from exactly where a face sits. People cropped their photo carefully and
 * still lost their forehead and chin.
 *
 * Every surface that renders a photo - crop frame, profile header, swipe card,
 * carousel - now derives its height from this, so what the user frames while
 * cropping is what everyone else sees. Changing this number moves all of them
 * together; hardcoding a height anywhere else reintroduces the bug.
 */
export const PHOTO_ASPECT = 3 / 4;

/** Display height for a photo of the given width. */
export const photoHeight = (width: number): number => Math.round(width / PHOTO_ASPECT);

/**
 * The sign-in / sign-up palette.
 *
 * Deliberately its own group rather than additions to `colors`. These screens
 * were redesigned to a supplied comp - warm cream, deep maroon, a photographic
 * hero - and the rest of the app is still on the rose `BRAND` above. Keeping
 * the two sets apart means neither can quietly bleed into the other: nothing in
 * the feed picks up maroon by reaching for `colors.brand`, and the auth screens
 * do not drift back to rose when someone tunes the feed.
 *
 * When the rest of the app is brought over, these move into `colors` and this
 * group goes away.
 */
export const auth = {
  /** Page behind the hero and around the card. Matches the comp's paper. */
  cream: '#FCF2EE',
  /** Display type: "Forever Together", "Welcome Back". */
  maroon: '#7B1220',
  /** Primary button, top of its fill. */
  crimson: '#A5122F',
  /**
   * A lighter pair for the profile prompt's call to action.
   *
   * The prompt sits on a pale pink card, where the full crimson-to-deep
   * gradient reads almost black - heavy for an invitation rather than a
   * commitment. Same hue, lifted.
   */
  crimsonLight: '#C4204A',
  crimsonLightDeep: '#A5122F',

  /**
   * The red the New badge uses, and now every icon on home.
   *
   * One accent across the screen rather than three near-identical reds: the
   * badge was danger red, the icons crimson, the ring crimson again, and at a
   * glance they read as a colour that could not decide.
   */
  iconRed: '#ED4956',
  /** Ends the ring's sweep. Same hue, darker, so the arc has direction. */
  iconRedDeep: '#A5122F',
  /** Primary button, bottom of its fill. */
  crimsonDeep: '#6B0D1B',
  /** Links: "Forgot Password?", "Create an Account". */
  link: '#A3122B',
  /** The small heart and arrows under the wordmark. */
  blush: '#D98A86',
  /** Tagline under the wordmark - olive-gold in the comp, not grey. */
  olive: '#7A6A3A',
  /** Field icons. */
  amber: '#C8622A',
  /** Field outlines and the OR rule. */
  line: '#EFE0DA',
  /** Field labels above each input. */
  label: '#1A1A1A',
  /** Secondary copy inside the card. */
  muted: '#6B7280',
} as const;

/**
 * A serif for display type, without shipping a font file.
 *
 * The comp uses an elegant serif for the wordmark and card headings. Bundling
 * one would add roughly 150-400KB per weight to an APK that took real work to
 * get down to 18MB, so this uses what each platform already has. Android's
 * "serif" is Noto Serif and iOS gets Georgia; neither is the comp's exact face,
 * but both read as the same intent.
 */
export const serif = Platform.select({ ios: 'Georgia', android: 'serif', default: 'serif' });

/**
 * The lift under a list card.
 *
 * A shadow rather than a border, because the two do different jobs: a border
 * draws a boundary on the same plane, a shadow puts the card in front of the
 * page. The comp separates rows by depth, and a hairline outline reads flat
 * next to it however round the corners are.
 *
 * iOS takes the four shadow* properties; Android ignores every one of them and
 * takes `elevation` alone, so both have to be set or the effect exists on one
 * platform only.
 */
export const cardShadow = {
  // Black, not the brand maroon. A tinted shadow on a white card does not read
  // as depth, it reads as a coloured halo around the edge - which is the pink
  // wash this was meant to remove, reintroduced by the thing replacing it.
  shadowColor: '#000000',
  shadowOpacity: 0.08,
  shadowRadius: 12,
  shadowOffset: { width: 0, height: 4 },
  elevation: 3,
} as const;

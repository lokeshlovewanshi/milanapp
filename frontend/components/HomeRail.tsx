import { memo, useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  useWindowDimensions,
  Animated,
  Easing,
} from 'react-native';
import { Image } from 'expo-image';
import Ionicons from '@expo/vector-icons/Ionicons';
import AvatarFallback from './AvatarFallback';
import { VerifiedBadge } from './BrandIcons';
import { useReference } from '../utils/useReference';
import { connectionAction, type ConnectionState } from '../utils/useConnections';
import { formatHeight } from '../utils/shareProfile';
import {
  colors,
  font,
  radius,
  spacing,
  auth,
  profileId,
  profileName,
  profileImageFull,
  profileAge,
  profileLocation,
  profileVerified,
  type Profile,
} from './theme';

/** A profile counts as "New" for this long after it was created. */
const NEW_FOR_DAYS = 14;

/** Size of the heart that flies from Connect to the shortlist badge. */
const FLY_HEART_SIZE = 20;

type Props = {
  title: string;
  profiles: Profile[];
  /**
   * "filled" is the lead rail - larger photo, solid Connect. "outline" is the
   * secondary one, which the comp draws smaller with a hollow button so the two
   * rails do not compete for the same attention.
   */
  variant?: 'filled' | 'outline';
  stateOf: (id: string | number | undefined | null) => ConnectionState;
  onConnect: (id: string | number) => void;
  onPressProfile: (id: string | number) => void;
  onShortlist: (id: string | number) => void;
  isShortlisted: (id: string | number | undefined | null) => boolean;
  onSeeAll: () => void;
};

const isNew = (profile: Profile): boolean => {
  const raw = (profile as any)?.createdAt;
  if (!raw) return false;
  const at = new Date(raw).getTime();
  if (Number.isNaN(at)) return false;
  return Date.now() - at < NEW_FOR_DAYS * 24 * 60 * 60 * 1000;
};

type RailCardProps = {
  profile: Profile;
  uri: string | null;
  age: number | null;
  height: string | undefined;
  profession: string | undefined;
  place: string | undefined;
  filled: boolean;
  cardWidth: number;
  state: ConnectionState;
  saved: boolean;
  onConnect: () => void;
  onShortlist: () => void;
  onPress: () => void;
};

/**
 * One card in a rail. Its own component (rather than inline in the map)
 * because the Connect-to-shortlist heart animation needs hooks - a ref to
 * measure the Connect button and the badge it flies to, and state to drive
 * the flight - none of which a plain `.map()` callback can hold.
 */
function RailCard({
  profile,
  uri,
  age,
  height,
  profession,
  place,
  filled,
  cardWidth,
  state,
  saved,
  onConnect,
  onShortlist,
  onPress,
}: RailCardProps) {
  const action = connectionAction(state);
  // A request sent or accepted from this card - the badge becomes a heart
  // once that happens, in place of the shortlist bookmark.
  const liked = state === 'SENT' || state === 'CONNECTED';

  const cardRef = useRef<View>(null);
  const connectRef = useRef<View>(null);
  const badgeRef = useRef<View>(null);
  const wasLikedRef = useRef(liked);

  const [flying, setFlying] = useState(false);
  const [flyOrigin, setFlyOrigin] = useState({ x: 0, y: 0 });
  // The path is a curve, not a straight line, so translateX/Y are sampled off
  // a quadratic bezier at several points and interpolated between them - one
  // driving value for the whole flight rather than a separate one per axis.
  const [flyArc, setFlyArc] = useState<{ t: number[]; x: number[]; y: number[] } | null>(null);
  const flyProgress = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (liked && !wasLikedRef.current) {
      const cardNode = cardRef.current;
      const connectNode = connectRef.current;
      const badgeNode = badgeRef.current;

      if (cardNode && connectNode && badgeNode) {
        cardNode.measureInWindow((cx, cy) => {
          connectNode.measureInWindow((sx, sy, sw, sh) => {
            badgeNode.measureInWindow((ex, ey, ew, eh) => {
              const startX = sx - cx + sw / 2 - FLY_HEART_SIZE / 2;
              const startY = sy - cy + sh / 2 - FLY_HEART_SIZE / 2;
              const endX = ex - cx + ew / 2 - FLY_HEART_SIZE / 2;
              const endY = ey - cy + eh / 2 - FLY_HEART_SIZE / 2;

              // Delta space, relative to the start point - P0 is the origin,
              // P2 the badge. P1 bows out to the side of the straight line so
              // the heart arcs up and over instead of cutting straight across
              // the photo.
              const dx = endX - startX;
              const dy = endY - startY;
              const dist = Math.hypot(dx, dy) || 1;
              const bow = Math.min(dist * 0.45, 70);
              const controlX = dx / 2 - (dy / dist) * bow;
              const controlY = dy / 2 + (dx / dist) * bow;

              const STEPS = 8;
              const t: number[] = [];
              const x: number[] = [];
              const y: number[] = [];
              for (let i = 0; i <= STEPS; i++) {
                const p = i / STEPS;
                const inv = 1 - p;
                t.push(p);
                x.push(2 * inv * p * controlX + p * p * dx);
                y.push(2 * inv * p * controlY + p * p * dy);
              }

              setFlyOrigin({ x: startX, y: startY });
              setFlyArc({ t, x, y });
              flyProgress.setValue(0);
              setFlying(true);

              Animated.timing(flyProgress, {
                toValue: 1,
                duration: 650,
                easing: Easing.out(Easing.quad),
                useNativeDriver: true,
              }).start(() => setFlying(false));
            });
          });
        });
      }
    }
    wasLikedRef.current = liked;
  }, [liked, flyProgress]);

  return (
    <View ref={cardRef} style={[styles.card, { width: cardWidth }]}>
      <TouchableOpacity activeOpacity={0.9} onPress={onPress}>
        <View style={styles.photoWindow}>
          {uri ? (
            <Image source={{ uri }} style={styles.photo} contentFit="cover" contentPosition="top" />
          ) : (
            <View style={[styles.photo, styles.photoFallback]}>
              <AvatarFallback profile={profile} glyphSize={38} />
            </View>
          )}

          {filled && isNew(profile) && (
            <View style={styles.newBadge}>
              <Text style={styles.newText}>New</Text>
            </View>
          )}

          {liked ? (
            // Connected - the badge is now just a fact about the pair, not a
            // control, so it is a plain View rather than a button.
            <View ref={badgeRef} style={styles.save} accessibilityLabel="Connected">
              <Ionicons name="heart" size={15} color={colors.danger} />
            </View>
          ) : (
            <TouchableOpacity
              ref={badgeRef}
              style={styles.save}
              hitSlop={8}
              onPress={onShortlist}
              accessibilityRole="button"
              accessibilityLabel={saved ? 'Remove from shortlist' : 'Add to shortlist'}
            >
              {/* Black outline until it is saved, then filled in the New
                  badge's red - so "I saved this" is legible from across
                  the rail rather than being a change of icon weight. */}
              <Ionicons
                name={saved ? 'bookmark' : 'bookmark-outline'}
                size={15}
                color={saved ? colors.danger : '#000000'}
              />
            </TouchableOpacity>
          )}
        </View>

        <View style={styles.body}>
          {/* The name shrinks and the tick does not: as siblings in a
              row a long name would push the tick off the card, and the
              tick is the part that has to survive. */}
          <View style={styles.nameRow}>
            <Text style={styles.name} numberOfLines={1}>
              {profileName(profile)}
            </Text>
            {profileVerified(profile) && <VerifiedBadge size={14} />}
          </View>

          {/* Age and height on one line, the way a listing reads. Each
              is dropped rather than printed empty when missing, so a
              sparse profile does not show a stray bullet. */}
          {!!(age || height) && (
            <Text style={styles.meta} numberOfLines={1}>
              {[age ? `${age} yrs` : '', height].filter(Boolean).join(' • ')}
            </Text>
          )}

          {!!profession && (
            <Text style={styles.meta} numberOfLines={1}>
              {profession}
            </Text>
          )}

          {!!place && filled && (
            <Text style={styles.place} numberOfLines={1}>
              {place}
            </Text>
          )}
        </View>
      </TouchableOpacity>

      {/* Outside the card body's flex so it always sits on the bottom
          edge, level across the rail. */}
      <View style={styles.spacer} />

      <TouchableOpacity
        ref={connectRef}
        style={[styles.connect, !filled && styles.connectOutline, action.variant === 'muted' && styles.connectMuted]}
        activeOpacity={0.85}
        disabled={action.disabled}
        onPress={onConnect}
        accessibilityRole="button"
      >
        {/* Withdraw drops the heart - it is taking a request back, not
            expressing interest, so the icon that means "I like this profile"
            no longer belongs on the button. */}
        {action.label !== 'Withdraw' && (
          <Ionicons
            name="heart-outline"
            size={14}
            color={filled && action.variant !== 'muted' ? colors.white : colors.danger}
          />
        )}
        <Text
          style={[
            styles.connectText,
            (!filled || action.variant === 'muted') && styles.connectTextOutline,
            action.label === 'Withdraw' && styles.connectTextWithdraw,
          ]}
          numberOfLines={1}
        >
          {action.label}
        </Text>
      </TouchableOpacity>

      {flying && flyArc && (
        <Animated.View
          pointerEvents="none"
          style={[
            styles.flyHeart,
            {
              left: flyOrigin.x,
              top: flyOrigin.y,
              opacity: flyProgress.interpolate({
                inputRange: [0, 0.65, 1],
                outputRange: [1, 1, 0],
              }),
              transform: [
                {
                  translateX: flyProgress.interpolate({ inputRange: flyArc.t, outputRange: flyArc.x }),
                },
                {
                  translateY: flyProgress.interpolate({ inputRange: flyArc.t, outputRange: flyArc.y }),
                },
                {
                  // Big to small - it starts larger than its resting size and
                  // shrinks down to a fraction of it as it lands on the badge.
                  scale: flyProgress.interpolate({ inputRange: [0, 1], outputRange: [1.6, 0.35] }),
                },
              ],
            },
          ]}
        >
          <Ionicons name="heart" size={FLY_HEART_SIZE} color={colors.danger} />
        </Animated.View>
      )}
    </View>
  );
}

/**
 * A horizontal rail of profile cards on the home screen.
 *
 * The photo is a 4:5 portrait thumbnail, cropped from the top so a face never
 * loses its forehead the way a centred crop on a tall photo does. A rail
 * exists to let someone compare several people at a glance, and a card tall
 * enough to show a whole portrait fits one and a half on screen - at which
 * point it is a feed with extra steps.
 *
 * Cards are a fixed width and stretch to a common height, so the Connect button
 * lands on the same line across the rail whatever each profile has filled in.
 */
function HomeRail({
  title,
  profiles,
  variant = 'filled',
  stateOf,
  onConnect,
  onPressProfile,
  onShortlist,
  isShortlisted,
  onSeeAll,
}: Props) {
  const { width } = useWindowDimensions();
  const { label } = useReference();

  if (profiles.length === 0) return null;

  const filled = variant === 'filled';
  // A card and most of the second - the cut edge is what tells you it scrolls.
  const cardWidth = Math.min(Math.max(width * (filled ? 0.51 : 0.49), 183), 244);

  return (
    <View style={styles.wrap}>
      <View style={styles.header}>
        <Text style={styles.heading} numberOfLines={1}>
          {title}
        </Text>
        <TouchableOpacity onPress={onSeeAll} hitSlop={8} accessibilityRole="button">
          <Text style={styles.seeAll}>See all</Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.list}
      >
        {profiles.map((profile, index) => {
          const id = profileId(profile);
          const uri = profileImageFull(profile);
          const age = profileAge(profile);
          const height = formatHeight(label('height', (profile as any)?.height) || (profile as any)?.height);
          const profession = label('profession', (profile as any)?.profession);
          const place = profileLocation(profile);
          const state = stateOf(id);
          const saved = isShortlisted(id);

          return (
            <RailCard
              key={String(id ?? index)}
              profile={profile}
              uri={uri}
              age={age}
              height={height}
              profession={profession}
              place={place}
              filled={filled}
              cardWidth={cardWidth}
              state={state}
              saved={saved}
              onConnect={() => id != null && onConnect(id)}
              onShortlist={() => id != null && onShortlist(id)}
              onPress={() => id != null && onPressProfile(id)}
            />
          );
        })}

        {/* End of the rail - a card rather than a plain link, so it keeps the
            same tap target size as the profiles beside it. Goes to the same
            place "See all" in the header does. */}
        <TouchableOpacity
          activeOpacity={0.85}
          onPress={onSeeAll}
          style={[styles.moreCard, { width: cardWidth }]}
          accessibilityRole="button"
          accessibilityLabel="See all profiles"
        >
          <View style={styles.moreIconWrap}>
            <Ionicons name="search" size={22} color={auth.crimsonLight} />
          </View>
          <Text style={styles.moreText}>See more</Text>
          <Text style={styles.moreTextHindi}>और देखें</Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { paddingTop: spacing.lg },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    marginBottom: spacing.sm,
  },
  heading: { fontSize: font.title, fontWeight: '700', color: colors.text },
  seeAll: { fontSize: font.body, fontWeight: '600', color: auth.crimson },

  // stretch, so every card matches the tallest and the buttons line up.
  list: {
    paddingHorizontal: spacing.md,
    gap: spacing.md,
    paddingVertical: 4,
    alignItems: 'stretch',
  },
  card: {
    borderRadius: radius.lg,
    backgroundColor: colors.white,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: '#EFE0DA',
    overflow: 'hidden',
    paddingBottom: spacing.sm,
    // A soft lift rather than a hard edge, as in the comp.
    shadowColor: auth.maroon,
    shadowOpacity: 0.06,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 3 },
    elevation: 2,
  },

  // 4:5 portrait, not a fixed pixel height - the window grows with the card's
  // own width instead of a JS-computed height that had gone nearly square and
  // pushed `cover` into centre-cropping foreheads off half the rail.
  photoWindow: { width: '100%', aspectRatio: 4 / 5, backgroundColor: colors.surface },
  photo: { width: '100%', height: '100%' },
  photoFallback: { alignItems: 'center', justifyContent: 'center' },

  newBadge: {
    position: 'absolute',
    top: spacing.sm,
    left: spacing.sm,
    // Red, where the bookmark beside it is pink. They sit in opposite corners
    // of the same photo and say different things - one is a fact about the
    // profile, the other a control you can press - so they should not read as
    // one set.
    backgroundColor: colors.danger,
    borderRadius: 10,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  newText: { color: colors.white, fontSize: 11, fontWeight: '700' },

  save: {
    position: 'absolute',
    top: spacing.sm,
    right: spacing.sm,
    width: 26,
    height: 26,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.92)',
  },

  body: { paddingHorizontal: spacing.sm, paddingTop: spacing.sm },
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  // flexShrink rather than flex: 1, so a short name does not stretch and leave
  // the tick stranded at the far edge of the card.
  name: { fontSize: font.body, fontWeight: '700', color: colors.text, flexShrink: 1 },
  meta: { fontSize: font.small, color: '#6B7280', marginTop: 2 },
  place: { fontSize: font.small, color: colors.textFaint, marginTop: 2 },

  flyHeart: {
    position: 'absolute',
    width: FLY_HEART_SIZE,
    height: FLY_HEART_SIZE,
    alignItems: 'center',
    justifyContent: 'center',
  },

  moreCard: {
    borderRadius: radius.lg,
    backgroundColor: colors.white,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: '#EFE0DA',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    paddingHorizontal: spacing.md,
    shadowColor: auth.maroon,
    shadowOpacity: 0.06,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 3 },
    elevation: 2,
  },
  moreIconWrap: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.accentSoft,
  },
  moreText: {
    fontSize: font.body,
    fontWeight: '700',
    color: colors.text,
    textAlign: 'center',
  },
  moreTextHindi: {
    fontSize: font.small,
    fontWeight: '600',
    color: auth.crimsonLight,
    textAlign: 'center',
  },

  spacer: { flex: 1, minHeight: spacing.sm },

  connect: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    marginHorizontal: spacing.sm,
    borderRadius: radius.sm,
    paddingVertical: 9,
    // The same lighter crimson the profile prompt's button uses, so the two
    // primary actions on this screen are one colour rather than two shades a
    // few centimetres apart.
    backgroundColor: auth.crimsonLight,
  },
  connectOutline: {
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.danger,
  },
  connectMuted: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  connectText: { fontSize: font.small, fontWeight: '700', color: colors.white },
  // Same red as the "New" tag - Connect in the outline rail and Withdraw
  // everywhere both read off this instead of the plain brand crimson.
  connectTextOutline: { color: colors.danger },
  // Withdraw overrides that red with grey - taking back a request is not the
  // same weight of action as sending or accepting one.
  connectTextWithdraw: { color: colors.textMuted },
});

export default memo(HomeRail);

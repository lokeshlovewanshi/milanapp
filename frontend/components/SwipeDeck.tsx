import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  Dimensions,
  Animated,
  PanResponder,
  Platform,
} from 'react-native';
import { useEffect, useMemo, useRef, useState } from 'react';
import { LinearGradient } from 'expo-linear-gradient';
import Ionicons from '@expo/vector-icons/Ionicons';
import AvatarFallback from './AvatarFallback';
import { useReference } from '../utils/useReference';
import {
  colors,
  font,
  radius,
  spacing,
  profileId,
  profileName,
  profileCode,
  profileImageFull,
  profileSubtitle,
  profileLocation,
  photoHeight,
  type Profile,
} from './theme';

const { width, height } = Dimensions.get('window');
const CARD_W = width - 24;
// Photo-shaped, capped so the card still fits above the action row.
const CARD_H = Math.min(photoHeight(CARD_W), height * 0.62);
const SWIPE_THRESHOLD = width * 0.28;

type Props = {
  profiles: Profile[];
  index: number;
  /** Fired once a card has animated off-screen. */
  onSwipe: (direction: 'left' | 'right', profile: Profile) => void;
  onShortlist: (id: string | number) => void;
  onOpen: (id: string | number) => void;
};

type ActionButtonProps = {
  outlineIcon: React.ComponentProps<typeof Ionicons>['name'];
  filledIcon: React.ComponentProps<typeof Ionicons>['name'];
  activeColor: string;
  onPress: () => void;
  accessibilityLabel: string;
};

/**
 * Blank outline by default; only fills with its colour while actually
 * pressed. Pass, Shortlist and Connect share this so none of the three reads
 * as "already done" before the person has tapped it.
 */
function ActionButton({ outlineIcon, filledIcon, activeColor, onPress, accessibilityLabel }: ActionButtonProps) {
  const [pressed, setPressed] = useState(false);
  return (
    <TouchableOpacity
      style={[styles.circleOnPhoto, styles.circleShadow]}
      activeOpacity={0.85}
      onPressIn={() => setPressed(true)}
      onPressOut={() => setPressed(false)}
      onPress={onPress}
      accessibilityLabel={accessibilityLabel}
    >
      <Ionicons name={pressed ? filledIcon : outlineIcon} size={24} color={pressed ? activeColor : colors.white} />
    </TouchableOpacity>
  );
}

/**
 * Presentational card deck. The parent owns the profile list, the current
 * index and pagination; this component only handles the gesture, the
 * animation and the action row.
 *
 * Uses RN's Animated + PanResponder rather than reanimated worklets - this
 * screen sits behind the navigation stack that useGuardedRouter exists to
 * protect, so it avoids adding another moving part to a crash-prone surface.
 */
export default function SwipeDeck({ profiles, index, onSwipe, onShortlist, onOpen }: Props) {
  // Profiles store codes; the card overlay must show labels.
  const { label } = useReference();
  const position = useRef(new Animated.ValueXY()).current;

  // The PanResponder is built once, so its closures would capture the first
  // render's props. These refs hand the handlers the live values.
  const indexRef = useRef(index);
  const profilesRef = useRef(profiles);
  const onSwipeRef = useRef(onSwipe);

  useEffect(() => {
    indexRef.current = index;
  }, [index]);
  useEffect(() => {
    profilesRef.current = profiles;
  }, [profiles]);
  useEffect(() => {
    onSwipeRef.current = onSwipe;
  }, [onSwipe]);

  const forceSwipe = (direction: 'left' | 'right') => {
    const card = profilesRef.current[indexRef.current];

    Animated.timing(position, {
      toValue: { x: direction === 'right' ? width * 1.5 : -width * 1.5, y: 0 },
      duration: 220,
      useNativeDriver: false,
    }).start(() => {
      position.setValue({ x: 0, y: 0 });
      if (card) onSwipeRef.current(direction, card);
    });
  };

  const resetPosition = () => {
    Animated.spring(position, {
      toValue: { x: 0, y: 0 },
      friction: 6,
      useNativeDriver: false,
    }).start();
  };

  const panResponder = useMemo(
    () =>
      PanResponder.create({
        onMoveShouldSetPanResponder: (_e, g) =>
          Math.abs(g.dx) > 6 && Math.abs(g.dx) > Math.abs(g.dy),
        onPanResponderMove: (_e, g) => position.setValue({ x: g.dx, y: g.dy }),
        onPanResponderRelease: (_e, g) => {
          if (g.dx > SWIPE_THRESHOLD) forceSwipe('right');
          else if (g.dx < -SWIPE_THRESHOLD) forceSwipe('left');
          else resetPosition();
        },
        onPanResponderTerminate: resetPosition,
      }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    []
  );

  const rotate = position.x.interpolate({
    inputRange: [-width * 1.5, 0, width * 1.5],
    outputRange: ['-18deg', '0deg', '18deg'],
  });
  const likeOpacity = position.x.interpolate({
    inputRange: [0, SWIPE_THRESHOLD],
    outputRange: [0, 1],
    extrapolate: 'clamp',
  });
  const nopeOpacity = position.x.interpolate({
    inputRange: [-SWIPE_THRESHOLD, 0],
    outputRange: [1, 0],
    extrapolate: 'clamp',
  });
  const nextScale = position.x.interpolate({
    inputRange: [-SWIPE_THRESHOLD, 0, SWIPE_THRESHOLD],
    outputRange: [1, 0.94, 1],
    extrapolate: 'clamp',
  });

  const body = (profile: Profile) => {
    const uri = profileImageFull(profile);
    const subtitle = profileSubtitle(profile, label);
    const location = profileLocation(profile);

    return (
      <>
        {uri ? (
          <Image source={{ uri }} style={styles.photo} />
        ) : (
          <View style={[styles.photo, styles.photoFallback]}>
            <AvatarFallback profile={profile} glyphSize={80} />
          </View>
        )}
        <LinearGradient colors={['transparent', 'rgba(0,0,0,0.75)']} style={styles.overlay}>
          <Text style={styles.code}>{profileCode(profile)}</Text>
          <Text style={styles.name} numberOfLines={1}>
            {profileName(profile)}
          </Text>
          {!!subtitle && (
            <View style={styles.metaRow}>
              <Ionicons name="briefcase-outline" size={14} color={colors.white} />
              <Text style={styles.meta} numberOfLines={1}>
                {subtitle}
              </Text>
            </View>
          )}
          {!!location && (
            <View style={styles.metaRow}>
              <Ionicons name="location-outline" size={14} color={colors.white} />
              <Text style={styles.meta} numberOfLines={1}>
                {location}
              </Text>
            </View>
          )}
        </LinearGradient>
      </>
    );
  };

  const current = profiles[index];
  const next = profiles[index + 1];
  if (!current) return null;

  const currentId = profileId(current);

  return (
    <View style={styles.wrap}>
      <View style={styles.deck}>
        {next && (
          <Animated.View
            style={[styles.card, styles.cardBehind, { transform: [{ scale: nextScale }] }]}
          >
            {body(next)}
          </Animated.View>
        )}

        <Animated.View
          {...panResponder.panHandlers}
          style={[
            styles.card,
            { transform: [{ translateX: position.x }, { translateY: position.y }, { rotate }] },
          ]}
        >
          {body(current)}

          <Animated.View style={[styles.stamp, styles.stampLike, { opacity: likeOpacity }]}>
            <Text style={[styles.stampText, { color: colors.online }]}>CONNECT</Text>
          </Animated.View>
          <Animated.View style={[styles.stamp, styles.stampNope, { opacity: nopeOpacity }]}>
            <Text style={[styles.stampText, { color: colors.danger }]}>PASS</Text>
          </Animated.View>

          <TouchableOpacity
            style={styles.infoBtn}
            hitSlop={8}
            onPress={() => currentId != null && onOpen(currentId)}
            accessibilityLabel="View full profile"
          >
            <Ionicons name="information-circle" size={26} color={colors.white} />
          </TouchableOpacity>

          {/* On the photo itself, not a separate bar below it - a dark
              backdrop behind each icon rather than a shadow on the icon,
              because an icon-level shadow barely registers on Android and
              disappears entirely against a photo that is already dark there. */}
          <View style={styles.cardActions} pointerEvents="box-none">
            <ActionButton
              outlineIcon="close-outline"
              filledIcon="close"
              activeColor={colors.danger}
              onPress={() => forceSwipe('left')}
              accessibilityLabel="Pass"
            />

            <ActionButton
              outlineIcon="star-outline"
              filledIcon="star"
              activeColor={colors.star}
              onPress={() => currentId != null && onShortlist(currentId)}
              accessibilityLabel="Shortlist"
            />

            <ActionButton
              outlineIcon="heart-outline"
              filledIcon="heart"
              activeColor={colors.accentAlt}
              onPress={() => forceSwipe('right')}
              accessibilityLabel="Connect"
            />
          </View>
        </Animated.View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flex: 1,
  },
  deck: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  card: {
    position: 'absolute',
    width: CARD_W,
    height: CARD_H,
    borderRadius: 18,
    overflow: 'hidden',
    backgroundColor: colors.surface,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.16,
        shadowRadius: 18,
      },
      android: { elevation: 6 },
    }),
  },
  cardBehind: {
    opacity: 0.9,
  },
  photo: {
    width: '100%',
    height: '100%',
    backgroundColor: colors.surface,
  },
  photoFallback: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  overlay: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    paddingHorizontal: spacing.lg,
    paddingTop: 56,
    // Bottom padding clears the action row (52 tall, floating spacing.lg off
    // the card bottom) plus a breathing gap, so the job/location text never
    // sits under the Pass/Shortlist/Connect buttons.
    paddingBottom: spacing.lg + 52 + spacing.md,
    gap: 3,
  },
  code: {
    color: 'rgba(255,255,255,0.85)',
    fontSize: font.caption,
    fontWeight: '600',
    letterSpacing: 0.5,
  },
  name: {
    color: colors.white,
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 2,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  meta: {
    color: 'rgba(255,255,255,0.9)',
    fontSize: font.body,
    flex: 1,
  },
  stamp: {
    position: 'absolute',
    top: 28,
    borderWidth: 3,
    borderRadius: radius.sm,
    paddingHorizontal: 10,
    paddingVertical: 4,
    backgroundColor: 'rgba(255,255,255,0.9)',
  },
  stampLike: {
    left: 20,
    borderColor: colors.online,
    transform: [{ rotate: '-14deg' }],
  },
  stampNope: {
    right: 20,
    borderColor: colors.danger,
    transform: [{ rotate: '14deg' }],
  },
  stampText: {
    fontSize: 20,
    fontWeight: 'bold',
    letterSpacing: 1,
  },
  infoBtn: {
    position: 'absolute',
    top: 14,
    right: 14,
  },
  cardActions: {
    position: 'absolute',
    bottom: spacing.lg,
    left: 0,
    right: 0,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.lg,
  },
  circleOnPhoto: {
    width: 52,
    height: 52,
    borderRadius: 26,
    alignItems: 'center',
    justifyContent: 'center',
    // Dark glass rather than solid black, so it reads as a control sitting on
    // the photo rather than a patch cut out of it.
    backgroundColor: 'rgba(0,0,0,0.45)',
  },
  // Black drop shadow behind the button itself, on top of the dark backdrop
  // above - between the two, the button holds its shape against a light
  // photo or a dark one alike.
  circleShadow: {
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.45,
        shadowRadius: 8,
      },
      android: { elevation: 6 },
    }),
  },
});

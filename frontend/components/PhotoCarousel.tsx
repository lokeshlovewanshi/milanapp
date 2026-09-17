import {
  View,
  Text,
  StyleSheet,
  FlatList,
  Modal,
  Pressable,
  TouchableOpacity,
  Dimensions,
  type NativeSyntheticEvent,
  type NativeScrollEvent,
} from 'react-native';
import { useState, useRef, useEffect, useCallback } from 'react';
import { LinearGradient } from 'expo-linear-gradient';
import Ionicons from '@expo/vector-icons/Ionicons';
import AvatarFallback from './AvatarFallback';
import StableImage from './StableImage';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, font, spacing, photoHeight } from './theme';

type Props = {
  photos: string[];
  height?: number;
  /** Rendered over the scrim, bottom-left. */
  name?: string;
  age?: number | null;
  code?: string;
  /** Milliseconds between slides. Set 0 to disable. */
  interval?: number;
  /** Picks the stand-in drawing when there are no photos at all. */
  gender?: string | null;
  /** Whether the user is active/online now */
  online?: boolean;
};

/**
 * Paged photo carousel: auto-advances once through the set, then stops.
 *
 * Deliberately does not loop. Wrapping from the last photo back to the first
 * means a long backwards scroll every cycle, which reads as a glitch rather
 * than a transition - and once someone has seen all the photos, moving them
 * again only gets in the way.
 *
 * Width is measured from the rendered container rather than
 * Dimensions.get('window'): on web the carousel can be narrower than the
 * window, and paging against the wrong width lands between photos.
 */
export default function PhotoCarousel({
  photos,
  height,
  name,
  age,
  code,
  interval = 0,
  gender,
  online,
}: Props) {
  const [width, setWidth] = useState(Dimensions.get('window').width);
  const [index, setIndex] = useState(0);
  const [viewerOpen, setViewerOpen] = useState(false);
  const listRef = useRef<FlatList<string>>(null);

  // Auto-advance stops for good once the user takes over. Fighting a timer
  // while trying to look at a photo is worse than no automation at all.
  const userTookOver = useRef(false);

  const onMomentumEnd = useCallback(
    (e: NativeSyntheticEvent<NativeScrollEvent>) => {
      setIndex(Math.round(e.nativeEvent.contentOffset.x / Math.max(1, width)));
    },
    [width]
  );

  useEffect(() => {
    if (!interval || photos.length < 2) return;

    const timer = setInterval(() => {
      if (userTookOver.current) {
        clearInterval(timer);
        return;
      }

      setIndex((current) => {
        // One pass only - park on the last photo.
        if (current >= photos.length - 1) {
          clearInterval(timer);
          return current;
        }
        const next = current + 1;
        // scrollToOffset, not scrollToIndex: the latter throws when the target
        // sits outside the current render window.
        listRef.current?.scrollToOffset({ offset: next * width, animated: true });
        return next;
      });
    }, interval);

    return () => clearInterval(timer);
  }, [interval, photos.length, width]);

  // Falls back to the shared photo shape, matching the upload crop frame.
  const h = height ?? photoHeight(width);
  const identity = name || code;

  if (photos.length === 0) {
    return (
      <View style={[styles.empty, { height: h }]}>
        <AvatarFallback profile={{ gender }} glyphSize={96} />
      </View>
    );
  }

  return (
    <View onLayout={(e) => setWidth(e.nativeEvent.layout.width)}>
      <FlatList
        ref={listRef}
        data={photos}
        keyExtractor={(uri, i) => `${uri}-${i}`}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        // decelerationRate keeps the manual swipe from drifting past a page.
        decelerationRate="fast"
        onScrollBeginDrag={() => {
          userTookOver.current = true;
        }}
        onMomentumScrollEnd={onMomentumEnd}
        renderItem={({ item }) => (
          <Pressable onPress={() => setViewerOpen(true)}>
            <StableImage
              uri={item}
              style={{ width, height: h }}
              contentFit="cover"
            />
          </Pressable>
        )}
      />

      {/* Darkens the lower third so white text stays legible over any photo. */}
      <LinearGradient
        colors={['rgba(0,0,0,0.30)', 'transparent', 'rgba(0,0,0,0.80)']}
        locations={[0, 0.4, 1]}
        style={[StyleSheet.absoluteFill, { height: h }]}
        pointerEvents="none"
      />

      {/* Tapping the count opens the full-screen viewer. */}
      <TouchableOpacity
        style={styles.counter}
        activeOpacity={0.8}
        onPress={() => setViewerOpen(true)}
        accessibilityLabel="View photos full screen"
      >
        <Ionicons name="images-outline" size={13} color={colors.white} />
        <Text style={styles.counterText}>
          {photos.length > 1 ? `${index + 1}/${photos.length}` : '1'}
        </Text>
      </TouchableOpacity>

      {photos.length > 1 && (
        <View style={styles.dots} pointerEvents="none">
          {photos.map((_, i) => (
            <View key={i} style={[styles.dot, i === index && styles.dotActive]} />
          ))}
        </View>
      )}

      {!!identity && (
        <View
          style={[styles.identity, photos.length > 1 && styles.identityWithDots]}
          pointerEvents="none"
        >
          {!!name && (
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <Text style={styles.name} numberOfLines={1}>
                {name}
                {age ? `, ${age}` : ''}
              </Text>
              {online && <View style={styles.onlineDot} />}
            </View>
          )}
          {!!code && <Text style={styles.code}>ID - {code}</Text>}
        </View>
      )}

      <PhotoViewer
        visible={viewerOpen}
        photos={photos}
        startIndex={index}
        onClose={() => setViewerOpen(false)}
      />
    </View>
  );
}

/**
 * Full-screen photo viewer.
 *
 * Black background with contain-fit rather than cover, so a portrait photo is
 * seen whole instead of cropped to the carousel's aspect ratio - which is the
 * point of opening it.
 */
function PhotoViewer({
  visible,
  photos,
  startIndex,
  onClose,
}: {
  visible: boolean;
  photos: string[];
  startIndex: number;
  onClose: () => void;
}) {
  const insets = useSafeAreaInsets();
  const { width, height } = Dimensions.get('window');
  const [index, setIndex] = useState(startIndex);
  const listRef = useRef<FlatList<string>>(null);

  // Re-seed on open so it lands on whatever the carousel was showing.
  useEffect(() => {
    if (visible) setIndex(startIndex);
  }, [visible, startIndex]);

  const goTo = (next: number) => {
    const clamped = Math.max(0, Math.min(photos.length - 1, next));
    setIndex(clamped);
    listRef.current?.scrollToOffset({ offset: clamped * width, animated: true });
  };

  const atStart = index === 0;
  const atEnd = index === photos.length - 1;

  return (
    <Modal visible={visible} animationType="fade" onRequestClose={onClose}>
      <View style={styles.viewer}>
        <FlatList
          ref={listRef}
          data={photos}
          keyExtractor={(uri, i) => `full-${uri}-${i}`}
          horizontal
          pagingEnabled
          decelerationRate="fast"
          showsHorizontalScrollIndicator={false}
          initialScrollIndex={startIndex}
          getItemLayout={(_, i) => ({ length: width, offset: width * i, index: i })}
          onMomentumScrollEnd={(e) =>
            setIndex(Math.round(e.nativeEvent.contentOffset.x / Math.max(1, width)))
          }
          renderItem={({ item }) => (
            <StableImage
              uri={item}
              style={{ width, height }}
              contentFit="contain"
            />
          )}
        />

        {/* Header: an explicit way out. Relying on the OS back gesture alone
            leaves people stuck, especially on iOS where there is no back button. */}
        <View style={[styles.viewerBar, { paddingTop: insets.top + spacing.sm }]}>
          <TouchableOpacity
            style={styles.viewerBtn}
            onPress={onClose}
            accessibilityLabel="Back"
            hitSlop={10}
          >
            <Ionicons name="arrow-back" size={24} color={colors.white} />
          </TouchableOpacity>

          {photos.length > 1 && (
            <Text style={styles.viewerTitle}>
              {index + 1} of {photos.length}
            </Text>
          )}

          <View style={styles.viewerBtn} />
        </View>

        {/* Explicit paging controls. Swiping works too, but a visible arrow is
            the difference between "I can move" and "is it stuck?". */}
        {photos.length > 1 && (
          <>
            {!atStart && (
              <TouchableOpacity
                style={[styles.arrow, styles.arrowLeft]}
                onPress={() => goTo(index - 1)}
                accessibilityLabel="Previous photo"
              >
                <Ionicons name="chevron-back" size={26} color={colors.white} />
              </TouchableOpacity>
            )}
            {!atEnd && (
              <TouchableOpacity
                style={[styles.arrow, styles.arrowRight]}
                onPress={() => goTo(index + 1)}
                accessibilityLabel="Next photo"
              >
                <Ionicons name="chevron-forward" size={26} color={colors.white} />
              </TouchableOpacity>
            )}

            {/* Thumbnails, so a set of five is navigable without five swipes. */}
            <View style={[styles.thumbs, { bottom: insets.bottom + spacing.md }]}>
              {photos.map((uri, i) => (
                <TouchableOpacity key={`t-${i}`} onPress={() => goTo(i)} activeOpacity={0.8}>
                  <StableImage
                    uri={uri}
                    style={[styles.thumb, i === index && styles.thumbActive]}
                    contentFit="cover"
                  />
                </TouchableOpacity>
              ))}
            </View>
          </>
        )}
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  empty: {
    width: '100%',
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  counter: {
    position: 'absolute',
    top: 14,
    right: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 10,
    height: 28,
    borderRadius: 14,
    backgroundColor: 'rgba(0,0,0,0.45)',
  },
  counterText: {
    color: colors.white,
    fontSize: font.small,
    fontWeight: '600',
  },
  dots: {
    position: 'absolute',
    bottom: 14,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 6,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: 'rgba(255,255,255,0.5)',
  },
  dotActive: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
    backgroundColor: colors.white,
  },
  identity: {
    position: 'absolute',
    left: spacing.lg,
    right: spacing.lg,
    bottom: spacing.lg,
  },
  /** Lifted clear of the dot row when there is more than one photo. */
  identityWithDots: {
    bottom: 34,
  },
  name: {
    color: colors.white,
    fontSize: 26,
    fontWeight: 'bold',
    // Belt and braces with the scrim: a bright photo can still wash out white
    // text where the gradient is thinnest.
    textShadowColor: 'rgba(0,0,0,0.6)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 6,
  },
  code: {
    color: 'rgba(255,255,255,0.92)',
    fontSize: font.label,
    marginTop: 2,
    textShadowColor: 'rgba(0,0,0,0.6)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
  },
  onlineDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#22C55E',
    borderWidth: 1.5,
    borderColor: '#FFFFFF',
  },

  viewer: { flex: 1, backgroundColor: '#000' },
  viewerBar: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.sm,
    backgroundColor: 'rgba(0,0,0,0.35)',
  },
  viewerBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  viewerTitle: {
    color: colors.white,
    fontSize: font.title,
    fontWeight: '600',
  },
  arrow: {
    position: 'absolute',
    top: '46%',
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: 'rgba(255,255,255,0.18)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  arrowLeft: { left: spacing.md },
  arrowRight: { right: spacing.md },
  thumbs: {
    position: 'absolute',
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'center',
    gap: spacing.sm,
  },
  thumb: {
    width: 46,
    height: 46,
    borderRadius: 8,
    opacity: 0.5,
  },
  thumbActive: {
    opacity: 1,
    borderWidth: 2,
    borderColor: colors.white,
  },
});

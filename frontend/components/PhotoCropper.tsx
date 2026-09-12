import {
  View,
  Text,
  StyleSheet,
  Modal,
  Image,
  TouchableOpacity,
  Dimensions,
  PanResponder,
  Animated,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { useMemo, useRef, useState, useEffect, useCallback } from 'react';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  coverScale,
  maxTranslate,
  clamp,
  frameToSourceRect,
  frameSize,
} from '../utils/cropImage';
import { cropAndCompress } from '../utils/manipulate';
import { colors, font, radius, spacing } from './theme';

const { width: SCREEN_W, height: SCREEN_H } = Dimensions.get('window');

/** Room for the header and the button row. */
const CHROME_H = 210;
const FRAME = frameSize(SCREEN_W - spacing.lg * 2, SCREEN_H - CHROME_H);

/** Enough to crop in on a face from a wide group shot, not so much it pixelates. */
const MAX_ZOOM = 4;

type Props = {
  visible: boolean;
  /** Picked photo, before any cropping. */
  uri: string | null;
  /** Source pixel dimensions, as reported by the picker. */
  sourceWidth: number;
  sourceHeight: number;
  onCancel: () => void;
  onDone: (croppedUri: string) => void;
};

/**
 * Adjustable crop step, shown between picking a photo and uploading it.
 *
 * The frame is locked to PHOTO_ASPECT and the image moves behind it - the
 * opposite of a resizable selection box. That is deliberate: the app displays
 * every photo at one shape, so a frame the user could reshape would only let
 * them compose something the app then crops again. Locking the frame and moving
 * the image makes the preview honest.
 *
 * Built on PanResponder and Animated rather than Reanimated worklets, matching
 * SwipeDeck. Pinch is derived from the raw touch list because PanResponder has
 * no pinch of its own; that is a little more code here in exchange for not
 * adding a second gesture system to a surface that has crashed before.
 */
export default function PhotoCropper({
  visible,
  uri,
  sourceWidth,
  sourceHeight,
  onCancel,
  onDone,
}: Props) {
  const insets = useSafeAreaInsets();
  const [busy, setBusy] = useState(false);

  const base = useMemo(
    () => coverScale(sourceWidth, sourceHeight, FRAME.width, FRAME.height),
    [sourceWidth, sourceHeight]
  );

  // The live gesture values. Animated.Value has no synchronous getter, so these
  // refs are the source of truth and the Animated values only mirror them for
  // rendering.
  const zoom = useRef(1);
  const tx = useRef(0);
  const ty = useRef(0);

  const animZoom = useRef(new Animated.Value(1)).current;
  const animX = useRef(new Animated.Value(0)).current;
  const animY = useRef(new Animated.Value(0)).current;

  // Per-gesture bookkeeping.
  const startZoom = useRef(1);
  const startX = useRef(0);
  const startY = useRef(0);
  const startPinch = useRef(0);

  /** Re-clamp after any change, so the frame is never left showing a gap. */
  const apply = useCallback(() => {
    const scale = base * zoom.current;
    const limitX = maxTranslate(sourceWidth * scale, FRAME.width);
    const limitY = maxTranslate(sourceHeight * scale, FRAME.height);

    tx.current = clamp(tx.current, limitX);
    ty.current = clamp(ty.current, limitY);

    animZoom.setValue(zoom.current);
    animX.setValue(tx.current);
    animY.setValue(ty.current);
  }, [base, sourceWidth, sourceHeight, animZoom, animX, animY]);

  const reset = useCallback(() => {
    zoom.current = 1;
    tx.current = 0;
    ty.current = 0;
    apply();
  }, [apply]);

  // A new photo starts centred and unzoomed.
  useEffect(() => {
    if (visible) reset();
  }, [visible, uri, reset]);

  const distance = (touches: any[]): number => {
    const [a, b] = touches;
    return Math.hypot(a.pageX - b.pageX, a.pageY - b.pageY);
  };

  const panResponder = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => true,
        onMoveShouldSetPanResponder: () => true,

        onPanResponderGrant: (evt) => {
          startZoom.current = zoom.current;
          startX.current = tx.current;
          startY.current = ty.current;
          const touches = evt.nativeEvent.touches;
          startPinch.current = touches.length >= 2 ? distance(touches) : 0;
        },

        onPanResponderMove: (evt, gesture) => {
          const touches = evt.nativeEvent.touches;

          if (touches.length >= 2) {
            // Second finger may land mid-drag; re-baseline instead of jumping.
            if (!startPinch.current) {
              startPinch.current = distance(touches);
              startZoom.current = zoom.current;
              startX.current = tx.current;
              startY.current = ty.current;
              return;
            }
            const ratio = distance(touches) / startPinch.current;
            zoom.current = Math.min(MAX_ZOOM, Math.max(1, startZoom.current * ratio));
          } else {
            // Lifting back to one finger re-baselines the drag the same way.
            if (startPinch.current) {
              startPinch.current = 0;
              startX.current = tx.current;
              startY.current = ty.current;
              return;
            }
            tx.current = startX.current + gesture.dx;
            ty.current = startY.current + gesture.dy;
          }

          apply();
        },

        onPanResponderRelease: () => {
          startPinch.current = 0;
          apply();
        },
        onPanResponderTerminate: () => {
          startPinch.current = 0;
          apply();
        },
      }),
    [apply]
  );

  const confirm = async () => {
    if (!uri || busy) return;
    setBusy(true);
    try {
      const rect = frameToSourceRect({
        sourceWidth,
        sourceHeight,
        frameWidth: FRAME.width,
        frameHeight: FRAME.height,
        scale: base * zoom.current,
        tx: tx.current,
        ty: ty.current,
      });
      onDone(await cropAndCompress(uri, rect));
    } catch (error) {
      console.error('Crop failed', error);
      Alert.alert('Could not crop', 'Please try that photo again.');
    } finally {
      setBusy(false);
    }
  };

  const displayWidth = sourceWidth * base;
  const displayHeight = sourceHeight * base;

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onCancel} statusBarTranslucent>
      <View style={[styles.container, { paddingTop: insets.top }]}>
        <View style={styles.topBar}>
          <TouchableOpacity hitSlop={12} onPress={onCancel} accessibilityLabel="Cancel">
            <Ionicons name="close" size={26} color={colors.white} />
          </TouchableOpacity>
          <Text style={styles.topTitle}>Adjust photo</Text>
          <TouchableOpacity hitSlop={12} onPress={reset} accessibilityLabel="Reset">
            <Ionicons name="refresh" size={22} color={colors.white} />
          </TouchableOpacity>
        </View>

        <View style={styles.stage}>
          <View style={styles.frame} {...panResponder.panHandlers}>
            {!!uri && (
              <Animated.View
                style={{
                  width: displayWidth,
                  height: displayHeight,
                  transform: [
                    { translateX: animX },
                    { translateY: animY },
                    { scale: animZoom },
                  ],
                }}
              >
                <Image source={{ uri }} style={styles.image} resizeMode="cover" />
              </Animated.View>
            )}

            {/* Rule-of-thirds guides. Photographers line eyes up on the top
                third; without guides people centre the face and lose the chin. */}
            <View pointerEvents="none" style={StyleSheet.absoluteFill}>
              <View style={[styles.gridLine, styles.gridH, { top: '33.33%' }]} />
              <View style={[styles.gridLine, styles.gridH, { top: '66.66%' }]} />
              <View style={[styles.gridLine, styles.gridV, { left: '33.33%' }]} />
              <View style={[styles.gridLine, styles.gridV, { left: '66.66%' }]} />
            </View>

            <View pointerEvents="none" style={[styles.corner, styles.tl]} />
            <View pointerEvents="none" style={[styles.corner, styles.tr]} />
            <View pointerEvents="none" style={[styles.corner, styles.bl]} />
            <View pointerEvents="none" style={[styles.corner, styles.br]} />
          </View>

          <Text style={styles.hint}>Drag to move · Pinch to zoom</Text>
        </View>

        <View style={[styles.footer, { paddingBottom: insets.bottom + spacing.md }]}>
          <TouchableOpacity
            style={styles.cancelBtn}
            activeOpacity={0.8}
            onPress={onCancel}
            disabled={busy}
          >
            <Text style={styles.cancelText}>Cancel</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.useBtn, busy && styles.useBtnBusy]}
            activeOpacity={0.85}
            onPress={confirm}
            disabled={busy}
          >
            {busy ? (
              <ActivityIndicator color={colors.white} />
            ) : (
              <Text style={styles.useText}>Use photo</Text>
            )}
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  // Near-black surround: the eye judges a crop against its background, and a
  // white one makes every photo look washed out.
  container: { flex: 1, backgroundColor: '#0B0B0B' },

  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  topTitle: { color: colors.white, fontSize: font.title, fontWeight: '600' },

  stage: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: spacing.lg },
  frame: {
    width: FRAME.width,
    height: FRAME.height,
    overflow: 'hidden',
    borderRadius: 6,
    backgroundColor: '#000',
    alignItems: 'center',
    justifyContent: 'center',
  },
  image: { width: '100%', height: '100%' },

  gridLine: { position: 'absolute', backgroundColor: 'rgba(255,255,255,0.28)' },
  gridH: { left: 0, right: 0, height: StyleSheet.hairlineWidth },
  gridV: { top: 0, bottom: 0, width: StyleSheet.hairlineWidth },

  corner: {
    position: 'absolute',
    width: 22,
    height: 22,
    borderColor: colors.white,
  },
  tl: { top: 0, left: 0, borderTopWidth: 3, borderLeftWidth: 3 },
  tr: { top: 0, right: 0, borderTopWidth: 3, borderRightWidth: 3 },
  bl: { bottom: 0, left: 0, borderBottomWidth: 3, borderLeftWidth: 3 },
  br: { bottom: 0, right: 0, borderBottomWidth: 3, borderRightWidth: 3 },

  hint: { color: 'rgba(255,255,255,0.62)', fontSize: font.body },

  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
  },
  cancelBtn: {
    height: 54,
    paddingHorizontal: spacing.xl,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.28)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelText: { color: colors.white, fontSize: font.title, fontWeight: '600' },
  useBtn: {
    flex: 1,
    height: 54,
    borderRadius: radius.sm,
    backgroundColor: colors.accentAlt,
    alignItems: 'center',
    justifyContent: 'center',
  },
  useBtnBusy: { opacity: 0.7 },
  useText: { color: colors.white, fontSize: 17, fontWeight: 'bold' },
});

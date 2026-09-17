import React, { forwardRef, useCallback, useEffect, useImperativeHandle, useRef, useState } from 'react';
import {
  Dimensions,
  Keyboard,
  KeyboardEvent,
  NativeScrollEvent,
  NativeSyntheticEvent,
  Platform,
  ScrollView,
  ScrollViewProps,
  StyleProp,
  TextInput,
  ViewStyle,
} from 'react-native';

/**
 * A ScrollView that keeps the focused input above the keyboard.
 *
 * KeyboardAvoidingView is not enough here. The app sets `edgeToEdgeEnabled`, and
 * an edge-to-edge Android window does not resize when the keyboard opens - the
 * layout keeps its full height and the keyboard simply draws over it. That is
 * why the confirm-password field, the step-1 inputs and the state search results
 * were all unreachable: nothing was ever moving them.
 *
 * So the keyboard height is measured directly, applied as bottom padding, and
 * the focused input scrolled into what space is left. Same code path on both
 * platforms - two different behaviours to reason about buys nothing here.
 */

type Props = ScrollViewProps & {
  children: React.ReactNode;
  /** Breathing room between the input and the top of the keyboard. */
  gap?: number;
  contentContainerStyle?: StyleProp<ViewStyle>;
};

export type FormScrollHandle = {
  scrollToEnd: () => void;
};

/**
 * Keyboard height, or 0 while closed.
 *
 * `keyboardDidShow` rather than `WillShow`: Android only fires the Did events,
 * so listening for Will on iOS alone would make the two platforms behave
 * differently for no benefit.
 */
export const useKeyboardHeight = (): number => {
  const [height, setHeight] = useState(0);

  useEffect(() => {
    const show = Keyboard.addListener('keyboardDidShow', (e: KeyboardEvent) =>
      setHeight(e.endCoordinates?.height ?? 0),
    );
    const hide = Keyboard.addListener('keyboardDidHide', () => setHeight(0));

    return () => {
      show.remove();
      hide.remove();
    };
  }, []);

  return height;
};

/**
 * How much of the keyboard still covers a container, after any resizing the OS
 * already did for us.
 *
 * This distinction is the whole problem. Android resizes a Modal's own window
 * when the keyboard opens, but an edge-to-edge Activity window is left at full
 * height. Assuming either one is wrong somewhere: pad unconditionally and the
 * modal sheets jump twice the keyboard's height into the middle of the screen;
 * pad never and the plain screens keep their fields underneath it.
 *
 * So compare the container's measured height against the full window. Whatever
 * the OS already took off is not ours to take off again.
 *
 * @param measured height reported by the container's own onLayout, or 0 before
 *                 the first layout pass
 */
export const useCoveredHeight = (measured: number): number => {
  const keyboard = useKeyboardHeight();
  if (keyboard === 0) return 0;

  const window = Dimensions.get('window').height;
  const alreadyHandled = Math.max(0, window - measured);

  return Math.max(0, keyboard - alreadyHandled);
};

const FormScroll = forwardRef<FormScrollHandle, Props>(
  ({ children, gap = 24, contentContainerStyle, onScroll, onTouchStart, ...rest }, ref) => {
    const scrollRef = useRef<ScrollView>(null);
    const offset = useRef(0);

    // Measured, not assumed: inside a Modal the OS has usually shrunk this view
    // already, and padding again would move the content twice.
    const [viewport, setViewport] = useState(0);
    const covered = useCoveredHeight(viewport);

    // The raw height as well, because the two answer different questions.
    // `covered` says how much padding to add - zero is the right answer when
    // the OS already resized us. Whether to scroll the focused field into view
    // is a different question, and the answer there is "whenever the keyboard
    // is open at all". Driving both off `covered` meant that on a resized
    // window the scroll never ran, so tapping the last field left it sitting
    // under the keyboard with the submit button out of reach - reachable only
    // by scrolling by hand, which is precisely what this component exists to
    // spare people.
    const rawKeyboard = useKeyboardHeight();

    useImperativeHandle(ref, () => ({
      scrollToEnd: () => scrollRef.current?.scrollToEnd({ animated: true }),
    }));

    const handleScroll = useCallback(
      (e: NativeSyntheticEvent<NativeScrollEvent>) => {
        offset.current = e.nativeEvent.contentOffset.y;
        onScroll?.(e);
      },
      [onScroll],
    );

    const scrollFocusedInputIntoView = useCallback(() => {
      if (rawKeyboard === 0) return;

      // Run whenever a field is tapped as well as when the keyboard opens.
      // Otherwise moving from one field to a lower one keeps that input below
      // an already-open keyboard.
      setTimeout(() => {
        const input = TextInput.State.currentlyFocusedInput?.();
        const scroller = scrollRef.current;
        if (!input || !scroller) return;

        // Measure THIS view rather than the window, which is what makes one
        // code path serve both cases. When the OS resized us, our own height
        // already excludes the keyboard and `covered` is zero. When it did not,
        // our height is the full window and `covered` is the whole keyboard.
        // Either way the last visible row is our bottom edge minus whatever is
        // still covered.
        (scroller as any).measureInWindow?.(
          (_sx: number, sy: number, _sw: number, sh: number) => {
            const visibleBottom = sy + sh - covered;

            // Window coordinates, not content coordinates: the keyboard is
            // measured against the screen, so the input has to be too.
            // Measuring against the content is what makes naive versions of
            // this scroll to the wrong place on long forms.
            input.measureInWindow((_x: number, y: number, _w: number, height: number) => {
              const limit = visibleBottom - gap;
              const bottom = y + height;
              if (bottom <= limit) return;

              scroller.scrollTo({
                y: Math.max(0, offset.current + (bottom - limit)),
                animated: true,
              });
            });
          }
        );
      }, 80);
    }, [rawKeyboard, covered, gap]);

    useEffect(() => {
      scrollFocusedInputIntoView();
    }, [scrollFocusedInputIntoView]);

    return (
      <ScrollView
        ref={scrollRef}
        onLayout={(e) => setViewport(e.nativeEvent.layout.height)}
        onScroll={handleScroll}
        onTouchStart={(event) => {
          onTouchStart?.(event);
          scrollFocusedInputIntoView();
        }}
        scrollEventThrottle={16}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode={Platform.OS === 'ios' ? 'interactive' : 'none'}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[
          contentContainerStyle,
          // This padding is what actually makes the last field reachable; the
          // scroll above only positions within the space it creates.
          { paddingBottom: covered > 0 ? covered + gap : 0 },
        ]}
        {...rest}
      >
        {children}
      </ScrollView>
    );
  },
);

FormScroll.displayName = 'FormScroll';

export default FormScroll;

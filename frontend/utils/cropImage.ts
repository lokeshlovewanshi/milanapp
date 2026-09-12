import { PHOTO_ASPECT } from '../components/theme';

export type Rect = { originX: number; originY: number; width: number; height: number };

/**
 * Smallest scale at which the source still covers the whole frame.
 *
 * This is the zoom floor. Letting the user shrink below it would expose empty
 * corners inside the frame, which then upload as black bars.
 */
export const coverScale = (
  sourceWidth: number,
  sourceHeight: number,
  frameWidth: number,
  frameHeight: number
): number => {
  if (!sourceWidth || !sourceHeight) return 1;
  return Math.max(frameWidth / sourceWidth, frameHeight / sourceHeight);
};

/**
 * How far the image may be dragged before a gap appears at the frame edge.
 *
 * Zero when the image is exactly frame-sized on that axis - there is nothing to
 * pan into view, so the drag is simply ignored rather than fought against.
 */
export const maxTranslate = (
  displayedSize: number,
  frameSize: number
): number => Math.max(0, (displayedSize - frameSize) / 2);

export const clamp = (value: number, limit: number): number =>
  Math.min(limit, Math.max(-limit, value));

/**
 * Converts what is currently visible inside the crop frame into a rectangle in
 * source-image pixels, which is what the cropper needs.
 *
 * Coordinates run from the frame's own top-left. The image is drawn centred on
 * the frame and then offset by (tx, ty), so the frame's left edge sits this far
 * into the scaled image:
 *
 *   (scaledWidth / 2 - tx - frameWidth / 2)
 *
 * Dividing by the scale converts that back to source pixels. The result is
 * clamped to the image bounds: floating-point drift of even half a pixel past
 * the edge makes the native cropper throw rather than round down.
 */
export function frameToSourceRect(params: {
  sourceWidth: number;
  sourceHeight: number;
  frameWidth: number;
  frameHeight: number;
  /** Total scale from source pixels to screen points. */
  scale: number;
  /** Image centre offset from frame centre, in screen points. */
  tx: number;
  ty: number;
}): Rect {
  const { sourceWidth, sourceHeight, frameWidth, frameHeight, scale, tx, ty } = params;

  const safeScale = scale > 0 ? scale : 1;
  const scaledWidth = sourceWidth * safeScale;
  const scaledHeight = sourceHeight * safeScale;

  // Never ask for more than the image has, however the caller rounded.
  const width = Math.min(sourceWidth, Math.round(frameWidth / safeScale));
  const height = Math.min(sourceHeight, Math.round(frameHeight / safeScale));

  const rawX = (scaledWidth / 2 - tx - frameWidth / 2) / safeScale;
  const rawY = (scaledHeight / 2 - ty - frameHeight / 2) / safeScale;

  return {
    originX: Math.max(0, Math.min(sourceWidth - width, Math.round(rawX))),
    originY: Math.max(0, Math.min(sourceHeight - height, Math.round(rawY))),
    width,
    height,
  };
}

/**
 * Frame size for the crop screen.
 *
 * Width-led, then height-led if that would not fit - so the frame is as large as
 * the screen allows while staying exactly PHOTO_ASPECT. A frame of any other
 * shape would let the user compose a photo the app then re-crops.
 */
export function frameSize(
  availableWidth: number,
  availableHeight: number
): { width: number; height: number } {
  let width = availableWidth;
  let height = width / PHOTO_ASPECT;

  if (height > availableHeight) {
    height = availableHeight;
    width = height * PHOTO_ASPECT;
  }

  return { width: Math.round(width), height: Math.round(height) };
}

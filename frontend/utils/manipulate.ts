import type { Rect } from './cropImage';

/**
 * Crops and downscales a picked photo.
 *
 * expo-image-manipulator changed shape in SDK 52: `manipulateAsync` gave way to
 * a chained `ImageManipulator.manipulate(...)` context, and the old function
 * moved behind a `/legacy` entry point - the same split expo-file-system went
 * through, which is why this project already imports
 * `expo-file-system/legacy`.
 *
 * Rather than pin one of the two and have photo upload fail outright on the
 * other, this picks whichever the installed version exposes. It is a few extra
 * lines in one place, against a silent break in the only path a user has to add
 * a photo.
 */

/** Longest edge we store. Beyond this is bandwidth nobody sees. */
const MAX_WIDTH = 1080;
const QUALITY = 0.85;

export async function cropAndCompress(uri: string, rect: Rect): Promise<string> {
  const mod: any = await import('expo-image-manipulator');

  // SDK 52+: chained context API.
  if (typeof mod.ImageManipulator?.manipulate === 'function') {
    const context = mod.ImageManipulator.manipulate(uri)
      .crop(rect)
      .resize({ width: Math.min(MAX_WIDTH, rect.width) });

    const rendered = await context.renderAsync();
    const saved = await rendered.saveAsync({
      compress: QUALITY,
      format: mod.SaveFormat?.JPEG ?? 'jpeg',
    });
    return saved.uri;
  }

  // Older releases: single call with an action list.
  if (typeof mod.manipulateAsync === 'function') {
    const result = await mod.manipulateAsync(
      uri,
      [{ crop: rect }, { resize: { width: Math.min(MAX_WIDTH, rect.width) } }],
      { compress: QUALITY, format: mod.SaveFormat?.JPEG ?? 'jpeg' }
    );
    return result.uri;
  }

  throw new Error('expo-image-manipulator is installed but exposes no known API');
}

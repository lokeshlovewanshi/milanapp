import { useEffect, useMemo, useState, type ComponentProps } from 'react';
import { ActivityIndicator, StyleSheet, View, type ImageStyle, type StyleProp } from 'react-native';
import { Image } from 'expo-image';
import { auth, colors } from './theme';

type Props = {
  uri: string;
  style: StyleProp<ImageStyle>;
  contentFit?: ComponentProps<typeof Image>['contentFit'];
  contentPosition?: ComponentProps<typeof Image>['contentPosition'];
};

// Expo may emit onLoadStart again when a parent list is refreshed, even though
// the file is already in its memory/disk cache. Remember completed URLs so a
// pull-to-refresh does not put a spinner over an image that is already visible.
const loadedUris = new Set<string>();

// A presigned CloudFront URL changes its query string every time it is signed,
// but its origin + pathname still identifies the same immutable photo. Holding
// the last working URL by that stable identity prevents a feed refresh from
// replacing a visible photo four or five times with signature-only variants.
const workingUriByImage = new Map<string, string>();

const imageIdentity = (uri: string): string => {
  try {
    const parsed = new URL(uri);
    return `${parsed.origin}${parsed.pathname}`;
  } catch {
    return uri.split('?')[0];
  }
};

/**
 * Remote image with a fixed, neutral frame while its bytes are loading.
 *
 * Keeping the frame mounted prevents profile cards from briefly blinking white
 * or resizing as a photo arrives. expo-image retains its disk/memory cache and
 * fades the completed image over the small spinner.
 */
export default function StableImage({
  uri,
  style,
  contentFit = 'cover',
  contentPosition,
}: Props) {
  const identity = useMemo(() => imageIdentity(uri), [uri]);
  const [displayUri, setDisplayUri] = useState(
    () => workingUriByImage.get(identity) ?? uri,
  );
  const [loading, setLoading] = useState(() => !loadedUris.has(displayUri));
  const source = useMemo(() => ({ uri: displayUri }), [displayUri]);

  useEffect(() => {
    // Keep the previous working signed URL when only the signature changed.
    // It is already cached on-device, so there is no blank frame or network
    // image request during ordinary pull-to-refreshes.
    const working = workingUriByImage.get(identity) ?? uri;
    setDisplayUri(working);
    setLoading(!loadedUris.has(working));
  }, [identity, uri]);

  return (
    <View style={[styles.frame, style as any]}>
      <Image
        source={source}
        style={StyleSheet.absoluteFill}
        contentFit={contentFit}
        contentPosition={contentPosition}
        cachePolicy="memory-disk"
        transition={180}
        onLoadStart={() => {
          if (!loadedUris.has(displayUri)) setLoading(true);
        }}
        onLoadEnd={() => {
          loadedUris.add(displayUri);
          workingUriByImage.set(identity, displayUri);
          setLoading(false);
        }}
        onError={() => {
          // A cached signed URL can eventually expire. Fall through to the
          // latest URL supplied by the API exactly once, instead of leaving a
          // stale photo frame on-screen.
          if (displayUri !== uri) {
            workingUriByImage.delete(identity);
            setDisplayUri(uri);
            setLoading(true);
          } else {
            setLoading(false);
          }
        }}
      />
      {loading && (
        <View pointerEvents="none" style={styles.loader}>
          <ActivityIndicator size="small" color={auth.crimson} />
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  frame: { overflow: 'hidden', backgroundColor: colors.surface },
  loader: { ...StyleSheet.absoluteFillObject, alignItems: 'center', justifyContent: 'center' },
});

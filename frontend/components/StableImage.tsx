import { useEffect, useState, type ComponentProps } from 'react';
import { ActivityIndicator, StyleSheet, View, type ImageStyle, type StyleProp } from 'react-native';
import { Image } from 'expo-image';
import { auth, colors } from './theme';

type Props = {
  uri: string;
  style: StyleProp<ImageStyle>;
  contentFit?: ComponentProps<typeof Image>['contentFit'];
  contentPosition?: ComponentProps<typeof Image>['contentPosition'];
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
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
  }, [uri]);

  return (
    <View style={[styles.frame, style as any]}>
      <Image
        source={{ uri }}
        style={StyleSheet.absoluteFill}
        contentFit={contentFit}
        contentPosition={contentPosition}
        cachePolicy="memory-disk"
        transition={180}
        onLoadStart={() => setLoading(true)}
        onLoadEnd={() => setLoading(false)}
        onError={() => setLoading(false)}
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

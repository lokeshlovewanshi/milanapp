import { useEffect, useState } from 'react';
import { View, Text, StyleSheet, Modal, Pressable, TouchableOpacity, Platform, Linking } from 'react-native';
import Constants from 'expo-constants';
import { appVersionAPI } from '../utils/api';
import { colors, font, radius, spacing, auth } from './theme';

type Check = {
  updateAvailable: boolean;
  forceUpdate: boolean;
  latestVersionName?: string;
  releaseNotes?: string;
  downloadUrl?: string;
};

/**
 * The one-time "a new version is out" prompt, checked once per cold start.
 *
 * Android only. versionCode is a Play Store/Gradle concept with no iOS
 * equivalent, and this app has no App Store listing yet to compare against -
 * asking on any other platform would mean asking a question with no answer,
 * so it is skipped rather than guessed at.
 *
 * Dismissible unless the server says forceUpdate, in which case there is no
 * close button: that flag exists specifically for a build the backend can no
 * longer serve, and letting someone dismiss past it would defeat the point.
 */
export default function UpdateGate() {
  const [check, setCheck] = useState<Check | null>(null);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    if (Platform.OS !== 'android') return;

    const versionCode =
      Constants.expoConfig?.android?.versionCode ??
      (Constants.manifest as any)?.android?.versionCode ??
      (Constants.manifest2 as any)?.extra?.expoClient?.android?.versionCode;
    if (!versionCode) return; // Nothing to compare against - stay silent.

    appVersionAPI
      .check('android', versionCode)
      .then((res) => {
        const data = res?.data;
        if (data?.updateAvailable) setCheck(data);
      })
      .catch(() => {
        // A failed check is not worth surfacing - worst case, the member
        // finds out about the update from the Store instead of this popup.
      });
  }, []);

  if (!check || (dismissed && !check.forceUpdate)) return null;

  const openStore = () => {
    if (check.downloadUrl) Linking.openURL(check.downloadUrl).catch(() => {});
  };

  return (
    <Modal visible transparent animationType="fade" onRequestClose={() => !check.forceUpdate && setDismissed(true)}>
      <View style={styles.backdrop}>
        {!check.forceUpdate && (
          <Pressable style={styles.backdropTouch} onPress={() => setDismissed(true)} />
        )}

        <View style={styles.card}>
          <Text style={styles.title}>
            {check.forceUpdate ? 'Update required' : 'A new version is available'}
          </Text>
          {!!check.latestVersionName && (
            <Text style={styles.version}>Version {check.latestVersionName}</Text>
          )}
          {!!check.releaseNotes && <Text style={styles.notes}>{check.releaseNotes}</Text>}

          <TouchableOpacity style={styles.updateBtn} activeOpacity={0.85} onPress={openStore}>
            <Text style={styles.updateText}>Update now</Text>
          </TouchableOpacity>

          {!check.forceUpdate && (
            <TouchableOpacity style={styles.laterBtn} activeOpacity={0.8} onPress={() => setDismissed(true)}>
              <Text style={styles.laterText}>Later</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xl,
  },
  backdropTouch: { ...StyleSheet.absoluteFillObject },
  card: {
    width: '100%',
    maxWidth: 360,
    backgroundColor: colors.white,
    borderRadius: radius.lg,
    padding: spacing.xl,
  },
  title: {
    fontSize: font.heading,
    fontWeight: '700',
    color: colors.text,
    marginBottom: spacing.xs,
  },
  version: {
    fontSize: font.body,
    color: colors.textMuted,
    marginBottom: spacing.md,
  },
  notes: {
    fontSize: font.label,
    color: colors.text,
    marginBottom: spacing.lg,
    lineHeight: 20,
  },
  updateBtn: {
    height: 46,
    borderRadius: radius.pill,
    backgroundColor: auth.crimson,
    alignItems: 'center',
    justifyContent: 'center',
  },
  updateText: { color: colors.white, fontWeight: '700', fontSize: font.label },
  laterBtn: {
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: spacing.sm,
  },
  laterText: { color: colors.textMuted, fontWeight: '600', fontSize: font.label },
});

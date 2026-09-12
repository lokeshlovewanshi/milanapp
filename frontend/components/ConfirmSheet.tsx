import { View, Text, StyleSheet, Modal, Pressable, TouchableOpacity } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { auth, colors, font, radius, spacing } from './theme';

/**
 * A bottom-sheet confirmation.
 *
 * Replaces Alert.alert for destructive actions. The system dialog appears in
 * the middle of the screen in the OS's own styling, which on Android puts the
 * confirm button under whichever finger is least likely to be there. A sheet
 * arrives from the bottom where the thumb already is, and looks like the rest
 * of the app.
 *
 * Cancel sits on the left and is the outlined one: the filled button is the
 * action you asked for, but the quiet one should be the easy miss.
 *
 * softenConfirm flips both the order and the treatment - confirm moves to the
 * left and loses its fill, cancel gains it. For an action severe enough that
 * the safe choice should be the one that is easy and loud, not the one that
 * is merely first: hiding or deleting the whole profile, where a filled
 * "Delete" is the last thing that button should look easy to hit.
 */

type Props = {
  visible: boolean;
  title: string;
  message?: string;
  /** Label for the destructive button. */
  confirmLabel?: string;
  cancelLabel?: string;
  onCancel: () => void;
  onConfirm: () => void;
  /** Confirm on the left, outlined; Cancel on the right, filled. */
  softenConfirm?: boolean;
};

export default function ConfirmSheet({
  visible,
  title,
  message,
  confirmLabel = 'Yes',
  cancelLabel = 'No',
  onCancel,
  onConfirm,
  softenConfirm = false,
}: Props) {
  const insets = useSafeAreaInsets();

  const confirmBtn = (
    <TouchableOpacity
      key="confirm"
      style={[styles.button, softenConfirm ? styles.cancel : styles.confirm]}
      activeOpacity={softenConfirm ? 0.8 : 0.85}
      onPress={onConfirm}
    >
      <Text style={softenConfirm ? styles.cancelText : styles.confirmText}>{confirmLabel}</Text>
    </TouchableOpacity>
  );

  const cancelBtn = (
    <TouchableOpacity
      key="cancel"
      style={[styles.button, softenConfirm ? styles.confirm : styles.cancel]}
      activeOpacity={softenConfirm ? 0.85 : 0.8}
      onPress={onCancel}
    >
      <Text style={softenConfirm ? styles.confirmText : styles.cancelText}>{cancelLabel}</Text>
    </TouchableOpacity>
  );

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onCancel}>
      <View style={styles.backdrop}>
        {/* Tapping the dimmed area cancels - the same expectation every other
            sheet in the app sets. */}
        <Pressable style={styles.backdropTouch} onPress={onCancel} />

        <View style={[styles.sheet, { paddingBottom: insets.bottom + spacing.lg }]}>
          <View style={styles.grabber} />

          <Text style={styles.title}>{title}</Text>
          {!!message && <Text style={styles.message}>{message}</Text>}

          <View style={styles.row}>
            {softenConfirm ? confirmBtn : cancelBtn}
            {softenConfirm ? cancelBtn : confirmBtn}
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  backdropTouch: { flex: 1 },
  sheet: {
    backgroundColor: colors.bg,
    borderTopLeftRadius: 22,
    borderTopRightRadius: 22,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
    gap: spacing.md,
  },
  grabber: {
    alignSelf: 'center',
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.border,
    marginBottom: spacing.sm,
  },
  title: {
    fontSize: font.heading,
    fontWeight: '700',
    color: colors.heading,
  },
  message: {
    fontSize: font.label,
    color: colors.textMuted,
    lineHeight: 20,
  },
  row: {
    flexDirection: 'row',
    gap: spacing.md,
    marginTop: spacing.sm,
  },
  button: {
    flex: 1,
    height: 50,
    borderRadius: radius.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancel: {
    borderWidth: 1.5,
    borderColor: auth.crimson,
    backgroundColor: colors.bg,
  },
  cancelText: {
    color: auth.crimson,
    fontSize: font.title,
    fontWeight: '600',
  },
  // Same crimson as the Connect button everywhere else - this sheet was the
  // one place still on the brighter, unrelated colors.brand.
  confirm: {
    backgroundColor: auth.crimson,
  },
  confirmText: {
    color: colors.white,
    fontSize: font.title,
    fontWeight: '700',
  },
});

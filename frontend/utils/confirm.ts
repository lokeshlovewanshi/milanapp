import { Alert, Platform } from 'react-native';

/**
 * Cross-platform confirmation dialog.
 *
 * Alert.alert() renders but ignores its buttons on react-native-web, so a
 * destructive action wired only through Alert would fire immediately (or never)
 * in the browser. Fall back to window.confirm there.
 */
export function confirmAction(
  title: string,
  message: string,
  confirmLabel: string,
  onConfirm: () => void
) {
  if (Platform.OS === 'web') {
    // eslint-disable-next-line no-alert
    if (window.confirm(`${title}\n\n${message}`)) onConfirm();
    return;
  }

  Alert.alert(title, message, [
    { text: 'Cancel', style: 'cancel' },
    { text: confirmLabel, style: 'destructive', onPress: onConfirm },
  ]);
}

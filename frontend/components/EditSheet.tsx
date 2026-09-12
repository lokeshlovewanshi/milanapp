import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import type { ReactNode } from 'react';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import FormScroll from './FormScroll';
import { auth, colors, font, radius, spacing } from './theme';

type Props = {
  visible: boolean;
  title: string;
  subtitle?: string;
  children: ReactNode;
  saving?: boolean;
  saveLabel?: string;
  onClose: () => void;
  onSave: () => void;
};

/**
 * The outer edit sheet: close button, large title, grey subtitle, scrolling
 * field list, and a full-width primary action pinned at the bottom.
 *
 * Full-screen rather than a partial sheet because these sections carry five to
 * ten fields plus suggestion chips - a half-height sheet would spend most of
 * its space scrolling.
 *
 * Nested OptionSheets render over this and dim it, so the user keeps their
 * place in the form while picking a value.
 */
export default function EditSheet({
  visible,
  title,
  subtitle,
  children,
  saving = false,
  saveLabel = 'Save',
  onClose,
  onSave,
}: Props) {
  const insets = useSafeAreaInsets();

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <View style={[styles.container, { paddingTop: insets.top }]}>
        <View style={styles.topBar}>
          <TouchableOpacity hitSlop={12} onPress={onClose} accessibilityLabel="Close">
            <Ionicons name="close" size={26} color={colors.heading} />
          </TouchableOpacity>
        </View>

        <FormScroll style={styles.scroll} contentContainerStyle={styles.scrollContent}>
          <Text style={styles.title}>{title}</Text>
          {!!subtitle && <Text style={styles.subtitle}>{subtitle}</Text>}

          <View style={styles.fields}>{children}</View>
        </FormScroll>

        <View style={[styles.footer, { paddingBottom: insets.bottom + spacing.md }]}>
          <TouchableOpacity
            style={[styles.save, saving && styles.saveDisabled]}
            activeOpacity={0.85}
            onPress={onSave}
            disabled={saving}
          >
            {saving ? (
              <ActivityIndicator color={colors.white} />
            ) : (
              <Text style={styles.saveText}>{saveLabel}</Text>
            )}
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  topBar: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.xl,
  },
  title: {
    fontSize: 26,
    fontWeight: 'bold',
    color: colors.heading,
    marginBottom: 4,
  },
  subtitle: {
    fontSize: font.label,
    color: colors.fieldLabel,
  },
  fields: {
    marginTop: spacing.sm,
  },
  footer: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    backgroundColor: colors.bg,
  },
  save: {
    height: 54,
    borderRadius: radius.sm,
    backgroundColor: auth.crimsonLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  saveDisabled: {
    opacity: 0.6,
  },
  saveText: {
    color: colors.white,
    fontSize: 17,
    fontWeight: 'bold',
  },
});

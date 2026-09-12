import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { useState, useEffect, useCallback } from 'react';
import { useLocalSearchParams } from 'expo-router';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { profileAPI } from '../utils/api';
import { useGuardedRouter } from '../utils/useGuardedRouter';
import SectionForm from '../components/SectionForm';
import FormScroll, { useKeyboardHeight } from '../components/FormScroll';
import { SECTIONS, buildPayload, missingRequiredKeys } from '../components/sectionSchema';
import { auth, colors, font, radius, spacing } from '../components/theme';
import Loader from '../components/Loader';

/**
 * Edits one profile section, chosen by ?section=.
 *
 * Field rendering lives in SectionForm, shared with the guided setup flow, so
 * the two screens cannot drift apart.
 */
export default function EditProfileScreen() {
  const router = useGuardedRouter();
  const insets = useSafeAreaInsets();
  // Drives the footer lift below, so Save stays reachable while typing.
  const keyboard = useKeyboardHeight();
  const { section } = useLocalSearchParams<{ section?: string }>();

  const spec = SECTIONS[section ?? 'basic'] ?? SECTIONS.basic;

  const [values, setValues] = useState<Record<string, any>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState<Set<string>>(new Set());

  useEffect(() => {
    let alive = true;
    setLoading(true);
    profileAPI[spec.get]()
      .then((res) => alive && setValues(res.data ?? {}))
      .catch((e: any) => console.log(`Failed to load ${spec.key}:`, e?.message))
      .finally(() => alive && setLoading(false));
    return () => {
      alive = false;
    };
  }, [spec]);

  const set = useCallback((key: string, value: any) => {
    setValues((prev) => ({ ...prev, [key]: value }));
    setErrors((prev) => {
      if (!prev.has(key)) return prev;
      const next = new Set(prev);
      next.delete(key);
      return next;
    });
  }, []);

  const save = async () => {
    setSaving(true);
    try {
      const missing = missingRequiredKeys(spec, values);
      if (missing.length > 0) {
        setErrors(new Set(missing));
        return;
      }
      setErrors(new Set());

      await profileAPI[spec.patch](buildPayload(spec, values));
      router.back();
    } catch (error: any) {
      Alert.alert(
        'Could not save',
        error?.response?.data?.message || error?.response?.data?.detail || 'Please try again'
      );
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <Loader size={38} />
      </View>
    );
  }

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.topBar}>
        <TouchableOpacity hitSlop={12} onPress={() => router.back()} accessibilityLabel="Close">
          <Ionicons name="close" size={26} color={colors.heading} />
        </TouchableOpacity>
      </View>

      {/* FormScroll, not ScrollView. This screen is edge-to-edge, and an
          edge-to-edge Android window does not resize when the keyboard opens -
          it keeps its full height and the keyboard simply draws over it. So a
          plain ScrollView leaves the lower fields underneath the keyboard with
          no way to reach them. FormScroll measures the keyboard and pads and
          scrolls for it; every other form screen already used it and this one
          was missed. */}
      <FormScroll
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.title}>{spec.title}</Text>
        <Text style={styles.subtitle}>{spec.subtitle}</Text>

        <SectionForm spec={spec} values={values} onChange={set} errors={errors} />

        <View style={{ height: spacing.xl }} />
      </FormScroll>

      {/* Lifted above the keyboard rather than left pinned to the window.
          Fixing Save to the bottom of an edge-to-edge window puts it behind
          the keyboard, so saving meant dismissing the keyboard first - and on
          a long form the field you just filled in is the one that scrolls away
          when you do. The safe-area inset only applies when the keyboard is
          closed; while it is open the keyboard already covers that area. */}
      <View
        style={[
          styles.footer,
          { marginBottom: keyboard, paddingBottom: keyboard > 0 ? spacing.md : insets.bottom + spacing.md },
        ]}
      >
        <TouchableOpacity
          style={[styles.save, saving && styles.saveDisabled]}
          activeOpacity={0.85}
          onPress={save}
          disabled={saving}
        >
          {saving ? (
            <ActivityIndicator color={colors.white} />
          ) : (
            <Text style={styles.saveText}>Save</Text>
          )}
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.bg },
  topBar: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
  },
  scroll: { paddingHorizontal: spacing.lg, paddingBottom: spacing.xl },
  title: { fontSize: 26, fontWeight: 'bold', color: colors.heading, marginBottom: 4 },
  subtitle: { fontSize: font.label, color: colors.fieldLabel, marginBottom: spacing.sm },
  footer: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    backgroundColor: colors.bg,
    borderTopWidth: 1,
    borderTopColor: colors.hairline,
  },
  save: {
    height: 54,
    borderRadius: radius.sm,
    backgroundColor: auth.crimson,
    alignItems: 'center',
    justifyContent: 'center',
  },
  saveDisabled: { opacity: 0.6 },
  saveText: { color: colors.white, fontSize: 17, fontWeight: 'bold' },
});

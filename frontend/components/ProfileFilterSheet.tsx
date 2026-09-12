import { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Modal, Pressable, TouchableOpacity, TextInput, ScrollView } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useReference } from '../utils/useReference';
import ChipRow from './ChipRow';
import FieldRow from './FieldRow';
import OptionSheet from './OptionSheet';
import { colors, font, radius, spacing, auth } from './theme';

export type ProfileFilters = {
  ageFrom?: number | null;
  ageTo?: number | null;
  maritalStatus?: string | null;
  manglik?: string | null;
  profession?: string | null;
  /** Height lookup codes ("H_60"), not centimetres. */
  heightFrom?: string | null;
  heightTo?: string | null;
};

type Props = {
  visible: boolean;
  value: ProfileFilters;
  onApply: (next: ProfileFilters) => void;
  onClose: () => void;
};

/** True if any filter is actually set - drives the badge on the Filter icon. */
export const hasActiveFilters = (f: ProfileFilters): boolean =>
  !!(f.ageFrom || f.ageTo || f.maritalStatus || f.manglik || f.profession || f.heightFrom || f.heightTo);

/**
 * Filter bar for "See all profiles" - age range, profession, manglik and
 * marital status, opened from a Filter icon next to the search box.
 *
 * Draft state, not live: values only reach the parent (and the server) on
 * Apply, so scrubbing a chip doesn't refetch the list on every tap.
 */
export default function ProfileFilterSheet({ visible, value, onApply, onClose }: Props) {
  const insets = useSafeAreaInsets();
  const { list, label } = useReference();

  const [ageFrom, setAgeFrom] = useState('');
  const [ageTo, setAgeTo] = useState('');
  const [maritalStatus, setMaritalStatus] = useState<string | null>(null);
  const [manglik, setManglik] = useState<string | null>(null);
  const [profession, setProfession] = useState<string | null>(null);
  const [heightFrom, setHeightFrom] = useState<string | null>(null);
  const [heightTo, setHeightTo] = useState<string | null>(null);

  /** Which height field the OptionSheet is currently editing, if any. */
  const [heightPicker, setHeightPicker] = useState<'from' | 'to' | null>(null);

  // Re-seeded from the current filters each time the sheet opens, so a
  // cancelled edit does not leak into the next time it is opened.
  useEffect(() => {
    if (!visible) return;
    setAgeFrom(value.ageFrom ? String(value.ageFrom) : '');
    setAgeTo(value.ageTo ? String(value.ageTo) : '');
    setMaritalStatus(value.maritalStatus ?? null);
    setManglik(value.manglik ?? null);
    setProfession(value.profession ?? null);
    setHeightFrom(value.heightFrom ?? null);
    setHeightTo(value.heightTo ?? null);
  }, [visible, value]);

  const apply = () => {
    onApply({
      ageFrom: ageFrom.trim() ? Number(ageFrom) : null,
      ageTo: ageTo.trim() ? Number(ageTo) : null,
      maritalStatus,
      manglik,
      profession,
      heightFrom,
      heightTo,
    });
    onClose();
  };

  const reset = () => {
    setAgeFrom('');
    setAgeTo('');
    setMaritalStatus(null);
    setManglik(null);
    setProfession(null);
    setHeightFrom(null);
    setHeightTo(null);
  };

  const toggle = (current: string | null, code: string, set: (v: string | null) => void) =>
    set(current === code ? null : code);

  const heightLabel = (code: string | null) => (code ? label('height', code) : '');

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <Pressable style={styles.backdropTouch} onPress={onClose} />

        <View style={[styles.sheet, { paddingBottom: insets.bottom + spacing.lg }]}>
          <View style={styles.grabber} />
          <Text style={styles.title}>Filter profiles</Text>

          <ScrollView showsVerticalScrollIndicator={false} style={styles.body}>
            <Text style={styles.label}>Age</Text>
            <View style={styles.ageRow}>
              <TextInput
                style={styles.ageInput}
                placeholder="From"
                placeholderTextColor={colors.textMuted}
                keyboardType="number-pad"
                value={ageFrom}
                onChangeText={setAgeFrom}
                maxLength={3}
              />
              <Text style={styles.ageDash}>–</Text>
              <TextInput
                style={styles.ageInput}
                placeholder="To"
                placeholderTextColor={colors.textMuted}
                keyboardType="number-pad"
                value={ageTo}
                onChangeText={setAgeTo}
                maxLength={3}
              />
            </View>

            <Text style={styles.label}>Height</Text>
            <View style={styles.heightRow}>
              <View style={styles.heightField}>
                <FieldRow
                  label="From"
                  value={heightLabel(heightFrom)}
                  placeholder="Any"
                  onPress={() => setHeightPicker('from')}
                  last
                />
              </View>
              <View style={styles.heightField}>
                <FieldRow
                  label="To"
                  value={heightLabel(heightTo)}
                  placeholder="Any"
                  onPress={() => setHeightPicker('to')}
                  last
                />
              </View>
            </View>

            <Text style={styles.label}>Marital status</Text>
            <ChipRow
              chips={list('marital_status')}
              selected={maritalStatus ? [maritalStatus] : []}
              onPress={(code) => toggle(maritalStatus, code, setMaritalStatus)}
            />

            <Text style={styles.label}>Manglik</Text>
            <ChipRow
              chips={list('manglik')}
              selected={manglik ? [manglik] : []}
              onPress={(code) => toggle(manglik, code, setManglik)}
            />

            <Text style={styles.label}>Profession</Text>
            <ChipRow
              chips={list('profession')}
              selected={profession ? [profession] : []}
              onPress={(code) => toggle(profession, code, setProfession)}
            />
          </ScrollView>

          <View style={styles.actions}>
            <TouchableOpacity style={styles.resetBtn} activeOpacity={0.8} onPress={reset}>
              <Text style={styles.resetText}>Reset</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.applyBtn} activeOpacity={0.85} onPress={apply}>
              <Text style={styles.applyText}>Apply</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>

      <OptionSheet
        visible={!!heightPicker}
        title={heightPicker === 'from' ? 'Height from' : 'Height to'}
        options={list('height')}
        value={heightPicker === 'from' ? heightFrom : heightTo}
        onClose={() => setHeightPicker(null)}
        onSave={(v) => {
          const code = (Array.isArray(v) ? v[0] : v) || null;
          if (heightPicker === 'from') setHeightFrom(code);
          else if (heightPicker === 'to') setHeightTo(code);
        }}
      />
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' },
  backdropTouch: { flex: 1 },
  sheet: {
    backgroundColor: colors.white,
    borderTopLeftRadius: radius.lg,
    borderTopRightRadius: radius.lg,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
    maxHeight: '82%',
  },
  grabber: {
    alignSelf: 'center',
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.border,
    marginBottom: spacing.md,
  },
  title: {
    fontSize: font.heading,
    fontWeight: '700',
    color: colors.text,
    marginBottom: spacing.md,
  },
  body: { marginBottom: spacing.md },
  label: {
    fontSize: font.label,
    fontWeight: '600',
    color: colors.fieldLabel,
    marginTop: spacing.lg,
    marginBottom: spacing.sm,
  },
  ageRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  ageInput: {
    flex: 1,
    height: 44,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: spacing.md,
    fontSize: font.label,
    color: colors.text,
  },
  ageDash: { color: colors.textMuted, fontSize: font.title },
  heightRow: { flexDirection: 'row', gap: spacing.lg },
  heightField: { flex: 1 },
  actions: {
    flexDirection: 'row',
    gap: spacing.md,
    paddingTop: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.hairline,
  },
  resetBtn: {
    flex: 1,
    height: 46,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  resetText: { color: colors.text, fontWeight: '600', fontSize: font.label },
  applyBtn: {
    flex: 2,
    height: 46,
    borderRadius: radius.pill,
    backgroundColor: auth.crimson,
    alignItems: 'center',
    justifyContent: 'center',
  },
  applyText: { color: colors.white, fontWeight: '700', fontSize: font.label },
});

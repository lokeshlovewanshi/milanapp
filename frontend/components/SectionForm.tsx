import {
  View,
  Text,
  StyleSheet,
  TextInput,
  Modal,
  Pressable,
  TouchableOpacity,
  Platform,
} from 'react-native';
import { useState, useEffect, useCallback } from 'react';
import DateTimePicker from '@react-native-community/datetimepicker';
import FieldRow from './FieldRow';
import ChipRow from './ChipRow';
import OptionSheet from './OptionSheet';
import { useReference, useLocations, type Option } from '../utils/useReference';
import { referenceAPI } from '../utils/api';
import { toDbTime, parseDbTime, formatTime } from '../utils/timeOfBirth';
import type { FieldSpec, SectionSpec } from './sectionSchema';
import { auth, colors, font, radius, spacing } from './theme';

/** Marriage profiles: nobody under 18, nobody over 100. */
const today = new Date();
const MAX_DOB = new Date(today.getFullYear() - 18, today.getMonth(), today.getDate());
const MIN_DOB = new Date(today.getFullYear() - 100, 0, 1);

/** Backend fields are LocalDateTime, so send midnight local time. */
const toIso = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(
    d.getDate()
  ).padStart(2, '0')}T00:00:00`;

const parseDate = (raw: any): Date => {
  if (!raw) return MAX_DOB;
  const d = new Date(raw);
  return Number.isNaN(d.getTime()) ? MAX_DOB : d;
};

const formatDate = (raw: any): string => {
  if (!raw) return '';
  const d = new Date(raw);
  if (Number.isNaN(d.getTime())) return '';
  return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' });
};

type Props = {
  spec: SectionSpec;
  values: Record<string, any>;
  onChange: (key: string, value: any) => void;
  /** Field keys currently missing a required value - shown red, inline, no popup. */
  errors?: Set<string>;
};

/**
 * Hindi shown alongside a handful of option labels the server does not carry
 * translations for. Keyed by lookup category then option code, so it only
 * touches the two marital-status values asked for rather than guessing at a
 * translation for every lookup table.
 */
const OPTION_LABEL_HINDI: Record<string, Record<string, string>> = {
  marital_status: {
    NEVER_MARRIED: 'Never Married / अविवाहित',
    DIVORCED: 'Divorced / तलाक',
  },
};

/**
 * Renders one profile section's fields from its schema.
 *
 * Shared by the edit sheet and the guided setup flow. Both used to own a copy
 * of this layout - the setup screen with its own hardcoded option arrays - which
 * meant a dropdown could be right in one place and stale in the other. Options
 * now come from /reference/options in both.
 *
 * Three treatments, chosen by how many choices a field has:
 *  - text/number/textarea: edits in place, nothing to pick
 *  - chips: short sets, tappable inline - faster than opening a sheet for three
 *  - select: everything else, via the searchable OptionSheet
 */
export default function SectionForm({ spec, values, onChange, errors }: Props) {
  const { list } = useReference();
  const { states, cities, loadCities } = useLocations();
  const [picker, setPicker] = useState<FieldSpec | null>(null);

  /**
   * Birth place searches the server rather than a list held on the device.
   *
   * There are over a thousand cities. Shipping them all so the app can filter
   * locally means a slow first render and a payload that goes stale; the API
   * ranks prefix matches first and caps the result, which is what a type-ahead
   * actually needs.
   *
   * The state is shown alongside the name because city names repeat - there is
   * a Hyderabad in Telangana and one in Sindh, and several Rampurs.
   */
  const searchCities = useCallback(async (query: string): Promise<Option[]> => {
    const res = await referenceAPI.cities({ search: query });
    return (res.data ?? []).map((c: any) => ({
      code: c.name,
      label: c.state ? `${c.name}, ${c.state}` : c.name,
    }));
  }, []);

  const cityOption = (c: any): Option => ({
    code: c.name,
    label: c.state ? `${c.name}, ${c.state}` : c.name,
  });

  /**
   * A-Z browse for the same picker, one page at a time.
   *
   * Search covers "I know the city"; this covers "I'll recognise it if I see
   * it" - the picker used to show nothing at all until two characters were
   * typed, which is a bad first impression for open a picker, see a wall of
   * nothing.
   */
  const [cityBrowse, setCityBrowse] = useState<{
    items: Option[];
    page: number;
    hasMore: boolean;
    loading: boolean;
  }>({ items: [], page: 0, hasMore: true, loading: false });

  const loadCityPage = useCallback(async (page: number) => {
    setCityBrowse((prev) => ({ ...prev, loading: true }));
    try {
      const res = await referenceAPI.cities({ alphabetical: true, page, size: 50 });
      const rows = (res.data ?? []).map(cityOption);
      setCityBrowse((prev) => ({
        items: page === 0 ? rows : [...prev.items, ...rows],
        page,
        hasMore: rows.length === 50,
        loading: false,
      }));
    } catch {
      setCityBrowse((prev) => ({ ...prev, loading: false }));
    }
  }, []);

  const [datePicker, setDatePicker] = useState<FieldSpec | null>(null);
  const [timePicker, setTimePicker] = useState<FieldSpec | null>(null);

  // Loads the first page the moment the birth-place picker opens, so it is
  // never the thing sitting there empty. Fetched once per screen visit - the
  // list does not change while the sheet is open.
  useEffect(() => {
    if (picker?.remote === 'city' && cityBrowse.items.length === 0 && !cityBrowse.loading) {
      loadCityPage(0);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [picker]);

  // City options depend on the chosen state.
  useEffect(() => {
    if (spec.key === 'contact') loadCities(values.state);
  }, [spec.key, values.state, loadCities]);

  const optionsFor = useCallback(
    (field: FieldSpec): Option[] => {
      if (field.key === 'state') return states.map((s) => ({ code: s.name, label: s.name }));
      if (field.key === 'city') return cities.map((c) => ({ code: c.name, label: c.name }));
      if (field.remote === 'city') return cityBrowse.items;
      return field.lookup ? list(field.lookup) : [];
    },
    [states, cities, list, cityBrowse.items]
  );

  const displayValue = useCallback(
    (field: FieldSpec): string => {
      const raw = values[field.key];
      if (raw == null || raw === '') return '';
      if (field.key === 'state' || field.key === 'city') return String(raw);
      if (field.lookup) {
        const found = optionsFor(field).find((o) => o.code === String(raw));
        // Falls back to the raw value so rows written before the lookup tables
        // existed still show something readable rather than blank.
        return found?.label ?? String(raw);
      }
      if (field.kind === 'date') return formatDate(raw);
      if (field.kind === 'time') return formatTime(raw);
      return String(raw);
    },
    [values, optionsFor]
  );

  /**
   * Android's picker is a system dialog that reports its own dismissal, so it
   * closes itself. iOS renders inline and needs a container with a Done button,
   * hence the Modal wrapper below rather than one shared code path.
   */
  const onDateChange = (event: any, selected?: Date) => {
    if (Platform.OS === 'android') {
      setDatePicker(null);
      if (event?.type === 'dismissed' || !selected) return;
    }
    if (selected && datePicker) onChange(datePicker.key, toIso(selected));
  };

  /** Same Android/iOS split as the date picker, storing "HH:mm:ss". */
  const onTimeChange = (event: any, selected?: Date) => {
    if (Platform.OS === 'android') {
      setTimePicker(null);
      if (event?.type === 'dismissed' || !selected) return;
    }
    if (selected && timePicker) onChange(timePicker.key, toDbTime(selected));
  };

  return (
    <View>
      {spec.fields.map((field, i) => {
        const opts = optionsFor(field);
        const last = i === spec.fields.length - 1;

        const hasError = !!errors?.has(field.key);
        const hindi = field.lookup ? OPTION_LABEL_HINDI[field.lookup] : undefined;
        const chipOpts = hindi ? opts.map((o) => ({ ...o, label: hindi[o.code] ?? o.label })) : opts;

        if (field.kind === 'text' || field.kind === 'number' || field.kind === 'textarea') {
          return (
            <View key={field.key} style={styles.inputBlock}>
              <Text style={styles.label}>
                {field.label}
                {field.required && <Text style={styles.asterisk}> *</Text>}
              </Text>
              <TextInput
                style={[styles.input, field.kind === 'textarea' && styles.textarea]}
                value={values[field.key] == null ? '' : String(values[field.key])}
                onChangeText={(t) => onChange(field.key, t)}
                placeholder={field.placeholder ?? 'Enter'}
                placeholderTextColor={colors.textFaint}
                keyboardType={field.keyboard ?? 'default'}
                multiline={field.kind === 'textarea'}
              />
              {hasError && <Text style={styles.errorText}>Required</Text>}
              {!last && <View style={styles.rule} />}
            </View>
          );
        }

        if (field.kind === 'chips') {
          return (
            <View key={field.key} style={styles.chipBlock}>
              <Text style={styles.label}>
                {field.label}
                {field.required && <Text style={styles.asterisk}> *</Text>}
              </Text>
              <ChipRow
                chips={chipOpts}
                selected={values[field.key] ? [String(values[field.key])] : []}
                // Tapping the selected chip clears it, so a field is never stuck
                // on a value the user picked by accident.
                onPress={(code) => onChange(field.key, values[field.key] === code ? '' : code)}
              />
              {hasError && <Text style={styles.errorText}>Required</Text>}
              {!last && <View style={styles.ruleSpaced} />}
            </View>
          );
        }

        return (
          <View key={field.key}>
            <FieldRow
              label={field.label}
              value={displayValue(field)}
              placeholder={field.placeholder ?? (field.kind === 'date' ? 'Select date' : 'Select')}
              onPress={() => {
                if (field.kind === 'date') setDatePicker(field);
                else if (field.kind === 'time') setTimePicker(field);
                else setPicker(field);
              }}
              last={last && !field.suggest}
              required={field.required}
              error={hasError}
            />
            {!!field.suggest && (
              <View style={styles.suggestBlock}>
                <ChipRow
                  caption={`Suggested ${field.label.toLowerCase()} to add:`}
                  chips={opts
                    .filter((o) => o.code !== values[field.key])
                    .slice(0, field.suggest)}
                  onPress={(code) => onChange(field.key, code)}
                />
              </View>
            )}
          </View>
        );
      })}

      <OptionSheet
        visible={!!picker}
        title={picker?.label ?? ''}
        options={picker ? optionsFor(picker) : []}
        value={picker ? values[picker.key] : null}
        multi={picker?.kind === 'multiselect'}
        onSearch={picker?.remote === 'city' ? searchCities : undefined}
        onLoadMore={
          picker?.remote === 'city' && cityBrowse.hasMore
            ? () => loadCityPage(cityBrowse.page + 1)
            : undefined
        }
        loadingMore={picker?.remote === 'city' && cityBrowse.loading}
        onClose={() => setPicker(null)}
        onSave={(v) => picker && onChange(picker.key, v)}
      />

      {/* Android shows native calendar picker dialog; iOS shows calendar view */}
      {!!datePicker && Platform.OS === 'android' && (
        <DateTimePicker
          value={parseDate(values[datePicker.key])}
          mode="date"
          display="calendar"
          maximumDate={MAX_DOB}
          minimumDate={MIN_DOB}
          onChange={onDateChange}
        />
      )}

      {Platform.OS !== 'android' && (
        <Modal visible={!!datePicker} transparent animationType="slide">
          <View style={styles.backdrop}>
            <Pressable style={{ flex: 1 }} onPress={() => setDatePicker(null)} />
            <View style={styles.dateSheet}>
              <Text style={styles.dateTitle}>{datePicker?.label}</Text>
              {!!datePicker && (
                <DateTimePicker
                  value={parseDate(values[datePicker.key])}
                  mode="date"
                  display="inline"
                  maximumDate={MAX_DOB}
                  minimumDate={MIN_DOB}
                  onChange={onDateChange}
                  style={styles.datePicker}
                />
              )}
              <TouchableOpacity
                style={styles.doneBtn}
                activeOpacity={0.85}
                onPress={() => {
                  // Seed the field if the user opens and confirms without
                  // spinning, so Done always produces a value.
                  if (datePicker && !values[datePicker.key]) {
                    onChange(datePicker.key, toIso(MAX_DOB));
                  }
                  setDatePicker(null);
                }}
              >
                <Text style={styles.doneText}>Done</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>
      )}

      {/* Time of birth is a clock wheel, never a keyboard. A text box on this
          field collected "4.30pm", "morning" and blank strings - none of which
          the TIME column can store, and none of which an astrologer can use. */}
      {!!timePicker && Platform.OS === 'android' && (
        <DateTimePicker
          value={parseDbTime(values[timePicker.key])}
          mode="time"
          display="spinner"
          is24Hour={false}
          onChange={onTimeChange}
        />
      )}

      {Platform.OS !== 'android' && (
        <Modal visible={!!timePicker} transparent animationType="slide">
          <View style={styles.backdrop}>
            <Pressable style={{ flex: 1 }} onPress={() => setTimePicker(null)} />
            <View style={styles.dateSheet}>
              <Text style={styles.dateTitle}>{timePicker?.label}</Text>
              <Text style={styles.dateHint}>
                As close as you know it - it is used for the horoscope match
              </Text>
              {!!timePicker && (
                <DateTimePicker
                  value={parseDbTime(values[timePicker.key])}
                  mode="time"
                  display="spinner"
                  is24Hour={false}
                  onChange={onTimeChange}
                  style={styles.datePicker}
                />
              )}
              <TouchableOpacity
                style={styles.doneBtn}
                activeOpacity={0.85}
                onPress={() => {
                  if (timePicker && !values[timePicker.key]) {
                    onChange(timePicker.key, toDbTime(parseDbTime(null)));
                  }
                  setTimePicker(null);
                }}
              >
                <Text style={styles.doneText}>Done</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  inputBlock: { paddingTop: spacing.lg },
  label: {
    fontSize: font.body,
    fontWeight: '600',
    color: colors.fieldLabel,
    marginBottom: 6,
  },
  asterisk: { color: colors.danger },
  errorText: { fontSize: font.small, color: colors.danger, marginTop: 4 },
  input: {
    fontSize: 17,
    color: colors.fieldValue,
    paddingBottom: spacing.md,
    padding: 0,
    paddingTop: 0,
  },
  textarea: { minHeight: 68, textAlignVertical: 'top' },
  rule: { height: 1, backgroundColor: colors.hairline },
  ruleSpaced: { height: 1, backgroundColor: colors.hairline, marginTop: spacing.lg },
  chipBlock: { paddingTop: spacing.lg, gap: spacing.sm },
  suggestBlock: { paddingTop: spacing.md, paddingBottom: spacing.sm },

  backdrop: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.5)' },
  dateSheet: {
    backgroundColor: colors.bg,
    borderTopLeftRadius: 22,
    borderTopRightRadius: 22,
    padding: spacing.lg,
    paddingBottom: spacing.xl,
    gap: spacing.md,
  },
  dateTitle: { fontSize: 21, fontWeight: 'bold', color: colors.heading },
  dateHint: { fontSize: font.body, color: colors.fieldLabel, marginTop: -spacing.sm },
  datePicker: { alignSelf: 'center' },
  doneBtn: {
    alignSelf: 'flex-end',
    paddingHorizontal: 40,
    paddingVertical: 14,
    borderRadius: radius.sm,
    backgroundColor: auth.crimsonLight,
  },
  doneText: { color: colors.white, fontSize: font.title, fontWeight: 'bold' },
});

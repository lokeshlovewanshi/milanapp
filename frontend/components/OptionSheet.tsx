import {
  View,
  Text,
  StyleSheet,
  Modal,
  Pressable,
  TouchableOpacity,
  TextInput,
  FlatList,
  Dimensions,
  ActivityIndicator,
} from 'react-native';
import { useState, useMemo, useEffect } from 'react';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import ChipRow from './ChipRow';
import { useCoveredHeight } from './FormScroll';
import { auth, colors, font, radius, spacing } from './theme';
import type { Option } from '../utils/useReference';

const { height } = Dimensions.get('window');

type Props = {
  visible: boolean;
  title: string;
  options: Option[];
  /** Selected code, or codes when multi. */
  value?: string | string[] | null;
  multi?: boolean;
  searchable?: boolean;
  /**
   * Fetch matches from the server instead of filtering `options` locally.
   *
   * For a list of a thousand-odd cities, shipping every row to the device just
   * so it can be filtered there is the wrong trade: it is a slow first render,
   * a large payload, and it goes stale. With this set, `options` is only the
   * starting content (recent or popular), and typing queries the API.
   */
  onSearch?: (query: string) => Promise<Option[]>;
  /** Let a typed value be saved when it is not in the suggested list. */
  allowCustom?: boolean;
  /**
   * Fetch the next page of `options` while browsing (nothing typed yet).
   * Ignored once there is a search query in progress - paging and searching
   * are two different lists, and mixing them would append search-irrelevant
   * rows onto a filtered view.
   */
  onLoadMore?: () => void;
  /** Shows a small spinner under the list instead of at the very bottom edge. */
  loadingMore?: boolean;
  onClose: () => void;
  onSave: (value: string | string[]) => void;
};

/**
 * The picker that slides over an edit sheet.
 *
 * Layout follows the reference screens: selected values as removable chips at
 * the top, a filled search field with the magnifier on the right, a checkbox
 * list, and a right-aligned Done button. The parent sheet stays visible and
 * dimmed behind it so the user keeps their place in the form.
 *
 * Selection is local until Done. Committing per tap would fire a write per
 * keystroke in multi-select and make dismissing-without-saving meaningless.
 */
export default function OptionSheet({
  visible,
  title,
  options,
  value,
  multi = false,
  searchable,
  onSearch,
  allowCustom = false,
  onLoadMore,
  loadingMore,
  onClose,
  onSave,
}: Props) {
  const insets = useSafeAreaInsets();

  // Height of the modal's own window, which Android shrinks for the keyboard
  // while the Activity behind it stays full size.
  const [viewport, setViewport] = useState(0);
  const covered = useCoveredHeight(viewport);
  const [query, setQuery] = useState('');
  const [selected, setSelected] = useState<string[]>([]);
  // Tie results to the query that produced them. Without this, typing another
  // letter briefly rendered the previous/default list above the new match.
  const [remote, setRemote] = useState<{ query: string; results: Option[] } | null>(null);
  const [searching, setSearching] = useState(false);

  // Re-seed on open so a cancelled edit never leaks into the next one.
  useEffect(() => {
    if (!visible) return;
    setQuery('');
    setSelected(value == null ? [] : Array.isArray(value) ? value : [value]);
  }, [visible, value]);

  const showSearch = searchable ?? (!!onSearch || options.length > 8);

  /**
   * Remote lookup, debounced.
   *
   * 250ms because a request per keystroke would fire five or six times for a
   * city name and the earlier answers are all thrown away. The cleanup also
   * marks the effect stale, so a slow response for "ka" cannot land after a
   * fast one for "kanp" and replace the right results with the wrong ones.
   */
  useEffect(() => {
    if (!onSearch) return;

    const q = query.trim();
    if (q.length < 2) {
      setRemote(null);
      setSearching(false);
      return;
    }

    let stale = false;
    setSearching(true);
    const timer = setTimeout(() => {
      onSearch(q)
        .then((results) => {
          if (!stale) setRemote({ query: q, results });
        })
        .catch(() => {
          if (!stale) setRemote({ query: q, results: [] });
        })
        .finally(() => {
          if (!stale) setSearching(false);
        });
    }, 250);

    return () => {
      stale = true;
      clearTimeout(timer);
    };
  }, [query, onSearch]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (onSearch) {
      // Browse suggestions belong only to an empty/one-letter field. Once the
      // member starts typing, never mix those defaults with a remote result:
      // "top four cities + one matching city" looks like a broken filter.
      if (q.length < 2) return options;
      return remote?.query === query.trim() ? remote.results : [];
    }
    if (!q) return options;
    return options.filter((o) => o.label.toLowerCase().includes(q));
  }, [options, query, onSearch, remote]);

  const customValue = useMemo(() => {
    const typed = query.trim();
    if (!allowCustom || !typed) return null;
    return filtered.some(
      (option) =>
        option.code.toLowerCase() === typed.toLowerCase() ||
        option.label.toLowerCase() === typed.toLowerCase(),
    )
      ? null
      : typed;
  }, [allowCustom, filtered, query]);

  const selectedChips = useMemo(
    () =>
      selected
        .map((code) => options.find((o) => o.code === code))
        .filter(Boolean)
        .map((o) => ({ code: o!.code, label: o!.label })),
    [selected, options]
  );

  const toggle = (code: string) => {
    if (multi) {
      setSelected((prev) =>
        prev.includes(code) ? prev.filter((c) => c !== code) : [...prev, code]
      );
    } else {
      setSelected([code]);
    }
  };

  const commit = () => {
    onSave(multi ? selected : (selected[0] ?? ''));
    onClose();
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.backdrop} onLayout={(e) => setViewport(e.nativeEvent.layout.height)}>
        <Pressable style={styles.backdropTouch} onPress={onClose} />

        {/* Two things had to be right here, and each one alone looked broken.
            `covered` is only the part of the keyboard the OS has not already
            resized this modal's window for - padding by the full keyboard
            height threw the sheet into the middle of the screen. And the cap
            has to follow the measured viewport, not the full window: 78% of an
            un-shrunk screen is taller than what is actually visible, which is
            what pushed the results out of sight in the first place. */}
        <View
          style={[
            styles.sheet,
            {
              paddingBottom: covered + insets.bottom + spacing.md,
              maxHeight: (viewport || height) * 0.85,
            },
          ]}
        >
          <View style={styles.grabber} />
          <Text style={styles.title}>{title}</Text>

          {selectedChips.length > 0 && (
            <ChipRow
              chips={selectedChips}
              selected={selected}
              removable
              onPress={(code) => setSelected((prev) => prev.filter((c) => c !== code))}
            />
          )}

          {showSearch && (
            <View style={styles.searchWrap}>
              <TextInput
                style={styles.search}
                placeholder="Type to search"
                placeholderTextColor={colors.textMuted}
                value={query}
                onChangeText={setQuery}
                autoCapitalize="none"
              />
              {query ? (
                <TouchableOpacity hitSlop={8} onPress={() => setQuery('')}>
                  <Ionicons name="close-circle" size={19} color={colors.textMuted} />
                </TouchableOpacity>
              ) : (
                <Ionicons name="search" size={19} color={colors.fieldLabel} />
              )}
            </View>
          )}

          <FlatList
            data={filtered}
            keyExtractor={(item) => item.code}
            keyboardShouldPersistTaps="handled"
            style={styles.list}
            // Browsing only - paging into a live search would append the
            // next alphabetical page onto a filtered list of matches.
            onEndReached={!query.trim() ? onLoadMore : undefined}
            onEndReachedThreshold={0.5}
            ListHeaderComponent={
              customValue ? (
                <TouchableOpacity
                  style={styles.customRow}
                  activeOpacity={0.7}
                  onPress={() => {
                    onSave(customValue);
                    onClose();
                  }}
                >
                  <Ionicons name="add-circle-outline" size={22} color={auth.crimson} />
                  <Text style={styles.customLabel}>Use “{customValue}”</Text>
                </TouchableOpacity>
              ) : null
            }
            ListFooterComponent={
              loadingMore ? (
                <View style={styles.loadingMore}>
                  <ActivityIndicator size="small" color={auth.crimson} />
                </View>
              ) : null
            }
            renderItem={({ item }) => {
              const isOn = selected.includes(item.code);
              return (
                <TouchableOpacity
                  style={styles.row}
                  activeOpacity={0.7}
                  onPress={() => toggle(item.code)}
                >
                  <View style={[styles.box, isOn && styles.boxOn]}>
                    {isOn && <Ionicons name="checkmark" size={15} color={colors.white} />}
                  </View>
                  <Text style={styles.rowLabel}>{item.label}</Text>
                </TouchableOpacity>
              );
            }}
            ListEmptyComponent={
              <View style={styles.empty}>
                <Text style={styles.emptyText}>
                  {options.length === 0 ? 'Loading options…' : `No match for “${query}”`}
                </Text>
              </View>
            }
          />

          <View style={styles.footer}>
            <TouchableOpacity style={styles.done} activeOpacity={0.85} onPress={commit}>
              <Text style={styles.doneText}>Done</Text>
            </TouchableOpacity>
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
  backdropTouch: {
    flex: 1,
  },
  sheet: {
    backgroundColor: colors.bg,
    borderTopLeftRadius: 22,
    borderTopRightRadius: 22,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
    /* Overridden inline while the keyboard is open. */
    maxHeight: height * 0.78,
    gap: spacing.md,
  },
  grabber: {
    alignSelf: 'center',
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.border,
    marginBottom: spacing.xs,
  },
  title: {
    fontSize: 21,
    fontWeight: 'bold',
    color: colors.heading,
  },
  searchWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.lg,
    height: 46,
    borderRadius: radius.md,
    // Filled rather than outlined, matching the reference.
    backgroundColor: colors.surface,
  },
  search: {
    flex: 1,
    fontSize: font.title,
    color: colors.fieldValue,
    padding: 0,
  },
  list: {
    // Never grow past its content, but give up space when the sheet is capped -
    // without flexShrink the list keeps its full height and pushes Done off the
    // bottom the moment the keyboard shortens the sheet.
    flexGrow: 0,
    flexShrink: 1,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: 13,
  },
  customRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: 13,
    borderBottomWidth: 1,
    borderBottomColor: colors.hairline,
  },
  customLabel: { flex: 1, fontSize: font.title, color: auth.crimson, fontWeight: '600' },
  box: {
    width: 22,
    height: 22,
    borderRadius: 5,
    borderWidth: 1.5,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  boxOn: {
    backgroundColor: auth.crimsonLight,
    borderColor: auth.crimson,
  },
  rowLabel: {
    flex: 1,
    fontSize: font.title,
    color: colors.fieldValue,
  },
  empty: {
    paddingVertical: 40,
    alignItems: 'center',
  },
  loadingMore: {
    paddingVertical: spacing.lg,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: font.body,
    color: colors.textMuted,
  },
  footer: {
    // Right-aligned rather than full width, so it reads as "confirm this picker"
    // rather than "save the whole form" - that button lives on the sheet behind.
    alignItems: 'flex-end',
    borderTopWidth: 1,
    borderTopColor: colors.hairline,
    paddingTop: spacing.md,
  },
  done: {
    paddingHorizontal: 40,
    paddingVertical: 14,
    borderRadius: radius.sm,
    backgroundColor: auth.crimsonLight,
  },
  doneText: {
    color: colors.white,
    fontSize: font.title,
    fontWeight: 'bold',
  },
});

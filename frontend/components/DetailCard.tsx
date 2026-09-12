import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { colors, spacing } from './theme';

export type DetailRow = {
  icon: any;
  /** Rendered as-is. Rows with no value are dropped by the card. */
  value?: string | null;
};

type Props = {
  title: string;
  subtitle: string;
  rows?: DetailRow[];
  /** Free text instead of rows, for About Me style cards. */
  body?: string | null;
  /** Omit on someone else's profile - there is nothing to edit, so no pencil. */
  onEdit?: () => void;
  /** Shown when nothing is filled in yet. */
  emptyHint?: string;
};

/**
 * A white content card: title with a pencil, grey subtitle, then icon rows.
 *
 * Empty rows are filtered out rather than shown as "N/A". A card listing eight
 * blanks tells the user nothing and makes a sparse profile look broken; showing
 * only what exists, plus one prompt to add more, reads as an invitation.
 */
export default function DetailCard({
  title,
  subtitle,
  rows = [],
  body,
  onEdit,
  emptyHint = 'Add these details to get better matches',
}: Props) {
  const filled = rows.filter((r) => !!r.value && String(r.value).trim().length > 0);
  const hasBody = !!body && body.trim().length > 0;
  const isEmpty = filled.length === 0 && !hasBody;

  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <View style={styles.headerText}>
          <Text style={styles.title}>{title}</Text>
          <Text style={styles.subtitle}>{subtitle}</Text>
        </View>
        {!!onEdit && (
          <TouchableOpacity hitSlop={12} onPress={onEdit} accessibilityLabel={`Edit ${title}`}>
            <Ionicons name="pencil" size={20} color={colors.heading} />
          </TouchableOpacity>
        )}
      </View>

      {isEmpty ? (
        onEdit ? (
          <TouchableOpacity style={styles.empty} onPress={onEdit} activeOpacity={0.7}>
            <Text style={styles.emptyText}>{emptyHint}</Text>
            <Text style={styles.emptyAction}>Add now +</Text>
          </TouchableOpacity>
        ) : (
          // Someone else's profile: state the gap, do not invite an edit.
          <View style={styles.empty}>
            <Text style={styles.emptyText}>Not shared yet</Text>
          </View>
        )
      ) : hasBody ? (
        <Text style={styles.body}>{body}</Text>
      ) : (
        <View style={styles.rows}>
          {filled.map((row, i) => (
            <View key={i} style={styles.row}>
              <Ionicons name={row.icon} size={19} color={colors.fieldLabel} />
              <Text style={styles.rowText}>{row.value}</Text>
            </View>
          ))}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.bg,
    borderRadius: 14,
    padding: spacing.md,
    marginBottom: spacing.sm,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
  headerText: { flex: 1, gap: 2 },
  title: { fontSize: 16, fontWeight: '700', color: colors.heading },
  subtitle: { fontSize: 12, color: colors.fieldLabel },
  rows: { marginTop: spacing.md, gap: 10 },
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  rowText: { flex: 1, fontSize: 14, color: colors.fieldValue },
  body: {
    marginTop: spacing.sm,
    fontSize: 14,
    lineHeight: 20,
    color: colors.fieldValue,
  },
  empty: { marginTop: spacing.sm, gap: 4 },
  emptyText: { fontSize: 13, color: colors.textMuted },
  emptyAction: { fontSize: 13, fontWeight: '600', color: colors.accentAlt },
});

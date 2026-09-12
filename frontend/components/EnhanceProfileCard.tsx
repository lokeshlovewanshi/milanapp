import { View, Text, StyleSheet, Pressable, ActivityIndicator, Alert } from 'react-native';
import { useState } from 'react';
import { LinearGradient } from 'expo-linear-gradient';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useGuardedRouter } from '../utils/useGuardedRouter';
import { downloadBiodata } from '../utils/biodata';
import { colors, radius, spacing, auth } from './theme';

export default function EnhanceProfileCard() {
  const router = useGuardedRouter();
  const [biodataBusy, setBiodataBusy] = useState(false);

  const onBiodata = async () => {
    setBiodataBusy(true);
    try {
      await downloadBiodata();
    } catch (error: any) {
      Alert.alert('Biodata', error?.message || 'Could not build your biodata');
    } finally {
      setBiodataBusy(false);
    }
  };

  return (
    <View style={styles.card}>
      <Text style={styles.heading}>Enhance your profile</Text>
      <Text style={styles.sub}>These details are visible only to you</Text>

      {/* Kundali Action Row */}
      <Pressable
        style={({ pressed }) => [styles.row, pressed && styles.rowPressed]}
        onPress={() => router.push('/kundali')}
        accessibilityRole="button"
        accessibilityLabel="Generate Kundali chart"
      >
        <LinearGradient
          colors={['#F59E0B', '#EF4444']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.iconWrap}
        >
          <Ionicons name="planet" size={17} color={colors.white} />
        </LinearGradient>
        <View style={styles.rowText}>
          <Text style={styles.rowTitle}>Kundali Chart / जन्म पत्रिका बनाएं</Text>
          <Text style={styles.rowSub}>North Indian birth chart from your date, time & place of birth</Text>
        </View>
        <Ionicons name="chevron-forward" size={18} color={colors.textFaint} />
      </Pressable>

      {/* Biodata Action Row */}
      <Pressable
        style={({ pressed }) => [styles.row, pressed && styles.rowPressed]}
        onPress={onBiodata}
        disabled={biodataBusy}
        accessibilityRole="button"
        accessibilityLabel="Download biodata as PDF"
      >
        <LinearGradient
          colors={['#3B82F6', '#8B5CF6']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.iconWrap}
        >
          {biodataBusy ? (
            <ActivityIndicator size="small" color={colors.white} />
          ) : (
            <Ionicons name="document-text" size={17} color={colors.white} />
          )}
        </LinearGradient>
        <View style={styles.rowText}>
          <Text style={styles.rowTitle}>
            {biodataBusy ? 'Preparing your biodata...' : 'Download Biodata (PDF) / बायोडाटा'}
          </Text>
          <Text style={styles.rowSub}>Download your complete marriage profile & kundali as PDF</Text>
        </View>
        <Ionicons name="chevron-forward" size={18} color={colors.textFaint} />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.white,
    borderRadius: radius.lg,
    padding: spacing.md,
    marginBottom: spacing.sm,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.hairline,
  },
  heading: { fontSize: 15, fontWeight: '700', color: colors.text },
  sub: { fontSize: 12, color: colors.textMuted, marginTop: 1, marginBottom: spacing.sm },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: 10,
    paddingHorizontal: spacing.sm,
    borderWidth: 1,
    borderColor: '#F0F0F0',
    borderRadius: radius.md,
    marginBottom: 8,
    backgroundColor: '#FAFAFA',
  },
  rowPressed: { backgroundColor: '#F3F4F6' },
  iconWrap: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rowText: { flex: 1 },
  rowTitle: { fontSize: 13, fontWeight: '700', color: colors.text },
  rowSub: { fontSize: 11, color: colors.textMuted, marginTop: 1, lineHeight: 14 },
});


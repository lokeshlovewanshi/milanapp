import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { colors, font, radius, spacing, auth } from './theme';

export type TopFilterType = 'married' | 'women' | 'men' | 'all' | 'opposite';

type Props = {
  active: TopFilterType;
  onChange: (tab: TopFilterType) => void;
  myGender?: string | null;
  countLabel?: string;
};

export default function ProfileTopFilter({ active, onChange }: Props) {
  const TABS: { id: TopFilterType; label: string; icon: keyof typeof Ionicons.glyphMap }[] = [
    { id: 'married', label: 'Married / विवाहित', icon: 'heart-circle-outline' },
    { id: 'women', label: 'Female / महिला', icon: 'woman-outline' },
    { id: 'men', label: 'Male / पुरुष', icon: 'man-outline' },
    { id: 'all', label: 'All / सभी', icon: 'people-outline' },
  ];

  return (
    <View style={styles.container}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {TABS.map((tab) => {
          const isSelected = active === tab.id;
          return (
            <TouchableOpacity
              key={tab.id}
              style={[styles.chip, isSelected && styles.chipActive]}
              onPress={() => onChange(tab.id)}
              activeOpacity={0.75}
              hitSlop={6}
            >
              <Ionicons
                name={tab.icon}
                size={16}
                color={isSelected ? colors.white : colors.text}
                style={styles.chipIcon}
              />
              <Text style={[styles.chipText, isSelected && styles.chipTextActive]}>
                {tab.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingVertical: spacing.sm,
    backgroundColor: 'transparent',
  },
  scrollContent: {
    paddingHorizontal: spacing.md,
    gap: spacing.sm,
    alignItems: 'center',
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: radius.full,
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  chipActive: {
    backgroundColor: auth.crimson,
    borderColor: auth.crimson,
    shadowColor: auth.crimson,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 3,
  },
  chipIcon: {
    marginRight: 6,
  },
  chipText: {
    fontSize: font.small,
    fontWeight: '600',
    color: colors.text,
  },
  chipTextActive: {
    color: colors.white,
    fontWeight: '700',
  },
});

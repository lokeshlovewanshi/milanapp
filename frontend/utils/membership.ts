import { useCallback, useState } from 'react';
import { useFocusEffect } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { billingAPI } from './api';

const KEY = 'membership_v1';

export type Membership = {
  planId: string;
  label: string;
  tier?: string;
  /** ISO date. Null means it never lapses. */
  expiresAt: string | null;
  /** True when it was granted by an offer rather than bought. */
  promo: boolean;
  active?: boolean;
};

/**
 * Reads current user membership from local storage and syncs with backend billing API.
 */
export async function readMembership(): Promise<Membership | null> {
  let localMembership: Membership | null = null;
  try {
    const raw = await AsyncStorage.getItem(KEY);
    if (raw) {
      const parsed: Membership = JSON.parse(raw);
      if (!parsed.expiresAt || new Date(parsed.expiresAt).getTime() >= Date.now()) {
        localMembership = parsed;
      }
    }
  } catch {}

  // Sync with backend asynchronously
  try {
    const res = await billingAPI.getMyMembership();
    const data = res?.data;
    if (data && (data.active || !data.expiresAt || new Date(data.expiresAt).getTime() >= Date.now())) {
      const synced: Membership = {
        planId: data.planCode || 'gold_12m',
        label: `${data.planName || 'Gold'} Plan`,
        tier: data.tier || 'gold',
        expiresAt: data.expiresAt || null,
        promo: data.source === 'PROMO',
        active: Boolean(data.active),
      };
      await AsyncStorage.setItem(KEY, JSON.stringify(synced));
      return synced;
    } else if (data === null) {
      await AsyncStorage.removeItem(KEY);
      return null;
    }
  } catch {}

  return localMembership;
}

export async function activateMembership(input: {
  planId: string;
  label: string;
  tier?: string;
  months: number | null;
  promo?: boolean;
}): Promise<Membership> {
  const expiresAt =
    input.months === null
      ? null
      : new Date(Date.now() + input.months * 30 * 24 * 60 * 60 * 1000).toISOString();

  const membership: Membership = {
    planId: input.planId,
    label: input.label,
    tier: input.tier || 'gold',
    expiresAt,
    promo: !!input.promo,
    active: true,
  };

  await AsyncStorage.setItem(KEY, JSON.stringify(membership));
  return membership;
}

export async function clearMembership(): Promise<void> {
  await AsyncStorage.removeItem(KEY).catch(() => {});
}

/** Re-read on focus, so activating a plan updates the screen behind it. */
export function useMembership() {
  const [membership, setMembership] = useState<Membership | null>(null);

  useFocusEffect(
    useCallback(() => {
      let alive = true;
      readMembership().then((m) => {
        if (alive) setMembership(m);
      });
      return () => {
        alive = false;
      };
    }, [])
  );

  return { membership, refresh: () => readMembership().then(setMembership) };
}

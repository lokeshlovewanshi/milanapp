import { useState, useEffect, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { referenceAPI } from './api';

export type Option = { code: string; label: string };
export type OptionMap = Record<string, Option[]>;

const CACHE_KEY = 'reference_options_v1';

/**
 * Dropdown data, fetched once and shared.
 *
 * Every option list used to be a hardcoded array in profile-setup.tsx. These
 * now come from /reference/options so adding a city or a degree is a database
 * insert rather than an app release.
 *
 * Cached at two levels because this data is large-ish, changes rarely, and is
 * needed on the very first screen a user edits:
 *  - module scope, so remounting a screen does not refetch
 *  - AsyncStorage, so a cold start renders labels before the network answers
 */
let memoryCache: OptionMap | null = null;
let inFlight: Promise<OptionMap> | null = null;

async function fetchOptions(): Promise<OptionMap> {
  if (memoryCache) return memoryCache;
  if (inFlight) return inFlight;

  inFlight = (async () => {
    try {
      const res = await referenceAPI.allOptions();
      const data: OptionMap = res.data ?? {};
      memoryCache = data;
      AsyncStorage.setItem(CACHE_KEY, JSON.stringify(data)).catch(() => {});
      return data;
    } finally {
      inFlight = null;
    }
  })();

  return inFlight;
}

/** Clear both caches - call after an admin edits the lookup tables. */
export async function invalidateReference() {
  memoryCache = null;
  await AsyncStorage.removeItem(CACHE_KEY).catch(() => {});
}

export function useReference() {
  const [options, setOptions] = useState<OptionMap>(memoryCache ?? {});
  const [loading, setLoading] = useState(!memoryCache);

  useEffect(() => {
    let alive = true;

    // Paint from the stored copy immediately, then refresh in the background.
    // Without this the first edit sheet opens empty for as long as the request
    // takes, which reads as broken.
    if (!memoryCache) {
      AsyncStorage.getItem(CACHE_KEY)
        .then((raw) => {
          if (!alive || !raw) return;
          try {
            const parsed = JSON.parse(raw);
            setOptions((prev) => (Object.keys(prev).length ? prev : parsed));
          } catch {
            // Corrupt cache is not worth handling - the network copy follows.
          }
        })
        .catch(() => {});
    }

    fetchOptions()
      .then((data) => {
        if (alive) setOptions(data);
      })
      .catch((e: any) => console.log('Failed to load reference data:', e?.message))
      .finally(() => {
        if (alive) setLoading(false);
      });

    return () => {
      alive = false;
    };
  }, []);

  /** Options for one category, or an empty list if it has not loaded. */
  const list = useCallback(
    (category: string): Option[] => options[category] ?? [],
    [options]
  );

  /**
   * Code to display label.
   *
   * Profiles store codes ("VEG"), screens show labels ("Vegetarian"). Falls back
   * to the raw value so legacy rows written before the lookup tables existed
   * still render something readable instead of blank.
   */
  const label = useCallback(
    (category: string, code?: string | null): string => {
      if (!code) return '';
      const found = (options[category] ?? []).find((o) => o.code === code);
      return found?.label ?? String(code);
    },
    [options]
  );

  return { options, list, label, loading };
}

/**
 * States and cities, kept separate from the option lists.
 *
 * Cities are fetched per state rather than all at once - 200 rows is fine, but
 * the picker only ever shows one state's worth, and this keeps the shape ready
 * for when the table grows.
 */
export function useLocations() {
  const [states, setStates] = useState<{ id: number; code: string; name: string }[]>([]);
  const [cities, setCities] = useState<{ id: number; name: string; tier: number }[]>([]);
  const [loadingCities, setLoadingCities] = useState(false);

  useEffect(() => {
    referenceAPI
      .states()
      .then((res) => setStates(res.data ?? []))
      .catch((e: any) => console.log('Failed to load states:', e?.message));
  }, []);

  const loadCities = useCallback(async (stateName?: string | null) => {
    if (!stateName) {
      setCities([]);
      return;
    }
    const match = states.find(
      (s) => s.name.toLowerCase() === String(stateName).toLowerCase()
    );
    if (!match) {
      setCities([]);
      return;
    }

    setLoadingCities(true);
    try {
      const res = await referenceAPI.cities({ stateId: match.id });
      setCities(res.data ?? []);
    } catch (e: any) {
      console.log('Failed to load cities:', e?.message);
    } finally {
      setLoadingCities(false);
    }
  }, [states]);

  return { states, cities, loadCities, loadingCities };
}

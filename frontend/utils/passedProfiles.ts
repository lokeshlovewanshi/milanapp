import { useCallback, useEffect, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

const KEY = 'passed_profiles_v1';

/**
 * Profiles swiped left in the swipe deck, kept on the device.
 *
 * Passing on someone is not a server-side fact the way Connect or Shortlist
 * is - nobody else needs to know, and there is no backend table for it. It
 * only has to survive long enough that the same person does not surface again
 * a minute later in the same session, or the next time the deck is opened.
 *
 * Deliberately outlives an app restart: swiping left and reopening the app a
 * moment later should not bring the same face back. It is cleared by
 * AsyncStorage.clear() on logout and account deletion, same as every other
 * on-device cache - a new sign-in on this phone starts with a clean deck.
 */

let memoryCache: Set<string> | null = null;

async function load(): Promise<Set<string>> {
  if (memoryCache) return memoryCache;
  try {
    const raw = await AsyncStorage.getItem(KEY);
    memoryCache = new Set(raw ? (JSON.parse(raw) as string[]) : []);
  } catch {
    memoryCache = new Set();
  }
  return memoryCache;
}

async function persist(ids: Set<string>) {
  await AsyncStorage.setItem(KEY, JSON.stringify([...ids])).catch(() => {});
}

export async function markPassed(id: string | number): Promise<void> {
  const ids = await load();
  ids.add(String(id));
  await persist(ids);
}

/**
 * Takes a face out of the deck after Connect, using the same on-device list.
 *
 * Connecting is a server-side fact, so in principle the deck could just filter
 * on connection state - and it does, as well. This exists because that state
 * arrives asynchronously: on a cold start the deck can render before the
 * connection list has loaded, and for those few seconds someone already
 * connected to would be dealt again. Writing the id here closes that window,
 * because the on-device list is read before the first card is shown.
 *
 * Separate name, same storage: both mean "do not deal this card again".
 */
export async function markConnected(id: string | number): Promise<void> {
  return markPassed(id);
}

export async function getPassedIds(): Promise<Set<string>> {
  return load();
}

/** Read-through hook: the current passed set, refreshed after each markPassed. */
export function usePassedProfiles() {
  const [ids, setIds] = useState<Set<string>>(memoryCache ?? new Set());

  useEffect(() => {
    let alive = true;
    load().then((loaded) => {
      if (alive) setIds(new Set(loaded));
    });
    return () => {
      alive = false;
    };
  }, []);

  const pass = useCallback(async (id: string | number) => {
    await markPassed(id);
    setIds(new Set(memoryCache));
  }, []);

  const isPassed = useCallback((id: string | number | null | undefined) => (id == null ? false : ids.has(String(id))), [ids]);

  return { isPassed, pass };
}

import { useState, useCallback, useEffect } from 'react';
import { Alert } from 'react-native';
import { useFocusEffect } from 'expo-router';
import { likeAPI, isAlreadyLiked } from './api';

/**
 * Where this profile and I stand.
 *
 *  NONE       nothing between us - offer Connect
 *  SENT       I asked, waiting - offer Withdraw, never a second Connect
 *  RECEIVED   they asked, waiting - offer Accept
 *  CONNECTED  accepted in either direction - no request button at all
 *  DECLINED   refused; treated as NONE so a request can be sent again later
 */
export type ConnectionState = 'NONE' | 'SENT' | 'RECEIVED' | 'CONNECTED' | 'DECLINED';

type States = Record<string, ConnectionState>;

/* -------------------------------------------------------------------------
 * The store
 * -------------------------------------------------------------------------
 *
 * Deliberately module-level, not component state.
 *
 * Connection state is a fact about the account, not about a screen. When it
 * lived inside the hook, every screen that called useConnections got its own
 * private copy: withdrawing on Home moved Home's copy to NONE and left
 * Shortlist's copy on SENT, so the same profile offered "Withdraw" on one tab
 * and "Connect" on another until the app was restarted.
 *
 * One map, every subscriber notified. A screen that is mounted but not visible
 * re-renders with the truth and is already correct when you get back to it.
 */

let sharedStates: States = {};
let sharedReady = false;

const listeners = new Set<(next: States) => void>();

/** Pairs with an open request. Guards double taps and protects optimism. */
const inFlight = new Set<string>();

/** One refresh at a time, however many screens ask for it at once. */
let pending: Promise<void> | null = null;

const publish = (next: States) => {
  sharedStates = next;
  for (const listener of listeners) listener(next);
};

const normalizeId = (val: any): string | null => {
  if (val == null) return null;
  const s = String(val).trim();
  if (!s) return null;
  const digits = s.replace(/\D/g, '');
  if (digits) {
    return String(parseInt(digits, 10));
  }
  return s.toLowerCase();
};

const storeState = (dict: States, targetId: any, state: ConnectionState) => {
  if (targetId == null) return;
  const raw = String(targetId).trim();
  dict[raw] = state;
  const norm = normalizeId(targetId);
  if (norm) {
    dict[norm] = state;
    dict[`JM${norm.padStart(5, '0')}`] = state;
    dict[`GM${norm.padStart(5, '0')}`] = state;
  }
};

const patch = (id: string | number, value: ConnectionState) => {
  const next = { ...sharedStates };
  storeState(next, id, value);
  publish(next);
};

const rows = (res: any) => (Array.isArray(res?.data) ? res.data : (res?.data?.content ?? []));

const otherId = (item: any) => {
  // Both endpoints put the *other* person in likedProfile - sent lists the
  // person I liked, received lists the person who liked me.
  const p = item?.likedProfile ?? item?.profile ?? item?.user ?? item ?? {};
  const id = p.id ?? p.profileId ?? item?.likedProfileId ?? item?.actorId ?? item?.userId;
  return id == null ? null : String(id);
};

const statusOf = (item: any) => String(item?.status ?? '').toLowerCase();

/**
 * Rebuild the whole map from the server.
 *
 * Built from both /likes/me (sent) and /likes (received), because direction
 * alone is not enough: once B accepts A's request, B must not be offered a
 * Connect button for A - from B's side the row only exists as *received*, so a
 * map built from sent requests alone would happily show "Connect" and then fail
 * with "You have already liked this profile".
 */
async function refreshShared(): Promise<void> {
  if (pending) return pending;

  pending = (async () => {
    try {
      const [sentRes, receivedRes] = await Promise.all([
        likeAPI.getSentLikes(),
        likeAPI.getReceivedLikes(),
      ]);

      const next: States = {};

      for (const item of rows(sentRes)) {
        const id = otherId(item);
        if (!id) continue;
        const status = statusOf(item);
        const st: ConnectionState =
          status === 'accepted'
            ? 'CONNECTED'
            : status === 'rejected' || status === 'declined'
              ? 'DECLINED'
              : 'SENT';
        storeState(next, id, st);
      }

      for (const item of rows(receivedRes)) {
        const id = otherId(item);
        if (!id) continue;
        const status = statusOf(item);
        const incoming: ConnectionState =
          status === 'accepted'
            ? 'CONNECTED'
            : status === 'rejected' || status === 'declined'
              ? 'DECLINED'
              : 'RECEIVED';

        // CONNECTED always wins.
        const norm = normalizeId(id);
        const existing = next[String(id)] ?? (norm ? next[norm] : undefined);
        const finalState = existing === 'CONNECTED' || incoming === 'CONNECTED' ? 'CONNECTED' : incoming;
        storeState(next, id, finalState);
      }

      // Preserve in-flight optimistic mutations
      for (const key of inFlight) {
        if (key in sharedStates) storeState(next, key, sharedStates[key]);
      }

      publish(next);
    } catch (error: any) {
      console.log('Could not load connections:', error?.message);
    } finally {
      sharedReady = true;
      pending = null;
    }
  })();

  return pending;
}

/**
 * Run a state change optimistically, rolling back if the server disagrees.
 *
 * Every mutation in the app goes through here, which is what keeps the screens
 * consistent: the store moves once and everybody watching it moves with it.
 */
async function mutate(
  id: string | number,
  optimistic: ConnectionState,
  call: () => Promise<any>,
  failure: string,
  tolerate?: (error: any) => boolean
) {
  const key = String(id);
  if (inFlight.has(key)) return;

  const current = sharedStates[key] ?? 'NONE';
  inFlight.add(key);
  patch(id, optimistic);

  try {
    await call();
  } catch (error: any) {
    if (tolerate?.(error)) return; // already true - keep the optimistic state

    patch(id, current);
    Alert.alert(
      'Error',
      error?.response?.data?.message || error?.response?.data?.detail || failure
    );
  } finally {
    inFlight.delete(key);
  }
}

/** Drop everything on sign-out, so the next account starts clean. */
export function clearConnections() {
  inFlight.clear();
  sharedReady = false;
  publish({});
}

/**
 * Single source of truth for connection state across every screen.
 *
 * Refreshes when the screen using it comes into focus, so a change made through
 * a path that does not touch the store - the Interests screen's own Accept and
 * Withdraw buttons, or another device - is picked up on the way back.
 */
export function useConnections() {
  const [states, setStates] = useState<States>(sharedStates);
  const [ready, setReady] = useState(sharedReady);

  useEffect(() => {
    const listener = (next: States) => {
      setStates(next);
      setReady(sharedReady);
    };
    listeners.add(listener);
    // Another screen may have loaded the map while this one was mounting.
    listener(sharedStates);
    return () => {
      listeners.delete(listener);
    };
  }, []);

  const refresh = useCallback(async () => {
    await refreshShared();
    setReady(true);
  }, []);

  useFocusEffect(
    useCallback(() => {
      refreshShared();
    }, [])
  );

  const stateOf = useCallback(
    (id: string | number | undefined | null): ConnectionState => {
      if (id == null) return 'NONE';
      const raw = String(id).trim();
      const norm = normalizeId(id);
      return (
        states[raw] ??
        (norm ? states[norm] : undefined) ??
        (norm ? states[`JM${norm.padStart(5, '0')}`] : undefined) ??
        (norm ? states[`GM${norm.padStart(5, '0')}`] : undefined) ??
        'NONE'
      );
    },
    [states]
  );

  /** True only when a request has been sent or accepted - not for DECLINED. */
  const isConnected = useCallback(
    (id: string | number | undefined | null) => {
      const s = stateOf(id);
      return s === 'SENT' || s === 'CONNECTED';
    },
    [stateOf]
  );

  const connect = useCallback(async (id: string | number) => {
    const current = sharedStates[String(id)] ?? 'NONE';
    if (current === 'SENT' || current === 'CONNECTED') return;
    await mutate(id, 'SENT', () => likeAPI.likeProfile(id), 'Failed to send request', isAlreadyLiked);
  }, []);

  /**
   * Take back a pending request.
   *
   * The backend deletes the row in whichever direction it exists, so the pair
   * returns to NONE and a fresh request can be sent later - which is the point:
   * withdrawing must not permanently block reconnecting.
   */
  const withdraw = useCallback(
    (id: string | number) => mutate(id, 'NONE', () => likeAPI.unlikeProfile(id), 'Could not withdraw'),
    []
  );

  const accept = useCallback(
    (id: string | number) => mutate(id, 'CONNECTED', () => likeAPI.acceptLike(id), 'Could not accept'),
    []
  );

  const decline = useCallback(
    (id: string | number) => mutate(id, 'DECLINED', () => likeAPI.declineLike(id), 'Could not decline'),
    []
  );

  return { states, stateOf, isConnected, connect, withdraw, accept, decline, refresh, ready };
}

/** Button label and treatment for a connection state. */
export function connectionAction(state: ConnectionState): {
  label: string;
  variant: 'filled' | 'muted';
  disabled: boolean;
} {
  switch (state) {
    case 'CONNECTED':
      return { label: 'Connected', variant: 'muted', disabled: true };
    case 'SENT':
      return { label: 'Withdraw', variant: 'muted', disabled: false };
    case 'RECEIVED':
      return { label: 'Accept', variant: 'filled', disabled: false };
    default:
      return { label: 'Connect / जुड़ें', variant: 'filled', disabled: false };
  }
}

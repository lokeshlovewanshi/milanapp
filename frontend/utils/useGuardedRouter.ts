import { useRouter } from 'expo-router';
import { useCallback, useRef } from 'react';

/**
 * Wraps expo-router's navigation with a short re-entry lock.
 *
 * Why this exists:
 * Under the New Architecture (Fabric), every navigation creates and destroys a
 * ShadowNode tree. Firing several pushes within the same few hundred ms stacks
 * up screens that are mounted and torn down almost immediately, and Hermes'
 * concurrent GC ("hades" thread) then finalises those ShadowNodeWrappers while
 * the tree is still settling. That race shows up as a native SIGSEGV inside
 * ShadowNode::~ShadowNode - a crash no JS try/catch can intercept.
 *
 * Debouncing navigation removes the churn that triggers it.
 *
 * A ref is used rather than state because state updates are asynchronous and
 * would not block a second tap landing in the same tick.
 */
const DEFAULT_COOLDOWN_MS = 700;

export function useGuardedRouter(cooldownMs: number = DEFAULT_COOLDOWN_MS) {
  const router = useRouter();
  const lastNavAt = useRef(0);

  const allow = useCallback(() => {
    const now = Date.now();
    if (now - lastNavAt.current < cooldownMs) return false;
    lastNavAt.current = now;
    return true;
  }, [cooldownMs]);

  const push = useCallback(
    (href: any) => {
      if (allow()) router.push(href);
    },
    [allow, router]
  );

  const replace = useCallback(
    (href: any) => {
      if (allow()) router.replace(href);
    },
    [allow, router]
  );

  const back = useCallback(() => {
    if (allow()) router.back();
  }, [allow, router]);

  return { push, replace, back, router };
}

import { useEffect, useRef } from "react";

// Same OAuth Web client the mobile app uses as its Google Sign-In
// webClientId (see frontend/.env, EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID) - the
// backend verifies the ID token's audience against this same client id
// regardless of which client obtained it.
const GOOGLE_CLIENT_ID =
  import.meta.env.VITE_GOOGLE_CLIENT_ID ||
  "828927114900-bvnjghkne3h6ri7csejk173n0o9760ed.apps.googleusercontent.com";

/**
 * Renders the Google Identity Services button into the given element id and
 * calls onToken(idToken) once someone completes the flow.
 *
 * Unlike the native app's GoogleSignin SDK, GIS enforces "Authorized
 * JavaScript origins" on the OAuth client in Google Cloud Console - this
 * page's origin (http://localhost:5174 in dev) must be added there or the
 * button fails silently/shows an origin-mismatch error in the console.
 */
export function useGoogleButton(elementId, onToken) {
  const onTokenRef = useRef(onToken);
  onTokenRef.current = onToken;

  useEffect(() => {
    let cancelled = false;
    let attempts = 0;

    const tryInit = () => {
      if (cancelled) return;
      if (!window.google?.accounts?.id) {
        attempts += 1;
        if (attempts < 50) setTimeout(tryInit, 100);
        return;
      }

      window.google.accounts.id.initialize({
        client_id: GOOGLE_CLIENT_ID,
        callback: (response) => onTokenRef.current(response.credential),
      });

      const el = document.getElementById(elementId);
      if (el) {
        const containerWidth = el.offsetWidth || el.parentElement?.offsetWidth || 356;
        window.google.accounts.id.renderButton(el, {
          theme: "outline",
          size: "large",
          width: Math.min(Math.max(containerWidth, 240), 400),
          text: "continue_with",
          shape: "rectangular",
          logo_alignment: "left",
        });
      }
    };

    tryInit();
    return () => {
      cancelled = true;
    };
  }, [elementId]);
}

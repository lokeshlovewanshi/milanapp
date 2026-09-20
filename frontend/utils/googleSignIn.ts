/**
 * Native Google Sign-In for Android/iOS.
 *
 * Why not expo-auth-session:
 * expo-auth-session's `useIdTokenAuthRequest` asks Google for
 * `response_type=id_token` (the implicit flow). Google forbids the implicit
 * flow for installed apps and rejects it with:
 *
 *   "Access blocked: Authorization Error ... doesn't comply with Google's
 *    OAuth 2.0 policy for keeping apps secure.  Error 400: invalid_request"
 *
 * Native apps must use either authorization-code + PKCE in a system browser, or
 * the Google Sign-In SDK. The SDK is used here: it talks to Google Play
 * Services directly, returns a verifiable ID token, and shows the native
 * account picker instead of a browser tab.
 *
 * Credentials:
 *  - Android OAuth client (package name + SHA-1) authorises this app. It is not
 *    referenced in code; Play Services matches it via the signing certificate.
 *  - Web OAuth client is passed as `webClientId` and becomes the ID token's
 *    `aud`, which is what the backend verifies. It is not a web login.
 */

import Constants, { ExecutionEnvironment } from "expo-constants";

const WEB_CLIENT_ID = process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID;

export const isGoogleConfigured = !!WEB_CLIENT_ID;

let configured = false;

/**
 * True when the JS is running inside the Expo Go sandbox rather than a build of
 * this app. Expo Go ships a fixed set of native modules and cannot contain
 * RNGoogleSignin, so sign-in can never work there no matter how the project is
 * configured.
 */
export const isExpoGo =
  Constants.executionEnvironment === ExecutionEnvironment.StoreClient;

/**
 * Required lazily so the JS bundle still builds if the native module has not
 * been installed yet - importing it statically would break every screen.
 *
 * The library's entry point runs
 *   TurboModuleRegistry.getEnforcing('RNGoogleSignin')
 * at module scope, so this require() throws whenever the *native* side is
 * absent from the running binary - not only when the npm package is missing.
 * The two cases need different fixes, so the underlying error is kept rather
 * than collapsed into a single "not installed" message.
 */
function loadGoogleSignin(): { mod: any; error: Error | null } {
  try {
    return {
      mod: require("@react-native-google-signin/google-signin"),
      error: null,
    };
  } catch (e: any) {
    console.log("[GoogleSignIn] require failed:", e?.message);
    return { mod: null, error: e instanceof Error ? e : new Error(String(e)) };
  }
}

export class GoogleSignInUnavailableError extends Error {}

/**
 * Opens the native Google account picker and returns a Google ID token.
 * Throws if cancelled, unavailable or misconfigured - callers should surface
 * the message, except for the cancel case which is silent.
 */
export async function signInWithGoogle(): Promise<string | null> {
  if (isExpoGo) {
    throw new GoogleSignInUnavailableError(
      "Google Sign-In does not work in Expo Go.\n\n" +
        "Expo Go is a prebuilt sandbox app - it cannot contain this project's\n" +
        "native modules. Close Expo Go and launch the dev build instead:\n\n" +
        "  npx expo run:android\n\n" +
        "After the first run, `npx expo start` will attach to that build; open\n" +
        "the app from the launcher rather than scanning the QR into Expo Go.",
    );
  }

  const { mod, error: loadError } = loadGoogleSignin();
  if (!mod) {
    // "Cannot find native module" / "could not be found" means the JS package is
    // bundled but the binary on the device predates it - a rebuild fixes that.
    // Anything else usually means the package itself is missing from node_modules.
    const msg = loadError?.message ?? "";
    const nativeMissing =
      /native module|getEnforcing|RNGoogleSignin|could not be found/i.test(msg);

    throw new GoogleSignInUnavailableError(
      nativeMissing
        ? "The Google Sign-In native module is not in the app currently installed\n" +
            "on this device. The JS bundle has it, the binary does not - which means\n" +
            "the installed build predates the package being added.\n\n" +
            "Rebuild and reinstall:\n" +
            "  npx expo prebuild --clean\n" +
            "  npx expo run:android\n\n" +
            `Underlying error: ${msg}`
        : "Google Sign-In package could not be loaded. Run:\n" +
            "  npx expo install @react-native-google-signin/google-signin\n" +
            "  npx expo prebuild --clean && npx expo run:android\n\n" +
            `Underlying error: ${msg}`,
    );
  }
  if (!WEB_CLIENT_ID) {
    throw new GoogleSignInUnavailableError(
      "EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID is not set. Add it to .env and rebuild.",
    );
  }

  const { GoogleSignin, statusCodes } = mod;

  if (!configured) {
    GoogleSignin.configure({
      webClientId: WEB_CLIENT_ID,
      offlineAccess: false,
      scopes: ["profile", "email"],
    });
    configured = true;
  }

  // Printed so the value actually compiled into this build can be compared
  // against the Google Cloud Console. Client IDs are public, not secrets.
  // If this does not match the Web client you expect, the build predates your
  // last .env edit and needs rebuilding.
  console.log("[GoogleSignIn] webClientId in this build =", WEB_CLIENT_ID);

  try {
    await GoogleSignin.hasPlayServices({ showPlayServicesUpdateDialog: true });

    // Sign out any previously cached account first.
    // Stale cached credentials from a different app signing certificate can
    // cause DEVELOPER_ERROR (code 10) even when the SHA-1 is correctly
    // registered. Signing out forces Google Play Services to re-verify the
    // certificate on each attempt.
    try {
      await GoogleSignin.signOut();
    } catch {
      // Ignore - user may not have been signed in
    }

    const result = await GoogleSignin.signIn();

    // v13 returns { idToken }, v14+ returns { type, data: { idToken } }.
    const idToken = result?.data?.idToken ?? result?.idToken ?? null;
    if (!idToken) {
      // v14+ reports a cancel as { type: 'cancelled' } instead of throwing.
      if (result?.type === "cancelled") return null;
      throw new Error("Google did not return an ID token.");
    }
    return idToken;
  } catch (error: any) {
    if (
      error?.code === statusCodes?.SIGN_IN_CANCELLED ||
      error?.code === statusCodes?.IN_PROGRESS
    ) {
      return null; // user backed out - not an error worth showing
    }
    if (error?.code === statusCodes?.PLAY_SERVICES_NOT_AVAILABLE) {
      throw new Error(
        "Google Play Services is unavailable on this device. Use an emulator image that includes the Play Store.",
      );
    }

    // DEVELOPER_ERROR (code 10) means Google matched the request to no valid
    // client. The credentials in .env are fine on their own - the mismatch is
    // almost always the signing certificate or package name registered on the
    // Android OAuth client, which cannot be detected from JS.
    const code = String(error?.code ?? "");
    const rawMsg = error?.message
      ? `\n\nRaw Error: [Code ${code}] ${error.message}`
      : "";
    if (
      code === "10" ||
      code === "DEVELOPER_ERROR" ||
      (statusCodes?.DEVELOPER_ERROR != null &&
        error?.code === statusCodes.DEVELOPER_ERROR)
    ) {
      console.log("[GoogleSignIn] DEVELOPER_ERROR details:", {
        code: error?.code,
        message: error?.message,
        error,
      });
      throw new Error(
        "DEVELOPER_ERROR - Google rejected the app configuration. Check, in order:\n\n" +
          "1. SHA-1: add the certificate for the exact build you installed to\n" +
          "   the ANDROID OAuth client in Firebase / Google Cloud:\n" +
          "   - EAS production or preview APK: use that EAS keystore SHA-1.\n" +
          "   - Local `expo run:android`: run `cd android && ./gradlew signingReport`\n" +
          '     and use the "Variant: debug" SHA-1.\n' +
          "2. Package name on that client must be exactly:\n" +
          "   com.lovewanshi.jeevanmilansathi\n" +
          "3. webClientId must be the WEB client ID, not the Android one.\n" +
          `   Currently using: ...${String(WEB_CLIENT_ID).slice(-34)}\n` +
          "4. Credential changes can take a few minutes to propagate.\n\n" +
          `Raw Error: [Code ${code}] ${error?.message || "DEVELOPER_ERROR"}\n\n` +
          "Note: .env is inlined at build time - rebuild after editing it.",
      );
    }

    // Surface the raw native error so logcat/Metro shows something specific
    // rather than the library's generic "follow troubleshooting" text.
    console.log(
      "[GoogleSignIn] raw error =",
      JSON.stringify({ code: error?.code, message: error?.message }, null, 2),
    );
    throw error;
  }
}

/** Clears the cached Google account so the picker appears again next time. */
export async function signOutFromGoogle(): Promise<void> {
  if (isExpoGo || !configured) return;
  const { mod } = loadGoogleSignin();
  if (!mod) return;
  try {
    await mod.GoogleSignin.signOut();
  } catch {
    // best effort
  }
}

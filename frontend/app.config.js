const fs = require('fs');
const path = require('path');
const withSideloadApkAbis = require('./plugins/withSideloadApkAbis');
const withScreenshotBlocked = require('./plugins/withScreenshotBlocked');

/**
 * Dynamic Expo config.
 *
 * Everything static lives in app.json. This wrapper handles the three things
 * that must vary by machine or by build profile.
 *
 * 1. google-services.json is required for FCM delivery but is gitignored and
 *    not present on every machine. Referencing it unconditionally from
 *    app.json makes `prebuild` fail with ENOENT for anyone who has not
 *    downloaded it, blocking the whole build over a feature they may not be
 *    touching. Attached only when the file exists:
 *      - with it    -> push notifications work
 *      - without it -> the app builds and runs, push is simply inactive
 *    Download from Firebase console -> Project settings -> Your apps ->
 *    Android (package com.jeevanmilansathi.frontend), next to this file.
 *
 * 2. Cleartext HTTP. Local development talks to http://10.0.2.2:8080, which
 *    Android blocks unless usesCleartextTraffic is on. Leaving it on in a
 *    release build would let anyone on the same network downgrade the
 *    connection and read profiles, phone numbers and auth tokens in the
 *    clear. So it follows the API URL: on for http://, off for https://.
 *
 * 3. Native library packaging. A sideloaded APK and a Play Store AAB want
 *    opposite things here, so it follows ANDROID_SIDELOAD_APK, which eas.json
 *    sets on the apk profiles only:
 *      - Compression. In an APK, compressing the .so files roughly halves
 *        them. The installer then extracts a second copy, so on-disk grows -
 *        but the number a user on mobile data feels is the download. In an AAB
 *        it is pure loss: Play recompresses for delivery regardless, so
 *        compressing here saves nothing and only costs the extracted duplicate.
 *      - ABIs. An APK carries every ABI it was built with, and x86/x86_64 are
 *        emulator-only for this audience - about 10 MB of the download that no
 *        real phone executes. An AAB is split per device at delivery, so there
 *        the extra ABIs cost users nothing and dropping x86_64 would only lock
 *        out Chromebooks. See plugins/withSideloadApkAbis.js for why this is
 *        not just a `buildArchs` setting.
 *    Unset (local `expo run:android`) keeps all ABIs, uncompressed, so the
 *    emulator still works.
 */
module.exports = ({ config }) => {
  // EAS packs the project respecting .gitignore, and google-services.json is
  // ignored - so a cloud build never receives the local copy and would silently
  // come out with no FCM config at all. GOOGLE_SERVICES_FILE is an EAS file
  // secret that materialises as a path at build time; the local file stays the
  // fallback for `expo run:android`.
  const googleServices =
    process.env.GOOGLE_SERVICES_FILE || path.join(__dirname, 'google-services.json');

  // The RESOLVED path, not the literal './google-services.json'. This config is
  // evaluated on the developer's machine as well as the builder, so hardcoding
  // the relative path meant a local file made the field appear in the uploaded
  // config while the builder - which never receives that file - then failed
  // with "google-services.json is missing". Pointing at whatever actually
  // exists lets the EAS file secret satisfy it in the cloud and the local copy
  // satisfy it here.
  if (fs.existsSync(googleServices)) {
    config.android = { ...(config.android || {}), googleServicesFile: googleServices };
  } else {
    console.warn(
      '[expo config] google-services.json not found - building without FCM. ' +
        'Push notifications will not be delivered until you add it.'
    );
  }

  // Falls back to allowing cleartext when the URL is unset, because that is
  // the local-development case; a release build always sets it via eas.json.
  const apiUrl = process.env.EXPO_PUBLIC_BACKEND_URL || '';
  const needsCleartext = !apiUrl || apiUrl.startsWith('http://');

  const sideloadApk = process.env.ANDROID_SIDELOAD_APK === '1';
  const abis = ['armeabi-v7a', 'arm64-v8a'];

  config.plugins = (config.plugins || []).map((plugin) => {
    if (Array.isArray(plugin) && plugin[0] === 'expo-build-properties') {
      return [
        plugin[0],
        {
          ...plugin[1],
          android: {
            ...(plugin[1].android || {}),
            usesCleartextTraffic: needsCleartext,
            useLegacyPackaging: sideloadApk,
          },
        },
      ];
    }
    return plugin;
  });

  console.log(
    `[expo config] API ${apiUrl || '(unset - local dev)'} | ` +
      `cleartext HTTP ${needsCleartext ? 'ALLOWED' : 'blocked'} | ` +
      `native libs ${sideloadApk ? `compressed, ${abis.join('+')} only` : 'uncompressed, all ABIs'}`
  );

  // Members' photos and contact details are the whole content here, so the
  // window is marked FLAG_SECURE on every build - see the plugin for what that
  // does and does not stop.
  config = withScreenshotBlocked(config);

  return sideloadApk ? withSideloadApkAbis(config, { abis }) : config;
};

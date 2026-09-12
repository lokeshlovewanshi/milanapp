const { withAppBuildGradle } = require('expo/config-plugins');

const MARKER = '// @generated withSideloadApkAbis';

/**
 * Restrict the ABIs packaged into the APK.
 *
 * The obvious lever, `reactNativeArchitectures` in gradle.properties (exposed
 * by expo-build-properties as `buildArchs`), does NOT do this. It only chooses
 * which ABIs the NDK compiles from source. Nearly every .so in the app now
 * arrives prebuilt inside an AAR - react-android, hermes-android, the Expo
 * modules - and those ship all four ABIs regardless. Setting it and measuring
 * the APK is how you find that out: the x86 libraries are still in there.
 *
 * `ndk.abiFilters` is the switch that actually filters packaging, and neither
 * app.json nor expo-build-properties exposes it, hence this plugin.
 *
 * Applied only when ANDROID_SIDELOAD_APK=1, which eas.json sets on the APK
 * profiles. The Play Store build must keep all four: an AAB is split per device
 * at delivery, so extra ABIs cost nothing there, and dropping x86_64 would lock
 * out Chromebooks for no saving.
 */
const withSideloadApkAbis = (config, { abis }) =>
  withAppBuildGradle(config, (cfg) => {
    if (cfg.modResults.language !== 'groovy') {
      throw new Error('withSideloadApkAbis: expected a Groovy build.gradle');
    }
    if (cfg.modResults.contents.includes(MARKER)) return cfg;

    const list = abis.map((a) => `"${a}"`).join(', ');
    const block = [
      '    defaultConfig {',
      `        ${MARKER}`,
      '        ndk {',
      `            abiFilters ${list}`,
      '        }',
    ].join('\n');

    const next = cfg.modResults.contents.replace(/^ {4}defaultConfig \{$/m, block);
    if (next === cfg.modResults.contents) {
      throw new Error('withSideloadApkAbis: could not find the defaultConfig block');
    }

    cfg.modResults.contents = next;
    return cfg;
  });

module.exports = withSideloadApkAbis;

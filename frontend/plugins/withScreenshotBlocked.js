const { withMainActivity } = require('expo/config-plugins');

const MARKER = '// @generated withScreenshotBlocked';

/**
 * Remove a previously injected FLAG_SECURE block, leaving everything else in
 * MainActivity alone.
 *
 * Anchored on MARKER, so it only ever deletes what this plugin wrote - the
 * regex takes the marker line plus the setFlags call that follows it, in either
 * language. The WindowManager import is left behind deliberately: it is inert,
 * and matching it would risk deleting an import something else added.
 */
const stripFlag = (src) =>
  src.replace(
    new RegExp(
      `[ \\t]*${MARKER}\\n[ \\t]*(?:window|getWindow\\(\\))\\.setFlags\\([\\s\\S]*?\\)[;]?\\n`,
      'g'
    ),
    ''
  );

/**
 * Block screenshots and screen recording on Android.
 *
 * Members' photos, phone numbers and family details are the whole content of
 * this app, and the usual complaint about a matrimony platform is that profiles
 * get screenshotted and circulated. FLAG_SECURE is Android's answer: the window
 * is excluded from screen capture, screen recording, and the recent-apps
 * thumbnail, and non-secure displays refuse to mirror it.
 *
 * Set in onCreate BEFORE super.onCreate, because the flag has to be on the
 * window before the first frame is composed; setting it later leaves a window
 * where the content is capturable.
 *
 * Worth being honest about the limits of this:
 *
 *  - It stops the OS screenshot path, not a camera pointed at the screen. It
 *    raises effort, it does not make photos unshareable.
 *  - iOS has no equivalent. UIKit offers no way to refuse a screenshot; the
 *    most an iOS app can do is detect one after the fact
 *    (userDidTakeScreenshot) or hide content in the app switcher. So this is
 *    Android-only by necessity, and the iOS build is unaffected.
 *  - Rooted devices and some OEM builds can bypass it.
 *
 * It also blocks YOUR OWN screenshots when testing, including `adb screencap`,
 * which returns a black image with no error. That is the expected symptom, not
 * a broken emulator.
 *
 * Which is a problem beyond testing: the Play Store listing needs screenshots
 * of real screens, and with the flag on there is no way to take one from a
 * device. So ALLOW_SCREENSHOTS=1 skips the flag at build time:
 *
 *   ALLOW_SCREENSHOTS=1 npx expo run:android
 *
 * Build-time and opt-in, deliberately. A runtime toggle would be a switch an
 * attacker could look for, and defaulting to off would mean shipping an
 * unprotected release the first time someone forgot to set it. Never set this
 * for a build you intend to publish.
 */
const withScreenshotBlocked = (config) => {
  if (process.env.ALLOW_SCREENSHOTS === '1') {
    console.warn(
      '[withScreenshotBlocked] ALLOW_SCREENSHOTS=1 - FLAG_SECURE removed. ' +
        'Screenshots and screen recording are possible in this build. Do not publish it.'
    );

    // Actively strip it, rather than just declining to add it.
    //
    // Returning early here looks like it should work and does not: `android/`
    // survives between builds, so a MainActivity that a previous prebuild
    // already injected keeps the flag, and the build comes out secure while
    // the console says it is not. That cost a build to discover - every
    // screenshot still came back black.
    return withMainActivity(config, (cfg) => {
      cfg.modResults.contents = stripFlag(cfg.modResults.contents);
      return cfg;
    });
  }

  return withMainActivity(config, (cfg) => {
    const { language } = cfg.modResults;
    let src = cfg.modResults.contents;

    if (src.includes(MARKER)) return cfg;

    const isKotlin = language === 'kt';
    const importLine = isKotlin
      ? 'import android.view.WindowManager'
      : 'import android.view.WindowManager;';

    if (!src.includes('import android.view.WindowManager')) {
      // After the package declaration, which every MainActivity opens with.
      src = src.replace(/^(package .*\n)/m, `$1\n${importLine}\n`);
    }

    const flagCall = isKotlin
      ? `    ${MARKER}\n` +
        `    window.setFlags(\n` +
        `      WindowManager.LayoutParams.FLAG_SECURE,\n` +
        `      WindowManager.LayoutParams.FLAG_SECURE\n` +
        `    )\n`
      : `    ${MARKER}\n` +
        `    getWindow().setFlags(\n` +
        `      WindowManager.LayoutParams.FLAG_SECURE,\n` +
        `      WindowManager.LayoutParams.FLAG_SECURE\n` +
        `    );\n`;

    // Match the onCreate signature in either language and insert at its top.
    const onCreate = isKotlin
      ? /(override fun onCreate\(savedInstanceState: Bundle\?\) \{\n)/
      : /(protected void onCreate\(Bundle savedInstanceState\) \{\n)/;

    if (!onCreate.test(src)) {
      throw new Error(
        'withScreenshotBlocked: could not find onCreate in MainActivity - the ' +
          'Expo template changed shape and this plugin needs updating.'
      );
    }

    src = src.replace(onCreate, `$1${flagCall}`);
    cfg.modResults.contents = src;
    return cfg;
  });
};

module.exports = withScreenshotBlocked;

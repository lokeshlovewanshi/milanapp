-- What the newest build of the app is, so the app itself can ask.
--
-- One row per release actually rolled out. The app already knows its own
-- version_code (baked in at build time by Expo/Gradle); it asks this table
-- for the newest one and decides for itself whether that means "there is an
-- update" or "you must update before continuing".
--
-- Why a table and not a hardcoded constant in application.properties
-- --------------------------------------------------------------------------
-- A properties file ships with the jar, so publishing a new release would mean
-- editing and redeploying the *backend* every time the *app* changes version -
-- two release trains coupled for no reason. A row insert is the whole
-- deployment step, and it can happen the moment the Play Store listing goes
-- live, independent of any backend release.
--
-- Why min_supported_version_code is separate from version_code
-- --------------------------------------------------------------------------
-- "A newer build exists" and "your build no longer works" are different
-- messages needing different UI - one is dismissible, the other is not. Two
-- columns keeps that decision in the data: raise min_supported_version_code
-- only when a build is truly broken (an API this backend removed, a security
-- fix), not on every release.
--
-- Safe to run twice.

CREATE TABLE IF NOT EXISTS app_release (
  id                        INT AUTO_INCREMENT PRIMARY KEY,

  -- 'android' today; 'ios' the day this app has an App Store build.
  platform                  VARCHAR(16)   NOT NULL,

  -- The number Play Store / App Store compares builds on. Always increases.
  version_code              INT           NOT NULL,
  -- The number members see ("2.3.0"). Never compared, only displayed.
  version_name              VARCHAR(32)   NOT NULL,

  -- Below this version_code the app must update before it may be used.
  -- NULL means nothing on this platform is currently broken.
  min_supported_version_code INT          NULL,

  -- Shown in the update prompt. Plain text, one line per change - the app
  -- does not render markdown here.
  release_notes             TEXT          NULL,

  -- Where "Update now" sends the member. The Play Store listing for a normal
  -- release; a direct APK URL only if this build is not on the Store yet.
  download_url              VARCHAR(512)  NOT NULL,

  -- A release can be pulled (a bad build) without deleting its row, which
  -- would just let the previous release re-surface as "latest" - reusing the
  -- version_code the pulled build already claimed on Play Store instead.
  is_active                 TINYINT(1)    NOT NULL DEFAULT 1,

  created_at                DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,

  -- Only one row may claim a given version_code per platform.
  UNIQUE KEY uk_app_release_platform_version (platform, version_code)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ---------------------------------------------------------------------------
-- Verify
-- ---------------------------------------------------------------------------

SELECT platform, version_code, version_name, min_supported_version_code, is_active
  FROM app_release
 ORDER BY platform, version_code DESC;

-- ---------------------------------------------------------------------------
-- Publishing a release
-- ---------------------------------------------------------------------------
--
-- Run this after the build is live on the Play Store, not before - the app
-- will start telling members to update the moment this row exists.
--
--   INSERT INTO app_release
--     (platform, version_code, version_name, download_url, release_notes)
--   VALUES
--     ('android', 2, '1.1.0',
--      'https://play.google.com/store/apps/details?id=com.jeevanmilansathi.frontend',
--      'Filters on See all profiles, and a few bug fixes.');

-- ---------------------------------------------------------------------------
-- Insert / Update App Release for Version 1.2.1 (Version Code 24)
-- ---------------------------------------------------------------------------

USE marriage_portal;

-- Ensure app_release table exists
CREATE TABLE IF NOT EXISTS app_release (
  id                        INT AUTO_INCREMENT PRIMARY KEY,
  platform                  VARCHAR(16)   NOT NULL,
  version_code              INT           NOT NULL,
  version_name              VARCHAR(32)   NOT NULL,
  min_supported_version_code INT          NULL,
  release_notes             TEXT          NULL,
  download_url              VARCHAR(512)  NOT NULL,
  is_active                 TINYINT(1)    NOT NULL DEFAULT 1,
  created_at                DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uk_app_release_platform_version (platform, version_code)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ---------------------------------------------------------------------------
-- OPTION A: MANDATORY UPDATE (Forces all users on older versions to update)
-- min_supported_version_code = 24 (Blocks user until they update from Play Store)
-- ---------------------------------------------------------------------------

INSERT INTO app_release
  (platform, version_code, version_name, min_supported_version_code, release_notes, download_url, is_active)
VALUES
  ('android',
   24,
   '1.2.1',
   24, -- Set to 24 for MANDATORY update. Set to 23 if you want to allow 'Later' dismiss.
   '• Matches & Shortlisted UI Enhancement: Clear text hierarchy, full relative timestamps ("Sent 2 weeks ago"), and status chips.\n• Location Visibility: Distinct red location pin icon for candidate city & state.\n• Enhanced 3 Membership Plans: Bronze, Silver, and Gold with welcome offers.\n• Performance and UI improvements.',
   'https://play.google.com/store/apps/details?id=com.jeevanmilansathi.frontend',
   1)
ON DUPLICATE KEY UPDATE
  version_name               = VALUES(version_name),
  min_supported_version_code = VALUES(min_supported_version_code),
  release_notes              = VALUES(release_notes),
  download_url               = VALUES(download_url),
  is_active                  = VALUES(is_active);

-- ---------------------------------------------------------------------------
-- Verify current active release
-- ---------------------------------------------------------------------------
SELECT platform, version_code, version_name, min_supported_version_code,
       CASE 
         WHEN min_supported_version_code >= version_code THEN 'MANDATORY (Force Update)'
         ELSE 'OPTIONAL (Dismissible)'
       END AS update_mode,
       is_active, download_url
  FROM app_release
 WHERE is_active = 1
 ORDER BY version_code DESC;

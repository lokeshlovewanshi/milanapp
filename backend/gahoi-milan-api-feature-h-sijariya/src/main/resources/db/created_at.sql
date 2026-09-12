-- =====================================================================
-- Created timestamps, so every listing can be ordered newest-first.
--
-- Purpose: the app shows profiles, likes and shortlists in whatever order
-- MySQL happened to return them. Nobody wants to scroll to the bottom to
-- find the newest member, so each of these needs a creation time to sort
-- on - and two of the three tables did not record one.
--
-- Run once against marriage_portal. Safe to re-run: every statement is
-- guarded, and the backfills only touch rows that are still NULL.
-- =====================================================================

USE marriage_portal;

-- MySQL Workbench refuses any UPDATE whose WHERE clause does not touch a key
-- column ("Error Code: 1175 ... safe update mode"). The backfills below are
-- deliberately keyed on "column IS NULL", which is not a key, so safe mode is
-- lifted for this session and restored at the end. Each UPDATE also carries a
-- primary-key predicate, so it still runs if safe mode is re-enabled.
SET @old_safe_updates := @@SQL_SAFE_UPDATES;
SET SQL_SAFE_UPDATES = 0;

-- ---------------------------------------------------------------------
-- user_profile.created_at
-- ---------------------------------------------------------------------
SET @exists := (
  SELECT COUNT(*) FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = 'marriage_portal'
    AND TABLE_NAME = 'user_profile'
    AND COLUMN_NAME = 'created_at'
);

SET @sql := IF(@exists = 0,
  'ALTER TABLE user_profile ADD COLUMN created_at DATETIME NULL',
  'DO 0');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- Existing rows have no recorded signup time. `id` is AUTO_INCREMENT, so it
-- already encodes join order - spacing the backfill one minute per id keeps
-- that order intact under a timestamp sort, without inventing precise dates
-- that would look like real data.
UPDATE user_profile
   SET created_at = DATE_ADD('2024-01-01 00:00:00', INTERVAL id MINUTE)
 WHERE id > 0
   AND created_at IS NULL;

-- Sorting the feed is the single hottest query in the app.
SET @exists := (
  SELECT COUNT(*) FROM information_schema.STATISTICS
  WHERE TABLE_SCHEMA = 'marriage_portal'
    AND TABLE_NAME = 'user_profile'
    AND INDEX_NAME = 'idx_user_profile_created_at'
);
SET @sql := IF(@exists = 0,
  'CREATE INDEX idx_user_profile_created_at ON user_profile (created_at DESC)',
  'DO 0');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- ---------------------------------------------------------------------
-- shortlist.shortlisted_at
-- ---------------------------------------------------------------------
SET @exists := (
  SELECT COUNT(*) FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = 'marriage_portal'
    AND TABLE_NAME = 'shortlist'
    AND COLUMN_NAME = 'shortlisted_at'
);
SET @sql := IF(@exists = 0,
  'ALTER TABLE shortlist ADD COLUMN shortlisted_at DATETIME NULL',
  'DO 0');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- The shortlist table has no id at all - only the composite key - so there is
-- nothing to derive an order from. Everything already there is treated as
-- equally old, and real ordering starts from the next shortlist added.
UPDATE shortlist
   SET shortlisted_at = '2024-01-01 00:00:00'
 WHERE profile_id > 0
   AND shortlisted_at IS NULL;

-- ---------------------------------------------------------------------
-- profile_likes.liked_at already exists, but old rows may be NULL, and a
-- NULL sorts last under DESC - which would bury the earliest likes.
-- ---------------------------------------------------------------------
UPDATE profile_likes
   SET liked_at = '2024-01-01 00:00:00'
 WHERE liker_id > 0
   AND liked_at IS NULL;

SET @exists := (
  SELECT COUNT(*) FROM information_schema.STATISTICS
  WHERE TABLE_SCHEMA = 'marriage_portal'
    AND TABLE_NAME = 'profile_likes'
    AND INDEX_NAME = 'idx_profile_likes_liked_at'
);
SET @sql := IF(@exists = 0,
  'CREATE INDEX idx_profile_likes_liked_at ON profile_likes (liked_at DESC)',
  'DO 0');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- Leave the session as we found it.
SET SQL_SAFE_UPDATES = @old_safe_updates;

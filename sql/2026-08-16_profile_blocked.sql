-- Admin-only moderation flag, distinct from `hidden` (self-chosen) and
-- `deleted_at` (self-chosen soft delete). A blocked profile's account stays
-- fully live - the owner can still sign in and use it normally - it just
-- stops appearing to other members anywhere: browse, recent visitors,
-- shortlist, likes sent/received, and the Connected tab (which is derived
-- from the likes lists client-side, so filtering those two covers it too).
--
-- Safe to run twice.

-- Plain `ADD COLUMN IF NOT EXISTS` isn't accepted by this MySQL version -
-- this is the portable equivalent, checking information_schema first.
SET @column_exists := (
  SELECT COUNT(*) FROM information_schema.COLUMNS
   WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'user_profile' AND COLUMN_NAME = 'blocked'
);
SET @ddl := IF(@column_exists = 0,
  'ALTER TABLE user_profile ADD COLUMN blocked TINYINT(1) NOT NULL DEFAULT 0',
  'SELECT 1');
PREPARE stmt FROM @ddl;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

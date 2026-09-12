-- Rename the maternal uncle field while preserving every existing value.
-- This script is safe to re-run: it only renames the column when the old
-- column exists and the new one does not.
SET @rename_needed = (
  SELECT COUNT(*)
  FROM information_schema.columns
  WHERE table_schema = DATABASE()
    AND table_name = 'user_profile'
    AND column_name = 'maternal_uncles_aakna'
) > 0 AND NOT EXISTS (
  SELECT 1
  FROM information_schema.columns
  WHERE table_schema = DATABASE()
    AND table_name = 'user_profile'
    AND column_name = 'maternal_uncles_gotra'
);

SET @migration_sql = IF(
  @rename_needed,
  'ALTER TABLE `user_profile` CHANGE COLUMN `maternal_uncles_aakna` `maternal_uncles_gotra` VARCHAR(100) NULL',
  'SELECT 1'
);

PREPARE maternal_uncles_gotra_migration FROM @migration_sql;
EXECUTE maternal_uncles_gotra_migration;
DEALLOCATE PREPARE maternal_uncles_gotra_migration;

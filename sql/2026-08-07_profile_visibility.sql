-- Hide and delete a profile.
--
-- Two separate, independent things, which is why they are two columns rather
-- than more values in `status`:
--
--   * `status` already means moderation state (CREATED -> PENDING -> APPROVED).
--     Overloading it with HIDDEN would make "hidden" and "not yet approved"
--     the same state, so unhiding would have to guess which approval state to
--     restore, and any query filtering on APPROVED would silently change
--     meaning.
--
--   * hidden is reversible and user-controlled: the member is taking a break,
--     their account and data stay intact, and they can come back.
--
--   * deleted_at is a soft delete. NULL means live. A timestamp rather than a
--     boolean because "when" is what you need for a grace period, for
--     support questions, and for a purge job later. Rows are kept rather than
--     removed because likes, shortlists, views and notifications all reference
--     user_profile.id - a hard DELETE would either fail on the foreign keys or
--     cascade away other members' history.
--
-- Both default to visible, so every existing row keeps its current behaviour.
--
-- MUST run BEFORE the code that reads these columns is deployed. The prod
-- profile sets spring.jpa.hibernate.ddl-auto=none, deliberately, so Hibernate
-- will not add them for you - deploy first and every profile query fails with
-- "Unknown column 'deleted_at' in 'field list'".
--
-- Written to be safe to run twice. MySQL 8 has no ADD COLUMN IF NOT EXISTS, so
-- each change is guarded by a lookup in information_schema and skipped when it
-- is already there. That matters on production: a migration that dies halfway
-- through leaves you diagnosing a half-applied schema during an outage, and
-- one you cannot re-run is one you cannot recover with.

SET @schema := DATABASE();

-- hidden ---------------------------------------------------------------------
SET @exists := (
  SELECT COUNT(*) FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = @schema AND TABLE_NAME = 'user_profile' AND COLUMN_NAME = 'hidden'
);
SET @sql := IF(@exists = 0,
  'ALTER TABLE user_profile ADD COLUMN hidden TINYINT(1) NOT NULL DEFAULT 0
     COMMENT ''User hid their own profile from listings. Reversible.''',
  'SELECT ''skipped: user_profile.hidden already exists''');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- deleted_at -----------------------------------------------------------------
SET @exists := (
  SELECT COUNT(*) FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = @schema AND TABLE_NAME = 'user_profile' AND COLUMN_NAME = 'deleted_at'
);
SET @sql := IF(@exists = 0,
  'ALTER TABLE user_profile ADD COLUMN deleted_at DATETIME NULL DEFAULT NULL
     COMMENT ''Soft delete. NULL = live. Set = gone from every listing.''',
  'SELECT ''skipped: user_profile.deleted_at already exists''');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- index ----------------------------------------------------------------------
-- Every listing query filters on these two, so they are worth an index. The
-- composite matches the common predicate (deleted_at IS NULL AND hidden = 0)
-- in that order, since deleted_at is the more selective of the two.
SET @exists := (
  SELECT COUNT(*) FROM information_schema.STATISTICS
  WHERE TABLE_SCHEMA = @schema AND TABLE_NAME = 'user_profile'
    AND INDEX_NAME = 'idx_user_profile_visibility'
);
SET @sql := IF(@exists = 0,
  'CREATE INDEX idx_user_profile_visibility ON user_profile (deleted_at, hidden)',
  'SELECT ''skipped: idx_user_profile_visibility already exists''');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- Verification. Expect two rows: hidden and deleted_at.
SELECT COLUMN_NAME, COLUMN_TYPE, IS_NULLABLE, COLUMN_DEFAULT
FROM information_schema.COLUMNS
WHERE TABLE_SCHEMA = DATABASE()
  AND TABLE_NAME = 'user_profile'
  AND COLUMN_NAME IN ('hidden', 'deleted_at');

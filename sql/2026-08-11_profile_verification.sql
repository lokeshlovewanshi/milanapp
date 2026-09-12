-- A real "verified" flag, replacing the placeholder.
--
-- The app has been showing a blue tick on every profile since the badge was
-- built, with an explicit note that this was temporary: verification "will be
-- done by a human" once there was a screen for a human to do it on. This
-- migration is that screen's other half - the column an admin's Verify button
-- actually writes to.
--
-- Existing rows are backfilled to verified, not left at the new column's
-- default. Every profile already in this database has been showing a tick for
-- weeks; flipping that off in one migration would tell thousands of members
-- they were never verified, which is not true - nobody had gotten around to
-- checking them individually, which is different. Backfilling grandfathers
-- them in at the state they were already shown in.
--
-- New rows default to NOT verified. That default is the entire point: from
-- here on, a profile is verified because an admin looked at it, not because
-- the column happened to say so.
--
-- Safe to run twice.

SET @schema := DATABASE();

SET @exists := (
  SELECT COUNT(*) FROM information_schema.columns
   WHERE table_schema = @schema
     AND table_name = 'user_profile'
     AND column_name = 'verified'
);

SET @sql := IF(@exists = 0,
  'ALTER TABLE user_profile ADD COLUMN verified TINYINT(1) NOT NULL DEFAULT 0 AFTER hidden',
  'SELECT ''verified column already exists, skipped'' AS status'
);

PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Backfill runs only in the same invocation that just added the column - not
-- "every row still at 0", which after this migration's first run includes
-- every genuinely-unverified new signup too. Guarding on @exists (captured
-- before the ALTER above) is what makes re-running this file safe instead of
-- quietly re-verifying everyone waiting on review.
SET @backfill := IF(@exists = 0,
  'UPDATE user_profile SET verified = 1',
  'SELECT ''column already existed, backfill skipped'' AS status'
);

PREPARE stmt FROM @backfill;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- ---------------------------------------------------------------------------
-- Verify
-- ---------------------------------------------------------------------------

SELECT verified, COUNT(*) AS profiles FROM user_profile GROUP BY verified;

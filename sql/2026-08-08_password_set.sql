-- Does this account have a password its owner actually knows?
--
-- Google sign-in creates the account with a random UUID as the password, so
-- the hash in `password` is real, valid and completely unknowable. Nothing in
-- the row distinguishes that from a password someone chose - which is why the
-- app cannot currently offer "set a password" to a Google member: it has no
-- way to tell whether to ask for the current one first.
--
-- Hence an explicit flag rather than a heuristic. It is the difference between
-- "change your password" (prove you know the old one) and "create a password"
-- (there is nothing to prove), and getting it wrong in either direction is bad:
-- ask a Google member for a password they never had and they are stuck forever,
-- or skip the check for everyone and a borrowed unlocked phone becomes a
-- permanent account takeover.
--
-- Existing rows are backfilled to 1. Everyone who registered through the sign-up
-- form chose their own password, so that is right for all of them - and it is
-- the safe direction to be wrong in, because it over-asks rather than
-- under-asks. Any account created by Google sign-in BEFORE this migration is
-- the exception and will be told to prove a password it does not have. There is
-- no marker in the row to find those automatically. To free one, run:
--
--   UPDATE user_profile SET password_set = 0 WHERE email = 'them@example.com';
--
-- Safe to run twice.

SET @schema := DATABASE();

SET @exists := (
  SELECT COUNT(*) FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = @schema
    AND TABLE_NAME = 'user_profile'
    AND COLUMN_NAME = 'password_set'
);

-- NOT NULL DEFAULT 1 backfills every existing row in the same statement, so
-- there is no window where the column is null and the check below reads as
-- "no password required".
SET @sql := IF(@exists = 0, '
  ALTER TABLE user_profile
    ADD COLUMN password_set TINYINT(1) NOT NULL DEFAULT 1
    COMMENT ''0 = account created by Google sign-in and never given a password''
', 'SELECT ''skipped: user_profile.password_set already exists''');

PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SELECT COLUMN_NAME, COLUMN_TYPE, IS_NULLABLE, COLUMN_DEFAULT
FROM information_schema.COLUMNS
WHERE TABLE_SCHEMA = DATABASE()
  AND TABLE_NAME = 'user_profile'
  AND COLUMN_NAME = 'password_set';

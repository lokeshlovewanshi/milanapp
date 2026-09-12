-- Correct password_set for accounts that never had a password.
--
-- 2026-08-08_password_set.sql backfilled every existing row to 1, on the
-- reasoning that everyone already in the database had registered through the
-- sign-up form. That was wrong for accounts created by Google sign-in, and its
-- own comment said as much - it just had no way to find them.
--
-- There is one after all: those rows have a NULL password. A row cannot both
-- have no password and have had one set, and the combination is not merely
-- untidy - Account Settings reads the flag, asks for a current password that
-- does not exist, and then bcrypt-compares the answer against NULL, which
-- cannot match. Those members can never set a password by any route.
--
-- Safe to run twice.

UPDATE user_profile
   SET password_set = 0
 WHERE password IS NULL
   AND password_set <> 0;

SELECT ROW_COUNT() AS rows_corrected;

SELECT
  SUM(password IS NULL AND password_set = 1) AS still_inconsistent_expect_0,
  SUM(password IS NULL)                      AS accounts_with_no_password,
  COUNT(*)                                   AS total
FROM user_profile;

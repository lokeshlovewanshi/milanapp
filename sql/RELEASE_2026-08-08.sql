-- Release 2026-08-08 - every migration this release needs, in order.
--
-- Run this ONE file against production before deploying the new backend jar.
-- The order matters only in that nothing here depends on anything else, but
-- running them out of order is still a habit worth not forming.
--
-- Every file it sources is guarded and safe to run twice, so re-running this
-- whole script after a partial failure is fine - already-applied steps print
-- "skipped" and move on.
--
-- IMPORTANT: run this BEFORE the jar. The new code selects columns that do not
-- exist yet on an unmigrated database, so deploying the jar first takes every
-- profile read down, not just the new features.
--
-- cd into this directory first. SOURCE resolves paths against the working
-- directory of whoever ran mysql, not against this file's location, so running
-- it from one directory up fails on the first SOURCE with
-- "Failed to open file ... error: 2".
--
--   cd sql
--   mysql -h <rds-endpoint> -u <admin> -p <db> < RELEASE_2026-08-08.sql
--
-- The MySQL user needs CREATE and ALTER as well as the usual DML. A user with
-- only SELECT/INSERT/UPDATE/DELETE fails on the first ALTER.

SELECT '--- 1/7 profile visibility (hide + soft delete) ---' AS step;
SOURCE 2026-08-07_profile_visibility.sql;

SELECT '--- 2/7 password reset tokens ---' AS step;
SOURCE 2026-08-07_password_reset_token.sql;

SELECT '--- 3/7 stored kundali charts ---' AS step;
SOURCE 2026-08-08_kundali.sql;

SELECT '--- 4/7 city coordinates (200 seed) ---' AS step;
SOURCE 2026-08-08_city_coordinates.sql;

SELECT '--- 5/7 city expansion (to 1147) ---' AS step;
SOURCE 2026-08-08_city_expand.sql;

SELECT '--- 6/7 password_set flag ---' AS step;
SOURCE 2026-08-08_password_set.sql;

SELECT '--- 7/7 email OTP + email_verified ---' AS step;
SOURCE 2026-08-08_email_otp.sql;


-- Verification. Expect: 4 tables, 4 columns, 1147 cities.
SELECT '--- verification ---' AS step;

SELECT COUNT(*) AS tables_present_expect_4
FROM information_schema.TABLES
WHERE TABLE_SCHEMA = DATABASE()
  AND TABLE_NAME IN ('kundali', 'city', 'password_reset_token', 'email_otp');

SELECT COUNT(*) AS user_profile_cols_expect_4
FROM information_schema.COLUMNS
WHERE TABLE_SCHEMA = DATABASE()
  AND TABLE_NAME = 'user_profile'
  AND COLUMN_NAME IN ('hidden', 'deleted_at', 'password_set', 'email_verified');

SELECT COUNT(*) AS cities_expect_1147 FROM city;

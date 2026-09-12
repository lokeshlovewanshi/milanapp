-- Backfills user_profile.marital_status rows still holding a display label
-- (or an informal synonym) instead of the lookup code the filter query and
-- reference_data.sql both expect.
--
-- Root cause: an old onboarding screen (frontend/app/profile-setup.tsx,
-- present since the first commit, removed from the signup flow later) used a
-- plain picker whose value WAS the label ("Never Married") rather than the
-- code ("NEVER_MARRIED"). No migration ever ran to fix rows written through
-- it, and the filter query (UserProfileRepository) does an exact match on
-- the code - so any profile saved through that old screen and never
-- re-edited since is silently invisible to the "Never Married" filter, even
-- though it's a perfectly valid never-married profile.
--
-- Safe to run twice - every UPDATE only touches rows that still hold the old
-- value, so a second run is a no-op.

UPDATE user_profile SET marital_status = 'NEVER_MARRIED' WHERE marital_status = 'Never Married';
UPDATE user_profile SET marital_status = 'DIVORCED'      WHERE marital_status = 'Divorced';
UPDATE user_profile SET marital_status = 'WIDOWED'       WHERE marital_status = 'Widowed';
UPDATE user_profile SET marital_status = 'AWAITING_DIVORCE' WHERE marital_status = 'Awaiting Divorce';
UPDATE user_profile SET marital_status = 'ANNULLED'      WHERE marital_status = 'Annulled';

-- 'Single' isn't a label reference_data.sql ever defined - it's an even
-- older/informal value, found in this database during this investigation,
-- that means the same thing as NEVER_MARRIED in every context this app uses
-- marital status for.
UPDATE user_profile SET marital_status = 'NEVER_MARRIED' WHERE marital_status = 'Single';

-- ---------------------------------------------------------------------------
-- Verify - anything printed here besides the five valid codes (and NULL) is
-- a variant this migration doesn't know about yet and needs a new UPDATE.
-- ---------------------------------------------------------------------------
SELECT marital_status, COUNT(*) FROM user_profile GROUP BY marital_status;

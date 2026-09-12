-- Delete every member and everything that hangs off a member, keep the app
-- itself standing.
--
-- "Delete all user data" is ambiguous on its own - it could mean the accounts,
-- or the whole database. This script is scoped to the first reading: every
-- row in every table that is keyed to a user_profile.id, gone, but
-- subscription_plan, promo_campaign, admin_user and the city/state/lookup
-- reference tables survive untouched, because none of those are "user data" -
-- they are the app's own configuration and would otherwise need reseeding.
--
-- FOREIGN_KEY_CHECKS is turned off for the duration rather than deleting in
-- dependency order, because TRUNCATE cannot run at all while an FK still
-- points at the table (MySQL rejects it outright, unlike DELETE). TRUNCATE
-- over DELETE matters here too: it resets every AUTO_INCREMENT back to 1,
-- which a plain DELETE would not, and the next signup should not start at
-- profile #4,317.
--
-- What this does NOT do: delete the photo files sitting in S3. attachment
-- rows are only pointers to those objects - clearing the table orphans the
-- files rather than removing them. Run the S3 cleanup (or accept the orphaned
-- storage cost) separately if that matters.
--
-- There is no undo. Take a backup first:
--   mysqldump -u <user> -p marriage_portal > backup_$(date +%Y%m%d_%H%M%S).sql

SET FOREIGN_KEY_CHECKS = 0;

-- Data that belongs to a member, directly or by way of another member-owned row.
TRUNCATE TABLE attachment;
TRUNCATE TABLE profile_likes;
TRUNCATE TABLE shortlist;
TRUNCATE TABLE views;
TRUNCATE TABLE kundali;
TRUNCATE TABLE password_reset_token;
TRUNCATE TABLE email_otp;
TRUNCATE TABLE payment_event;
TRUNCATE TABLE payment_order;
TRUNCATE TABLE membership;
TRUNCATE TABLE promo_redemption;
TRUNCATE TABLE featured_story;

-- No FK, but user_id-keyed - would otherwise notify or push to nobody.
TRUNCATE TABLE notifications;
TRUNCATE TABLE device_tokens;

-- Session state for accounts that are about to stop existing.
TRUNCATE TABLE token_blacklist;

-- The members themselves, last.
TRUNCATE TABLE user_profile;

SET FOREIGN_KEY_CHECKS = 1;

-- ---------------------------------------------------------------------------
-- Left alone on purpose - not user data:
--   subscription_plan, promo_campaign   the plans and the launch offer
--   admin_user                          who can curate Top Stories
--   featured_story is cleared above only because it points at member rows
--   that no longer exist, not because it is itself a plan or a promotion
--   lookup_option, state, city, profile_completion_weight   reference data
-- ---------------------------------------------------------------------------

SELECT
  (SELECT COUNT(*) FROM user_profile)  AS members_remaining,
  (SELECT COUNT(*) FROM attachment)    AS photos_remaining,
  (SELECT COUNT(*) FROM subscription_plan) AS plans_untouched,
  (SELECT COUNT(*) FROM admin_user)        AS admins_untouched;

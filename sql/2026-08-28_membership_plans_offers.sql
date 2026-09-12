-- ---------------------------------------------------------------------------
-- Migration: 3 Membership Plans (Bronze 3M, Silver 6M, Gold 12M) & Offer Management
-- Compatible with all MySQL (5.7 / 8.0) and MariaDB versions
-- ---------------------------------------------------------------------------

USE marriage_portal;

-- 1. Add columns to subscription_plan (standard MySQL syntax)
ALTER TABLE subscription_plan
  ADD COLUMN discount_price_paise BIGINT       NULL DEFAULT NULL AFTER price_paise,
  ADD COLUMN is_free_on_signup   TINYINT(1)   NOT NULL DEFAULT 0 AFTER is_active,
  ADD COLUMN offer_starts_at     DATETIME     NULL DEFAULT NULL AFTER is_free_on_signup,
  ADD COLUMN offer_ends_at       DATETIME     NULL DEFAULT NULL AFTER offer_starts_at,
  ADD COLUMN features            TEXT         NULL DEFAULT NULL AFTER sort_order;

-- 2. Seed / Update the 3 Standardized Membership Plans
-- All plans provide the same complete access (contact numbers, full biodata, kundali matching, etc.)

INSERT INTO subscription_plan
  (code, name, tier, duration_months, price_paise, discount_price_paise, is_active, is_free_on_signup, offer_starts_at, offer_ends_at, sort_order, features)
VALUES
  ('bronze_3m', 'Bronze', 'bronze', 3, 149900, 99900, 1, 0, NULL, NULL, 10,
   '["Unlimited Profile Views","Direct Contact Number & WhatsApp Access","Full Kundali Compatibility & Guna Milan","Send & Receive Connection Requests","Verified Community Badge"]'),

  ('silver_6m', 'Silver', 'silver', 6, 249900, 179900, 1, 0, NULL, NULL, 20,
   '["Unlimited Profile Views","Direct Contact Number & WhatsApp Access","Full Kundali Compatibility & Guna Milan","Send & Receive Connection Requests","Verified Community Badge"]'),

  ('gold_12m', 'Gold', 'gold', 12, 499900, 0, 1, 1, NOW(), NULL, 30,
   '["Unlimited Profile Views","Direct Contact Number & WhatsApp Access","Full Kundali Compatibility & Guna Milan","Send & Receive Connection Requests","Verified Community Badge"]')
ON DUPLICATE KEY UPDATE
  name                 = VALUES(name),
  tier                 = VALUES(tier),
  duration_months      = VALUES(duration_months),
  price_paise          = VALUES(price_paise),
  discount_price_paise = VALUES(discount_price_paise),
  is_active            = VALUES(is_active),
  is_free_on_signup    = VALUES(is_free_on_signup),
  offer_starts_at      = VALUES(offer_starts_at),
  offer_ends_at        = VALUES(offer_ends_at),
  sort_order           = VALUES(sort_order),
  features             = VALUES(features);

-- 3. Deactivate obsolete plans if any
UPDATE subscription_plan
   SET is_active = 0
 WHERE code NOT IN ('bronze_3m', 'silver_6m', 'gold_12m');

-- 4. Verify Active Plans
SELECT id, code, name, tier, duration_months,
       price_paise / 100 AS base_price_inr,
       discount_price_paise / 100 AS discount_price_inr,
       is_free_on_signup, is_active, sort_order
  FROM subscription_plan
 WHERE is_active = 1
 ORDER BY sort_order;

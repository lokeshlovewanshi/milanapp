-- Memberships: plans, promotion campaigns, payments.
--
-- Five tables, because five different things are being recorded and merging any
-- two of them loses something that is needed later:
--
--   subscription_plan   what is for sale, and for how much
--   promo_campaign      a time-boxed offer that changes that price
--   payment_order       one attempt to buy, from "pay" to settled or abandoned
--   payment_event       every callback the gateway sent, kept verbatim
--   membership          what a member actually has right now
--
-- The money column is paise, as an integer, everywhere. Rupees in a DECIMAL is
-- how rounding differences appear between what was shown, what was charged and
-- what was refunded; gateways all count in paise, so this does too.
--
-- Prices live here and not in the app. The client sends a plan code and the
-- server looks up the amount, because a price posted from a phone is a price
-- somebody can edit before paying it.
--
-- Safe to run twice.

-- ---------------------------------------------------------------------------
-- What is for sale
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS subscription_plan (
  id               INT AUTO_INCREMENT PRIMARY KEY,
  -- Stable identifier the app sends, e.g. "gold_12m". Never reuse one for a
  -- different plan: old orders point at it.
  code             VARCHAR(64)  NOT NULL,
  name             VARCHAR(64)  NOT NULL,
  -- free / silver / gold. What the member gets; `duration_months` is how long.
  tier             VARCHAR(32)  NOT NULL,
  -- NULL means lifetime. 0 is the free plan.
  duration_months  INT          NULL,
  price_paise      BIGINT       NOT NULL DEFAULT 0,
  currency         CHAR(3)      NOT NULL DEFAULT 'INR',
  -- Retired plans stay for the sake of old orders, but stop being offered.
  is_active        TINYINT(1)   NOT NULL DEFAULT 1,
  sort_order       INT          NOT NULL DEFAULT 0,
  created_at       DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at       DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uk_subscription_plan_code (code),
  KEY idx_subscription_plan_active (is_active, sort_order)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ---------------------------------------------------------------------------
-- Promotion campaigns
-- ---------------------------------------------------------------------------
--
-- A campaign changes the price of some plans between two dates. The launch
-- offer - twelve months free for everyone - is one row here rather than a
-- price edit, so that ending it is a date and not a migration, and so orders
-- placed under it can still be told apart afterwards.

CREATE TABLE IF NOT EXISTS promo_campaign (
  id             INT AUTO_INCREMENT PRIMARY KEY,
  code           VARCHAR(64)  NOT NULL,
  name           VARCHAR(128) NOT NULL,
  description    VARCHAR(255) NULL,

  -- PERCENT (0-100), FLAT (paise off) or FREE (whole price waived).
  discount_type  VARCHAR(16)  NOT NULL,
  discount_value BIGINT       NOT NULL DEFAULT 0,

  -- Which plans it applies to. NULL in both means every plan.
  applies_to_tier            VARCHAR(32) NULL,
  applies_to_duration_months INT         NULL,

  -- NULL start means "already running"; NULL end means "until switched off".
  starts_at      DATETIME     NULL,
  ends_at        DATETIME     NULL,
  is_active      TINYINT(1)   NOT NULL DEFAULT 1,

  -- Caps. NULL is unlimited. per_user_limit is what stops one account
  -- claiming a free year every day.
  max_redemptions  INT        NULL,
  per_user_limit   INT        NULL DEFAULT 1,
  redeemed_count   INT        NOT NULL DEFAULT 0,

  -- Set when the offer needs typing in; NULL means it applies automatically.
  coupon_code    VARCHAR(64)  NULL,

  created_at     DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at     DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uk_promo_campaign_code (code),
  KEY idx_promo_campaign_live (is_active, starts_at, ends_at),
  KEY idx_promo_campaign_coupon (coupon_code)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Who claimed what, so per_user_limit can be enforced and a campaign's real
-- cost can be counted after the fact.
CREATE TABLE IF NOT EXISTS promo_redemption (
  id              BIGINT AUTO_INCREMENT PRIMARY KEY,
  promo_id        INT      NOT NULL,
  user_profile_id INT      NOT NULL,
  payment_order_id BIGINT  NULL,
  discount_paise  BIGINT   NOT NULL DEFAULT 0,
  redeemed_at     DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  KEY idx_promo_redemption_promo (promo_id),
  KEY idx_promo_redemption_user (user_profile_id),
  CONSTRAINT fk_promo_redemption_promo FOREIGN KEY (promo_id)
    REFERENCES promo_campaign (id) ON DELETE CASCADE,
  CONSTRAINT fk_promo_redemption_user FOREIGN KEY (user_profile_id)
    REFERENCES user_profile (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ---------------------------------------------------------------------------
-- Payments
-- ---------------------------------------------------------------------------
--
-- One row per attempt, created before the customer is sent to the gateway so
-- that an abandoned payment is still visible. `provider` is a column rather
-- than an assumption, so moving from Paytm to another gateway does not orphan
-- the history.

CREATE TABLE IF NOT EXISTS payment_order (
  id                BIGINT AUTO_INCREMENT PRIMARY KEY,
  -- What we send the gateway. Opaque and unguessable, never the primary key -
  -- a sequential order id tells the world how many sales have been made.
  order_ref         VARCHAR(64)  NOT NULL,
  user_profile_id   INT          NOT NULL,
  plan_id           INT          NOT NULL,
  promo_id          INT          NULL,

  provider          VARCHAR(32)  NOT NULL,
  -- The gateway's own ids. Both nullable: they arrive after the row exists.
  provider_order_id VARCHAR(128) NULL,
  provider_payment_id VARCHAR(128) NULL,

  amount_paise      BIGINT       NOT NULL,
  discount_paise    BIGINT       NOT NULL DEFAULT 0,
  currency          CHAR(3)      NOT NULL DEFAULT 'INR',

  -- CREATED -> PENDING -> PAID | FAILED | CANCELLED, and REFUNDED after.
  status            VARCHAR(24)  NOT NULL DEFAULT 'CREATED',
  failure_reason    VARCHAR(255) NULL,

  created_at        DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at        DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  paid_at           DATETIME     NULL,

  UNIQUE KEY uk_payment_order_ref (order_ref),
  -- Two callbacks for one payment must not create two orders.
  UNIQUE KEY uk_payment_order_provider_payment (provider, provider_payment_id),
  KEY idx_payment_order_user (user_profile_id, status),
  KEY idx_payment_order_status (status, created_at),
  CONSTRAINT fk_payment_order_user FOREIGN KEY (user_profile_id)
    REFERENCES user_profile (id) ON DELETE CASCADE,
  CONSTRAINT fk_payment_order_plan FOREIGN KEY (plan_id)
    REFERENCES subscription_plan (id),
  CONSTRAINT fk_payment_order_promo FOREIGN KEY (promo_id)
    REFERENCES promo_campaign (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Every callback, kept whole and unparsed.
--
-- Gateways retry, arrive out of order, and occasionally contradict themselves;
-- when a customer says they paid and the system disagrees, this is the only
-- record of what was actually received. `signature_valid` is stored rather
-- than only checked, so a forged callback that was rejected leaves a trace.
CREATE TABLE IF NOT EXISTS payment_event (
  id               BIGINT AUTO_INCREMENT PRIMARY KEY,
  payment_order_id BIGINT       NULL,
  provider         VARCHAR(32)  NOT NULL,
  event_type       VARCHAR(64)  NULL,
  -- The gateway's dedupe key, where it gives one.
  provider_event_id VARCHAR(128) NULL,
  signature_valid  TINYINT(1)   NULL,
  payload          TEXT         NOT NULL,
  received_at      DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uk_payment_event_provider_event (provider, provider_event_id),
  KEY idx_payment_event_order (payment_order_id, received_at),
  CONSTRAINT fk_payment_event_order FOREIGN KEY (payment_order_id)
    REFERENCES payment_order (id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ---------------------------------------------------------------------------
-- What a member currently has
-- ---------------------------------------------------------------------------
--
-- Separate from payment_order because a membership does not always come from a
-- payment: the launch offer grants one, and support may extend one by hand.
-- Every grant records where it came from in `source`.
--
-- History is kept rather than overwritten - a member who upgrades has two rows
-- and only one ACTIVE - so renewals and lapses can be counted later.

CREATE TABLE IF NOT EXISTS membership (
  id               BIGINT AUTO_INCREMENT PRIMARY KEY,
  user_profile_id  INT          NOT NULL,
  plan_id          INT          NOT NULL,
  payment_order_id BIGINT       NULL,
  promo_id         INT          NULL,

  -- PURCHASE | PROMO | MANUAL
  source           VARCHAR(24)  NOT NULL DEFAULT 'PURCHASE',

  starts_at        DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  -- NULL is a lifetime membership.
  expires_at       DATETIME     NULL,
  -- ACTIVE | EXPIRED | CANCELLED | REPLACED
  status           VARCHAR(24)  NOT NULL DEFAULT 'ACTIVE',

  created_at       DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at       DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

  KEY idx_membership_user_status (user_profile_id, status),
  KEY idx_membership_expiry (status, expires_at),
  CONSTRAINT fk_membership_user FOREIGN KEY (user_profile_id)
    REFERENCES user_profile (id) ON DELETE CASCADE,
  CONSTRAINT fk_membership_plan FOREIGN KEY (plan_id)
    REFERENCES subscription_plan (id),
  CONSTRAINT fk_membership_order FOREIGN KEY (payment_order_id)
    REFERENCES payment_order (id) ON DELETE SET NULL,
  CONSTRAINT fk_membership_promo FOREIGN KEY (promo_id)
    REFERENCES promo_campaign (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ---------------------------------------------------------------------------
-- Seed: the plans the app shows
-- ---------------------------------------------------------------------------
--
-- Prices in paise. These match components/PlanPicker.tsx, and the twelve-month
-- rows are the discounted per-month rate multiplied by twelve.

INSERT INTO subscription_plan (code, name, tier, duration_months, price_paise, sort_order)
VALUES
  ('free',      'Free',    'free',   0,   0,      10),
  ('silver_1m', 'Silver',  'silver', 1,   49900,  20),
  ('silver_12m','Silver',  'silver', 12,  399600, 30),
  ('gold_1m',   'Gold',    'gold',   1,   99900,  40),
  ('gold_12m',  'Gold',    'gold',   12,  799200, 50)
ON DUPLICATE KEY UPDATE
  name        = VALUES(name),
  tier        = VALUES(tier),
  price_paise = VALUES(price_paise),
  sort_order  = VALUES(sort_order);

-- ---------------------------------------------------------------------------
-- Seed: the launch campaign
-- ---------------------------------------------------------------------------
--
-- Twelve-month plans are free while this is running. Ending it is one UPDATE
-- setting ends_at or is_active - no price is touched, and orders placed under
-- it stay attributed to it.

INSERT INTO promo_campaign
  (code, name, description, discount_type, discount_value,
   applies_to_tier, applies_to_duration_months, starts_at, ends_at, per_user_limit)
VALUES
  ('LAUNCH_YEAR_FREE',
   'Launch offer - 12 months free',
   'Every 12-month plan is free during launch.',
   'FREE', 0,
   NULL, 12,
   NOW(), NULL, 1)
ON DUPLICATE KEY UPDATE
  description    = VALUES(description),
  discount_type  = VALUES(discount_type),
  per_user_limit = VALUES(per_user_limit);

-- ---------------------------------------------------------------------------
-- Verify
-- ---------------------------------------------------------------------------

SELECT code, name, tier, duration_months, price_paise / 100 AS price_rupees, is_active
  FROM subscription_plan
 ORDER BY sort_order;

SELECT code, name, discount_type, applies_to_duration_months, starts_at, ends_at, is_active
  FROM promo_campaign;

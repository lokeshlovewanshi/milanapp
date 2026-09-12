-- One-time codes emailed for address verification and password reset.
--
-- Why a second table rather than reusing password_reset_token
-- -----------------------------------------------------------
-- That table holds a long random link token: 256 bits, single-use, and safe to
-- leave valid for an hour because it cannot be guessed. A six-digit code is a
-- different animal - a million possibilities is nothing to a script - so it
-- needs an attempt counter, a short life, and a purpose it is bound to. Bolting
-- those onto the link table would leave every column meaningless for one of the
-- two uses.
--
-- Why the code is bcrypted rather than SHA-256'd
-- ---------------------------------------------
-- password_reset_token uses plain SHA-256, and the comment there explains why
-- that is right: long random values have no dictionary to attack. That
-- reasoning does not carry over. Six digits IS the dictionary - a leaked table
-- of SHA-256 codes could be reversed for every row on a laptop in seconds. A
-- work factor is exactly what buys something here, so this column takes the
-- same bcrypt the password column does.
--
-- The cost is one bcrypt per verification attempt, and attempts are capped at
-- five, so it is bounded by construction.
--
-- Why the code is not unique
-- --------------------------
-- Six digits collide constantly across users; that is fine, because a code is
-- only ever looked up alongside the email it was issued to. There is
-- deliberately no index on the hash - nothing should ever search by it.
--
-- Safe to run twice.

SET @schema := DATABASE();

SET @exists := (
  SELECT COUNT(*) FROM information_schema.TABLES
  WHERE TABLE_SCHEMA = @schema AND TABLE_NAME = 'email_otp'
);

SET @sql := IF(@exists = 0, '
  CREATE TABLE email_otp (
    id          BIGINT       NOT NULL AUTO_INCREMENT PRIMARY KEY,

    -- The address the code went to, not a user id. A code can be requested for
    -- an address before any account exists, and password reset must behave the
    -- same way for an unknown address as a known one - looking rows up by email
    -- keeps both paths identical.
    email       VARCHAR(255) NOT NULL,

    -- VERIFY_EMAIL or RESET_PASSWORD. Bound into the row so a code mailed to
    -- confirm an address can never be redeemed to change a password.
    purpose     VARCHAR(32)  NOT NULL,

    code_hash   VARCHAR(72)  NOT NULL COMMENT ''bcrypt of the six digits. Never the digits.'',

    expires_at  DATETIME     NOT NULL,
    consumed_at DATETIME     NULL     COMMENT ''Set when redeemed. Non-null means spent.'',

    -- Wrong guesses so far. The row is dead once this hits the cap, which is
    -- what keeps a six-digit secret from being brute-forced in a loop.
    attempts    SMALLINT     NOT NULL DEFAULT 0,

    created_at  DATETIME     NOT NULL,

    -- The only lookup: newest live code for this address and purpose. Also
    -- serves the throttle, which counts recent rows for the same pair.
    KEY idx_otp_lookup (email, purpose, created_at),

    -- Housekeeping deletes by age; without this it is a full scan of a table
    -- that only ever grows.
    KEY idx_otp_expiry (expires_at)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
', 'SELECT ''skipped: email_otp already exists''');

PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;


-- Has this member confirmed the address they signed up with?
--
-- Defaults to 1 for existing rows, and that is a deliberate choice rather than
-- an oversight. Everyone already using the app got in before verification
-- existed; defaulting them to 0 would lock out the entire member base the
-- moment anything starts enforcing this. New accounts are created with 0
-- explicitly, so the rule applies from here on.
--
-- Google accounts are set to 1 at creation: Google has already verified the
-- address, and asking someone to confirm an address they just proved they
-- control is friction with nothing behind it.
SET @exists := (
  SELECT COUNT(*) FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = @schema
    AND TABLE_NAME = 'user_profile'
    AND COLUMN_NAME = 'email_verified'
);

SET @sql := IF(@exists = 0, '
  ALTER TABLE user_profile
    ADD COLUMN email_verified TINYINT(1) NOT NULL DEFAULT 1
    COMMENT ''0 = signed up but never confirmed the address''
', 'SELECT ''skipped: user_profile.email_verified already exists''');

PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;


SELECT COLUMN_NAME, COLUMN_TYPE, IS_NULLABLE, COLUMN_DEFAULT
FROM information_schema.COLUMNS
WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'email_otp'
ORDER BY ORDINAL_POSITION;

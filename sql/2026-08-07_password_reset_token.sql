-- Password reset tokens.
--
-- Why a table rather than a self-contained signed token
-- ----------------------------------------------------
-- A short-lived JWT would need no schema at all, and it is the obvious
-- shortcut. It is also wrong here, because a JWT cannot be made single-use or
-- revocable without storing something anyway. A reset link that keeps working
-- until it expires is a problem precisely in the situations this feature
-- exists for: a shared laptop, a forwarded mail, a mailbox someone else can
-- read. Recording each token lets it be burned the moment it is used.
--
-- Why the hash and not the token
-- ------------------------------
-- token_hash holds SHA-256 of the value that went out in the email, never the
-- value itself. Anyone who reads this table - a backup, a support query, a
-- leak - therefore cannot reset a single account, because the hash cannot be
-- turned back into a working link. This is the same reasoning as never storing
-- a password: the server does not need the original, only the ability to
-- recognise it.
--
-- No salt and no bcrypt, deliberately: these tokens are long random values
-- rather than human-chosen secrets, so there is no dictionary to attack and
-- nothing for a work factor to buy. Plain SHA-256 is the right tool, and it is
-- fast enough to stay out of the way on a login path.
--
-- Safe to run twice.

SET @schema := DATABASE();

SET @exists := (
  SELECT COUNT(*) FROM information_schema.TABLES
  WHERE TABLE_SCHEMA = @schema AND TABLE_NAME = 'password_reset_token'
);

SET @sql := IF(@exists = 0, '
  CREATE TABLE password_reset_token (
    id          BIGINT       NOT NULL AUTO_INCREMENT PRIMARY KEY,
    user_id     INT          NOT NULL,
    token_hash  CHAR(64)     NOT NULL COMMENT ''SHA-256 hex of the emailed token. Never the token itself.'',
    expires_at  DATETIME     NOT NULL,
    used_at     DATETIME     NULL     COMMENT ''Set the moment it is redeemed. Non-null means spent.'',
    created_at  DATETIME     NOT NULL,

    -- Every redemption looks a token up by its hash, so this is the hot path.
    -- UNIQUE as well as indexed: two rows with the same hash would be a
    -- generator collision, which should fail loudly rather than silently
    -- resolve to whichever row came first.
    UNIQUE KEY uq_prt_token_hash (token_hash),

    -- Used to invalidate a user''s outstanding tokens when a new one is issued
    -- or a reset completes, so an older email cannot still be redeemed.
    KEY idx_prt_user (user_id, used_at),

    CONSTRAINT fk_prt_user FOREIGN KEY (user_id)
      REFERENCES user_profile (id) ON DELETE CASCADE
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
', 'SELECT ''skipped: password_reset_token already exists''');

PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- Verification.
SELECT COLUMN_NAME, COLUMN_TYPE, IS_NULLABLE
FROM information_schema.COLUMNS
WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'password_reset_token'
ORDER BY ORDINAL_POSITION;

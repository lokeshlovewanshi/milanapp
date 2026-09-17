-- Notification service schema.
--
-- Run against the marriage_portal database before starting the app with the
-- notification module. Both tables are independent of the existing schema, so
-- this is additive and safe to run on a live database.

-- ---------------------------------------------------------------------------
-- device_tokens: one row per device a user has signed in on.
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS device_tokens (
    id          BIGINT       NOT NULL AUTO_INCREMENT,
    user_id     INT          NOT NULL,
    -- FCM registration tokens are long and have no documented maximum;
    -- 512 leaves comfortable headroom over the ~163 chars seen in practice.
    token       VARCHAR(512) NOT NULL,
    platform    VARCHAR(16)  DEFAULT 'android',
    created_at  DATETIME     NOT NULL,
    updated_at  DATETIME     NOT NULL,
    PRIMARY KEY (id),
    -- Unique on token alone, not (user_id, token): FCM reissues the same token
    -- to whichever account is now on the device, so the row must move to the new
    -- owner rather than duplicate. Without this the previous owner keeps
    -- receiving the new owner's notifications.
    UNIQUE KEY uk_device_token (token),
    KEY idx_device_tokens_user (user_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ---------------------------------------------------------------------------
-- notifications: the in-app feed behind the bell icon.
--
-- Kept separate from push delivery deliberately. Push is best-effort - the
-- device may be offline, the token stale, Firebase unreachable - but the feed
-- must still show what happened.
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS notifications (
    id          BIGINT       NOT NULL AUTO_INCREMENT,
    user_id     INT          NOT NULL,          -- recipient
    type        VARCHAR(32)  NOT NULL,          -- LIKE_RECEIVED, LIKE_ACCEPTED, PROFILE_VIEW, MESSAGE, BROADCAST
    title       VARCHAR(128) NOT NULL,
    body        VARCHAR(512),
    actor_id    INT          NULL,              -- profile this is about, for deep linking
    read_at     DATETIME     NULL,              -- NULL means unread
    created_at  DATETIME     NOT NULL,
    PRIMARY KEY (id),
    -- Serves the feed query: WHERE user_id = ? ORDER BY created_at DESC
    KEY idx_notifications_user_created (user_id, created_at),
    -- Serves the badge count: WHERE user_id = ? AND read_at IS NULL
    KEY idx_notifications_user_read (user_id, read_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ---------------------------------------------------------------------------
-- Housekeeping
--
-- Notifications accumulate forever otherwise. At 1,000 users this is not urgent,
-- but scheduling it early avoids a painful cleanup later. Run monthly:
--
--   DELETE FROM notifications
--    WHERE read_at IS NOT NULL
--      AND created_at < DATE_SUB(NOW(), INTERVAL 90 DAY);
-- ---------------------------------------------------------------------------

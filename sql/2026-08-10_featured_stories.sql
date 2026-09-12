-- Featured profiles ("Top Stories") on the home screen, plus the admin role
-- that decides what goes in the list.
--
-- Two tables:
--
--   featured_story   which profiles are featured, in what order, and until when
--   admin_user       who is allowed to change that
--
-- Curated rather than computed on purpose: this is the one slot in the feed a
-- person chooses, and the point is lost if an algorithm fills it.
--
-- Safe to run twice.

-- ---------------------------------------------------------------------------
-- Who may curate
-- ---------------------------------------------------------------------------
--
-- A separate table from user_profile rather than a flag on it. An
-- administrator is not a member with a checkbox: they sign in through a
-- different door, and mixing the two means one bug in member sign-up is enough
-- to mint an admin. Keeping the credential separate also means an admin
-- account has no profile, cannot be browsed, and cannot feature itself.
--
-- password_hash is bcrypt, the same encoder the member login already uses.

CREATE TABLE IF NOT EXISTS admin_user (
  id             INT AUTO_INCREMENT PRIMARY KEY,
  email          VARCHAR(191) NOT NULL,
  password_hash  VARCHAR(255) NOT NULL,
  name           VARCHAR(128) NULL,
  -- ADMIN today. Room for EDITOR or SUPPORT later without another migration.
  role           VARCHAR(32)  NOT NULL DEFAULT 'ADMIN',
  is_active      TINYINT(1)   NOT NULL DEFAULT 1,
  last_login_at  DATETIME     NULL,
  created_at     DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at     DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uk_admin_user_email (email)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ---------------------------------------------------------------------------
-- The featured list
-- ---------------------------------------------------------------------------
--
-- A row is a profile in the rail. The profile itself is referenced, never
-- copied: a featured member who changes their photo or leaves must not go on
-- being shown as they were.
--
-- ON DELETE CASCADE matters here. A deleted member has to fall out of the rail
-- on their own, or the one place the whole app looks at first would keep
-- showing someone who asked to be gone.

CREATE TABLE IF NOT EXISTS featured_story (
  id              INT AUTO_INCREMENT PRIMARY KEY,
  user_profile_id INT          NOT NULL,

  -- Lower sorts first. Gaps of ten so a profile can be slipped between two
  -- others without renumbering the row.
  sort_order      INT          NOT NULL DEFAULT 0,

  -- Optional window. Null start means live now; null end means until removed.
  -- A campaign that expires on its own is one less thing to remember to undo.
  starts_at       DATETIME     NULL,
  ends_at         DATETIME     NULL,
  is_active       TINYINT(1)   NOT NULL DEFAULT 1,

  -- Why this profile was featured. Internal only; never shown in the app.
  note            VARCHAR(255) NULL,

  created_by      INT          NULL,
  created_at      DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at      DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

  -- One entry per profile. Featuring someone twice would show them twice.
  UNIQUE KEY uk_featured_story_profile (user_profile_id),
  KEY idx_featured_story_live (is_active, sort_order),
  CONSTRAINT fk_featured_story_profile FOREIGN KEY (user_profile_id)
    REFERENCES user_profile (id) ON DELETE CASCADE,
  CONSTRAINT fk_featured_story_admin FOREIGN KEY (created_by)
    REFERENCES admin_user (id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ---------------------------------------------------------------------------
-- Verify
-- ---------------------------------------------------------------------------

SELECT COUNT(*) AS admin_accounts FROM admin_user;

SELECT f.id, f.user_profile_id, p.name, f.sort_order, f.is_active, f.starts_at, f.ends_at
  FROM featured_story f
  JOIN user_profile p ON p.id = f.user_profile_id
 ORDER BY f.sort_order;

-- ---------------------------------------------------------------------------
-- Creating the first administrator
-- ---------------------------------------------------------------------------
--
-- Deliberately not seeded. A migration that ships a default admin password is
-- a migration that ends up in production with the default still set, and this
-- file is in git where anyone with the repository can read it.
--
-- Generate a bcrypt hash and insert it by hand, once, on each environment:
--
--   INSERT INTO admin_user (email, password_hash, name)
--   VALUES ('you@example.com', '<bcrypt-hash>', 'Your Name');

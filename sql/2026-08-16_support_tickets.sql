-- Member support tickets: a member raises a query from Contact Us in the app,
-- an admin answers and closes it from the admin portal, and the member can
-- reopen a closed ticket if the issue isn't actually resolved.
--
-- Two tables:
--
--   support_ticket           one query, its subject and current status
--   support_ticket_message   the back-and-forth thread on that ticket
--
-- A ticket is never deleted alongside its member on purpose - deleting the
-- member's account soft-deletes user_profile (deleted_at), it does not
-- CASCADE here, so a support history survives even a since-deleted account
-- for as long as an admin might need to refer back to it.
--
-- Safe to run twice.

CREATE TABLE IF NOT EXISTS support_ticket (
  id              INT AUTO_INCREMENT PRIMARY KEY,
  user_profile_id INT          NOT NULL,
  subject         VARCHAR(200) NOT NULL,

  -- OPEN or CLOSED. Kept a plain string rather than an enum column, same
  -- reasoning as user_profile.marital_status - validated in Java
  -- (TicketStatus), not baked into the schema.
  status          VARCHAR(20)  NOT NULL DEFAULT 'OPEN',

  created_at      DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,

  -- Bumped on every new message and on close/reopen, so the admin queue can
  -- sort "what changed most recently" without joining the message table.
  updated_at      DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

  KEY idx_support_ticket_user (user_profile_id),
  KEY idx_support_ticket_status_updated (status, updated_at),
  CONSTRAINT fk_support_ticket_profile FOREIGN KEY (user_profile_id)
    REFERENCES user_profile (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS support_ticket_message (
  id              INT AUTO_INCREMENT PRIMARY KEY,
  ticket_id       INT          NOT NULL,

  -- USER or ADMIN. Who is speaking in this row of the thread.
  sender_type     VARCHAR(10)  NOT NULL,

  -- Display name captured at send time, not looked up live - an admin's
  -- name shown against a message they wrote two years ago should stay what
  -- it was then, not silently change if that admin account is later renamed
  -- or deactivated.
  sender_name     VARCHAR(128) NULL,

  message         TEXT         NOT NULL,
  created_at      DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,

  KEY idx_support_ticket_message_ticket (ticket_id, created_at),
  CONSTRAINT fk_support_ticket_message_ticket FOREIGN KEY (ticket_id)
    REFERENCES support_ticket (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ---------------------------------------------------------------------------
-- Verify
-- ---------------------------------------------------------------------------

SELECT COUNT(*) AS support_tickets FROM support_ticket;
SELECT COUNT(*) AS support_ticket_messages FROM support_ticket_message;

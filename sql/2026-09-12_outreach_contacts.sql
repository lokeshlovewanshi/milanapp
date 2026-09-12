SET NAMES utf8mb4;
SET CHARACTER SET utf8mb4;

USE marriage_portal;

-- Outreach contacts directory for admin quick messaging (WhatsApp / SMS / Call)
CREATE TABLE IF NOT EXISTS outreach_contact (
  id            INT AUTO_INCREMENT PRIMARY KEY,
  name          VARCHAR(150) NOT NULL,
  phone_number  VARCHAR(25)  NOT NULL,
  email         VARCHAR(150) NULL,
  category      VARCHAR(50)  NOT NULL DEFAULT 'PROSPECT',
  notes         VARCHAR(500) NULL,
  created_at    DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at    DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

  KEY idx_contact_phone (phone_number),
  KEY idx_contact_name (name)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

SET NAMES utf8mb4;
SET CHARACTER SET utf8mb4;

-- Message templates for admin outreach (WhatsApp, Email, SMS)
-- Stored in DB with max 5000 chars per user requirements
--
-- Variables supported: {name}, {profileId}, {mobileNo}, {email}, {profileUrl}
--
-- Safe to run multiple times.

CREATE TABLE IF NOT EXISTS message_template (
  id            INT AUTO_INCREMENT PRIMARY KEY,
  title         VARCHAR(200) NOT NULL,
  template_type VARCHAR(50)  NOT NULL DEFAULT 'WHATSAPP',
  content       VARCHAR(5000) NOT NULL,
  variables     VARCHAR(255) DEFAULT '{name},{profileId},{mobileNo},{email},{profileUrl}',
  sort_order    INT NOT NULL DEFAULT 0,
  is_active     BOOLEAN NOT NULL DEFAULT TRUE,
  created_at    DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at    DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

  KEY idx_template_type (template_type),
  KEY idx_template_active (is_active)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Seed default templates if not already present
INSERT INTO message_template (id, title, template_type, content, variables, sort_order)
VALUES 
(
  1,
  'Profile Incomplete Reminder / प्रोफ़ाइल अधूरी है',
  'WHATSAPP',
  'Hi {name},\n\nGreetings from Gahoi Parinay Team! 🙏🌸\n\nWe noticed that your matrimonial registration (Profile ID: {profileId}) is still incomplete.\n\nA complete profile receives up to 5x more suitable proposals and faster responses from matching families in Gahoi Samaj! 💍✨\n\nTo help us find the most compatible matches for you, please take 2 minutes to complete your profile:\n📸 Upload 1-2 clear portrait photos\n🎂 Date, Time & Place of Birth (for Kundali Milan)\n🌿 Gotra & Aakna details\n🎓 Highest Education & Profession\n👨‍👩‍👧‍👦 Family background & Native place (मूल निवास)\n\n👉 Click here to complete your profile now:\n{profileUrl}\n(or login at https://www.gahoimarriage.in/login)\n\nIf you need any assistance in filling up your biodata, feel free to reply directly to this message. We are happy to help! 😊\n\nWarm regards,\nTeam Gahoi Parinay 🤝\nConnecting Gahoi Families Worldwide',
  '{name},{profileId},{mobileNo},{email},{profileUrl}',
  1
),
(
  2,
  'Profile Update Reminder / प्रोफ़ाइल अपडेट करें',
  'WHATSAPP',
  'Hi {name},\n\nGreetings from Gahoi Parinay Team! 🙏🌸\n\nWe hope you are doing well. This is a gentle reminder regarding your matrimonial profile (Profile ID: {profileId}).\n\nProfiles that are regularly updated with fresh photos, current career status, and location get top visibility and significantly higher interest from compatible families! ✨\n\n🌟 Quick steps to refresh your profile:\n📸 Add latest high-quality photos\n💼 Update your current job, designation & workplace\n📍 Verify your contact number and current address\n💫 Review your partner expectations\n\n👉 Click here to update your profile:\n{profileUrl}\n(or login at https://www.gahoimarriage.in/login)\n\nFor any queries or help, please feel free to message us back. Wishing you the very best in your partner search! 💐\n\nWarm regards,\nTeam Gahoi Parinay 🤝\nhttps://www.gahoimarriage.in',
  '{name},{profileId},{mobileNo},{email},{profileUrl}',
  2
),
(
  3,
  'Photo Upload Reminder / फ़ोटो अपलोड करें',
  'WHATSAPP',
  'Hi {name},\n\nGreetings from Gahoi Parinay Team! 🙏🌸\n\nWe noticed that your matrimonial profile ({profileId}) does not have a photo uploaded yet.\n\nProfiles with clear photos receive over 80% more views and faster contact requests from verified Gahoi families. 📸✨\n\nPlease take a moment to upload 1-2 recent, clear portrait photos:\n👉 Upload photos here:\nhttps://www.gahoimarriage.in/me\n\nLooking forward to helping you find your ideal match! 💐\n\nWarm regards,\nTeam Gahoi Parinay 🤝\nhttps://www.gahoimarriage.in',
  '{name},{profileId},{mobileNo},{email},{profileUrl}',
  3
),
(
  4,
  'Profile Verified / प्रोफ़ाइल सत्यापित हो गई है',
  'WHATSAPP',
  'Hi {name},\n\nGreetings from Gahoi Parinay Team! 🎉💐\n\nGreat news! Your matrimonial profile (Profile ID: {profileId}) has been successfully verified by our admin team. ✅\n\nYou can now:\n🔍 Explore 100% verified Gahoi Samaj profiles\n💌 Send and accept connection interests\n🪐 View Astro Kundali Gun Milan compatibility scores\n\n👉 Start discovering matches now:\nhttps://www.gahoimarriage.in/browse\n\nBest wishes for your journey ahead! ✨\n\nWarm regards,\nTeam Gahoi Parinay 🤝\nhttps://www.gahoimarriage.in',
  '{name},{profileId},{mobileNo},{email},{profileUrl}',
  4
)
ON DUPLICATE KEY UPDATE content = VALUES(content), title = VALUES(title);

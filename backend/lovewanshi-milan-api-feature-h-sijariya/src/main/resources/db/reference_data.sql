-- ===========================================================================
--  Reference data for profile fields.
--
--  Purpose: every dropdown in the app is currently a hardcoded array in
--  profile-setup.tsx. That means adding a state or a degree requires an app
--  release, and two screens can drift out of sync. These tables move the
--  options to the database, served over /api/v1/reference.
--
--  Run once against marriage_portal. Safe to re-run: inserts are idempotent
--  via INSERT IGNORE on natural keys.
-- ===========================================================================

SET NAMES utf8mb4;

-- ---------------------------------------------------------------------------
-- Generic option list. One table for every simple dropdown, keyed by category.
--
-- Why one table rather than one per field: these lists share identical shape
-- (code, label, order) and differ only in category. Twelve near-identical
-- tables would mean twelve repositories and twelve endpoints for no gain.
--
-- `code` is what gets stored on user_profile; `label` is display only, so
-- renaming a label never orphans existing profile data.
-- ---------------------------------------------------------------------------
DROP TABLE IF EXISTS lookup_option;
CREATE TABLE lookup_option (
    id          INT          NOT NULL AUTO_INCREMENT,
    category    VARCHAR(48)  NOT NULL,
    code        VARCHAR(64)  NOT NULL,
    label       VARCHAR(128) NOT NULL,
    sort_order  INT          NOT NULL DEFAULT 0,
    active      TINYINT(1)   NOT NULL DEFAULT 1,
    PRIMARY KEY (id),
    UNIQUE KEY uk_lookup (category, code),
    KEY idx_lookup_category (category, sort_order)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ---------------------------------------------------------------------------
-- States and cities are separate because city depends on state, and city
-- carries a tier used for search ranking.
-- ---------------------------------------------------------------------------
DROP TABLE IF EXISTS city;
DROP TABLE IF EXISTS state;

CREATE TABLE state (
    id        INT          NOT NULL AUTO_INCREMENT,
    code      VARCHAR(8)   NOT NULL,   -- ISO 3166-2:IN subdivision code
    name      VARCHAR(64)  NOT NULL,
    kind      ENUM('STATE','UT') NOT NULL DEFAULT 'STATE',
    PRIMARY KEY (id),
    UNIQUE KEY uk_state_code (code),
    UNIQUE KEY uk_state_name (name)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE city (
    id        INT          NOT NULL AUTO_INCREMENT,
    state_id  INT          NOT NULL,
    name      VARCHAR(64)  NOT NULL,
    -- 1 = metro, 2 = large non-metro, 3 = smaller district city.
    tier      TINYINT      NOT NULL DEFAULT 3,
    PRIMARY KEY (id),
    UNIQUE KEY uk_city (state_id, name),
    KEY idx_city_tier (tier),
    CONSTRAINT fk_city_state FOREIGN KEY (state_id) REFERENCES state(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;


-- Two values only, as specified.
INSERT IGNORE INTO lookup_option (category, code, label, sort_order) VALUES
  ('gender', 'MALE', 'Male', 0),
  ('gender', 'FEMALE', 'Female', 1);

INSERT IGNORE INTO lookup_option (category, code, label, sort_order) VALUES
  ('marital_status', 'NEVER_MARRIED', 'Never Married', 0),
  ('marital_status', 'DIVORCED', 'Divorced', 1),
  ('marital_status', 'WIDOWED', 'Widowed', 2),
  ('marital_status', 'AWAITING_DIVORCE', 'Awaiting Divorce', 3),
  ('marital_status', 'ANNULLED', 'Annulled', 4);

INSERT IGNORE INTO lookup_option (category, code, label, sort_order) VALUES
  ('profile_created_by', 'SELF', 'Self', 0),
  ('profile_created_by', 'PARENTS', 'Parents', 1),
  ('profile_created_by', 'SIBLING', 'Sibling', 2),
  ('profile_created_by', 'RELATIVE', 'Relative', 3),
  ('profile_created_by', 'FRIEND', 'Friend', 4);

INSERT IGNORE INTO lookup_option (category, code, label, sort_order) VALUES
  ('complexion', 'VERY_FAIR', 'Very Fair', 0),
  ('complexion', 'FAIR', 'Fair', 1),
  ('complexion', 'WHEATISH', 'Wheatish', 2),
  ('complexion', 'WHEATISH_BROWN', 'Wheatish Brown', 3),
  ('complexion', 'DARK', 'Dark', 4);

INSERT IGNORE INTO lookup_option (category, code, label, sort_order) VALUES
  ('diet', 'VEG', 'Vegetarian', 0),
  ('diet', 'NON_VEG', 'Non-Vegetarian', 1),
  ('diet', 'EGGETARIAN', 'Eggetarian', 2),
  ('diet', 'VEGAN', 'Vegan', 3),
  ('diet', 'JAIN', 'Jain Vegetarian', 4);

INSERT IGNORE INTO lookup_option (category, code, label, sort_order) VALUES
  ('blood_group', 'APLUS', 'A+', 0),
  ('blood_group', 'A_', 'A-', 1),
  ('blood_group', 'BPLUS', 'B+', 2),
  ('blood_group', 'B_', 'B-', 3),
  ('blood_group', 'OPLUS', 'O+', 4),
  ('blood_group', 'O_', 'O-', 5),
  ('blood_group', 'ABPLUS', 'AB+', 6),
  ('blood_group', 'AB_', 'AB-', 7);

INSERT IGNORE INTO lookup_option (category, code, label, sort_order) VALUES
  ('disability', 'NONE', 'None', 0),
  ('disability', 'PHYSICAL', 'Physically Challenged', 1),
  ('disability', 'OTHER', 'Other', 2);

INSERT IGNORE INTO lookup_option (category, code, label, sort_order) VALUES
  ('body_type', 'SLIM', 'Slim', 0),
  ('body_type', 'ATHLETIC', 'Athletic', 1),
  ('body_type', 'AVERAGE', 'Average', 2),
  ('body_type', 'HEAVY', 'Heavy', 3);

-- Stored as H_<inches> so range queries are simple integer maths.
INSERT IGNORE INTO lookup_option (category, code, label, sort_order) VALUES
  ('height', 'H_48', '4'' 0" (122 cm)', 0),
  ('height', 'H_49', '4'' 1" (124 cm)', 1),
  ('height', 'H_50', '4'' 2" (127 cm)', 2),
  ('height', 'H_51', '4'' 3" (130 cm)', 3),
  ('height', 'H_52', '4'' 4" (132 cm)', 4),
  ('height', 'H_53', '4'' 5" (135 cm)', 5),
  ('height', 'H_54', '4'' 6" (137 cm)', 6),
  ('height', 'H_55', '4'' 7" (140 cm)', 7),
  ('height', 'H_56', '4'' 8" (142 cm)', 8),
  ('height', 'H_57', '4'' 9" (145 cm)', 9),
  ('height', 'H_58', '4'' 10" (147 cm)', 10),
  ('height', 'H_59', '4'' 11" (150 cm)', 11),
  ('height', 'H_60', '5'' 0" (152 cm)', 12),
  ('height', 'H_61', '5'' 1" (155 cm)', 13),
  ('height', 'H_62', '5'' 2" (157 cm)', 14),
  ('height', 'H_63', '5'' 3" (160 cm)', 15),
  ('height', 'H_64', '5'' 4" (163 cm)', 16),
  ('height', 'H_65', '5'' 5" (165 cm)', 17),
  ('height', 'H_66', '5'' 6" (168 cm)', 18),
  ('height', 'H_67', '5'' 7" (170 cm)', 19),
  ('height', 'H_68', '5'' 8" (173 cm)', 20),
  ('height', 'H_69', '5'' 9" (175 cm)', 21),
  ('height', 'H_70', '5'' 10" (178 cm)', 22),
  ('height', 'H_71', '5'' 11" (180 cm)', 23),
  ('height', 'H_72', '6'' 0" (183 cm)', 24),
  ('height', 'H_73', '6'' 1" (185 cm)', 25),
  ('height', 'H_74', '6'' 2" (188 cm)', 26),
  ('height', 'H_75', '6'' 3" (190 cm)', 27),
  ('height', 'H_76', '6'' 4" (193 cm)', 28),
  ('height', 'H_77', '6'' 5" (196 cm)', 29),
  ('height', 'H_78', '6'' 6" (198 cm)', 30),
  ('height', 'H_79', '6'' 7" (201 cm)', 31),
  ('height', 'H_80', '6'' 8" (203 cm)', 32),
  ('height', 'H_81', '6'' 9" (206 cm)', 33),
  ('height', 'H_82', '6'' 10" (208 cm)', 34),
  ('height', 'H_83', '6'' 11" (211 cm)', 35),
  ('height', 'H_84', '7'' 0" (213 cm)', 36);

-- Bands, not free numbers - exact salary is sensitive and rarely honest.
INSERT IGNORE INTO lookup_option (category, code, label, sort_order) VALUES
  ('annual_income', 'INR_0_5', 'Up to ₹5 Lakh', 0),
  ('annual_income', 'INR_5_10', '₹5 - 10 Lakh', 1),
  ('annual_income', 'INR_10_15', '₹10 - 15 Lakh', 2),
  ('annual_income', 'INR_15_20', '₹15 - 20 Lakh', 3),
  ('annual_income', 'INR_20_25', '₹20 - 25 Lakh', 4),
  ('annual_income', 'INR_25_30', '₹25 - 30 Lakh', 5),
  ('annual_income', 'INR_30_40', '₹30 - 40 Lakh', 6),
  ('annual_income', 'INR_40_50', '₹40 - 50 Lakh', 7),
  ('annual_income', 'INR_50_75', '₹50 - 75 Lakh', 8),
  ('annual_income', 'INR_75_100', '₹75 Lakh - 1 Crore', 9),
  ('annual_income', 'INR_100_200', '₹1 - 2 Crore', 10),
  ('annual_income', 'INR_200_PLUS', '₹2 Crore and above', 11);
INSERT IGNORE INTO lookup_option (category, code, label, sort_order) VALUES
  ('education', 'BELOW_10', 'Below 10th', 0),
  ('education', 'SSC', '10th / SSC', 1),
  ('education', 'HSC', '12th / HSC', 2),
  ('education', 'DIPLOMA', 'Diploma', 3),
  ('education', 'ITI', 'ITI', 4),
  ('education', 'BA', 'B.A.', 5),
  ('education', 'BCOM', 'B.Com', 6),
  ('education', 'BSC', 'B.Sc', 7),
  ('education', 'BBA', 'BBA', 8),
  ('education', 'BCA', 'BCA', 9),
  ('education', 'BE_BTECH', 'B.E. / B.Tech', 10),
  ('education', 'BARCH', 'B.Arch', 11),
  ('education', 'MBBS', 'MBBS', 12),
  ('education', 'BDS', 'BDS', 13),
  ('education', 'BAMS', 'BAMS', 14),
  ('education', 'BHMS', 'BHMS', 15),
  ('education', 'BPHARM', 'B.Pharm', 16),
  ('education', 'BPT', 'BPT', 17),
  ('education', 'BSC_NURSING', 'B.Sc Nursing', 18),
  ('education', 'LLB', 'LL.B.', 19),
  ('education', 'BED', 'B.Ed', 20),
  ('education', 'BVSC', 'B.V.Sc', 21),
  ('education', 'MA', 'M.A.', 22),
  ('education', 'MCOM', 'M.Com', 23),
  ('education', 'MSC', 'M.Sc', 24),
  ('education', 'MBA', 'MBA', 25),
  ('education', 'MCA', 'MCA', 26),
  ('education', 'ME_MTECH', 'M.E. / M.Tech', 27),
  ('education', 'MARCH', 'M.Arch', 28),
  ('education', 'MD', 'MD', 29),
  ('education', 'MS', 'MS', 30),
  ('education', 'MDS', 'MDS', 31),
  ('education', 'MPHARM', 'M.Pharm', 32),
  ('education', 'LLM', 'LL.M.', 33),
  ('education', 'MED', 'M.Ed', 34),
  ('education', 'CA', 'CA - Chartered Accountant', 35),
  ('education', 'CS', 'CS - Company Secretary', 36),
  ('education', 'ICWA_CMA', 'ICWA / CMA', 37),
  ('education', 'CFA', 'CFA', 38),
  ('education', 'PHD', 'Ph.D.', 39),
  ('education', 'MPHIL', 'M.Phil', 40),
  ('education', 'OTHER', 'Other', 41);

INSERT IGNORE INTO lookup_option (category, code, label, sort_order) VALUES
  ('employed_in', 'GOVT', 'Government / PSU', 0),
  ('employed_in', 'PRIVATE', 'Private Company', 1),
  ('employed_in', 'BUSINESS', 'Business / Self Employed', 2),
  ('employed_in', 'DEFENCE', 'Defence', 3),
  ('employed_in', 'CIVIL_SERVICES', 'Civil Services', 4),
  ('employed_in', 'NGO', 'NGO / Social Work', 5),
  ('employed_in', 'NOT_WORKING', 'Not Working', 6),
  ('employed_in', 'STUDENT', 'Student', 7);

INSERT IGNORE INTO lookup_option (category, code, label, sort_order) VALUES
  ('profession', 'SOFTWARE_ENGINEER', 'Software Engineer', 0),
  ('profession', 'IT_CONSULTANT', 'IT / Software Consultant', 1),
  ('profession', 'DATA_SCIENTIST', 'Data Scientist / Analyst', 2),
  ('profession', 'HARDWARE_ENGINEER', 'Hardware / Network Engineer', 3),
  ('profession', 'CIVIL_ENGINEER', 'Civil Engineer', 4),
  ('profession', 'MECHANICAL_ENGINEER', 'Mechanical Engineer', 5),
  ('profession', 'ELECTRICAL_ENGINEER', 'Electrical Engineer', 6),
  ('profession', 'DOCTOR', 'Doctor / Physician', 7),
  ('profession', 'SURGEON', 'Surgeon', 8),
  ('profession', 'DENTIST', 'Dentist', 9),
  ('profession', 'AYURVEDIC_DOCTOR', 'Ayurvedic / Homeopathic Doctor', 10),
  ('profession', 'NURSE', 'Nurse', 11),
  ('profession', 'PHARMACIST', 'Pharmacist', 12),
  ('profession', 'PHYSIOTHERAPIST', 'Physiotherapist', 13),
  ('profession', 'CHARTERED_ACCOUNTANT', 'Chartered Accountant', 14),
  ('profession', 'COMPANY_SECRETARY', 'Company Secretary', 15),
  ('profession', 'BANKING', 'Banking Professional', 16),
  ('profession', 'FINANCE', 'Finance / Investment Professional', 17),
  ('profession', 'AUDITOR', 'Auditor / Accountant', 18),
  ('profession', 'LAWYER', 'Lawyer / Advocate', 19),
  ('profession', 'JUDGE', 'Judge / Judicial Services', 20),
  ('profession', 'IAS_IPS', 'IAS / IPS / IFS', 21),
  ('profession', 'GOVT_OFFICER', 'Government Officer', 22),
  ('profession', 'DEFENCE_OFFICER', 'Defence Services Officer', 23),
  ('profession', 'POLICE', 'Police Services', 24),
  ('profession', 'TEACHER', 'Teacher', 25),
  ('profession', 'PROFESSOR', 'Professor / Lecturer', 26),
  ('profession', 'RESEARCHER', 'Scientist / Researcher', 27),
  ('profession', 'ARCHITECT', 'Architect', 28),
  ('profession', 'INTERIOR_DESIGNER', 'Interior Designer', 29),
  ('profession', 'BUSINESSMAN', 'Business Owner / Entrepreneur', 30),
  ('profession', 'SHOPKEEPER', 'Shop / Retail Owner', 31),
  ('profession', 'AGRICULTURE', 'Agriculture / Farming', 32),
  ('profession', 'REAL_ESTATE', 'Real Estate', 33),
  ('profession', 'MARKETING', 'Sales / Marketing Professional', 34),
  ('profession', 'HR', 'Human Resources', 35),
  ('profession', 'OPERATIONS', 'Operations / Supply Chain', 36),
  ('profession', 'CONSULTANT', 'Management Consultant', 37),
  ('profession', 'JOURNALIST', 'Journalist / Media', 38),
  ('profession', 'DESIGNER', 'Graphic / UX Designer', 39),
  ('profession', 'ARTIST', 'Artist / Performer', 40),
  ('profession', 'PILOT', 'Pilot', 41),
  ('profession', 'MERCHANT_NAVY', 'Merchant Navy', 42),
  ('profession', 'HOSPITALITY', 'Hotel / Hospitality', 43),
  ('profession', 'CHEF', 'Chef', 44),
  ('profession', 'FITNESS', 'Fitness Trainer', 45),
  ('profession', 'STUDENT', 'Student', 46),
  ('profession', 'HOMEMAKER', 'Homemaker', 47),
  ('profession', 'NOT_WORKING', 'Not Working', 48),
  ('profession', 'OTHER', 'Other', 49);

INSERT IGNORE INTO lookup_option (category, code, label, sort_order) VALUES
  ('house_status', 'OWNED', 'Owned', 0),
  ('house_status', 'RENTED', 'Rented', 1),
  ('house_status', 'ANCESTRAL', 'Ancestral / Joint Family', 2),
  ('house_status', 'NONE', 'None', 3);

INSERT IGNORE INTO lookup_option (category, code, label, sort_order) VALUES
  ('car_status', 'OWNED', 'Owned', 0),
  ('car_status', 'NONE', 'None', 1);

INSERT IGNORE INTO lookup_option (category, code, label, sort_order) VALUES
  ('family_type', 'JOINT', 'Joint Family', 0),
  ('family_type', 'NUCLEAR', 'Nuclear Family', 1);

INSERT IGNORE INTO lookup_option (category, code, label, sort_order) VALUES
  ('family_status', 'MIDDLE', 'Middle Class', 0),
  ('family_status', 'UPPER_MIDDLE', 'Upper Middle Class', 1),
  ('family_status', 'RICH', 'Rich / Affluent', 2);

-- The 12 moon signs. A fixed canonical set - nothing to fetch or update.
INSERT IGNORE INTO lookup_option (category, code, label, sort_order) VALUES
  ('rashi', 'MESH', 'Mesh (Aries)', 0),
  ('rashi', 'VRISHABH', 'Vrishabh (Taurus)', 1),
  ('rashi', 'MITHUN', 'Mithun (Gemini)', 2),
  ('rashi', 'KARK', 'Kark (Cancer)', 3),
  ('rashi', 'SIMHA', 'Simha (Leo)', 4),
  ('rashi', 'KANYA', 'Kanya (Virgo)', 5),
  ('rashi', 'TULA', 'Tula (Libra)', 6),
  ('rashi', 'VRISHCHIK', 'Vrishchik (Scorpio)', 7),
  ('rashi', 'DHANU', 'Dhanu (Sagittarius)', 8),
  ('rashi', 'MAKAR', 'Makar (Capricorn)', 9),
  ('rashi', 'KUMBH', 'Kumbh (Aquarius)', 10),
  ('rashi', 'MEEN', 'Meen (Pisces)', 11);

-- The 27 lunar mansions, in order. Also fixed.
INSERT IGNORE INTO lookup_option (category, code, label, sort_order) VALUES
  ('nakshatra', 'ASHWINI', 'Ashwini', 0),
  ('nakshatra', 'BHARANI', 'Bharani', 1),
  ('nakshatra', 'KRITTIKA', 'Krittika', 2),
  ('nakshatra', 'ROHINI', 'Rohini', 3),
  ('nakshatra', 'MRIGASHIRA', 'Mrigashira', 4),
  ('nakshatra', 'ARDRA', 'Ardra', 5),
  ('nakshatra', 'PUNARVASU', 'Punarvasu', 6),
  ('nakshatra', 'PUSHYA', 'Pushya', 7),
  ('nakshatra', 'ASHLESHA', 'Ashlesha', 8),
  ('nakshatra', 'MAGHA', 'Magha', 9),
  ('nakshatra', 'PURVA_PHALGUNI', 'Purva Phalguni', 10),
  ('nakshatra', 'UTTARA_PHALGUNI', 'Uttara Phalguni', 11),
  ('nakshatra', 'HASTA', 'Hasta', 12),
  ('nakshatra', 'CHITRA', 'Chitra', 13),
  ('nakshatra', 'SWATI', 'Swati', 14),
  ('nakshatra', 'VISHAKHA', 'Vishakha', 15),
  ('nakshatra', 'ANURADHA', 'Anuradha', 16),
  ('nakshatra', 'JYESHTHA', 'Jyeshtha', 17),
  ('nakshatra', 'MULA', 'Mula', 18),
  ('nakshatra', 'PURVA_ASHADHA', 'Purva Ashadha', 19),
  ('nakshatra', 'UTTARA_ASHADHA', 'Uttara Ashadha', 20),
  ('nakshatra', 'SHRAVANA', 'Shravana', 21),
  ('nakshatra', 'DHANISHTA', 'Dhanishta', 22),
  ('nakshatra', 'SHATABHISHA', 'Shatabhisha', 23),
  ('nakshatra', 'PURVA_BHADRAPADA', 'Purva Bhadrapada', 24),
  ('nakshatra', 'UTTARA_BHADRAPADA', 'Uttara Bhadrapada', 25),
  ('nakshatra', 'REVATI', 'Revati', 26);

INSERT IGNORE INTO lookup_option (category, code, label, sort_order) VALUES
  ('manglik', 'NO', 'No', 0),
  ('manglik', 'YES', 'Yes', 1),
  ('manglik', 'ANSHIK', 'Anshik (Partial)', 2),
  ('manglik', 'DONT_KNOW', 'Don''t Know', 3);

INSERT IGNORE INTO lookup_option (category, code, label, sort_order) VALUES
  ('mother_tongue', 'HINDI', 'Hindi', 0),
  ('mother_tongue', 'BUNDELI', 'Bundeli', 1),
  ('mother_tongue', 'BAGHELI', 'Bagheli', 2),
  ('mother_tongue', 'MARATHI', 'Marathi', 3),
  ('mother_tongue', 'GUJARATI', 'Gujarati', 4),
  ('mother_tongue', 'RAJASTHANI', 'Rajasthani', 5),
  ('mother_tongue', 'MARWARI', 'Marwari', 6),
  ('mother_tongue', 'PUNJABI', 'Punjabi', 7),
  ('mother_tongue', 'BENGALI', 'Bengali', 8),
  ('mother_tongue', 'ODIA', 'Odia', 9),
  ('mother_tongue', 'ASSAMESE', 'Assamese', 10),
  ('mother_tongue', 'URDU', 'Urdu', 11),
  ('mother_tongue', 'TAMIL', 'Tamil', 12),
  ('mother_tongue', 'TELUGU', 'Telugu', 13),
  ('mother_tongue', 'KANNADA', 'Kannada', 14),
  ('mother_tongue', 'MALAYALAM', 'Malayalam', 15),
  ('mother_tongue', 'KONKANI', 'Konkani', 16),
  ('mother_tongue', 'TULU', 'Tulu', 17),
  ('mother_tongue', 'SINDHI', 'Sindhi', 18),
  ('mother_tongue', 'KASHMIRI', 'Kashmiri', 19),
  ('mother_tongue', 'NEPALI', 'Nepali', 20),
  ('mother_tongue', 'MAITHILI', 'Maithili', 21),
  ('mother_tongue', 'BHOJPURI', 'Bhojpuri', 22),
  ('mother_tongue', 'HARYANVI', 'Haryanvi', 23),
  ('mother_tongue', 'CHHATTISGARHI', 'Chhattisgarhi', 24),
  ('mother_tongue', 'ENGLISH', 'English', 25),
  ('mother_tongue', 'OTHER', 'Other', 26);
-- ---------------------------------------------------------------------------
-- Indian states and union territories (ISO 3166-2:IN codes).
-- ---------------------------------------------------------------------------
INSERT IGNORE INTO state (code, name, kind) VALUES
  ('AP', 'Andhra Pradesh', 'STATE'),
  ('AR', 'Arunachal Pradesh', 'STATE'),
  ('AS', 'Assam', 'STATE'),
  ('BR', 'Bihar', 'STATE'),
  ('CT', 'Chhattisgarh', 'STATE'),
  ('GA', 'Goa', 'STATE'),
  ('GJ', 'Gujarat', 'STATE'),
  ('HR', 'Haryana', 'STATE'),
  ('HP', 'Himachal Pradesh', 'STATE'),
  ('JH', 'Jharkhand', 'STATE'),
  ('KA', 'Karnataka', 'STATE'),
  ('KL', 'Kerala', 'STATE'),
  ('MP', 'Madhya Pradesh', 'STATE'),
  ('MH', 'Maharashtra', 'STATE'),
  ('MN', 'Manipur', 'STATE'),
  ('ML', 'Meghalaya', 'STATE'),
  ('MZ', 'Mizoram', 'STATE'),
  ('NL', 'Nagaland', 'STATE'),
  ('OR', 'Odisha', 'STATE'),
  ('PB', 'Punjab', 'STATE'),
  ('RJ', 'Rajasthan', 'STATE'),
  ('SK', 'Sikkim', 'STATE'),
  ('TN', 'Tamil Nadu', 'STATE'),
  ('TG', 'Telangana', 'STATE'),
  ('TR', 'Tripura', 'STATE'),
  ('UP', 'Uttar Pradesh', 'STATE'),
  ('UT', 'Uttarakhand', 'STATE'),
  ('WB', 'West Bengal', 'STATE'),
  ('AN', 'Andaman and Nicobar Islands', 'UT'),
  ('CH', 'Chandigarh', 'UT'),
  ('DH', 'Dadra and Nagar Haveli and Daman and Diu', 'UT'),
  ('DL', 'Delhi', 'UT'),
  ('JK', 'Jammu and Kashmir', 'UT'),
  ('LA', 'Ladakh', 'UT'),
  ('LD', 'Lakshadweep', 'UT'),
  ('PY', 'Puducherry', 'UT');

-- ---------------------------------------------------------------------------
-- Cities, by tier.
--   tier 1 - the eight metros
--   tier 2 - large non-metro cities
--   tier 3 - district-level cities, weighted toward MP/UP/Rajasthan where the
--            LOVEWANSHI community is concentrated
--
-- Not exhaustive by design. Add rows as you find gaps; nothing in the app
-- hardcodes this list, so inserts take effect immediately.
-- ---------------------------------------------------------------------------
INSERT IGNORE INTO city (state_id, name, tier) VALUES
  ((SELECT id FROM state WHERE code='DL'), 'New Delhi', 1),
  ((SELECT id FROM state WHERE code='MH'), 'Mumbai', 1),
  ((SELECT id FROM state WHERE code='MH'), 'Pune', 1),
  ((SELECT id FROM state WHERE code='MH'), 'Nagpur', 2),
  ((SELECT id FROM state WHERE code='MH'), 'Nashik', 2),
  ((SELECT id FROM state WHERE code='MH'), 'Aurangabad', 2),
  ((SELECT id FROM state WHERE code='MH'), 'Thane', 2),
  ((SELECT id FROM state WHERE code='MH'), 'Navi Mumbai', 2),
  ((SELECT id FROM state WHERE code='MH'), 'Solapur', 3),
  ((SELECT id FROM state WHERE code='MH'), 'Kolhapur', 3),
  ((SELECT id FROM state WHERE code='MH'), 'Amravati', 3),
  ((SELECT id FROM state WHERE code='MH'), 'Nanded', 3),
  ((SELECT id FROM state WHERE code='MH'), 'Sangli', 3),
  ((SELECT id FROM state WHERE code='MH'), 'Jalgaon', 3),
  ((SELECT id FROM state WHERE code='MH'), 'Akola', 3),
  ((SELECT id FROM state WHERE code='MH'), 'Latur', 3),
  ((SELECT id FROM state WHERE code='KA'), 'Bengaluru', 1),
  ((SELECT id FROM state WHERE code='KA'), 'Mysuru', 2),
  ((SELECT id FROM state WHERE code='KA'), 'Hubballi', 2),
  ((SELECT id FROM state WHERE code='KA'), 'Mangaluru', 2),
  ((SELECT id FROM state WHERE code='KA'), 'Belagavi', 3),
  ((SELECT id FROM state WHERE code='KA'), 'Davanagere', 3),
  ((SELECT id FROM state WHERE code='KA'), 'Ballari', 3),
  ((SELECT id FROM state WHERE code='KA'), 'Shivamogga', 3),
  ((SELECT id FROM state WHERE code='TN'), 'Chennai', 1),
  ((SELECT id FROM state WHERE code='TN'), 'Coimbatore', 2),
  ((SELECT id FROM state WHERE code='TN'), 'Madurai', 2),
  ((SELECT id FROM state WHERE code='TN'), 'Tiruchirappalli', 2),
  ((SELECT id FROM state WHERE code='TN'), 'Salem', 3),
  ((SELECT id FROM state WHERE code='TN'), 'Tirunelveli', 3),
  ((SELECT id FROM state WHERE code='TN'), 'Erode', 3),
  ((SELECT id FROM state WHERE code='TN'), 'Vellore', 3),
  ((SELECT id FROM state WHERE code='TN'), 'Thoothukudi', 3),
  ((SELECT id FROM state WHERE code='WB'), 'Kolkata', 1),
  ((SELECT id FROM state WHERE code='WB'), 'Howrah', 2),
  ((SELECT id FROM state WHERE code='WB'), 'Durgapur', 3),
  ((SELECT id FROM state WHERE code='WB'), 'Asansol', 3),
  ((SELECT id FROM state WHERE code='WB'), 'Siliguri', 3),
  ((SELECT id FROM state WHERE code='TG'), 'Hyderabad', 1),
  ((SELECT id FROM state WHERE code='TG'), 'Warangal', 2),
  ((SELECT id FROM state WHERE code='TG'), 'Nizamabad', 3),
  ((SELECT id FROM state WHERE code='TG'), 'Karimnagar', 3),
  ((SELECT id FROM state WHERE code='GJ'), 'Ahmedabad', 1),
  ((SELECT id FROM state WHERE code='GJ'), 'Surat', 2),
  ((SELECT id FROM state WHERE code='GJ'), 'Vadodara', 2),
  ((SELECT id FROM state WHERE code='GJ'), 'Rajkot', 2),
  ((SELECT id FROM state WHERE code='GJ'), 'Bhavnagar', 3),
  ((SELECT id FROM state WHERE code='GJ'), 'Jamnagar', 3),
  ((SELECT id FROM state WHERE code='GJ'), 'Gandhinagar', 3),
  ((SELECT id FROM state WHERE code='GJ'), 'Junagadh', 3),
  ((SELECT id FROM state WHERE code='GJ'), 'Anand', 3),
  ((SELECT id FROM state WHERE code='GJ'), 'Bharuch', 3),
  ((SELECT id FROM state WHERE code='UP'), 'Lucknow', 2),
  ((SELECT id FROM state WHERE code='UP'), 'Kanpur', 2),
  ((SELECT id FROM state WHERE code='UP'), 'Ghaziabad', 2),
  ((SELECT id FROM state WHERE code='UP'), 'Agra', 2),
  ((SELECT id FROM state WHERE code='UP'), 'Varanasi', 2),
  ((SELECT id FROM state WHERE code='UP'), 'Meerut', 2),
  ((SELECT id FROM state WHERE code='UP'), 'Prayagraj', 2),
  ((SELECT id FROM state WHERE code='UP'), 'Noida', 2),
  ((SELECT id FROM state WHERE code='UP'), 'Bareilly', 3),
  ((SELECT id FROM state WHERE code='UP'), 'Aligarh', 3),
  ((SELECT id FROM state WHERE code='UP'), 'Moradabad', 3),
  ((SELECT id FROM state WHERE code='UP'), 'Gorakhpur', 3),
  ((SELECT id FROM state WHERE code='UP'), 'Jhansi', 3),
  ((SELECT id FROM state WHERE code='UP'), 'Saharanpur', 3),
  ((SELECT id FROM state WHERE code='UP'), 'Mathura', 3),
  ((SELECT id FROM state WHERE code='UP'), 'Firozabad', 3),
  ((SELECT id FROM state WHERE code='UP'), 'Muzaffarnagar', 3),
  ((SELECT id FROM state WHERE code='UP'), 'Rampur', 3),
  ((SELECT id FROM state WHERE code='UP'), 'Lalitpur', 3),
  ((SELECT id FROM state WHERE code='UP'), 'Banda', 3),
  ((SELECT id FROM state WHERE code='UP'), 'Mahoba', 3),
  ((SELECT id FROM state WHERE code='UP'), 'Hamirpur', 3),
  ((SELECT id FROM state WHERE code='UP'), 'Jalaun', 3),
  ((SELECT id FROM state WHERE code='UP'), 'Orai', 3),
  ((SELECT id FROM state WHERE code='UP'), 'Etawah', 3),
  ((SELECT id FROM state WHERE code='UP'), 'Mainpuri', 3),
  ((SELECT id FROM state WHERE code='UP'), 'Farrukhabad', 3),
  ((SELECT id FROM state WHERE code='UP'), 'Ayodhya', 3),
  ((SELECT id FROM state WHERE code='MP'), 'Indore', 2),
  ((SELECT id FROM state WHERE code='MP'), 'Bhopal', 2),
  ((SELECT id FROM state WHERE code='MP'), 'Jabalpur', 2),
  ((SELECT id FROM state WHERE code='MP'), 'Gwalior', 2),
  ((SELECT id FROM state WHERE code='MP'), 'Ujjain', 3),
  ((SELECT id FROM state WHERE code='MP'), 'Sagar', 3),
  ((SELECT id FROM state WHERE code='MP'), 'Satna', 3),
  ((SELECT id FROM state WHERE code='MP'), 'Rewa', 3),
  ((SELECT id FROM state WHERE code='MP'), 'Ratlam', 3),
  ((SELECT id FROM state WHERE code='MP'), 'Dewas', 3),
  ((SELECT id FROM state WHERE code='MP'), 'Chhatarpur', 3),
  ((SELECT id FROM state WHERE code='MP'), 'Tikamgarh', 3),
  ((SELECT id FROM state WHERE code='MP'), 'Damoh', 3),
  ((SELECT id FROM state WHERE code='MP'), 'Panna', 3),
  ((SELECT id FROM state WHERE code='MP'), 'Katni', 3),
  ((SELECT id FROM state WHERE code='MP'), 'Vidisha', 3),
  ((SELECT id FROM state WHERE code='MP'), 'Shivpuri', 3),
  ((SELECT id FROM state WHERE code='MP'), 'Guna', 3),
  ((SELECT id FROM state WHERE code='MP'), 'Chhindwara', 3),
  ((SELECT id FROM state WHERE code='MP'), 'Khandwa', 3),
  ((SELECT id FROM state WHERE code='MP'), 'Burhanpur', 3),
  ((SELECT id FROM state WHERE code='MP'), 'Morena', 3),
  ((SELECT id FROM state WHERE code='MP'), 'Bhind', 3),
  ((SELECT id FROM state WHERE code='MP'), 'Datia', 3),
  ((SELECT id FROM state WHERE code='MP'), 'Niwari', 3),
  ((SELECT id FROM state WHERE code='MP'), 'Singrauli', 3),
  ((SELECT id FROM state WHERE code='MP'), 'Seoni', 3),
  ((SELECT id FROM state WHERE code='MP'), 'Mandsaur', 3),
  ((SELECT id FROM state WHERE code='MP'), 'Neemuch', 3),
  ((SELECT id FROM state WHERE code='MP'), 'Shahdol', 3),
  ((SELECT id FROM state WHERE code='RJ'), 'Jaipur', 2),
  ((SELECT id FROM state WHERE code='RJ'), 'Jodhpur', 2),
  ((SELECT id FROM state WHERE code='RJ'), 'Kota', 2),
  ((SELECT id FROM state WHERE code='RJ'), 'Udaipur', 2),
  ((SELECT id FROM state WHERE code='RJ'), 'Ajmer', 3),
  ((SELECT id FROM state WHERE code='RJ'), 'Bikaner', 3),
  ((SELECT id FROM state WHERE code='RJ'), 'Bhilwara', 3),
  ((SELECT id FROM state WHERE code='RJ'), 'Alwar', 3),
  ((SELECT id FROM state WHERE code='RJ'), 'Sikar', 3),
  ((SELECT id FROM state WHERE code='RJ'), 'Pali', 3),
  ((SELECT id FROM state WHERE code='RJ'), 'Bharatpur', 3),
  ((SELECT id FROM state WHERE code='RJ'), 'Sri Ganganagar', 3),
  ((SELECT id FROM state WHERE code='RJ'), 'Jhunjhunu', 3),
  ((SELECT id FROM state WHERE code='RJ'), 'Chittorgarh', 3),
  ((SELECT id FROM state WHERE code='HR'), 'Gurugram', 2),
  ((SELECT id FROM state WHERE code='HR'), 'Faridabad', 2),
  ((SELECT id FROM state WHERE code='HR'), 'Panipat', 3),
  ((SELECT id FROM state WHERE code='HR'), 'Ambala', 3),
  ((SELECT id FROM state WHERE code='HR'), 'Hisar', 3),
  ((SELECT id FROM state WHERE code='HR'), 'Karnal', 3),
  ((SELECT id FROM state WHERE code='HR'), 'Rohtak', 3),
  ((SELECT id FROM state WHERE code='HR'), 'Sonipat', 3),
  ((SELECT id FROM state WHERE code='HR'), 'Yamunanagar', 3),
  ((SELECT id FROM state WHERE code='PB'), 'Ludhiana', 2),
  ((SELECT id FROM state WHERE code='PB'), 'Amritsar', 2),
  ((SELECT id FROM state WHERE code='PB'), 'Jalandhar', 2),
  ((SELECT id FROM state WHERE code='PB'), 'Patiala', 3),
  ((SELECT id FROM state WHERE code='PB'), 'Bathinda', 3),
  ((SELECT id FROM state WHERE code='PB'), 'Mohali', 3),
  ((SELECT id FROM state WHERE code='BR'), 'Patna', 2),
  ((SELECT id FROM state WHERE code='BR'), 'Gaya', 3),
  ((SELECT id FROM state WHERE code='BR'), 'Bhagalpur', 3),
  ((SELECT id FROM state WHERE code='BR'), 'Muzaffarpur', 3),
  ((SELECT id FROM state WHERE code='BR'), 'Darbhanga', 3),
  ((SELECT id FROM state WHERE code='JH'), 'Ranchi', 2),
  ((SELECT id FROM state WHERE code='JH'), 'Jamshedpur', 2),
  ((SELECT id FROM state WHERE code='JH'), 'Dhanbad', 3),
  ((SELECT id FROM state WHERE code='JH'), 'Bokaro', 3),
  ((SELECT id FROM state WHERE code='CT'), 'Raipur', 2),
  ((SELECT id FROM state WHERE code='CT'), 'Bhilai', 3),
  ((SELECT id FROM state WHERE code='CT'), 'Bilaspur', 3),
  ((SELECT id FROM state WHERE code='CT'), 'Korba', 3),
  ((SELECT id FROM state WHERE code='CT'), 'Durg', 3),
  ((SELECT id FROM state WHERE code='OR'), 'Bhubaneswar', 2),
  ((SELECT id FROM state WHERE code='OR'), 'Cuttack', 3),
  ((SELECT id FROM state WHERE code='OR'), 'Rourkela', 3),
  ((SELECT id FROM state WHERE code='OR'), 'Berhampur', 3),
  ((SELECT id FROM state WHERE code='KL'), 'Kochi', 2),
  ((SELECT id FROM state WHERE code='KL'), 'Thiruvananthapuram', 2),
  ((SELECT id FROM state WHERE code='KL'), 'Kozhikode', 2),
  ((SELECT id FROM state WHERE code='KL'), 'Thrissur', 3),
  ((SELECT id FROM state WHERE code='KL'), 'Kollam', 3),
  ((SELECT id FROM state WHERE code='AP'), 'Visakhapatnam', 2),
  ((SELECT id FROM state WHERE code='AP'), 'Vijayawada', 2),
  ((SELECT id FROM state WHERE code='AP'), 'Guntur', 3),
  ((SELECT id FROM state WHERE code='AP'), 'Nellore', 3),
  ((SELECT id FROM state WHERE code='AP'), 'Tirupati', 3),
  ((SELECT id FROM state WHERE code='AP'), 'Rajahmundry', 3),
  ((SELECT id FROM state WHERE code='UT'), 'Dehradun', 2),
  ((SELECT id FROM state WHERE code='UT'), 'Haridwar', 3),
  ((SELECT id FROM state WHERE code='UT'), 'Roorkee', 3),
  ((SELECT id FROM state WHERE code='UT'), 'Haldwani', 3),
  ((SELECT id FROM state WHERE code='UT'), 'Rishikesh', 3),
  ((SELECT id FROM state WHERE code='HP'), 'Shimla', 3),
  ((SELECT id FROM state WHERE code='HP'), 'Solan', 3),
  ((SELECT id FROM state WHERE code='HP'), 'Dharamshala', 3),
  ((SELECT id FROM state WHERE code='HP'), 'Mandi', 3),
  ((SELECT id FROM state WHERE code='AS'), 'Guwahati', 2),
  ((SELECT id FROM state WHERE code='AS'), 'Silchar', 3),
  ((SELECT id FROM state WHERE code='AS'), 'Dibrugarh', 3),
  ((SELECT id FROM state WHERE code='AS'), 'Jorhat', 3),
  ((SELECT id FROM state WHERE code='GA'), 'Panaji', 3),
  ((SELECT id FROM state WHERE code='GA'), 'Margao', 3),
  ((SELECT id FROM state WHERE code='GA'), 'Vasco da Gama', 3),
  ((SELECT id FROM state WHERE code='JK'), 'Srinagar', 2),
  ((SELECT id FROM state WHERE code='JK'), 'Jammu', 2),
  ((SELECT id FROM state WHERE code='CH'), 'Chandigarh', 2),
  ((SELECT id FROM state WHERE code='PY'), 'Puducherry', 3),
  ((SELECT id FROM state WHERE code='TR'), 'Agartala', 3),
  ((SELECT id FROM state WHERE code='ML'), 'Shillong', 3),
  ((SELECT id FROM state WHERE code='MN'), 'Imphal', 3),
  ((SELECT id FROM state WHERE code='NL'), 'Kohima', 3),
  ((SELECT id FROM state WHERE code='AR'), 'Itanagar', 3),
  ((SELECT id FROM state WHERE code='MZ'), 'Aizawl', 3),
  ((SELECT id FROM state WHERE code='SK'), 'Gangtok', 3),
  ((SELECT id FROM state WHERE code='LA'), 'Leh', 3),
  ((SELECT id FROM state WHERE code='AN'), 'Port Blair', 3),
  ((SELECT id FROM state WHERE code='LD'), 'Kavaratti', 3),
  ((SELECT id FROM state WHERE code='DH'), 'Daman', 3),
  ((SELECT id FROM state WHERE code='DH'), 'Silvassa', 3);

-- 36 states/UTs, 200 cities seeded.

-- ---------------------------------------------------------------------------
-- Profile completion score.
--
-- Stored rather than computed per request: it is shown on the profile header
-- and in listings, so recomputing it on every read would mean re-reading every
-- column of every profile just to render a percentage.
--
-- Recalculated by the backend whenever a profile section is saved.
-- ---------------------------------------------------------------------------
ALTER TABLE user_profile
    ADD COLUMN profile_completion TINYINT NOT NULL DEFAULT 0
        COMMENT '0-100, weighted score - see ProfileCompletionCalculator',
    ADD COLUMN profile_completion_updated_at DATETIME NULL;

-- Weights live in the database so the scoring rules can be tuned without a
-- release. Only fields that genuinely affect match quality are scored -
-- padding the list with trivia would let a thin profile read as complete.
DROP TABLE IF EXISTS profile_completion_weight;
CREATE TABLE profile_completion_weight (
    field_name  VARCHAR(64) NOT NULL,
    weight      TINYINT     NOT NULL,
    section     VARCHAR(32) NOT NULL,
    PRIMARY KEY (field_name)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

INSERT IGNORE INTO profile_completion_weight (field_name, weight, section) VALUES
  ('name',              6, 'BASIC'),
  ('gender',            4, 'BASIC'),
  ('dateOfBirth',       6, 'BASIC'),
  ('height',            4, 'BASIC'),
  ('maritalStatus',     4, 'BASIC'),
  ('diet',              2, 'BASIC'),
  ('complexion',        2, 'BASIC'),
  ('motherTongue',      2, 'BASIC'),
  ('mobileNumber',      5, 'CONTACT'),
  ('email',             3, 'CONTACT'),
  ('city',              4, 'CONTACT'),
  ('state',             3, 'CONTACT'),
  ('presentAddress',    2, 'CONTACT'),
  ('education',         6, 'EDUCATION'),
  ('profession',        6, 'EDUCATION'),
  ('annualIncome',      5, 'EDUCATION'),
  ('employedIn',        3, 'EDUCATION'),
  ('organization',      2, 'EDUCATION'),
  ('gotra',             7, 'RELIGION'),
  -- Must be the Java field name on UserProfile, not the lookup_option category.
  -- The dropdown is called 'rashi'; the entity field it writes to is 'zodiac'.
  ('zodiac',            2, 'RELIGION'),
  ('nakshatra',         2, 'RELIGION'),
  ('manglik',           2, 'RELIGION'),
  ('fathersName',       3, 'FAMILY'),
  ('mothersName',       3, 'FAMILY'),
  ('fathersOccupation', 2, 'FAMILY'),
  ('mothersOccupation', 2, 'FAMILY'),
  ('aboutMyself',       5, 'ABOUT'),
  ('partnerPreferences',3, 'ABOUT');
-- Weights total 100.

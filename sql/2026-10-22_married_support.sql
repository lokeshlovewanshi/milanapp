-- Adds MARRIED to lookup_option so married users can be registered and filtered
INSERT IGNORE INTO lookup_option (category, code, label, sort_order) VALUES
  ('marital_status', 'MARRIED', 'Married', 1);

-- Verify
SELECT * FROM lookup_option WHERE category = 'marital_status' ORDER BY sort_order ASC;

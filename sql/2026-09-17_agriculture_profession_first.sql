-- Run once to put Agriculture / Farming at the top of the shared profession lookup.
-- This updates installations that already ran reference_data.sql.
UPDATE lookup_option
SET sort_order = sort_order + 1
WHERE category = 'profession'
  AND code <> 'AGRICULTURE';

UPDATE lookup_option
SET label = 'Agriculture / Farming', sort_order = 0, active = TRUE
WHERE category = 'profession'
  AND code = 'AGRICULTURE';

-- Fix: the profile completion weight row named a field that does not exist.
--
-- profile_completion_weight.field_name is resolved by reflection against the
-- Java fields on UserProfile (see ProfileCompletionCalculator#isFilled). The
-- row said 'rashi', which is the lookup_option category for the dropdown; the
-- entity field that dropdown actually writes to is 'zodiac'.
--
-- Effect of the bug: the 2 points were counted in the denominator but could
-- never be earned, so no profile could score above 98%, and the backend logged
-- "profile_completion_weight references unknown field 'rashi'" on every save.
--
-- Safe to re-run. The DELETE clears a stale 'zodiac' row so the rename cannot
-- collide with the primary key on field_name.

DELETE FROM profile_completion_weight WHERE field_name = 'zodiac';
UPDATE profile_completion_weight SET field_name = 'zodiac' WHERE field_name = 'rashi';

-- Stored scores are recalculated on the next profile save, so existing rows may
-- read up to 2 points low until then. Nothing needs backfilling.

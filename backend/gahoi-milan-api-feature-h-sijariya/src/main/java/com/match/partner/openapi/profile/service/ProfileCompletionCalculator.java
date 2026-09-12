package com.match.partner.openapi.profile.service;

import com.match.partner.openapi.profile.model.CompletionResult;
import com.match.partner.openapi.profile.model.ProfileCompletionWeight;
import com.match.partner.openapi.profile.repository.ProfileCompletionWeightRepository;
import com.match.partner.openapi.user.model.dao.UserProfile;
import lombok.RequiredArgsConstructor;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;

import java.lang.reflect.Field;
import java.util.*;

/**
 * Scores how complete a profile is, 0-100.
 *
 * Weights come from profile_completion_weight and name Java fields on
 * UserProfile, so scoring is driven by data rather than a hardcoded if-chain -
 * adding a field to the score is an INSERT, not a code change.
 *
 * Reflection is a deliberate trade here: the alternative is 29 null checks that
 * drift out of sync with the weights table the moment anyone edits it.
 */
@Service
@RequiredArgsConstructor
public class ProfileCompletionCalculator {

    private static final Logger log = LoggerFactory.getLogger(ProfileCompletionCalculator.class);

    private final ProfileCompletionWeightRepository weightRepository;

    /** Cached because it is read on every profile save and effectively never changes. */
    private volatile List<ProfileCompletionWeight> cachedWeights;

    private List<ProfileCompletionWeight> weights() {
        List<ProfileCompletionWeight> local = cachedWeights;
        if (local == null) {
            local = weightRepository.findAll();
            cachedWeights = local;
        }
        return local;
    }

    /** Call after changing the weights table without a restart. */
    public void invalidateCache() {
        cachedWeights = null;
    }

    public CompletionResult calculate(UserProfile profile) {
        List<ProfileCompletionWeight> all = weights();
        if (all.isEmpty()) {
            log.warn("profile_completion_weight is empty - scoring every profile 0. "
                    + "Did reference_data.sql run?");
            return new CompletionResult(0, Map.of(), List.of());
        }

        int earned = 0;
        int total = 0;

        Map<String, Integer> sectionEarned = new LinkedHashMap<>();
        Map<String, Integer> sectionTotal = new LinkedHashMap<>();
        List<ProfileCompletionWeight> missing = new ArrayList<>();

        for (ProfileCompletionWeight w : all) {
            int weight = w.getWeight() == null ? 0 : w.getWeight();
            total += weight;
            sectionTotal.merge(w.getSection(), weight, Integer::sum);

            if (isFilled(profile, w.getFieldName())) {
                earned += weight;
                sectionEarned.merge(w.getSection(), weight, Integer::sum);
            } else {
                missing.add(w);
            }
        }

        Map<String, Integer> sections = new LinkedHashMap<>();
        sectionTotal.forEach((section, sectionMax) -> {
            int got = sectionEarned.getOrDefault(section, 0);
            sections.put(section, sectionMax == 0 ? 0 : Math.round(got * 100f / sectionMax));
        });

        // Heaviest gaps first so the UI can prompt for what actually moves the number.
        missing.sort(Comparator.comparingInt(
                (ProfileCompletionWeight w) -> w.getWeight() == null ? 0 : w.getWeight()).reversed());

        int score = total == 0 ? 0 : Math.round(earned * 100f / total);
        return new CompletionResult(
                score,
                sections,
                missing.stream().map(ProfileCompletionWeight::getFieldName).toList()
        );
    }

    /**
     * Recalculate and write the score onto the entity.
     *
     * The caller is responsible for saving - this runs inside the same
     * transaction as the profile update so the score can never disagree with the
     * data it describes.
     */
    public int apply(UserProfile profile) {
        int score = calculate(profile).getScore();
        profile.setProfileCompletion(score);
        profile.setProfileCompletionUpdatedAt(java.time.LocalDateTime.now());
        return score;
    }

    /**
     * A field counts as filled when it holds real content.
     *
     * Blank strings, zeroes and the placeholder values the old forms wrote
     * ("N/A", "Not specified", "Doesn't Matter") are treated as empty - counting
     * them would let an untouched profile score as complete.
     */
    private boolean isFilled(UserProfile profile, String fieldName) {
        try {
            Field field = UserProfile.class.getDeclaredField(fieldName);
            field.setAccessible(true);
            Object value = field.get(profile);

            if (value == null) return false;

            if (value instanceof String s) {
                String trimmed = s.trim();
                if (trimmed.isEmpty()) return false;
                return !PLACEHOLDERS.contains(trimmed.toLowerCase());
            }

            if (value instanceof Number n) {
                return n.doubleValue() != 0d;
            }

            return true;
        } catch (NoSuchFieldException e) {
            // A weight row naming a field that no longer exists. Log once rather
            // than throwing - a stale row must not break saving a profile.
            log.warn("profile_completion_weight references unknown field '{}'", fieldName);
            return false;
        } catch (IllegalAccessException e) {
            log.warn("Could not read field '{}': {}", fieldName, e.getMessage());
            return false;
        }
    }

    private static final Set<String> PLACEHOLDERS = Set.of(
            "n/a", "na", "not specified", "none", "-", "--",
            "doesn't matter", "doesnt matter", "null", "undefined"
    );
}

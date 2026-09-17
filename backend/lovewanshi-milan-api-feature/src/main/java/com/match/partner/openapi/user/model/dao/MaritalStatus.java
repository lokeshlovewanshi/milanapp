package com.match.partner.openapi.user.model.dao;

import com.match.partner.common.configuration.ClientException;
import org.springframework.http.HttpStatus;

/**
 * The valid lookup codes for UserProfile.maritalStatus - kept a plain String
 * column (see reference_data.sql, table lookup_option, category
 * 'marital_status') rather than a JPA @Enumerated column, since the
 * category's codes are meant to stay admin-editable data, not a fixed set
 * baked into the schema. This enum exists purely to validate a write against
 * that same set of codes before it reaches the database.
 *
 * Added after a real bug: an old onboarding screen wrote the display label
 * ("Never Married") instead of the code ("NEVER_MARRIED") with nothing to
 * catch it, and the mismatch silently broke marital-status filtering for
 * every profile written through it (see sql/2026-08-16_marital_status_backfill.sql
 * for the cleanup). Validating here is what stops it from happening again.
 */
public enum MaritalStatus {
    NEVER_MARRIED,
    DIVORCED,
    WIDOWED,
    AWAITING_DIVORCE,
    ANNULLED;

    /** @throws ClientException 400 if value isn't one of the codes above (case-insensitive). */
    public static void validate(String value) {
        if (value == null) {
            return;
        }
        for (MaritalStatus status : values()) {
            if (status.name().equalsIgnoreCase(value)) {
                return;
            }
        }
        throw new ClientException(HttpStatus.BAD_REQUEST,
                "Unknown maritalStatus '" + value + "' - expected one of "
                        + java.util.Arrays.toString(values()));
    }
}

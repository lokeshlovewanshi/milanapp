package com.match.partner.openapi.profile.model;

import jakarta.persistence.*;
import lombok.Data;

/**
 * How much each field contributes to the completion percentage.
 *
 * Kept in the database rather than as constants so the definition of a
 * "complete" profile can be tuned without shipping a release.
 */
@Entity
@Table(name = "profile_completion_weight")
@Data
public class ProfileCompletionWeight {

    /** Java field name on UserProfile, e.g. "dateOfBirth". */
    @Id
    @Column(name = "field_name", length = 64)
    private String fieldName;

    @Column(nullable = false)
    private Integer weight;

    /** BASIC, CONTACT, EDUCATION, RELIGION, FAMILY, ABOUT. */
    @Column(nullable = false, length = 32)
    private String section;
}

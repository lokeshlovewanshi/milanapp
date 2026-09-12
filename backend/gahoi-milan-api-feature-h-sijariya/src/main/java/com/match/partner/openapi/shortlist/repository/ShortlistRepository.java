package com.match.partner.openapi.shortlist.repository;

import com.match.partner.openapi.shortlist.model.dao.Shortlist;
import com.match.partner.openapi.shortlist.model.dao.ShortlistId;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;

public interface ShortlistRepository extends JpaRepository<Shortlist, ShortlistId> {

    /**
     * Profiles this user shortlisted, most recently added first - excluding
     * ones now soft-deleted, self-hidden, or missing basic details. Same
     * visibility rule as
     * {@link com.match.partner.openapi.user.repository.UserProfileRepository#findByIdNot},
     * repeated for the same reason: a shortlisted profile is still a listing
     * of someone else's profile, and that person may have deleted or hidden
     * it since being added.
     */
    @Query("""
            SELECT s FROM Shortlist s
            WHERE s.id.profileId = :profileId
              AND s.shortlistedProfile.deletedAt IS NULL
              AND s.shortlistedProfile.hidden = false
              AND s.shortlistedProfile.blocked = false
              AND s.shortlistedProfile.name IS NOT NULL AND TRIM(s.shortlistedProfile.name) <> ''
              AND s.shortlistedProfile.gender IS NOT NULL AND TRIM(s.shortlistedProfile.gender) <> ''
              AND s.shortlistedProfile.dateOfBirth IS NOT NULL
              AND s.shortlistedProfile.maritalStatus IS NOT NULL AND TRIM(s.shortlistedProfile.maritalStatus) <> ''
              AND s.shortlistedProfile.mobileNumber IS NOT NULL AND TRIM(s.shortlistedProfile.mobileNumber) <> ''
            ORDER BY s.shortlistedAt DESC
            """)
    List<Shortlist> findByProfileIdOrderByShortlistedAtDesc(@Param("profileId") Integer profileId);
}

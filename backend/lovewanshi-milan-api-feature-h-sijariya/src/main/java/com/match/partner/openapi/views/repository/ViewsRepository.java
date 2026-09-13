package com.match.partner.openapi.views.repository;



import com.match.partner.openapi.views.model.dao.Views;
import com.match.partner.openapi.views.model.dao.ViewsId;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;

public interface ViewsRepository extends JpaRepository<Views, ViewsId> {

    long countByIdProfileId(Integer profileId);

    /**
     * Who viewed this profile, most recent first - excluding viewers who are
     * soft-deleted, self-hidden, or missing the basic fields that make a
     * profile mean anything to a stranger. Same visibility rule and the same
     * reason it's repeated rather than shared as
     * {@link com.match.partner.openapi.user.repository.UserProfileRepository#findByIdNot}:
     * "who viewed me" is still a listing of other people's profiles to this
     * user, and the rule that keeps them out of browse has to keep them out
     * here too, or deleting/hiding your account stops meaning what it says.
     */
    @Query("""
            SELECT v FROM Views v
            WHERE v.id.profileId = :profileId
              AND v.viewedBy.deletedAt IS NULL
              AND v.viewedBy.hidden = false
              AND v.viewedBy.blocked = false
              AND v.viewedBy.name IS NOT NULL AND TRIM(v.viewedBy.name) <> ''
              AND v.viewedBy.gender IS NOT NULL AND TRIM(v.viewedBy.gender) <> ''
              AND v.viewedBy.dateOfBirth IS NOT NULL
              AND v.viewedBy.maritalStatus IS NOT NULL AND TRIM(v.viewedBy.maritalStatus) <> ''
              AND v.viewedBy.mobileNumber IS NOT NULL AND TRIM(v.viewedBy.mobileNumber) <> ''
            ORDER BY v.viewedAt DESC
            """)
    List<Views> findByIdProfileIdOrderByViewedAtDesc(@Param("profileId") Integer profileId);
}

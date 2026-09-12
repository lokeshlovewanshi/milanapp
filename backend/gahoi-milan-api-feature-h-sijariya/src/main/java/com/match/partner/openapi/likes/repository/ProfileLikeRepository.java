package com.match.partner.openapi.likes.repository;

import com.match.partner.openapi.likes.model.ProfileLike;
import com.match.partner.openapi.likes.model.ProfileLikeId;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import java.util.List;

public interface ProfileLikeRepository extends JpaRepository<ProfileLike, ProfileLikeId> {

    /**
     * Interests you sent, newest first - excluding profiles now soft-deleted,
     * self-hidden, or missing basic details. Same visibility rule as
     * {@link com.match.partner.openapi.user.repository.UserProfileRepository#findByIdNot},
     * repeated for the same reason: this is still a listing of someone
     * else's profile, sent before they may have deleted or hidden it.
     *
     * Ordering is baked into the query rather than sorted in the service,
     * because both call sites want the same order and only one of them
     * remembered to sort.
     */
    @Query("""
            SELECT pl FROM ProfileLike pl
            WHERE pl.id.likerId = :likerId
              AND pl.likedProfile.deletedAt IS NULL
              AND pl.likedProfile.hidden = false
              AND pl.likedProfile.blocked = false
              AND pl.likedProfile.name IS NOT NULL AND TRIM(pl.likedProfile.name) <> ''
              AND pl.likedProfile.gender IS NOT NULL AND TRIM(pl.likedProfile.gender) <> ''
              AND pl.likedProfile.dateOfBirth IS NOT NULL
              AND pl.likedProfile.maritalStatus IS NOT NULL AND TRIM(pl.likedProfile.maritalStatus) <> ''
              AND pl.likedProfile.mobileNumber IS NOT NULL AND TRIM(pl.likedProfile.mobileNumber) <> ''
            ORDER BY pl.likedAt DESC
            """)
    List<ProfileLike> findByIdLikerIdOrderByLikedAtDesc(@Param("likerId") int likerId);

    /** Interests you received, newest first - same visibility rule, applied to the liker. */
    @Query("""
            SELECT pl FROM ProfileLike pl
            WHERE pl.id.likedProfileId = :likedProfileId
              AND pl.liker.deletedAt IS NULL
              AND pl.liker.hidden = false
              AND pl.liker.blocked = false
              AND pl.liker.name IS NOT NULL AND TRIM(pl.liker.name) <> ''
              AND pl.liker.gender IS NOT NULL AND TRIM(pl.liker.gender) <> ''
              AND pl.liker.dateOfBirth IS NOT NULL
              AND pl.liker.maritalStatus IS NOT NULL AND TRIM(pl.liker.maritalStatus) <> ''
              AND pl.liker.mobileNumber IS NOT NULL AND TRIM(pl.liker.mobileNumber) <> ''
            ORDER BY pl.likedAt DESC
            """)
    List<ProfileLike> findByIdLikedProfileIdOrderByLikedAtDesc(@Param("likedProfileId") int likedProfileId);

    boolean existsByIdLikerIdAndIdLikedProfileId(int likerId, int likedProfileId);

    long countByIdLikedProfileId(int likedProfileId);

    long countByIdLikerId(int likerId);

    void deleteByIdLikerIdAndIdLikedProfileId(int likerId, int likedProfileId);
}

package com.match.partner.openapi.user.repository;

import com.match.partner.openapi.user.model.dao.UserProfile;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.Optional;
import java.util.Set;

@Repository
public interface UserProfileRepository extends JpaRepository<UserProfile, Integer> {

    Optional<UserProfile> findByEmail(String username);

    /**
     * Same visibility rule as {@link #findByIdNot}, for an arbitrary id set
     * rather than "everyone but me" - used to resolve notification actors so
     * a deleted, hidden, or incomplete profile's identity never leaks through
     * a "someone viewed/liked you" notification. NotificationServiceImpl
     * already falls back to the notification's stored generic title/body
     * when an actor is missing from the map, so excluding them here is the
     * whole fix - no DTO or frontend change needed.
     */
    @Query("""
            SELECT u FROM UserProfile u
            WHERE u.id IN :ids
              AND u.deletedAt IS NULL
              AND u.hidden = false
              AND u.blocked = false
              AND u.verified = true
              AND u.name IS NOT NULL AND TRIM(u.name) <> ''
              AND u.gender IS NOT NULL AND TRIM(u.gender) <> ''
              AND u.dateOfBirth IS NOT NULL
              AND u.maritalStatus IS NOT NULL AND TRIM(u.maritalStatus) <> ''
              AND u.mobileNumber IS NOT NULL AND TRIM(u.mobileNumber) <> ''
            """)
    List<UserProfile> findVisibleByIdIn(@Param("ids") Set<Integer> ids);

    /**
     * Every profile except the caller's own.
     *
     * The listing used plain findAll, so you appeared in your own browse feed,
     * with a Connect button pointing at yourself. Excluding the row in the query
     * rather than after the fetch also keeps the page size honest: dropping your
     * own row from an already-fetched page of 10 quietly returns 9.
     *
     * Sort order stays in the Pageable so the caller still controls it.
     */
    /**
     * Visible means: not the caller, not soft-deleted, not self-hidden, verified by admin, and
     * carrying the five fields a profile needs before it means anything to a
     * stranger - name, gender, date of birth, marital status, mobile number.
     * Height stays optional; a profile is still legible without it.
     *
     * That mandatory-fields clause is deliberately repeated in every browse
     * query below rather than factored into a derived flag column, for the
     * same reason {@code hidden = false} is repeated: JPQL has no shared
     * fragment, and a rule copy-pasted where it is easy to compare beats one
     * hidden behind a method whose four callers can drift apart unnoticed.
     *
     * Written as an explicit query rather than
     * findByIdNotAndDeletedAtIsNullAndHiddenFalse so that the visibility rule
     * lives in one readable place - it has to match {@link #findByIdNotAndGender}
     * exactly, and two derived method names drifting apart is how a deleted
     * profile ends up visible on one screen and not another.
     */
    @Query("""
            SELECT u FROM UserProfile u
            WHERE u.id <> :currentUserId
              AND u.deletedAt IS NULL
              AND u.hidden = false
              AND u.blocked = false
              AND u.verified = true
              AND u.name IS NOT NULL AND TRIM(u.name) <> ''
              AND u.gender IS NOT NULL AND TRIM(u.gender) <> ''
              AND u.dateOfBirth IS NOT NULL
              AND u.maritalStatus IS NOT NULL AND TRIM(u.maritalStatus) <> ''
              AND u.mobileNumber IS NOT NULL AND TRIM(u.mobileNumber) <> ''
            """)
    Page<UserProfile> findByIdNot(@Param("currentUserId") Integer currentUserId, Pageable pageable);

    /**
     * Every profile except the caller's own, restricted to one gender.
     *
     * Backs the browse feed, where a man should be shown women and vice versa.
     * "See all profiles" deliberately does not use this - that list is meant to
     * be everyone, so it keeps calling {@link #findByIdNot}.
     *
     * Used to also include profiles with no gender recorded, since most rows
     * had a null gender and filtering them out strictly turned a 65-profile
     * feed into a handful. That looseness is gone now that gender is one of
     * the fields {@link #findByIdNot}'s mandatory-fields clause already
     * requires for any visibility at all - a profile with no gender no longer
     * reaches this query's WHERE clause in the first place, so keeping an
     * `OR u.gender IS NULL` arm here would just be dead code.
     *
     * The comparison is case-insensitive and trimmed, because the column is
     * free text: it holds 'Male', 'Female', and at least one empty string.
     */
    @Query("""
            SELECT u FROM UserProfile u
            WHERE u.id <> :currentUserId
              AND u.deletedAt IS NULL
              AND u.hidden = false
              AND u.blocked = false
              AND u.verified = true
              AND u.name IS NOT NULL AND TRIM(u.name) <> ''
              AND u.dateOfBirth IS NOT NULL
              AND u.maritalStatus IS NOT NULL AND TRIM(u.maritalStatus) <> ''
              AND u.mobileNumber IS NOT NULL AND TRIM(u.mobileNumber) <> ''
              AND LOWER(TRIM(u.gender)) = LOWER(:gender)
            """)
    Page<UserProfile> findByIdNotAndGender(@Param("currentUserId") Integer currentUserId,
                                           @Param("gender") String gender,
                                           Pageable pageable);

    /**
     * Ids of every profile eligible for the story rail, oldest first.
     *
     * Same visibility rules as the browse feed above, including the
     * mandatory-fields clause - a rail that quietly applied a looser rule than
     * the feed under it would look like a bug.
     *
     * Ids only, and ordered by id, for two reasons. The rotation needs a stable
     * total ordering that does not shift when someone edits their profile, and
     * it needs the whole list to pick a window out of - loading full rows to
     * throw away all but ten of them would be waste that grows with the member
     * count. Ints are cheap enough that this stays fine into the tens of
     * thousands; past that, move the window into SQL with LIMIT/OFFSET.
     */
    @Query("""
            SELECT u.id FROM UserProfile u
            WHERE u.id <> :currentUserId
              AND u.deletedAt IS NULL
              AND u.hidden = false
              AND u.blocked = false
              AND u.verified = true
              AND u.name IS NOT NULL AND TRIM(u.name) <> ''
              AND u.gender IS NOT NULL AND TRIM(u.gender) <> ''
              AND u.dateOfBirth IS NOT NULL
              AND u.maritalStatus IS NOT NULL AND TRIM(u.maritalStatus) <> ''
              AND u.mobileNumber IS NOT NULL AND TRIM(u.mobileNumber) <> ''
              AND (:gender IS NULL OR LOWER(TRIM(u.gender)) = LOWER(:gender))
            ORDER BY u.id ASC
            """)
    List<Integer> findStoryCandidateIds(@Param("currentUserId") Integer currentUserId,
                                        @Param("gender") String gender);

    /**
     * {@link #findByIdNot} narrowed by the "See all profiles" filter bar.
     *
     * A second query rather than folding these five extra conditions into
     * findByIdNot, because every one of them is optional - the
     * {@code :param IS NULL OR ...} form here would make the common,
     * unfiltered call slower to plan for no benefit when nobody is filtering.
     *
     * Age is filtered as a date-of-birth range rather than computed per row:
     * dobBefore/dobAfter are the caller's ageFrom/ageTo already converted to
     * cutoff dates, so this stays a plain indexable range comparison instead
     * of a function applied to every row.
     *
     * maritalStatus and manglik are exact matches on their lookup code
     * (NEVER_MARRIED, YES, ...); profession is a contains match, because free
     * text was typed into that field before it became a lookup and an exact
     * match would silently drop every profile written before the change.
     */
    @Query("""
            SELECT u FROM UserProfile u
            WHERE u.id <> :currentUserId
              AND u.deletedAt IS NULL
              AND u.hidden = false
              AND u.blocked = false
              AND u.verified = true
              AND u.name IS NOT NULL AND TRIM(u.name) <> ''
              AND u.gender IS NOT NULL AND TRIM(u.gender) <> ''
              AND u.dateOfBirth IS NOT NULL
              AND u.maritalStatus IS NOT NULL AND TRIM(u.maritalStatus) <> ''
              AND u.mobileNumber IS NOT NULL AND TRIM(u.mobileNumber) <> ''
              AND (:gender IS NULL OR LOWER(TRIM(u.gender)) = LOWER(:gender))
              AND (:dobBefore IS NULL OR u.dateOfBirth <= :dobBefore)
              AND (:dobAfter IS NULL OR u.dateOfBirth >= :dobAfter)
              AND (:maritalStatus IS NULL OR u.maritalStatus = :maritalStatus)
              AND (:manglik IS NULL OR u.manglik = :manglik)
              AND (:profession IS NULL OR LOWER(u.profession) LIKE LOWER(CONCAT('%', :profession, '%')))
              AND (:heightFromOrder IS NULL OR
                   (SELECT lo.sortOrder FROM LookupOption lo
                     WHERE lo.category = 'height' AND lo.code = u.height) >= :heightFromOrder)
              AND (:heightToOrder IS NULL OR
                   (SELECT lo.sortOrder FROM LookupOption lo
                     WHERE lo.category = 'height' AND lo.code = u.height) <= :heightToOrder)
            """)
    Page<UserProfile> findByIdNotFiltered(@Param("currentUserId") Integer currentUserId,
                                          @Param("gender") String gender,
                                          @Param("dobBefore") LocalDateTime dobBefore,
                                          @Param("dobAfter") LocalDateTime dobAfter,
                                          @Param("maritalStatus") String maritalStatus,
                                          @Param("manglik") String manglik,
                                          @Param("profession") String profession,
                                          @Param("heightFromOrder") Integer heightFromOrder,
                                          @Param("heightToOrder") Integer heightToOrder,
                                          Pageable pageable);

    /**
     * The admin verification queue: live profiles nobody has checked yet,
     * oldest first so nobody waits behind someone who signed up after them.
     */
    @Query("""
            SELECT u FROM UserProfile u
            WHERE u.deletedAt IS NULL
              AND (u.verified = false OR u.verified IS NULL)
            ORDER BY u.createdAt DESC
            """)
    Page<UserProfile> findUnverified(Pageable pageable);

    /**
     * Every live profile, for the admin to browse/search when picking one to
     * feature - unlike findUnverified this includes already-verified
     * profiles too, and unlike the member-facing browse queries it does NOT
     * filter by mandatory fields or hidden status: an admin needs to find a
     * profile by name/email regardless of its completeness or visibility.
     */
    @Query("""
            SELECT u FROM UserProfile u
            WHERE u.deletedAt IS NULL
              AND (:search IS NULL OR :search = ''
                   OR LOWER(u.name) LIKE LOWER(CONCAT('%', :search, '%'))
                   OR LOWER(u.email) LIKE LOWER(CONCAT('%', :search, '%'))
                   OR u.mobileNumber LIKE CONCAT('%', :search, '%')
                   OR (:idNum IS NOT NULL AND u.id = :idNum)
                   OR CAST(u.id AS string) LIKE CONCAT('%', :search, '%'))
            ORDER BY u.createdAt DESC
            """)
    Page<UserProfile> searchAllForAdmin(@Param("search") String search, @Param("idNum") Integer idNum, Pageable pageable);

    /**
     * All verified profiles, with optional multi-field search (name, email, phone, ID).
     */
    @Query("""
            SELECT u FROM UserProfile u
            WHERE u.deletedAt IS NULL
              AND u.verified = true
              AND (:search IS NULL OR :search = ''
                   OR LOWER(u.name) LIKE LOWER(CONCAT('%', :search, '%'))
                   OR LOWER(u.email) LIKE LOWER(CONCAT('%', :search, '%'))
                   OR u.mobileNumber LIKE CONCAT('%', :search, '%')
                   OR (:idNum IS NOT NULL AND u.id = :idNum)
                   OR CAST(u.id AS string) LIKE CONCAT('%', :search, '%'))
            ORDER BY u.createdAt DESC
            """)
    Page<UserProfile> findVerified(@Param("search") String search, @Param("idNum") Integer idNum, Pageable pageable);
}

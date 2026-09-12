package com.match.partner.openapi.auth.repository;

import com.match.partner.openapi.auth.model.dao.EmailOtp;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.Optional;

@Repository
public interface EmailOtpRepository extends JpaRepository<EmailOtp, Long> {

    /**
     * The code a member would be typing right now: newest unspent one for this
     * address and purpose.
     *
     * Newest wins because someone who taps "resend" is reading the second
     * email, not the first. The older rows are not deleted - they are
     * invalidated by {@link #consumeOutstanding}, so a stale code fails as
     * spent rather than silently still working.
     */
    Optional<EmailOtp> findFirstByEmailAndPurposeAndConsumedAtIsNullOrderByCreatedAtDesc(
            String email, EmailOtp.Purpose purpose);

    /** Throttle input: how many codes went to this address recently. */
    long countByEmailAndPurposeAndCreatedAtAfter(String email,
                                                 EmailOtp.Purpose purpose,
                                                 LocalDateTime since);

    /**
     * Burn every outstanding code for an address and purpose.
     *
     * Called when a new one is issued and again when one is redeemed, so there
     * is never more than a single live code - otherwise an old email stays
     * usable, which is exactly the situation password reset exists to protect
     * against.
     */
    @Modifying
    @Query("""
            UPDATE EmailOtp o SET o.consumedAt = :now
            WHERE o.email = :email AND o.purpose = :purpose AND o.consumedAt IS NULL
            """)
    void consumeOutstanding(@Param("email") String email,
                            @Param("purpose") EmailOtp.Purpose purpose,
                            @Param("now") LocalDateTime now);

    /** Housekeeping: codes long past their expiry are noise. */
    @Modifying
    @Query("DELETE FROM EmailOtp o WHERE o.expiresAt < :cutoff")
    int deleteExpiredBefore(@Param("cutoff") LocalDateTime cutoff);
}

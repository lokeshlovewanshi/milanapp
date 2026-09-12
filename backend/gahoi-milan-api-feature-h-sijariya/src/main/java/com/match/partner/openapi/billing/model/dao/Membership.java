package com.match.partner.openapi.billing.model.dao;

import jakarta.persistence.*;
import lombok.Data;

import java.time.LocalDateTime;

/**
 * What a member currently has.
 *
 * Separate from PaymentOrder because a membership does not always come from a
 * payment - the launch offer grants one, and support may extend one by hand -
 * and `source` records which.
 *
 * Rows are added rather than overwritten, so a member who upgrades has two and
 * only one ACTIVE. That keeps renewals and lapses countable later.
 */
@Entity
@Table(name = "membership")
@Data
public class Membership {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "user_profile_id", nullable = false)
    private Integer userProfileId;

    @Column(name = "plan_id", nullable = false)
    private Integer planId;

    @Column(name = "payment_order_id")
    private Long paymentOrderId;

    @Column(name = "promo_id")
    private Integer promoId;

    /** PURCHASE | PROMO | MANUAL */
    @Column(name = "source", nullable = false)
    private String source = "PURCHASE";

    @Column(name = "starts_at", nullable = false)
    private LocalDateTime startsAt = LocalDateTime.now();

    /** Null is a lifetime membership. */
    @Column(name = "expires_at")
    private LocalDateTime expiresAt;

    /** ACTIVE | EXPIRED | CANCELLED | REPLACED */
    @Column(name = "status", nullable = false)
    private String status = "ACTIVE";

    /** Active and not past its end date. */
    public boolean isCurrent() {
        return "ACTIVE".equalsIgnoreCase(status)
                && (expiresAt == null || expiresAt.isAfter(LocalDateTime.now()));
    }
}

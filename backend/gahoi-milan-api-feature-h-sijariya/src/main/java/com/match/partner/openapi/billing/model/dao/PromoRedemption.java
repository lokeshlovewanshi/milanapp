package com.match.partner.openapi.billing.model.dao;

import jakarta.persistence.*;
import lombok.Data;

import java.time.LocalDateTime;

/**
 * Who claimed which offer.
 *
 * Exists so per-user limits can be enforced and so a campaign's real cost can
 * be counted after it ends.
 */
@Entity
@Table(name = "promo_redemption")
@Data
public class PromoRedemption {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "promo_id", nullable = false)
    private Integer promoId;

    @Column(name = "user_profile_id", nullable = false)
    private Integer userProfileId;

    @Column(name = "payment_order_id")
    private Long paymentOrderId;

    @Column(name = "discount_paise", nullable = false)
    private Long discountPaise = 0L;

    @Column(name = "redeemed_at", insertable = false, updatable = false)
    private LocalDateTime redeemedAt;
}

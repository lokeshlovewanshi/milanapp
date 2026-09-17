package com.match.partner.openapi.billing.model.dao;

import jakarta.persistence.*;
import lombok.Data;

import java.time.LocalDateTime;

/**
 * A time-boxed offer that changes what a plan costs.
 *
 * The launch offer - twelve months free - is a row here rather than a price
 * edit, so ending it is a date rather than a migration, and so orders placed
 * under it can still be told apart from ordinary sales afterwards.
 */
@Entity
@Table(name = "promo_campaign")
@Data
public class PromoCampaign {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Integer id;

    @Column(name = "code", nullable = false, unique = true)
    private String code;

    @Column(name = "name", nullable = false)
    private String name;

    @Column(name = "description")
    private String description;

    /** PERCENT (0-100), FLAT (paise off) or FREE (whole price waived). */
    @Column(name = "discount_type", nullable = false)
    private String discountType;

    @Column(name = "discount_value", nullable = false)
    private Long discountValue = 0L;

    /** Null in both means the campaign applies to every plan. */
    @Column(name = "applies_to_tier")
    private String appliesToTier;

    @Column(name = "applies_to_duration_months")
    private Integer appliesToDurationMonths;

    /** Null start means already running; null end means until switched off. */
    @Column(name = "starts_at")
    private LocalDateTime startsAt;

    @Column(name = "ends_at")
    private LocalDateTime endsAt;

    @Column(name = "is_active", nullable = false)
    private Boolean active = true;

    @Column(name = "max_redemptions")
    private Integer maxRedemptions;

    /** What stops one account claiming a free year every day. */
    @Column(name = "per_user_limit")
    private Integer perUserLimit = 1;

    @Column(name = "redeemed_count", nullable = false)
    private Integer redeemedCount = 0;

    /** Set when the offer has to be typed in; null means it applies on its own. */
    @Column(name = "coupon_code")
    private String couponCode;

    /** Whether this campaign is live right now, caps aside. */
    public boolean isRunning() {
        if (!Boolean.TRUE.equals(active)) return false;
        LocalDateTime now = LocalDateTime.now();
        if (startsAt != null && now.isBefore(startsAt)) return false;
        if (endsAt != null && now.isAfter(endsAt)) return false;
        return maxRedemptions == null || redeemedCount < maxRedemptions;
    }

    /** Whether it covers a particular plan. */
    public boolean covers(SubscriptionPlan plan) {
        if (appliesToTier != null && !appliesToTier.equalsIgnoreCase(plan.getTier())) return false;
        if (appliesToDurationMonths != null
                && !appliesToDurationMonths.equals(plan.getDurationMonths())) return false;
        return true;
    }

    /** What this campaign takes off the given price, capped at the price itself. */
    public long discountFor(long pricePaise) {
        long off = switch (discountType == null ? "" : discountType.toUpperCase()) {
            case "FREE" -> pricePaise;
            case "PERCENT" -> Math.round(pricePaise * (discountValue / 100.0));
            case "FLAT" -> discountValue;
            default -> 0L;
        };
        return Math.max(0, Math.min(off, pricePaise));
    }
}

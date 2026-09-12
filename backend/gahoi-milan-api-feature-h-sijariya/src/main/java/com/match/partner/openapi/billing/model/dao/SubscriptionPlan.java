package com.match.partner.openapi.billing.model.dao;

import jakarta.persistence.*;
import lombok.Data;

import java.time.LocalDateTime;

/**
 * A plan that can be bought or granted.
 *
 * 3 Standard tiers: Bronze (3 Months), Silver (6 Months), Gold (12 Months).
 * Supports base pricing, promotional discount pricing, and "Free on Signup" offer status.
 */
@Entity
@Table(name = "subscription_plan")
@Data
public class SubscriptionPlan {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Integer id;

    /** Stable identifier the app sends, e.g. "bronze_3m", "silver_6m", "gold_12m". */
    @Column(name = "code", nullable = false, unique = true)
    private String code;

    @Column(name = "name", nullable = false)
    private String name;

    /** bronze / silver / gold. */
    @Column(name = "tier", nullable = false)
    private String tier;

    /** Duration in months: 3 for Bronze, 6 for Silver, 12 for Gold. */
    @Column(name = "duration_months")
    private Integer durationMonths;

    /** Base original price in Paise (e.g. 149900 for ₹1,499). */
    @Column(name = "price_paise", nullable = false)
    private Long pricePaise = 0L;

    /** Discounted price in Paise (e.g. 99900 for ₹999). Null or equal if no discount. */
    @Column(name = "discount_price_paise")
    private Long discountPricePaise;

    @Column(name = "currency", nullable = false)
    private String currency = "INR";

    /** Whether this plan is available for selection. */
    @Column(name = "is_active", nullable = false)
    private Boolean active = true;

    /** Whether newly registered users automatically receive this plan for free. */
    @Column(name = "is_free_on_signup", nullable = false)
    private Boolean freeOnSignup = false;

    /** Optional start date for special offer/promotion. */
    @Column(name = "offer_starts_at")
    private LocalDateTime offerStartsAt;

    /** Optional end date for special offer/promotion. */
    @Column(name = "offer_ends_at")
    private LocalDateTime offerEndsAt;

    /** Display order in UI. */
    @Column(name = "sort_order", nullable = false)
    private Integer sortOrder = 0;

    /** JSON-encoded or newline-separated feature bullets. */
    @Column(name = "features", columnDefinition = "TEXT")
    private String features;

    @Column(name = "created_at", insertable = false, updatable = false)
    private LocalDateTime createdAt;

    /** Whether the offer (discount or free on signup) is currently valid based on dates. */
    public boolean isOfferActive() {
        LocalDateTime now = LocalDateTime.now();
        if (offerStartsAt != null && offerStartsAt.isAfter(now)) {
            return false;
        }
        if (offerEndsAt != null && offerEndsAt.isBefore(now)) {
            return false;
        }
        return true;
    }

    /** Returns effective payable paise taking into account active discounts or free status. */
    public long getEffectivePricePaise() {
        if (Boolean.TRUE.equals(freeOnSignup) && isOfferActive()) {
            return 0L;
        }
        if (discountPricePaise != null && isOfferActive() && discountPricePaise >= 0) {
            return discountPricePaise;
        }
        return pricePaise != null ? pricePaise : 0L;
    }
}

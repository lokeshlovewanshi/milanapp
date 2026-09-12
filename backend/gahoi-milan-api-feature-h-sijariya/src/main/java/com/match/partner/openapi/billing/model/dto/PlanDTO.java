package com.match.partner.openapi.billing.model.dto;

import lombok.Data;

import java.time.LocalDateTime;

/**
 * A plan as the app and web see it, with original and discounted pricing and offer status.
 */
@Data
public class PlanDTO {
    private Integer id;
    private String code;
    private String name;
    private String tier;
    private Integer durationMonths;
    private Long pricePaise;
    private Long discountPricePaise;
    private Long payablePaise;
    private Long discountPaise;
    private String currency = "INR";

    private Boolean freeOnSignup;
    private Boolean isOfferActive;
    private LocalDateTime offerStartsAt;
    private LocalDateTime offerEndsAt;
    private String features;

    /** Name of any promo code / campaign applied */
    private String promoName;
    private String promoCode;
    /** True when the plan is currently free on signup or via promotion. */
    private boolean freeWithPromo;

    /** Calculated helper: savings percentage (e.g. 33 for 33% off) */
    private Integer savingsPercentage;
}

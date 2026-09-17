package com.match.partner.openapi.admin.model.dto;

import lombok.Data;

import java.time.LocalDateTime;

@Data
public class AdminPlanDTO {
    private Integer id;
    private String code;
    private String name;
    private String tier;
    private Integer durationMonths;

    /** Prices in Rupees for easy display and input in admin UI */
    private Double priceRupees;
    private Double discountPriceRupees;

    /** Prices in Paise for raw precision */
    private Long pricePaise;
    private Long discountPricePaise;

    private String currency = "INR";
    private Boolean active;
    private Boolean freeOnSignup;
    private LocalDateTime offerStartsAt;
    private LocalDateTime offerEndsAt;
    private Boolean isOfferActive;
    private Integer sortOrder;
    private String features;
    private Integer savingsPercentage;
}

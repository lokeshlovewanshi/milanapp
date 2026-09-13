package com.match.partner.openapi.admin.model.dto;

import lombok.Data;

import java.time.LocalDateTime;

@Data
public class UpdatePlanRequest {
    private String name;
    private Integer durationMonths;
    private Double priceRupees;
    private Double discountPriceRupees;
    private Boolean active;
    private Boolean freeOnSignup;
    private LocalDateTime offerStartsAt;
    private LocalDateTime offerEndsAt;
    private Integer sortOrder;
    private String features;
}

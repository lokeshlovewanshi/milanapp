package com.match.partner.openapi.billing.model.dto;

import lombok.Data;

/**
 * Deliberately not an amount.
 *
 * The app names a plan and, if the member typed one, a coupon. The price comes
 * from the database. Accepting a figure here is how a lifetime membership gets
 * bought for a rupee.
 */
@Data
public class CreateOrderRequest {
    private String planId;
    private String couponCode;
}

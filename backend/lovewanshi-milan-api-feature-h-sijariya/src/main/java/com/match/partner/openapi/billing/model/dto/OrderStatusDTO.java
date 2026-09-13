package com.match.partner.openapi.billing.model.dto;

import lombok.Data;

/** The server's own view of an order - the only account worth believing. */
@Data
public class OrderStatusDTO {
    private String orderId;
    private String status;
    private Long amountPaise;
    private String message;
}

package com.match.partner.openapi.billing.model.dto;

import lombok.Data;

import java.util.Map;

/**
 * Everything the app needs to start paying, and nothing it needs to be trusted
 * with afterwards.
 *
 * `checkoutUrl` is the whole flow as far as the client is concerned: send the
 * customer there, get them back at `returnUrl`. Which gateway is behind it is
 * named in `provider` so the app can pick the right handler without having the
 * choice compiled into it.
 */
@Data
public class OrderDTO {
    private String provider;
    private String orderId;
    private Long amountPaise;
    private String currency;
    private String checkoutUrl;
    private String returnUrl;
    private Map<String, String> params;
    /**
     * Set when a promotion covered the whole price.
     *
     * The membership is already granted in that case and there is nothing to
     * pay, so the app skips checkout entirely rather than sending someone to a
     * gateway for zero rupees - which most gateways reject anyway.
     */
    private boolean grantedFree;
}

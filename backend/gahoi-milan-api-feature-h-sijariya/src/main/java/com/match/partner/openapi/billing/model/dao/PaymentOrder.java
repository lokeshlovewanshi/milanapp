package com.match.partner.openapi.billing.model.dao;

import jakarta.persistence.*;
import lombok.Data;

import java.time.LocalDateTime;

/**
 * One attempt to buy a plan.
 *
 * Created before the customer is sent to the gateway, so an abandoned payment
 * is still visible afterwards. `provider` is a column rather than an
 * assumption: changing gateway must not orphan the history.
 */
@Entity
@Table(name = "payment_order")
@Data
public class PaymentOrder {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    /**
     * What the gateway is told, and what the app quotes back.
     *
     * Random rather than the primary key: a sequential order id tells anyone
     * who looks how many sales have been made, and lets them guess other
     * people's orders.
     */
    @Column(name = "order_ref", nullable = false, unique = true)
    private String orderRef;

    @Column(name = "user_profile_id", nullable = false)
    private Integer userProfileId;

    @Column(name = "plan_id", nullable = false)
    private Integer planId;

    @Column(name = "promo_id")
    private Integer promoId;

    @Column(name = "provider", nullable = false)
    private String provider;

    @Column(name = "provider_order_id")
    private String providerOrderId;

    @Column(name = "provider_payment_id")
    private String providerPaymentId;

    /** What will actually be charged, after any discount. */
    @Column(name = "amount_paise", nullable = false)
    private Long amountPaise;

    @Column(name = "discount_paise", nullable = false)
    private Long discountPaise = 0L;

    @Column(name = "currency", nullable = false)
    private String currency = "INR";

    /** CREATED -> PENDING -> PAID | FAILED | CANCELLED, and REFUNDED after. */
    @Column(name = "status", nullable = false)
    private String status = "CREATED";

    @Column(name = "failure_reason")
    private String failureReason;

    @Column(name = "created_at", insertable = false, updatable = false)
    private LocalDateTime createdAt;

    @Column(name = "paid_at")
    private LocalDateTime paidAt;
}

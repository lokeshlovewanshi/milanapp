package com.match.partner.openapi.billing.model.dao;

import jakarta.persistence.*;
import lombok.Data;

import java.time.LocalDateTime;

/**
 * A callback from the gateway, kept whole.
 *
 * Gateways retry, arrive out of order and occasionally contradict themselves.
 * When a member says they paid and the system disagrees, this is the only
 * record of what was actually received. `signatureValid` is stored rather than
 * merely checked, so a forged callback that was rejected still leaves a trace.
 */
@Entity
@Table(name = "payment_event")
@Data
public class PaymentEvent {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "payment_order_id")
    private Long paymentOrderId;

    @Column(name = "provider", nullable = false)
    private String provider;

    @Column(name = "event_type")
    private String eventType;

    /** The gateway's own dedupe key, where it gives one. */
    @Column(name = "provider_event_id")
    private String providerEventId;

    @Column(name = "signature_valid")
    private Boolean signatureValid;

    @Column(name = "payload", nullable = false, columnDefinition = "TEXT")
    private String payload;

    @Column(name = "received_at", insertable = false, updatable = false)
    private LocalDateTime receivedAt;
}

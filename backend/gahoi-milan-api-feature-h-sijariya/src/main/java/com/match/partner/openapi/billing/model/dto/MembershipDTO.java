package com.match.partner.openapi.billing.model.dto;

import lombok.Data;

import java.time.LocalDateTime;

/** What the member currently has, for the subscription screen. */
@Data
public class MembershipDTO {
    private String planCode;
    private String planName;
    private String tier;
    /** Null is a lifetime membership. */
    private LocalDateTime expiresAt;
    private String source;
    private boolean active;
}

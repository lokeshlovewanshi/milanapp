package com.match.partner.openapi.admin.model.dto;

import lombok.Data;

import java.time.LocalDateTime;

@Data
public class AdminMembershipSummaryDTO {
    private Long id;
    private Integer userProfileId;
    private String userEmail;
    private String userName;
    private String userGmId;
    private String userMobile;

    private Integer planId;
    private String planName;
    private String planCode;
    private String tier;
    private Integer durationMonths;

    private String source;
    private String status;
    private LocalDateTime startsAt;
    private LocalDateTime expiresAt;
    private boolean isCurrent;
}

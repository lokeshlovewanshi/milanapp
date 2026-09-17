package com.match.partner.openapi.admin.model.dto;

import lombok.Data;

import java.time.LocalDateTime;

/** One row of the admin queue - who raised it, alongside the same fields TicketSummaryDTO shows the member. */
@Data
public class AdminTicketSummaryDTO {
    private Integer id;
    private String subject;
    private String status;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;

    private Integer profileId;
    private String displayId;
    private String profileName;
    private String profileEmail;
}

package com.match.partner.openapi.ticket.model.dto;

import lombok.Data;

import java.time.LocalDateTime;

/** One row of a member's own "My Tickets" list. */
@Data
public class TicketSummaryDTO {
    private Integer id;
    private String subject;
    private String status;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
}

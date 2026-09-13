package com.match.partner.openapi.ticket.model.dto;

import lombok.Data;

import java.time.LocalDateTime;

/** One line of a ticket's thread. Shared as-is between the member and admin views - the conversation looks the same from both sides. */
@Data
public class TicketMessageDTO {
    private Integer id;
    private String senderType;
    private String senderName;
    private String message;
    private LocalDateTime createdAt;
}

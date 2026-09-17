package com.match.partner.openapi.ticket.model.dto;

import lombok.Data;

import java.time.LocalDateTime;
import java.util.List;

/** A member's own view of one ticket - the thread, without who-else-can-see-this admin context. */
@Data
public class TicketDetailDTO {
    private Integer id;
    private String subject;
    private String status;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
    private List<TicketMessageDTO> messages;
}

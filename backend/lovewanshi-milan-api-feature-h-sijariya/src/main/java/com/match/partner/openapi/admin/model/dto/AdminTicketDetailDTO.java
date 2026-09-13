package com.match.partner.openapi.admin.model.dto;

import com.match.partner.openapi.ticket.model.dto.TicketMessageDTO;
import lombok.Data;

import java.time.LocalDateTime;
import java.util.List;

/** The admin's view of one ticket - same thread as TicketDetailDTO, plus who raised it. */
@Data
public class AdminTicketDetailDTO {
    private Integer id;
    private String subject;
    private String status;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
    private List<TicketMessageDTO> messages;

    private Integer profileId;
    private String displayId;
    private String profileName;
    private String profileEmail;
}

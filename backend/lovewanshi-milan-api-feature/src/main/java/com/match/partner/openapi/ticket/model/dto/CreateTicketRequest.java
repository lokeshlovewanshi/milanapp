package com.match.partner.openapi.ticket.model.dto;

import lombok.Data;

@Data
public class CreateTicketRequest {
    private String subject;
    private String message;
}

package com.match.partner.openapi.admin.model.dto;

import lombok.Data;

@Data
public class AdminSendEmailDTO {
    private String to;
    private String subject;
    private String content;
    private String recipientName;
    private String profileId;
}

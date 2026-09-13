package com.match.partner.openapi.admin.model.dto;

import lombok.Data;

import java.time.LocalDateTime;

@Data
public class MessageTemplateDTO {
    private Integer id;
    private String title;
    private String templateType;
    private String content;
    private String variables;
    private Integer sortOrder;
    private Boolean isActive;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
}

package com.match.partner.openapi.admin.model.dto;

import lombok.Data;

import java.time.LocalDateTime;

@Data
public class OutreachContactDTO {
    private Integer id;
    private String name;
    private String phoneNumber;
    private String email;
    private String category;
    private String notes;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
}

package com.match.partner.openapi.attachment.model.entity.dto;

import lombok.Data;

@Data
public class AttachmentDto {
    private Integer id;
    private String name;
    private String type;
    private String path;
    private Integer userId;
}

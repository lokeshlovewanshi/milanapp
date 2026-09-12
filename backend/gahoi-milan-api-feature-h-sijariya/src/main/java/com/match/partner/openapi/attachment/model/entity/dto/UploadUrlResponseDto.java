package com.match.partner.openapi.attachment.model.entity.dto;

import lombok.Data;

@Data
public class UploadUrlResponseDto {
    private String presignedUrl;
    private String fileName;
    private String fileType;
    private String s3Key;
}

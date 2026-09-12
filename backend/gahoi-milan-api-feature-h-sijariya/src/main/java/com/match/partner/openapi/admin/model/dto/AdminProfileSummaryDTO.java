package com.match.partner.openapi.admin.model.dto;

import lombok.Data;

import java.time.LocalDateTime;

/**
 * Enough to decide "verify" or "look closer" without opening the full
 * profile - the queue is meant to move fast.
 */
@Data
public class AdminProfileSummaryDTO {
    private Integer id;
    private String displayId;
    private String name;
    private String gender;
    private String email;
    private String mobileNo;
    private String profileImage;
    private LocalDateTime createdAt;
    private Boolean verified;
    private Boolean blocked;
    private Boolean isPhoto;
}

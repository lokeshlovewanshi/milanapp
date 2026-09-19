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
    /** Whether the member proved they control the login email using the OTP. */
    private Boolean emailVerified;
    /** Soft-deleted profiles are retained for audit purposes, never browsable. */
    private Boolean deleted;
    private LocalDateTime deletedAt;
    private Boolean isPhoto;
}

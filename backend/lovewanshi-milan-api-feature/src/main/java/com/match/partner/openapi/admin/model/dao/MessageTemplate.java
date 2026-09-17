package com.match.partner.openapi.admin.model.dao;

import jakarta.persistence.*;
import lombok.Data;

import java.time.LocalDateTime;

/**
 * Predefined message template for admin outreach (WhatsApp, Email, SMS).
 * Stored in DB with content up to 5000 chars.
 */
@Entity
@Table(name = "message_template")
@Data
public class MessageTemplate {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Integer id;

    @Column(name = "title", nullable = false, length = 200)
    private String title;

    @Column(name = "template_type", nullable = false, length = 50)
    private String templateType = "WHATSAPP";

    @Column(name = "content", nullable = false, length = 5000, columnDefinition = "VARCHAR(5000)")
    private String content;

    @Column(name = "variables", length = 255)
    private String variables = "{name},{profileId},{mobileNo},{email},{profileUrl}";

    @Column(name = "sort_order", nullable = false)
    private Integer sortOrder = 0;

    @Column(name = "is_active", nullable = false)
    private Boolean isActive = true;

    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @Column(name = "updated_at", nullable = false)
    private LocalDateTime updatedAt;

    @PrePersist
    void onCreate() {
        LocalDateTime now = LocalDateTime.now();
        createdAt = now;
        updatedAt = now;
    }

    @PreUpdate
    void onUpdate() {
        updatedAt = LocalDateTime.now();
    }
}

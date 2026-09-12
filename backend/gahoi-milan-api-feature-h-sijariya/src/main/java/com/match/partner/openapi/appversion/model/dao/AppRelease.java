package com.match.partner.openapi.appversion.model.dao;

import jakarta.persistence.*;
import lombok.Data;

import java.time.LocalDateTime;

/**
 * One published build of the app.
 *
 * The row that already exists with the highest version_code for a platform
 * is "the latest release" - there is no separate "current" flag to keep in
 * sync, which is exactly the kind of thing that drifts.
 */
@Entity
@Table(name = "app_release")
@Data
public class AppRelease {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Integer id;

    @Column(name = "platform", nullable = false)
    private String platform;

    @Column(name = "version_code", nullable = false)
    private Integer versionCode;

    @Column(name = "version_name", nullable = false)
    private String versionName;

    @Column(name = "min_supported_version_code")
    private Integer minSupportedVersionCode;

    @Column(name = "release_notes")
    private String releaseNotes;

    @Column(name = "download_url", nullable = false)
    private String downloadUrl;

    @Column(name = "is_active", nullable = false)
    private Boolean isActive = true;

    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @PrePersist
    void onCreate() {
        createdAt = LocalDateTime.now();
    }
}

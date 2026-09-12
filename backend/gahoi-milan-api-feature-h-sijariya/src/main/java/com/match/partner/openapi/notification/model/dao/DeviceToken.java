package com.match.partner.openapi.notification.model.dao;

import jakarta.persistence.*;
import lombok.Data;

import java.time.LocalDateTime;

/**
 * One push target. A user has a row per device they have signed in on, so a
 * notification fans out to their phone and tablet alike.
 *
 * The token is unique rather than the (user, token) pair: when a phone is handed
 * over or a second account signs in, FCM reissues the same token to the new
 * account, and the old row must move rather than duplicate - otherwise the
 * previous owner keeps receiving the new owner's notifications.
 */
@Entity
@Table(
    name = "device_tokens",
    uniqueConstraints = @UniqueConstraint(name = "uk_device_token", columnNames = "token"),
    indexes = @Index(name = "idx_device_tokens_user", columnList = "user_id")
)
@Data
public class DeviceToken {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "user_id", nullable = false)
    private Integer userId;

    /** FCM registration token. Long, and it rotates - never treat it as stable. */
    @Column(name = "token", nullable = false, length = 512)
    private String token;

    /** "android", "ios" or "web". */
    @Column(name = "platform", length = 16)
    private String platform;

    @Column(name = "created_at", nullable = false)
    private LocalDateTime createdAt;

    @Column(name = "updated_at", nullable = false)
    private LocalDateTime updatedAt;
}

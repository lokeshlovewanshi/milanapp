package com.match.partner.openapi.notification.model.dao;

import com.match.partner.openapi.notification.model.NotificationType;
import jakarta.persistence.*;
import lombok.Data;

import java.time.LocalDateTime;

/**
 * An in-app notification row.
 *
 * Stored independently of push delivery on purpose: push is best-effort (the
 * device may be offline, the token stale, Firebase unreachable), but the bell
 * icon must still show what happened. Everything is written here first, then a
 * push is attempted.
 */
@Entity
@Table(
    name = "notifications",
    indexes = {
        @Index(name = "idx_notifications_user_created", columnList = "user_id, created_at"),
        @Index(name = "idx_notifications_user_read", columnList = "user_id, read_at")
    }
)
@Data
public class Notification {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    /** Recipient. */
    @Column(name = "user_id", nullable = false)
    private Integer userId;

    @Enumerated(EnumType.STRING)
    @Column(name = "type", nullable = false, length = 32)
    private NotificationType type;

    @Column(name = "title", nullable = false, length = 128)
    private String title;

    @Column(name = "body", length = 512)
    private String body;

    /** Profile this is about, when there is one - lets the app deep-link on tap. */
    @Column(name = "actor_id")
    private Integer actorId;

    /** Null until read. Nullable timestamp doubles as the unread flag. */
    @Column(name = "read_at")
    private LocalDateTime readAt;

    @Column(name = "created_at", nullable = false)
    private LocalDateTime createdAt;
}

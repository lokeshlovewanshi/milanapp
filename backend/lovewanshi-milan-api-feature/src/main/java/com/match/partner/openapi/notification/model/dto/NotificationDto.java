package com.match.partner.openapi.notification.model.dto;

import lombok.Data;

import java.time.Instant;

@Data
public class NotificationDto {
    private Long id;
    private String type;
    private String title;
    private String body;
    /** JM-format code of the profile this is about, when there is one. */
    private String actorId;

    /**
     * The actor's name and photo, resolved server-side.
     *
     * The row shows a face, and the client only ever had an id. Letting it
     * fetch each actor would be one request per row on a screen whose whole job
     * is to render a list - so the page resolves them in one go instead.
     * Both stay null for a notification with no actor, such as a broadcast.
     */
    private String actorName;
    private String actorImage;
    private boolean read;
    /** UTC instant, serialized as ISO-8601 with a trailing Z for clients. */
    private Instant createdAt;
}

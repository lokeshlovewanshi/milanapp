package com.match.partner.openapi.notification.model.dto;

import lombok.Data;

/** Payload for targeted notification sent to a single user. */
@Data
public class SingleUserNotificationRequest {
    private Integer userId;
    private String title;
    private String body;
    /** Optional deep link the app opens on tap (e.g. /browse, /me, /plans). */
    private String link;
}

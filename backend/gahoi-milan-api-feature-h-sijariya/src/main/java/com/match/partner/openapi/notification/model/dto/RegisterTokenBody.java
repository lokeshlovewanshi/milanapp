package com.match.partner.openapi.notification.model.dto;

import lombok.Data;

@Data
public class RegisterTokenBody {
    /** FCM registration token from the device. */
    private String token;
    /** "android", "ios" or "web". */
    private String platform;
}

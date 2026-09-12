package com.match.partner.openapi.admin.controller;

import com.match.partner.openapi.notification.model.dto.BroadcastBody;
import com.match.partner.openapi.notification.model.dto.SingleUserNotificationRequest;
import com.match.partner.openapi.notification.service.NotificationServiceInterface;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

/** Guarded by AdminJwtInterceptor - every method here requires an admin token. */
@RestController
@RequestMapping("/api/v1/admin/notifications")
public class AdminNotificationController {

    private final NotificationServiceInterface notificationService;

    public AdminNotificationController(NotificationServiceInterface notificationService) {
        this.notificationService = notificationService;
    }

    @PostMapping("/broadcast")
    public ResponseEntity<Map<String, String>> broadcast(@RequestBody BroadcastBody body,
                                                        @RequestAttribute("adminEmail") String adminEmail) {
        if (body.getTitle() == null || body.getTitle().isBlank()) {
            return ResponseEntity.badRequest().body(Map.of("error", "Notification title is required."));
        }
        if (body.getBody() == null || body.getBody().isBlank()) {
            return ResponseEntity.badRequest().body(Map.of("error", "Notification message body is required."));
        }

        notificationService.broadcast(body);
        return ResponseEntity.ok(Map.of("message", "Broadcast notification sent successfully to all users."));
    }

    @PostMapping("/send-user")
    public ResponseEntity<Map<String, String>> sendToUser(@RequestBody SingleUserNotificationRequest body,
                                                          @RequestAttribute("adminEmail") String adminEmail) {
        if (body.getUserId() == null) {
            return ResponseEntity.badRequest().body(Map.of("error", "User ID is required."));
        }
        if (body.getTitle() == null || body.getTitle().isBlank()) {
            return ResponseEntity.badRequest().body(Map.of("error", "Notification title is required."));
        }
        if (body.getBody() == null || body.getBody().isBlank()) {
            return ResponseEntity.badRequest().body(Map.of("error", "Notification message body is required."));
        }

        notificationService.sendSingleUserNotification(body.getUserId(), body.getTitle().trim(), body.getBody().trim(), body.getLink());
        return ResponseEntity.ok(Map.of("message", "Notification sent successfully to user."));
    }
}

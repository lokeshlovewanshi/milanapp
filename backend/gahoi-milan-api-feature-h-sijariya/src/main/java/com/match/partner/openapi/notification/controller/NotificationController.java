package com.match.partner.openapi.notification.controller;

import com.match.partner.openapi.notification.model.dto.BroadcastBody;
import com.match.partner.openapi.notification.model.dto.NotificationDto;
import com.match.partner.openapi.notification.model.dto.RegisterTokenBody;
import com.match.partner.openapi.notification.service.NotificationServiceInterface;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.data.domain.Page;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/api/v1/notifications")
@RequiredArgsConstructor
public class NotificationController {

    private final NotificationServiceInterface notificationService;

    /**
     * Shared secret for the broadcast endpoint.
     *
     * Broadcast reaches every user at once, so it must not be callable with an
     * ordinary user's JWT. Until there is a real admin role this is gated on a
     * header secret; blank disables the endpoint entirely.
     */
    @Value("${notifications.admin-secret:}")
    private String adminSecret;

    /** Called after the app obtains an FCM token, and again whenever it rotates. */
    @PostMapping("/token")
    public ResponseEntity<Void> registerToken(@RequestBody RegisterTokenBody body,
                                              @RequestAttribute("username") String userName) {
        notificationService.registerToken(userName, body.getToken(), body.getPlatform());
        return ResponseEntity.ok().build();
    }

    /** Called on logout so the next account on this device does not inherit pushes. */
    @DeleteMapping("/token")
    public ResponseEntity<Void> unregisterToken(@RequestBody RegisterTokenBody body) {
        notificationService.unregisterToken(body.getToken());
        return ResponseEntity.ok().build();
    }

    @GetMapping
    public ResponseEntity<Page<NotificationDto>> list(@RequestAttribute("username") String userName,
                                                      @RequestParam(defaultValue = "0") int page,
                                                      @RequestParam(defaultValue = "20") int size) {
        return ResponseEntity.ok(notificationService.list(userName, page, size));
    }

    /** Drives the badge on the bell icon. */
    @GetMapping("/unread-count")
    public ResponseEntity<Map<String, Long>> unreadCount(@RequestAttribute("username") String userName) {
        return ResponseEntity.ok(Map.of("count", notificationService.unreadCount(userName)));
    }

    @PostMapping("/read-all")
    public ResponseEntity<Void> markAllRead(@RequestAttribute("username") String userName) {
        notificationService.markAllRead(userName);
        return ResponseEntity.ok().build();
    }

    /**
     * Festival announcement to every subscribed device - Holi, Diwali, offers.
     *
     * One FCM topic call regardless of user count.
     */
    @PostMapping("/broadcast")
    public ResponseEntity<String> broadcast(@RequestBody BroadcastBody body,
                                            @RequestHeader(value = "X-Admin-Secret", required = false) String secret) {
        if (adminSecret == null || adminSecret.isBlank()) {
            return ResponseEntity.status(HttpStatus.SERVICE_UNAVAILABLE)
                    .body("Broadcast is disabled. Set notifications.admin-secret to enable it.");
        }
        if (!adminSecret.equals(secret)) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).body("Invalid admin secret.");
        }
        if (body.getTitle() == null || body.getTitle().isBlank()) {
            return ResponseEntity.badRequest().body("title is required.");
        }

        notificationService.broadcast(body);
        return ResponseEntity.ok("Broadcast sent.");
    }
}

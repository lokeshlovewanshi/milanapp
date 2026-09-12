package com.match.partner.openapi.notification.service;

import com.match.partner.openapi.notification.model.NotificationType;
import com.match.partner.openapi.notification.model.dto.BroadcastBody;
import com.match.partner.openapi.notification.model.dto.NotificationDto;
import org.springframework.data.domain.Page;

public interface NotificationServiceInterface {

    void registerToken(String userName, String token, String platform);

    void unregisterToken(String token);

    Page<NotificationDto> list(String userName, int page, int size);

    long unreadCount(String userName);

    void markAllRead(String userName);

    /**
     * Record a notification and attempt a push. Takes the recipient's numeric id
     * rather than an email because callers already hold the id.
     */
    void notifyUser(Integer recipientId, NotificationType type, String title, String body, Integer actorId);

    void broadcast(BroadcastBody body);

    /**
     * Sends a direct notification and push to a single user.
     */
    void sendSingleUserNotification(Integer recipientId, String title, String body, String link);

    /**
     * Broadcasts a notification and push to all registered users when a new profile is verified.
     */
    void notifyAllOnNewProfileVerified(com.match.partner.openapi.user.model.dao.UserProfile profile);
}

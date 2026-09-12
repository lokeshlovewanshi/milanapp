package com.match.partner.openapi.notification.service;

import com.google.auth.oauth2.GoogleCredentials;
import com.google.firebase.FirebaseApp;
import com.google.firebase.FirebaseOptions;
import com.google.firebase.messaging.*;
import com.match.partner.openapi.notification.model.dao.DeviceToken;
import com.match.partner.openapi.notification.repository.DeviceTokenRepository;
import jakarta.annotation.PostConstruct;
import lombok.RequiredArgsConstructor;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;

import java.io.ByteArrayInputStream;
import java.io.FileInputStream;
import java.io.InputStream;
import java.nio.charset.StandardCharsets;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

/**
 * Firebase Cloud Messaging transport.
 *
 * Two delivery shapes, because they cost very different things:
 *  - sendToUser  : looks up that user's device tokens and multicasts. Used for
 *                  "someone liked you" style events.
 *  - sendToTopic : one API call reaches every subscriber. Used for the Holi and
 *                  Diwali style announcements, where fanning out over tens of
 *                  thousands of stored tokens would otherwise mean hundreds of
 *                  batched requests.
 *
 * Configuration is optional on purpose. With no service-account file present the
 * whole class degrades to a no-op and logs once, so local development and tests
 * run without a Firebase project. Notifications are still persisted by the
 * caller, so the in-app bell keeps working - only the push is skipped.
 */
@Service
@RequiredArgsConstructor
public class PushService {

    private static final Logger log = LoggerFactory.getLogger(PushService.class);

    /** FCM rejects multicasts larger than this. */
    private static final int MULTICAST_LIMIT = 500;

    private final DeviceTokenRepository deviceTokenRepository;

    /**
     * The service-account JSON itself, from Secrets Manager.
     *
     * Preferred over the file path: it means the credential never lands on the
     * instance's disk, and rotating it is editing one secret rather than
     * copying a file to every server.
     */
    @Value("${firebase.service-account-json:}")
    private String serviceAccountJson;

    /** Fallback for local development, where there is no Secrets Manager. */
    @Value("${firebase.service-account-path:}")
    private String serviceAccountPath;

    @Value("${firebase.enabled:true}")
    private boolean enabled;

    private volatile boolean ready = false;

    @PostConstruct
    void init() {
        if (!enabled) {
            log.info("Push disabled (firebase.enabled=false). Notifications will be stored but not delivered.");
            return;
        }
        boolean haveJson = serviceAccountJson != null && !serviceAccountJson.isBlank();
        boolean havePath = serviceAccountPath != null && !serviceAccountPath.isBlank();

        if (!haveJson && !havePath) {
            log.warn("No Firebase credentials configured - push delivery is off. "
                    + "Notifications are still saved and visible in-app.");
            return;
        }

        try {
            if (!FirebaseApp.getApps().isEmpty()) {
                ready = true;
                return;
            }

            // JSON from the secret wins. The file path is only for local runs.
            try (InputStream credentials = haveJson
                    ? new ByteArrayInputStream(serviceAccountJson.getBytes(StandardCharsets.UTF_8))
                    : new FileInputStream(serviceAccountPath)) {

                FirebaseOptions options = FirebaseOptions.builder()
                        .setCredentials(GoogleCredentials.fromStream(credentials))
                        .build();
                FirebaseApp.initializeApp(options);
            }

            ready = true;
            log.info("Firebase initialised from {} - push delivery is active.",
                    haveJson ? "Secrets Manager" : serviceAccountPath);

        } catch (Exception e) {
            // Bad credentials must not stop the application from booting;
            // everything except push still works.
            log.error("Firebase init failed, push delivery is off: {}", e.getMessage());
        }
    }

    public boolean isReady() {
        return ready;
    }

    /**
     * Deliver to every device the user has registered.
     *
     * Runs async so a slow or unreachable FCM never holds up the HTTP request
     * that triggered it - liking a profile should not wait on a push.
     */
    @Async
    public void sendToUser(Integer userId, String title, String body, Map<String, String> data) {
        if (!ready) return;

        List<DeviceToken> devices = deviceTokenRepository.findByUserId(userId);
        if (devices.isEmpty()) return;

        List<String> tokens = devices.stream().map(DeviceToken::getToken).toList();
        sendMulticast(tokens, title, body, data);
    }

    /**
     * Subscribe a device to a topic so it receives broadcasts.
     *
     * Done server-side deliberately. expo-notifications does not expose FCM's
     * topic APIs, and pulling in @react-native-firebase/messaging purely to call
     * subscribeToTopic would add a second Firebase SDK to the app. Firebase Admin
     * can subscribe tokens directly, so the client only ever has to hand us its
     * token - which it already does on login.
     */
    @Async
    public void subscribeToTopic(String token, String topic) {
        if (!ready || token == null || token.isBlank()) return;

        try {
            TopicManagementResponse response =
                    FirebaseMessaging.getInstance().subscribeToTopic(List.of(token), topic);
            if (response.getFailureCount() > 0) {
                log.warn("Topic subscribe failed for '{}': {}", topic, response.getErrors());
            }
        } catch (FirebaseMessagingException e) {
            // Not fatal: the device still receives its own targeted notifications,
            // it just misses broadcasts until the next registration.
            log.warn("Could not subscribe token to '{}': {}", topic, e.getMessage());
        }
    }

    /**
     * Broadcast to a topic, e.g. "all-users" for a festival offer.
     *
     * One call regardless of how many devices are subscribed - the reason topics
     * are worth using over fanning out across every stored token.
     */
    @Async
    public void sendToTopic(String topic, String title, String body, Map<String, String> data) {
        if (!ready) return;

        Message message = Message.builder()
                .setTopic(topic)
                .setNotification(notification(title, body))
                .putAllData(safeData(data))
                .setAndroidConfig(androidConfig())
                .build();

        try {
            FirebaseMessaging.getInstance().send(message);
            log.info("Broadcast sent to topic '{}'", topic);
        } catch (FirebaseMessagingException e) {
            log.error("Broadcast to topic '{}' failed: {}", topic, e.getMessage());
        }
    }

    /**
     * Broadcasts to all users across FCM topic ("all-users") and direct multicast
     * to all registered devices (excluding the creator/actor if specified).
     */
    @Async
    public void sendToAllDevices(String title, String body, Map<String, String> data, Integer excludeUserId) {
        if (!ready) return;

        // 1. Topic broadcast (reaches all background/foreground apps subscribed to all-users)
        sendToTopic(NotificationServiceImpl.DEFAULT_TOPIC, title, body, data);

        // 2. Direct multicast to all distinct device tokens
        try {
            List<String> tokens = excludeUserId != null
                    ? deviceTokenRepository.findAllTokensExceptUser(excludeUserId)
                    : deviceTokenRepository.findAllTokens();

            if (tokens != null && !tokens.isEmpty()) {
                sendMulticast(tokens, title, body, data);
            }
        } catch (Exception e) {
            log.warn("Direct multicast to all tokens encountered an issue: {}", e.getMessage());
        }
    }

    /**
     * Multicast in chunks, pruning tokens FCM reports as dead.
     *
     * Stale tokens accumulate every time an app is uninstalled. Left alone they
     * grow into the majority of the table and every send wastes work on them, so
     * UNREGISTERED and INVALID_ARGUMENT responses delete the row.
     */
    private void sendMulticast(List<String> tokens, String title, String body, Map<String, String> data) {
        for (int start = 0; start < tokens.size(); start += MULTICAST_LIMIT) {
            List<String> chunk = tokens.subList(start, Math.min(start + MULTICAST_LIMIT, tokens.size()));

            MulticastMessage message = MulticastMessage.builder()
                    .addAllTokens(chunk)
                    .setNotification(notification(title, body))
                    .putAllData(safeData(data))
                    .setAndroidConfig(androidConfig())
                    .build();

            try {
                BatchResponse response = FirebaseMessaging.getInstance().sendEachForMulticast(message);
                if (response.getFailureCount() > 0) {
                    pruneDeadTokens(chunk, response);
                }
            } catch (FirebaseMessagingException e) {
                log.error("Push multicast failed: {}", e.getMessage());
            }
        }
    }

    private void pruneDeadTokens(List<String> chunk, BatchResponse response) {
        List<String> dead = new ArrayList<>();
        List<SendResponse> responses = response.getResponses();

        for (int i = 0; i < responses.size(); i++) {
            SendResponse r = responses.get(i);
            if (r.isSuccessful()) continue;

            MessagingErrorCode code = r.getException() == null
                    ? null
                    : r.getException().getMessagingErrorCode();

            if (code == MessagingErrorCode.UNREGISTERED || code == MessagingErrorCode.INVALID_ARGUMENT) {
                dead.add(chunk.get(i));
            }
        }

        for (String token : dead) {
            try {
                deviceTokenRepository.deleteByToken(token);
            } catch (Exception e) {
                log.warn("Could not remove dead token: {}", e.getMessage());
            }
        }
        if (!dead.isEmpty()) {
            log.info("Removed {} dead device token(s)", dead.size());
        }
    }

    private com.google.firebase.messaging.Notification notification(String title, String body) {
        return com.google.firebase.messaging.Notification.builder()
                .setTitle(title)
                .setBody(body)
                .build();
    }

    /** FCM data values must all be non-null strings. */
    private Map<String, String> safeData(Map<String, String> data) {
        Map<String, String> out = new HashMap<>();
        if (data != null) {
            data.forEach((k, v) -> {
                if (k != null && v != null) out.put(k, v);
            });
        }
        return out;
    }

    private AndroidConfig androidConfig() {
        return AndroidConfig.builder()
                .setPriority(AndroidConfig.Priority.HIGH)
                .setNotification(
                        AndroidNotification.builder()
                                .setChannelId("default")
                                .setSound("default")
                                .build()
                )
                .build();
    }
}

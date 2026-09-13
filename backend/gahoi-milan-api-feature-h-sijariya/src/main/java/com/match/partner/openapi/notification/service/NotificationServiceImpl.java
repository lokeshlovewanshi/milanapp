package com.match.partner.openapi.notification.service;

import com.match.partner.common.Utils.CommonUtils;
import com.match.partner.openapi.notification.model.NotificationType;
import com.match.partner.openapi.notification.model.dao.DeviceToken;
import com.match.partner.openapi.notification.model.dao.Notification;
import com.match.partner.openapi.notification.model.dto.BroadcastBody;
import com.match.partner.openapi.notification.model.dto.NotificationDto;
import com.match.partner.openapi.notification.repository.DeviceTokenRepository;
import com.match.partner.openapi.notification.repository.NotificationRepository;
import com.match.partner.openapi.user.model.dao.UserProfile;
import com.match.partner.openapi.user.repository.UserProfileRepository;
import com.match.partner.openapi.user.model.UserProfileMapper;
import java.util.function.Function;
import java.util.stream.Collectors;
import java.util.Objects;
import java.util.Set;
import jakarta.persistence.EntityNotFoundException;
import lombok.RequiredArgsConstructor;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;

@Service
@RequiredArgsConstructor
public class NotificationServiceImpl implements NotificationServiceInterface {

    private static final Logger log = LoggerFactory.getLogger(NotificationServiceImpl.class);

    /** Topic every device subscribes to on launch, used for festival offers. */
    public static final String DEFAULT_TOPIC = "all-users";

    private final NotificationRepository notificationRepository;
    private final DeviceTokenRepository deviceTokenRepository;
    private final UserProfileRepository userProfileRepository;
    private final UserProfileMapper userProfileMapper;
    private final PushService pushService;
    private final CommonUtils commonUtils;

    private Integer userIdOf(String userName) {
        return userProfileRepository.findByEmail(userName)
                .map(UserProfile::getId)
                .orElseThrow(() -> new EntityNotFoundException("User not found: " + userName));
    }

    /**
     * Store the device's push token against the signed-in user.
     *
     * Upsert by token rather than insert, because FCM reissues the same token to
     * whichever account is now on the device. Reassigning the existing row stops
     * a previous owner from continuing to receive the new owner's pushes.
     */
    @Override
    @Transactional
    public void registerToken(String userName, String token, String platform) {
        if (token == null || token.isBlank()) return;

        Integer userId = userIdOf(userName);
        LocalDateTime now = LocalDateTime.now();

        DeviceToken row = deviceTokenRepository.findByToken(token).orElseGet(() -> {
            DeviceToken fresh = new DeviceToken();
            fresh.setToken(token);
            fresh.setCreatedAt(now);
            return fresh;
        });

        row.setUserId(userId);
        row.setPlatform(platform == null ? "android" : platform);
        row.setUpdatedAt(now);
        deviceTokenRepository.save(row);

        // Subscribe here rather than in the app: expo-notifications has no topic
        // API, and re-subscribing on every registration is idempotent, so this
        // also self-heals devices that missed an earlier subscribe.
        pushService.subscribeToTopic(token, DEFAULT_TOPIC);
    }

    @Override
    @Transactional
    public void unregisterToken(String token) {
        if (token == null || token.isBlank()) return;
        deviceTokenRepository.deleteByToken(token);
    }

    @Override
    public Page<NotificationDto> list(String userName, int page, int size) {
        Integer userId = userIdOf(userName);
        Page<Notification> rows = notificationRepository
                .findByUserIdOrderByCreatedAtDesc(userId, PageRequest.of(page, size));

        // One lookup for the whole page rather than one per row. Building a
        // presigned URL per actor is the expensive part, so distinct ids also
        // matter: ten "viewed your profile" notifications from the same person
        // should cost one.
        Set<Integer> actorIds = rows.getContent().stream()
                .map(Notification::getActorId)
                .filter(Objects::nonNull)
                .collect(Collectors.toSet());

        Map<Integer, UserProfile> actors = actorIds.isEmpty()
                ? Map.of()
                : userProfileRepository.findVisibleByIdIn(actorIds).stream()
                        .collect(Collectors.toMap(UserProfile::getId, Function.identity()));

        return rows.map(n -> toDto(n, actors));
    }

    @Override
    public long unreadCount(String userName) {
        return notificationRepository.countByUserIdAndReadAtIsNull(userIdOf(userName));
    }

    @Override
    @Transactional
    public void markAllRead(String userName) {
        notificationRepository.markAllRead(userIdOf(userName), LocalDateTime.now());
    }

    /**
     * Persist first, push second.
     *
     * The row is the source of truth for the in-app bell, so it must survive a
     * push failure. PushService is @Async and swallows its own errors, so a dead
     * token or an unreachable Firebase cannot roll back the caller's transaction.
     */
    @Override
    @Transactional
    public void notifyUser(Integer recipientId, NotificationType type, String title, String body, Integer actorId) {
        if (recipientId == null) return;

        Notification row = new Notification();
        row.setUserId(recipientId);
        row.setType(type);
        row.setTitle(title);
        row.setBody(body);
        row.setActorId(actorId);
        row.setCreatedAt(LocalDateTime.now());
        notificationRepository.save(row);

        // A profile view stays in the bell only - no push. Someone browsing
        // profiles generates one of these on every stranger's screen they open,
        // and a phone popping up each time turns ordinary browsing into a push
        // storm for whoever they are looking at. LIKE_RECEIVED, LIKE_ACCEPTED
        // and MESSAGE are still worth interrupting someone's phone for; a view
        // is not.
        if (type == NotificationType.PROFILE_VIEW) return;

        Map<String, String> data = new HashMap<>();
        data.put("type", type.name());
        if (actorId != null) {
            data.put("actorId", commonUtils.convertToJMFormat(actorId));
        }

        try {
            pushService.sendToUser(recipientId, title, body, data);
        } catch (Exception e) {
            log.warn("Push dispatch failed for user {}: {}", recipientId, e.getMessage());
        }
    }

    /**
     * Festival announcement.
     *
     * Sends to an FCM topic, so this is a single call regardless of user count -
     * the reason topics exist. Optionally also writes a feed row per user so the
     * announcement survives in the bell for anyone whose device was off.
     */
    @Override
    @Transactional
    public void broadcast(BroadcastBody body) {
        String topic = (body.getTopic() == null || body.getTopic().isBlank())
                ? DEFAULT_TOPIC
                : body.getTopic();

        Map<String, String> data = new HashMap<>();
        data.put("type", NotificationType.BROADCAST.name());
        if (body.getLink() != null) data.put("link", body.getLink());

        pushService.sendToTopic(topic, body.getTitle(), body.getBody(), data);

        if (body.isSaveToFeed()) {
            LocalDateTime now = LocalDateTime.now();
            List<UserProfile> all = userProfileRepository.findAll();
            List<Notification> rows = all.stream().map(user -> {
                Notification n = new Notification();
                n.setUserId(user.getId());
                n.setType(NotificationType.BROADCAST);
                n.setTitle(body.getTitle());
                n.setBody(body.getBody());
                n.setCreatedAt(now);
                return n;
            }).toList();
            notificationRepository.saveAll(rows);
            log.info("Broadcast written to {} feeds", rows.size());
        }
    }

    @Override
    @Transactional
    public void sendSingleUserNotification(Integer recipientId, String title, String body, String link) {
        if (recipientId == null) return;

        Notification n = new Notification();
        n.setUserId(recipientId);
        n.setType(NotificationType.BROADCAST);
        n.setTitle(title);
        n.setBody(body);
        n.setCreatedAt(LocalDateTime.now());
        notificationRepository.save(n);

        Map<String, String> data = new HashMap<>();
        data.put("type", NotificationType.BROADCAST.name());
        if (link != null && !link.isBlank()) {
            data.put("link", link.trim());
        }

        try {
            pushService.sendToUser(recipientId, title, body, data);
        } catch (Exception e) {
            log.warn("Direct push dispatch failed for user {}: {}", recipientId, e.getMessage());
        }
    }

    /**
     * Sends a high-priority push notification and feed notification to all users
     * whenever a new profile is verified and approved.
     */
    @Override
    @Transactional
    public void notifyAllOnNewProfileVerified(UserProfile profile) {
        if (profile == null || profile.getId() == null) return;

        String name = profile.getName() != null && !profile.getName().isBlank()
                ? profile.getName().trim()
                : "New Member";

        String gmId = commonUtils.convertToJMFormat(profile.getId());

        // Calculate Age if DOB is present
        String ageStr = "";
        if (profile.getDateOfBirth() != null) {
            try {
                int age = java.time.Period.between(profile.getDateOfBirth().toLocalDate(), java.time.LocalDate.now()).getYears();
                if (age > 0 && age < 120) {
                    ageStr = age + " yrs";
                }
            } catch (Exception ignored) {}
        }

        String location = "";
        if (profile.getCity() != null && !profile.getCity().isBlank()) {
            location = profile.getCity().trim();
        } else if (profile.getWorkCity() != null && !profile.getWorkCity().isBlank()) {
            location = profile.getWorkCity().trim();
        }

        List<String> details = new java.util.ArrayList<>();
        if (!ageStr.isBlank()) details.add(ageStr);
        if (!location.isBlank()) details.add(location);
        if (profile.getProfession() != null && !profile.getProfession().isBlank()) {
            details.add(profile.getProfession().replace("_", " ").trim());
        }

        String detailSuffix = details.isEmpty() ? "" : " (" + String.join(", ", details) + ")";

        String title = "🌸 New Verified Profile / नया रिश्ता जुड़ा";
        String body = "✨ " + name + detailSuffix + " joined Lovewanshi Parinay. Tap to view profile.";

        Map<String, String> data = new HashMap<>();
        data.put("type", NotificationType.PROFILE_VERIFIED.name());
        data.put("profileId", String.valueOf(profile.getId()));
        data.put("actorId", gmId);
        data.put("link", "/profile-detail/" + profile.getId());

        // 1. High-priority Push to ALL devices (Android system tray receives it even when app is closed)
        try {
            pushService.sendToAllDevices(title, body, data, profile.getId());
            log.info("Push notification for new verified profile {} dispatched to all users", gmId);
        } catch (Exception e) {
            log.warn("Could not push new verified profile notification to all devices: {}", e.getMessage());
        }

        // 2. Persist in-app notification to the bell feed of all other active users
        try {
            LocalDateTime now = LocalDateTime.now();
            List<UserProfile> allUsers = userProfileRepository.findAll();
            List<Notification> feedRows = allUsers.stream()
                    .filter(u -> u.getId() != null && !u.getId().equals(profile.getId()) && u.getDeletedAt() == null)
                    .map(user -> {
                        Notification n = new Notification();
                        n.setUserId(user.getId());
                        n.setType(NotificationType.PROFILE_VERIFIED);
                        n.setTitle(title);
                        n.setBody(body);
                        n.setActorId(profile.getId());
                        n.setCreatedAt(now);
                        return n;
                    })
                    .toList();

            if (!feedRows.isEmpty()) {
                notificationRepository.saveAll(feedRows);
                log.info("Saved new verified profile notification for {} to {} users' feeds", gmId, feedRows.size());
            }
        } catch (Exception e) {
            log.warn("Could not save new verified profile notifications to DB feeds: {}", e.getMessage());
        }
    }

    private NotificationDto toDto(Notification n) {
        return toDto(n, Map.of());
    }

    private NotificationDto toDto(Notification n, Map<Integer, UserProfile> actors) {
        NotificationDto dto = new NotificationDto();
        dto.setId(n.getId());
        dto.setType(n.getType().name());
        dto.setTitle(n.getTitle());
        dto.setBody(n.getBody());
        dto.setActorId(n.getActorId() == null ? null : commonUtils.convertToJMFormat(n.getActorId()));
        dto.setRead(n.getReadAt() != null);
        dto.setCreatedAt(n.getCreatedAt());

        UserProfile actor = n.getActorId() == null ? null : actors.get(n.getActorId());
        if (actor != null) {
            dto.setActorName(actor.getName());
            // Reuses the feed's mapper so the rail, the feed and this screen all
            // resolve a profile photo the same way - including the fallback to
            // the first attachment when none is marked primary.
            dto.setActorImage(userProfileMapper.toUserDto(actor).getProfileImage());
        }
        return dto;
    }
}

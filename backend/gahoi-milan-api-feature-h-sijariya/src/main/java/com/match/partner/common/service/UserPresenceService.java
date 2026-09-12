package com.match.partner.common.service;

import org.springframework.stereotype.Service;

import java.time.Duration;
import java.time.Instant;
import java.util.concurrent.ConcurrentHashMap;

/**
 * In-memory presence tracker for user online status.
 *
 * If any API is called by an authenticated user, their activity timestamp is recorded here.
 * If the user called any API within the last 5 minutes, they are reported as online.
 */
@Service
public class UserPresenceService {

    private static final long ONLINE_THRESHOLD_MINUTES = 5;

    // Stores email/userId (in lowercase) -> Instant of last activity
    private final ConcurrentHashMap<String, Instant> lastActiveMap = new ConcurrentHashMap<>();

    /**
     * Records active presence for a given user email or ID.
     */
    public void recordActive(String identifier) {
        if (identifier != null && !identifier.isBlank()) {
            lastActiveMap.put(identifier.toLowerCase().trim(), Instant.now());
        }
    }

    /**
     * Checks if the user was active in the last 5 minutes.
     */
    public boolean isOnline(String identifier) {
        if (identifier == null || identifier.isBlank()) {
            return false;
        }
        Instant lastActive = lastActiveMap.get(identifier.toLowerCase().trim());
        if (lastActive == null) {
            return false;
        }
        return Duration.between(lastActive, Instant.now()).toMinutes() < ONLINE_THRESHOLD_MINUTES;
    }

    /**
     * Checks if the user is online by either email or user ID object.
     */
    public boolean isOnline(String email, Object userId) {
        if (isOnline(email)) {
            return true;
        }
        if (userId != null && isOnline(String.valueOf(userId))) {
            return true;
        }
        return false;
    }
}

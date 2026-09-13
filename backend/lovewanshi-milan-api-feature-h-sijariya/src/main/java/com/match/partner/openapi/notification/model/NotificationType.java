package com.match.partner.openapi.notification.model;

/** What a notification is about. Drives the icon and tap target in the app. */
public enum NotificationType {
    /** Someone sent you a connection request. */
    LIKE_RECEIVED,
    /** Someone accepted the request you sent. */
    LIKE_ACCEPTED,
    /** Someone viewed your profile. */
    PROFILE_VIEW,
    /** New chat message while you were away. */
    MESSAGE,
    /** Festival offer or announcement sent to everyone. */
    BROADCAST,
    /** Profile was verified and approved by admin. */
    PROFILE_VERIFIED
}

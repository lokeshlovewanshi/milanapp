package com.match.partner.openapi.notification.model.dto;

import lombok.Data;

/** Payload for a festival announcement, e.g. a Diwali offer. */
@Data
public class BroadcastBody {
    private String title;
    private String body;
    /** Defaults to "all-users" when omitted. */
    private String topic;
    /** Optional deep link the app opens on tap. */
    private String link;
    /**
     * When true the announcement is also written to every user's in-app feed.
     * Off by default: at 1,000 users that is 1,000 inserts per broadcast, which
     * is fine, but it is a choice rather than a surprise.
     */
    private boolean saveToFeed;
}

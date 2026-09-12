package com.match.partner.openapi.admin.model.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.io.Serializable;

/**
 * In-memory cached representation of a featured story.
 *
 * Stores profile metadata and the raw S3 photo filename.
 * Deliberately excludes presigned URLs so image URLs are signed fresh per request
 * rather than going stale while cached in memory.
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class CachedFeaturedStory implements Serializable {
    private static final long serialVersionUID = 1L;

    private Integer id;
    private Integer userProfileId;
    private String displayId;
    private String name;
    private String photoFileName;
    private Integer sortOrder;
    private String note;
    private Long viewsCount;
    private Long connectsCount;
}

package com.match.partner.openapi.admin.model.dto;

import lombok.Data;

@Data
public class AddFeaturedStoryRequest {
    /** Raw numeric profile id - the admin panel strips any letters typed with it. */
    private Integer profileId;
    private Integer sortOrder;
    private String note;
}

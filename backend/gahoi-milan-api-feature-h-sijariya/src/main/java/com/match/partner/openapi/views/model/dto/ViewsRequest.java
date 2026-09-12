package com.match.partner.openapi.views.model.dto;

import lombok.Data;

@Data
public class ViewsRequest {
    private Integer profileId; // Profile being viewed
    private Integer viewedBy;  // User viewing the profile
}

package com.match.partner.openapi.admin.model.dto;

import lombok.Data;

@Data
public class FeaturedStoryDTO {
    private Integer id;
    private Integer userProfileId;
    private String displayId;
    private String name;
    private String profileImage;
    private Integer sortOrder;
    private String note;
    private Long viewsCount;
    private Long connectsCount;
}

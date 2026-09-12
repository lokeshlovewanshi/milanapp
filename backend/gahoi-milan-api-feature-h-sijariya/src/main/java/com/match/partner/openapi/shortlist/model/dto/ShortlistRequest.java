package com.match.partner.openapi.shortlist.model.dto;

import lombok.Data;

@Data
public class ShortlistRequest {
    private Integer profileId;       // ID of the user performing the shortlist
    private Integer shortlistedId;   // ID of the user being shortlisted
}

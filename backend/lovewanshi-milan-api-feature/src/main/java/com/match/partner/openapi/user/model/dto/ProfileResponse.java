package com.match.partner.openapi.user.model.dto;

import lombok.Data;

@Data
public class ProfileResponse {
    private String id;
    private String email;
    private boolean verified_email;
    private String name;
    private String given_name;
    private String family_name;
    private String picture;

}

package com.match.partner.openapi.admin.model.dto;

import lombok.Data;

@Data
public class AdminLoginResponse {
    private String token;
    private String name;
    private String email;
}

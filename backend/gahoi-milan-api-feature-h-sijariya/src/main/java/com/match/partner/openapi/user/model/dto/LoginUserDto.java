package com.match.partner.openapi.user.model.dto;

import lombok.Data;

@Data

public class LoginUserDto {
    private String email;
    private String password;
}
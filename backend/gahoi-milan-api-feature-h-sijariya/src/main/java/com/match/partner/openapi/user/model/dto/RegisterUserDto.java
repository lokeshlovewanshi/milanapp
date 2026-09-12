package com.match.partner.openapi.user.model.dto;

import jakarta.persistence.Entity;
import lombok.Data;

@Data
public class RegisterUserDto {
    private String mobileNo;
    private String name;
    private String email;
    private String password;
}

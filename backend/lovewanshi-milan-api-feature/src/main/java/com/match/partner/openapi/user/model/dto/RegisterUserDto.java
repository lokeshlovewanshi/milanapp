package com.match.partner.openapi.user.model.dto;

import lombok.Data;

@Data
public class RegisterUserDto {
    private String mobileNo;
    private String name;
    private String email;
    private String password;
    private String gender;
    private String maritalStatus;
    private String dateOfBirth;
    private String gotra;
    private String state;
    private String city;
    private String profileCreatedBy;
    private String profession;
    private String education;
}

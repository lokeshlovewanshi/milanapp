package com.match.partner.openapi.user.model.dto;

import lombok.Data;

@Data
public class ContactInfoDTO {
    private String mobileNo;
    private String whatsappNo;
    private String city;
    private String state;
    private String country;
    private String presentAddress;
    private String permanentAddress;
}

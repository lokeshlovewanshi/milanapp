package com.match.partner.openapi.user.model.dto;

import com.fasterxml.jackson.databind.annotation.JsonDeserialize;
import com.match.partner.common.configuration.JacksonConfig;
import lombok.Data;

import java.time.LocalDateTime;

@Data
public class ProfileRegistrationDto {

    private String gender;
    private String profileCreatedBy;
    private String name;
    private String mobileNo;

    @JsonDeserialize(using = JacksonConfig.FlexibleLocalDateTimeDeserializer.class)
    private LocalDateTime dateOfBirth;
    private String aakna;
    private String country;
    private String state;
    private String city;

}

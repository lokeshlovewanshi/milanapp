package com.match.partner.openapi.user.model.dto;

import com.fasterxml.jackson.databind.annotation.JsonDeserialize;
import com.match.partner.common.configuration.JacksonConfig;
import lombok.Data;
import java.time.LocalDateTime;

@Data
public class BasicInfoDTO {
    private String name;

    /**
     * Asked for on this screen rather than at sign-up, where it was mandatory
     * and is now not collected at all. The column is shared with the contact
     * section, which also edits it - both PATCH the same field, and whichever
     * screen you used last wins, which is the behaviour you would expect.
     */
    private String mobileNo;
    private String profileCreatedBy;
    private String gender;
    private String maritalStatus;

    @JsonDeserialize(using = JacksonConfig.FlexibleLocalDateTimeDeserializer.class)
    private LocalDateTime dateOfBirth;
    private String height;
    private Integer weight;
    private String complexion;
    private String bloodGroup;
    private String diet;
    private String disability;
}

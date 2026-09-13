package com.match.partner.openapi.admin.model.dto;

import com.fasterxml.jackson.annotation.JsonAlias;
import com.fasterxml.jackson.databind.annotation.JsonDeserialize;
import com.match.partner.common.configuration.JacksonConfig;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;
import java.util.List;

/**
 * The single-profile view, richer than AdminProfileSummaryDTO - an admin
 * opening one profile is deciding whether it's a real person, which needs
 * photos and enough identifying detail to make that call.
 */
@Data
public class AdminProfileDetailDTO {
    private Integer id;
    private String displayId;
    private String name;
    private String gender;
    private String maritalStatus;

    @JsonDeserialize(using = JacksonConfig.FlexibleLocalDateTimeDeserializer.class)
    private LocalDateTime dateOfBirth;
    private String height;
    private String city;
    private String state;
    private String education;
    private String profession;
    private String aboutMyself;
    private String email;
    private String mobileNo;
    private List<String> photos;
    private List<AdminPhotoDTO> photoDetails;
    private LocalDateTime createdAt;
    private Boolean verified;
    private Boolean blocked;
    private Boolean hidden;

    @Data
    @AllArgsConstructor
    @NoArgsConstructor
    public static class AdminPhotoDTO {
        private Integer id;
        private String url;
        private Boolean isPrimary;
    }

    // Remaining fields an admin can edit via PATCH /{id} - see
    // AdminProfileService.update. Kept flat rather than nested to mirror
    // UserProfileDTO, which the edit form's payload is shaped after.
    private String complexion;
    private Integer weight;
    private String diet;
    private String disability;
    private String bloodGroup;
    private String country;
    private String town;
    private String fathersContactNo;
    private String whatsappNo;
    private String presentAddress;
    private String permanentAddress;
    private String gotra;
    private String aakna;
    private String motherTongue;
    private String timeOfBirth;
    private String placeOfBirth;
    private String zodiac;
    private String fathersName;
    private String fathersOccupation;
    private String mothersName;
    private String mothersOccupation;
    private Integer marriedBrothers;
    private Integer unmarriedBrothers;
    private Integer marriedSisters;
    private Integer unmarriedSisters;
    private String maternalUnclesName;
    @JsonAlias({"maternalUnclesAakna", "maternalUnclesGotra"})
    private String maternalUnclesGotra;
    private String houseStatus;
    private String carStatus;
    private String educationDetails;
    private String occupationDetails;
    private String annualIncome;
    private String nakshatra;
    private String partnerPreferences;
    private String manglik;
    private String workCity;
    private String employedIn;
    private String organization;

    public String getMaternalUnclesAakna() {
        return this.maternalUnclesGotra;
    }

    public void setMaternalUnclesAakna(String aakna) {
        this.maternalUnclesGotra = aakna;
    }
}

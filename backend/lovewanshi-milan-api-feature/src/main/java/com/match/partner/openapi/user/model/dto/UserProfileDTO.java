package com.match.partner.openapi.user.model.dto;

import jakarta.persistence.Entity;
import lombok.Data;

import com.fasterxml.jackson.annotation.JsonAlias;
import com.fasterxml.jackson.databind.annotation.JsonDeserialize;
import com.match.partner.common.configuration.JacksonConfig;

import java.time.LocalDateTime;
import java.util.List;

@Data
public class UserProfileDTO {
    private String name;
    private String id;
    private String maritalStatus;
    private String gender;
    private String complexion;
    private String height;
    private Integer weight;
    private String diet;
    private String disability;
    private String bloodGroup;
    private String profileCreatedBy;
    private String country;
    private String state;
    private String city;
    private String town;
    private String mobileNo;
    private String fathersContactNo;
    private String whatsappNo;
    private String email;
    private String presentAddress;
    private String permanentAddress;
    private String gotra;
    private String aakna;
    private String motherTongue;

    @JsonDeserialize(using = JacksonConfig.FlexibleLocalDateTimeDeserializer.class)
    private LocalDateTime dateOfBirth;
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
    private String education;
    private String educationDetails;
    private String occupationDetails;
    private String annualIncome;

    private String nakshatra;
    private String aboutMyself;
    private String partnerPreferences;
    private String manglik;
    private String profession;
    private String status;

    private String workCity;
    private String employedIn;
    private String organization;
    private LocalDateTime occupationStartDate;
    private LocalDateTime lastActive;

    /**
     * How complete this profile is, 0-100. Read from the entity, where it is
     * recalculated on every save - the client must not try to derive it from
     * the fields below, because the weights live in profile_completion_weight
     * and change without an app release.
     */
    private Integer profileCompletion;

    /**
     * False for a Google account that has never been given a password, so
     * Account Settings can offer "Create Password" instead of "Change
     * Password" - and skip asking for a current password nobody ever chose.
     */
    private boolean passwordSet;

    /** False when the signup address has never been confirmed by code. */
    private boolean emailVerified;

    /**
     * Whether the member has hidden their own profile.
     *
     * Returned so the app can show the visibility toggle in the state the
     * server actually holds, rather than defaulting to "visible" on every
     * launch and lying to someone who hid their profile last week.
     */
    private Boolean hidden;

    /** Checked by an admin. Drives the blue tick on the profile screen. */
    private Boolean verified;

    private String profileImage;
    private List<String> profileImages;
    private List<ProfileImageDto> profileImageDetails;
    private Boolean isLiked;
    private String likeStatus; // PENDING / ACCEPTED / REJECTED / null
    private Boolean isShortlisted;
    /** True only for the owner or an accepted connection; controls contact UI. */
    private Boolean contactDetailsVisible;
    private Boolean isOnline;
    private Boolean online;

    public String getMaternalUnclesAakna() {
        return this.maternalUnclesGotra;
    }

    public void setMaternalUnclesAakna(String aakna) {
        this.maternalUnclesGotra = aakna;
    }
}

package com.match.partner.openapi.user.model.dto;

import lombok.Data;

import java.time.LocalDateTime;

@Data
public class UserDto {
    private String name;
    private String gender;
    private String height;
    private String id;
    private String presentAddress;
    private String permanentAddress;
    private LocalDateTime dateOfBirth;
    private String email;
    private String profession;
    private String gotra;
    private String zodiac;
    private Boolean isOnline;
    private Boolean online;
    private String annualIncome;
    private String education;
    /** Thumbnail (~4KB) - what a small round avatar or a list row should use. */
    private String profileImage;

    /**
     * Full-resolution original - for the few contexts a photo is shown large
     * enough to be worth the extra bytes: the home rail's portrait card, the
     * swipe deck, the full-screen feed photo.
     */
    private String profileImageFull;

    /**
     * City and state, for the location line on a listing card.
     *
     * Both are columns on the entity and were simply never mapped, so every
     * card that wanted to say where someone lives had nothing to print.
     */
    private String city;
    private String state;

    /** Drives the "New" badge on the home rails. */
    private LocalDateTime createdAt;
    private Boolean isLiked;
    private String likeStatus; // PENDING / ACCEPTED / REJECTED / null
    private Boolean isShortlisted;

    /** Checked by an admin. Drives the blue tick on listing cards. */
    private Boolean verified;

    /** Total views on this profile. */
    private Long viewsCount;

    /** Total connections/interests received by this profile. */
    private Long connectsCount;
}

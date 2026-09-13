package com.match.partner.openapi.user.model.dao;

import com.match.partner.common.Utils.NameFormatter;
import com.match.partner.common.Utils.TimeFormatter;
import jakarta.persistence.*;
import lombok.Data;
import org.hibernate.annotations.DynamicUpdate;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.core.userdetails.UserDetails;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.Collection;

/**
 * DynamicUpdate matters here specifically because the profile is edited in
 * sections - basic, religion, family, contact... - each PATCHing only its own
 * few columns while loading a full fresh copy of the row. Two sections saved
 * close together (see kundali.tsx, which fires the basic and religion PATCHes
 * together) each hold a snapshot from before the other's write landed.
 * Without this, Hibernate's default UPDATE writes every mapped column from
 * that stale snapshot, and whichever save commits second silently overwrites
 * the columns the first one had just set. DynamicUpdate writes only the
 * columns that changed on each entity, which removes the overlap entirely.
 */
@Entity
@DynamicUpdate
@Table(name = "UserProfile")
@Data
public class UserProfile implements UserDetails {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Integer id;
    private String name;
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
    private String mobileNumber;
    private String fathersContactNumber;
    private String whatsappNumber;
    private String email;
    private String presentAddress;
    private String permanentAddress;
    private String gotra;
    private String aakna;
    private String motherTongue;
    private LocalDateTime dateOfBirth;
    private String timeOfBirth;

    /**
     * Signup time, used to order every listing newest-first.
     *
     * Set once on insert and never touched again - @PreUpdate must leave it
     * alone, or editing a profile would jump it back to the top of the feed.
     */
    @Column(name = "created_at", updatable = false)
    private LocalDateTime createdAt;
    private String placeOfBirth;
    private String zodiac;
    private String fathersName;
    private String fathersOccupation;
    private String mothersName;
    private String mothersOccupation;
    private Integer noOfMarriedBrothers;
    private Integer noOfUnmarriedBrothers;
    private Integer noOfMarriedSisters;
    private Integer noOfUnmarriedSisters;
    private String maternalUnclesName;
    @Column(name = "maternal_uncles_gotra")
    private String maternalUnclesGotra;
    private String houseStatus;
    private String carStatus;
    private String education;
    private String educationDetail;
    private String occupationDetail;
    private String annualIncome;
    private String password;

    /**
     * False when the account was created by Google sign-in and has never been
     * given a password.
     *
     * Google accounts still get a hash - a random UUID - so `password` alone
     * cannot answer "does this person know their password?". Without that
     * answer the app cannot decide whether to ask for the current password
     * before setting a new one. See sql/2026-08-08_password_set.sql.
     */
    @Column(name = "password_set", nullable = false)
    private boolean passwordSet = true;

    /**
     * Has this member confirmed the address they signed up with?
     *
     * True for a Google account at creation - Google verified it already, and
     * asking someone to confirm an address they just proved they control is
     * friction with nothing behind it. See sql/2026-08-08_email_otp.sql for why
     * existing rows default to true.
     */
    @Column(name = "email_verified", nullable = false)
    private boolean emailVerified = false;

    private String profession;
    private String nakshatra;
    private String aboutMyself;
    private String partnerPreferences;
    private String manglik;
    private String workCity;
    private String employedIn;
    private String organization;
    private LocalDateTime occupationStartDate;
    private LocalDateTime lastActive;

    /**
     * 0-100, maintained by ProfileCompletionCalculator.
     *
     * Stored rather than derived: it appears on the profile header and in
     * listings, so recomputing it per request would mean reading every column
     * of every profile just to render a percentage.
     */
    @Column(name = "profile_completion", nullable = false)
    private Integer profileCompletion = 0;

    @Column(name = "profile_completion_updated_at")
    private LocalDateTime profileCompletionUpdatedAt;
    @Enumerated(EnumType.STRING) // Ensure the enum is stored as a String
    @Column(name = "status", nullable = false)
    private Status status;

    /**
     * The member has hidden their own profile from listings.
     *
     * Separate from {@link #status}, which is moderation state. Folding "hidden"
     * into that enum would make it indistinguishable from "not yet approved",
     * so unhiding would have to guess which approval state to restore.
     *
     * Reversible and entirely the member's choice: the account, photos and
     * connections all stay intact while hidden.
     */
    @Column(name = "hidden", nullable = false)
    private Boolean hidden = false;

    /**
     * Checked by an admin, not by the member or an algorithm.
     *
     * The blue tick used to be shown unconditionally with a comment saying
     * verification "will be done by a human" once there was a screen for one
     * to do it on - this is that flag. Existing rows were backfilled to true
     * by the migration that added this column; only new rows start false.
     */
    @Column(name = "verified", nullable = false)
    private Boolean verified = false;

    /**
     * Soft delete. Null means live.
     *
     * A timestamp rather than a flag because "when" is what a grace period, a
     * support question, and a later purge job all need.
     *
     * The row survives because likes, shortlists, views and notifications all
     * reference this id - a hard delete would either fail on the foreign keys
     * or cascade away other members' history.
     */
    @Column(name = "deleted_at")
    private LocalDateTime deletedAt;

    /**
     * Set by an admin, not the member or an algorithm - same rule as
     * {@link #verified}. Distinct from {@link #hidden} (self-chosen) and
     * {@link #deletedAt} (self-chosen, soft delete): a blocked profile hasn't
     * asked for anything, moderation decided it shouldn't be shown to other
     * members. The row and the account both stay fully live otherwise - the
     * owner can still sign in and use their own account normally, they just
     * stop appearing to anyone else.
     */
    @Column(name = "blocked", nullable = false)
    private Boolean blocked = false;



    @Override
    public Collection<? extends GrantedAuthority> getAuthorities() {
        return new ArrayList<>();
    }

    @Override
    public String getUsername() {
        return email;
    }

    public String getPassword() {
        return password;
    }


    /**
     * Last line of defence before the row is written.
     *
     * Name casing and time-of-birth format could both be handled in the service
     * layer, but every patch method would need to remember - and the one that
     * forgot would write a name in caps or a time the TIME column rejects. A
     * lifecycle callback cannot be skipped.
     *
     * Runs on update; onInsert() calls it for the insert path, because JPA
     * permits only one callback method per lifecycle event per entity.
     */
    @PreUpdate
    private void normalise() {
        this.name = NameFormatter.toDisplayName(this.name);
        this.timeOfBirth = TimeFormatter.toDbTime(this.timeOfBirth);
    }

    /**
     * Signup stamp.
     *
     * Deliberately not on @PreUpdate: created_at is also marked
     * updatable = false, so editing a profile cannot bump it and jump the
     * profile back to the top of the feed.
     */
    @PrePersist
    private void onInsert() {
        normalise();
        if (this.createdAt == null) {
            this.createdAt = LocalDateTime.now();
        }
    }

    public String getMaternalUnclesAakna() {
        return this.maternalUnclesGotra;
    }

    public void setMaternalUnclesAakna(String aakna) {
        this.maternalUnclesGotra = aakna;
    }
}

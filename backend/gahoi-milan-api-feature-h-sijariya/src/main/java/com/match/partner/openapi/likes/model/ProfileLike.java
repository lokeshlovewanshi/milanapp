package com.match.partner.openapi.likes.model;

import com.match.partner.openapi.user.model.dao.UserProfile;
import jakarta.persistence.*;
import lombok.Data;

import java.time.LocalDateTime;

@Entity
@Table(name = "profile_likes")
@Data
public class ProfileLike {

    @EmbeddedId
    private ProfileLikeId id;

    @ManyToOne
    @MapsId("likerId")
    @JoinColumn(name = "liker_id", referencedColumnName = "id")
    private UserProfile liker;

    @ManyToOne
    @MapsId("likedProfileId")
    @JoinColumn(name = "liked_profile_id", referencedColumnName = "id")
    private UserProfile likedProfile;

    @Column(name = "liked_at")
    private LocalDateTime likedAt;

    @Enumerated(EnumType.STRING) // Store the enum value as a String in the database
    @Column(name = "status", nullable = false)
    private Status status;

}

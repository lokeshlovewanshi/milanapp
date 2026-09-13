package com.match.partner.openapi.likes.model;

import jakarta.persistence.Embeddable;
import java.io.Serializable;
import java.util.Objects;

@Embeddable
public class ProfileLikeId implements Serializable {

    private int likerId;
    private int likedProfileId;

    // Default constructor
    public ProfileLikeId() {}

    // Parameterized constructor
    public ProfileLikeId(int likerId, int likedProfileId) {
        this.likerId = likerId;
        this.likedProfileId = likedProfileId;
    }

    // Getters and setters
    public int getLikerId() {
        return likerId;
    }

    public void setLikerId(int likerId) {
        this.likerId = likerId;
    }

    public int getLikedProfileId() {
        return likedProfileId;
    }

    public void setLikedProfileId(int likedProfileId) {
        this.likedProfileId = likedProfileId;
    }

    // Override equals and hashCode
    @Override
    public boolean equals(Object o) {
        if (this == o) return true;
        if (o == null || getClass() != o.getClass()) return false;
        ProfileLikeId that = (ProfileLikeId) o;
        return likerId == that.likerId && likedProfileId == that.likedProfileId;
    }

    @Override
    public int hashCode() {
        return Objects.hash(likerId, likedProfileId);
    }
}

package com.match.partner.openapi.views.model.dao;

import com.match.partner.openapi.user.model.dao.UserProfile;
import jakarta.persistence.*;
import lombok.Data;

import java.time.LocalDateTime;

@Entity
@Table(name = "views")
@Data
public class Views {
    @EmbeddedId
    private ViewsId id;

    @Column(name = "viewed_at")
    private LocalDateTime viewedAt;

    @ManyToOne
    @MapsId("viewedBy")
    @JoinColumn(name = "viewed_by",referencedColumnName = "id", nullable = false)
    private UserProfile viewedBy;
}



package com.match.partner.openapi.views.model.dao;

import jakarta.persistence.Column;
import jakarta.persistence.Embeddable;
import lombok.Data;

@Embeddable
@Data
public
class ViewsId {
    @Column(name = "profile_id")
    private Integer profileId; // The profile being viewed

    @Column(name = "viewed_by")
    private Integer viewedBy; // The user viewing the profile
}
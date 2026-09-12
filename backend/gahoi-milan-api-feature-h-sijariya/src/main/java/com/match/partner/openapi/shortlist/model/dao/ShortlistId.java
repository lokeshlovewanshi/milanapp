package com.match.partner.openapi.shortlist.model.dao;

import jakarta.persistence.Embeddable;
import lombok.Data;
import java.io.Serializable;

@Data
@Embeddable
public class ShortlistId implements Serializable {
    private Integer profileId;
    private Integer shortlistedId;
}

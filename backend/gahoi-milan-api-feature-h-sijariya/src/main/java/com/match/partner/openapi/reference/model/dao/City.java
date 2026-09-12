package com.match.partner.openapi.reference.model.dao;

import jakarta.persistence.*;
import lombok.Data;

import java.math.BigDecimal;

@Entity
@Table(name = "city")
@Data
public class City {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Integer id;

    @Column(name = "state_id", nullable = false)
    private Integer stateId;

    @Column(nullable = false, length = 64)
    private String name;

    /** 1 = metro, 2 = large non-metro, 3 = district city. Used for search ranking. */
    @Column(nullable = false)
    private Integer tier;

    /**
     * Where the city actually is, for birth-chart calculation.
     *
     * BigDecimal rather than Double: six decimal places is about 10cm, and
     * binary floats introduce rounding that is unpleasant to debug inside an
     * astrology calculation. Nullable because a city added later will not have
     * coordinates until someone fills them in - the kundali service says so
     * plainly rather than computing a chart for the wrong place.
     */
    @Column(precision = 9, scale = 6)
    private BigDecimal latitude;

    @Column(precision = 10, scale = 6)
    private BigDecimal longitude;
}

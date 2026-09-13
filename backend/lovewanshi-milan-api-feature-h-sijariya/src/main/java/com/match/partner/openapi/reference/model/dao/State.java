package com.match.partner.openapi.reference.model.dao;

import jakarta.persistence.*;
import lombok.Data;

@Entity
@Table(name = "state")
@Data
public class State {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Integer id;

    /** ISO 3166-2:IN subdivision code, e.g. "MP". */
    @Column(nullable = false, length = 8)
    private String code;

    @Column(nullable = false, length = 64)
    private String name;

    /** STATE or UT. */
    @Column(nullable = false, length = 8)
    private String kind;
}

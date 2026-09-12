package com.match.partner.openapi.reference.model.dao;

import jakarta.persistence.*;
import lombok.Data;

/**
 * One entry in a dropdown, keyed by category.
 *
 * `code` is what lands on user_profile; `label` is display only, so a label can
 * be reworded without orphaning existing profile data.
 */
@Entity
@Table(name = "lookup_option")
@Data
public class LookupOption {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Integer id;

    @Column(nullable = false, length = 48)
    private String category;

    @Column(nullable = false, length = 64)
    private String code;

    @Column(nullable = false, length = 128)
    private String label;

    @Column(name = "sort_order", nullable = false)
    private Integer sortOrder;

    @Column(nullable = false)
    private Boolean active;
}

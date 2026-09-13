package com.match.partner.openapi.user.model.dao;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import lombok.Data;

import java.time.LocalDateTime;

/**
 * A stored birth chart.
 *
 * Its own table rather than columns on UserProfile: the chart JSON and its SVG
 * run to several kilobytes, and user_profile is read on every feed page.
 * Widening that row would slow every listing down to serve a feature most
 * requests never touch.
 */
@Entity
@Table(name = "kundali")
@Data
public class Kundali {

    /** Also the foreign key. One chart per member. */
    @Id
    @Column(name = "user_id")
    private Integer userId;

    /** The Lambda response verbatim, including the SVG. */
    @Column(name = "chart", nullable = false, columnDefinition = "LONGTEXT")
    private String chart;

    /**
     * Pulled out of the JSON so matching never has to parse a chart. These two
     * numbers are the entire input to Ashtakoota.
     */
    @Column(name = "nakshatra_index", nullable = false)
    private Integer nakshatraIndex;

    @Column(name = "rashi_index", nullable = false)
    private Integer rashiIndex;

    @Column(name = "nakshatra", nullable = false)
    private String nakshatra;

    @Column(name = "rashi", nullable = false)
    private String rashi;

    @Column(name = "manglik", nullable = false)
    private Boolean manglik = false;

    /**
     * SHA-256 of the birth date, time and place this chart was built from.
     *
     * A chart is only valid for the inputs that produced it, and people do
     * correct their birth time after asking a parent. Comparing this against
     * the current profile turns a stale chart into something detectable rather
     * than silently wrong - which matters more here than most caches, because
     * an hour of error moves the ascendant by roughly a whole sign and changes
     * every house placement.
     */
    @Column(name = "birth_fingerprint", nullable = false)
    private String birthFingerprint;

    @Column(name = "generated_at", nullable = false)
    private LocalDateTime generatedAt;
}

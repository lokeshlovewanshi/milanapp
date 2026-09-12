package com.match.partner.openapi.reference.repository;

import com.match.partner.openapi.reference.model.dao.City;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;

public interface CityRepository extends JpaRepository<City, Integer> {

    /** Tier first so metros surface above district cities in the picker. */
    List<City> findByStateIdOrderByTierAscNameAsc(Integer stateId);

    /**
     * A browsable page of every city, A-to-Z.
     *
     * For a picker with no state to scope it and nothing typed yet - "type to
     * search" is fine once someone knows what they want, but the first thing
     * they see should not be an empty list. Alphabetical rather than tier
     * order here on purpose: tier ranks by prominence, which is right for
     * search results but reads as arbitrary in a plain A-Z browse.
     */
    Page<City> findAllByOrderByNameAsc(Pageable pageable);

    List<City> findByTierLessThanEqualOrderByTierAscNameAsc(Integer tier);

    List<City> findByNameContainingIgnoreCaseOrderByTierAscNameAsc(String name);

    /**
     * Exact name match, best-known city first.
     *
     * Used to resolve a birth place that was stored as free text before the
     * dropdown existed. Ordered by tier so "Hyderabad" resolves to the metro
     * rather than a district town of the same name.
     */
    List<City> findByNameIgnoreCaseOrderByTierAsc(String name);

    /**
     * Type-ahead search over the whole city list.
     *
     * Three things this does that a plain "contains" query does not, and all
     * three matter now the table holds over a thousand rows:
     *
     *  - Ranks a prefix match above a mere substring. Typing "kan" should offer
     *    Kanpur before Bulandshahr, and CONCAT(:q,'%') keeps the leading
     *    wildcard off that comparison so the index on (name, state_id) can be
     *    used for it.
     *  - Then by tier, so a metro outranks a district town of a similar name.
     *  - Bounded by the caller. An unbounded result set for a two-letter query
     *    is hundreds of rows the app has to receive, parse and lay out while
     *    the member is still typing.
     */
    @Query(value = """
            SELECT * FROM city
            WHERE name LIKE CONCAT('%', :q, '%')
            ORDER BY
              CASE WHEN name LIKE CONCAT(:q, '%') THEN 0 ELSE 1 END,
              tier ASC,
              CHAR_LENGTH(name) ASC,
              name ASC
            LIMIT :limit
            """, nativeQuery = true)
    List<City> search(@Param("q") String q, @Param("limit") int limit);
}

package com.match.partner.openapi.reference.repository;

import com.match.partner.openapi.reference.model.dao.LookupOption;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface LookupOptionRepository extends JpaRepository<LookupOption, Integer> {

    List<LookupOption> findByCategoryAndActiveTrueOrderBySortOrderAsc(String category);

    List<LookupOption> findByActiveTrueOrderByCategoryAscSortOrderAsc();
}

package com.match.partner.openapi.reference.repository;

import com.match.partner.openapi.reference.model.dao.State;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface StateRepository extends JpaRepository<State, Integer> {
    List<State> findAllByOrderByNameAsc();
    Optional<State> findByCode(String code);
    Optional<State> findByNameIgnoreCase(String name);
}

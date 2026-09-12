package com.match.partner.openapi.user.repository;

import com.match.partner.openapi.user.model.dao.Kundali;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface KundaliRepository extends JpaRepository<Kundali, Integer> {
}

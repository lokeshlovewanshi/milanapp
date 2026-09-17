package com.match.partner.openapi.admin.repository;

import com.match.partner.openapi.admin.model.dao.OutreachContact;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface OutreachContactRepository extends JpaRepository<OutreachContact, Integer> {

    @Query("""
            SELECT c FROM OutreachContact c
            WHERE (:search IS NULL OR :search = ''
                   OR LOWER(c.name) LIKE LOWER(CONCAT('%', :search, '%'))
                   OR c.phoneNumber LIKE CONCAT('%', :search, '%')
                   OR LOWER(c.email) LIKE LOWER(CONCAT('%', :search, '%'))
                   OR LOWER(c.category) LIKE LOWER(CONCAT('%', :search, '%')))
            ORDER BY c.updatedAt DESC
            """)
    List<OutreachContact> searchContacts(@Param("search") String search);
}

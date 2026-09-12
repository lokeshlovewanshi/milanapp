package com.match.partner.openapi.admin.repository;

import com.match.partner.openapi.admin.model.dao.MessageTemplate;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface MessageTemplateRepository extends JpaRepository<MessageTemplate, Integer> {

    List<MessageTemplate> findAllByIsActiveTrueOrderBySortOrderAscIdAsc();

    List<MessageTemplate> findAllByTemplateTypeAndIsActiveTrueOrderBySortOrderAscIdAsc(String templateType);
}

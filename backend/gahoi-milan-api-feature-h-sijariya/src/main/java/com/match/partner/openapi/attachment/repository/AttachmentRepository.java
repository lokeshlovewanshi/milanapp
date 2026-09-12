package com.match.partner.openapi.attachment.repository;

import com.match.partner.openapi.attachment.model.entity.dao.AttachmentDao;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface AttachmentRepository extends JpaRepository<AttachmentDao, Integer> {
    List<AttachmentDao> findByUserId(Integer userId);
}

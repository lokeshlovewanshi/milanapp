package com.match.partner.openapi.admin.repository;

import com.match.partner.openapi.admin.model.dao.AdminUser;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface AdminUserRepository extends JpaRepository<AdminUser, Integer> {
    Optional<AdminUser> findByEmailIgnoreCase(String email);
}

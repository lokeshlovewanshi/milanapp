package com.match.partner.openapi.notification.repository;

import com.match.partner.openapi.notification.model.dao.DeviceToken;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Optional;

public interface DeviceTokenRepository extends JpaRepository<DeviceToken, Long> {

    List<DeviceToken> findByUserId(Integer userId);

    Optional<DeviceToken> findByToken(String token);

    @org.springframework.data.jpa.repository.Query("SELECT DISTINCT d.token FROM DeviceToken d WHERE d.token IS NOT NULL AND d.token != ''")
    List<String> findAllTokens();

    @org.springframework.data.jpa.repository.Query("SELECT DISTINCT d.token FROM DeviceToken d WHERE (d.userId IS NULL OR d.userId != :userId) AND d.token IS NOT NULL AND d.token != ''")
    List<String> findAllTokensExceptUser(@org.springframework.data.repository.query.Param("userId") Integer userId);

    /**
     * Derived delete queries need their own transaction.
     *
     * PushService prunes dead tokens from an @Async thread with no surrounding
     * transaction. Without these annotations that call throws
     * TransactionRequiredException and stale tokens are never cleaned up - which
     * matters, because uninstalled apps leave tokens behind forever and they
     * eventually dominate the table.
     */
    @Modifying
    @Transactional
    void deleteByToken(String token);
}

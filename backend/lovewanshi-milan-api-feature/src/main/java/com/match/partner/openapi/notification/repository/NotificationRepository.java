package com.match.partner.openapi.notification.repository;

import com.match.partner.openapi.notification.model.dao.Notification;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;

public interface NotificationRepository extends JpaRepository<Notification, Long> {

    Page<Notification> findByUserIdOrderByCreatedAtDesc(Integer userId, Pageable pageable);

    long countByUserIdAndReadAtIsNull(Integer userId);

    /**
     * Marks the whole feed read in one statement rather than loading and saving
     * each row.
     *
     * @Param is explicit rather than relying on the -parameters compile flag:
     * named JPQL bindings resolve by parameter name only when that flag is on,
     * and a build that drops it would fail at startup, not at compile time.
     */
    @Modifying
    @Transactional
    @Query("update Notification n set n.readAt = :now where n.userId = :userId and n.readAt is null")
    int markAllRead(@Param("userId") Integer userId, @Param("now") LocalDateTime now);
}

package com.match.partner.openapi.ticket.repository;

import com.match.partner.openapi.ticket.model.dao.SupportTicket;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface SupportTicketRepository extends JpaRepository<SupportTicket, Integer> {

    List<SupportTicket> findByUserProfileIdOrderByUpdatedAtDesc(int userProfileId);

    Optional<SupportTicket> findByIdAndUserProfileId(int id, int userProfileId);

    /**
     * The member's open ticket, if they have one. At most one can exist -
     * TicketServiceImpl refuses to create a second while this returns a value.
     */
    Optional<SupportTicket> findFirstByUserProfileIdAndStatus(int userProfileId, String status);

    Page<SupportTicket> findByStatusOrderByUpdatedAtDesc(String status, Pageable pageable);

    Page<SupportTicket> findAllByOrderByUpdatedAtDesc(Pageable pageable);
}

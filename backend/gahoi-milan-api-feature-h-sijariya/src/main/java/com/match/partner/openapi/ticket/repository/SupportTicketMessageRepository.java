package com.match.partner.openapi.ticket.repository;

import com.match.partner.openapi.ticket.model.dao.SupportTicketMessage;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface SupportTicketMessageRepository extends JpaRepository<SupportTicketMessage, Integer> {

    List<SupportTicketMessage> findByTicketIdOrderByCreatedAtAsc(int ticketId);
}

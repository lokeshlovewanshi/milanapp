package com.match.partner.openapi.ticket.service;

import com.match.partner.openapi.ticket.model.dto.AddMessageRequest;
import com.match.partner.openapi.ticket.model.dto.CreateTicketRequest;
import com.match.partner.openapi.ticket.model.dto.TicketDetailDTO;
import com.match.partner.openapi.ticket.model.dto.TicketSummaryDTO;

import java.util.List;

public interface TicketServiceInterface {

    List<TicketSummaryDTO> listMyTickets(String userName);

    TicketDetailDTO getMyTicket(String userName, int ticketId);

    TicketDetailDTO createTicket(String userName, CreateTicketRequest request);

    TicketDetailDTO addMessage(String userName, int ticketId, AddMessageRequest request);

    TicketDetailDTO reopen(String userName, int ticketId);
}

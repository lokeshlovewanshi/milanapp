package com.match.partner.openapi.admin.service;

import com.match.partner.common.Utils.CommonUtils;
import com.match.partner.common.configuration.ClientException;
import com.match.partner.openapi.admin.model.dao.AdminUser;
import com.match.partner.openapi.admin.model.dto.AdminTicketDetailDTO;
import com.match.partner.openapi.admin.model.dto.AdminTicketSummaryDTO;
import com.match.partner.openapi.admin.repository.AdminUserRepository;
import com.match.partner.openapi.ticket.model.dao.SenderType;
import com.match.partner.openapi.ticket.model.dao.SupportTicket;
import com.match.partner.openapi.ticket.model.dao.SupportTicketMessage;
import com.match.partner.openapi.ticket.model.dao.TicketStatus;
import com.match.partner.openapi.ticket.model.dto.AddMessageRequest;
import com.match.partner.openapi.ticket.model.dto.TicketMessageDTO;
import com.match.partner.openapi.ticket.repository.SupportTicketMessageRepository;
import com.match.partner.openapi.ticket.repository.SupportTicketRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.stream.Collectors;

/** The admin side of the same ticket thread a member sees from Contact Us. */
@Service
@RequiredArgsConstructor
public class AdminTicketService {

    private final SupportTicketRepository ticketRepository;
    private final SupportTicketMessageRepository messageRepository;
    private final AdminUserRepository adminUserRepository;
    private final CommonUtils commonUtils;

    public Page<AdminTicketSummaryDTO> list(String status, int page, int size) {
        Pageable pageable = PageRequest.of(page, size);
        Page<SupportTicket> tickets = (status == null || status.isBlank())
                ? ticketRepository.findAllByOrderByUpdatedAtDesc(pageable)
                : ticketRepository.findByStatusOrderByUpdatedAtDesc(status.toUpperCase(), pageable);
        return tickets.map(this::toSummary);
    }

    public AdminTicketDetailDTO find(int id) {
        SupportTicket ticket = requireTicket(id);
        return toDetail(ticket);
    }

    public AdminTicketDetailDTO reply(int id, String adminEmail, AddMessageRequest request) {
        SupportTicket ticket = requireTicket(id);

        String message = request.getMessage() == null ? "" : request.getMessage().trim();
        if (message.isEmpty()) {
            throw new ClientException(HttpStatus.BAD_REQUEST, "Message is required");
        }

        String adminName = adminUserRepository.findByEmailIgnoreCase(adminEmail)
                .map(AdminUser::getName)
                .orElse("Support Team");

        SupportTicketMessage entry = new SupportTicketMessage();
        entry.setTicket(ticket);
        entry.setSenderType(SenderType.ADMIN.name());
        entry.setSenderName(adminName == null || adminName.isBlank() ? "Support Team" : adminName);
        entry.setMessage(message);
        messageRepository.save(entry);

        ticket.setUpdatedAt(LocalDateTime.now());
        ticketRepository.save(ticket);

        return toDetail(ticket);
    }

    public AdminTicketSummaryDTO close(int id) {
        SupportTicket ticket = requireTicket(id);
        ticket.setStatus(TicketStatus.CLOSED.name());
        ticket.setUpdatedAt(LocalDateTime.now());
        ticketRepository.save(ticket);
        return toSummary(ticket);
    }

    private SupportTicket requireTicket(int id) {
        return ticketRepository.findById(id)
                .orElseThrow(() -> new ClientException(HttpStatus.NOT_FOUND, "No ticket with that id"));
    }

    private AdminTicketSummaryDTO toSummary(SupportTicket ticket) {
        AdminTicketSummaryDTO dto = new AdminTicketSummaryDTO();
        dto.setId(ticket.getId());
        dto.setSubject(ticket.getSubject());
        dto.setStatus(ticket.getStatus());
        dto.setCreatedAt(ticket.getCreatedAt());
        dto.setUpdatedAt(ticket.getUpdatedAt());
        dto.setProfileId(ticket.getUserProfile().getId());
        dto.setDisplayId(commonUtils.convertToJMFormat(ticket.getUserProfile().getId()));
        dto.setProfileName(ticket.getUserProfile().getName());
        dto.setProfileEmail(ticket.getUserProfile().getEmail());
        return dto;
    }

    private AdminTicketDetailDTO toDetail(SupportTicket ticket) {
        AdminTicketDetailDTO dto = new AdminTicketDetailDTO();
        dto.setId(ticket.getId());
        dto.setSubject(ticket.getSubject());
        dto.setStatus(ticket.getStatus());
        dto.setCreatedAt(ticket.getCreatedAt());
        dto.setUpdatedAt(ticket.getUpdatedAt());
        dto.setProfileId(ticket.getUserProfile().getId());
        dto.setDisplayId(commonUtils.convertToJMFormat(ticket.getUserProfile().getId()));
        dto.setProfileName(ticket.getUserProfile().getName());
        dto.setProfileEmail(ticket.getUserProfile().getEmail());
        dto.setMessages(messageRepository.findByTicketIdOrderByCreatedAtAsc(ticket.getId()).stream()
                .map(this::toMessageDto)
                .collect(Collectors.toList()));
        return dto;
    }

    private TicketMessageDTO toMessageDto(SupportTicketMessage message) {
        TicketMessageDTO dto = new TicketMessageDTO();
        dto.setId(message.getId());
        dto.setSenderType(message.getSenderType());
        dto.setSenderName(message.getSenderName());
        dto.setMessage(message.getMessage());
        dto.setCreatedAt(message.getCreatedAt());
        return dto;
    }
}

package com.match.partner.openapi.ticket.service;

import com.match.partner.common.configuration.ClientException;
import com.match.partner.openapi.ticket.model.dao.SenderType;
import com.match.partner.openapi.ticket.model.dao.SupportTicket;
import com.match.partner.openapi.ticket.model.dao.SupportTicketMessage;
import com.match.partner.openapi.ticket.model.dao.TicketStatus;
import com.match.partner.openapi.ticket.model.dto.AddMessageRequest;
import com.match.partner.openapi.ticket.model.dto.CreateTicketRequest;
import com.match.partner.openapi.ticket.model.dto.TicketDetailDTO;
import com.match.partner.openapi.ticket.model.dto.TicketMessageDTO;
import com.match.partner.openapi.ticket.model.dto.TicketSummaryDTO;
import com.match.partner.openapi.ticket.repository.SupportTicketMessageRepository;
import com.match.partner.openapi.ticket.repository.SupportTicketRepository;
import com.match.partner.openapi.user.model.dao.UserProfile;
import com.match.partner.openapi.user.repository.UserProfileRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class TicketServiceImpl implements TicketServiceInterface {

    private final SupportTicketRepository ticketRepository;
    private final SupportTicketMessageRepository messageRepository;
    private final UserProfileRepository userProfileRepository;

    public List<TicketSummaryDTO> listMyTickets(String userName) {
        UserProfile profile = requireProfile(userName);
        return ticketRepository.findByUserProfileIdOrderByUpdatedAtDesc(profile.getId()).stream()
                .map(this::toSummary)
                .collect(Collectors.toList());
    }

    public TicketDetailDTO getMyTicket(String userName, int ticketId) {
        UserProfile profile = requireProfile(userName);
        SupportTicket ticket = requireOwnTicket(profile, ticketId);
        return toDetail(ticket);
    }

    public TicketDetailDTO createTicket(String userName, CreateTicketRequest request) {
        UserProfile profile = requireProfile(userName);

        String subject = request.getSubject() == null ? "" : request.getSubject().trim();
        String message = request.getMessage() == null ? "" : request.getMessage().trim();
        if (subject.isEmpty()) {
            throw new ClientException(HttpStatus.BAD_REQUEST, "Subject is required");
        }
        if (message.isEmpty()) {
            throw new ClientException(HttpStatus.BAD_REQUEST, "Message is required");
        }

        // One open ticket per member. Without this, a member waiting on a reply
        // opens a second ticket for the same problem, and support answers the
        // same question twice in two threads that cannot see each other.
        //
        // CONFLICT rather than BAD_REQUEST: the request is well-formed, it is
        // the current state that forbids it - and the client keys off the
        // status to send the member to the thread they already have.
        ticketRepository.findFirstByUserProfileIdAndStatus(profile.getId(), TicketStatus.OPEN.name())
                .ifPresent(open -> {
                    throw new ClientException(HttpStatus.CONFLICT,
                            "You already have an open ticket. Please reply on it instead of raising a new one.");
                });

        SupportTicket ticket = new SupportTicket();
        ticket.setUserProfile(profile);
        ticket.setSubject(subject);
        ticket.setStatus(TicketStatus.OPEN.name());
        ticket = ticketRepository.save(ticket);

        appendMessage(ticket, SenderType.USER, profile.getName(), message);

        return toDetail(ticket);
    }

    public TicketDetailDTO addMessage(String userName, int ticketId, AddMessageRequest request) {
        UserProfile profile = requireProfile(userName);
        SupportTicket ticket = requireOwnTicket(profile, ticketId);

        if (TicketStatus.CLOSED.name().equals(ticket.getStatus())) {
            throw new ClientException(HttpStatus.CONFLICT, "This ticket is closed - reopen it to add a message");
        }

        String message = request.getMessage() == null ? "" : request.getMessage().trim();
        if (message.isEmpty()) {
            throw new ClientException(HttpStatus.BAD_REQUEST, "Message is required");
        }

        appendMessage(ticket, SenderType.USER, profile.getName(), message);
        touch(ticket);
        return toDetail(ticket);
    }

    public TicketDetailDTO reopen(String userName, int ticketId) {
        UserProfile profile = requireProfile(userName);
        SupportTicket ticket = requireOwnTicket(profile, ticketId);

        ticket.setStatus(TicketStatus.OPEN.name());
        touch(ticket);
        return toDetail(ticket);
    }

    private void appendMessage(SupportTicket ticket, SenderType senderType, String senderName, String message) {
        SupportTicketMessage entry = new SupportTicketMessage();
        entry.setTicket(ticket);
        entry.setSenderType(senderType.name());
        entry.setSenderName(senderName);
        entry.setMessage(message);
        messageRepository.save(entry);
    }

    private void touch(SupportTicket ticket) {
        ticket.setUpdatedAt(LocalDateTime.now());
        ticketRepository.save(ticket);
    }

    private UserProfile requireProfile(String userName) {
        return userProfileRepository.findByEmail(userName)
                .orElseThrow(() -> new ClientException(HttpStatus.NOT_FOUND, "No account for " + userName));
    }

    private SupportTicket requireOwnTicket(UserProfile profile, int ticketId) {
        return ticketRepository.findByIdAndUserProfileId(ticketId, profile.getId())
                .orElseThrow(() -> new ClientException(HttpStatus.NOT_FOUND, "No ticket with that id"));
    }

    private TicketSummaryDTO toSummary(SupportTicket ticket) {
        TicketSummaryDTO dto = new TicketSummaryDTO();
        dto.setId(ticket.getId());
        dto.setSubject(ticket.getSubject());
        dto.setStatus(ticket.getStatus());
        dto.setCreatedAt(ticket.getCreatedAt());
        dto.setUpdatedAt(ticket.getUpdatedAt());
        return dto;
    }

    private TicketDetailDTO toDetail(SupportTicket ticket) {
        TicketDetailDTO dto = new TicketDetailDTO();
        dto.setId(ticket.getId());
        dto.setSubject(ticket.getSubject());
        dto.setStatus(ticket.getStatus());
        dto.setCreatedAt(ticket.getCreatedAt());
        dto.setUpdatedAt(ticket.getUpdatedAt());
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

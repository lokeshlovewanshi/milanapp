package com.match.partner.openapi.ticket.controller;

import com.match.partner.openapi.ticket.model.dto.AddMessageRequest;
import com.match.partner.openapi.ticket.model.dto.CreateTicketRequest;
import com.match.partner.openapi.ticket.model.dto.TicketDetailDTO;
import com.match.partner.openapi.ticket.model.dto.TicketSummaryDTO;
import com.match.partner.openapi.ticket.service.TicketServiceInterface;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

import java.util.List;

/** A member's own support tickets - raised from Contact Us in the app. */
@RestController
@RequestMapping("/api/v1/support/tickets")
@RequiredArgsConstructor
public class TicketController {

    private final TicketServiceInterface ticketService;

    @GetMapping
    public List<TicketSummaryDTO> list(@RequestAttribute("username") String userName) {
        return ticketService.listMyTickets(userName);
    }

    @PostMapping
    public TicketDetailDTO create(@RequestAttribute("username") String userName, @RequestBody CreateTicketRequest request) {
        return ticketService.createTicket(userName, request);
    }

    @GetMapping("/{id}")
    public TicketDetailDTO get(@RequestAttribute("username") String userName, @PathVariable int id) {
        return ticketService.getMyTicket(userName, id);
    }

    @PostMapping("/{id}/messages")
    public TicketDetailDTO addMessage(@RequestAttribute("username") String userName, @PathVariable int id, @RequestBody AddMessageRequest request) {
        return ticketService.addMessage(userName, id, request);
    }

    @PostMapping("/{id}/reopen")
    public TicketDetailDTO reopen(@RequestAttribute("username") String userName, @PathVariable int id) {
        return ticketService.reopen(userName, id);
    }
}

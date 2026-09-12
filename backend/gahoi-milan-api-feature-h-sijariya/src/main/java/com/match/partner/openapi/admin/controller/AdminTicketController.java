package com.match.partner.openapi.admin.controller;

import com.match.partner.openapi.admin.model.dto.AdminTicketDetailDTO;
import com.match.partner.openapi.admin.model.dto.AdminTicketSummaryDTO;
import com.match.partner.openapi.admin.service.AdminTicketService;
import com.match.partner.openapi.ticket.model.dto.AddMessageRequest;
import org.springframework.data.domain.Page;
import org.springframework.web.bind.annotation.*;

/** Guarded by AdminJwtInterceptor - every method here requires an admin token. */
@RestController
@RequestMapping("/api/v1/admin/tickets")
public class AdminTicketController {

    private final AdminTicketService adminTicketService;

    public AdminTicketController(AdminTicketService adminTicketService) {
        this.adminTicketService = adminTicketService;
    }

    @GetMapping
    public Page<AdminTicketSummaryDTO> list(@RequestParam(required = false) String status,
                                             @RequestParam(defaultValue = "0") int page,
                                             @RequestParam(defaultValue = "20") int size) {
        return adminTicketService.list(status, page, size);
    }

    @GetMapping("/{id}")
    public AdminTicketDetailDTO find(@PathVariable int id) {
        return adminTicketService.find(id);
    }

    @PostMapping("/{id}/messages")
    public AdminTicketDetailDTO reply(@PathVariable int id,
                                       @RequestAttribute("adminEmail") String adminEmail,
                                       @RequestBody AddMessageRequest request) {
        return adminTicketService.reply(id, adminEmail, request);
    }

    @PostMapping("/{id}/close")
    public AdminTicketSummaryDTO close(@PathVariable int id) {
        return adminTicketService.close(id);
    }
}

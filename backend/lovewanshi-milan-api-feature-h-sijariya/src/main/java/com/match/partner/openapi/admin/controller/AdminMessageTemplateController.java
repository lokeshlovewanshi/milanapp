package com.match.partner.openapi.admin.controller;

import com.match.partner.openapi.admin.model.dto.AdminSendEmailDTO;
import com.match.partner.openapi.admin.model.dto.MessageTemplateDTO;
import com.match.partner.openapi.admin.service.MessageTemplateService;
import com.match.partner.openapi.auth.service.EmailService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

/**
 * Message templates management for admin outreach (WhatsApp, Email, Call).
 * Guarded by AdminJwtInterceptor.
 */
@RestController
@RequestMapping("/api/v1/admin/templates")
@RequiredArgsConstructor
public class AdminMessageTemplateController {

    private final MessageTemplateService messageTemplateService;
    private final EmailService emailService;

    @GetMapping
    public List<MessageTemplateDTO> list(@RequestParam(required = false) String type) {
        return messageTemplateService.list(type);
    }

    @PostMapping
    public ResponseEntity<MessageTemplateDTO> create(@RequestBody MessageTemplateDTO dto) {
        return ResponseEntity.status(HttpStatus.CREATED).body(messageTemplateService.create(dto));
    }

    @PutMapping("/{id}")
    public MessageTemplateDTO update(@PathVariable int id, @RequestBody MessageTemplateDTO dto) {
        return messageTemplateService.update(id, dto);
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(@PathVariable int id) {
        messageTemplateService.delete(id);
        return ResponseEntity.noContent().build();
    }

    @PostMapping("/send-email")
    public ResponseEntity<Map<String, Object>> sendOutreachEmail(@RequestBody AdminSendEmailDTO dto) {
        if (dto.getTo() == null || dto.getTo().isBlank()) {
            return ResponseEntity.badRequest().body(Map.of("success", false, "message", "Recipient email ('to') is required"));
        }
        EmailService.EmailSendResult result = emailService.sendCustomOutreachEmail(
                dto.getTo(),
                dto.getSubject(),
                dto.getContent(),
                dto.getRecipientName(),
                dto.getProfileId()
        );
        if (result.success()) {
            return ResponseEntity.ok(Map.of("success", true, "message", result.message()));
        } else {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(Map.of("success", false, "message", result.message()));
        }
    }
}

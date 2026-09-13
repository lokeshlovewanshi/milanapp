package com.match.partner.openapi.admin.controller;

import com.match.partner.openapi.admin.model.dto.OutreachContactDTO;
import com.match.partner.openapi.admin.service.OutreachContactService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

/**
 * Saved contacts directory for direct admin outreach (WhatsApp, SMS, Call).
 * Guarded by AdminJwtInterceptor.
 */
@RestController
@RequestMapping("/api/v1/admin/outreach-contacts")
@RequiredArgsConstructor
public class AdminOutreachContactController {

    private final OutreachContactService contactService;

    @GetMapping
    public List<OutreachContactDTO> list(@RequestParam(required = false) String search) {
        return contactService.list(search);
    }

    @PostMapping
    public ResponseEntity<OutreachContactDTO> create(@RequestBody OutreachContactDTO dto) {
        return ResponseEntity.status(HttpStatus.CREATED).body(contactService.create(dto));
    }

    @PutMapping("/{id}")
    public OutreachContactDTO update(@PathVariable int id, @RequestBody OutreachContactDTO dto) {
        return contactService.update(id, dto);
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(@PathVariable int id) {
        contactService.delete(id);
        return ResponseEntity.noContent().build();
    }
}

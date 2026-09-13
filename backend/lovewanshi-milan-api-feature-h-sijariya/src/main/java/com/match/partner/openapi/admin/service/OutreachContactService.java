package com.match.partner.openapi.admin.service;

import com.match.partner.common.configuration.ClientException;
import com.match.partner.openapi.admin.model.dao.OutreachContact;
import com.match.partner.openapi.admin.model.dto.OutreachContactDTO;
import com.match.partner.openapi.admin.repository.OutreachContactRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
@RequiredArgsConstructor
public class OutreachContactService {

    private final OutreachContactRepository contactRepository;

    public List<OutreachContactDTO> list(String search) {
        return contactRepository.searchContacts(search != null ? search.trim() : null)
                .stream()
                .map(this::toDTO)
                .toList();
    }

    @Transactional
    public OutreachContactDTO create(OutreachContactDTO dto) {
        if (dto.getName() == null || dto.getName().isBlank()) {
            throw new ClientException(HttpStatus.BAD_REQUEST, "Contact name is required");
        }
        if (dto.getPhoneNumber() == null || dto.getPhoneNumber().isBlank()) {
            throw new ClientException(HttpStatus.BAD_REQUEST, "Phone number is required");
        }

        OutreachContact contact = new OutreachContact();
        contact.setName(dto.getName().trim());
        contact.setPhoneNumber(dto.getPhoneNumber().trim());
        contact.setEmail(dto.getEmail() != null && !dto.getEmail().isBlank() ? dto.getEmail().trim() : null);
        contact.setCategory(dto.getCategory() != null && !dto.getCategory().isBlank() ? dto.getCategory().trim() : "PROSPECT");
        contact.setNotes(dto.getNotes() != null ? dto.getNotes().trim() : null);

        OutreachContact saved = contactRepository.save(contact);
        return toDTO(saved);
    }

    @Transactional
    public OutreachContactDTO update(int id, OutreachContactDTO dto) {
        OutreachContact contact = contactRepository.findById(id)
                .orElseThrow(() -> new ClientException(HttpStatus.NOT_FOUND, "Contact not found"));

        if (dto.getName() != null && !dto.getName().isBlank()) {
            contact.setName(dto.getName().trim());
        }
        if (dto.getPhoneNumber() != null && !dto.getPhoneNumber().isBlank()) {
            contact.setPhoneNumber(dto.getPhoneNumber().trim());
        }
        if (dto.getEmail() != null) {
            contact.setEmail(dto.getEmail().isBlank() ? null : dto.getEmail().trim());
        }
        if (dto.getCategory() != null && !dto.getCategory().isBlank()) {
            contact.setCategory(dto.getCategory().trim());
        }
        if (dto.getNotes() != null) {
            contact.setNotes(dto.getNotes().trim());
        }

        OutreachContact saved = contactRepository.save(contact);
        return toDTO(saved);
    }

    @Transactional
    public void delete(int id) {
        if (!contactRepository.existsById(id)) {
            throw new ClientException(HttpStatus.NOT_FOUND, "Contact not found");
        }
        contactRepository.deleteById(id);
    }

    private OutreachContactDTO toDTO(OutreachContact contact) {
        OutreachContactDTO dto = new OutreachContactDTO();
        dto.setId(contact.getId());
        dto.setName(contact.getName());
        dto.setPhoneNumber(contact.getPhoneNumber());
        dto.setEmail(contact.getEmail());
        dto.setCategory(contact.getCategory());
        dto.setNotes(contact.getNotes());
        dto.setCreatedAt(contact.getCreatedAt());
        dto.setUpdatedAt(contact.getUpdatedAt());
        return dto;
    }
}

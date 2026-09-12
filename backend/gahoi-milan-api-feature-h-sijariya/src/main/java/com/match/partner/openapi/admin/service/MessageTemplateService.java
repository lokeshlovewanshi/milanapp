package com.match.partner.openapi.admin.service;

import com.match.partner.common.configuration.ClientException;
import com.match.partner.openapi.admin.model.dao.MessageTemplate;
import com.match.partner.openapi.admin.model.dto.MessageTemplateDTO;
import com.match.partner.openapi.admin.repository.MessageTemplateRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
@RequiredArgsConstructor
@Slf4j
public class MessageTemplateService {

    private final MessageTemplateRepository messageTemplateRepository;

    @Transactional
    public List<MessageTemplateDTO> list(String templateType) {
        seedDefaultsIfEmpty();

        List<MessageTemplate> list;
        if (templateType != null && !templateType.isBlank()) {
            list = messageTemplateRepository.findAllByTemplateTypeAndIsActiveTrueOrderBySortOrderAscIdAsc(templateType.trim().toUpperCase());
        } else {
            list = messageTemplateRepository.findAllByIsActiveTrueOrderBySortOrderAscIdAsc();
        }

        return list.stream().map(this::toDTO).toList();
    }

    @Transactional
    public MessageTemplateDTO create(MessageTemplateDTO dto) {
        if (dto.getTitle() == null || dto.getTitle().isBlank()) {
            throw new ClientException(HttpStatus.BAD_REQUEST, "Template title is required");
        }
        if (dto.getContent() == null || dto.getContent().isBlank()) {
            throw new ClientException(HttpStatus.BAD_REQUEST, "Template content is required");
        }
        if (dto.getContent().length() > 5000) {
            throw new ClientException(HttpStatus.BAD_REQUEST, "Template content cannot exceed 5000 characters");
        }

        MessageTemplate template = new MessageTemplate();
        template.setTitle(dto.getTitle().trim());
        template.setTemplateType(dto.getTemplateType() != null && !dto.getTemplateType().isBlank()
                ? dto.getTemplateType().trim().toUpperCase()
                : "WHATSAPP");
        template.setContent(dto.getContent().trim());
        template.setVariables(dto.getVariables() != null ? dto.getVariables() : "{name},{profileId},{mobileNo},{email},{profileUrl}");
        template.setSortOrder(dto.getSortOrder() != null ? dto.getSortOrder() : 0);
        template.setIsActive(dto.getIsActive() != null ? dto.getIsActive() : true);

        return toDTO(messageTemplateRepository.save(template));
    }

    @Transactional
    public MessageTemplateDTO update(int id, MessageTemplateDTO dto) {
        MessageTemplate template = messageTemplateRepository.findById(id)
                .orElseThrow(() -> new ClientException(HttpStatus.NOT_FOUND, "Message template not found"));

        if (dto.getTitle() != null && !dto.getTitle().isBlank()) {
            template.setTitle(dto.getTitle().trim());
        }
        if (dto.getContent() != null && !dto.getContent().isBlank()) {
            if (dto.getContent().length() > 5000) {
                throw new ClientException(HttpStatus.BAD_REQUEST, "Template content cannot exceed 5000 characters");
            }
            template.setContent(dto.getContent().trim());
        }
        if (dto.getTemplateType() != null && !dto.getTemplateType().isBlank()) {
            template.setTemplateType(dto.getTemplateType().trim().toUpperCase());
        }
        if (dto.getVariables() != null) {
            template.setVariables(dto.getVariables());
        }
        if (dto.getSortOrder() != null) {
            template.setSortOrder(dto.getSortOrder());
        }
        if (dto.getIsActive() != null) {
            template.setIsActive(dto.getIsActive());
        }

        return toDTO(messageTemplateRepository.save(template));
    }

    @Transactional
    public void delete(int id) {
        MessageTemplate template = messageTemplateRepository.findById(id)
                .orElseThrow(() -> new ClientException(HttpStatus.NOT_FOUND, "Message template not found"));
        // Soft delete by setting isActive = false
        template.setIsActive(false);
        messageTemplateRepository.save(template);
    }

    private MessageTemplateDTO toDTO(MessageTemplate template) {
        MessageTemplateDTO dto = new MessageTemplateDTO();
        dto.setId(template.getId());
        dto.setTitle(template.getTitle());
        dto.setTemplateType(template.getTemplateType());
        dto.setContent(template.getContent());
        dto.setVariables(template.getVariables());
        dto.setSortOrder(template.getSortOrder());
        dto.setIsActive(template.getIsActive());
        dto.setCreatedAt(template.getCreatedAt());
        dto.setUpdatedAt(template.getUpdatedAt());
        return dto;
    }

    private void seedDefaultsIfEmpty() {
        try {
            if (messageTemplateRepository.count() == 0) {
                log.info("Seeding default outreach message templates in DB");

                MessageTemplate t1 = new MessageTemplate();
                t1.setTitle("Profile Incomplete Reminder / प्रोफ़ाइल अधूरी है");
                t1.setTemplateType("WHATSAPP");
                t1.setContent("Hi {name},\n\nGreetings from Gahoi Parinay Team! 🙏🌸\n\nWe noticed that your matrimonial registration (Profile ID: {profileId}) is still incomplete.\n\nA complete profile receives up to 5x more suitable proposals and faster responses from matching families in Gahoi Samaj! 💍✨\n\nTo help us find the most compatible matches for you, please take 2 minutes to complete your profile:\n📸 Upload 1-2 clear portrait photos\n🎂 Date, Time & Place of Birth (for Kundali Milan)\n🌿 Gotra & Aakna details\n🎓 Highest Education & Profession\n👨‍👩‍👧‍👦 Family background & Native place (मूल निवास)\n\n👉 Click here to complete your profile now:\n{profileUrl}\n(or login at https://www.gahoimarriage.in/login)\n\nIf you need any assistance in filling up your biodata, feel free to reply directly to this message. We are happy to help! 😊\n\nWarm regards,\nTeam Gahoi Parinay 🤝\nConnecting Gahoi Families Worldwide");
                t1.setSortOrder(1);

                MessageTemplate t2 = new MessageTemplate();
                t2.setTitle("Profile Update Reminder / प्रोफ़ाइल अपडेट करें");
                t2.setTemplateType("WHATSAPP");
                t2.setContent("Hi {name},\n\nGreetings from Gahoi Parinay Team! 🙏🌸\n\nWe hope you are doing well. This is a gentle reminder regarding your matrimonial profile (Profile ID: {profileId}).\n\nProfiles that are regularly updated with fresh photos, current career status, and location get top visibility and significantly higher interest from compatible families! ✨\n\n🌟 Quick steps to refresh your profile:\n📸 Add latest high-quality photos\n💼 Update your current job, designation & workplace\n📍 Verify your contact number and current address\n💫 Review your partner expectations\n\n👉 Click here to update your profile:\n{profileUrl}\n(or login at https://www.gahoimarriage.in/login)\n\nFor any queries or help, please feel free to message us back. Wishing you the very best in your partner search! 💐\n\nWarm regards,\nTeam Gahoi Parinay 🤝\nhttps://www.gahoimarriage.in");
                t2.setSortOrder(2);

                MessageTemplate t3 = new MessageTemplate();
                t3.setTitle("Photo Upload Reminder / फ़ोटो अपलोड करें");
                t3.setTemplateType("WHATSAPP");
                t3.setContent("Hi {name},\n\nGreetings from Gahoi Parinay Team! 🙏🌸\n\nWe noticed that your matrimonial profile ({profileId}) does not have a photo uploaded yet.\n\nProfiles with clear photos receive over 80% more views and faster contact requests from verified Gahoi families. 📸✨\n\nPlease take a moment to upload 1-2 recent, clear portrait photos:\n👉 Upload photos here:\nhttps://www.gahoimarriage.in/me\n\nLooking forward to helping you find your ideal match! 💐\n\nWarm regards,\nTeam Gahoi Parinay 🤝\nhttps://www.gahoimarriage.in");
                t3.setSortOrder(3);

                MessageTemplate t4 = new MessageTemplate();
                t4.setTitle("Profile Verified / प्रोफ़ाइल सत्यापित हो गई है");
                t4.setTemplateType("WHATSAPP");
                t4.setContent("Hi {name},\n\nGreetings from Gahoi Parinay Team! 🎉💐\n\nGreat news! Your matrimonial profile (Profile ID: {profileId}) has been successfully verified by our admin team. ✅\n\nYou can now:\n🔍 Explore 100% verified Gahoi Samaj profiles\n💌 Send and accept connection interests\n🪐 View Astro Kundali Gun Milan compatibility scores\n\n👉 Start discovering matches now:\nhttps://www.gahoimarriage.in/browse\n\nBest wishes for your journey ahead! ✨\n\nWarm regards,\nTeam Gahoi Parinay 🤝\nhttps://www.gahoimarriage.in");
                t4.setSortOrder(4);

                messageTemplateRepository.saveAll(List.of(t1, t2, t3, t4));
            }
        } catch (Exception e) {
            log.warn("Could not seed message templates (table may not exist yet or already populated): {}", e.getMessage());
        }
    }
}

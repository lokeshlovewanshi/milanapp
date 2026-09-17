package com.match.partner.openapi.admin.service;

import com.match.partner.common.configuration.ClientException;
import com.match.partner.common.configuration.CacheConfiguration;
import com.match.partner.openapi.admin.model.dto.AdminCreateProfileDTO;
import com.match.partner.openapi.admin.model.dto.AdminProfileDetailDTO;
import com.match.partner.openapi.admin.model.dto.AdminProfileSummaryDTO;
import com.match.partner.openapi.attachment.model.entity.dao.AttachmentDao;
import com.match.partner.openapi.attachment.repository.AttachmentRepository;
import com.match.partner.common.Utils.CommonUtils;
import com.match.partner.common.service.S3ServiceInterface;
import com.match.partner.openapi.user.model.dao.Status;
import com.match.partner.openapi.user.model.dao.UserProfile;
import com.match.partner.openapi.user.model.dto.UserProfileDTO;
import com.match.partner.openapi.user.repository.UserProfileRepository;
import com.match.partner.openapi.user.service.UserProfileServiceInterface;
import com.match.partner.openapi.auth.service.EmailService;
import com.match.partner.openapi.billing.service.BillingService;
import com.match.partner.openapi.notification.model.NotificationType;
import com.match.partner.openapi.notification.service.NotificationServiceInterface;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.http.HttpStatus;
import org.springframework.cache.annotation.CacheEvict;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

/**
 * The admin's view of a profile: enough to decide whether it is real, none of
 * the machinery a member's own app needs (likes, shortlist state, and so on -
 * none of that means anything from an admin's account).
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class AdminProfileService {

    private final UserProfileRepository userProfileRepository;
    private final AttachmentRepository attachmentRepository;
    private final S3ServiceInterface s3Service;
    private final CommonUtils commonUtils;
    private final UserProfileServiceInterface userProfileService;
    private final EmailService emailService;
    private final NotificationServiceInterface notificationService;
    private final PasswordEncoder passwordEncoder;
    private final BillingService billingService;

    public Page<AdminProfileSummaryDTO> unverified(int page, int size) {
        Pageable pageable = PageRequest.of(page, size);
        return userProfileRepository.findUnverified(pageable).map(this::toSummary);
    }

    /** Every live profile, optionally filtered by a name/email/phone/id search term - for picking one to feature. */
    public Page<AdminProfileSummaryDTO> all(String search, int page, int size) {
        Pageable pageable = PageRequest.of(page, size);
        Integer idNum = null;
        String searchTerm = (search != null && !search.isBlank()) ? search.trim() : null;
        if (searchTerm != null) {
            String digits = searchTerm.replaceAll("(?i)^[gj]m0*", "");
            if (digits.matches("^[0-9]+$")) {
                try {
                    idNum = Integer.parseInt(digits);
                } catch (NumberFormatException ignored) {}
            }
        }
        return userProfileRepository.searchAllForAdmin(searchTerm, idNum, pageable).map(this::toSummary);
    }

    /** Verified profiles, optionally filtered by a name/email/phone/id search term. */
    public Page<AdminProfileSummaryDTO> verified(String search, int page, int size) {
        Pageable pageable = PageRequest.of(page, size);
        Integer idNum = null;
        String searchTerm = (search != null && !search.isBlank()) ? search.trim() : null;
        if (searchTerm != null) {
            String digits = searchTerm.replaceAll("(?i)^[gj]m0*", "");
            if (digits.matches("^[0-9]+$")) {
                try {
                    idNum = Integer.parseInt(digits);
                } catch (NumberFormatException ignored) {}
            }
        }
        return userProfileRepository.findVerified(searchTerm, idNum, pageable).map(this::toSummary);
    }

    /** One profile by raw id, with enough detail to actually verify a person is real. */
    public AdminProfileDetailDTO find(int id) {
        UserProfile profile = userProfileRepository.findById(id)
                .filter(p -> p.getDeletedAt() == null)
                .orElseThrow(() -> new ClientException(HttpStatus.NOT_FOUND, "No profile with that id"));
        return toDetail(profile);
    }

    public AdminProfileSummaryDTO verify(int id) {
        UserProfile profile = userProfileRepository.findById(id)
                .filter(p -> p.getDeletedAt() == null)
                .orElseThrow(() -> new ClientException(HttpStatus.NOT_FOUND, "No profile with that id"));

        profile.setVerified(true);
        profile.setStatus(Status.APPROVED);
        userProfileRepository.save(profile);

        String gmId = "GM" + String.format("%05d", profile.getId());

        // 1. Send In-App & Push Notification
        try {
            notificationService.notifyUser(
                    profile.getId(),
                    NotificationType.PROFILE_VERIFIED,
                    "🎉 Profile Verified / प्रोफ़ाइल सत्यापित",
                    "बधाई हो! आपकी प्रोफ़ाइल सत्यापित हो गई है। अब आप अन्य सदस्यों से जुड़ सकते हैं और रिश्ते देख सकते हैं।",
                    null
            );
        } catch (Exception e) {
            log.warn("Could not dispatch profile verified notification for user {}: {}", profile.getId(), e.getMessage());
        }

        // 2. Send Welcome & Verified Email
        try {
            if (profile.getEmail() != null && !profile.getEmail().isBlank()) {
                emailService.sendWelcomeVerifiedEmail(profile.getEmail(), profile.getName(), gmId);
            }
        } catch (Exception e) {
            log.warn("Could not send welcome verified email for user {}: {}", profile.getId(), e.getMessage());
        }

        // 3. Broadcast High-Priority Push & In-App notification to ALL other users
        try {
            notificationService.notifyAllOnNewProfileVerified(profile);
        } catch (Exception e) {
            log.warn("Could not broadcast new verified profile notification for user {}: {}", profile.getId(), e.getMessage());
        }

        return toSummary(profile);
    }

    /**
     * Blocked accounts cannot keep an active session. If the member later
     * requests restoration, the restore flow clears this flag and submits the
     * profile for admin review again.
     */
    @CacheEvict(value = CacheConfiguration.FEATURED_STORIES_CACHE, allEntries = true)
    public AdminProfileSummaryDTO block(int id) {
        UserProfile profile = userProfileRepository.findById(id)
                .filter(p -> p.getDeletedAt() == null)
                .orElseThrow(() -> new ClientException(HttpStatus.NOT_FOUND, "No profile with that id"));

        profile.setBlocked(true);
        userProfileRepository.save(profile);
        return toSummary(profile);
    }

    @CacheEvict(value = CacheConfiguration.FEATURED_STORIES_CACHE, allEntries = true)
    public AdminProfileSummaryDTO unblock(int id) {
        UserProfile profile = userProfileRepository.findById(id)
                .filter(p -> p.getDeletedAt() == null)
                .orElseThrow(() -> new ClientException(HttpStatus.NOT_FOUND, "No profile with that id"));

        profile.setBlocked(false);
        userProfileRepository.save(profile);
        return toSummary(profile);
    }

    /**
     * Lets an admin correct any field a member could edit on their own profile
     * (name, family/religion/education details, about-me, etc.) - for fixing
     * bad data without asking the member to redo their whole form.
     *
     * Deliberately reuses UserProfileServiceInterface.updateUserProfile, the
     * same method the member-facing edit screen calls: that method never
     * reads or writes email or password from the DTO, so an admin sending
     * either in the request body has no effect. The id/email fields are also
     * stripped here first, as a second, explicit guard against ever changing
     * a member's login identity through this endpoint.
     */
    public AdminProfileDetailDTO update(int id, UserProfileDTO dto) {
        UserProfile profile = userProfileRepository.findById(id)
                .filter(p -> p.getDeletedAt() == null)
                .orElseThrow(() -> new ClientException(HttpStatus.NOT_FOUND, "No profile with that id"));

        dto.setEmail(null);
        dto.setId(null);
        UserProfile saved = userProfileService.updateUserProfile(dto, profile);
        return toDetail(saved);
    }

    private AdminProfileSummaryDTO toSummary(UserProfile profile) {
        AdminProfileSummaryDTO dto = new AdminProfileSummaryDTO();
        dto.setId(profile.getId());
        dto.setDisplayId(commonUtils.convertToJMFormat(profile.getId()));
        dto.setName(profile.getName());
        dto.setGender(profile.getGender());
        dto.setEmail(profile.getEmail());
        dto.setMobileNo(profile.getMobileNumber());
        dto.setCreatedAt(profile.getCreatedAt());
        dto.setVerified(Boolean.TRUE.equals(profile.getVerified()));
        dto.setBlocked(Boolean.TRUE.equals(profile.getBlocked()));

        List<AttachmentDao> attachments = attachmentRepository.findByUserId(profile.getId());
        dto.setIsPhoto(attachments != null && !attachments.isEmpty());
        if (attachments != null && !attachments.isEmpty()) {
            AttachmentDao primary = attachments.stream()
                    .filter(a -> a.getIsPrimary() != null && a.getIsPrimary())
                    .findFirst()
                    .orElse(attachments.get(0));
            dto.setProfileImage(s3Service.generatePresignedThumbnailUrl(primary.getName()));
        }

        return dto;
    }

    private AdminProfileDetailDTO toDetail(UserProfile profile) {
        AdminProfileDetailDTO dto = new AdminProfileDetailDTO();
        dto.setId(profile.getId());
        dto.setDisplayId(commonUtils.convertToJMFormat(profile.getId()));
        dto.setName(profile.getName());
        dto.setGender(profile.getGender());
        dto.setMaritalStatus(profile.getMaritalStatus());
        dto.setDateOfBirth(profile.getDateOfBirth());
        dto.setHeight(profile.getHeight());
        dto.setCity(profile.getCity());
        dto.setState(profile.getState());
        dto.setEducation(profile.getEducation());
        dto.setProfession(profile.getProfession());
        dto.setAboutMyself(profile.getAboutMyself());
        dto.setEmail(profile.getEmail());
        dto.setMobileNo(profile.getMobileNumber());
        dto.setCreatedAt(profile.getCreatedAt());
        dto.setVerified(Boolean.TRUE.equals(profile.getVerified()));
        dto.setBlocked(Boolean.TRUE.equals(profile.getBlocked()));

        dto.setComplexion(profile.getComplexion());
        dto.setWeight(profile.getWeight());
        dto.setDiet(profile.getDiet());
        dto.setDisability(profile.getDisability());
        dto.setBloodGroup(profile.getBloodGroup());
        dto.setCountry(profile.getCountry());
        dto.setTown(profile.getTown());
        dto.setFathersContactNo(profile.getFathersContactNumber());
        dto.setWhatsappNo(profile.getWhatsappNumber());
        dto.setPresentAddress(profile.getPresentAddress());
        dto.setPermanentAddress(profile.getPermanentAddress());
        dto.setGotra(profile.getGotra());
        dto.setAakna(profile.getAakna());
        dto.setMotherTongue(profile.getMotherTongue());
        dto.setTimeOfBirth(profile.getTimeOfBirth());
        dto.setPlaceOfBirth(profile.getPlaceOfBirth());
        dto.setZodiac(profile.getZodiac());
        dto.setFathersName(profile.getFathersName());
        dto.setFathersOccupation(profile.getFathersOccupation());
        dto.setMothersName(profile.getMothersName());
        dto.setMothersOccupation(profile.getMothersOccupation());
        dto.setMarriedBrothers(profile.getNoOfMarriedBrothers());
        dto.setUnmarriedBrothers(profile.getNoOfUnmarriedBrothers());
        dto.setMarriedSisters(profile.getNoOfMarriedSisters());
        dto.setUnmarriedSisters(profile.getNoOfUnmarriedSisters());
        dto.setMaternalUnclesName(profile.getMaternalUnclesName());
        dto.setMaternalUnclesGotra(profile.getMaternalUnclesGotra());
        dto.setHouseStatus(profile.getHouseStatus());
        dto.setCarStatus(profile.getCarStatus());
        dto.setEducationDetails(profile.getEducationDetail());
        dto.setOccupationDetails(profile.getOccupationDetail());
        dto.setAnnualIncome(profile.getAnnualIncome());
        dto.setNakshatra(profile.getNakshatra());
        dto.setPartnerPreferences(profile.getPartnerPreferences());
        dto.setManglik(profile.getManglik());
        dto.setWorkCity(profile.getWorkCity());
        dto.setEmployedIn(profile.getEmployedIn());
        dto.setOrganization(profile.getOrganization());

        dto.setHidden(Boolean.TRUE.equals(profile.getHidden()));

        List<AttachmentDao> attachments = attachmentRepository.findByUserId(profile.getId());
        if (attachments != null && !attachments.isEmpty()) {
            dto.setPhotos(attachments.stream()
                    .map(a -> s3Service.generatePresignedThumbnailUrl(a.getName()))
                    .toList());
            dto.setPhotoDetails(attachments.stream()
                    .map(a -> new AdminProfileDetailDTO.AdminPhotoDTO(
                            a.getId(),
                            s3Service.generatePresignedThumbnailUrl(a.getName()),
                            Boolean.TRUE.equals(a.getIsPrimary())))
                    .toList());
        }

        return dto;
    }

    public AdminProfileDetailDTO createProfile(AdminCreateProfileDTO dto) {
        if (dto.getName() == null || dto.getName().isBlank()) {
            throw new ClientException(HttpStatus.BAD_REQUEST, "Member name is required");
        }

        String email = dto.getEmail();
        if (email != null && !email.isBlank()) {
            email = email.trim().toLowerCase();
            if (userProfileRepository.findByEmail(email).isPresent()) {
                throw new ClientException(HttpStatus.CONFLICT, "A user with email " + email + " already exists");
            }
        } else if (dto.getMobileNo() != null && !dto.getMobileNo().isBlank()) {
            String sanitizedPhone = dto.getMobileNo().replaceAll("[^0-9]", "");
            email = "user." + sanitizedPhone + "@LOVEWANSHIpariniy.in";
            if (userProfileRepository.findByEmail(email).isPresent()) {
                email = "user." + sanitizedPhone + "." + System.currentTimeMillis() + "@LOVEWANSHIpariniy.in";
            }
        } else {
            email = "user." + System.currentTimeMillis() + "@LOVEWANSHIpariniy.in";
        }

        UserProfile user = new UserProfile();
        user.setName(dto.getName().trim());
        user.setEmail(email);
        if (dto.getMobileNo() != null && !dto.getMobileNo().isBlank()) {
            user.setMobileNumber(dto.getMobileNo().trim());
        }

        String rawPassword = (dto.getPassword() != null && !dto.getPassword().isBlank())
                ? dto.getPassword().trim()
                : "Lovewanshi@2026";
        user.setPassword(passwordEncoder.encode(rawPassword));

        user.setStatus(Status.APPROVED);
        user.setVerified(dto.getVerified() != null ? dto.getVerified() : true);
        user.setCreatedAt(LocalDateTime.now());
        user.setLastActive(LocalDateTime.now());

        UserProfile savedUser = userProfileRepository.save(user);

        // Grant standard membership offer
        try {
            billingService.grantSignupOfferMembership(savedUser);
        } catch (Exception e) {
            log.warn("Failed to grant signup offer for admin-created profile {}: {}", savedUser.getId(), e.getMessage());
        }

        // Apply remaining profile fields
        dto.setEmail(null);
        dto.setId(null);
        UserProfile fullySaved = userProfileService.updateUserProfile(dto, savedUser);

        return toDetail(fullySaved);
    }

    public AdminProfileDetailDTO uploadPhoto(int profileId, MultipartFile file) {
        UserProfile profile = userProfileRepository.findById(profileId)
                .filter(p -> p.getDeletedAt() == null)
                .orElseThrow(() -> new ClientException(HttpStatus.NOT_FOUND, "No profile with that id"));

        if (file == null || file.isEmpty()) {
            throw new ClientException(HttpStatus.BAD_REQUEST, "Photo file cannot be empty");
        }

        try {
            String originalName = file.getOriginalFilename() != null ? file.getOriginalFilename() : "photo.jpg";
            String fileName = UUID.randomUUID().toString() + "_" + originalName;
            String s3Path = s3Service.uploadFile(file.getBytes(), fileName);

            AttachmentDao attachment = new AttachmentDao();
            attachment.setName(fileName);
            attachment.setType(file.getContentType() != null ? file.getContentType() : "image/jpeg");
            attachment.setPath(s3Path);
            attachment.setUserId(profile.getId());

            List<AttachmentDao> existing = attachmentRepository.findByUserId(profile.getId());
            attachment.setIsPrimary(existing == null || existing.isEmpty());
            attachmentRepository.save(attachment);

            return toDetail(profile);
        } catch (IOException e) {
            log.error("Photo upload failed for profile {}: {}", profileId, e.getMessage(), e);
            throw new ClientException(HttpStatus.INTERNAL_SERVER_ERROR, "Failed to upload photo: " + e.getMessage());
        }
    }

    public AdminProfileDetailDTO deletePhoto(int profileId, int attachmentId) {
        UserProfile profile = userProfileRepository.findById(profileId)
                .filter(p -> p.getDeletedAt() == null)
                .orElseThrow(() -> new ClientException(HttpStatus.NOT_FOUND, "No profile with that id"));

        AttachmentDao attachment = attachmentRepository.findById(attachmentId)
                .filter(a -> a.getUserId() != null && a.getUserId().equals(profileId))
                .orElseThrow(() -> new ClientException(HttpStatus.NOT_FOUND, "Photo not found for this profile"));

        boolean wasPrimary = Boolean.TRUE.equals(attachment.getIsPrimary());
        attachmentRepository.delete(attachment);

        if (wasPrimary) {
            List<AttachmentDao> remaining = attachmentRepository.findByUserId(profileId);
            if (remaining != null && !remaining.isEmpty()) {
                AttachmentDao nextPrimary = remaining.get(0);
                nextPrimary.setIsPrimary(true);
                attachmentRepository.save(nextPrimary);
            }
        }

        return toDetail(profile);
    }

    public AdminProfileDetailDTO setPrimaryPhoto(int profileId, int photoId) {
        UserProfile profile = userProfileRepository.findById(profileId)
                .filter(p -> p.getDeletedAt() == null)
                .orElseThrow(() -> new ClientException(HttpStatus.NOT_FOUND, "No profile with that id"));

        List<AttachmentDao> attachments = attachmentRepository.findByUserId(profileId);
        if (attachments == null || attachments.isEmpty()) {
            throw new ClientException(HttpStatus.NOT_FOUND, "No photos found for this profile");
        }

        boolean found = false;
        for (AttachmentDao a : attachments) {
            if (a.getId() != null && a.getId() == photoId) {
                a.setIsPrimary(true);
                found = true;
            } else {
                a.setIsPrimary(false);
            }
        }

        if (!found) {
            throw new ClientException(HttpStatus.NOT_FOUND, "Photo not found for this profile");
        }

        attachmentRepository.saveAll(attachments);
        return toDetail(profile);
    }

    @CacheEvict(value = CacheConfiguration.FEATURED_STORIES_CACHE, allEntries = true)
    public AdminProfileDetailDTO setVisibility(int id, boolean hidden) {
        UserProfile profile = userProfileRepository.findById(id)
                .filter(p -> p.getDeletedAt() == null)
                .orElseThrow(() -> new ClientException(HttpStatus.NOT_FOUND, "No profile with that id"));

        profile.setHidden(hidden);
        UserProfile saved = userProfileRepository.save(profile);
        return toDetail(saved);
    }

    @CacheEvict(value = CacheConfiguration.FEATURED_STORIES_CACHE, allEntries = true)
    public void deleteProfile(int id) {
        UserProfile profile = userProfileRepository.findById(id)
                .filter(p -> p.getDeletedAt() == null)
                .orElseThrow(() -> new ClientException(HttpStatus.NOT_FOUND, "No profile with that id"));

        profile.setDeletedAt(LocalDateTime.now());
        profile.setHidden(true);
        userProfileRepository.save(profile);
    }
}

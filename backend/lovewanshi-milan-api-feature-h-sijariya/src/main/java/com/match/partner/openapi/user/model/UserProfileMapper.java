package com.match.partner.openapi.user.model;

import com.match.partner.common.Utils.CommonUtils;
import com.match.partner.openapi.user.model.dao.UserProfile;
import com.match.partner.openapi.user.model.dto.BasicInfoDTO;
import com.match.partner.openapi.user.model.dto.ContactInfoDTO;
import com.match.partner.openapi.user.model.dto.EducationInfoDTO;
import com.match.partner.openapi.user.model.dto.FamilyInfoDTO;
import com.match.partner.openapi.user.model.dto.ReligionInfoDTO;
import com.match.partner.openapi.user.model.dto.UserDto;
import com.match.partner.openapi.user.model.dto.UserProfileDTO;
import com.match.partner.openapi.attachment.model.entity.dao.AttachmentDao;
import com.match.partner.openapi.attachment.repository.AttachmentRepository;
import com.match.partner.common.service.S3ServiceInterface;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Component;

import java.util.List;
import java.util.stream.Collectors;

@Component
public class UserProfileMapper {

    @Autowired
    CommonUtils commonUtils;

    @Autowired
    AttachmentRepository attachmentRepository;

    @Autowired
    S3ServiceInterface s3Service;

    @Autowired
    com.match.partner.common.service.UserPresenceService userPresenceService;


    public UserProfileDTO toDto(UserProfile userProfile) {
        UserProfileDTO userProfileDTO = new UserProfileDTO();

        userProfileDTO.setName(userProfile.getName());
        userProfileDTO.setId(commonUtils.convertToJMFormat(userProfile.getId()));
        userProfileDTO.setMaritalStatus(userProfile.getMaritalStatus());
        userProfileDTO.setGender(userProfile.getGender());
        userProfileDTO.setComplexion(userProfile.getComplexion());
        userProfileDTO.setHeight(userProfile.getHeight());
        userProfileDTO.setWeight(userProfile.getWeight());
        userProfileDTO.setDiet(userProfile.getDiet());
        userProfileDTO.setDisability(userProfile.getDisability());
        userProfileDTO.setBloodGroup(userProfile.getBloodGroup());
        userProfileDTO.setProfileCreatedBy(userProfile.getProfileCreatedBy());
        userProfileDTO.setCountry(userProfile.getCountry());
        userProfileDTO.setState(userProfile.getState());
        userProfileDTO.setCity(userProfile.getCity());
        userProfileDTO.setTown(userProfile.getTown());
        userProfileDTO.setMobileNo(userProfile.getMobileNumber());
        userProfileDTO.setFathersContactNo(userProfile.getFathersContactNumber());
        userProfileDTO.setWhatsappNo(userProfile.getWhatsappNumber());
        userProfileDTO.setEmail(userProfile.getEmail());
        userProfileDTO.setPresentAddress(userProfile.getPresentAddress());
        userProfileDTO.setPermanentAddress(userProfile.getPermanentAddress());
        userProfileDTO.setGotra(userProfile.getGotra());
        userProfileDTO.setAakna(userProfile.getAakna());
        userProfileDTO.setMotherTongue(userProfile.getMotherTongue());
        userProfileDTO.setDateOfBirth(userProfile.getDateOfBirth());
        userProfileDTO.setTimeOfBirth(userProfile.getTimeOfBirth());
        userProfileDTO.setPlaceOfBirth(userProfile.getPlaceOfBirth());
        userProfileDTO.setZodiac(userProfile.getZodiac());
        userProfileDTO.setFathersName(userProfile.getFathersName());
        userProfileDTO.setFathersOccupation(userProfile.getFathersOccupation());
        userProfileDTO.setMothersName(userProfile.getMothersName());
        userProfileDTO.setMothersOccupation(userProfile.getMothersOccupation());
        userProfileDTO.setMarriedBrothers(userProfile.getNoOfMarriedBrothers());
        userProfileDTO.setUnmarriedBrothers(userProfile.getNoOfUnmarriedBrothers());
        userProfileDTO.setMarriedSisters(userProfile.getNoOfMarriedSisters());
        userProfileDTO.setUnmarriedSisters(userProfile.getNoOfUnmarriedSisters());
        userProfileDTO.setMaternalUnclesName(userProfile.getMaternalUnclesName());
        userProfileDTO.setMaternalUnclesAakna(userProfile.getMaternalUnclesAakna());
        userProfileDTO.setHouseStatus(userProfile.getHouseStatus());
        userProfileDTO.setCarStatus(userProfile.getCarStatus());
        userProfileDTO.setEducation(userProfile.getEducation());
        userProfileDTO.setEducationDetails(userProfile.getEducationDetail());
        userProfileDTO.setOccupationDetails(userProfile.getOccupationDetail());
        userProfileDTO.setAnnualIncome(userProfile.getAnnualIncome());
        userProfileDTO.setNakshatra(userProfile.getNakshatra());
        userProfileDTO.setAboutMyself(userProfile.getAboutMyself());
        userProfileDTO.setPartnerPreferences(userProfile.getPartnerPreferences());
        userProfileDTO.setManglik(userProfile.getManglik());
        userProfileDTO.setProfession(userProfile.getProfession());
        userProfileDTO.setWorkCity(userProfile.getWorkCity());
        userProfileDTO.setEmployedIn(userProfile.getEmployedIn());
        userProfileDTO.setOrganization(userProfile.getOrganization());
        userProfileDTO.setOccupationStartDate(userProfile.getOccupationStartDate());
        userProfileDTO.setLastActive(userProfile.getLastActive());
        userProfileDTO.setProfileCompletion(userProfile.getProfileCompletion());
        userProfileDTO.setPasswordSet(userProfile.isPasswordSet());
        userProfileDTO.setEmailVerified(userProfile.isEmailVerified());
        // Null-safe because rows written before the hidden column existed have
        // no value, and the app treats a missing flag as "visible" - which is
        // right, but only if it arrives as false rather than null.
        userProfileDTO.setHidden(Boolean.TRUE.equals(userProfile.getHidden()));
        userProfileDTO.setVerified(Boolean.TRUE.equals(userProfile.getVerified()));
        if (userProfile.getStatus() != null)
            userProfileDTO.setStatus(userProfile.getStatus().getValue());

        boolean online = userPresenceService.isOnline(userProfile.getEmail(), userProfile.getId());
        userProfileDTO.setIsOnline(online);
        userProfileDTO.setOnline(online);

        // Fetch attachments and generate GET presigned URLs
        List<AttachmentDao> attachments = attachmentRepository.findByUserId(userProfile.getId());
        if (attachments != null && !attachments.isEmpty()) {
            List<String> imageUrls = attachments.stream()
                    .map(att -> s3Service.generatePresignedUrl(att.getName()))
                    .collect(Collectors.toList());
            userProfileDTO.setProfileImages(imageUrls);
            
            List<com.match.partner.openapi.user.model.dto.ProfileImageDto> details = attachments.stream()
                    .map(att -> new com.match.partner.openapi.user.model.dto.ProfileImageDto(
                            att.getId(),
                            s3Service.generatePresignedUrl(att.getName()),
                            att.getIsPrimary() != null && att.getIsPrimary()
                    ))
                    .collect(Collectors.toList());
            userProfileDTO.setProfileImageDetails(details);
            
            // Find primary image or fallback to first
            AttachmentDao primary = attachments.stream()
                    .filter(att -> att.getIsPrimary() != null && att.getIsPrimary())
                    .findFirst()
                    .orElse(attachments.get(0));
            userProfileDTO.setProfileImage(s3Service.generatePresignedUrl(primary.getName()));
        }

        return userProfileDTO;
    }

    public UserDto toUserDto(UserProfile userProfile) {
        UserDto userDto = new UserDto();

        userDto.setName(userProfile.getName());
        userDto.setGender(userProfile.getGender());
        userDto.setHeight(userProfile.getHeight());
        userDto.setEmail(userProfile.getEmail());
        userDto.setPresentAddress(userProfile.getPresentAddress());
        userDto.setPermanentAddress(userProfile.getPermanentAddress());
        userDto.setDateOfBirth(userProfile.getDateOfBirth());
        userDto.setProfession(userProfile.getProfession());
        userDto.setId(commonUtils.convertToJMFormat(userProfile.getId()));
        userDto.setEducation(userProfile.getEducation());
        userDto.setGotra(userProfile.getGotra());
        
        boolean online = userPresenceService.isOnline(userProfile.getEmail(), userProfile.getId());
        userDto.setIsOnline(online);
        userDto.setOnline(online);
        
        userDto.setAnnualIncome(userProfile.getAnnualIncome());
        userDto.setZodiac(userProfile.getZodiac());
        userDto.setCity(userProfile.getCity());
        userDto.setState(userProfile.getState());
        userDto.setCreatedAt(userProfile.getCreatedAt());
        userDto.setVerified(Boolean.TRUE.equals(userProfile.getVerified()));

        // Fetch attachments and generate GET presigned URL for main image
        List<AttachmentDao> attachments = attachmentRepository.findByUserId(userProfile.getId());
        if (attachments != null && !attachments.isEmpty()) {
            AttachmentDao primary = attachments.stream()
                    .filter(att -> att.getIsPrimary() != null && att.getIsPrimary())
                    .findFirst()
                    .orElse(attachments.get(0));
            // Both variants return the crystal-clear original image presigned URL
            // so home feed cards, discovery rails, and profile views render with
            // world-class, sharp, non-blurry quality.
            userDto.setProfileImage(s3Service.generatePresignedUrl(primary.getName()));
            userDto.setProfileImageFull(s3Service.generatePresignedUrl(primary.getName()));
        }

        return userDto;
    }

    public BasicInfoDTO toBasicInfoDto(UserProfile userProfile) {
        BasicInfoDTO dto = new BasicInfoDTO();
        dto.setName(userProfile.getName());
        dto.setMobileNo(userProfile.getMobileNumber());
        dto.setProfileCreatedBy(userProfile.getProfileCreatedBy());
        dto.setGender(userProfile.getGender());
        dto.setMaritalStatus(userProfile.getMaritalStatus());
        dto.setDateOfBirth(userProfile.getDateOfBirth());
        dto.setHeight(userProfile.getHeight());
        dto.setWeight(userProfile.getWeight());
        dto.setComplexion(userProfile.getComplexion());
        dto.setBloodGroup(userProfile.getBloodGroup());
        dto.setDiet(userProfile.getDiet());
        dto.setDisability(userProfile.getDisability());
        return dto;
    }

    public ContactInfoDTO toContactInfoDto(UserProfile userProfile) {
        ContactInfoDTO dto = new ContactInfoDTO();
        dto.setMobileNo(userProfile.getMobileNumber());
        dto.setWhatsappNo(userProfile.getWhatsappNumber());
        dto.setCity(userProfile.getCity());
        dto.setState(userProfile.getState());
        dto.setCountry(userProfile.getCountry());
        dto.setPresentAddress(userProfile.getPresentAddress());
        dto.setPermanentAddress(userProfile.getPermanentAddress());
        return dto;
    }

    public ReligionInfoDTO toReligionInfoDto(UserProfile userProfile) {
        ReligionInfoDTO dto = new ReligionInfoDTO();
        dto.setGotra(userProfile.getGotra());
        dto.setAakna(userProfile.getAakna());
        dto.setMotherTongue(userProfile.getMotherTongue());
        dto.setTimeOfBirth(userProfile.getTimeOfBirth());
        dto.setPlaceOfBirth(userProfile.getPlaceOfBirth());
        dto.setZodiac(userProfile.getZodiac());
        dto.setManglik(userProfile.getManglik());
        dto.setNakshatra(userProfile.getNakshatra());
        return dto;
    }

    public EducationInfoDTO toEducationInfoDto(UserProfile userProfile) {
        EducationInfoDTO dto = new EducationInfoDTO();
        dto.setEducation(userProfile.getEducation());
        dto.setEducationDetails(userProfile.getEducationDetail());
        dto.setProfession(userProfile.getProfession());
        dto.setOccupationDetails(userProfile.getOccupationDetail());
        dto.setEmployedIn(userProfile.getEmployedIn());
        dto.setOrganization(userProfile.getOrganization());
        dto.setWorkCity(userProfile.getWorkCity());
        dto.setAnnualIncome(userProfile.getAnnualIncome());
        dto.setOccupationStartDate(userProfile.getOccupationStartDate());
        return dto;
    }

    public FamilyInfoDTO toFamilyInfoDto(UserProfile userProfile) {
        FamilyInfoDTO dto = new FamilyInfoDTO();
        dto.setFathersName(userProfile.getFathersName());
        dto.setFathersOccupation(userProfile.getFathersOccupation());
        dto.setFathersContactNo(userProfile.getFathersContactNumber());
        dto.setMothersName(userProfile.getMothersName());
        dto.setMothersOccupation(userProfile.getMothersOccupation());
        dto.setMarriedBrothers(userProfile.getNoOfMarriedBrothers());
        dto.setUnmarriedBrothers(userProfile.getNoOfUnmarriedBrothers());
        dto.setMarriedSisters(userProfile.getNoOfMarriedSisters());
        dto.setUnmarriedSisters(userProfile.getNoOfUnmarriedSisters());
        dto.setMaternalUnclesName(userProfile.getMaternalUnclesName());
        dto.setMaternalUnclesAakna(userProfile.getMaternalUnclesAakna());
        dto.setHouseStatus(userProfile.getHouseStatus());
        dto.setCarStatus(userProfile.getCarStatus());
        dto.setPartnerPreferences(userProfile.getPartnerPreferences());
        dto.setAboutMyself(userProfile.getAboutMyself());
        return dto;
    }
}

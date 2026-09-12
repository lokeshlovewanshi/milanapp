package com.match.partner.openapi.user.service;

import com.match.partner.openapi.user.model.dao.UserProfile;
import com.match.partner.openapi.user.model.dto.ProfileRegistrationDto;
import com.match.partner.openapi.user.model.dto.UserDto;
import com.match.partner.openapi.user.model.dto.UserProfileDTO;
import com.match.partner.openapi.user.model.dto.BasicInfoDTO;
import com.match.partner.openapi.user.model.dto.ContactInfoDTO;
import com.match.partner.openapi.user.model.dto.EducationInfoDTO;
import com.match.partner.openapi.user.model.dto.FamilyInfoDTO;
import com.match.partner.openapi.user.model.dto.ReligionInfoDTO;
import com.match.partner.openapi.user.model.dto.ProfileFilter;
import org.springframework.data.domain.Page;

import java.util.List;

public interface UserProfileServiceInterface {
    UserProfile updateUserProfile(UserProfileDTO dto, UserProfile userProfile);
    UserProfile registerProfile(ProfileRegistrationDto userProfileDTO, String userName);
    void updateUserProfile(UserProfileDTO userProfileDTO, String userName);
    void registerUserProfile(UserProfileDTO userProfileDTO, String userName);
    UserProfileDTO getUser(String userName);
    /**
     * A page of other members.
     *
     * @param oppositeGender true for the browse feed, which shows only the
     *                       gender the caller is looking for; false for "see all
     *                       profiles", which is meant to be everyone
     */
    Page<UserDto> getUsers(int page, int size, String userName, boolean oppositeGender);

    /**
     * Same listing, narrowed by the "See all profiles" filter bar.
     *
     * @param filter fields left null are not filtered on
     */
    Page<UserDto> getUsers(int page, int size, String userName, boolean oppositeGender, ProfileFilter filter);

    /** Hide or unhide the caller's own profile. Reversible. */
    void setProfileHidden(String userName, boolean hidden);

    void changePassword(String userName, String currentPassword, String newPassword);

    List<UserDto> storiesOfTheDay(String userName, int size);

    /** Soft-delete the caller's own profile. */
    void deleteOwnProfile(String userName);
    UserProfileDTO getUsers(Integer id, String userName);

    BasicInfoDTO getBasicInfo(String userName);
    void updateBasicInfo(BasicInfoDTO dto, String userName);

    ContactInfoDTO getContactInfo(String userName);
    void updateContactInfo(ContactInfoDTO dto, String userName);

    ReligionInfoDTO getReligionInfo(String userName);
    void updateReligionInfo(ReligionInfoDTO dto, String userName);

    EducationInfoDTO getEducationInfo(String userName);
    void updateEducationInfo(EducationInfoDTO dto, String userName);

    FamilyInfoDTO getFamilyInfo(String userName);
    void updateFamilyInfo(FamilyInfoDTO dto, String userName);
}
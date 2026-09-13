package com.match.partner.openapi.shortlist.model.dto;

import com.match.partner.common.Utils.CommonUtils;
import com.match.partner.openapi.likes.model.LikedDto;
import com.match.partner.openapi.user.model.dao.UserProfile;
import com.match.partner.openapi.user.model.dto.UserDto;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Component;

@RequiredArgsConstructor
@Component
public class UserMapper {
    @Autowired
    private final CommonUtils commonUtils;
    public  UserDto toUserDto(UserProfile userProfile) {
        UserDto dto = new UserDto();
        dto.setId(String.valueOf(userProfile.getId()));
        dto.setName(userProfile.getName());
        dto.setGender(userProfile.getGender());
        dto.setHeight(userProfile.getHeight());
        dto.setPresentAddress(userProfile.getPresentAddress());
        dto.setPermanentAddress(userProfile.getPermanentAddress());
        dto.setDateOfBirth(userProfile.getDateOfBirth());
        dto.setEmail(userProfile.getEmail());
        dto.setProfession(userProfile.getProfession());
        dto.setId(commonUtils.convertToJMFormat(userProfile.getId()));
        return dto;
    }
}

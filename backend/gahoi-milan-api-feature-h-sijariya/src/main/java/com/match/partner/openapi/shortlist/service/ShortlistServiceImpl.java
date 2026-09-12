package com.match.partner.openapi.shortlist.service;

import com.match.partner.openapi.shortlist.model.dao.Shortlist;
import com.match.partner.openapi.shortlist.model.dao.ShortlistId;
import com.match.partner.openapi.shortlist.model.dto.ShortlistRequest;
import com.match.partner.openapi.user.model.UserProfileMapper;
import com.match.partner.openapi.shortlist.repository.ShortlistRepository;
import com.match.partner.openapi.user.model.dao.UserProfile;
import com.match.partner.openapi.user.model.dto.ShortlistDto;
import com.match.partner.openapi.user.model.dto.UserDto;
import com.match.partner.openapi.user.repository.UserProfileRepository;
import com.match.partner.common.configuration.ClientException;
import org.springframework.http.HttpStatus;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.Optional;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class ShortlistServiceImpl implements ShortlistServiceInterface {
    private final ShortlistRepository shortlistRepository;
    private final UserProfileRepository userProfileRepository;
    private final UserProfileMapper userMapper;


    public List<UserDto> getShortlistedProfiles(String userName) {
        Optional<UserProfile> userProfileOptional = userProfileRepository.findByEmail(userName);
        int profileId = userProfileOptional.get().getId();
        return shortlistRepository.findByProfileIdOrderByShortlistedAtDesc(profileId).stream()
                .filter(s -> s.getShortlistedProfile() != null && Boolean.TRUE.equals(s.getShortlistedProfile().getVerified()))
                .map(this::convertToDto)
                .collect(Collectors.toList());
    }

    private UserDto convertToDto(Shortlist shortlist) {
        UserDto shortlistedProfileDto = userMapper.toUserDto(shortlist.getShortlistedProfile());
        return shortlistedProfileDto;
    }

    public Shortlist saveShortlist(Integer shortlistId, String userName) {
        Optional<UserProfile> userProfileOptional = userProfileRepository.findByEmail(userName);
        UserProfile userProfile = userProfileOptional.get();
        if (!Boolean.TRUE.equals(userProfile.getVerified())) {
            throw new ClientException(HttpStatus.FORBIDDEN,
                    "Your profile is under verification. Please wait for admin approval.");
        }
        int profileId = userProfile.getId();
        // Same reasoning as the self-like guard: the endpoint takes any id, and
        // a self-shortlist puts you in your own saved list.
        if (profileId == shortlistId) {
            throw new IllegalArgumentException("You cannot shortlist your own profile.");
        }
        // Create the composite ID for the Shortlist entity
        ShortlistId id = new ShortlistId();
        id.setProfileId(profileId);
        id.setShortlistedId(shortlistId);

        // Create the Shortlist entity
        Shortlist shortlist = new Shortlist();
        shortlist.setId(id);

        // Optionally, you can set relationships for eager loading (if needed)
        UserProfile profile = new UserProfile();
        profile.setId(profileId);
        shortlist.setProfile(profile);

        UserProfile shortlistedProfile = new UserProfile();
        shortlistedProfile.setId(shortlistId);
        shortlist.setShortlistedProfile(shortlistedProfile);

        // Save the Shortlist entity in the database
        return shortlistRepository.save(shortlist);
    }

    public void remove(Integer shortlistId, String userName) {
        Optional<UserProfile> userProfileOptional = userProfileRepository.findByEmail(userName);
        UserProfile userProfile = userProfileOptional.get();
        int profileId = userProfile.getId();
        ShortlistId id = new ShortlistId();
        id.setProfileId(profileId);
        id.setShortlistedId(shortlistId);
        shortlistRepository.deleteById(id);
    }
}

package com.match.partner.openapi.likes.service;

import com.match.partner.openapi.likes.model.LikedDto;
import com.match.partner.openapi.likes.model.ProfileLike;
import com.match.partner.openapi.likes.model.ProfileLikeId;
import com.match.partner.openapi.likes.model.Status;
import com.match.partner.openapi.likes.repository.ProfileLikeRepository;
import com.match.partner.openapi.notification.model.NotificationType;
import com.match.partner.openapi.notification.service.NotificationServiceInterface;
import com.match.partner.openapi.user.model.UserProfileMapper;
import com.match.partner.openapi.user.model.dao.UserProfile;
import com.match.partner.openapi.user.model.dto.UserDto;
import com.match.partner.openapi.user.repository.UserProfileRepository;
import com.match.partner.common.configuration.ClientException;
import org.springframework.http.HttpStatus;
import jakarta.persistence.EntityNotFoundException;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class ProfileLikeServiceImpl implements ProfileLikeServiceInterface {


    private final ProfileLikeRepository profileLikeRepository;
    private final UserProfileRepository userProfileRepository;
    private final UserProfileMapper userMapper;
    private final NotificationServiceInterface notificationService;


    public String likeProfile(String userName, int likedId) {
        Optional<UserProfile> userProfileOptional = userProfileRepository.findByEmail(userName);
        int userId = userProfileOptional.get().getId();
        UserProfile userProfile = userProfileRepository.findById(userId).orElseThrow(() -> new EntityNotFoundException("Liker not found"));
        if (!Boolean.TRUE.equals(userProfile.getVerified())) {
            throw new ClientException(HttpStatus.FORBIDDEN,
                    "Your profile is under verification. Please wait for admin approval before sending connection requests.");
        }
        // The feed no longer lists you to yourself, but the endpoint is still
        // reachable with any id. A self-like would create a row whose liker and
        // liked profile are the same person, which then renders as a connection
        // request from yourself.
        if (userId == likedId) {
            return "You cannot send a connection request to yourself.";
        }
        if (profileLikeRepository.existsByIdLikerIdAndIdLikedProfileId(userId, likedId)) {
            return "You have already liked this profile.";
        }
        // A connection already exists in the opposite direction (they sent interest
        // to us). Creating a second row for the same pair would leave two
        // conflicting statuses, so treat it as already connected.
        if (profileLikeRepository.existsByIdLikerIdAndIdLikedProfileId(likedId, userId)) {
            return "You have already liked this profile.";
        }
        UserProfile likedUserProfile = userProfileRepository.findById(likedId).orElseThrow(() -> new EntityNotFoundException("Liked profile not found"));
        if (!Boolean.TRUE.equals(likedUserProfile.getVerified())) {
            throw new ClientException(HttpStatus.NOT_FOUND,
                    "This profile is not available or is under verification.");
        }
        ProfileLike profileLike = new ProfileLike();
        profileLike.setId(new ProfileLikeId(userId, likedId));
        profileLike.setLikedAt(LocalDateTime.now());
        profileLike.setStatus(Status.PENDING);
        profileLike.setLikedProfile(likedUserProfile);
        profileLike.setLiker(userProfile);
        profileLikeRepository.save(profileLike);

        // Tell the other person. Notification failures must not undo the like,
        // so this is deliberately outside the success path's return value -
        // notifyUser persists a row and pushes asynchronously.
        notificationService.notifyUser(
                likedId,
                NotificationType.LIKE_RECEIVED,
                "New connection request",
                userProfile.getName() + " is interested in your profile",
                userId
        );

        return "Profile liked successfully.";
    }

    public List<LikedDto> getAllLikes(String userName) {
        Optional<UserProfile> userProfileOptional = userProfileRepository.findByEmail(userName);
        int userId = userProfileOptional.get().getId();
        return profileLikeRepository.findByIdLikedProfileIdOrderByLikedAtDesc(userId).stream().map(this::convertToDto)
                .collect(Collectors.toList());
    }

//    private UserDto convertToDto(ProfileLike shortlist) {
//        UserDto shortlistedProfileDto = userMapper.toUserDto(shortlist.getLikedProfile());
//        return shortlistedProfileDto;
//    }

    private LikedDto convertToDto2(ProfileLike likedProfile){
        LikedDto likedDto = new LikedDto();
        UserDto shortlistedProfileDto = userMapper.toUserDto(likedProfile.getLikedProfile());
        likedDto.setLikedProfile(shortlistedProfileDto);
        likedDto.setStatus(likedProfile.getStatus().getValue());
        likedDto.setLikedAt(likedProfile.getLikedAt());
        return likedDto;
    }
    private LikedDto convertToDto(ProfileLike likedProfile){
        LikedDto likedDto = new LikedDto();
        UserDto shortlistedProfileDto = userMapper.toUserDto(likedProfile.getLiker());
        likedDto.setLikedProfile(shortlistedProfileDto);
        likedDto.setStatus(likedProfile.getStatus().getValue());
        likedDto.setLikedAt(likedProfile.getLikedAt());
        return likedDto;
    }

    public String acceptLike(String acceptedBy, int acceptedId) {
        Optional<UserProfile> userProfileOptional = userProfileRepository.findByEmail(acceptedBy);
        int userId = userProfileOptional.get().getId();
        if (!profileLikeRepository.existsByIdLikerIdAndIdLikedProfileId(acceptedId, userId)) {
            return "Like not found.";
        }
        ProfileLikeId likedId = new ProfileLikeId(acceptedId, userId);
        Optional<ProfileLike> profileLikeOptional = profileLikeRepository.findById(likedId);
        ProfileLike profileLike = profileLikeOptional.get();
        profileLike.setStatus(Status.ACCEPTED);
        profileLikeRepository.save(profileLike);

        // The original sender is the one waiting to hear back.
        notificationService.notifyUser(
                acceptedId,
                NotificationType.LIKE_ACCEPTED,
                "Request accepted",
                userProfileOptional.get().getName() + " accepted your connection request",
                userId
        );

        return "Like accepted.";
    }

    public String rejectLike(String rejectedBy, int rejectId) {
        Optional<UserProfile> userProfileOptional = userProfileRepository.findByEmail(rejectedBy);
        int userId = userProfileOptional.get().getId();
        if (!profileLikeRepository.existsByIdLikerIdAndIdLikedProfileId(rejectId, userId)) {
            return "Like not found.";
        }
        ProfileLikeId rejectKey = new ProfileLikeId(rejectId, userId);
        Optional<ProfileLike> profileLikeOptional = profileLikeRepository.findById(rejectKey);
        ProfileLike profileLike = profileLikeOptional.get();
        profileLike.setStatus(Status.REJECTED);
        profileLikeRepository.save(profileLike);
        return "Like rejected.";
    }

    public List<LikedDto> getMyLikesStatus(String userName) {
        Optional<UserProfile> userProfileOptional = userProfileRepository.findByEmail(userName);
        int userId = userProfileOptional.get().getId();
        return profileLikeRepository.findByIdLikerIdOrderByLikedAtDesc(userId).stream().map(this::convertToDto2)
                .collect(Collectors.toList());
    }


    /**
     * Disconnect from a profile. The connection row lives in whichever direction
     * the original interest was sent, so either party must be able to remove it:
     * if I liked them the row is (me, them); if they liked me and I accepted, it
     * is (them, me). Deleting only the first direction left an orphaned row that
     * made re-connecting fail with "already liked".
     */
    public void removeLike(String userName, int otherProfileId) {
        Optional<UserProfile> userProfileOptional = userProfileRepository.findByEmail(userName);
        int userId = userProfileOptional.get().getId();

        ProfileLikeId sent = new ProfileLikeId(userId, otherProfileId);
        if (profileLikeRepository.existsById(sent)) {
            profileLikeRepository.deleteById(sent);
        }

        ProfileLikeId received = new ProfileLikeId(otherProfileId, userId);
        if (profileLikeRepository.existsById(received)) {
            profileLikeRepository.deleteById(received);
        }
    }
}

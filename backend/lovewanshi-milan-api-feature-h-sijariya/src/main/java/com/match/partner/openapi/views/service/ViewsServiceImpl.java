package com.match.partner.openapi.views.service;

import com.match.partner.openapi.user.model.UserProfileMapper;
import com.match.partner.openapi.user.model.dao.UserProfile;
import com.match.partner.openapi.user.model.dto.UserDto;
import com.match.partner.openapi.user.repository.UserProfileRepository;
import com.match.partner.openapi.views.model.dao.Views;
import com.match.partner.openapi.views.model.dao.ViewsId;
import com.match.partner.openapi.views.model.dto.ViewsDto;
import com.match.partner.openapi.views.model.dto.ViewsRequest;
import com.match.partner.openapi.views.repository.ViewsRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;
import java.util.stream.Collectors;

import com.match.partner.openapi.notification.model.NotificationType;
import com.match.partner.openapi.notification.service.NotificationServiceInterface;
import com.match.partner.openapi.likes.model.ProfileLike;
import com.match.partner.openapi.likes.model.ProfileLikeId;
import com.match.partner.openapi.likes.repository.ProfileLikeRepository;
import com.match.partner.openapi.shortlist.repository.ShortlistRepository;
import com.match.partner.openapi.shortlist.model.dao.ShortlistId;

@Service
@RequiredArgsConstructor
public class ViewsServiceImpl implements ViewsServiceInterface {

    /** How long a viewer stays "already announced" to the same profile owner. */
    private static final int VIEW_NOTIFY_COOLDOWN_HOURS = 24;

    private final ViewsRepository viewsRepository;
    private final UserProfileRepository userProfileRepository;
    private final UserProfileMapper userMapper;
    private final ProfileLikeRepository profileLikeRepository;
    private final ShortlistRepository shortlistRepository;
    private final NotificationServiceInterface notificationService;


    public void addView(ViewsRequest request) {
        Views views = new Views();
        ViewsId id = new ViewsId();
        id.setProfileId(request.getProfileId());
        id.setViewedBy(request.getViewedBy());
        views.setId(id);
        views.setViewedAt(LocalDateTime.now());

        viewsRepository.save(views);
    }


    public void addView(int profileId, int viewedById) {
        UserProfile viewedBy = userProfileRepository.findById(viewedById)
                .orElseThrow(() -> new RuntimeException("User not found with ID: " + viewedById));
        upsertView(profileId, viewedBy);
    }

    public void addView(int profileId, String userName) {
        UserProfile viewedBy = userProfileRepository.findByEmail(userName)
                .orElseThrow(() -> new RuntimeException("User not found: " + userName));
        upsertView(profileId, viewedBy);
    }

    /**
     * (profile_id, viewed_by) is the composite primary key of `views`, so viewing
     * the same profile a second time cannot insert another row. Refresh the
     * timestamp on an existing row instead of inserting a duplicate - otherwise
     * every repeat visit fails with "Duplicate entry ... for key views.PRIMARY".
     * Self-views are not recorded at all.
     */
    private void upsertView(int profileId, UserProfile viewer) {
        if (viewer.getId() == profileId) {
            return; // don't log viewing your own profile
        }
        if (!Boolean.TRUE.equals(viewer.getVerified())) {
            return; // don't log views or notify if viewer is not verified
        }

        ViewsId id = new ViewsId();
        id.setProfileId(profileId);
        id.setViewedBy(viewer.getId());

        Optional<Views> existing = viewsRepository.findById(id);

        // Captured before the timestamp is overwritten below - afterwards there
        // is no way left to tell a first visit from the hundredth.
        LocalDateTime previouslyViewedAt = existing.map(Views::getViewedAt).orElse(null);

        Views views = existing.orElseGet(() -> {
            Views fresh = new Views();
            fresh.setId(id);
            fresh.setViewedBy(viewer);
            return fresh;
        });
        views.setViewedAt(LocalDateTime.now());

        viewsRepository.save(views);

        if (Boolean.TRUE.equals(viewer.getVerified()) && shouldNotifyOfView(previouslyViewedAt)) {
            notificationService.notifyUser(
                    profileId,
                    NotificationType.PROFILE_VIEW,
                    "Someone viewed your profile",
                    viewer.getName() + " viewed your profile",
                    viewer.getId()
            );
        }
    }

    /**
     * Whether this view is worth telling the owner about.
     *
     * Notifying on every view would be unusable. Opening a profile, going back,
     * and opening it again is normal browsing, and each of those hits this path
     * - the owner would get a push per tap from a single interested person.
     *
     * So: notify on a first-ever view, then at most once a day per viewer. That
     * still surfaces the thing people actually want to know ("someone is
     * looking at me", "they came back") without turning one curious visitor
     * into a stream of notifications.
     *
     * @param previouslyViewedAt when this viewer last opened this profile, or
     *                           null if they never had
     */
    private boolean shouldNotifyOfView(LocalDateTime previouslyViewedAt) {
        if (previouslyViewedAt == null) {
            return true;
        }
        return previouslyViewedAt.isBefore(LocalDateTime.now().minusHours(VIEW_NOTIFY_COOLDOWN_HOURS));
    }

    public List<ViewsDto> getViews(String userName) {
        Optional<UserProfile> userProfileOptional = userProfileRepository.findByEmail(userName);
        int profileId = userProfileOptional.get().getId();
        return viewsRepository.findByIdProfileIdOrderByViewedAtDesc(profileId).stream()
                .filter(v -> v.getViewedBy() != null && Boolean.TRUE.equals(v.getViewedBy().getVerified()))
                .map(views -> convertToDto(views, profileId))
                .collect(Collectors.toList());
    }


    private ViewsDto convertToDto(Views views, int viewerId) {
        ViewsDto dto = new ViewsDto();
        UserDto viewedProfileDto = userMapper.toUserDto(views.getViewedBy());
        
        int viewedProfileId = views.getViewedBy().getId();
        Optional<ProfileLike> profileLike = profileLikeRepository.findById(new ProfileLikeId(viewerId, viewedProfileId));
        viewedProfileDto.setIsLiked(profileLike.isPresent());
        viewedProfileDto.setLikeStatus(profileLike.map(like -> like.getStatus().name()).orElse(null));

        ShortlistId shortlistId = new ShortlistId();
        shortlistId.setProfileId(viewerId);
        shortlistId.setShortlistedId(viewedProfileId);
        boolean isShortlisted = shortlistRepository.existsById(shortlistId);
        viewedProfileDto.setIsShortlisted(isShortlisted);
        
        dto.setViewedBy(viewedProfileDto);
        dto.setViewedAt(views.getViewedAt());

        return dto;
    }
}

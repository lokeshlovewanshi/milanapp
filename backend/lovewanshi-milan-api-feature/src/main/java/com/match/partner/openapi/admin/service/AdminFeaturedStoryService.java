package com.match.partner.openapi.admin.service;

import com.match.partner.common.Utils.CommonUtils;
import com.match.partner.common.configuration.CacheConfiguration;
import com.match.partner.common.configuration.ClientException;
import com.match.partner.common.service.S3ServiceInterface;
import com.match.partner.openapi.admin.model.dao.FeaturedStory;
import com.match.partner.openapi.admin.model.dto.AddFeaturedStoryRequest;
import com.match.partner.openapi.admin.model.dto.CachedFeaturedStory;
import com.match.partner.openapi.admin.model.dto.FeaturedStoryDTO;
import com.match.partner.openapi.admin.repository.AdminUserRepository;
import com.match.partner.openapi.admin.repository.FeaturedStoryRepository;
import com.match.partner.openapi.attachment.model.entity.dao.AttachmentDao;
import com.match.partner.openapi.attachment.repository.AttachmentRepository;
import com.match.partner.openapi.likes.repository.ProfileLikeRepository;
import com.match.partner.openapi.user.model.dao.UserProfile;
import com.match.partner.openapi.user.repository.UserProfileRepository;
import com.match.partner.openapi.views.repository.ViewsRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.cache.annotation.CacheEvict;
import org.springframework.cache.annotation.Cacheable;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;

/** The "Top Stories" rail: which profiles, and in what order. */
@Service
@RequiredArgsConstructor
public class AdminFeaturedStoryService {

    private final FeaturedStoryRepository featuredStoryRepository;
    private final UserProfileRepository userProfileRepository;
    private final AdminUserRepository adminUserRepository;
    private final AttachmentRepository attachmentRepository;
    private final ViewsRepository viewsRepository;
    private final ProfileLikeRepository profileLikeRepository;
    private final S3ServiceInterface s3Service;
    private final CommonUtils commonUtils;

    public List<FeaturedStoryDTO> list() {
        return featuredStoryRepository.findAllByOrderBySortOrderAsc().stream()
                .map(this::toDto)
                .toList();
    }

    /**
     * Active featured stories for the mobile app / web client.
     * Story data is retrieved from in-memory cache (1 day TTL) and presigned image URLs
     * are signed fresh on every request.
     */
    public List<FeaturedStoryDTO> listActive() {
        return getActiveStoriesData().stream()
                .map(this::toDtoWithFreshImage)
                .toList();
    }

    /**
     * In-memory cached active featured story metadata (TTL: 1 day).
     * Caches only data and raw photo filenames, never presigned image URLs.
     */
    @Cacheable(value = CacheConfiguration.FEATURED_STORIES_CACHE, key = "'activeStoriesData'")
    public List<CachedFeaturedStory> getActiveStoriesData() {
        LocalDateTime now = LocalDateTime.now();
        return featuredStoryRepository.findAllByIsActiveTrueOrderBySortOrderAsc().stream()
                .filter(story -> (story.getStartsAt() == null || !story.getStartsAt().isAfter(now))
                              && (story.getEndsAt() == null || !story.getEndsAt().isBefore(now)))
                .map(this::toCachedData)
                .filter(dto -> dto != null && dto.getName() != null)
                .toList();
    }

    @Transactional
    @CacheEvict(value = CacheConfiguration.FEATURED_STORIES_CACHE, allEntries = true)
    public FeaturedStoryDTO add(AddFeaturedStoryRequest request, String adminEmail) {
        if (request.getProfileId() == null) {
            throw new ClientException(HttpStatus.BAD_REQUEST, "profileId is required");
        }

        UserProfile profile = userProfileRepository.findById(request.getProfileId())
                .filter(p -> p.getDeletedAt() == null)
                .orElseThrow(() -> new ClientException(HttpStatus.NOT_FOUND, "No profile with that id"));

        // One row per profile - the unique key on the table would reject a
        // second insert anyway, but this gives an admin a message instead of a
        // raw constraint-violation stack trace.
        if (featuredStoryRepository.findByUserProfileId(profile.getId()).isPresent()) {
            throw new ClientException(HttpStatus.CONFLICT, "That profile is already featured");
        }

        FeaturedStory story = new FeaturedStory();
        story.setUserProfileId(profile.getId());
        story.setSortOrder(request.getSortOrder() != null ? request.getSortOrder() : nextSortOrder());
        story.setNote(request.getNote());
        story.setIsActive(true);
        adminUserRepository.findByEmailIgnoreCase(adminEmail).ifPresent(a -> story.setCreatedBy(a.getId()));

        featuredStoryRepository.save(story);
        return toDto(story);
    }

    @CacheEvict(value = CacheConfiguration.FEATURED_STORIES_CACHE, allEntries = true)
    public void remove(int id) {
        if (!featuredStoryRepository.existsById(id)) {
            throw new ClientException(HttpStatus.NOT_FOUND, "No featured story with that id");
        }
        featuredStoryRepository.deleteById(id);
    }

    private int nextSortOrder() {
        return featuredStoryRepository.findAllByOrderBySortOrderAsc().stream()
                .mapToInt(FeaturedStory::getSortOrder)
                .max()
                .orElse(0) + 10;
    }

    private FeaturedStoryDTO toDto(FeaturedStory story) {
        FeaturedStoryDTO dto = new FeaturedStoryDTO();
        dto.setId(story.getId());
        dto.setUserProfileId(story.getUserProfileId());
        dto.setSortOrder(story.getSortOrder());
        dto.setNote(story.getNote());
        dto.setDisplayId(commonUtils.convertToJMFormat(story.getUserProfileId()));
        dto.setViewsCount(viewsRepository.countByIdProfileId(story.getUserProfileId()));
        dto.setConnectsCount(profileLikeRepository.countByIdLikedProfileId(story.getUserProfileId()));

        userProfileRepository.findById(story.getUserProfileId()).ifPresent(profile -> {
            dto.setName(profile.getName());

            List<AttachmentDao> attachments = attachmentRepository.findByUserId(profile.getId());
            if (attachments != null && !attachments.isEmpty()) {
                AttachmentDao primary = attachments.stream()
                        .filter(a -> a.getIsPrimary() != null && a.getIsPrimary())
                        .findFirst()
                        .orElse(attachments.get(0));
                dto.setProfileImage(s3Service.generatePresignedUrl(primary.getName()));
            }
        });

        return dto;
    }

    private CachedFeaturedStory toCachedData(FeaturedStory story) {
        UserProfile profile = userProfileRepository.findById(story.getUserProfileId())
                // Top Stories is another member-facing discovery surface, so
                // it follows exactly the same visibility rules as Home.
                .filter(p -> p.getDeletedAt() == null
                        && !Boolean.TRUE.equals(p.getHidden())
                        && !Boolean.TRUE.equals(p.getBlocked())
                        && Boolean.TRUE.equals(p.getVerified()))
                .orElse(null);
        if (profile == null) {
            return null;
        }

        String primaryPhotoFileName = null;
        List<AttachmentDao> attachments = attachmentRepository.findByUserId(profile.getId());
        if (attachments != null && !attachments.isEmpty()) {
            AttachmentDao primary = attachments.stream()
                    .filter(a -> a.getIsPrimary() != null && a.getIsPrimary())
                    .findFirst()
                    .orElse(attachments.get(0));
            primaryPhotoFileName = primary.getName();
        }

        long viewsCount = viewsRepository.countByIdProfileId(profile.getId());
        long connectsCount = profileLikeRepository.countByIdLikedProfileId(profile.getId());

        return CachedFeaturedStory.builder()
                .id(profile.getId())
                .userProfileId(profile.getId())
                .sortOrder(story.getSortOrder())
                .note(story.getNote())
                .displayId(commonUtils.convertToJMFormat(profile.getId()))
                .name(profile.getName())
                .photoFileName(primaryPhotoFileName)
                .viewsCount(viewsCount)
                .connectsCount(connectsCount)
                .build();
    }

    private FeaturedStoryDTO toDtoWithFreshImage(CachedFeaturedStory cached) {
        FeaturedStoryDTO dto = new FeaturedStoryDTO();
        dto.setId(cached.getId());
        dto.setUserProfileId(cached.getUserProfileId());
        dto.setSortOrder(cached.getSortOrder());
        dto.setNote(cached.getNote());
        dto.setDisplayId(cached.getDisplayId());
        dto.setName(cached.getName());
        dto.setViewsCount(cached.getViewsCount());
        dto.setConnectsCount(cached.getConnectsCount());

        if (cached.getPhotoFileName() != null && !cached.getPhotoFileName().isBlank()) {
            dto.setProfileImage(s3Service.generatePresignedUrl(cached.getPhotoFileName()));
        }

        return dto;
    }
}

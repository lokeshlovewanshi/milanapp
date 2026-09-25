package com.match.partner.openapi.admin.service;

import com.match.partner.common.Utils.CommonUtils;
import com.match.partner.common.service.S3ServiceInterface;
import com.match.partner.openapi.admin.model.dao.FeaturedStory;
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
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class AdminFeaturedStoryServiceTest {

    @Mock
    private FeaturedStoryRepository featuredStoryRepository;

    @Mock
    private UserProfileRepository userProfileRepository;

    @Mock
    private AdminUserRepository adminUserRepository;

    @Mock
    private AttachmentRepository attachmentRepository;

    @Mock
    private ViewsRepository viewsRepository;

    @Mock
    private ProfileLikeRepository profileLikeRepository;

    @Mock
    private S3ServiceInterface s3Service;

    private CommonUtils commonUtils = new CommonUtils();
    private AdminFeaturedStoryService featuredStoryService;

    @BeforeEach
    void setUp() {
        featuredStoryService = new AdminFeaturedStoryService(
                featuredStoryRepository,
                userProfileRepository,
                adminUserRepository,
                attachmentRepository,
                viewsRepository,
                profileLikeRepository,
                s3Service,
                commonUtils
        );
    }

    @Test
    void cachesOnlyDataAndSignsImagesFreshOnListActive() {
        FeaturedStory story = new FeaturedStory();
        story.setId(1);
        story.setUserProfileId(101);
        story.setIsActive(true);
        story.setSortOrder(10);
        story.setNote("Doctor from Bhopal");

        UserProfile profile = new UserProfile();
        profile.setId(101);
        profile.setName("Aarav Lodha");
        profile.setVerified(true);

        AttachmentDao attachment = new AttachmentDao();
        attachment.setName("photo_101.jpg");
        attachment.setIsPrimary(true);

        when(featuredStoryRepository.findAllByIsActiveTrueOrderBySortOrderAsc())
                .thenReturn(List.of(story));
        when(userProfileRepository.findById(101))
                .thenReturn(Optional.of(profile));
        when(attachmentRepository.findByUserId(101))
                .thenReturn(List.of(attachment));
        when(viewsRepository.countByIdProfileId(101)).thenReturn(42L);
        when(profileLikeRepository.countByIdLikedProfileId(101)).thenReturn(15L);
        when(s3Service.generatePresignedUrl("photo_101.jpg"))
                .thenReturn("https://cdn.example.com/photo_101.jpg?signed=fresh1")
                .thenReturn("https://cdn.example.com/photo_101.jpg?signed=fresh2");

        // 1. Get cached data directly
        List<CachedFeaturedStory> cachedData = featuredStoryService.getActiveStoriesData();
        assertEquals(1, cachedData.size());
        assertEquals("Aarav Lodha", cachedData.get(0).getName());
        assertEquals("photo_101.jpg", cachedData.get(0).getPhotoFileName());
        assertEquals(101, cachedData.get(0).getUserProfileId());
        assertEquals(42L, cachedData.get(0).getViewsCount());
        assertEquals(15L, cachedData.get(0).getConnectsCount());

        // 2. Call listActive() - should sign image with fresh URL and retain cached counts
        List<FeaturedStoryDTO> firstCall = featuredStoryService.listActive();
        assertEquals(1, firstCall.size());
        assertEquals("https://cdn.example.com/photo_101.jpg?signed=fresh1", firstCall.get(0).getProfileImage());
        assertEquals(42L, firstCall.get(0).getViewsCount());
        assertEquals(15L, firstCall.get(0).getConnectsCount());

        // 3. Call listActive() again - receives a fresh URL from s3Service
        List<FeaturedStoryDTO> secondCall = featuredStoryService.listActive();
        assertEquals(1, secondCall.size());
        assertEquals("https://cdn.example.com/photo_101.jpg?signed=fresh2", secondCall.get(0).getProfileImage());
        assertEquals(42L, secondCall.get(0).getViewsCount());
        assertEquals(15L, secondCall.get(0).getConnectsCount());
    }
}

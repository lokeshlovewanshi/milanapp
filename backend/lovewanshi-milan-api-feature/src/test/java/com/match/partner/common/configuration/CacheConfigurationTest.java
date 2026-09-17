package com.match.partner.common.configuration;

import com.match.partner.openapi.admin.model.dto.CachedFeaturedStory;
import org.junit.jupiter.api.Test;
import org.springframework.cache.Cache;
import org.springframework.cache.CacheManager;

import java.util.List;

import static org.junit.jupiter.api.Assertions.*;

class CacheConfigurationTest {

    @Test
    void testFeaturedStoriesCacheLifecycle() {
        CacheConfiguration config = new CacheConfiguration();
        CacheManager cacheManager = config.cacheManager();
        assertNotNull(cacheManager);

        Cache cache = cacheManager.getCache(CacheConfiguration.FEATURED_STORIES_CACHE);
        assertNotNull(cache);

        CachedFeaturedStory item = CachedFeaturedStory.builder()
                .id(10)
                .userProfileId(10)
                .name("Test Story")
                .photoFileName("test_photo.jpg")
                .sortOrder(1)
                .build();

        // Put in cache
        cache.put("activeStoriesData", List.of(item));

        // Get from cache
        Cache.ValueWrapper wrapper = cache.get("activeStoriesData");
        assertNotNull(wrapper);
        @SuppressWarnings("unchecked")
        List<CachedFeaturedStory> cachedList = (List<CachedFeaturedStory>) wrapper.get();
        assertEquals(1, cachedList.size());
        assertEquals("Test Story", cachedList.get(0).getName());
        assertEquals("test_photo.jpg", cachedList.get(0).getPhotoFileName());

        // Evict
        cache.clear();
        assertNull(cache.get("activeStoriesData"));
    }
}

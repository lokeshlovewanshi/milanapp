package com.match.partner.common.configuration;

import com.github.benmanes.caffeine.cache.Caffeine;
import org.springframework.cache.CacheManager;
import org.springframework.cache.annotation.EnableCaching;
import org.springframework.cache.caffeine.CaffeineCacheManager;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

import java.util.concurrent.TimeUnit;

/**
 * In-memory caching configuration with Caffeine.
 *
 * Configures a 1-day TTL for featured stories and reference data caches.
 */
@Configuration
@EnableCaching
public class CacheConfiguration {

    public static final String FEATURED_STORIES_CACHE = "featuredStories";

    @Bean
    public CacheManager cacheManager() {
        CaffeineCacheManager cacheManager = new CaffeineCacheManager(FEATURED_STORIES_CACHE);
        cacheManager.setCaffeine(Caffeine.newBuilder()
                .expireAfterWrite(1, TimeUnit.DAYS)
                .maximumSize(500));
        return cacheManager;
    }
}

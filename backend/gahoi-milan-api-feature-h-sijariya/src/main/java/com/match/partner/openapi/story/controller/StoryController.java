package com.match.partner.openapi.story.controller;

import com.match.partner.openapi.admin.model.dto.FeaturedStoryDTO;
import com.match.partner.openapi.admin.service.AdminFeaturedStoryService;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

/**
 * Public/User endpoints for Top Stories / Featured Stories shown on the Home Screen.
 */
@RestController
@RequestMapping("/api/v1/stories")
public class StoryController {

    private final AdminFeaturedStoryService featuredStoryService;

    public StoryController(AdminFeaturedStoryService featuredStoryService) {
        this.featuredStoryService = featuredStoryService;
    }

    /**
     * Returns the active top/featured stories curated by administrators.
     */
    @GetMapping("/top")
    public List<FeaturedStoryDTO> getTopStories() {
        return featuredStoryService.listActive();
    }
}

package com.match.partner.openapi.admin.controller;

import com.match.partner.openapi.admin.model.dto.AddFeaturedStoryRequest;
import com.match.partner.openapi.admin.model.dto.FeaturedStoryDTO;
import com.match.partner.openapi.admin.service.AdminFeaturedStoryService;
import org.springframework.web.bind.annotation.*;

import java.util.List;

/** Guarded by AdminJwtInterceptor - every method here requires an admin token. */
@RestController
@RequestMapping("/api/v1/admin/featured-stories")
public class AdminFeaturedStoryController {

    private final AdminFeaturedStoryService featuredStoryService;

    public AdminFeaturedStoryController(AdminFeaturedStoryService featuredStoryService) {
        this.featuredStoryService = featuredStoryService;
    }

    @GetMapping
    public List<FeaturedStoryDTO> list() {
        return featuredStoryService.list();
    }

    @PostMapping
    public FeaturedStoryDTO add(@RequestBody AddFeaturedStoryRequest request,
                                @RequestAttribute("adminEmail") String adminEmail) {
        return featuredStoryService.add(request, adminEmail);
    }

    @DeleteMapping("/{id}")
    public void remove(@PathVariable int id) {
        featuredStoryService.remove(id);
    }
}

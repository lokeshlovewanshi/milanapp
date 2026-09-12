package com.match.partner.openapi.admin.controller;

import com.match.partner.openapi.admin.model.dto.AdminCreateProfileDTO;
import com.match.partner.openapi.admin.model.dto.AdminProfileDetailDTO;
import com.match.partner.openapi.admin.model.dto.AdminProfileSummaryDTO;
import com.match.partner.openapi.admin.service.AdminProfileService;
import com.match.partner.openapi.user.model.dto.UserProfileDTO;
import org.springframework.data.domain.Page;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

/** Guarded by AdminJwtInterceptor - every method here requires an admin token. */
@RestController
@RequestMapping("/api/v1/admin/profiles")
public class AdminProfileController {

    private final AdminProfileService adminProfileService;

    public AdminProfileController(AdminProfileService adminProfileService) {
        this.adminProfileService = adminProfileService;
    }

    @GetMapping("/unverified")
    public Page<AdminProfileSummaryDTO> unverified(@RequestParam(defaultValue = "0") int page,
                                                    @RequestParam(defaultValue = "20") int size) {
        return adminProfileService.unverified(page, size);
    }

    /** All verified profiles with search and pagination for the admin verified queue. */
    @GetMapping("/verified")
    public Page<AdminProfileSummaryDTO> verified(@RequestParam(required = false) String search,
                                                 @RequestParam(defaultValue = "0") int page,
                                                 @RequestParam(defaultValue = "20") int size) {
        return adminProfileService.verified(search, page, size);
    }

    /** Every live profile, for picking one to feature - not just the unverified queue. */
    @GetMapping
    public Page<AdminProfileSummaryDTO> all(@RequestParam(required = false) String search,
                                            @RequestParam(defaultValue = "0") int page,
                                            @RequestParam(defaultValue = "20") int size) {
        return adminProfileService.all(search, page, size);
    }

    @GetMapping("/{id}")
    public AdminProfileDetailDTO find(@PathVariable int id) {
        return adminProfileService.find(id);
    }

    /** Creates a new user profile on behalf of a member. */
    @PostMapping
    public AdminProfileDetailDTO create(@RequestBody AdminCreateProfileDTO dto) {
        return adminProfileService.createProfile(dto);
    }

    /** Uploads a photo for a user profile. */
    @PostMapping("/{id}/photos")
    public AdminProfileDetailDTO uploadPhoto(@PathVariable int id, @RequestParam("file") MultipartFile file) {
        return adminProfileService.uploadPhoto(id, file);
    }

    /** Deletes a photo from a user profile. */
    @DeleteMapping("/{id}/photos/{photoId}")
    public AdminProfileDetailDTO deletePhoto(@PathVariable int id, @PathVariable int photoId) {
        return adminProfileService.deletePhoto(id, photoId);
    }

    /** Sets a photo as the primary photo for a user profile. */
    @PostMapping("/{id}/photos/{photoId}/primary")
    public AdminProfileDetailDTO setPrimaryPhoto(@PathVariable int id, @PathVariable int photoId) {
        return adminProfileService.setPrimaryPhoto(id, photoId);
    }

    /** Edits any member-editable field. Email and password can never be changed here - see AdminProfileService.update. */
    @PatchMapping("/{id}")
    public AdminProfileDetailDTO update(@PathVariable int id, @RequestBody UserProfileDTO dto) {
        return adminProfileService.update(id, dto);
    }

    /** Toggles profile visibility (Hide / Unhide). */
    @PatchMapping("/{id}/visibility")
    public AdminProfileDetailDTO setVisibility(@PathVariable int id, @RequestBody VisibilityRequest request) {
        return adminProfileService.setVisibility(id, request.hidden());
    }

    public record VisibilityRequest(boolean hidden) {}

    /** Soft-deletes a user profile (marks deleted_at and hidden = true). */
    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteProfile(@PathVariable int id) {
        adminProfileService.deleteProfile(id);
        return ResponseEntity.noContent().build();
    }

    @PostMapping("/{id}/verify")
    public AdminProfileSummaryDTO verify(@PathVariable int id) {
        return adminProfileService.verify(id);
    }

    @PostMapping("/{id}/block")
    public AdminProfileSummaryDTO block(@PathVariable int id) {
        return adminProfileService.block(id);
    }

    @PostMapping("/{id}/unblock")
    public AdminProfileSummaryDTO unblock(@PathVariable int id) {
        return adminProfileService.unblock(id);
    }
}

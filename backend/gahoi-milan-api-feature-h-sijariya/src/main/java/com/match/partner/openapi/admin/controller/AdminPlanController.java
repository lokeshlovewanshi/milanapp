package com.match.partner.openapi.admin.controller;

import com.match.partner.openapi.admin.model.dto.AdminMembershipSummaryDTO;
import com.match.partner.openapi.admin.model.dto.AdminPlanDTO;
import com.match.partner.openapi.admin.model.dto.UpdatePlanRequest;
import com.match.partner.openapi.admin.service.AdminPlanService;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.web.bind.annotation.*;

import java.util.List;

/** Guarded by AdminJwtInterceptor - every method here requires an admin token. */
@RestController
@RequestMapping("/api/v1/admin/plans")
@RequiredArgsConstructor
public class AdminPlanController {

    private final AdminPlanService adminPlanService;

    @GetMapping
    public List<AdminPlanDTO> listPlans() {
        return adminPlanService.listPlans();
    }

    @GetMapping("/{id}")
    public AdminPlanDTO getPlan(@PathVariable int id) {
        return adminPlanService.getPlan(id);
    }

    @PutMapping("/{id}")
    public AdminPlanDTO updatePlan(@PathVariable int id, @RequestBody UpdatePlanRequest request) {
        return adminPlanService.updatePlan(id, request);
    }

    @PostMapping("/{id}/set-free-signup")
    public AdminPlanDTO setFreeSignupOffer(@PathVariable int id) {
        return adminPlanService.setFreeSignupOffer(id);
    }

    @GetMapping("/memberships")
    public Page<AdminMembershipSummaryDTO> listMemberships(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size
    ) {
        return adminPlanService.listMemberships(page, size);
    }
}

package com.match.partner.openapi.admin.service;

import com.match.partner.common.configuration.ClientException;
import com.match.partner.openapi.admin.model.dto.AdminMembershipSummaryDTO;
import com.match.partner.openapi.admin.model.dto.AdminPlanDTO;
import com.match.partner.openapi.admin.model.dto.UpdatePlanRequest;
import com.match.partner.openapi.billing.model.dao.Membership;
import com.match.partner.openapi.billing.model.dao.SubscriptionPlan;
import com.match.partner.openapi.billing.repository.MembershipRepository;
import com.match.partner.openapi.billing.repository.SubscriptionPlanRepository;
import com.match.partner.openapi.user.model.dao.UserProfile;
import com.match.partner.openapi.user.repository.UserProfileRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@Service
@Slf4j
@RequiredArgsConstructor
public class AdminPlanService {

    private final SubscriptionPlanRepository planRepository;
    private final MembershipRepository membershipRepository;
    private final UserProfileRepository userProfileRepository;

    /**
     * Lists all plans for admin management.
     */
    public List<AdminPlanDTO> listPlans() {
        return planRepository.findAllByOrderBySortOrderAsc().stream()
                .map(this::toAdminPlanDTO)
                .collect(Collectors.toList());
    }

    /**
     * Gets a single plan by ID.
     */
    public AdminPlanDTO getPlan(int id) {
        SubscriptionPlan plan = planRepository.findById(id)
                .orElseThrow(() -> new ClientException(HttpStatus.NOT_FOUND, "Plan not found with id " + id));
        return toAdminPlanDTO(plan);
    }

    /**
     * Updates plan details (pricing, discount, free-on-signup flag, offer duration, features).
     */
    @Transactional
    public AdminPlanDTO updatePlan(int id, UpdatePlanRequest request) {
        SubscriptionPlan plan = planRepository.findById(id)
                .orElseThrow(() -> new ClientException(HttpStatus.NOT_FOUND, "Plan not found with id " + id));

        if (request.getName() != null && !request.getName().isBlank()) {
            plan.setName(request.getName().trim());
        }
        if (request.getDurationMonths() != null) {
            plan.setDurationMonths(request.getDurationMonths());
        }
        if (request.getPriceRupees() != null) {
            plan.setPricePaise(Math.round(request.getPriceRupees() * 100));
        }
        if (request.getDiscountPriceRupees() != null) {
            plan.setDiscountPricePaise(request.getDiscountPriceRupees() < 0 ? null : Math.round(request.getDiscountPriceRupees() * 100));
        }
        if (request.getActive() != null) {
            plan.setActive(request.getActive());
        }
        if (request.getFreeOnSignup() != null) {
            // If setting this plan as free on signup, optionally unset others
            if (Boolean.TRUE.equals(request.getFreeOnSignup())) {
                unsetOtherFreeOnSignup(plan.getId());
            }
            plan.setFreeOnSignup(request.getFreeOnSignup());
        }
        if (request.getOfferStartsAt() != null) {
            plan.setOfferStartsAt(request.getOfferStartsAt());
        }
        if (request.getOfferEndsAt() != null) {
            plan.setOfferEndsAt(request.getOfferEndsAt());
        }
        if (request.getSortOrder() != null) {
            plan.setSortOrder(request.getSortOrder());
        }
        if (request.getFeatures() != null) {
            plan.setFeatures(request.getFeatures());
        }

        SubscriptionPlan saved = planRepository.save(plan);
        log.info("Admin updated subscription plan id={}: code={}, pricePaise={}, discountPaise={}, freeOnSignup={}",
                saved.getId(), saved.getCode(), saved.getPricePaise(), saved.getDiscountPricePaise(), saved.getFreeOnSignup());

        return toAdminPlanDTO(saved);
    }

    /**
     * Atomically sets a specific plan as the active Free Signup Offer.
     */
    @Transactional
    public AdminPlanDTO setFreeSignupOffer(int id) {
        SubscriptionPlan target = planRepository.findById(id)
                .orElseThrow(() -> new ClientException(HttpStatus.NOT_FOUND, "Plan not found with id " + id));

        // Unset any previous free on signup plans
        unsetOtherFreeOnSignup(target.getId());

        target.setFreeOnSignup(true);
        target.setActive(true);
        target.setDiscountPricePaise(0L);
        SubscriptionPlan saved = planRepository.save(target);

        log.info("Set plan {} ({}) as the active Free on Signup welcome offer", saved.getCode(), saved.getName());
        return toAdminPlanDTO(saved);
    }

    /**
     * Unsets the free on signup flag on all other plans.
     */
    private void unsetOtherFreeOnSignup(Integer excludeId) {
        List<SubscriptionPlan> allPlans = planRepository.findAll();
        for (SubscriptionPlan p : allPlans) {
            if (!p.getId().equals(excludeId) && Boolean.TRUE.equals(p.getFreeOnSignup())) {
                p.setFreeOnSignup(false);
                planRepository.save(p);
            }
        }
    }

    /**
     * Lists recent memberships across all users.
     */
    public Page<AdminMembershipSummaryDTO> listMemberships(int page, int size) {
        Page<Membership> memberships = membershipRepository.findAll(
                PageRequest.of(page, size, Sort.by(Sort.Direction.DESC, "startsAt"))
        );

        List<Integer> userIds = memberships.getContent().stream()
                .map(Membership::getUserProfileId)
                .distinct()
                .collect(Collectors.toList());

        List<Integer> planIds = memberships.getContent().stream()
                .map(Membership::getPlanId)
                .distinct()
                .collect(Collectors.toList());

        Map<Integer, UserProfile> usersMap = userProfileRepository.findAllById(userIds).stream()
                .collect(Collectors.toMap(UserProfile::getId, u -> u));

        Map<Integer, SubscriptionPlan> plansMap = planRepository.findAllById(planIds).stream()
                .collect(Collectors.toMap(SubscriptionPlan::getId, p -> p));

        return memberships.map(m -> {
            AdminMembershipSummaryDTO dto = new AdminMembershipSummaryDTO();
            dto.setId(m.getId());
            dto.setUserProfileId(m.getUserProfileId());
            dto.setPlanId(m.getPlanId());
            dto.setSource(m.getSource());
            dto.setStatus(m.getStatus());
            dto.setStartsAt(m.getStartsAt());
            dto.setExpiresAt(m.getExpiresAt());
            dto.setCurrent(m.isCurrent());

            UserProfile u = usersMap.get(m.getUserProfileId());
            if (u != null) {
                dto.setUserEmail(u.getEmail());
                dto.setUserName(u.getName());
                dto.setUserGmId(u.getId() != null ? "GM" + u.getId() : null);
                dto.setUserMobile(u.getMobileNumber());
            }

            SubscriptionPlan p = plansMap.get(m.getPlanId());
            if (p != null) {
                dto.setPlanName(p.getName());
                dto.setPlanCode(p.getCode());
                dto.setTier(p.getTier());
                dto.setDurationMonths(p.getDurationMonths());
            }

            return dto;
        });
    }

    private AdminPlanDTO toAdminPlanDTO(SubscriptionPlan plan) {
        AdminPlanDTO dto = new AdminPlanDTO();
        dto.setId(plan.getId());
        dto.setCode(plan.getCode());
        dto.setName(plan.getName());
        dto.setTier(plan.getTier());
        dto.setDurationMonths(plan.getDurationMonths());
        dto.setPricePaise(plan.getPricePaise());
        dto.setDiscountPricePaise(plan.getDiscountPricePaise());
        dto.setPriceRupees(plan.getPricePaise() != null ? plan.getPricePaise() / 100.0 : 0.0);
        dto.setDiscountPriceRupees(plan.getDiscountPricePaise() != null ? plan.getDiscountPricePaise() / 100.0 : null);
        dto.setCurrency(plan.getCurrency());
        dto.setActive(plan.getActive());
        dto.setFreeOnSignup(plan.getFreeOnSignup());
        dto.setOfferStartsAt(plan.getOfferStartsAt());
        dto.setOfferEndsAt(plan.getOfferEndsAt());
        dto.setIsOfferActive(plan.isOfferActive());
        dto.setSortOrder(plan.getSortOrder());
        dto.setFeatures(plan.getFeatures());

        if (plan.getPricePaise() != null && plan.getPricePaise() > 0) {
            long effective = plan.getEffectivePricePaise();
            long diff = plan.getPricePaise() - effective;
            if (diff > 0) {
                dto.setSavingsPercentage((int) Math.round(((double) diff / plan.getPricePaise()) * 100));
            }
        }

        return dto;
    }
}

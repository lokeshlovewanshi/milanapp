package com.match.partner.openapi.billing.controller;

import com.match.partner.openapi.billing.model.dto.CreateOrderRequest;
import com.match.partner.openapi.billing.model.dto.MembershipDTO;
import com.match.partner.openapi.billing.model.dto.OrderDTO;
import com.match.partner.openapi.billing.model.dto.PlanDTO;
import com.match.partner.openapi.billing.service.BillingService;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/v1/billing")
@RequiredArgsConstructor
public class BillingController {

    private final BillingService billingService;

    /**
     * Lists all available membership plans with prices, active discounts, and offers.
     */
    @GetMapping("/plans")
    public List<PlanDTO> listPlans(@AuthenticationPrincipal UserDetails userDetails) {
        String username = userDetails != null ? userDetails.getUsername() : null;
        return billingService.plans(username);
    }

    /**
     * Returns the current authenticated user's active membership details.
     */
    @GetMapping("/membership/me")
    public MembershipDTO myMembership(@AuthenticationPrincipal UserDetails userDetails) {
        if (userDetails == null) {
            return null;
        }
        return billingService.currentMembership(userDetails.getUsername());
    }

    /**
     * Create an order to purchase or upgrade a membership plan.
     */
    @PostMapping("/orders")
    public OrderDTO createOrder(
            @AuthenticationPrincipal UserDetails userDetails,
            @RequestBody CreateOrderRequest request
    ) {
        return billingService.createOrder(userDetails.getUsername(), request);
    }
}

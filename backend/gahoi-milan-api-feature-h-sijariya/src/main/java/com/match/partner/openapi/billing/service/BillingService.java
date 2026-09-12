package com.match.partner.openapi.billing.service;

import com.match.partner.openapi.billing.model.dao.*;
import com.match.partner.openapi.billing.model.dto.*;
import com.match.partner.openapi.billing.repository.*;
import com.match.partner.common.configuration.ClientException;
import com.match.partner.openapi.user.model.dao.UserProfile;
import com.match.partner.openapi.user.repository.UserProfileRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

/**
 * Plans, offers, orders and memberships.
 *
 * The rule this class exists to enforce: money is decided here and confirmed by
 * the gateway, never asserted by the app. The client picks a plan by name; the
 * amount, the discount and the eventual grant all come from the database.
 */
@Service
@Slf4j
@RequiredArgsConstructor
public class BillingService {

    private final SubscriptionPlanRepository planRepository;
    private final PromoCampaignRepository promoRepository;
    private final PromoRedemptionRepository redemptionRepository;
    private final PaymentOrderRepository orderRepository;
    private final MembershipRepository membershipRepository;
    private final UserProfileRepository userProfileRepository;
    private final PromotionService promotionService;

    /** Which gateway is live. Changing it here changes it for every new order. */
    @Value("${payments.provider:paytm}")
    private String provider;

    /** Where the gateway sends the customer back to. */
    @Value("${payments.return-url:gahoimilan://payment/return}")
    private String returnUrl;

    /** Our own page that posts into the gateway. Empty until it is deployed. */
    @Value("${payments.checkout-base-url:}")
    private String checkoutBaseUrl;

    // ------------------------------------------------------------------
    // Reading
    // ------------------------------------------------------------------

    /** Every plan on sale, priced for this member. */
    public List<PlanDTO> plans(String userName) {
        Integer userId = userIdOrNull(userName);
        List<PlanDTO> out = new ArrayList<>();

        for (SubscriptionPlan plan : planRepository.findByActiveTrueOrderBySortOrderAsc()) {
            out.add(price(plan, userId, null));
        }
        return out;
    }

    /** One plan, priced - including any coupon the member typed. */
    public PlanDTO price(SubscriptionPlan plan, Integer userId, String couponCode) {
        PlanDTO dto = new PlanDTO();
        dto.setId(plan.getId());
        dto.setCode(plan.getCode());
        dto.setName(plan.getName());
        dto.setTier(plan.getTier());
        dto.setDurationMonths(plan.getDurationMonths());
        dto.setPricePaise(plan.getPricePaise());
        dto.setDiscountPricePaise(plan.getDiscountPricePaise());
        dto.setCurrency(plan.getCurrency());
        dto.setFreeOnSignup(plan.getFreeOnSignup());
        dto.setIsOfferActive(plan.isOfferActive());
        dto.setOfferStartsAt(plan.getOfferStartsAt());
        dto.setOfferEndsAt(plan.getOfferEndsAt());
        dto.setFeatures(plan.getFeatures());

        long basePrice = plan.getPricePaise() != null ? plan.getPricePaise() : 0L;
        long discount = 0L;

        // 1. Check if plan is Free on Signup
        if (Boolean.TRUE.equals(plan.getFreeOnSignup()) && plan.isOfferActive()) {
            discount = basePrice;
            dto.setPromoName("Free Signup Offer");
            dto.setFreeWithPromo(true);
        } else if (plan.getDiscountPricePaise() != null && plan.isOfferActive()) {
            // 2. Check if plan has a direct discount price
            discount = Math.max(0, basePrice - plan.getDiscountPricePaise());
            dto.setPromoName("Special Offer");
            dto.setFreeWithPromo(plan.getDiscountPricePaise() == 0);
        }

        // 3. Check any extra coupon / promo campaigns if provided
        Optional<PromoCampaign> promo = promotionService.bestFor(plan, userId, couponCode);
        if (promo.isPresent()) {
            long promoDiscount = promo.get().discountFor(basePrice);
            if (promoDiscount > discount) {
                discount = promoDiscount;
                dto.setPromoName(promo.get().getName());
                dto.setPromoCode(promo.get().getCode());
            }
        }

        dto.setDiscountPaise(discount);
        long payable = Math.max(0, basePrice - discount);
        dto.setPayablePaise(payable);
        if (payable == 0 && basePrice > 0) {
            dto.setFreeWithPromo(true);
        }
        if (basePrice > 0 && discount > 0) {
            dto.setSavingsPercentage((int) Math.round(((double) discount / basePrice) * 100));
        }

        return dto;
    }

    /** The member's current plan, or null if they are on the free one. */
    public MembershipDTO currentMembership(String userName) {
        Integer userId = requireUserId(userName);

        return membershipRepository
                .findByUserProfileIdAndStatusOrderByStartsAtDesc(userId, "ACTIVE").stream()
                .filter(Membership::isCurrent)
                .findFirst()
                .map(this::toDto)
                .orElse(null);
    }

    /**
     * Automatically grants the active signup offer membership to a newly registered user.
     */
    @Transactional
    public Membership grantSignupOfferMembership(UserProfile user) {
        if (user == null || user.getId() == null) {
            return null;
        }

        // Check if user already has an active membership
        List<Membership> activeMemberships = membershipRepository
                .findByUserProfileIdAndStatusOrderByStartsAtDesc(user.getId(), "ACTIVE");
        if (!activeMemberships.isEmpty() && activeMemberships.stream().anyMatch(Membership::isCurrent)) {
            return activeMemberships.get(0);
        }

        // 1. Find plan marked with free_on_signup = true and active
        Optional<SubscriptionPlan> offerPlanOpt = planRepository
                .findByFreeOnSignupTrueAndActiveTrue().stream()
                .filter(SubscriptionPlan::isOfferActive)
                .findFirst();

        // 2. Fallback to Gold 12M or any active plan if not specifically marked
        SubscriptionPlan plan = offerPlanOpt
                .or(() -> planRepository.findByCode("gold_12m"))
                .or(() -> planRepository.findByCode("bronze_3m"))
                .or(() -> planRepository.findByActiveTrueOrderBySortOrderAsc().stream().findFirst())
                .orElse(null);

        if (plan == null) {
            log.warn("No active subscription plan found to grant signup offer to user {}", user.getId());
            return null;
        }

        Membership membership = new Membership();
        membership.setUserProfileId(user.getId());
        membership.setPlanId(plan.getId());
        membership.setSource("PROMO");
        membership.setStatus("ACTIVE");
        membership.setStartsAt(LocalDateTime.now());
        membership.setExpiresAt(plan.getDurationMonths() == null
                ? null
                : LocalDateTime.now().plusMonths(plan.getDurationMonths()));

        Membership saved = membershipRepository.save(membership);
        log.info("Granted {} plan ({} months, expires {}) to newly registered user {} ({})",
                plan.getName(), plan.getDurationMonths(), saved.getExpiresAt(), user.getId(), user.getEmail());

        return saved;
    }

    // ------------------------------------------------------------------
    // Buying
    // ------------------------------------------------------------------

    /**
     * Open an order for a plan.
     */
    @Transactional
    public OrderDTO createOrder(String userName, CreateOrderRequest request) {
        Integer userId = requireUserId(userName);

        SubscriptionPlan plan = planRepository.findByCode(request.getPlanId())
                .filter(SubscriptionPlan::getActive)
                .orElseThrow(() -> new ClientException(HttpStatus.NOT_FOUND, "That plan is not available."));

        if (plan.getPricePaise() == null || plan.getPricePaise() <= 0) {
            throw new ClientException(HttpStatus.BAD_REQUEST, "The free plan does not need to be bought.");
        }

        // Re-priced here rather than trusting anything the app sent, and after
        // the per-user cap has been re-checked.
        PlanDTO priced = price(plan, userId, request.getCouponCode());
        Optional<PromoCampaign> promo = priced.getPromoCode() == null
                ? Optional.empty()
                : promoRepository.findByCode(priced.getPromoCode());

        PaymentOrder order = new PaymentOrder();
        order.setOrderRef("GM" + UUID.randomUUID().toString().replace("-", "").substring(0, 20).toUpperCase());
        order.setUserProfileId(userId);
        order.setPlanId(plan.getId());
        order.setPromoId(promo.map(PromoCampaign::getId).orElse(null));
        order.setProvider(provider);
        order.setAmountPaise(priced.getPayablePaise());
        order.setDiscountPaise(priced.getDiscountPaise());
        order.setCurrency(plan.getCurrency());

        OrderDTO dto = new OrderDTO();
        dto.setProvider(provider);
        dto.setAmountPaise(priced.getPayablePaise());
        dto.setCurrency(plan.getCurrency());
        dto.setReturnUrl(returnUrl);

        if (priced.getPayablePaise() == 0) {
            order.setStatus("PAID");
            order.setPaidAt(LocalDateTime.now());
            orderRepository.save(order);

            promo.ifPresent(p -> recordRedemption(p, userId, order.getId(), priced.getDiscountPaise()));
            grant(userId, plan, order.getId(), promo.map(PromoCampaign::getId).orElse(null), "PROMO");

            dto.setOrderId(order.getOrderRef());
            dto.setGrantedFree(true);
            return dto;
        }

        if (checkoutBaseUrl == null || checkoutBaseUrl.isBlank()) {
            throw new ClientException(HttpStatus.SERVICE_UNAVAILABLE,
                    "Card payments are not switched on yet. Please try again later.");
        }

        order.setStatus("PENDING");
        orderRepository.save(order);

        dto.setOrderId(order.getOrderRef());
        dto.setCheckoutUrl(checkoutBaseUrl + "/" + order.getOrderRef());
        return dto;
    }

    /** The server's own view of an order, asked for after checkout. */
    public OrderStatusDTO orderStatus(String userName, String orderRef) {
        Integer userId = requireUserId(userName);

        PaymentOrder order = orderRepository.findByOrderRef(orderRef)
                .orElseThrow(() -> new ClientException(HttpStatus.NOT_FOUND, "Order not found"));

        if (!order.getUserProfileId().equals(userId)) {
            throw new ClientException(HttpStatus.NOT_FOUND, "Order not found");
        }

        OrderStatusDTO dto = new OrderStatusDTO();
        dto.setOrderId(order.getOrderRef());
        dto.setStatus(order.getStatus().toLowerCase());
        dto.setAmountPaise(order.getAmountPaise());
        dto.setMessage(order.getFailureReason());
        return dto;
    }

    /**
     * Mark an order paid and grant the membership.
     */
    @Transactional
    public void markPaid(PaymentOrder order, String providerPaymentId) {
        if ("PAID".equalsIgnoreCase(order.getStatus())) {
            log.info("Order {} already paid, ignoring repeat callback", order.getOrderRef());
            return;
        }

        order.setStatus("PAID");
        order.setPaidAt(LocalDateTime.now());
        order.setProviderPaymentId(providerPaymentId);
        orderRepository.save(order);

        SubscriptionPlan plan = planRepository.findById(order.getPlanId())
                .orElseThrow(() -> new IllegalStateException("Order " + order.getOrderRef() + " has no plan"));

        if (order.getPromoId() != null) {
            promoRepository.findById(order.getPromoId()).ifPresent(p ->
                    recordRedemption(p, order.getUserProfileId(), order.getId(), order.getDiscountPaise()));
        }

        grant(order.getUserProfileId(), plan, order.getId(), order.getPromoId(), "PURCHASE");
    }

    @Transactional
    public void markFailed(PaymentOrder order, String reason) {
        order.setStatus("FAILED");
        order.setFailureReason(reason);
        orderRepository.save(order);
    }

    // ------------------------------------------------------------------
    // Internals
    // ------------------------------------------------------------------

    private void grant(Integer userId, SubscriptionPlan plan, Long orderId, Integer promoId, String source) {
        membershipRepository.findByUserProfileIdAndStatusOrderByStartsAtDesc(userId, "ACTIVE")
                .forEach(existing -> {
                    existing.setStatus("REPLACED");
                    membershipRepository.save(existing);
                });

        Membership membership = new Membership();
        membership.setUserProfileId(userId);
        membership.setPlanId(plan.getId());
        membership.setPaymentOrderId(orderId);
        membership.setPromoId(promoId);
        membership.setSource(source);
        membership.setStartsAt(LocalDateTime.now());
        membership.setExpiresAt(plan.getDurationMonths() == null
                ? null
                : LocalDateTime.now().plusMonths(plan.getDurationMonths()));
        membershipRepository.save(membership);
    }

    private void recordRedemption(PromoCampaign promo, Integer userId, Long orderId, Long discount) {
        PromoRedemption redemption = new PromoRedemption();
        redemption.setPromoId(promo.getId());
        redemption.setUserProfileId(userId);
        redemption.setPaymentOrderId(orderId);
        redemption.setDiscountPaise(discount == null ? 0L : discount);
        redemptionRepository.save(redemption);

        promo.setRedeemedCount(promo.getRedeemedCount() + 1);
        promoRepository.save(promo);
    }

    private MembershipDTO toDto(Membership membership) {
        MembershipDTO dto = new MembershipDTO();
        planRepository.findById(membership.getPlanId()).ifPresent(plan -> {
            dto.setPlanCode(plan.getCode());
            dto.setPlanName(plan.getName());
            dto.setTier(plan.getTier());
        });
        dto.setExpiresAt(membership.getExpiresAt());
        dto.setSource(membership.getSource());
        dto.setActive(membership.isCurrent());
        return dto;
    }

    private Integer requireUserId(String userName) {
        return userProfileRepository.findByEmail(userName)
                .map(UserProfile::getId)
                .orElseThrow(() -> new ClientException(HttpStatus.NOT_FOUND, "User not found"));
    }

    private Integer userIdOrNull(String userName) {
        if (userName == null) return null;
        return userProfileRepository.findByEmail(userName).map(UserProfile::getId).orElse(null);
    }
}

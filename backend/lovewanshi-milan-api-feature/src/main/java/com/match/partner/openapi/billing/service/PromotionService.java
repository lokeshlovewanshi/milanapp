package com.match.partner.openapi.billing.service;

import com.match.partner.openapi.billing.model.dao.PromoCampaign;
import com.match.partner.openapi.billing.model.dao.SubscriptionPlan;
import com.match.partner.openapi.billing.repository.PromoCampaignRepository;
import com.match.partner.openapi.billing.repository.PromoRedemptionRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.util.Comparator;
import java.util.Optional;

/**
 * Decides which offer, if any, applies to a plan for a given member.
 *
 * One place, because the answer is needed twice - once to show a price and
 * again to charge it - and those two must never disagree. A screen that
 * advertises a free year and a checkout that asks for three thousand rupees is
 * worse than having no offer at all.
 */
@Service
@RequiredArgsConstructor
public class PromotionService {

    private final PromoCampaignRepository promoRepository;
    private final PromoRedemptionRepository redemptionRepository;

    /**
     * The best offer available to this member for this plan.
     *
     * "Best" is simply the largest discount. Where campaigns overlap, stacking
     * them would make the final price depend on the order they were created
     * in, which is not something anyone can reason about later.
     */
    public Optional<PromoCampaign> bestFor(SubscriptionPlan plan, Integer userProfileId, String couponCode) {
        if (plan.getPricePaise() == null || plan.getPricePaise() <= 0) return Optional.empty();

        if (couponCode != null && !couponCode.isBlank()) {
            return promoRepository.findByCouponCodeIgnoreCase(couponCode.trim())
                    .filter(PromoCampaign::isRunning)
                    .filter(p -> p.covers(plan))
                    .filter(p -> withinUserLimit(p, userProfileId));
        }

        return promoRepository.findByActiveTrueAndCouponCodeIsNull().stream()
                .filter(PromoCampaign::isRunning)
                .filter(p -> p.covers(plan))
                .filter(p -> withinUserLimit(p, userProfileId))
                .max(Comparator.comparingLong(p -> p.discountFor(plan.getPricePaise())));
    }

    /**
     * Whether this member may still claim this offer.
     *
     * Unknown member means "showing a price to nobody in particular" - the cap
     * is checked again for real when an order is created.
     */
    public boolean withinUserLimit(PromoCampaign promo, Integer userProfileId) {
        if (promo.getPerUserLimit() == null) return true;
        if (userProfileId == null) return true;
        return redemptionRepository.countByPromoIdAndUserProfileId(promo.getId(), userProfileId)
                < promo.getPerUserLimit();
    }
}

package com.match.partner.openapi.billing.repository;

import com.match.partner.openapi.billing.model.dao.PromoCampaign;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface PromoCampaignRepository extends JpaRepository<PromoCampaign, Integer> {

    Optional<PromoCampaign> findByCode(String code);

    Optional<PromoCampaign> findByCouponCodeIgnoreCase(String couponCode);

    /**
     * Campaigns that apply without a coupon.
     *
     * Date and cap checks are left to PromoCampaign.isRunning() rather than
     * expressed here: the same rule is needed when re-checking an offer at
     * payment time, and two copies of it would eventually disagree.
     */
    List<PromoCampaign> findByActiveTrueAndCouponCodeIsNull();
}

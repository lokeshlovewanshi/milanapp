package com.match.partner.openapi.billing.repository;

import com.match.partner.openapi.billing.model.dao.PromoRedemption;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface PromoRedemptionRepository extends JpaRepository<PromoRedemption, Long> {

    long countByPromoIdAndUserProfileId(Integer promoId, Integer userProfileId);
}

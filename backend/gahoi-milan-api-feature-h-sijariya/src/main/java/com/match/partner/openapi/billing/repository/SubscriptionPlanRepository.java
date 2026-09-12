package com.match.partner.openapi.billing.repository;

import com.match.partner.openapi.billing.model.dao.SubscriptionPlan;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface SubscriptionPlanRepository extends JpaRepository<SubscriptionPlan, Integer> {

    Optional<SubscriptionPlan> findByCode(String code);

    List<SubscriptionPlan> findByActiveTrueOrderBySortOrderAsc();

    List<SubscriptionPlan> findAllByOrderBySortOrderAsc();

    List<SubscriptionPlan> findByFreeOnSignupTrueAndActiveTrue();

    Optional<SubscriptionPlan> findFirstByFreeOnSignupTrueAndActiveTrue();
}

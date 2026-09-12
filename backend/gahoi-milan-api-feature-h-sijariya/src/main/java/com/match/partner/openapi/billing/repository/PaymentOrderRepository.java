package com.match.partner.openapi.billing.repository;

import com.match.partner.openapi.billing.model.dao.PaymentOrder;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface PaymentOrderRepository extends JpaRepository<PaymentOrder, Long> {

    Optional<PaymentOrder> findByOrderRef(String orderRef);

    Optional<PaymentOrder> findByProviderAndProviderOrderId(String provider, String providerOrderId);
}

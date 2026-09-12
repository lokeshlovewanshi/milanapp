package com.match.partner.openapi.billing.repository;

import com.match.partner.openapi.billing.model.dao.Membership;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface MembershipRepository extends JpaRepository<Membership, Long> {

    /** Newest first, so the current one is the head of the list. */
    List<Membership> findByUserProfileIdAndStatusOrderByStartsAtDesc(Integer userProfileId, String status);
}

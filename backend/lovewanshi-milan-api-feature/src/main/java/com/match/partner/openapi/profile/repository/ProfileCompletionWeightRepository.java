package com.match.partner.openapi.profile.repository;

import com.match.partner.openapi.profile.model.ProfileCompletionWeight;
import org.springframework.data.jpa.repository.JpaRepository;

public interface ProfileCompletionWeightRepository
        extends JpaRepository<ProfileCompletionWeight, String> {
}

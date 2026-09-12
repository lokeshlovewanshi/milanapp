package com.match.partner.openapi.admin.repository;

import com.match.partner.openapi.admin.model.dao.FeaturedStory;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface FeaturedStoryRepository extends JpaRepository<FeaturedStory, Integer> {
    List<FeaturedStory> findAllByOrderBySortOrderAsc();

    List<FeaturedStory> findAllByIsActiveTrueOrderBySortOrderAsc();

    Optional<FeaturedStory> findByUserProfileId(Integer userProfileId);
}

package com.match.partner.openapi.appversion.repository;

import com.match.partner.openapi.appversion.model.dao.AppRelease;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface AppReleaseRepository extends JpaRepository<AppRelease, Integer> {

    /**
     * The newest published build for a platform.
     *
     * "Published" excludes a release that was pulled after going out - is_active
     * false lets a bad build stop being recommended without deleting the row
     * (which would just let the previous release re-claim "latest").
     */
    Optional<AppRelease> findTopByPlatformAndIsActiveTrueOrderByVersionCodeDesc(String platform);
}

package com.match.partner.openapi.appversion.service;

import com.match.partner.openapi.appversion.model.dao.AppRelease;
import com.match.partner.openapi.appversion.model.dto.AppVersionCheckDTO;
import com.match.partner.openapi.appversion.repository.AppReleaseRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

@Service
@RequiredArgsConstructor
public class AppVersionService {

    private final AppReleaseRepository releaseRepository;

    /**
     * Whether the caller, on the given build, should update.
     *
     * No published release for the platform means nothing to compare against -
     * answered as "no update", not an error, so a platform with no releases
     * published yet (iOS, on day one) never blocks anybody.
     */
    public AppVersionCheckDTO check(String platform, int callerVersionCode) {
        AppVersionCheckDTO dto = new AppVersionCheckDTO();

        AppRelease latest = releaseRepository
                .findTopByPlatformAndIsActiveTrueOrderByVersionCodeDesc(platform)
                .orElse(null);

        if (latest == null) {
            return dto;
        }

        dto.setLatestVersionCode(latest.getVersionCode());
        dto.setLatestVersionName(latest.getVersionName());
        dto.setReleaseNotes(latest.getReleaseNotes());
        dto.setDownloadUrl(latest.getDownloadUrl());
        dto.setUpdateAvailable(callerVersionCode < latest.getVersionCode());
        dto.setForceUpdate(latest.getMinSupportedVersionCode() != null
                && callerVersionCode < latest.getMinSupportedVersionCode());

        return dto;
    }
}

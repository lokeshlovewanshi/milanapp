package com.match.partner.openapi.appversion.controller;

import com.match.partner.openapi.appversion.model.dto.AppVersionCheckDTO;
import com.match.partner.openapi.appversion.service.AppVersionService;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

/**
 * Unauthenticated on purpose - checked at launch, before anyone has signed in,
 * and permitted in SecurityConfiguration accordingly.
 */
@RestController
@RequestMapping("/api/v1/app")
public class AppVersionController {

    private final AppVersionService appVersionService;

    public AppVersionController(AppVersionService appVersionService) {
        this.appVersionService = appVersionService;
    }

    /**
     * @param platform    "android" or "ios"
     * @param versionCode the build the caller is currently running
     */
    @GetMapping("/version")
    public AppVersionCheckDTO checkVersion(@RequestParam String platform,
                                           @RequestParam int versionCode) {
        return appVersionService.check(platform, versionCode);
    }
}

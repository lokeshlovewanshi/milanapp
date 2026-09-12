package com.match.partner.openapi.admin.controller;

import com.match.partner.openapi.admin.model.dto.AdminLoginRequest;
import com.match.partner.openapi.admin.model.dto.AdminLoginResponse;
import com.match.partner.openapi.admin.service.AdminAuthService;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/admin")
public class AdminAuthController {

    private final AdminAuthService adminAuthService;

    public AdminAuthController(AdminAuthService adminAuthService) {
        this.adminAuthService = adminAuthService;
    }

    /** The only admin endpoint reachable without a token - see AdminJwtInterceptor. */
    @PostMapping("/login")
    public AdminLoginResponse login(@RequestBody AdminLoginRequest request) {
        return adminAuthService.login(request);
    }
}

package com.match.partner.openapi.admin.service;

import com.match.partner.common.configuration.ClientException;
import com.match.partner.common.service.JwtServiceInterface;
import com.match.partner.openapi.admin.model.dao.AdminUser;
import com.match.partner.openapi.admin.model.dto.AdminLoginRequest;
import com.match.partner.openapi.admin.model.dto.AdminLoginResponse;
import com.match.partner.openapi.admin.repository.AdminUserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.userdetails.User;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

/**
 * Signing in to the admin panel.
 *
 * Deliberately its own token, not a member JWT with a role bolted on: the
 * "admin" claim below is what {@link com.match.partner.common.interceptor.AdminJwtInterceptor}
 * checks before trusting anything on an /api/v1/admin/** request, and folding
 * that into the member login would mean any bug there is a bug here too.
 */
@Service
@RequiredArgsConstructor
public class AdminAuthService {

    private final AdminUserRepository adminUserRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtServiceInterface jwtService;

    public AdminLoginResponse login(AdminLoginRequest request) {
        String email = request.getEmail() == null ? "" : request.getEmail().trim();

        AdminUser admin = adminUserRepository.findByEmailIgnoreCase(email)
                .filter(AdminUser::getIsActive)
                .orElseThrow(() -> new ClientException(HttpStatus.UNAUTHORIZED, "Incorrect email or password"));

        if (!passwordEncoder.matches(request.getPassword() == null ? "" : request.getPassword(), admin.getPasswordHash())) {
            throw new ClientException(HttpStatus.UNAUTHORIZED, "Incorrect email or password");
        }

        admin.setLastLoginAt(LocalDateTime.now());
        adminUserRepository.save(admin);

        Map<String, Object> claims = new HashMap<>();
        claims.put("admin", true);

        String token = jwtService.generateToken(
                claims,
                User.withUsername(admin.getEmail()).password("").authorities(List.of()).build()
        );

        AdminLoginResponse response = new AdminLoginResponse();
        response.setToken(token);
        response.setName(admin.getName());
        response.setEmail(admin.getEmail());
        return response;
    }
}

package com.match.partner.common.interceptor;

import com.match.partner.common.service.JwtServiceInterface;
import com.match.partner.openapi.admin.repository.AdminUserRepository;
import io.jsonwebtoken.Claims;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpMethod;
import org.springframework.stereotype.Component;
import org.springframework.web.servlet.HandlerInterceptor;

/**
 * Guards /api/v1/admin/** the same way {@link JwtRequestInterceptor} guards
 * the member API, but checking for a token minted by AdminAuthService
 * specifically - not just any valid JWT.
 *
 * A member's own token is signed with the same secret and would otherwise
 * pass a plain signature check; the "admin" claim is what stops a member from
 * ever reaching this API with their own, entirely legitimate, login token.
 * The admin_user lookup on top of that means deactivating an admin takes
 * effect immediately, without waiting for their existing token to expire.
 */
@Component
@RequiredArgsConstructor
public class AdminJwtInterceptor implements HandlerInterceptor {

    private final JwtServiceInterface jwtService;
    private final AdminUserRepository adminUserRepository;

    @Override
    public boolean preHandle(HttpServletRequest request, HttpServletResponse response, Object handler) throws Exception {
        if (HttpMethod.OPTIONS.matches(request.getMethod())) {
            return true;
        }

        String authHeader = request.getHeader("Authorization");
        if (authHeader == null || !authHeader.startsWith("Bearer ")) {
            return reject(response, "Missing or invalid Authorization header");
        }

        String token = authHeader.substring(7);
        try {
            Boolean isAdminToken = jwtService.extractClaim(token, claims -> claims.get("admin", Boolean.class));
            if (!Boolean.TRUE.equals(isAdminToken)) {
                return reject(response, "Not an admin token");
            }

            String email = jwtService.extractClaim(token, Claims::getSubject);
            boolean stillActive = adminUserRepository.findByEmailIgnoreCase(email)
                    .map(a -> Boolean.TRUE.equals(a.getIsActive()))
                    .orElse(false);
            if (!stillActive) {
                return reject(response, "Admin account no longer active");
            }

            request.setAttribute("adminEmail", email);
            return true;
        } catch (Exception e) {
            return reject(response, "Invalid or expired token");
        }
    }

    private boolean reject(HttpServletResponse response, String message) throws java.io.IOException {
        response.setStatus(HttpServletResponse.SC_UNAUTHORIZED);
        response.getWriter().write(message);
        return false;
    }
}

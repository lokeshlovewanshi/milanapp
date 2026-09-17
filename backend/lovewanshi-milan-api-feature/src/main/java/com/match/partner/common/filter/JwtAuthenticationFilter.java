package com.match.partner.common.filter;

import com.match.partner.common.service.JwtServiceInterface;
import com.match.partner.openapi.user.repository.UserProfileRepository;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.lang.NonNull;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.web.authentication.WebAuthenticationDetailsSource;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;
import org.springframework.web.servlet.HandlerExceptionResolver;

import java.io.IOException;

@Component
public class JwtAuthenticationFilter extends OncePerRequestFilter {
    private final HandlerExceptionResolver handlerExceptionResolver;

    private final JwtServiceInterface jwtService;
    private final UserDetailsService userDetailsService;
    private final com.match.partner.openapi.user.service.TokenBlacklistService tokenBlacklistService;
    private final com.match.partner.common.service.UserPresenceService userPresenceService;
    private final UserProfileRepository userProfileRepository;

    public JwtAuthenticationFilter(
            JwtServiceInterface jwtService,
            UserDetailsService userDetailsService,
            HandlerExceptionResolver handlerExceptionResolver,
            com.match.partner.openapi.user.service.TokenBlacklistService tokenBlacklistService,
            com.match.partner.common.service.UserPresenceService userPresenceService,
            UserProfileRepository userProfileRepository
    ) {
        this.jwtService = jwtService;
        this.userDetailsService = userDetailsService;
        this.handlerExceptionResolver = handlerExceptionResolver;
        this.tokenBlacklistService = tokenBlacklistService;
        this.userPresenceService = userPresenceService;
        this.userProfileRepository = userProfileRepository;
    }

    @Override
    protected void doFilterInternal(
            @NonNull HttpServletRequest request,
            @NonNull HttpServletResponse response,
            @NonNull FilterChain filterChain
    ) throws ServletException, IOException {
        final String authHeader = request.getHeader("Authorization");
        String requestPath = request.getServletPath();

        // ✅ Skip JWT check for Swagger UI & API Docs
        if (requestPath.startsWith("/swagger-ui") ||
                requestPath.startsWith("/v3/api-docs") ||
                requestPath.startsWith("/swagger-resources") ||
                requestPath.startsWith("/webjars/") ||
                requestPath.equals("/swagger-ui.html")) {
            filterChain.doFilter(request, response);
            return;
        }

        // ✅ Skip JWT for Authentication Endpoints
        if (requestPath.equals("/register") ||
                requestPath.equals("/login") ||
                requestPath.startsWith("/api/v1/auth/")) {
            filterChain.doFilter(request, response);
            return;
        }

        // ✅ Skip for admin routes - they carry their own token, signed with the
        // same secret but for an email that is never a row in user_profile.
        // Without this skip, userDetailsService.loadUserByUsername below throws
        // UsernameNotFoundException for every admin request that includes a
        // token, which surfaces as a 500 rather than the 401 AdminJwtInterceptor
        // would otherwise give a bad admin token.
        if (requestPath.startsWith("/api/v1/admin/")) {
            filterChain.doFilter(request, response);
            return;
        }

        if (authHeader == null || !authHeader.startsWith("Bearer ")) {
            filterChain.doFilter(request, response);
            return;
        }

        try {
            final String jwt = authHeader.substring(7);

            // Reject if the token is blacklisted
            if (tokenBlacklistService.isTokenBlacklisted(jwt)) {
                response.sendError(HttpServletResponse.SC_UNAUTHORIZED, "Token has been invalidated via logout");
                return;
            }

            final String userEmail = jwtService.extractUsername(jwt);

            // Admin deletion is a soft delete, and an admin block leaves the
            // profile row intact. Neither state may keep a previously issued
            // JWT signed in. Reject it before any controller can return data
            // or accept a change; the mobile interceptor then logs out only
            // this device session and sends the member to Login.
            if (userEmail != null && userProfileRepository.findByEmail(userEmail)
                    .map(profile -> profile.getDeletedAt() != null || Boolean.TRUE.equals(profile.getBlocked()))
                    .orElse(true)) {
                response.sendError(HttpServletResponse.SC_UNAUTHORIZED, "This account has been deleted or blocked");
                return;
            }

            if (userEmail != null) {
                userPresenceService.recordActive(userEmail);
            }

            Authentication authentication = SecurityContextHolder.getContext().getAuthentication();

            if (userEmail != null && authentication == null) {
                UserDetails userDetails = this.userDetailsService.loadUserByUsername(userEmail);

                if (jwtService.isTokenValid(jwt, userDetails)) {
                    UsernamePasswordAuthenticationToken authToken = new UsernamePasswordAuthenticationToken(
                            userDetails,
                            null,
                            userDetails.getAuthorities()
                    );

                    authToken.setDetails(new WebAuthenticationDetailsSource().buildDetails(request));
                    SecurityContextHolder.getContext().setAuthentication(authToken);
                }
            }

            filterChain.doFilter(request, response);
        } catch (Exception exception) {
            handlerExceptionResolver.resolveException(request, response, null, exception);
        }
    }

}

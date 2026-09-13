package com.match.partner.common.interceptor;

import com.match.partner.common.service.JwtServiceInterface;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpMethod;
import org.springframework.stereotype.Component;
import org.springframework.web.servlet.HandlerInterceptor;

@Component
@RequiredArgsConstructor
public class JwtRequestInterceptor implements HandlerInterceptor {

    private final JwtServiceInterface jwtService;


    @Override
    public boolean preHandle(HttpServletRequest request, HttpServletResponse response, Object handler) throws Exception {
        String requestPath = request.getServletPath();

        if (HttpMethod.OPTIONS.matches(request.getMethod())) {
            return true;
        }

        // ✅ Skip JWT check for Swagger UI & API Docs
        if (requestPath.startsWith("/swagger-ui") ||
                requestPath.startsWith("/v3/api-docs") ||
                requestPath.startsWith("/swagger-resources") ||
                requestPath.startsWith("/webjars/") ||
                requestPath.equals("/swagger-ui.html")) {
            return true; // Allow Swagger requests without JWT
        }

        String authHeader = request.getHeader("Authorization");

        if (authHeader == null || !authHeader.startsWith("Bearer ")) {
            // Allow public viewing of user profiles without JWT token
            if (requestPath.startsWith("/api/v1/users/") && HttpMethod.GET.matches(request.getMethod())) {
                return true;
            }
            response.setStatus(HttpServletResponse.SC_UNAUTHORIZED);
            response.getWriter().write("Missing or invalid Authorization header");
            return false;
        }

        String jwtToken = authHeader.substring(7); // Extract token after "Bearer "
        try {
            String username = jwtService.extractUsername(jwtToken);

            if (username != null) {
                request.setAttribute("username", username);
            } else {
                response.setStatus(HttpServletResponse.SC_UNAUTHORIZED);
                response.getWriter().write("Invalid JWT token");
                return false;
            }
        } catch (Exception e) {
            response.setStatus(HttpServletResponse.SC_UNAUTHORIZED);
            response.getWriter().write("Invalid JWT token: " + e.getMessage());
            return false;
        }

        return true;
    }

}

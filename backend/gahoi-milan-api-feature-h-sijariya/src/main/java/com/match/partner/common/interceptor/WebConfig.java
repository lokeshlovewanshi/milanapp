package com.match.partner.common.interceptor;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.servlet.config.annotation.InterceptorRegistry;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;

@Configuration
public class WebConfig implements WebMvcConfigurer {

    @Autowired
    private JwtRequestInterceptor jwtRequestInterceptor;

    @Autowired
    private AdminJwtInterceptor adminJwtInterceptor;

    /**
     * The exclusions here must mirror the permitAll list in
     * SecurityConfiguration. They are two independent gates on the same
     * requests, and when they disagree the stricter one silently wins - which
     * is how /api/v1/reference came to return 401 while Spring Security was
     * happily permitting it. A path made public in one place and not the other
     * is not public.
     */
    @Override
    public void addInterceptors(InterceptorRegistry registry) {
        registry.addInterceptor(jwtRequestInterceptor)
                .addPathPatterns("/**")
                .excludePathPatterns(
                        "/api/v1/auth/**",
                        // Dropdown data: no user content, and the signup form
                        // needs it before a token exists.
                        "/api/v1/reference/**",
                        // Public membership plan listings and pricing
                        "/api/v1/billing/plans",
                        // Checked at launch, before sign-in exists.
                        "/api/v1/app/**",
                        // The support phone number and email. Whoever cannot
                        // sign in is precisely who needs to reach support, so
                        // this one route cannot be behind a token. Note it is
                        // the exact path, not /support/** - the ticket
                        // endpoints beside it are per-member and must stay
                        // authenticated.
                        "/api/v1/support/contact",
                        // Its own token scheme (admin_user, not user_profile) -
                        // guarded by AdminJwtInterceptor below instead.
                        "/api/v1/admin/**",
                        // The static admin panel page - no token at all until
                        // its own JS has logged in and attached one to fetch().
                        "/admin/**",
                        // Liveness probe for the deploy and uptime monitoring.
                        "/actuator/**",
                        "/swagger-ui/**",
                        "/swagger-ui.html",
                        "/v3/api-docs/**",
                        "/swagger-resources/**",
                        "/webjars/**"
                );

        // /login is how an admin token is obtained in the first place, so it
        // is the one admin route that cannot require one.
        registry.addInterceptor(adminJwtInterceptor)
                .addPathPatterns("/api/v1/admin/**")
                .excludePathPatterns("/api/v1/admin/login");
    }
}

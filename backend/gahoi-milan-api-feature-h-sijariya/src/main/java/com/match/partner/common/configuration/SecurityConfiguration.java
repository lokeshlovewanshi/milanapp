package com.match.partner.common.configuration;

import com.match.partner.common.filter.JwtAuthenticationFilter;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.HttpMethod;
import org.springframework.security.authentication.AuthenticationProvider;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;
import org.springframework.web.cors.CorsConfigurationSource;

@Configuration
@EnableWebSecurity
public class SecurityConfiguration {
    private final AuthenticationProvider authenticationProvider;
    private final JwtAuthenticationFilter jwtAuthenticationFilter;
    private final CorsConfigurationSource corsConfigurationSource;

    public SecurityConfiguration(
        JwtAuthenticationFilter jwtAuthenticationFilter,
        AuthenticationProvider authenticationProvider,
        CorsConfigurationSource corsConfigurationSource
    ) {
        this.authenticationProvider = authenticationProvider;
        this.jwtAuthenticationFilter = jwtAuthenticationFilter;
        this.corsConfigurationSource = corsConfigurationSource;
    }

    @Bean
    public SecurityFilterChain securityFilterChain(HttpSecurity http) throws Exception {
        http.cors(cors -> cors.configurationSource(corsConfigurationSource))
                .csrf(csrf -> csrf.disable())
                .authorizeHttpRequests(auth -> auth
                        .requestMatchers(HttpMethod.OPTIONS, "/**").permitAll()
                        .requestMatchers(
                                // Liveness probe for the deploy and any uptime
                                // monitor. Exposes only {"status":"UP"} -
                                // show-details=never keeps the database and
                                // disk component details out of the response.
                                "/actuator/health",
                                "/api/v1/auth/**",
                                "/api/v1/user/**",
                                "/api/v1/users/**",
                                "/api/v1/billing/**",
                                "/api/v1/stories/**",
                                // Checked at launch, before sign-in exists.
                                "/api/v1/app/**",
                                // Its own token scheme, enforced by
                                // AdminJwtInterceptor - same pattern as
                                // /api/v1/user/** above.
                                "/api/v1/admin/**",
                                // The static admin panel page itself.
                                "/admin/**",
                                // Dropdown data: no user content, needed before
                                // a profile exists, safe to serve unauthenticated.
                                "/api/v1/reference/**",
                                // The support phone number and email. Already
                                // public on the store listing, and someone
                                // locked out of their account is exactly who
                                // needs it - so it cannot require a token.
                                "/api/v1/support/contact",
                                "/swagger-ui/**",
                                "/v3/api-docs/**",
                                "/swagger-ui.html",
                                "/v3/api-docs",
                                "/v3/api-docs.yaml",
                                "/webjars/**"
                        ).permitAll()
                        .anyRequest().authenticated()
                )
                .sessionManagement(sess -> sess.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
                .authenticationProvider(authenticationProvider)
                .addFilterBefore(jwtAuthenticationFilter, UsernamePasswordAuthenticationFilter.class);

        return http.build();
    }



}
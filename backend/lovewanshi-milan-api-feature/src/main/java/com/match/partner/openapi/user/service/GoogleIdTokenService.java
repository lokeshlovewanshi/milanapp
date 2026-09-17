package com.match.partner.openapi.user.service;

import com.match.partner.common.configuration.ClientException;
import com.match.partner.openapi.auth.service.EmailService;
import com.match.partner.openapi.auth.service.WelcomeEmailService;
import com.match.partner.openapi.billing.model.dao.Membership;
import com.match.partner.openapi.billing.model.dao.SubscriptionPlan;
import com.match.partner.openapi.billing.repository.SubscriptionPlanRepository;
import com.match.partner.openapi.billing.service.BillingService;
import com.match.partner.openapi.user.model.dao.Status;
import com.match.partner.openapi.user.model.dao.UserProfile;
import com.match.partner.openapi.user.repository.UserProfileRepository;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestClientException;
import org.springframework.web.client.RestTemplate;

import java.util.Arrays;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;
import java.util.stream.Collectors;

/**
 * Verifies a Google ID token and resolves it to a local user.
 *
 * Verification is delegated to Google's tokeninfo endpoint, which checks the
 * signature, issuer and expiry for us.
 */
@Service
@Slf4j
public class GoogleIdTokenService {

    private static final String TOKENINFO_URL =
            "https://oauth2.googleapis.com/tokeninfo?id_token=";

    private final UserProfileRepository userProfileRepository;
    private final PasswordEncoder passwordEncoder;
    private final BillingService billingService;
    private final SubscriptionPlanRepository planRepository;
    private final EmailService emailService;
    private final WelcomeEmailService welcomeEmailService;
    private final RestTemplate restTemplate = new RestTemplate();

    /**
     * Comma-separated list of every OAuth client ID that may sign in to this
     * backend (web + android + ios). Configured via google.oauth.client-ids.
     */
    @Value("${google.oauth.client-ids:}")
    private String allowedClientIds;

    public GoogleIdTokenService(
            UserProfileRepository userProfileRepository,
            PasswordEncoder passwordEncoder,
            BillingService billingService,
            SubscriptionPlanRepository planRepository,
            EmailService emailService,
            WelcomeEmailService welcomeEmailService
    ) {
        this.userProfileRepository = userProfileRepository;
        this.passwordEncoder = passwordEncoder;
        this.billingService = billingService;
        this.planRepository = planRepository;
        this.emailService = emailService;
        this.welcomeEmailService = welcomeEmailService;
    }

    public UserProfile verifyAndResolveUser(String idToken) {
        Map<String, Object> claims = verifyToken(idToken);
        String email = asString(claims.get("email"));
        String name = asString(claims.get("name"));
        return findOrCreateUser(email, name);
    }

    /**
     * Undo a soft delete for a Google-only account and sign in, in one step.
     */
    public UserProfile restoreAccount(String idToken) {
        Map<String, Object> claims = verifyToken(idToken);
        String email = asString(claims.get("email"));

        UserProfile user = userProfileRepository.findByEmail(email)
                .orElseThrow(() -> new ClientException(HttpStatus.NOT_FOUND, "No account for this Google email"));

        if (user.getDeletedAt() == null && !Boolean.TRUE.equals(user.getBlocked())) {
            throw new ClientException(HttpStatus.CONFLICT, "This account does not need restoration.");
        }

        user.setDeletedAt(null);
        user.setBlocked(false);
        user.setHidden(false);
        user.setVerified(false);
        user.setStatus(Status.PENDING);
        return userProfileRepository.save(user);
    }

    /** Signature, issuer, expiry, audience and email-verified - everything short of resolving a local user. */
    private Map<String, Object> verifyToken(String idToken) {
        if (idToken == null || idToken.isBlank()) {
            throw new ClientException(HttpStatus.BAD_REQUEST, "idToken is required");
        }

        Map<String, Object> claims = fetchClaims(idToken);

        String email = asString(claims.get("email"));
        if (email == null || email.isBlank()) {
            throw new ClientException(HttpStatus.UNAUTHORIZED, "Google token has no email");
        }
        if (!"true".equalsIgnoreCase(asString(claims.get("email_verified")))) {
            throw new ClientException(HttpStatus.UNAUTHORIZED, "Google email is not verified");
        }
        verifyAudience(asString(claims.get("aud")));

        return claims;
    }

    private Map<String, Object> fetchClaims(String idToken) {
        try {
            @SuppressWarnings("unchecked")
            Map<String, Object> body = restTemplate.getForObject(TOKENINFO_URL + idToken, Map.class);
            if (body == null) {
                throw new ClientException(HttpStatus.UNAUTHORIZED, "Could not verify Google token");
            }
            return body;
        } catch (RestClientException e) {
            throw new ClientException(HttpStatus.UNAUTHORIZED, "Invalid or expired Google token");
        }
    }

    private void verifyAudience(String aud) {
        List<String> allowed = Arrays.stream(allowedClientIds.split(","))
                .map(String::trim)
                .filter(s -> !s.isEmpty())
                .collect(Collectors.toList());

        if (allowed.isEmpty()) {
            throw new ClientException(HttpStatus.INTERNAL_SERVER_ERROR,
                    "google.oauth.client-ids is not configured on the server");
        }
        if (aud == null || !allowed.contains(aud)) {
            throw new ClientException(HttpStatus.UNAUTHORIZED,
                    "Google token was not issued for this application");
        }
    }

    /**
     * Google accounts have no local password. A random one is stored so the
     * NOT NULL column is satisfied and the account cannot be used with the
     * email/password login form.
     */
    private UserProfile findOrCreateUser(String email, String name) {
        Optional<UserProfile> existing = userProfileRepository.findByEmail(email);
        if (existing.isPresent()) {
            if (existing.get().getDeletedAt() != null || Boolean.TRUE.equals(existing.get().getBlocked())) {
                throw new ClientException(HttpStatus.GONE,
                        "This account is unavailable. You can request restoration.");
            }
            return existing.get();
        }

        UserProfile user = new UserProfile();
        user.setEmail(email);
        user.setName(name != null && !name.isBlank() ? name : email.split("@")[0]);
        user.setPassword(passwordEncoder.encode(UUID.randomUUID().toString()));
        user.setPasswordSet(false);
        user.setEmailVerified(true);
        user.setStatus(Status.PENDING);
        UserProfile savedUser = userProfileRepository.save(user);

        // Auto-activate offer plan for newly registered Google user
        try {
            Membership membership = billingService.grantSignupOfferMembership(savedUser);
            if (membership != null) {
                String planName = planRepository.findById(membership.getPlanId())
                        .map(SubscriptionPlan::getName)
                        .orElse("Gold");
                Integer duration = planRepository.findById(membership.getPlanId())
                        .map(SubscriptionPlan::getDurationMonths)
                        .orElse(12);

                emailService.sendPlanActivationEmail(
                        savedUser.getEmail(),
                        savedUser.getName(),
                        planName,
                        duration,
                        membership.getExpiresAt(),
                        true
                );
            }
        } catch (Exception e) {
            log.error("Failed to grant offer membership or send email on Google signup for user {}: {}",
                    savedUser.getEmail(), e.getMessage());
        }

        // Asynchronously dispatch welcome email via AWS Lambda (fire-and-forget)
        try {
            welcomeEmailService.triggerWelcomeEmailAsync(savedUser.getEmail(), savedUser.getName(), savedUser.getId());
        } catch (Exception e) {
            log.error("Failed to trigger async welcome email on Google signup for {}: {}", savedUser.getEmail(), e.getMessage());
        }

        return savedUser;
    }

    private String asString(Object value) {
        return value == null ? null : String.valueOf(value);
    }
}

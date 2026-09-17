package com.match.partner.openapi.user.service;

import com.match.partner.openapi.auth.service.EmailService;
import com.match.partner.openapi.auth.service.WelcomeEmailService;
import com.match.partner.openapi.billing.model.dao.Membership;
import com.match.partner.openapi.billing.model.dao.SubscriptionPlan;
import com.match.partner.openapi.billing.repository.SubscriptionPlanRepository;
import com.match.partner.openapi.billing.service.BillingService;
import com.match.partner.openapi.user.model.dao.Status;
import com.match.partner.openapi.user.model.dao.UserProfile;
import com.match.partner.openapi.user.model.dto.LoginUserDto;
import com.match.partner.openapi.user.model.dto.RegisterUserDto;
import com.match.partner.openapi.user.repository.UserProfileRepository;
import com.match.partner.common.configuration.ClientException;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

import java.util.Optional;

@Service
@Slf4j
public class AuthenticationServiceImpl implements AuthenticationServiceInterface {
    private final UserProfileRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final AuthenticationManager authenticationManager;
    private final BillingService billingService;
    private final SubscriptionPlanRepository planRepository;
    private final EmailService emailService;
    private final WelcomeEmailService welcomeEmailService;

    public AuthenticationServiceImpl(
        UserProfileRepository userRepository,
        AuthenticationManager authenticationManager,
        PasswordEncoder passwordEncoder,
        BillingService billingService,
        SubscriptionPlanRepository planRepository,
        EmailService emailService,
        WelcomeEmailService welcomeEmailService
    ) {
        this.authenticationManager = authenticationManager;
        this.userRepository = userRepository;
        this.passwordEncoder = passwordEncoder;
        this.billingService = billingService;
        this.planRepository = planRepository;
        this.emailService = emailService;
        this.welcomeEmailService = welcomeEmailService;
    }

    public UserProfile signup(RegisterUserDto input) {
        if (input.getPassword() == null || input.getPassword().isEmpty()) {
            throw new IllegalArgumentException("Password cannot be null or empty");
        }
        UserProfile user = new UserProfile();
        user.setName(input.getName());
        user.setEmail(input.getEmail());
        user.setMobileNumber(input.getMobileNo());
        user.setPassword(passwordEncoder.encode(input.getPassword()));
        user.setStatus(Status.PENDING);

        UserProfile savedUser = userRepository.save(user);

        // Automatically activate current offer plan (e.g. Gold 12M, Silver 6M, or Bronze 3M)
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
            log.error("Failed to grant offer membership or send email on signup for user {}: {}",
                    savedUser.getEmail(), e.getMessage());
        }

        // Asynchronously dispatch welcome email via AWS Lambda (fire-and-forget)
        try {
            welcomeEmailService.triggerWelcomeEmailAsync(savedUser.getEmail(), savedUser.getName(), savedUser.getId());
        } catch (Exception e) {
            log.error("Failed to trigger async welcome email for {}: {}", savedUser.getEmail(), e.getMessage());
        }

        return savedUser;
    }

    public UserProfile authenticate(LoginUserDto input) {
        return userRepository.findByEmail(input.getEmail())
                .map(user -> {
                    authenticationManager.authenticate(
                            new UsernamePasswordAuthenticationToken(input.getEmail(), input.getPassword())
                    );

                    if (user.getDeletedAt() != null || Boolean.TRUE.equals(user.getBlocked())) {
                        throw new ClientException(HttpStatus.GONE,
                                "This account is unavailable. You can request restoration.");
                    }

                    return user;
                })
                .orElseThrow(() -> new RuntimeException("User not found"));
    }

    /** @see AuthenticationServiceInterface#restoreAccount */
    public UserProfile restoreAccount(LoginUserDto input) {
        UserProfile user = userRepository.findByEmail(input.getEmail())
                .orElseThrow(() -> new RuntimeException("User not found"));

        authenticationManager.authenticate(
                new UsernamePasswordAuthenticationToken(input.getEmail(), input.getPassword())
        );

        if (user.getDeletedAt() == null && !Boolean.TRUE.equals(user.getBlocked())) {
            throw new ClientException(HttpStatus.CONFLICT, "This account does not need restoration.");
        }

        user.setDeletedAt(null);
        user.setBlocked(false);
        user.setHidden(false);
        user.setVerified(false);
        user.setStatus(Status.PENDING);
        return userRepository.save(user);
    }

    public UserProfile getProfileDetails(String email) {
        Optional<UserProfile> userProfileOptional = userRepository.findByEmail(email);
        if (userProfileOptional.isPresent()) {
            return userProfileOptional.get();
        } else {
            UserProfile userProfile = new UserProfile();
            userProfile.setEmail(email);
            userProfile.setStatus(Status.PENDING);
            userRepository.save(userProfile);
            return userProfile;
        }
    }
}

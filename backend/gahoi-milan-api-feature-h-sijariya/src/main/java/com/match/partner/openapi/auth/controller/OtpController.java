package com.match.partner.openapi.auth.controller;

import com.match.partner.common.configuration.ClientException;
import com.match.partner.openapi.auth.model.dao.EmailOtp;
import com.match.partner.openapi.auth.service.OtpService;
import com.match.partner.openapi.user.model.dao.UserProfile;
import com.match.partner.openapi.user.repository.UserProfileRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

/**
 * Emailed one-time codes: confirm an address, or reset a forgotten password.
 *
 * Lives under /auth because every route here has to work for someone who cannot
 * sign in - which is the entire point of password reset. That also means these
 * are the only unauthenticated write endpoints in the app, so each one is
 * rate-limited and each answers identically whether or not the address has an
 * account. See OtpService for why.
 */
@RestController
@RequestMapping("/api/v1/auth")
public class OtpController {

    @Autowired
    private OtpService otpService;

    @Autowired
    private UserProfileRepository userProfileRepository;

    @Autowired
    private PasswordEncoder passwordEncoder;

    /**
     * Send a code.
     *
     * Always 204, even for an address with no account. A different response for
     * unknown addresses would turn this into a membership check that tells
     * anyone whether a given person is on a matrimony site.
     */
    @PostMapping("/otp/request")
    public ResponseEntity<Void> request(@RequestBody OtpRequest body) {
        otpService.issue(body.email(), parse(body.purpose()));
        return ResponseEntity.noContent().build();
    }

    /**
     * Check a code without spending it on anything.
     *
     * Only for VERIFY_EMAIL, which has nothing to do afterwards but record the
     * fact. Password reset deliberately has no separate verify step - see
     * {@link #resetPassword}.
     */
    @PostMapping("/otp/verify")
    public ResponseEntity<Void> verify(@RequestBody OtpVerify body) {
        EmailOtp.Purpose purpose = parse(body.purpose());
        if (purpose != EmailOtp.Purpose.VERIFY_EMAIL) {
            throw new ClientException(HttpStatus.BAD_REQUEST,
                    "Use /auth/password/reset to redeem a password reset code.");
        }

        UserProfile user = otpService.redeem(body.email(), body.code(), purpose);
        user.setEmailVerified(true);
        userProfileRepository.save(user);
        return ResponseEntity.noContent().build();
    }

    /**
     * Redeem a reset code and set the new password in the same call.
     *
     * One step rather than verify-then-set, deliberately. Splitting them means
     * the server must hand back something that proves the code was checked, and
     * that proof becomes a second credential to get right. Taking the password
     * here keeps the code single-use in the literal sense: it is spent on the
     * thing it was issued for, or not at all.
     */
    @PostMapping("/password/reset")
    public ResponseEntity<Void> resetPassword(@RequestBody PasswordReset body) {
        if (body.newPassword() == null || body.newPassword().length() < 8) {
            throw new ClientException(HttpStatus.BAD_REQUEST,
                    "Your password must be at least 8 characters.");
        }

        UserProfile user = otpService.redeem(body.email(), body.code(),
                EmailOtp.Purpose.RESET_PASSWORD);

        user.setPassword(passwordEncoder.encode(body.newPassword()));
        // Someone who has just proved they read mail at this address has done
        // exactly what verification asks for, so this doubles as confirmation.
        user.setEmailVerified(true);
        // A Google-only account that sets a password this way now has one.
        user.setPasswordSet(true);
        userProfileRepository.save(user);

        return ResponseEntity.noContent().build();
    }

    /** Lets the app decide whether to offer the flow at all. */
    @GetMapping("/otp/status")
    public Map<String, Boolean> status() {
        return Map.of("emailEnabled", otpService.isEmailConfigured());
    }

    private EmailOtp.Purpose parse(String purpose) {
        try {
            return EmailOtp.Purpose.valueOf(String.valueOf(purpose).trim().toUpperCase());
        } catch (IllegalArgumentException e) {
            throw new ClientException(HttpStatus.BAD_REQUEST,
                    "purpose must be VERIFY_EMAIL or RESET_PASSWORD.");
        }
    }

    public record OtpRequest(String email, String purpose) {}

    public record OtpVerify(String email, String code, String purpose) {}

    public record PasswordReset(String email, String code, String newPassword) {}
}

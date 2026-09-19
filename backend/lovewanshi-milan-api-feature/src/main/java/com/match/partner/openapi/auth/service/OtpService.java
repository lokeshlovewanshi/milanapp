package com.match.partner.openapi.auth.service;

import com.match.partner.common.configuration.ClientException;
import com.match.partner.openapi.auth.model.dao.EmailOtp;
import com.match.partner.openapi.auth.repository.EmailOtpRepository;
import com.match.partner.openapi.user.model.dao.UserProfile;
import com.match.partner.openapi.user.repository.UserProfileRepository;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.security.SecureRandom;
import java.time.LocalDateTime;
import java.util.Optional;

/**
 * Issue and redeem the six-digit codes.
 *
 * The whole security of this feature is four rules working together, and none
 * of them is optional:
 *
 *  1. The code expires in {@link #VALID_MINUTES} minutes.
 *  2. Five wrong guesses kill the code, not just the attempt.
 *  3. Only one code is live per address and purpose at a time.
 *  4. Issuing is throttled per address.
 *
 * Six digits is a million possibilities, which a script exhausts in seconds if
 * you let it. Rules 2 and 4 are what make that number mean something: an
 * attacker gets five guesses per issued code and cannot issue codes quickly, so
 * the effective odds stay at five in a million rather than certainty.
 */
@Service
@Slf4j
public class OtpService {

    /** Long enough to find the mail, short enough that a guess is worthless. */
    static final int VALID_MINUTES = 10;

    /** Wrong guesses before the code dies and a new one must be requested. */
    private static final int MAX_ATTEMPTS = 5;

    /** Codes per address per window, so mail cannot be used to harass someone. */
    private static final int MAX_PER_WINDOW = 5;
    private static final int WINDOW_MINUTES = 60;

    @Autowired
    private EmailOtpRepository otpRepository;

    @Autowired
    private UserProfileRepository userProfileRepository;

    @Autowired
    private EmailService emailService;

    @Autowired
    private PasswordEncoder passwordEncoder;

    /** SecureRandom, not Random: a predictable OTP is not an OTP. */
    private final SecureRandom random = new SecureRandom();

    /**
     * Issue a code and email it.
     *
     * Returns silently when the address has no account, and that is deliberate
     * for RESET_PASSWORD: replying "no such user" turns this endpoint into a
     * membership oracle that tells anyone whether a given person is on a
     * matrimony site. The caller sees the same response either way.
     */
    @Transactional
    public void issue(String rawEmail, EmailOtp.Purpose purpose) {
        String email = normalise(rawEmail);
        if (email == null) {
            throw new ClientException(HttpStatus.BAD_REQUEST, "Please enter a valid email address.");
        }

        if (!emailService.isEnabled()) {
            throw new ClientException(HttpStatus.SERVICE_UNAVAILABLE,
                    "Email is not set up on this server yet. Please contact support on 7440814972.");
        }

        LocalDateTime now = LocalDateTime.now();

        // Throttle before doing anything else, so a flood costs one COUNT query
        // rather than a bcrypt and an SMTP round trip.
        long recent = otpRepository.countByEmailAndPurposeAndCreatedAtAfter(
                email, purpose, now.minusMinutes(WINDOW_MINUTES));
        if (recent >= MAX_PER_WINDOW) {
            throw new ClientException(HttpStatus.TOO_MANY_REQUESTS,
                    "Too many codes requested. Please wait an hour and try again.");
        }

        Optional<UserProfile> user = userProfileRepository.findByEmail(email);
        if (user.isEmpty()) {
            // Same outward behaviour as success. Logged so a support question
            // about a missing mail has an answer.
            log.info("OTP requested for an address with no account; not sending");
            return;
        }
        if (user.get().getDeletedAt() != null) {
            log.info("OTP requested for a deleted account; not sending");
            return;
        }

        // Exactly one live code at a time - an older email must stop working the
        // moment a newer one is sent.
        otpRepository.consumeOutstanding(email, purpose, now);

        String code = generateCode();

        EmailOtp row = new EmailOtp();
        row.setEmail(email);
        row.setPurpose(purpose);
        row.setCodeHash(passwordEncoder.encode(code));
        row.setExpiresAt(now.plusMinutes(VALID_MINUTES));
        row.setCreatedAt(now);
        row.setAttempts((short) 0);
        otpRepository.save(row);

        boolean sent = purpose == EmailOtp.Purpose.RESET_PASSWORD
                ? emailService.sendOtp(email, code, "Reset your password",
                        "Use this code to set a new password:", VALID_MINUTES)
                : emailService.sendOtp(email, code, "Confirm your email",
                        "Use this code to confirm this address:", VALID_MINUTES);

        if (!sent) {
            // Rolls back the row too. Leaving a code the member never received
            // would burn one of their five and lock the previous one out for
            // nothing.
            throw new ClientException(HttpStatus.BAD_GATEWAY,
                    "We could not send the email just now. Please try again in a moment.");
        }
    }

    /**
     * Check a code and spend it.
     *
     * @return the account the code belongs to.
     */
    /*
     * noRollbackFor is load-bearing, not decoration.
     *
     * A wrong guess increments attempts and then throws, and ClientException is
     * unchecked - so Spring's default rollback rule threw the increment away
     * with it. The counter went back to zero after every failure and the cap
     * never engaged: six wrong codes in a row left attempts at 0, which on a
     * six-digit secret means it can simply be guessed.
     *
     * None of the ClientExceptions raised here write anything that needs
     * undoing, so suppressing rollback for them costs nothing and is what makes
     * the count survive the throw.
     */
    @Transactional(noRollbackFor = ClientException.class)
    public UserProfile redeem(String rawEmail, String code, EmailOtp.Purpose purpose) {
        String email = normalise(rawEmail);
        if (email == null || code == null || code.isBlank()) {
            throw invalid();
        }

        EmailOtp row = otpRepository
                .findFirstByEmailAndPurposeAndConsumedAtIsNullOrderByCreatedAtDesc(email, purpose)
                .orElseThrow(this::invalid);

        if (row.getExpiresAt().isBefore(LocalDateTime.now())) {
            throw new ClientException(HttpStatus.BAD_REQUEST,
                    "That code has expired. Please request a new one.");
        }

        if (row.getAttempts() >= MAX_ATTEMPTS) {
            throw new ClientException(HttpStatus.TOO_MANY_REQUESTS,
                    "Too many incorrect attempts. Please request a new code.");
        }

        if (!passwordEncoder.matches(code.trim(), row.getCodeHash())) {
            // Counted and saved before returning, so the cap survives a client
            // that simply retries in a loop. See noRollbackFor above - without
            // it this save is rolled back by the throw on the next line.
            row.setAttempts((short) (row.getAttempts() + 1));
            otpRepository.save(row);
            throw invalid();
        }

        UserProfile user = userProfileRepository.findByEmail(email)
                .orElseThrow(this::invalid);

        // Spent on success, and every sibling with it.
        otpRepository.consumeOutstanding(email, purpose, LocalDateTime.now());
        return user;
    }

    /** Whether this deployment can send mail at all. */
    public boolean isEmailConfigured() {
        return emailService.isEnabled();
    }

    /**
     * Six digits, uniformly distributed, leading zeros allowed.
     *
     * nextInt(1_000_000) rather than 100000 + nextInt(900000): the latter is
     * the common shortcut and it quietly throws away every code starting with a
     * zero, costing a tenth of the space for nothing.
     */
    private String generateCode() {
        return String.format("%04d", random.nextInt(10_000));
    }

    /**
     * One message for "no such code", "wrong code" and "no such account".
     *
     * Distinguishing them would tell an attacker which addresses have accounts,
     * which is the thing this endpoint must not reveal.
     */
    private ClientException invalid() {
        return new ClientException(HttpStatus.BAD_REQUEST,
                "That code is not correct. Please check and try again.");
    }

    private String normalise(String email) {
        if (email == null) return null;
        String trimmed = email.trim().toLowerCase();
        // Not full RFC validation - just enough to reject obvious rubbish before
        // it reaches the database or an SMTP server.
        return trimmed.matches("^[^@\\s]+@[^@\\s]+\\.[^@\\s]+$") ? trimmed : null;
    }
}

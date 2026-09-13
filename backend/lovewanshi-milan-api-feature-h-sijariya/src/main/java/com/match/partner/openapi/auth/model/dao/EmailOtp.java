package com.match.partner.openapi.auth.model.dao;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;

import java.time.LocalDateTime;

/**
 * A six-digit code emailed to an address, for one stated purpose.
 *
 * See sql/2026-08-08_email_otp.sql for why this is its own table rather than a
 * reuse of password_reset_token, and why the code is bcrypted.
 */
@Entity
@Table(name = "email_otp")
@Getter
@Setter
public class EmailOtp {

    public enum Purpose {
        VERIFY_EMAIL,
        RESET_PASSWORD
    }

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private String email;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 32)
    private Purpose purpose;

    /** bcrypt of the digits. The digits themselves exist only in the email. */
    @Column(name = "code_hash", nullable = false, length = 72)
    private String codeHash;

    @Column(name = "expires_at", nullable = false)
    private LocalDateTime expiresAt;

    @Column(name = "consumed_at")
    private LocalDateTime consumedAt;

    @Column(nullable = false)
    private short attempts;

    @Column(name = "created_at", nullable = false)
    private LocalDateTime createdAt;
}

package com.match.partner.openapi.user.model.dto;

import lombok.Data;

/**
 * Payload for POST /api/v1/auth/google.
 *
 * Only `idToken` is trusted. It is a signed JWT issued by Google and is verified
 * server-side before any account is created or any session token is issued.
 *
 * The email/name/googleId fields are deliberately NOT read from this request -
 * they are taken from the verified token instead. Trusting client-supplied
 * identity fields would let anyone sign in as any address.
 */
@Data
public class GoogleLoginDto {
    private String idToken;
}

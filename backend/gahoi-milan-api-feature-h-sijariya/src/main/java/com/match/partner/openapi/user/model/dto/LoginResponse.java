package com.match.partner.openapi.user.model.dto;

import lombok.Data;

@Data
public class LoginResponse {
    private String token;
    private long expiresIn;

    /**
     * 0-100, so the client knows where to send the member next.
     *
     * Without it the two Google buttons guessed from context: the one on the
     * sign-up screen always went to profile setup and the one on sign-in always
     * went home - same endpoint, same account, different destination depending
     * on which button was tapped. An existing member signing in from the
     * sign-up screen was sent to "complete your profile" every single time.
     *
     * Routing on the profile's real state fixes it in both directions: a new
     * account still lands on setup, and someone whose profile needs finishing
     * is taken there even if they arrived through sign-in.
     */
    private Integer profileCompletion;
}
package com.match.partner.openapi.user.service;

import com.match.partner.openapi.user.model.dto.ProfileResponse;
import org.springframework.http.ResponseEntity;

import java.io.UnsupportedEncodingException;

public interface GoogleAuthServiceInterface {
    ResponseEntity<ProfileResponse> getOauthAccessTokenGoogle(String code);
    String buildGoogleAuthUrl() throws UnsupportedEncodingException;
}
package com.match.partner.openapi.user.service;

import com.match.partner.openapi.user.model.dao.UserProfile;
import com.match.partner.openapi.user.model.dto.GoogleTokenResponse;
import com.match.partner.openapi.user.model.dto.ProfileResponse;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.*;
import org.springframework.stereotype.Service;
import org.springframework.util.LinkedMultiValueMap;
import org.springframework.util.MultiValueMap;
import org.springframework.web.client.RestTemplate;

import java.io.UnsupportedEncodingException;
import java.net.URLEncoder;
import java.nio.charset.StandardCharsets;

@Service
public class GoogleAuthServiceImpl implements GoogleAuthServiceInterface {
    @Value("${spring.security.oauth2.client.registration.google.client-id:}")
    private String clientId;
    @Value("${spring.security.oauth2.client.registration.google.client-secret:}")
    private String clientSecret;
    @Value("${spring.security.oauth2.client.registration.google.redirect-uri:https://api.gahoimarriage.in/api/v1/auth/grantcode}")
    private String redirectUri;

    public ResponseEntity<ProfileResponse> getOauthAccessTokenGoogle(String code) {
        RestTemplate restTemplate = new RestTemplate();
        HttpHeaders httpHeaders = new HttpHeaders();
        httpHeaders.setContentType(MediaType.APPLICATION_FORM_URLENCODED);

        MultiValueMap<String, String> params = new LinkedMultiValueMap<>();
        params.add("code", code);
        params.add("redirect_uri", redirectUri);
        params.add("client_id", clientId);
        params.add("client_secret", clientSecret);
        params.add("scope", "https%3A%2F%2Fwww.googleapis.com%2Fauth%2Fuserinfo.profile");
        params.add("scope", "https%3A%2F%2Fwww.googleapis.com%2Fauth%2Fuserinfo.email");
        params.add("scope", "openid");
        params.add("grant_type", "authorization_code");

        HttpEntity<MultiValueMap<String, String>> requestEntity = new HttpEntity<>(params, httpHeaders);

        String url = "https://oauth2.googleapis.com/token";
        GoogleTokenResponse response = restTemplate.postForObject(url, requestEntity, GoogleTokenResponse.class);
        return getProfileDetailsGoogle(response.getAccessToken());
    }

    public String buildGoogleAuthUrl() throws UnsupportedEncodingException {
        String encodedRedirectUri = URLEncoder.encode(redirectUri, StandardCharsets.UTF_8.toString());
        String scope = URLEncoder.encode("https://www.googleapis.com/auth/userinfo.email https://www.googleapis.com/auth/userinfo.profile openid", StandardCharsets.UTF_8.toString());

        return "https://accounts.google.com/o/oauth2/v2/auth" +
                "?redirect_uri=" + encodedRedirectUri +
                "&response_type=code" +
                "&client_id=" + clientId +
                "&scope=" + scope +
                "&access_type=offline";
    }

    private ResponseEntity<ProfileResponse> getProfileDetailsGoogle(String accessToken) {

        RestTemplate restTemplate = new RestTemplate();
        HttpHeaders httpHeaders = new HttpHeaders();
        httpHeaders.setBearerAuth(accessToken);

        HttpEntity<String> requestEntity = new HttpEntity<>(httpHeaders);

        String url = "https://www.googleapis.com/oauth2/v2/userinfo";
        ResponseEntity<ProfileResponse> response = restTemplate.exchange(url, HttpMethod.GET, requestEntity, ProfileResponse.class);
        return response;
    }

}

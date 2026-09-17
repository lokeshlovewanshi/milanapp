package com.match.partner.openapi.user.controller;

import com.match.partner.common.configuration.ClientException;
import com.match.partner.common.service.JwtServiceInterface;
import com.match.partner.openapi.user.model.dao.Status;
import com.match.partner.openapi.user.model.dao.UserProfile;
import com.match.partner.openapi.user.model.dto.*;
import com.match.partner.openapi.user.service.AuthenticationServiceInterface;
import lombok.RequiredArgsConstructor;

import org.springframework.http.*;
import org.springframework.web.bind.annotation.*;


@RestController
@RequiredArgsConstructor
@RequestMapping("api/v1/auth")
public class UserAuthController {

    private final JwtServiceInterface jwtService;
    private final AuthenticationServiceInterface authenticationService;
    private final com.match.partner.openapi.user.service.TokenBlacklistService tokenBlacklistService;
    private final com.match.partner.openapi.user.service.GoogleIdTokenService googleIdTokenService;

    @GetMapping("/ping")
    public String ping() {
        return "pong";
    }


    @PostMapping("/signup")
    public ResponseEntity<LoginResponse> register(@RequestBody RegisterUserDto registerUserDto) {
        UserProfile registeredUser = authenticationService.signup(registerUserDto);
        if(registeredUser.getStatus().equals(Status.PENDING)) {
            LoginUserDto userDto = new LoginUserDto();
            userDto.setEmail(registerUserDto.getEmail());
            userDto.setPassword(registerUserDto.getPassword());
            UserProfile authenticatedUser = authenticationService.authenticate(userDto);
            String jwtToken = jwtService.generateToken(authenticatedUser);
            LoginResponse loginResponse = new LoginResponse();
            loginResponse.setToken(jwtToken);
            loginResponse.setExpiresIn(jwtService.getExpirationTime());
            return ResponseEntity.ok(loginResponse);

        }
        else {
            throw new ClientException(HttpStatus.BAD_REQUEST,"Some");
        }
    }

    @PostMapping("/login")
    public ResponseEntity<LoginResponse> authenticate(@RequestBody LoginUserDto loginUserDto) {
        UserProfile authenticatedUser = authenticationService.authenticate(loginUserDto);
        String jwtToken = jwtService.generateToken(authenticatedUser);
        LoginResponse loginResponse = new LoginResponse();
        loginResponse.setToken(jwtToken);
        loginResponse.setExpiresIn(jwtService.getExpirationTime());
        // Every sign-in route reports this, not just Google. Someone who signed
        // up and then closed the app before finishing setup was being dropped
        // straight into the feed with an empty profile.
        loginResponse.setProfileCompletion(authenticatedUser.getProfileCompletion());
        return ResponseEntity.ok(loginResponse);
    }

    /**
     * Undo a soft delete and sign in, in one step.
     *
     * Reachable only after /login has already answered 410 Gone for this
     * exact email+password, so the credentials are checked again here rather
     * than trusted from that earlier response - a network log or a replayed
     * request is not proof of anything.
     */
    @PostMapping("/restore")
    public ResponseEntity<LoginResponse> restore(@RequestBody LoginUserDto loginUserDto) {
        UserProfile restoredUser = authenticationService.restoreAccount(loginUserDto);
        String jwtToken = jwtService.generateToken(restoredUser);
        LoginResponse loginResponse = new LoginResponse();
        loginResponse.setToken(jwtToken);
        loginResponse.setExpiresIn(jwtService.getExpirationTime());
        loginResponse.setProfileCompletion(restoredUser.getProfileCompletion());
        return ResponseEntity.ok(loginResponse);
    }

    /**
     * Sign in (or sign up) with Google.
     *
     * Expects { "idToken": "<Google ID token>" }. The token is verified against
     * Google before anything else happens; the account is then looked up or
     * created from the verified email and a normal app JWT is returned, so the
     * client can treat the response exactly like /login.
     */
    @PostMapping("/google")
    public ResponseEntity<LoginResponse> googleLogin(@RequestBody GoogleLoginDto googleLoginDto) {
        UserProfile user = googleIdTokenService.verifyAndResolveUser(googleLoginDto.getIdToken());

        LoginResponse loginResponse = new LoginResponse();
        loginResponse.setToken(jwtService.generateToken(user));
        loginResponse.setExpiresIn(jwtService.getExpirationTime());
        // Lets the app route on what the profile actually needs rather than on
        // which button was tapped - see LoginResponse.profileCompletion.
        loginResponse.setProfileCompletion(user.getProfileCompletion());
        return ResponseEntity.ok(loginResponse);
    }

    /**
     * Undo a soft delete for a Google-only account and sign in, in one step.
     *
     * Reachable only after /google has already answered 410 Gone for this
     * token's email. A Google account has no password to re-check the way
     * /restore does - re-verifying the ID token here plays that role instead,
     * so a network log or a replayed request is still not proof of anything.
     */
    @PostMapping("/google/restore")
    public ResponseEntity<LoginResponse> restoreGoogleAccount(@RequestBody GoogleLoginDto googleLoginDto) {
        UserProfile restoredUser = googleIdTokenService.restoreAccount(googleLoginDto.getIdToken());
        LoginResponse loginResponse = new LoginResponse();
        loginResponse.setToken(jwtService.generateToken(restoredUser));
        loginResponse.setExpiresIn(jwtService.getExpirationTime());
        loginResponse.setProfileCompletion(restoredUser.getProfileCompletion());
        return ResponseEntity.ok(loginResponse);
    }

    @PostMapping("/logout")
    public ResponseEntity<String> logout(@RequestHeader("Authorization") String authHeader) {
        if (authHeader != null && authHeader.startsWith("Bearer ")) {
            String token = authHeader.substring(7);
            tokenBlacklistService.blacklistToken(token);
        }
        return ResponseEntity.ok("Logged out successfully");
    }


}



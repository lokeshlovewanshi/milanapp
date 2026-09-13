package com.match.partner.openapi.user.service;

import com.match.partner.openapi.user.model.dao.UserProfile;
import com.match.partner.openapi.user.model.dto.LoginUserDto;
import com.match.partner.openapi.user.model.dto.RegisterUserDto;

public interface AuthenticationServiceInterface {
    UserProfile signup(RegisterUserDto input);
    UserProfile authenticate(LoginUserDto input);
    UserProfile getProfileDetails(String email);

    /**
     * Undo a soft delete for the account these credentials belong to.
     *
     * Takes a password, not just an email, so a deleted account cannot be
     * revived by anyone who merely knows the address - the same proof of
     * ownership {@link #authenticate} already requires.
     */
    UserProfile restoreAccount(LoginUserDto input);
}
package com.match.partner.openapi.user.service;

import com.match.partner.openapi.user.model.dto.RegisterUserDto;

public interface RegisterUserServiceInterface {
    void registerUser(RegisterUserDto registerUserDto);
}
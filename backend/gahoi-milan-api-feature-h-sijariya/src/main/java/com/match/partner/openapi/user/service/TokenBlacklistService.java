package com.match.partner.openapi.user.service;

import com.match.partner.openapi.user.model.dao.TokenBlacklist;
import com.match.partner.openapi.user.repository.TokenBlacklistRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;

@Service
@RequiredArgsConstructor
public class TokenBlacklistService {

    private final TokenBlacklistRepository tokenBlacklistRepository;

    public void blacklistToken(String token) {
        if (!isTokenBlacklisted(token)) {
            TokenBlacklist blacklist = new TokenBlacklist();
            blacklist.setToken(token);
            blacklist.setBlacklistedAt(LocalDateTime.now());
            tokenBlacklistRepository.save(blacklist);
        }
    }

    public boolean isTokenBlacklisted(String token) {
        return tokenBlacklistRepository.findByToken(token).isPresent();
    }
}

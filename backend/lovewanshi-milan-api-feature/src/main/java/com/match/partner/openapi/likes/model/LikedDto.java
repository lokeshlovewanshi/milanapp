package com.match.partner.openapi.likes.model;

import com.match.partner.openapi.user.model.dto.UserDto;
import lombok.Data;

import java.time.LocalDateTime;

@Data
public class LikedDto {
    private String status;
    private LocalDateTime likedAt;
    private UserDto likedProfile;
}

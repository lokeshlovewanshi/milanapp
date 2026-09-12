package com.match.partner.openapi.views.model.dto;

import com.match.partner.openapi.user.model.dto.UserDto;
import lombok.Data;

import java.time.LocalDateTime;

@Data
public class ViewsDto {
    private UserDto viewedBy;
    private LocalDateTime viewedAt;
}

package com.match.partner.openapi.user.model.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@AllArgsConstructor
@NoArgsConstructor
public class ProfileImageDto {
    private Integer id;
    private String url;
    private Boolean isPrimary;
}

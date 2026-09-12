package com.match.partner.openapi.admin.model.dto;

import com.match.partner.openapi.user.model.dto.UserProfileDTO;
import lombok.Data;
import lombok.EqualsAndHashCode;

/**
 * Payload used by an admin to create a new user profile on behalf of a member.
 */
@Data
@EqualsAndHashCode(callSuper = true)
public class AdminCreateProfileDTO extends UserProfileDTO {
    /**
     * Optional initial password. If null or blank, a default initial password
     * (e.g. Gahoi@2026) will be assigned so the member can sign in later.
     */
    private String password;
}

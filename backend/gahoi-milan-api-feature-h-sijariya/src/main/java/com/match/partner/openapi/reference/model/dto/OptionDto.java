package com.match.partner.openapi.reference.model.dto;

import lombok.AllArgsConstructor;
import lombok.Data;

@Data
@AllArgsConstructor
public class OptionDto {
    /** Stored on the profile. */
    private String code;
    /** Shown to the user. */
    private String label;
}

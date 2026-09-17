package com.match.partner.openapi.reference.model.dto;

import lombok.AllArgsConstructor;
import lombok.Data;

@Data
@AllArgsConstructor
public class StateDto {
    private Integer id;
    private String code;
    private String name;
    private String kind;
}

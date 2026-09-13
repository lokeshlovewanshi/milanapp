package com.match.partner.openapi.reference.model.dto;

import lombok.AllArgsConstructor;
import lombok.Data;

@Data
@AllArgsConstructor
public class CityDto {
    private Integer id;
    private String name;
    private Integer tier;
    private String state;
}

package com.match.partner.openapi.user.model.dto;

import com.fasterxml.jackson.annotation.JsonAlias;
import lombok.Data;

@Data
public class FamilyInfoDTO {
    private String fathersName;
    private String fathersOccupation;
    private String fathersContactNo;
    private String mothersName;
    private String mothersOccupation;
    private Integer marriedBrothers;
    private Integer unmarriedBrothers;
    private Integer marriedSisters;
    private Integer unmarriedSisters;
    private String maternalUnclesName;
    @JsonAlias({"maternalUnclesAakna", "maternalUnclesGotra"})
    private String maternalUnclesGotra;
    private String houseStatus;
    private String carStatus;
    private String partnerPreferences;
    private String aboutMyself;

    public String getMaternalUnclesAakna() {
        return this.maternalUnclesGotra;
    }

    public void setMaternalUnclesAakna(String aakna) {
        this.maternalUnclesGotra = aakna;
    }
}

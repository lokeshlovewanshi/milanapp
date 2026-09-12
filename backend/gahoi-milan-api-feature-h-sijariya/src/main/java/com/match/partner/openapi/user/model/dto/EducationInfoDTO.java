package com.match.partner.openapi.user.model.dto;

import lombok.Data;
import java.time.LocalDateTime;

@Data
public class EducationInfoDTO {
    private String education;
    private String educationDetails;
    private String profession;
    private String occupationDetails;
    private String employedIn;
    private String organization;
    private String workCity;
    private String annualIncome;
    private LocalDateTime occupationStartDate;
}

package com.match.partner.openapi.user.service;

import com.match.partner.common.Utils.CommonUtils;
import com.match.partner.common.service.S3ServiceInterface;
import com.match.partner.openapi.attachment.repository.AttachmentRepository;
import com.match.partner.openapi.reference.model.dao.LookupOption;
import com.match.partner.openapi.reference.repository.LookupOptionRepository;
import com.match.partner.openapi.user.model.dao.UserProfile;
import com.match.partner.openapi.user.repository.KundaliRepository;
import com.match.partner.openapi.user.repository.UserProfileRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.LocalDateTime;
import java.util.Collections;
import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class BiodataServiceTest {

    @Mock
    private UserProfileRepository userProfileRepository;

    @Mock
    private KundaliRepository kundaliRepository;

    @Mock
    private AttachmentRepository attachmentRepository;

    @Mock
    private S3ServiceInterface s3Service;

    @Mock
    private LookupOptionRepository lookupOptionRepository;

    private CommonUtils commonUtils = new CommonUtils();
    private BiodataService biodataService;

    @BeforeEach
    void setUp() {
        biodataService = new BiodataService(
                userProfileRepository,
                kundaliRepository,
                attachmentRepository,
                s3Service,
                commonUtils,
                lookupOptionRepository
        );
    }

    @Test
    void rendersHeightLabelFromLookup() {
        UserProfile profile = new UserProfile();
        profile.setId(101);
        profile.setName("Rahul Gahoi");
        profile.setEmail("rahul@example.com");
        profile.setHeight("H_53");
        profile.setAnnualIncome("INR_10_15");
        profile.setDiet("VEG");
        profile.setDateOfBirth(LocalDateTime.of(1996, 5, 15, 10, 30));

        LookupOption heightOption = new LookupOption();
        heightOption.setCategory("height");
        heightOption.setCode("H_53");
        heightOption.setLabel("4' 5\" (135 cm)");

        LookupOption incomeOption = new LookupOption();
        incomeOption.setCategory("annual_income");
        incomeOption.setCode("INR_10_15");
        incomeOption.setLabel("₹10 - 15 Lakh");

        when(userProfileRepository.findByEmail("rahul@example.com"))
                .thenReturn(Optional.of(profile));
        when(kundaliRepository.findById(101)).thenReturn(Optional.empty());
        when(attachmentRepository.findByUserId(101)).thenReturn(Collections.emptyList());
        when(lookupOptionRepository.findByCategoryAndActiveTrueOrderBySortOrderAsc("height"))
                .thenReturn(List.of(heightOption));
        when(lookupOptionRepository.findByCategoryAndActiveTrueOrderBySortOrderAsc("annual_income"))
                .thenReturn(List.of(incomeOption));
        when(lookupOptionRepository.findByCategoryAndActiveTrueOrderBySortOrderAsc("diet"))
                .thenReturn(Collections.emptyList());

        String html = biodataService.renderForUser("rahul@example.com");

        assertFalse(html.contains("H_53"), "HTML should not contain raw height code H_53");
        assertTrue(html.contains("4&#39; 5&quot; (135 cm)") || html.contains("4' 5\" (135 cm)"),
                "HTML should contain formatted height label");
        assertFalse(html.contains("INR_10_15"), "HTML should not contain raw income code INR_10_15");
        assertTrue(html.contains("₹10 - 15 Lakh"), "HTML should contain formatted annual income");
        assertTrue(html.contains("Veg"), "HTML should contain formatted fallback for diet");
    }

    @Test
    void rendersHeightFallbackCalculationWhenLookupMissing() {
        UserProfile profile = new UserProfile();
        profile.setId(102);
        profile.setName("Priya Gahoi");
        profile.setEmail("priya@example.com");
        profile.setHeight("H_63"); // 63 inches = 5' 3" (160 cm)
        profile.setDateOfBirth(LocalDateTime.of(1998, 8, 20, 14, 0));

        when(userProfileRepository.findByEmail("priya@example.com"))
                .thenReturn(Optional.of(profile));
        when(kundaliRepository.findById(102)).thenReturn(Optional.empty());
        when(attachmentRepository.findByUserId(102)).thenReturn(Collections.emptyList());
        when(lookupOptionRepository.findByCategoryAndActiveTrueOrderBySortOrderAsc(anyString()))
                .thenReturn(Collections.emptyList());

        String html = biodataService.renderForUser("priya@example.com");

        assertFalse(html.contains("H_63"), "HTML should not contain raw height code H_63");
        assertTrue(html.contains("5&#39; 3&quot; (160 cm)") || html.contains("5' 3\" (160 cm)"),
                "HTML should mathematically format H_63 to 5' 3\" (160 cm)");
    }
}

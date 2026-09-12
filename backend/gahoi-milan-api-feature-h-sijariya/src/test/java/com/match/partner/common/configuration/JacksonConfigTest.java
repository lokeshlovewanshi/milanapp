package com.match.partner.common.configuration;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.module.SimpleModule;
import com.match.partner.openapi.user.model.dto.UserProfileDTO;
import org.junit.jupiter.api.Test;

import java.time.LocalDateTime;

import static org.junit.jupiter.api.Assertions.*;

public class JacksonConfigTest {

    @Test
    public void testDateOnlyDeserialization() throws Exception {
        ObjectMapper mapper = new ObjectMapper();
        SimpleModule module = new SimpleModule();
        module.addDeserializer(LocalDateTime.class, new JacksonConfig.FlexibleLocalDateTimeDeserializer());
        mapper.registerModule(module);

        String json = "{\"dateOfBirth\": \"1996-10-19\"}";
        UserProfileDTO dto = mapper.readValue(json, UserProfileDTO.class);

        assertNotNull(dto.getDateOfBirth());
        assertEquals(1996, dto.getDateOfBirth().getYear());
        assertEquals(10, dto.getDateOfBirth().getMonthValue());
        assertEquals(19, dto.getDateOfBirth().getDayOfMonth());
        assertEquals(0, dto.getDateOfBirth().getHour());
        assertEquals(0, dto.getDateOfBirth().getMinute());
    }

    @Test
    public void testIsoDateTimeDeserialization() throws Exception {
        ObjectMapper mapper = new ObjectMapper();
        SimpleModule module = new SimpleModule();
        module.addDeserializer(LocalDateTime.class, new JacksonConfig.FlexibleLocalDateTimeDeserializer());
        mapper.registerModule(module);

        String json = "{\"dateOfBirth\": \"1996-10-19T14:30:45\"}";
        UserProfileDTO dto = mapper.readValue(json, UserProfileDTO.class);

        assertNotNull(dto.getDateOfBirth());
        assertEquals(1996, dto.getDateOfBirth().getYear());
        assertEquals(10, dto.getDateOfBirth().getMonthValue());
        assertEquals(19, dto.getDateOfBirth().getDayOfMonth());
        assertEquals(14, dto.getDateOfBirth().getHour());
        assertEquals(30, dto.getDateOfBirth().getMinute());
        assertEquals(45, dto.getDateOfBirth().getSecond());
    }

    @Test
    public void testSpaceDateTimeDeserialization() throws Exception {
        ObjectMapper mapper = new ObjectMapper();
        SimpleModule module = new SimpleModule();
        module.addDeserializer(LocalDateTime.class, new JacksonConfig.FlexibleLocalDateTimeDeserializer());
        mapper.registerModule(module);

        String json = "{\"dateOfBirth\": \"1996-10-19 14:30:45\"}";
        UserProfileDTO dto = mapper.readValue(json, UserProfileDTO.class);

        assertNotNull(dto.getDateOfBirth());
        assertEquals(1996, dto.getDateOfBirth().getYear());
        assertEquals(14, dto.getDateOfBirth().getHour());
    }

    @Test
    public void testNullAndEmptyDate() throws Exception {
        ObjectMapper mapper = new ObjectMapper();
        SimpleModule module = new SimpleModule();
        module.addDeserializer(LocalDateTime.class, new JacksonConfig.FlexibleLocalDateTimeDeserializer());
        mapper.registerModule(module);

        String jsonNull = "{\"dateOfBirth\": null}";
        UserProfileDTO dtoNull = mapper.readValue(jsonNull, UserProfileDTO.class);
        assertNull(dtoNull.getDateOfBirth());

        String jsonEmpty = "{\"dateOfBirth\": \"\"}";
        UserProfileDTO dtoEmpty = mapper.readValue(jsonEmpty, UserProfileDTO.class);
        assertNull(dtoEmpty.getDateOfBirth());
    }
}

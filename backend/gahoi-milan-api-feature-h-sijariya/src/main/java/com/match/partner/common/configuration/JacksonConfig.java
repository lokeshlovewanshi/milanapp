package com.match.partner.common.configuration;

import com.fasterxml.jackson.core.JsonParser;
import com.fasterxml.jackson.databind.DeserializationContext;
import com.fasterxml.jackson.databind.JsonDeserializer;
import org.springframework.boot.autoconfigure.jackson.Jackson2ObjectMapperBuilderCustomizer;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

import java.io.IOException;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.time.format.DateTimeParseException;

@Configuration
public class JacksonConfig {

    /**
     * Flexible deserializer for java.time.LocalDateTime.
     * Supports:
     * - ISO date-only strings: "1996-10-19" (parsed as 1996-10-19T00:00:00)
     * - Standard ISO date-time: "1996-10-19T10:30:00"
     * - Space-delimited date-time: "1996-10-19 10:30:00"
     */
    public static class FlexibleLocalDateTimeDeserializer extends JsonDeserializer<LocalDateTime> {
        private static final DateTimeFormatter DATE_ONLY_FORMATTER = DateTimeFormatter.ISO_LOCAL_DATE;
        private static final DateTimeFormatter ISO_FORMATTER = DateTimeFormatter.ISO_DATE_TIME;

        @Override
        public LocalDateTime deserialize(JsonParser p, DeserializationContext ctxt) throws IOException {
            String text = p.getText();
            if (text == null || text.trim().isEmpty()) {
                return null;
            }
            text = text.trim();

            // Handle date-only strings: "1996-10-19"
            if (text.length() == 10 && !text.contains("T")) {
                try {
                    return LocalDate.parse(text, DATE_ONLY_FORMATTER).atStartOfDay();
                } catch (DateTimeParseException ignored) {
                }
            }

            // Handle standard ISO or space-separated date-time
            try {
                return LocalDateTime.parse(text, ISO_FORMATTER);
            } catch (DateTimeParseException e) {
                if (text.contains(" ")) {
                    try {
                        return LocalDateTime.parse(text.replace(" ", "T"), ISO_FORMATTER);
                    } catch (DateTimeParseException ignored) {
                    }
                }
                throw e;
            }
        }
    }

    @Bean
    public Jackson2ObjectMapperBuilderCustomizer jacksonCustomizer() {
        return builder -> builder.deserializerByType(LocalDateTime.class, new FlexibleLocalDateTimeDeserializer());
    }
}

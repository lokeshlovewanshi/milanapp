package com.match.partner.common.Utils;

import java.time.LocalTime;
import java.time.format.DateTimeFormatter;
import java.util.List;
import java.util.Locale;

/**
 * Normalises a time of birth to the exact shape the {@code time_of_birth}
 * column expects.
 *
 * The column is a MySQL TIME, but the entity field is a String, so whatever the
 * client sends is handed straight to the driver. Early builds of the app used a
 * free-text box, which produced values like "4.30pm", "morning" and "04:30 PM" -
 * none of which MySQL can store in a TIME column. Those inserts either failed
 * outright or silently landed as 00:00:00.
 *
 * The app now sends a picked "HH:mm:ss", so this exists to defend the column
 * against the older clients and the stray direct API call. Anything it cannot
 * confidently read becomes null: an astrologer reading a wrong birth time is
 * worse than one reading no birth time.
 */
public final class TimeFormatter {

    private TimeFormatter() {
    }

    /** Ordered by likelihood, since the first match wins. */
    private static final List<DateTimeFormatter> PATTERNS = List.of(
            DateTimeFormatter.ofPattern("HH:mm:ss", Locale.ENGLISH),
            DateTimeFormatter.ofPattern("HH:mm", Locale.ENGLISH),
            DateTimeFormatter.ofPattern("h:mm a", Locale.ENGLISH),
            DateTimeFormatter.ofPattern("hh:mm a", Locale.ENGLISH),
            DateTimeFormatter.ofPattern("h:mma", Locale.ENGLISH),
            DateTimeFormatter.ofPattern("h.mm a", Locale.ENGLISH));

    /**
     * @param raw whatever the client supplied
     * @return "HH:mm:ss", or null if the value is blank or unreadable
     */
    public static String toDbTime(String raw) {
        if (raw == null) {
            return null;
        }

        // "4.30 pm" -> "4.30 PM": the AM/PM patterns are case-sensitive, and
        // lowercase is what phone keyboards produce.
        String cleaned = raw.trim().replaceAll("\\s+", " ").toUpperCase(Locale.ENGLISH);
        if (cleaned.isEmpty()) {
            return null;
        }

        for (DateTimeFormatter pattern : PATTERNS) {
            try {
                return LocalTime.parse(cleaned, pattern).format(DateTimeFormatter.ofPattern("HH:mm:ss"));
            } catch (Exception ignored) {
                // Try the next shape.
            }
        }

        return null;
    }
}

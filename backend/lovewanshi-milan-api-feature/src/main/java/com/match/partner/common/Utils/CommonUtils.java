package com.match.partner.common.Utils;

import org.springframework.stereotype.Component;

@Component
public class CommonUtils {

    public String convertToJMFormat(int number) {
        return String.format("JM%05d", number);
    }

    /**
     * Converts an external profile code or raw numeric ID into an internal database integer ID.
     * Supports:
     * - "JM00243", "jm00243", "JM243" -> 243
     * - "GM00243", "gm00243", "GM243" -> 243
     * - "243", "00243" -> 243
     */
    public int convertFromJMFormat(String jmCode) {
        if (jmCode == null || jmCode.trim().isEmpty()) {
            throw new IllegalArgumentException("Invalid JM code format: " + jmCode);
        }
        String trimmed = jmCode.trim();
        String upper = trimmed.toUpperCase();
        if (upper.startsWith("JM") || upper.startsWith("GM")) {
            try {
                return Integer.parseInt(upper.substring(2));
            } catch (NumberFormatException e) {
                throw new IllegalArgumentException("Invalid JM code format: " + jmCode);
            }
        }
        try {
            return Integer.parseInt(trimmed);
        } catch (NumberFormatException e) {
            throw new IllegalArgumentException("Invalid JM code format: " + jmCode);
        }
    }

    /**
     *
     * Delegates to NameFormatter. UserProfile also normalises its own name in a
     * JPA lifecycle callback, so every save path is covered whether or not the
     * caller remembers to use this.
     */
    public String toDisplayName(String raw) {
        return NameFormatter.toDisplayName(raw);
    }

}

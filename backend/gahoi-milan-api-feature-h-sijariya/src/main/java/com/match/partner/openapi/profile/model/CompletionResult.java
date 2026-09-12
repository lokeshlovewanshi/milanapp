package com.match.partner.openapi.profile.model;

import lombok.AllArgsConstructor;
import lombok.Data;

import java.util.List;
import java.util.Map;

/** Completion score plus enough detail for the UI to prompt the user usefully. */
@Data
@AllArgsConstructor
public class CompletionResult {
    /** 0-100. */
    private int score;
    /** Percentage complete per section, so the UI can point at the weakest one. */
    private Map<String, Integer> sections;
    /** Field names still empty, highest weight first. */
    private List<String> missing;
}

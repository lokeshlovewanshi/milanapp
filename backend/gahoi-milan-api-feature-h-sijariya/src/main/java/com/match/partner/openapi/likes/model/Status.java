package com.match.partner.openapi.likes.model;

public enum Status {
    ACCEPTED("accepted"),
    REJECTED("rejected"),
    PENDING("pending");

    private final String value;

    Status(String value) {
        this.value = value;
    }

    public String getValue() {
        return value;
    }

    public static Status fromValue(String value) {
        for (Status status : Status.values()) {
            if (status.value.equalsIgnoreCase(value)) {
                return status;
            }
        }
        throw new IllegalArgumentException("Unknown status value: " + value);
    }
}

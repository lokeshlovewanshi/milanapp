package com.match.partner.openapi.user.model.dao;

public enum Status {
    APPROVED("approved"),
    REJECTED("rejected"),
    PENDING("pending"),
    CREATED("created"),
    DEACTIVATED("deactivated");

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

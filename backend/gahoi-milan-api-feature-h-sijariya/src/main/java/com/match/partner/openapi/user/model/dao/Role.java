package com.match.partner.openapi.user.model.dao;

public enum Role {
    USER,
    ADMIN,
    APPROVER,
    READONLY;

    public String getAuthority() {
        return "ROLE_" + this.name();
    }
}

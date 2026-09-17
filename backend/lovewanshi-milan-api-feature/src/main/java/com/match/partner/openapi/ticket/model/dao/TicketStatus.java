package com.match.partner.openapi.ticket.model.dao;

/**
 * The valid values for support_ticket.status - kept a plain String column
 * (see MaritalStatus for the same reasoning) so nothing here is baked into
 * the schema, only validated in Java before a write reaches it.
 */
public enum TicketStatus {
    OPEN,
    CLOSED
}

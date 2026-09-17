package com.match.partner.openapi.user.model.dto;

/**
 * Optional narrowing for "see all profiles".
 *
 * Every field is nullable and every field means "don't filter on this" when
 * null - a record rather than four more parameters bolted onto
 * {@code getUsers}, which was already four deep before this existed.
 *
 * ageFrom/ageTo are years, not dates: the birth-date arithmetic belongs next
 * to the query that uses it, not in the controller.
 */
public record ProfileFilter(
        Integer ageFrom,
        Integer ageTo,
        String maritalStatus,
        String profession,
        String manglik,
        /** Height lookup codes ("H_60"), not centimetres - resolved to the height category's sort_order. */
        String heightFrom,
        String heightTo
) {
    public static final ProfileFilter NONE =
            new ProfileFilter(null, null, null, null, null, null, null);

    public boolean isEmpty() {
        return ageFrom == null && ageTo == null && maritalStatus == null
                && profession == null && manglik == null
                && heightFrom == null && heightTo == null;
    }
}

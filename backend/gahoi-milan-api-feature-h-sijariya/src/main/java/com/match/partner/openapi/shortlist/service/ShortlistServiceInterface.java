package com.match.partner.openapi.shortlist.service;

import com.match.partner.openapi.shortlist.model.dao.Shortlist;
import com.match.partner.openapi.user.model.dto.UserDto;

import java.util.List;

public interface ShortlistServiceInterface {
    List<UserDto> getShortlistedProfiles(String userName);
    Shortlist saveShortlist(Integer shortlistId, String userName);
    void remove(Integer shortlistId, String userName);
}
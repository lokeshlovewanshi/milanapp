package com.match.partner.openapi.views.service;

import com.match.partner.openapi.views.model.dto.ViewsDto;
import com.match.partner.openapi.views.model.dto.ViewsRequest;

import java.util.List;

public interface ViewsServiceInterface {
    void addView(ViewsRequest request);
    void addView(int profileId, int viewedById);
    void addView(int profileId, String userName);
    List<ViewsDto> getViews(String userName);
}
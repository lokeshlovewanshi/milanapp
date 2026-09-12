package com.match.partner.openapi.views.controller;


import com.match.partner.openapi.views.model.dto.ViewsDto;
import com.match.partner.openapi.views.model.dto.ViewsRequest;
import com.match.partner.openapi.views.service.ViewsServiceInterface;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

import com.match.partner.common.Utils.CommonUtils;
import java.util.Map;

@RestController
@RequestMapping("/api/v1/views")
@RequiredArgsConstructor
public class ViewsController {
    private final ViewsServiceInterface viewsService;
    private final CommonUtils commonUtils;

    @PostMapping
    public ResponseEntity<String> addView(@RequestBody Map<String, String> request, @RequestAttribute("username") String userName) {
        String profileIdStr = request.get("profileId");
        if (profileIdStr == null && request.containsKey("viewedId")) {
            profileIdStr = request.get("viewedId");
        }
        int profileId = commonUtils.convertFromJMFormat(profileIdStr);
        viewsService.addView(profileId, userName);
        return ResponseEntity.ok("View added successfully");
    }

    @GetMapping
    public ResponseEntity<List<ViewsDto>> getViews(@RequestAttribute("username") String userName) {
        List<ViewsDto> views = viewsService.getViews(userName);
        return ResponseEntity.ok(views);
    }
}

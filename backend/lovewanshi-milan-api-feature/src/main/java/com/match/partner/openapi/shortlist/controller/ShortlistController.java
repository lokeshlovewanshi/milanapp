package com.match.partner.openapi.shortlist.controller;

import com.match.partner.common.Utils.CommonUtils;
import com.match.partner.openapi.shortlist.model.dao.Shortlist;
import com.match.partner.openapi.shortlist.service.ShortlistServiceInterface;
import com.match.partner.openapi.user.model.dto.ShortlistDto;
import com.match.partner.openapi.user.model.dto.UserDto;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/v1/shortlist")
@RequiredArgsConstructor
public class ShortlistController {
    private final ShortlistServiceInterface shortlistService;
    private final CommonUtils commonUtils;

    @PostMapping("/{userId}")
    public ShortlistDto saveShortlist(@PathVariable String userId, @RequestAttribute("username") String userName) {
        int id = commonUtils.convertFromJMFormat(userId);
        Shortlist savedShortlist = shortlistService.saveShortlist(id, userName);
        return convertToDto(savedShortlist);
    }

    @DeleteMapping("/{userId}")
    public void remove(@PathVariable String userId, @RequestAttribute("username") String userName) {
        int id = commonUtils.convertFromJMFormat(userId);
        shortlistService.remove(id, userName);
    }


    @GetMapping
    public List<UserDto> getShortlistedProfiles(@RequestAttribute("username") String userName) {
        return shortlistService.getShortlistedProfiles(userName);
    }

    private ShortlistDto convertToDto(Shortlist shortlist) {
        ShortlistDto dto = new ShortlistDto();
        return dto;
    }
}

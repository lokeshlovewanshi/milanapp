package com.match.partner.openapi.likes.controller;

import com.match.partner.common.Utils.CommonUtils;
import com.match.partner.openapi.likes.model.LikedDto;
import com.match.partner.openapi.likes.model.ProfileLike;
import com.match.partner.openapi.likes.model.Status;
import com.match.partner.openapi.likes.model.StatusBody;
import com.match.partner.openapi.likes.service.ProfileLikeServiceInterface;
import com.match.partner.openapi.shortlist.model.dao.Shortlist;
import com.match.partner.openapi.user.model.dto.UserDto;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/v1/likes")
@RequiredArgsConstructor
public class ProfileLikeController {


    private final ProfileLikeServiceInterface profileLikeService;
    private final CommonUtils commonUtils;

    @PostMapping("/{userId}")
    public ResponseEntity<String> likeProfile(@PathVariable String userId,
                                              @RequestAttribute("username") String userName) {


        int likedId = commonUtils.convertFromJMFormat(userId);
        String response = profileLikeService.likeProfile(userName, likedId);
        if (response.equals("You have already liked this profile.")) {
            return ResponseEntity.badRequest().body(response);
        }
        return ResponseEntity.ok(response);
    }

    @DeleteMapping("/{userId}")
    public void deleteLike(@PathVariable String userId,
                           @RequestAttribute("username") String userName){
        int likedId = commonUtils.convertFromJMFormat(userId);
        profileLikeService.removeLike(userName, likedId);


    }

    @GetMapping
    public ResponseEntity<List<LikedDto>> getLikesBySomeone(@RequestAttribute("username") String userName) {
        List<LikedDto> likes = profileLikeService.getAllLikes(userName);
        return ResponseEntity.ok(likes);
    }

    @PostMapping("/accept/{userId}")
    public ResponseEntity<String> acceptLike(@PathVariable String userId,
                                             @RequestAttribute("username") String userName) {
        int acceptedId = commonUtils.convertFromJMFormat(userId);
        String response = profileLikeService.acceptLike(userName, acceptedId);
        if (response.equals("Like not found.")) {
            return ResponseEntity.badRequest().body(response);
        }
        return ResponseEntity.ok(response);
    }

    @PostMapping("/reject/{userId}")
    public ResponseEntity<String> rejectLike(@PathVariable String userId,
                                             @RequestAttribute("username") String userName) {
        int rejectedBy = commonUtils.convertFromJMFormat(userId);
        String response = profileLikeService.rejectLike(userName, rejectedBy);
        if (response.equals("Like not found.")) {
            return ResponseEntity.badRequest().body(response);
        }
        return ResponseEntity.ok(response);
    }

    @GetMapping("/me")
    public ResponseEntity<List<LikedDto>> getMyLikesStatus(@RequestAttribute("username") String userName) {
        List<LikedDto> likes = profileLikeService.getMyLikesStatus(userName);
        return ResponseEntity.ok(likes);
    }

}

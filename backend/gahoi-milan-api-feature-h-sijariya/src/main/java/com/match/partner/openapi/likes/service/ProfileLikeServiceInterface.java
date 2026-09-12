package com.match.partner.openapi.likes.service;

import com.match.partner.openapi.likes.model.LikedDto;

import java.util.List;

public interface ProfileLikeServiceInterface {
    String likeProfile(String userName, int likedId);
    List<LikedDto> getAllLikes(String userName);
    String acceptLike(String acceptedBy, int acceptedId);
    String rejectLike(String rejectedBy, int rejectId);
    List<LikedDto> getMyLikesStatus(String userName);
    void removeLike(String userName, int likedId);
}
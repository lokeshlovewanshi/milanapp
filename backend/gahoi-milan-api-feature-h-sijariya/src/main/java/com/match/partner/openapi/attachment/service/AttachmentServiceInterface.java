package com.match.partner.openapi.attachment.service;

import com.match.partner.openapi.attachment.model.entity.dto.UploadUrlResponseDto;

public interface AttachmentServiceInterface {
    String upload(String fileName, String userName, byte[] fileBytes, String fileType);
    UploadUrlResponseDto generateUploadUrl(String fileName, String userName, String fileType);
    String setPrimary(Integer attachmentId, String userName);

    /**
     * Remove one of the caller's own photos.
     *
     * @return the id promoted to primary, or null if none was needed
     */
    Integer delete(Integer attachmentId, String userName);
}
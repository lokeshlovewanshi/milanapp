package com.match.partner.common.service;

public interface S3ServiceInterface {
    String uploadFile(byte[] fileData, String fileName);
    String generatePresignedUrl(String fileName);

    /**
     * A signed URL for the small 400px copy the image_compression Lambda
     * writes under {@code thumbs/}, for anywhere a photo appears at list size
     * rather than full screen - a feed of 20 profiles has no business pulling
     * 20 full-resolution images.
     *
     * Falls back to the full-size original when no thumbnail exists yet -
     * true for every photo uploaded before the Lambda went live, since there
     * has never been a backfill. Without the fallback, an unthumbnailed photo
     * would presign a key nobody ever wrote and 404 in the app.
     */
    String generatePresignedThumbnailUrl(String fileName);

    String generatePresignedUploadUrl(String fileName, String contentType);
}
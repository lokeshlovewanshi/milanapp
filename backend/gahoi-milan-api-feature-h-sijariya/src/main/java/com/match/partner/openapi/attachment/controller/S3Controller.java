package com.match.partner.openapi.attachment.controller;

import com.match.partner.common.service.S3ServiceInterface;
import com.match.partner.openapi.attachment.model.entity.dto.UploadUrlResponseDto;
import com.match.partner.openapi.attachment.model.entity.dao.AttachmentDao;
import com.match.partner.openapi.attachment.service.AttachmentServiceInterface;
import lombok.extern.slf4j.Slf4j;
import org.springframework.web.bind.annotation.*;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/attachment")
@Slf4j
public class S3Controller {

    @Autowired
    private S3ServiceInterface s3Service;
    @Autowired
    AttachmentServiceInterface attachmentService;

    // Upload file to S3
    @PostMapping("/upload")
    public ResponseEntity<String> uploadFile(@RequestParam("file") MultipartFile file,@RequestAttribute("username") String userName) throws IOException {
        byte[] fileBytes = file.getBytes();
        String fileName = UUID.randomUUID().toString() + "_" + file.getOriginalFilename();
        String fileType = file.getContentType();

        log.info("Username: {}", userName);

        String response = attachmentService.upload(fileName, userName, fileBytes, fileType);
        return ResponseEntity.ok(response);
    }

    @GetMapping("/download/{fileName}")
    public ResponseEntity<String> getDownloadUrl(@PathVariable String fileName) {
        String presignedUrl = s3Service.generatePresignedUrl(fileName);
        return ResponseEntity.ok(presignedUrl);
    }

    // Generate a signed URL to upload file to S3
    @GetMapping("/generate-upload-url")
    public ResponseEntity<UploadUrlResponseDto> generateUploadUrl(
            @RequestParam("fileType") String fileType,
            @RequestParam("originalFileName") String originalFileName,
            @RequestAttribute("username") String userName) {

        String fileName = UUID.randomUUID().toString() + "_" + originalFileName;
        log.info("Generating upload URL for user: {}, fileName: {}", userName, fileName);

        UploadUrlResponseDto response = attachmentService.generateUploadUrl(fileName, userName, fileType);
        return ResponseEntity.ok(response);
    }

    /**
     * Delete one of your own photos.
     *
     * No id but your own can be deleted - the service looks the id up among the
     * caller's attachments rather than fetching it globally.
     */
    @DeleteMapping("/{attachmentId}")
    public ResponseEntity<java.util.Map<String, Object>> deleteImage(
            @PathVariable Integer attachmentId,
            @RequestAttribute("username") String userName) {
        Integer promoted = attachmentService.delete(attachmentId, userName);
        return ResponseEntity.ok(java.util.Collections.singletonMap("newPrimaryId", promoted));
    }

    @PutMapping("/{attachmentId}/set-primary")
    public ResponseEntity<String> setPrimaryImage(
            @PathVariable Integer attachmentId,
            @RequestAttribute("username") String userName) {
        String response = attachmentService.setPrimary(attachmentId, userName);
        return ResponseEntity.ok(response);
    }
}

package com.match.partner.openapi.attachment.service;

import com.match.partner.common.configuration.ClientException;
import org.springframework.http.HttpStatus;
import com.match.partner.common.service.S3ServiceInterface;
import com.match.partner.openapi.attachment.model.entity.dao.AttachmentDao;
import com.match.partner.openapi.attachment.model.entity.dto.UploadUrlResponseDto;
import com.match.partner.openapi.attachment.repository.AttachmentRepository;
import com.match.partner.openapi.user.model.dao.UserProfile;
import com.match.partner.openapi.user.repository.UserProfileRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

@Service
public class AttachmentServiceImpl implements AttachmentServiceInterface {

    @Autowired
    S3ServiceInterface s3Service;
    @Autowired
    UserProfileRepository userProfileRepository;
    @Autowired
    AttachmentRepository attachmentRepository;



    public String upload(String fileName, String userName, byte[] fileBytes, String fileType) {
        // Upload file to S3
        String s3Response = s3Service.uploadFile(fileBytes, fileName);

        // Fetch user profile
        UserProfile userProfile = userProfileRepository.findByEmail(userName)
                .orElseThrow(() -> new RuntimeException("User not found"));

        Integer userId = userProfile.getId();

        // Save attachment details to the database
        AttachmentDao attachmentDao = new AttachmentDao();
        attachmentDao.setName(fileName);
        attachmentDao.setType(fileType);
        attachmentDao.setPath(s3Response);
        attachmentDao.setUserId(userId);

        attachmentRepository.save(attachmentDao);

        return "File uploaded successfully. S3 Response: " + s3Response;
    }

    public UploadUrlResponseDto generateUploadUrl(String fileName, String userName, String fileType) {
        // Fetch user profile
        UserProfile userProfile = userProfileRepository.findByEmail(userName)
                .orElseThrow(() -> new RuntimeException("User not found"));

        Integer userId = userProfile.getId();

        // Generate PUT presigned URL with the correct content type to avoid 403 Forbidden
        String presignedUrl = s3Service.generatePresignedUploadUrl(fileName, fileType);

        // Define S3 path logic matching how S3ServiceImpl sets bucket/path
        // For simplicity, we just store the fileName or the URL path in the DB
        // You might have a specific bucket name to prepend if you wanted, but fileName is enough.
        // If s3Service.uploadFile creates "s3://" + bucketName + "/" + fileName, let's just save fileName
        // or a similar path.
        String path = "s3://" + fileName;

        // Save attachment details to the database (pending upload)
        AttachmentDao attachmentDao = new AttachmentDao();
        attachmentDao.setName(fileName);
        attachmentDao.setType(fileType);
        attachmentDao.setPath(path);
        attachmentDao.setUserId(userId);

        attachmentRepository.save(attachmentDao);

        UploadUrlResponseDto response = new UploadUrlResponseDto();
        response.setPresignedUrl(presignedUrl);
        response.setFileName(fileName);
        response.setFileType(fileType);
        response.setS3Key(fileName);

        return response;
    }

    /**
     * Delete one photo belonging to the caller.
     *
     * Scoped by loading the caller's own attachments and looking for the id
     * among them, rather than fetching by id and then checking. Same shape as
     * setPrimary: someone else's attachment id is simply not found, so there is
     * no path where a wrong owner is detected too late.
     *
     * Deleting the primary promotes the next photo, because a profile with
     * photos but no primary renders with an empty header - the listing and the
     * card both read the primary, not "the first one".
     */
    @Override
    public Integer delete(Integer attachmentId, String userName) {
        UserProfile userProfile = userProfileRepository.findByEmail(userName)
                .orElseThrow(() -> new RuntimeException("User not found"));

        java.util.List<AttachmentDao> attachments =
                attachmentRepository.findByUserId(userProfile.getId());

        AttachmentDao target = attachments.stream()
                .filter(a -> a.getId().equals(attachmentId))
                .findFirst()
                .orElseThrow(() -> new ClientException(HttpStatus.NOT_FOUND, "Photo not found"));

        boolean wasPrimary = Boolean.TRUE.equals(target.getIsPrimary());
        attachmentRepository.delete(target);

        // The S3 object is deliberately left in place. A presigned URL for it
        // may still be in flight on someone's screen, and orphaned objects are
        // a tidy-up job rather than a correctness one - whereas deleting the
        // bytes while a request is mid-download is a broken image. Worth a
        // lifecycle rule on the bucket instead.
        if (!wasPrimary) {
            return null;
        }

        return attachments.stream()
                .filter(a -> !a.getId().equals(attachmentId))
                .findFirst()
                .map(next -> {
                    next.setIsPrimary(true);
                    attachmentRepository.save(next);
                    return next.getId();
                })
                .orElse(null);
    }

    public String setPrimary(Integer attachmentId, String userName) {
        UserProfile userProfile = userProfileRepository.findByEmail(userName)
                .orElseThrow(() -> new RuntimeException("User not found"));

        Integer userId = userProfile.getId();

        java.util.List<AttachmentDao> attachments = attachmentRepository.findByUserId(userId);
        boolean found = false;

        for (AttachmentDao att : attachments) {
            if (att.getId().equals(attachmentId)) {
                att.setIsPrimary(true);
                found = true;
            } else {
                att.setIsPrimary(false);
            }
        }

        if (!found) {
            throw new ClientException(HttpStatus.NOT_FOUND, "Photo not found");
        }

        attachmentRepository.saveAll(attachments);
        return "Primary photo updated successfully";
    }
}

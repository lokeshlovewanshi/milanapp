package com.match.partner.common.service;

import software.amazon.awssdk.auth.credentials.AwsBasicCredentials;
import software.amazon.awssdk.auth.credentials.AwsCredentialsProvider;
import software.amazon.awssdk.auth.credentials.DefaultCredentialsProvider;
import software.amazon.awssdk.auth.credentials.StaticCredentialsProvider;
import software.amazon.awssdk.core.sync.RequestBody;
import software.amazon.awssdk.regions.Region;
import software.amazon.awssdk.services.s3.model.*;
import software.amazon.awssdk.services.s3.S3Client;
import software.amazon.awssdk.services.s3.presigner.S3Presigner;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import software.amazon.awssdk.services.s3.presigner.model.PresignedGetObjectRequest;
import software.amazon.awssdk.services.s3.presigner.model.PresignedPutObjectRequest;

import java.net.URL;
import java.time.Duration;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

@Service
public class S3ServiceImpl implements S3ServiceInterface {

    /** "thumbs/" - must match THUMB_PREFIX in lambdas/image_compression. */
    private static final String THUMB_PREFIX = "thumbs/";

    @Value("${aws.s3.bucket.name}")
    private String bucketName;

    private final S3Client s3Client;
    private final S3Presigner s3Presigner;

    /**
     * Signs download URLs against CloudFront when it is configured. Uploads
     * are unaffected - those still go straight to S3, since the CDN is a read
     * path only.
     */
    private final CloudFrontUrlSigner cloudFront;

    /**
     * Which keys have a thumbnail, so a photo everyone's feed already
     * rendered once does not cost a HeadObject on every later request.
     * Never invalidated: a thumbnail, once written, does not stop existing,
     * and a false cached briefly after upload just means the original shows
     * for a few extra requests until the Lambda catches up - harmless.
     */
    private final Map<String, Boolean> thumbnailExists = new ConcurrentHashMap<>();

    public S3ServiceImpl(@Value("${aws.access.key.id:}") String accessKey,
                         @Value("${aws.secret.access.key:}") String secretKey,
                         @Value("${aws.region}") String region,
                         CloudFrontUrlSigner cloudFront) {

        this.cloudFront = cloudFront;

        AwsCredentialsProvider credentials = resolveCredentials(accessKey, secretKey);

        this.s3Client = S3Client.builder()
                .region(Region.of(region))
                .credentialsProvider(credentials)
                .build();

        this.s3Presigner = S3Presigner.builder()
                .region(Region.of(region))
                .credentialsProvider(credentials)
                .build();
    }

    /**
     * Keys if they are configured, the EC2 instance role otherwise.
     *
     * On the server no keys are set, so DefaultCredentialsProvider reaches the
     * instance metadata service and picks up short-lived credentials from the
     * attached role. Those rotate automatically and cannot leak into a git
     * history or a log line, which a static key eventually does.
     *
     * Explicit keys remain supported for local development, where there is no
     * instance role to borrow.
     */
    private static AwsCredentialsProvider resolveCredentials(String accessKey, String secretKey) {
        boolean haveKeys = accessKey != null && !accessKey.isBlank()
                && secretKey != null && !secretKey.isBlank();

        if (haveKeys) {
            return StaticCredentialsProvider.create(
                    AwsBasicCredentials.create(accessKey, secretKey));
        }

        return DefaultCredentialsProvider.create();
    }

    // Upload file to S3
    public String uploadFile(byte[] fileData, String fileName) {
        PutObjectRequest putObjectRequest = PutObjectRequest.builder()
                .bucket(bucketName)
                .key(fileName)
                .build();

        s3Client.putObject(putObjectRequest, RequestBody.fromBytes(fileData));

        return "s3://" + bucketName + "/" + fileName;
    }

    /**
     * A time-limited URL the client can fetch this object from.
     *
     * Served through CloudFront when signing is configured, and straight from
     * S3 otherwise. Both are signed and both expire; the difference is which
     * host serves the bytes and who pays for the egress.
     *
     * The fallback is not just for local development - if the CloudFront key
     * is ever missing or malformed in production, photos keep working from S3
     * instead of every profile rendering a broken image.
     */
    public String generatePresignedUrl(String fileName) {
        String signed = cloudFront.sign(fileName);
        if (signed != null) {
            return signed;
        }

        // Create a GetObjectRequest
        GetObjectRequest getObjectRequest = GetObjectRequest.builder()
                .bucket(bucketName)
                .key(fileName)
                .build();

        // Presign the request using S3Presigner
        PresignedGetObjectRequest presignedRequest = s3Presigner.presignGetObject(p -> p
                .getObjectRequest(getObjectRequest)
                .signatureDuration(Duration.ofHours(1)) // 1 hour validity
        );

        // Generate the URL
        URL presignedUrl = presignedRequest.url();
        return presignedUrl.toString();
    }

    public String generatePresignedThumbnailUrl(String fileName) {
        String thumbKey = THUMB_PREFIX + fileName;
        boolean hasThumb = thumbnailExists.computeIfAbsent(thumbKey, this::objectExists);
        return generatePresignedUrl(hasThumb ? thumbKey : fileName);
    }

    private boolean objectExists(String key) {
        try {
            s3Client.headObject(HeadObjectRequest.builder().bucket(bucketName).key(key).build());
            return true;
        } catch (NoSuchKeyException e) {
            return false;
        }
    }

    // Generate a signed URL for uploading the file
    public String generatePresignedUploadUrl(String fileName, String contentType) {
        PutObjectRequest putObjectRequest = PutObjectRequest.builder()
                .bucket(bucketName)
                .key(fileName)
                .contentType(contentType)
                .build();

        PresignedPutObjectRequest presignedRequest = s3Presigner.presignPutObject(p -> p
                .putObjectRequest(putObjectRequest)
                .signatureDuration(Duration.ofMinutes(15)) // 15 minutes validity
        );

        return presignedRequest.url().toString();
    }
}

package com.match.partner.common.service;

import jakarta.annotation.PostConstruct;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

import java.nio.charset.StandardCharsets;
import java.security.KeyFactory;
import java.security.PrivateKey;
import java.security.Signature;
import java.security.spec.PKCS8EncodedKeySpec;
import java.time.Instant;
import java.util.Base64;

/**
 * Signs CloudFront URLs for member photos.
 *
 * Photos are served through CloudFront rather than straight from S3 for one
 * blunt reason: egress. S3 charges per gigabyte out of Mumbai, while
 * CloudFront's first terabyte each month is free permanently, and photos are
 * the only thing this app ships in bulk. The edge cache is a bonus.
 *
 * The bucket stays private, so the CDN needs its own proof of authorisation.
 * That is what this class mints: a URL carrying an expiry, an RSA signature
 * over that expiry, and the id of the key CloudFront should verify it with.
 *
 * <p><b>Why not simply put CloudFront in front of the S3 presigned URLs the
 * app already produced?</b> Every presigned URL carries a distinct signature,
 * so each request would be a distinct cache key and essentially nothing would
 * ever be served from cache. Telling CloudFront to ignore query strings
 * "solves" that by caching the object under its path alone - after which any
 * request for that path is served the photo, signature or not. CloudFront's
 * own signing avoids both traps: it strips its signature parameters before
 * building the cache key and before calling the origin, so a single cached
 * object serves every authorised viewer.
 *
 * <p>Disabled unless both the domain and the key are configured, in which case
 * {@link S3ServiceImpl} falls back to S3 presigning. That keeps a local
 * checkout working with no CloudFront at all, and makes turning this off a
 * config change rather than a deploy.
 */
@Component
public class CloudFrontUrlSigner {

    private static final Logger log = LoggerFactory.getLogger(CloudFrontUrlSigner.class);

    /**
     * CloudFront's URL-safe base64 alphabet, which is NOT RFC 4648's. Getting
     * this wrong yields "MalformedSignature: Could not unencode Signature",
     * which reads like a corrupt key rather than a character mapping.
     */
    private static final char[] UNSAFE = {'+', '=', '/'};
    private static final char[] SAFE = {'-', '_', '~'};

    @Value("${cloudfront.domain:}")
    private String domain;

    @Value("${cloudfront.key-pair-id:}")
    private String keyPairId;

    /**
     * PKCS#8 PEM of the RSA private key whose public half sits in the
     * distribution's trusted key group. Never in Terraform state or the jar.
     *
     * <p>Two ways in, and the path is the one to prefer on a server. A PEM
     * carried inline has to survive systemd's EnvironmentFile parsing, which
     * does not preserve the escaped newlines a multi-line key needs - the
     * result decodes to garbage and fails with a DER length error that says
     * nothing about escaping. A file has no such problem, and the same pattern
     * already serves the Firebase credentials.
     */
    @Value("${cloudfront.private-key-path:}")
    private String privateKeyPath;

    /** Inline PEM. Convenient for local development and CI. */
    @Value("${cloudfront.private-key:}")
    private String privateKeyPem;

    @Value("${cloudfront.url-ttl-seconds:3600}")
    private long ttlSeconds;

    private PrivateKey privateKey;

    @PostConstruct
    void init() {
        String pem = readKeyMaterial();

        if (domain.isBlank() || keyPairId.isBlank() || pem.isBlank()) {
            log.info("CloudFront signing disabled - photos will be served via S3 presigned URLs");
            return;
        }

        try {
            // Strips the armour and every kind of whitespace, so the same code
            // handles a real multi-line PEM and one flattened by an env file.
            String body = pem
                    .replace("\\n", "\n")
                    .replaceAll("-----BEGIN (RSA )?PRIVATE KEY-----", "")
                    .replaceAll("-----END (RSA )?PRIVATE KEY-----", "")
                    .replaceAll("\\s", "");

            byte[] der = Base64.getDecoder().decode(body);
            this.privateKey = KeyFactory.getInstance("RSA")
                    .generatePrivate(new PKCS8EncodedKeySpec(der));

            log.info("CloudFront signing enabled for {} (key {})", domain, keyPairId);
        } catch (Exception e) {
            // Deliberately not fatal. A malformed key should degrade photo
            // delivery to S3 presigning, not stop the API from starting -
            // every other endpoint is unaffected by it.
            log.error("CloudFront private key could not be read - falling back to S3 presigning", e);
            this.privateKey = null;
        }
    }

    /**
     * The key from disk when a path is set, falling back to the inline value.
     *
     * An unreadable path returns blank rather than throwing, so a missing file
     * disables signing the same way an unset one does - photos keep being
     * served, just from S3.
     */
    private String readKeyMaterial() {
        if (!privateKeyPath.isBlank()) {
            try {
                return java.nio.file.Files.readString(java.nio.file.Path.of(privateKeyPath));
            } catch (Exception e) {
                log.error("CloudFront private key file {} could not be read", privateKeyPath, e);
                return "";
            }
        }
        return privateKeyPem;
    }

    /** True when signing is configured and the key loaded. */
    public boolean isEnabled() {
        return privateKey != null;
    }

    /**
     * A signed URL for one object key, valid for the configured TTL.
     *
     * @return the signed URL, or null when signing is not available - callers
     *         fall back to S3 presigning rather than serving a broken link
     */
    public String sign(String objectKey) {
        if (!isEnabled()) {
            return null;
        }

        String url = "https://" + domain + "/" + objectKey;
        long expires = Instant.now().getEpochSecond() + ttlSeconds;

        // The canned policy. CloudFront rebuilds this exact string from the
        // Expires and Resource it receives, so the field order and the absence
        // of whitespace are part of the contract, not formatting.
        String policy = "{\"Statement\":[{\"Resource\":\"" + url
                + "\",\"Condition\":{\"DateLessThan\":{\"AWS:EpochTime\":" + expires + "}}}]}";

        try {
            // SHA1withRSA is not a choice - it is what CloudFront verifies.
            Signature rsa = Signature.getInstance("SHA1withRSA");
            rsa.initSign(privateKey);
            rsa.update(policy.getBytes(StandardCharsets.UTF_8));

            String signature = toCloudFrontBase64(Base64.getEncoder().encodeToString(rsa.sign()));

            return url + "?Expires=" + expires
                    + "&Signature=" + signature
                    + "&Key-Pair-Id=" + keyPairId;
        } catch (Exception e) {
            log.error("Failed to sign CloudFront URL for {}", objectKey, e);
            return null;
        }
    }

    private static String toCloudFrontBase64(String standard) {
        StringBuilder out = new StringBuilder(standard.length());
        outer:
        for (char c : standard.toCharArray()) {
            for (int i = 0; i < UNSAFE.length; i++) {
                if (c == UNSAFE[i]) {
                    out.append(SAFE[i]);
                    continue outer;
                }
            }
            out.append(c);
        }
        return out.toString();
    }
}

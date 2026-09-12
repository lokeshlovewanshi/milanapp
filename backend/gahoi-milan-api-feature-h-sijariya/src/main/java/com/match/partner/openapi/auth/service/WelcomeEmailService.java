package com.match.partner.openapi.auth.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import software.amazon.awssdk.auth.credentials.AwsBasicCredentials;
import software.amazon.awssdk.auth.credentials.DefaultCredentialsProvider;
import software.amazon.awssdk.auth.credentials.StaticCredentialsProvider;
import software.amazon.awssdk.core.SdkBytes;
import software.amazon.awssdk.regions.Region;
import software.amazon.awssdk.services.lambda.LambdaClient;
import software.amazon.awssdk.services.lambda.model.InvocationType;
import software.amazon.awssdk.services.lambda.model.InvokeRequest;

import java.util.HashMap;
import java.util.Map;
import java.util.concurrent.CompletableFuture;

/**
 * Dispatches welcome emails asynchronously via the welcome_email Lambda function.
 *
 * Calls AWS Lambda with InvocationType.EVENT (fire-and-forget), and offloads the call
 * to CompletableFuture to guarantee that the server never blocks or waits
 * for the response during member registration.
 */
@Service
@Slf4j
public class WelcomeEmailService {

    private final ObjectMapper objectMapper = new ObjectMapper();

    @Value("${welcome-email.function-name:lovewanshi-milan-welcome-email}")
    private String functionName;

    @Value("${welcome-email.enabled:true}")
    private boolean enabled;

    @Value("${aws.region:ap-south-1}")
    private String region;

    @Value("${aws.access.key.id:}")
    private String accessKey;

    @Value("${aws.secret.access.key:}")
    private String secretKey;

    private volatile LambdaClient lambda;

    private LambdaClient client() {
        if (lambda == null) {
            synchronized (this) {
                if (lambda == null) {
                    var builder = LambdaClient.builder()
                            .region(Region.of(region));
                    if (accessKey != null && !accessKey.isBlank()
                            && secretKey != null && !secretKey.isBlank()) {
                        builder.credentialsProvider(StaticCredentialsProvider.create(
                                AwsBasicCredentials.create(accessKey, secretKey)));
                    } else {
                        builder.credentialsProvider(DefaultCredentialsProvider.create());
                    }
                    lambda = builder.build();
                }
            }
        }
        return lambda;
    }

    /**
     * Dispatches welcome email trigger in the background without blocking the caller.
     *
     * @param email     user email address
     * @param name      user display name
     * @param profileId numeric or string profile id
     */
    public void triggerWelcomeEmailAsync(String email, String name, Object profileId) {
        if (!enabled) {
            log.info("Welcome email Lambda trigger is disabled; skipping for {}", mask(email));
            return;
        }

        if (email == null || email.isBlank()) {
            log.warn("Cannot trigger welcome email: missing email address");
            return;
        }

        // Fire and forget via CompletableFuture to never block registration thread
        CompletableFuture.runAsync(() -> {
            try {
                Map<String, Object> payloadMap = new HashMap<>();
                payloadMap.put("email", email.trim());
                payloadMap.put("name", name != null && !name.isBlank() ? name.trim() : "Member");
                payloadMap.put("profileId", profileId != null ? String.valueOf(profileId) : "");

                String payloadJson = objectMapper.writeValueAsString(payloadMap);

                InvokeRequest request = InvokeRequest.builder()
                        .functionName(functionName)
                        .invocationType(InvocationType.EVENT) // Asynchronous: Lambda returns HTTP 202 immediately
                        .payload(SdkBytes.fromUtf8String(payloadJson))
                        .build();

                client().invoke(request);
                log.info("Successfully dispatched async welcome email event to Lambda {} for {}", functionName, mask(email));
            } catch (Exception e) {
                // Non-fatal: registration must never fail if email notification fails
                log.error("Failed to dispatch welcome email event to Lambda for {}: {}", mask(email), e.getMessage());
            }
        });
    }

    public boolean isLambdaConfigured() {
        return enabled;
    }

    /**
     * Synchronously dispatches a custom email (outreach, notifications) via the Lambda function.
     * Returns true if Lambda successfully delivered the email.
     */
    public boolean sendCustomEmailSync(String email, String subject, String htmlContent, String textContent, String name, Object profileId) {
        if (!enabled || email == null || email.isBlank()) {
            return false;
        }

        try {
            Map<String, Object> payloadMap = new HashMap<>();
            payloadMap.put("email", email.trim());
            payloadMap.put("subject", subject);
            payloadMap.put("html", htmlContent);
            if (textContent != null && !textContent.isBlank()) {
                payloadMap.put("text", textContent);
            }
            payloadMap.put("name", name != null && !name.isBlank() ? name.trim() : "Member");
            payloadMap.put("profileId", profileId != null ? String.valueOf(profileId) : "");

            String payloadJson = objectMapper.writeValueAsString(payloadMap);

            InvokeRequest request = InvokeRequest.builder()
                    .functionName(functionName)
                    .invocationType(InvocationType.REQUEST_RESPONSE)
                    .payload(SdkBytes.fromUtf8String(payloadJson))
                    .build();

            var response = client().invoke(request);
            String responsePayload = response.payload().asUtf8String();
            log.info("Lambda custom email dispatch result for {}: HTTP status={}, payload={}",
                    mask(email), response.statusCode(), responsePayload);

            if (response.statusCode() == 200) {
                var jsonNode = objectMapper.readTree(responsePayload);
                if (jsonNode.has("body")) {
                    String bodyStr = jsonNode.get("body").asText();
                    var bodyNode = objectMapper.readTree(bodyStr);
                    if (bodyNode.has("status") && "success".equalsIgnoreCase(bodyNode.get("status").asText())) {
                        return true;
                    }
                }
                if (jsonNode.has("status") && "success".equalsIgnoreCase(jsonNode.get("status").asText())) {
                    return true;
                }
            }
            log.warn("Lambda custom email returned non-success response: {}", responsePayload);
            return false;
        } catch (Exception e) {
            log.error("Failed to synchronously invoke email Lambda for {}: {}", mask(email), e.getMessage());
            return false;
        }
    }

    private static String mask(String email) {
        if (email == null || !email.contains("@")) {
            return "***";
        }
        int at = email.indexOf('@');
        return email.substring(0, Math.min(2, at)) + "***" + email.substring(at);
    }
}

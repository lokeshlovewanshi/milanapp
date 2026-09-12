package com.match.partner.openapi.auth.service;

import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.beans.factory.ObjectProvider;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.mail.javamail.MimeMessageHelper;
import org.springframework.stereotype.Service;

import jakarta.mail.internet.MimeMessage;
import java.io.UnsupportedEncodingException;

/**
 * Sends the OTP mails.
 *
 * Deliberately thin. Everything about whether a code is valid lives in
 * {@link OtpService}; this only knows how to put text in front of someone.
 *
 * Configuration is plain SMTP so the same code runs against Gmail and Amazon
 * SES - the two differ in host, port and credentials, and in nothing this class
 * can see.
 */
@Service
@Slf4j
public class EmailService {

    /**
     * Optional on purpose.
     *
     * Spring only creates a JavaMailSender when spring.mail.host is set, so a
     * deployment with no mail configuration has no such bean. Requiring it made
     * that a startup failure: an unconfigured optional feature took the entire
     * API down, which is the opposite of what isEnabled() was written to
     * express. ObjectProvider lets the bean be absent and turns the feature off
     * instead.
     */
    @Autowired
    private ObjectProvider<JavaMailSender> mailSenderProvider;

    @Autowired
    private WelcomeEmailService welcomeEmailService;

    @Value("${spring.mail.username:}")
    private String smtpUser;

    @Value("${app.mail.from:}")
    private String from;

    @Value("${app.mail.from-name:Gahoi Parinay}")
    private String fromName;

    public record EmailSendResult(boolean success, String message) {}

    public boolean isDirectSmtpConfigured() {
        return smtpUser != null && !smtpUser.isBlank() && mailSenderProvider.getIfAvailable() != null;
    }

    /**
     * Whether mail is configured at all (either via direct SMTP or Lambda).
     */
    public boolean isEnabled() {
        return isDirectSmtpConfigured() || (welcomeEmailService != null && welcomeEmailService.isLambdaConfigured());
    }

    /**
     * @return true if the message was handed to the SMTP server.
     */
    public boolean sendOtp(String to, String code, String heading, String purposeLine, int validMinutes) {
        if (!isEnabled()) {
            log.warn("Mail is not configured; refusing to send OTP to {}", mask(to));
            return false;
        }

        JavaMailSender sender = mailSenderProvider.getIfAvailable();
        if (sender == null) {
            log.warn("No JavaMailSender configured; refusing to send OTP to {}", mask(to));
            return false;
        }

        try {
            MimeMessage message = sender.createMimeMessage();
            MimeMessageHelper helper = new MimeMessageHelper(message, "UTF-8");
            helper.setTo(to);
            helper.setSubject(code + " is your Gahoi Milan code");
            helper.setFrom(from, fromName);
            helper.setText(html(code, heading, purposeLine, validMinutes), true);

            sender.send(message);
            // The code is never logged. A support log that contains live OTPs is
            // a second copy of the secret in a place nobody is guarding.
            log.info("OTP sent to {}", mask(to));
            return true;
        } catch (UnsupportedEncodingException e) {
            log.error("Bad from-name encoding", e);
            return false;
        } catch (Exception e) {
            // Wide on purpose: SMTP throws a family of exceptions and the caller
            // only has one thing to say to the member either way.
            //
            // The root cause is logged as well as the top message, because the
            // top of that chain is usually "Authentication failed" while the
            // server's actual reply - "535-5.7.8 Username and Password not
            // accepted", "534 Application-specific password required" - is
            // several causes down. Without it there is no way to tell a wrong
            // password from an account that has not enabled 2FA, and the two
            // need different fixes.
            Throwable root = e;
            while (root.getCause() != null && root.getCause() != root) {
                root = root.getCause();
            }
            log.error("Failed to send OTP to {}: {} | cause: {}: {}",
                    mask(to), e.getMessage(), root.getClass().getSimpleName(), root.getMessage());
            return false;
        }
    }

    /**
     * Sends a rich welcome & profile verification email to newly approved members.
     *
     * @return true if the email was successfully dispatched to the SMTP server.
     */
    public boolean sendWelcomeVerifiedEmail(String to, String fullName, String gmId) {
        if (to == null || to.isBlank()) {
            return false;
        }

        if (!isEnabled()) {
            log.warn("Mail is not configured; skipping welcome verified email to {}", mask(to));
            return false;
        }

        JavaMailSender sender = mailSenderProvider.getIfAvailable();
        if (sender == null) {
            log.warn("No JavaMailSender configured; skipping welcome email to {}", mask(to));
            return false;
        }

        try {
            MimeMessage message = sender.createMimeMessage();
            MimeMessageHelper helper = new MimeMessageHelper(message, "UTF-8");
            helper.setTo(to);
            helper.setSubject("✨ Congratulations! Your Gahoi Parinay profile is verified (" + gmId + ")");
            helper.setFrom(from, "Gahoi Parinay");
            helper.setText(welcomeVerifiedHtml(fullName != null && !fullName.isBlank() ? fullName : "Member", gmId), true);

            sender.send(message);
            log.info("Welcome verified email sent to {}", mask(to));
            return true;
        } catch (UnsupportedEncodingException e) {
            log.error("Bad from-name encoding", e);
            return false;
        } catch (Exception e) {
            Throwable root = e;
            while (root.getCause() != null && root.getCause() != root) {
                root = root.getCause();
            }
            log.error("Failed to send welcome email to {}: {} | cause: {}: {}",
                    mask(to), e.getMessage(), root.getClass().getSimpleName(), root.getMessage());
            return false;
        }
    }

    /**
     * Responsive, inline-styled matrimonial welcome email template.
     */
    private String welcomeVerifiedHtml(String fullName, String gmId) {
        return """
                <!DOCTYPE html>
                <html lang="en">
                <head>
                  <meta charset="UTF-8">
                  <meta name="viewport" content="width=device-width, initial-scale=1.0">
                  <title>Welcome to Gahoi Parinay</title>
                </head>
                <body style="margin:0;padding:0;background-color:#FAF5F6;font-family:'Segoe UI',Helvetica,Arial,sans-serif;-webkit-font-smoothing:antialiased;">
                  <table width="100%" border="0" cellspacing="0" cellpadding="0" style="background-color:#FAF5F6;padding:24px 12px;">
                    <tr>
                      <td align="center">
                        <table width="100%" border="0" cellspacing="0" cellpadding="0" style="max-width:580px;background:#FFFFFF;border-radius:16px;overflow:hidden;box-shadow:0 6px 24px rgba(123,18,32,0.08);border:1px solid #F0DDE2;">
                          
                          <!-- Header Royal Banner -->
                          <tr>
                            <td align="center" style="background:linear-gradient(135deg, #7B1220 0%%, #A5122F 100%%);padding:36px 24px 28px;text-align:center;border-bottom:4px solid #D4AF37;">
                              <div style="font-size:28px;margin-bottom:8px;">💍✨💍</div>
                              <h1 style="color:#FFFFFF;margin:0;font-size:26px;font-weight:700;letter-spacing:0.5px;font-family:Georgia,serif;">
                                Gahoi Parinay
                              </h1>
                              <p style="color:#FCE8EE;margin:4px 0 16px;font-size:13px;letter-spacing:1px;text-transform:uppercase;">
                                Gahoi Samaj Trusted Matrimony
                              </p>
                              
                              <!-- Verified Shield Badge -->
                              <table border="0" cellspacing="0" cellpadding="0" style="background:rgba(255,255,255,0.15);border:1px solid rgba(255,255,255,0.3);border-radius:999px;margin:0 auto;">
                                <tr>
                                  <td style="padding:6px 16px;color:#FFFFFF;font-size:13px;font-weight:700;">
                                    🛡️ Profile Verified &amp; Approved
                                  </td>
                                </tr>
                              </table>
                            </td>
                          </tr>

                          <!-- Main Body Content -->
                          <tr>
                            <td style="padding:32px 28px 20px;">
                              <h2 style="color:#7B1220;font-size:20px;margin:0 0 12px;font-weight:700;">
                                Namaste, %s! 🙏
                              </h2>
                              <p style="color:#333333;font-size:15px;line-height:1.6;margin:0 0 16px;">
                                We are pleased to inform you that your profile has been <strong>successfully verified</strong> by the Gahoi Parinay community moderation team.
                              </p>
                              
                              <!-- ID Card Box -->
                              <table width="100%%" border="0" cellspacing="0" cellpadding="0" style="background:#FFF8FA;border-left:4px solid #A5122F;border-radius:6px;padding:12px 16px;margin:0 0 24px;">
                                <tr>
                                  <td>
                                    <span style="color:#6B5C5E;font-size:12px;text-transform:uppercase;font-weight:600;display:block;">Your Gahoi Parinay ID</span>
                                    <span style="color:#7B1220;font-size:18px;font-weight:800;letter-spacing:1px;">%s</span>
                                  </td>
                                </tr>
                              </table>

                              <h3 style="color:#1F2933;font-size:15px;margin:0 0 14px;font-weight:700;">
                                What you can do now:
                              </h3>

                              <!-- Feature 1 -->
                              <table width="100%%" border="0" cellspacing="0" cellpadding="0" style="margin-bottom:12px;">
                                <tr>
                                  <td width="36" valign="top" style="font-size:20px;">👥</td>
                                  <td style="padding-left:8px;font-size:14px;color:#4A5568;line-height:1.5;">
                                    <strong style="color:#1A202C;">Browse Verified Profiles:</strong> Connect directly with verified Gahoi Samaj brides &amp; grooms across India.
                                  </td>
                                </tr>
                              </table>

                              <!-- Feature 2 -->
                              <table width="100%%" border="0" cellspacing="0" cellpadding="0" style="margin-bottom:12px;">
                                <tr>
                                  <td width="36" valign="top" style="font-size:20px;">⭐</td>
                                  <td style="padding-left:8px;font-size:14px;color:#4A5568;line-height:1.5;">
                                    <strong style="color:#1A202C;">36 Guna Kundali Milan:</strong> View detailed Vedic horoscope matching and Ashtakoota compatibility scores.
                                  </td>
                                </tr>
                              </table>

                              <!-- Feature 3 -->
                              <table width="100%%" border="0" cellspacing="0" cellpadding="0" style="margin-bottom:24px;">
                                <tr>
                                  <td width="36" valign="top" style="font-size:20px;">🔒</td>
                                  <td style="padding-left:8px;font-size:14px;color:#4A5568;line-height:1.5;">
                                    <strong style="color:#1A202C;">100%% Privacy Protection:</strong> Your phone number and WhatsApp are only revealed to mutually accepted connections.
                                  </td>
                                </tr>
                              </table>

                              <!-- Call to Action Button -->
                              <table width="100%%" border="0" cellspacing="0" cellpadding="0" style="margin:28px 0;">
                                <tr>
                                  <td align="center">
                                    <a href="https://www.gahoimarriage.in/browse" style="display:inline-block;background:linear-gradient(135deg, #7B1220 0%%, #A5122F 100%%);color:#FFFFFF;text-decoration:none;font-size:16px;font-weight:700;padding:14px 32px;border-radius:999px;box-shadow:0 4px 14px rgba(123,18,32,0.35);letter-spacing:0.5px;">
                                      Explore Verified Matches / रिश्ते देखें →
                                    </a>
                                  </td>
                                </tr>
                              </table>
                            </td>
                          </tr>

                          <!-- Footer -->
                          <tr>
                            <td style="background-color:#FDF8F9;padding:20px 24px;border-top:1px solid #F0DDE2;text-align:center;">
                              <p style="color:#718096;font-size:12px;margin:0 0 6px;">
                                Need assistance? Write to our support team at <a href="mailto:jeevanmilansathi@gmail.com" style="color:#A5122F;font-weight:600;">jeevanmilansathi@gmail.com</a>
                              </p>
                              <p style="color:#A0AEC0;font-size:11px;margin:0;">
                                © Gahoi Parinay · Official Community Matrimony Portal · <a href="https://www.gahoimarriage.in" style="color:#A5122F;text-decoration:none;">www.gahoimarriage.in</a>
                              </p>
                            </td>
                          </tr>

                        </table>
                      </td>
                    </tr>
                  </table>
                </body>
                </html>
                """.formatted(fullName, gmId);
    }

    /**
     * Inline styles and a table-free layout, because mail clients are not
     * browsers - Outlook in particular drops stylesheets entirely.
     */
    private String html(String code, String heading, String purposeLine, int validMinutes) {
        return """
                <div style="font-family:Helvetica,Arial,sans-serif;max-width:480px;margin:0 auto;padding:24px;color:#1A1A1A">
                  <h1 style="font-size:22px;color:#7B1220;margin:0 0 4px">Gahoi Parinay</h1>
                  <p style="font-size:15px;color:#6B7280;margin:0 0 24px">%s</p>
                  <p style="font-size:15px;margin:0 0 8px">%s</p>
                  <div style="font-size:34px;font-weight:bold;letter-spacing:8px;color:#7B1220;
                              background:#FCF2EE;border-radius:10px;padding:16px;text-align:center;margin:16px 0">
                    %s
                  </div>
                  <p style="font-size:14px;color:#6B7280;margin:0 0 4px">
                    This code expires in %d minutes and can be used once.
                  </p>
                  <p style="font-size:14px;color:#6B7280;margin:0">
                    If you did not request it, you can ignore this email - nothing has changed on your account.
                  </p>
                </div>
                """.formatted(heading, purposeLine, code, validMinutes);
    }

    /**
     * Sends a welcome membership activation email to newly registered users when their plan is activated.
     *
     * @return true if the email was successfully dispatched to the SMTP server.
     */
    public boolean sendPlanActivationEmail(String to, String fullName, String planName, Integer durationMonths, java.time.LocalDateTime expiresAt, boolean isFreeOffer) {
        if (to == null || to.isBlank()) {
            return false;
        }

        if (!isEnabled()) {
            log.warn("Mail is not configured; skipping plan activation email to {}", mask(to));
            return false;
        }

        JavaMailSender sender = mailSenderProvider.getIfAvailable();
        if (sender == null) {
            log.warn("No JavaMailSender configured; skipping plan activation email to {}", mask(to));
            return false;
        }

        try {
            String durationText = durationMonths != null ? durationMonths + " Months" : "Lifetime";
            String validityDate = expiresAt != null ? expiresAt.format(java.time.format.DateTimeFormatter.ofPattern("dd MMM yyyy")) : "Lifetime Access";
            String displayName = fullName != null && !fullName.isBlank() ? fullName : "Member";

            MimeMessage message = sender.createMimeMessage();
            MimeMessageHelper helper = new MimeMessageHelper(message, "UTF-8");
            helper.setTo(to);
            helper.setSubject("🎉 Welcome to Gahoi Parinay! Your " + planName + " Plan (" + durationText + ") is Active");
            helper.setFrom(from, "Gahoi Parinay");
            helper.setText(planActivationHtml(displayName, planName, durationText, validityDate, isFreeOffer), true);

            sender.send(message);
            log.info("Plan activation email sent to {} for plan {}", mask(to), planName);
            return true;
        } catch (UnsupportedEncodingException e) {
            log.error("Bad from-name encoding", e);
            return false;
        } catch (Exception e) {
            Throwable root = e;
            while (root.getCause() != null && root.getCause() != root) {
                root = root.getCause();
            }
            log.error("Failed to send plan activation email to {}: {} | cause: {}: {}",
                    mask(to), e.getMessage(), root.getClass().getSimpleName(), root.getMessage());
            return false;
        }
    }

    /**
     * Responsive, inline-styled membership plan activation email template.
     */
    private String planActivationHtml(String fullName, String planName, String durationText, String validityDate, boolean isFreeOffer) {
        String badgeText = isFreeOffer ? "🎁 Welcome Offer Activated (Free)" : "✨ Premium Membership Active";
        return """
                <!DOCTYPE html>
                <html lang="en">
                <head>
                  <meta charset="UTF-8">
                  <meta name="viewport" content="width=device-width, initial-scale=1.0">
                  <title>Gahoi Parinay Plan Activated</title>
                </head>
                <body style="margin:0;padding:0;background-color:#FAF5F6;font-family:'Segoe UI',Helvetica,Arial,sans-serif;-webkit-font-smoothing:antialiased;">
                  <table width="100%" border="0" cellspacing="0" cellpadding="0" style="background-color:#FAF5F6;padding:24px 12px;">
                    <tr>
                      <td align="center">
                        <table width="100%" border="0" cellspacing="0" cellpadding="0" style="max-width:580px;background:#FFFFFF;border-radius:16px;overflow:hidden;box-shadow:0 6px 24px rgba(123,18,32,0.08);border:1px solid #F0DDE2;">
                          
                          <!-- Header Royal Banner -->
                          <tr>
                            <td align="center" style="background:linear-gradient(135deg, #7B1220 0%%, #A5122F 100%%);padding:36px 24px 28px;text-align:center;border-bottom:4px solid #D4AF37;">
                              <div style="font-size:28px;margin-bottom:8px;">💍✨👑</div>
                              <h1 style="color:#FFFFFF;margin:0;font-size:26px;font-weight:700;letter-spacing:0.5px;font-family:Georgia,serif;">
                                Gahoi Parinay
                              </h1>
                              <p style="color:#FCE8EE;margin:4px 0 16px;font-size:13px;letter-spacing:1px;text-transform:uppercase;">
                                Gahoi Samaj Trusted Matrimony
                              </p>
                              
                              <!-- Plan Badge -->
                              <table border="0" cellspacing="0" cellpadding="0" style="background:rgba(255,255,255,0.18);border:1px solid rgba(255,255,255,0.35);border-radius:999px;margin:0 auto;">
                                <tr>
                                  <td style="padding:6px 18px;color:#FFFFFF;font-size:13px;font-weight:700;">
                                    %s
                                  </td>
                                </tr>
                              </table>
                            </td>
                          </tr>

                          <!-- Main Body Content -->
                          <tr>
                            <td style="padding:32px 28px 20px;">
                              <h2 style="color:#7B1220;font-size:20px;margin:0 0 12px;font-weight:700;">
                                Welcome, %s! 🙏
                              </h2>
                              <p style="color:#333333;font-size:15px;line-height:1.6;margin:0 0 16px;">
                                Thank you for joining <strong>Gahoi Parinay</strong>. Your <strong>%s Plan (%s)</strong> has been successfully activated on your account.
                              </p>
                              
                              <!-- Plan Details Card Box -->
                              <table width="100%%" border="0" cellspacing="0" cellpadding="0" style="background:#FFF8FA;border-left:4px solid #D4AF37;border-radius:8px;padding:14px 18px;margin:0 0 24px;">
                                <tr>
                                  <td style="padding-bottom:6px;">
                                    <span style="color:#6B5C5E;font-size:12px;text-transform:uppercase;font-weight:600;">Active Plan:</span>
                                    <strong style="color:#7B1220;font-size:16px;margin-left:8px;">%s Plan (%s)</strong>
                                  </td>
                                </tr>
                                <tr>
                                  <td>
                                    <span style="color:#6B5C5E;font-size:12px;text-transform:uppercase;font-weight:600;">Valid Until:</span>
                                    <strong style="color:#1A202C;font-size:15px;margin-left:8px;">%s</strong>
                                  </td>
                                </tr>
                              </table>

                              <h3 style="color:#1F2933;font-size:15px;margin:0 0 14px;font-weight:700;">
                                Your Unlocked Membership Benefits:
                              </h3>

                              <!-- Feature 1: Contact details -->
                              <table width="100%%" border="0" cellspacing="0" cellpadding="0" style="margin-bottom:12px;">
                                <tr>
                                  <td width="36" valign="top" style="font-size:20px;">📞</td>
                                  <td style="padding-left:8px;font-size:14px;color:#4A5568;line-height:1.5;">
                                    <strong style="color:#1A202C;">Direct Contact &amp; WhatsApp:</strong> View verified contact numbers and WhatsApp details on profile cards.
                                  </td>
                                </tr>
                              </table>

                              <!-- Feature 2: 36 Guna Kundali -->
                              <table width="100%%" border="0" cellspacing="0" cellpadding="0" style="margin-bottom:12px;">
                                <tr>
                                  <td width="36" valign="top" style="font-size:20px;">🕉️</td>
                                  <td style="padding-left:8px;font-size:14px;color:#4A5568;line-height:1.5;">
                                    <strong style="color:#1A202C;">36 Guna Kundali Milan:</strong> Check full Vedic Ashtakoota compatibility and Manglik analysis.
                                  </td>
                                </tr>
                              </table>

                              <!-- Feature 3: Unlimited Connections -->
                              <table width="100%%" border="0" cellspacing="0" cellpadding="0" style="margin-bottom:12px;">
                                <tr>
                                  <td width="36" valign="top" style="font-size:20px;">💌</td>
                                  <td style="padding-left:8px;font-size:14px;color:#4A5568;line-height:1.5;">
                                    <strong style="color:#1A202C;">Unlimited Connection Requests:</strong> Send and accept connection proposals directly.
                                  </td>
                                </tr>
                              </table>

                              <!-- Feature 4: Full Bio-data -->
                              <table width="100%%" border="0" cellspacing="0" cellpadding="0" style="margin-bottom:24px;">
                                <tr>
                                  <td width="36" valign="top" style="font-size:20px;">👨‍👩‍👧‍👦</td>
                                  <td style="padding-left:8px;font-size:14px;color:#4A5568;line-height:1.5;">
                                    <strong style="color:#1A202C;">Family &amp; Career Details:</strong> View Gotra, Aakna, education, profession, and family background.
                                  </td>
                                </tr>
                              </table>

                              <!-- Call to Action Button -->
                              <table width="100%%" border="0" cellspacing="0" cellpadding="0" style="margin:28px 0;">
                                <tr>
                                  <td align="center">
                                    <a href="https://www.gahoimarriage.in/browse" style="display:inline-block;background:linear-gradient(135deg, #7B1220 0%%, #A5122F 100%%);color:#FFFFFF;text-decoration:none;font-size:16px;font-weight:700;padding:14px 32px;border-radius:999px;box-shadow:0 4px 14px rgba(123,18,32,0.35);letter-spacing:0.5px;">
                                      Start Exploring Matches →
                                    </a>
                                  </td>
                                </tr>
                              </table>
                            </td>
                          </tr>

                          <!-- Footer -->
                          <tr>
                            <td style="background-color:#FDF8F9;padding:20px 24px;border-top:1px solid #F0DDE2;text-align:center;">
                              <p style="color:#718096;font-size:12px;margin:0 0 6px;">
                                Need assistance? Write to our support team at <a href="mailto:jeevanmilansathi@gmail.com" style="color:#A5122F;font-weight:600;">jeevanmilansathi@gmail.com</a>
                              </p>
                              <p style="color:#A0AEC0;font-size:11px;margin:0;">
                                © Gahoi Parinay · Official Community Matrimony Portal · <a href="https://www.gahoimarriage.in" style="color:#A5122F;text-decoration:none;">www.gahoimarriage.in</a>
                              </p>
                            </td>
                          </tr>

                        </table>
                      </td>
                    </tr>
                  </table>
                </body>
                </html>
                """.formatted(badgeText, fullName, planName, durationText, planName, durationText, validityDate);
    }

    /**
     * Sends a custom admin outreach email to a member from noreply@gahoimarriage.in.
     * Attempts direct JavaMail first, and automatically falls back to the Lambda email dispatcher.
     */
    public EmailSendResult sendCustomOutreachEmail(String to, String subject, String bodyContent, String recipientName, String profileId) {
        if (to == null || to.isBlank() || !to.contains("@")) {
            log.warn("Invalid email address for outreach: {}", to);
            return new EmailSendResult(false, "Invalid recipient email address: " + to);
        }

        String finalSubject = subject != null && !subject.isBlank()
                ? subject.trim()
                : "Important update regarding your Gahoi Parinay profile";
        String htmlBody = customOutreachHtml(recipientName, profileId, bodyContent);

        // 1. Try JavaMailSender direct SMTP
        JavaMailSender sender = mailSenderProvider.getIfAvailable();
        if (sender != null && isDirectSmtpConfigured()) {
            try {
                MimeMessage message = sender.createMimeMessage();
                MimeMessageHelper helper = new MimeMessageHelper(message, "UTF-8");
                helper.setTo(to.trim());
                helper.setSubject(finalSubject);
                String senderEmail = (from != null && !from.isBlank()) ? from.trim() : "noreply@gahoimarriage.in";
                String senderName = (fromName != null && !fromName.isBlank()) ? fromName.trim() : "Gahoi Parinay";
                helper.setFrom(senderEmail, senderName);
                helper.setText(htmlBody, true);

                sender.send(message);
                log.info("Admin outreach email successfully sent via direct JavaMail to {} from {}", mask(to), senderEmail);
                return new EmailSendResult(true, "Email sent successfully from noreply@gahoimarriage.in");
            } catch (Exception e) {
                Throwable root = e;
                while (root.getCause() != null && root.getCause() != root) {
                    root = root.getCause();
                }
                log.warn("Direct JavaMail delivery to {} failed ({}); falling back to Lambda email dispatcher...",
                        mask(to), root.getMessage());
            }
        } else {
            log.info("Direct JavaMail not available or configured; routing outreach email via Lambda dispatcher to {}", mask(to));
        }

        // 2. Fallback to Lambda Email Dispatcher
        if (welcomeEmailService != null && welcomeEmailService.isLambdaConfigured()) {
            boolean lambdaSent = welcomeEmailService.sendCustomEmailSync(
                    to.trim(), finalSubject, htmlBody, bodyContent, recipientName, profileId);
            if (lambdaSent) {
                log.info("Admin outreach email successfully sent via Lambda to {}", mask(to));
                return new EmailSendResult(true, "Email sent successfully from noreply@gahoimarriage.in");
            }
        }

        return new EmailSendResult(false, "Failed to deliver email through both direct SMTP and Lambda dispatchers. Please check credentials or server logs.");
    }

    private String customOutreachHtml(String recipientName, String profileId, String rawContent) {
        String idBadge = profileId != null && !profileId.isBlank() ? "Profile ID: " + profileId : "Official Communication";
        
        // Escape content safely, then preserve line breaks
        String escaped = rawContent != null ? rawContent
                .replace("&", "&amp;")
                .replace("<", "&lt;")
                .replace(">", "&gt;")
                .replace("\n", "<br/>") : "";

        String htmlTemplate = """
                <!DOCTYPE html>
                <html lang="en">
                <head>
                  <meta charset="UTF-8">
                  <meta name="viewport" content="width=device-width, initial-scale=1.0">
                  <title>Gahoi Parinay</title>
                </head>
                <body style="margin:0;padding:0;background-color:#FAF5F6;font-family:'Segoe UI',Helvetica,Arial,sans-serif;-webkit-font-smoothing:antialiased;">
                  <table width="100%" border="0" cellspacing="0" cellpadding="0" style="background-color:#FAF5F6;padding:24px 12px;">
                    <tr>
                      <td align="center">
                        <table width="100%" border="0" cellspacing="0" cellpadding="0" style="max-width:580px;background:#FFFFFF;border-radius:16px;overflow:hidden;box-shadow:0 6px 24px rgba(123,18,32,0.08);border:1px solid #F0DDE2;">
                          
                          <!-- Header Royal Banner -->
                          <tr>
                            <td align="center" style="background:linear-gradient(135deg, #7B1220 0%, #A5122F 100%);padding:32px 24px 26px;text-align:center;border-bottom:4px solid #D4AF37;">
                              <div style="font-size:26px;margin-bottom:6px;">💍✨👑</div>
                              <h1 style="color:#FFFFFF;margin:0;font-size:26px;font-weight:700;letter-spacing:0.5px;font-family:Georgia,serif;">
                                Gahoi Parinay
                              </h1>
                              <p style="color:#FCE8EE;margin:4px 0 14px;font-size:13px;letter-spacing:1px;text-transform:uppercase;">
                                Gahoi Samaj Trusted Matrimony
                              </p>
                              
                              <table border="0" cellspacing="0" cellpadding="0" style="background:rgba(255,255,255,0.18);border:1px solid rgba(255,255,255,0.35);border-radius:999px;margin:0 auto;">
                                <tr>
                                  <td style="padding:5px 16px;color:#FFFFFF;font-size:12px;font-weight:700;letter-spacing:0.3px;">
                                    {{ID_BADGE}}
                                  </td>
                                </tr>
                              </table>
                            </td>
                          </tr>

                          <!-- Main Body Content -->
                          <tr>
                            <td style="padding:28px 28px 20px;">
                              <div style="color:#2D3748;font-size:15px;line-height:1.7;white-space:normal;">
                                {{CONTENT}}
                              </div>

                              <!-- Call to Action Buttons -->
                              <table width="100%" border="0" cellspacing="0" cellpadding="0" style="margin:28px 0 12px;">
                                <tr>
                                  <td align="center">
                                    <a href="https://www.gahoimarriage.in/login" style="display:inline-block;background:linear-gradient(135deg, #7B1220 0%, #A5122F 100%);color:#FFFFFF;text-decoration:none;font-size:15px;font-weight:700;padding:13px 32px;border-radius:999px;box-shadow:0 4px 14px rgba(123,18,32,0.3);letter-spacing:0.3px;">
                                      Open Gahoi Parinay Portal →
                                    </a>
                                  </td>
                                </tr>
                              </table>
                            </td>
                          </tr>

                          <!-- Support Box -->
                          <tr>
                            <td style="padding:0 28px 24px;">
                              <table width="100%" border="0" cellspacing="0" cellpadding="0" style="background:#F9FAFB;border-radius:10px;padding:14px 16px;border:1px solid #E5E7EB;">
                                <tr>
                                  <td style="font-size:12px;color:#4B5563;line-height:1.5;">
                                    <strong>Have questions or need assistance?</strong><br>
                                    Our support team is happy to help you:<br>
                                    📞 Phone / WhatsApp: <a href="tel:7676554631" style="color:#7B1220;font-weight:600;text-decoration:none;">7676554631</a> &nbsp;|&nbsp; 
                                    ✉️ Email: <a href="mailto:noreply@gahoimarriage.in" style="color:#7B1220;font-weight:600;text-decoration:none;">noreply@gahoimarriage.in</a>
                                  </td>
                                </tr>
                              </table>
                            </td>
                          </tr>

                          <!-- Footer -->
                          <tr>
                            <td style="background-color:#FAF5F6;padding:18px 24px;border-top:1px solid #F0DDE2;text-align:center;">
                              <p style="color:#7B1220;font-size:12px;font-weight:700;margin:0 0 4px;letter-spacing:0.5px;">
                                TRADITION &bull; TRUST &bull; BETTER TOMORROW
                              </p>
                              <p style="color:#718096;font-size:11px;margin:0 0 6px;">
                                Where Families Meet &bull; Connecting Gahoi Families Worldwide
                              </p>
                              <p style="color:#A0AEC0;font-size:11px;margin:0;">
                                Website: <a href="https://www.gahoimarriage.in" style="color:#7B1220;text-decoration:none;">www.gahoimarriage.in</a> &bull; Sent via Official Community Relay
                              </p>
                            </td>
                          </tr>

                        </table>
                      </td>
                    </tr>
                  </table>
                </body>
                </html>
                """;

        return htmlTemplate
                .replace("{{ID_BADGE}}", idBadge)
                .replace("{{CONTENT}}", escaped);
    }

    /** "ha****@gmail.com" - enough to match a support query, not enough to leak. */
    private String mask(String email) {
        if (email == null) return "null";
        int at = email.indexOf('@');
        if (at <= 2) return "***";
        return email.charAt(0) + "*".repeat(Math.max(1, at - 2)) + email.substring(at - 1);
    }
}

"""
Lovewanshi Parinay - Asynchronous Welcome Email Lambda Function.

Triggered asynchronously upon member registration (standard signup or Google OAuth).
Delivers a responsive, professional HTML welcome email featuring the Lovewanshi Parinay
promotional flyer (hosted on S3 & CloudFront CDN), personalized greeting, profile completion
checklist, and direct portal links.

Zero external dependencies - pure Python 3 standard library (smtplib, email, json, os).
"""

from __future__ import annotations

import html
import json
import logging
import os
import smtplib
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText

logger = logging.getLogger()
logger.setLevel(logging.INFO)

# Environment configuration with production defaults
SMTP_HOST = os.environ.get("SMTP_HOST", "smtp.email.ap-mumbai-1.oci.oraclecloud.com")
SMTP_PORT = int(os.environ.get("SMTP_PORT", "587"))
SMTP_USER = os.environ.get("SMTP_USER", "ocid1.user.oc1..aaaaaaaadusre56c2v2qhzcqyc6arhwvpvwb3u5bwc7su3b3s6miqi6sobkq@ocid1.tenancy.oc1..aaaaaaaassjcgarb3f5lqujpprme3ba5unnva2ktj2bn2bfbl44ycsyb53ka.f0.com")
SMTP_PASS = os.environ.get("SMTP_PASS", "W_E1]bSM5C!dS!]qv0td")
SMTP_FROM = os.environ.get("SMTP_FROM", "noreply@lovewanshisamaj.in")
SMTP_FROM_NAME = os.environ.get("SMTP_FROM_NAME", "Lovewanshi Parinay")

APP_URL = os.environ.get("APP_URL", "https://www.lovewanshisamaj.in")
BANNER_IMAGE_URL = os.environ.get("BANNER_IMAGE_URL", "https://www.lovewanshisamaj.in/assets/welcome-banner.jpg")
SUPPORT_PHONE = os.environ.get("SUPPORT_PHONE", "7676554631")
SUPPORT_EMAIL = os.environ.get("SUPPORT_EMAIL", "support@lovewanshisamaj.in")


def format_profile_id(raw_id: str | int | None) -> str:
    if not raw_id:
        return "LP"
    str_id = str(raw_id).strip()
    if str_id.upper().startswith("LP") or str_id.upper().startswith("GP") or str_id.upper().startswith("JM"):
        return str_id
    try:
        num = int(str_id)
        return f"LP{1000 + num}"
    except ValueError:
        return str_id


def build_welcome_html(name: str, profile_id_str: str) -> str:
    clean_name = html.escape(name.strip() if name else "Member")
    clean_id = html.escape(profile_id_str)
    
    return f"""<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Welcome to Lovewanshi Parinay</title>
</head>
<body style="margin:0;padding:0;background-color:#FDF8F9;font-family:'Segoe UI',Roboto,Helvetica,Arial,sans-serif;-webkit-font-smoothing:antialiased;">
  <table width="100%" border="0" cellspacing="0" cellpadding="0" style="background-color:#FDF8F9;padding:24px 12px;">
    <tr>
      <td align="center">
        <!-- Main Card Container -->
        <table width="100%" border="0" cellspacing="0" cellpadding="0" style="max-width:600px;background:#FFFFFF;border-radius:20px;overflow:hidden;box-shadow:0 8px 30px rgba(123,18,32,0.08);border:1px solid #F3DFE4;">
          
          <!-- Top Header Banner -->
          <tr>
            <td align="center" style="background:linear-gradient(135deg, #7B1220 0%, #A5122F 100%);padding:32px 24px 26px;text-align:center;border-bottom:4px solid #D4AF37;">
              <div style="font-size:26px;margin-bottom:6px;">💍✨👑</div>
              <h1 style="color:#FFFFFF;margin:0;font-size:28px;font-weight:700;letter-spacing:0.5px;font-family:Georgia,serif;">
                Lovewanshi Parinay
              </h1>
              <p style="color:#FCE8EE;margin:6px 0 0;font-size:13px;letter-spacing:1.5px;text-transform:uppercase;font-weight:600;">
                Trusted Matrimonial Platform for Lovewanshi Community
              </p>
            </td>
          </tr>

          <!-- Flyer Hero Image -->
          <tr>
            <td align="center" style="padding:24px 24px 12px;background:#FFFFFF;">
              <a href="{APP_URL}" target="_blank" style="text-decoration:none;display:block;">
                <img src="{BANNER_IMAGE_URL}" 
                     alt="Find Your Life Partner - Lovewanshi Parinay" 
                     width="552"
                     style="width:100%;max-width:552px;height:auto;display:block;border-radius:14px;box-shadow:0 4px 16px rgba(0,0,0,0.08);border:1px solid #F0D7DC;" />
              </a>
            </td>
          </tr>

          <!-- Welcome Greeting & Introduction -->
          <tr>
            <td style="padding:16px 28px 24px;">
              <table width="100%" border="0" cellspacing="0" cellpadding="0">
                <tr>
                  <td>
                    <div style="display:inline-block;background:#FDF2F4;border:1px solid #F8CCD5;color:#A5122F;font-size:12px;font-weight:700;padding:5px 14px;border-radius:999px;margin-bottom:12px;">
                      🎉 Profile ID: {clean_id}
                    </div>
                    <h2 style="color:#1F2937;font-size:22px;margin:0 0 12px;font-weight:700;">
                      Namaste {clean_name}, 🙏
                    </h2>
                    <p style="color:#4B5563;font-size:15px;line-height:1.6;margin:0 0 16px;">
                      Welcome to <strong>Lovewanshi Parinay</strong> – the dedicated matrimonial platform built exclusively to connect Lovewanshi Samaj families worldwide with trust, tradition, and privacy.
                    </p>
                    <p style="color:#4B5563;font-size:15px;line-height:1.6;margin:0 0 20px;">
                      We are thrilled to accompany you on this sacred milestone of finding your ideal life partner within our community.
                    </p>
                  </td>
                </tr>
              </table>

              <!-- Steps Card -->
              <table width="100%" border="0" cellspacing="0" cellpadding="0" style="background:#FAF5F6;border-radius:14px;padding:20px;border:1px solid #F0DDE2;margin-bottom:24px;">
                <tr>
                  <td>
                    <h3 style="color:#7B1220;font-size:16px;margin:0 0 14px;font-weight:700;">
                      ✨ 4 Steps to Receive 5x More Proposals:
                    </h3>
                    
                    <!-- Step 1 -->
                    <table width="100%" border="0" cellspacing="0" cellpadding="0" style="margin-bottom:12px;">
                      <tr>
                        <td width="32" valign="top" style="font-size:18px;line-height:1;">📸</td>
                        <td style="color:#374151;font-size:14px;line-height:1.5;">
                          <strong>Upload Portrait Photos:</strong> Profiles with clear photos get 5 times more views and responses.
                        </td>
                      </tr>
                    </table>

                    <!-- Step 2 -->
                    <table width="100%" border="0" cellspacing="0" cellpadding="0" style="margin-bottom:12px;">
                      <tr>
                        <td width="32" valign="top" style="font-size:18px;line-height:1;">🪐</td>
                        <td style="color:#374151;font-size:14px;line-height:1.5;">
                          <strong>36 Guna Kundali Milan:</strong> Enter your date, time & place of birth to unlock instant Vedic horoscope matching.
                        </td>
                      </tr>
                    </table>

                    <!-- Step 3 -->
                    <table width="100%" border="0" cellspacing="0" cellpadding="0" style="margin-bottom:12px;">
                      <tr>
                        <td width="32" valign="top" style="font-size:18px;line-height:1;">🌿</td>
                        <td style="color:#374151;font-size:14px;line-height:1.5;">
                          <strong>Gotra & Family Details:</strong> Share your Gotra, education, and native place (मूल निवास).
                        </td>
                      </tr>
                    </table>

                    <!-- Step 4 -->
                    <table width="100%" border="0" cellspacing="0" cellpadding="0">
                      <tr>
                        <td width="32" valign="top" style="font-size:18px;line-height:1;">💌</td>
                        <td style="color:#374151;font-size:14px;line-height:1.5;">
                          <strong>Connect & Express Interest:</strong> Send connection requests to verified profiles and start conversing.
                        </td>
                      </tr>
                    </table>

                  </td>
                </tr>
              </table>

              <!-- Main Call-to-Action Buttons -->
              <table width="100%" border="0" cellspacing="0" cellpadding="0" style="margin-bottom:24px;">
                <tr>
                  <td align="center">
                    <a href="{APP_URL}/profile" 
                       target="_blank" 
                       style="display:inline-block;background:linear-gradient(135deg, #7B1220 0%, #A5122F 100%);color:#FFFFFF;font-size:16px;font-weight:700;text-decoration:none;padding:15px 36px;border-radius:999px;box-shadow:0 4px 14px rgba(123,18,32,0.3);letter-spacing:0.3px;">
                      Complete Your Profile Now →
                    </a>
                  </td>
                </tr>
                <tr>
                  <td align="center" style="padding-top:12px;">
                    <a href="{APP_URL}/browse" 
                       target="_blank" 
                       style="display:inline-block;color:#7B1220;font-size:14px;font-weight:600;text-decoration:underline;">
                      Or browse verified Lovewanshi profiles &gt;
                    </a>
                  </td>
                </tr>
              </table>

              <!-- Features Value Grid -->
              <table width="100%" border="0" cellspacing="0" cellpadding="0" style="border-top:1px dashed #E5E7EB;padding-top:20px;margin-bottom:20px;">
                <tr>
                  <td width="50%" valign="top" style="padding-right:10px;">
                    <div style="font-size:13px;color:#1F2937;font-weight:700;margin-bottom:4px;">🛡️ 100% Verified Profiles</div>
                    <div style="font-size:12px;color:#6B7280;line-height:1.4;">Strict community verification for peace of mind.</div>
                  </td>
                  <td width="50%" valign="top" style="padding-left:10px;">
                    <div style="font-size:13px;color:#1F2937;font-weight:700;margin-bottom:4px;">🔒 Safe &amp; Secure</div>
                    <div style="font-size:12px;color:#6B7280;line-height:1.4;">Photo privacy and phone number protections.</div>
                  </td>
                </tr>
              </table>

              <!-- Support Section -->
              <table width="100%" border="0" cellspacing="0" cellpadding="0" style="background:#F9FAFB;border-radius:12px;padding:16px;border:1px solid #E5E7EB;">
                <tr>
                  <td style="font-size:13px;color:#4B5563;line-height:1.5;">
                    <strong>Need help filling your profile or have questions?</strong><br>
                    Our Lovewanshi Parinay support team is happy to assist you.<br>
                    📞 Phone / WhatsApp: <a href="tel:{SUPPORT_PHONE}" style="color:#7B1220;font-weight:600;text-decoration:none;">{SUPPORT_PHONE}</a> &nbsp;|&nbsp; 
                    ✉️ Email: <a href="mailto:{SUPPORT_EMAIL}" style="color:#7B1220;font-weight:600;text-decoration:none;">{SUPPORT_EMAIL}</a>
                  </td>
                </tr>
              </table>

            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td align="center" style="background:#FAF5F6;padding:22px 24px;border-top:1px solid #F0DDE2;text-align:center;">
              <p style="color:#7B1220;font-size:13px;font-weight:700;margin:0 0 6px;letter-spacing:0.5px;">
                TRADITION &bull; TRUST &bull; BETTER TOMORROW
              </p>
              <p style="color:#6B7280;font-size:12px;margin:0 0 8px;">
                Where Families Meet &bull; Connecting Lovewanshi Families Worldwide
              </p>
              <p style="color:#9CA3AF;font-size:11px;margin:0;">
                Website: <a href="{APP_URL}" style="color:#7B1220;text-decoration:none;">{APP_URL}</a> &bull; &copy; 2026 Lovewanshi Parinay. All rights reserved.
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>
"""


def build_welcome_text(name: str, profile_id_str: str) -> str:
    return f"""Namaste {name},

Welcome to Lovewanshi Parinay (Profile ID: {profile_id_str})!

Lovewanshi Parinay is the trusted matrimonial platform built exclusively for the Lovewanshi Samaj community.

To receive up to 5x more suitable proposals, please take 2 minutes to complete your profile:
1. Upload 1-2 clear portrait photos
2. Add your Date, Time & Place of Birth to generate instant 36 Guna Kundali Milan
3. Fill in your Gotra, Education & Native place (मूल निवास)
4. Express interest and connect with matching families

👉 Complete Your Profile Now:
{APP_URL}/profile

Browse verified Lovewanshi profiles:
{APP_URL}/browse

If you need any assistance, please feel free to reach out to our support team:
Phone / WhatsApp: {SUPPORT_PHONE}
Email: {SUPPORT_EMAIL}

Warm regards,
Team Lovewanshi Parinay
Tradition • Trust • Better Tomorrow
{APP_URL}
"""


def lambda_handler(event: dict, context=None) -> dict:
    logger.info("Received welcome email event: %s", json.dumps(event))

    email_to = event.get("email") or event.get("recipient")
    if not email_to or not isinstance(email_to, str) or "@" not in email_to:
        logger.error("Missing or invalid recipient email in event: %s", event)
        return {
            "statusCode": 400,
            "body": json.dumps({"error": "Missing or invalid 'email' field"})
        }

    member_name = event.get("name") or "Member"
    profile_id = format_profile_id(event.get("profileId"))

    custom_subject = event.get("subject")
    custom_html = event.get("html")
    custom_text = event.get("text")

    subject = (
        custom_subject.strip()
        if custom_subject and isinstance(custom_subject, str) and custom_subject.strip()
        else f"🌸 Welcome to Lovewanshi Parinay, {member_name}! Your Journey Begins Here 💍"
    )

    msg = MIMEMultipart("alternative")
    msg["Subject"] = subject
    msg["From"] = f"{SMTP_FROM_NAME} <{SMTP_FROM}>"
    msg["To"] = email_to

    text_body = custom_text if custom_text else build_welcome_text(member_name, profile_id)
    html_body = custom_html if custom_html else build_welcome_html(member_name, profile_id)

    part_text = MIMEText(text_body, "plain", "utf-8")
    part_html = MIMEText(html_body, "html", "utf-8")

    msg.attach(part_text)
    msg.attach(part_html)

    logger.info("Connecting to SMTP server %s:%d to send welcome email to %s...", SMTP_HOST, SMTP_PORT, email_to)
    try:
        with smtplib.SMTP(SMTP_HOST, SMTP_PORT, timeout=12) as server:
            server.ehlo()
            server.starttls()
            server.ehlo()
            server.login(SMTP_USER, SMTP_PASS)
            server.sendmail(SMTP_FROM, [email_to], msg.as_string())

        logger.info("Welcome email successfully delivered to %s (Profile: %s)", email_to, profile_id)
        return {
            "statusCode": 200,
            "body": json.dumps({
                "status": "success",
                "message": f"Welcome email sent to {email_to}",
                "profileId": profile_id
            })
        }
    except Exception as e:
        logger.exception("Failed to dispatch welcome email to %s: %s", email_to, str(e))
        return {
            "statusCode": 500,
            "body": json.dumps({
                "status": "error",
                "error": str(e)
            })
        }

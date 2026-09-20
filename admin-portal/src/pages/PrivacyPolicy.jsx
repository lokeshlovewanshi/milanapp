import React from "react";

export default function PrivacyPolicy() {
  return (
    <div style={{
      maxWidth: "800px",
      margin: "0 auto",
      padding: "32px 20px 64px",
      fontFamily: "system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
      color: "#241416",
      lineHeight: 1.65,
      background: "#ffffff"
    }}>
      <header style={{ borderBottom: "1px solid #e8dfe0", paddingBottom: "16px", marginBottom: "24px" }}>
        <h2 style={{ margin: "0 0 8px", color: "#8B1E2F", fontSize: "24px" }}>👑 LOVEWANSHI Milan / Lovewanshi Parinay</h2>
        <h1 style={{ margin: "0 0 8px", fontSize: "32px", fontWeight: "700" }}>Privacy Policy</h1>
        <p style={{ color: "#6b5c5e", fontSize: "14px", margin: 0 }}>
          Effective: 14 August 2026 · Android package <code>com.lovewanshi.jeevanmilansathi</code>
        </p>
      </header>

      <div style={{
        background: "#fbf6f6",
        borderLeft: "4px solid #8B1E2F",
        padding: "16px",
        borderRadius: "6px",
        marginBottom: "28px"
      }}>
        <strong>Overview:</strong> LOVEWANSHI Milan is a dedicated matrimony app for the community to share verified details to find life partners. This policy explains what information we collect, why, who sees it, and how to request deletion.
      </div>

      <section style={{ marginBottom: "28px" }}>
        <h2 style={{ color: "#8B1E2F", borderBottom: "1px solid #e8dfe0", paddingBottom: "6px", fontSize: "22px" }}>1. Information We Collect</h2>
        <p>We collect information directly from you when you register and complete your matrimonial profile:</p>
        <ul>
          <li><strong>Account details:</strong> Email address, mobile number, encrypted passwords, or basic Google profile data (Name, Email) if using Google Sign-In.</li>
          <li><strong>Personal Details:</strong> Full name, gender, date of birth, time and place of birth, marital status, height, weight, complexion, gotra, mother tongue.</li>
          <li><strong>Astrological Details:</strong> Zodiac sign, gotra, birth chart (kundali) calculation details for matchmaking.</li>
          <li><strong>Family & Career:</strong> Parents' details, siblings, education, occupation, income, and residence location.</li>
          <li><strong>Photos:</strong> Profile photographs uploaded by you for your matrimony profile.</li>
          <li><strong>Device data:</strong> Device push notification tokens (Firebase Cloud Messaging) for connection request alerts. We do <strong>not</strong> collect real-time GPS location.</li>
        </ul>
      </section>

      <section style={{ marginBottom: "28px" }}>
        <h2 style={{ color: "#8B1E2F", borderBottom: "1px solid #e8dfe0", paddingBottom: "6px", fontSize: "22px" }}>2. How We Use Information</h2>
        <ul>
          <li>To show your matrimonial profile to eligible members of the community according to your preferences.</li>
          <li>To calculate horoscope and kundali (guna milan) compatibility.</li>
          <li>To notify you when other verified members send connection requests or view your profile.</li>
          <li>To prevent fraud, fake accounts, and protect community members.</li>
        </ul>
      </section>

      <section style={{ marginBottom: "28px" }}>
        <h2 style={{ color: "#8B1E2F", borderBottom: "1px solid #e8dfe0", paddingBottom: "6px", fontSize: "22px" }}>3. Data Security & Sharing</h2>
        <ul>
          <li><strong>Encryption:</strong> All data transmitted between the mobile app and our servers is encrypted in transit using industry-standard HTTPS/TLS.</li>
          <li><strong>Contact Details:</strong> Your phone number and private contact details are protected and only shared when both sides accept a mutual connection request.</li>
          <li><strong>Third-party processors:</strong> We use Amazon Web Services (AWS S3) for secure photo storage and Google Firebase for authentication and push notifications. We never sell your data to advertisers.</li>
        </ul>
      </section>

      <section style={{ marginBottom: "28px" }}>
        <h2 style={{ color: "#8B1E2F", borderBottom: "1px solid #e8dfe0", paddingBottom: "6px", fontSize: "22px" }}>4. Data Deletion & Your Rights</h2>
        <p>You have full control over your data at all times:</p>
        <ul>
          <li><strong>In-app deletion:</strong> Open the app ➔ Go to Profile / Account Settings ➔ Click <strong>"Delete My Account"</strong>.</li>
          <li><strong>Web deletion request:</strong> You can also request complete account deletion at <a href="/delete-account" style={{ color: "#8B1E2F" }}>https://admin.lovewanshisamaj.in/delete-account</a> without needing to install the app.</li>
        </ul>
      </section>

      <section style={{ marginBottom: "28px" }}>
        <h2 style={{ color: "#8B1E2F", borderBottom: "1px solid #e8dfe0", paddingBottom: "6px", fontSize: "22px" }}>5. Contact & Support</h2>
        <p>If you have any questions or grievance requests regarding your personal data:</p>
        <p><strong>Email:</strong> <a href="mailto:lovewanshisamaj@gmail.com" style={{ color: "#8B1E2F" }}>lovewanshisamaj@gmail.com</a></p>
        <p><strong>Support Email:</strong> <a href="mailto:jeevanmilansathi@gmail.com" style={{ color: "#8B1E2F" }}>jeevanmilansathi@gmail.com</a></p>
      </section>

      <footer style={{ borderTop: "1px solid #e8dfe0", paddingTop: "16px", marginTop: "32px", fontSize: "13px", color: "#6b5c5e" }}>
        © 2026 LOVEWANSHI Milan / Lovewanshi Parinay. All rights reserved.
      </footer>
    </div>
  );
}

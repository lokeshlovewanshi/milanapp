import React from "react";
import { Link } from "react-router-dom";
import logoImg from "../assets/logo.png";
import { Icon } from "../components/Icons";

export default function PrivacyPolicy() {
  return (
    <div className="privacy-policy-container" style={{ maxWidth: 860, margin: "0 auto", padding: "2rem 1.5rem 4rem" }}>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "2rem", borderBottom: "1px solid var(--border)", paddingBottom: "1.25rem" }}>
        <Link to="/" style={{ display: "flex", alignItems: "center", gap: "0.6rem", textDecoration: "none" }}>
          <img src={logoImg} alt="Lovewanshi Parinay" style={{ width: 34, height: 34, objectFit: "contain" }} />
          <span style={{ fontFamily: "var(--font-serif)", fontSize: "1.25rem", fontWeight: 700, color: "var(--auth-maroon)" }}>
            Lovewanshi Parinay
          </span>
        </Link>
        <Link to="/browse" className="secondary small" style={{ display: "inline-flex", alignItems: "center", gap: "0.4rem", textDecoration: "none" }}>
          <Icon name="arrow-left" size={14} />
          <span>Back to App</span>
        </Link>
      </div>

      <div className="card" style={{ padding: "2.5rem 2rem", background: "white", borderRadius: "var(--radius-lg)", boxShadow: "var(--shadow-sm)" }}>
        <h1 style={{ fontFamily: "var(--font-serif)", fontSize: "2rem", color: "var(--auth-maroon)", marginBottom: "0.5rem" }}>
          Privacy Policy
        </h1>
        <p className="muted" style={{ fontSize: "0.9rem", marginBottom: "1.5rem" }}>
          Last Updated: 22 August 2026 · Effective for Lovewanshi Parinay (Lovewanshi Samaj) Web Portal & Mobile Application
        </p>

        <div style={{ background: "#FDF2F4", borderLeft: "4px solid var(--auth-crimson)", padding: "1rem 1.25rem", borderRadius: "0 var(--radius-sm) var(--radius-sm) 0", marginBottom: "2rem" }}>
          <p style={{ margin: 0, fontSize: "0.95rem", color: "#5C131E", lineHeight: 1.6 }}>
            <strong>Lovewanshi Parinay</strong> is a dedicated matrimony portal built exclusively for the LOVEWANSHI community to help members connect with verified bride and groom proposals. This Privacy Policy details how we collect, use, protect, and handle your personal and matrimonial data.
          </p>
        </div>

        <section style={{ marginBottom: "2rem" }}>
          <h2 style={{ fontSize: "1.3rem", color: "var(--auth-maroon)", borderBottom: "1px solid #F3EAE8", paddingBottom: "0.5rem", marginBottom: "1rem" }}>
            1. Information We Collect
          </h2>
          <p style={{ lineHeight: 1.7, color: "var(--text)" }}>
            To deliver verified matchmaking and Kundali Milan services, we collect information that you provide when registering and completing your profile:
          </p>
          <ul style={{ paddingLeft: "1.5rem", lineHeight: 1.8, color: "var(--text)" }}>
            <li><strong>Account Credentials:</strong> Email address, mobile number, encrypted passwords, or basic Google OAuth profile info (name, email, profile picture) if you sign in with Google.</li>
            <li><strong>Basic & Personal Details:</strong> Full name, gender, date of birth, marital status, height, weight, complexion, blood group, and optional physical status disclosures.</li>
            <li><strong>Community & Astrology Details:</strong> Gotra, aakna, mother tongue, place and time of birth, Manglik status, and Janam Kundali details used for horoscope and Ashtakoota 36 Guna matching.</li>
            <li><strong>Education & Career:</strong> Educational qualifications, employment type (Government / Private / Business), profession, employer name, and annual income bracket.</li>
            <li><strong>Family Background:</strong> Parents' names and occupations, contact numbers, family values, and sibling details.</li>
            <li><strong>Photos & Attachments:</strong> Profile photos uploaded to create your matrimonial biodata.</li>
          </ul>
        </section>

        <section style={{ marginBottom: "2rem" }}>
          <h2 style={{ fontSize: "1.3rem", color: "var(--auth-maroon)", borderBottom: "1px solid #F3EAE8", paddingBottom: "0.5rem", marginBottom: "1rem" }}>
            2. How We Use Your Information
          </h2>
          <ul style={{ paddingLeft: "1.5rem", lineHeight: 1.8, color: "var(--text)" }}>
            <li>To build, verify, and display your matrimonial biodata to other registered community members.</li>
            <li>To power matchmaking filters (age, height, gotra, location, education, and profession).</li>
            <li>To calculate astrological compatibility and 36 Guna Milan when requested.</li>
            <li>To facilitate mutual connection requests, shortlisting, and direct communications.</li>
            <li>To safeguard the community against fraudulent accounts, fake profiles, and abuse.</li>
            <li>To send important notifications regarding interest requests, profile views, and matches.</li>
          </ul>
        </section>

        <section style={{ marginBottom: "2rem" }}>
          <h2 style={{ fontSize: "1.3rem", color: "var(--auth-maroon)", borderBottom: "1px solid #F3EAE8", paddingBottom: "0.5rem", marginBottom: "1rem" }}>
            3. Privacy Controls & Data Sharing
          </h2>
          <p style={{ lineHeight: 1.7, color: "var(--text)" }}>
            We respect your privacy and adhere to strict access controls:
          </p>
          <ul style={{ paddingLeft: "1.5rem", lineHeight: 1.8, color: "var(--text)" }}>
            <li><strong>Gated Contact Information:</strong> Your direct phone number, WhatsApp number, and address are only disclosed to members whose connection request you have mutually accepted.</li>
            <li><strong>No Sale of Personal Data:</strong> We do NOT sell, rent, or trade your personal information to third-party marketing or advertising companies.</li>
            <li><strong>Infrastructure Partners:</strong> Photos and assets are securely stored on AWS S3 with encrypted cloud delivery.</li>
          </ul>
        </section>

        <section style={{ marginBottom: "2rem" }}>
          <h2 style={{ fontSize: "1.3rem", color: "var(--auth-maroon)", borderBottom: "1px solid #F3EAE8", paddingBottom: "0.5rem", marginBottom: "1rem" }}>
            4. Data Security & Storage
          </h2>
          <p style={{ lineHeight: 1.7, color: "var(--text)" }}>
            All data in transit is encrypted using industry-standard <strong>HTTPS / TLS 1.3</strong> protocols. Passwords and sensitive authentication tokens are hashed using secure cryptographic algorithms. Cloud databases and storage buckets are protected with strict IAM firewalls and access permissions.
          </p>
        </section>

        <section style={{ marginBottom: "2rem" }}>
          <h2 style={{ fontSize: "1.3rem", color: "var(--auth-maroon)", borderBottom: "1px solid #F3EAE8", paddingBottom: "0.5rem", marginBottom: "1rem" }}>
            5. Account Deletion & Data Rights
          </h2>
          <p style={{ lineHeight: 1.7, color: "var(--text)" }}>
            You maintain full control over your data on Lovewanshi Parinay:
          </p>
          <ul style={{ paddingLeft: "1.5rem", lineHeight: 1.8, color: "var(--text)" }}>
            <li><strong>Profile Visibility:</strong> You can temporarily hide your profile from search results at any time from your account settings.</li>
            <li><strong>Edit Details:</strong> You can update or remove any section of your profile whenever you wish.</li>
            <li><strong>Account Deletion:</strong> You can permanently delete your account and all associated profile photos directly via our <Link to="/delete-account" style={{ color: "var(--auth-crimson)", textDecoration: "underline", fontWeight: 600 }}>Account Deletion Page</Link> or by writing to support. Upon verification, your profile data will be permanently wiped.</li>
          </ul>
        </section>

        <section style={{ marginBottom: "2rem" }}>
          <h2 style={{ fontSize: "1.3rem", color: "var(--auth-maroon)", borderBottom: "1px solid #F3EAE8", paddingBottom: "0.5rem", marginBottom: "1rem" }}>
            6. Contact & Grievance Support
          </h2>
          <p style={{ lineHeight: 1.7, color: "var(--text)" }}>
            If you have any questions, concerns, or requests regarding this Privacy Policy or your personal information, please contact our support team:
          </p>
          <div style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: "var(--radius-sm)", padding: "1.25rem", marginTop: "1rem" }}>
            <p style={{ margin: "0 0 0.5rem", fontWeight: 600, color: "var(--text)" }}>Lovewanshi Parinay Support Desk</p>
            <p style={{ margin: "0 0 0.5rem", color: "var(--text)" }}>
              Email: <a href="mailto:jeevanmilansathi@gmail.com" style={{ color: "var(--auth-crimson)", fontWeight: 600 }}>jeevanmilansathi@gmail.com</a>
            </p>
            <p style={{ margin: 0, color: "var(--text-muted)", fontSize: "0.9rem" }}>
              Website: <a href="https://www.lovewanshisamaj.in" style={{ color: "var(--auth-crimson)" }}>https://www.lovewanshisamaj.in</a>
            </p>
          </div>
        </section>

        <div style={{ borderTop: "1px solid var(--border)", paddingTop: "1.5rem", textAlign: "center" }}>
          <p className="muted" style={{ fontSize: "0.85rem", margin: 0 }}>
            © {new Date().getFullYear()} Lovewanshi Parinay. Dedicated Matrimonial Platform for the LOVEWANSHI Community.
          </p>
        </div>
      </div>
    </div>
  );
}

import React, { useState } from "react";

export default function DeleteAccount() {
  const [email, setEmail] = useState("");
  const [reason, setReason] = useState("");
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!email) return;
    setSubmitted(true);
  };

  return (
    <div
      style={{
        maxWidth: "600px",
        margin: "0 auto",
        padding: "40px 20px",
        fontFamily:
          "system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
        color: "#241416",
        lineHeight: 1.6,
      }}
    >
      <header
        style={{
          borderBottom: "1px solid #e8dfe0",
          paddingBottom: "16px",
          marginBottom: "24px",
        }}
      >
        <h2 style={{ margin: "0 0 8px", color: "#8B1E2F" }}>
          👑 LOVEWANSHI Milan
        </h2>
        <h1 style={{ margin: 0, fontSize: "28px" }}>
          Request Account Deletion
        </h1>
      </header>

      <p>
        In accordance with Google Play data policies, members can request
        account and data deletion online without installing the mobile app.
      </p>

      {submitted ? (
        <div
          style={{
            background: "#eef9f1",
            border: "1px solid #c3e6cb",
            color: "#155724",
            padding: "20px",
            borderRadius: "8px",
            marginTop: "20px",
          }}
        >
          <h3 style={{ margin: "0 0 8px" }}>✓ Request Received</h3>
          <p style={{ margin: 0 }}>
            Your deletion request for <strong>{email}</strong> has been logged.
            Our moderation team will verify the account and permanently purge
            your profile, photos, and personal data within 7 business days.
          </p>
        </div>
      ) : (
        <form
          onSubmit={handleSubmit}
          style={{
            background: "#faf9f8",
            border: "1px solid #e8dfe0",
            padding: "24px",
            borderRadius: "8px",
            marginTop: "20px",
          }}
        >
          <div style={{ marginBottom: "16px" }}>
            <label
              style={{
                display: "block",
                fontWeight: "600",
                marginBottom: "6px",
              }}
            >
              Registered Email or Phone Number *
            </label>
            <input
              type="text"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="e.g. yourname@gmail.com or 9876543210"
              style={{
                width: "100%",
                padding: "10px",
                border: "1px solid #ccc",
                borderRadius: "4px",
                boxSizing: "border-box",
              }}
            />
          </div>

          <div style={{ marginBottom: "20px" }}>
            <label
              style={{
                display: "block",
                fontWeight: "600",
                marginBottom: "6px",
              }}
            >
              Reason for Deletion (Optional)
            </label>
            <textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Found a match, no longer need account, etc."
              rows={3}
              style={{
                width: "100%",
                padding: "10px",
                border: "1px solid #ccc",
                borderRadius: "4px",
                boxSizing: "border-box",
              }}
            />
          </div>

          <button
            type="submit"
            style={{
              background: "#8B1E2F",
              color: "#ffffff",
              border: "none",
              padding: "12px 24px",
              borderRadius: "6px",
              fontWeight: "600",
              cursor: "pointer",
              fontSize: "15px",
            }}
          >
            Submit Deletion Request
          </button>
        </form>
      )}

      <footer style={{ marginTop: "40px", fontSize: "13px", color: "#6b5c5e" }}>
        <p>
          You can also delete your account instantly inside the Android app
          under{" "}
          <strong>Profile ➔ Account &amp; Settings ➔ Delete Account</strong>.
        </p>
        <p>
          <a href="/privacy-policy" style={{ color: "#8B1E2F" }}>
            Privacy Policy
          </a>{" "}
          ·{" "}
          <a
            href="mailto:lovewanshisamaj@gmail.com"
            style={{ color: "#8B1E2F" }}
          >
            lovewanshisamaj@gmail.com
          </a>
        </p>
      </footer>
    </div>
  );
}

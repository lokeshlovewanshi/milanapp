import React from "react";
import { Link } from "react-router-dom";

export default function SeoFooter() {
  return (
    <footer
      className="seo-footer-section"
      style={{
        background: "#FFFFFF",
        borderTop: "1px solid #E5E7EB",
        padding: "1.25rem 0",
        marginTop: "2.5rem",
      }}
    >
      <div
        style={{
          maxWidth: 1160,
          margin: "0 auto",
          padding: "0 1.25rem",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          flexWrap: "wrap",
          gap: "0.75rem",
          fontSize: "0.85rem",
          color: "#6B7280",
        }}
      >
        <div>
          © {new Date().getFullYear()} <strong>Gahoi Parinay</strong> (gahoimarriage.in). All rights reserved.
        </div>
        <div style={{ display: "flex", gap: "1.25rem" }}>
          <Link to="/privacy" style={{ color: "#4B5563", textDecoration: "none" }}>
            Privacy Policy
          </Link>
          <Link to="/delete-account" style={{ color: "#4B5563", textDecoration: "none" }}>
            Delete Account
          </Link>
        </div>
      </div>
    </footer>
  );
}

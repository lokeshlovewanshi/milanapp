import React from "react";
import { Icon } from "./Icons";

const ITEMS = [
  { icon: "shield-check", line1: "Verified", line2: "Profiles" },
  { icon: "lock", line1: "100% Safe &", line2: "Secure" },
  { icon: "message-circle", line1: "Easy", line2: "Communication" },
  { icon: "users", line1: "Trusted by", line2: "Families" },
];

export default function TrustRow() {
  return (
    <div>
      <div className="trust-row-wrap">
        {ITEMS.map((item, i) => (
          <div key={i} className="trust-item">
            <div className="trust-icon-box">
              <Icon name={item.icon} size={22} color="#3260AE" />
            </div>
            <span className="trust-line">{item.line1}</span>
            <span className="trust-line">{item.line2}</span>
          </div>
        ))}
      </div>

      <div style={{ textAlign: "center", marginTop: "1.5rem", paddingBottom: "1rem" }}>
        <a href="/privacy" style={{ fontSize: "0.85rem", color: "var(--text-muted)", textDecoration: "underline" }}>
          Privacy Policy
        </a>
      </div>
    </div>
  );
}

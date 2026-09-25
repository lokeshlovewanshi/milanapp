import React, { useState } from "react";
import { Link } from "react-router-dom";
import { profileAPI, clearSession, isLoggedIn } from "../api";
import logoImg from "../assets/logo.png";
import { Icon } from "../components/Icons";

export default function DeleteAccount() {
  const loggedIn = isLoggedIn();
  const [confirming, setConfirming] = useState(false);
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState("");

  async function handleDelete() {
    setBusy(true);
    setError("");
    try {
      await profileAPI.deleteAccount();
      clearSession();
      setDone(true);
    } catch (err) {
      setError(
        err.message ||
          "Failed to delete account. Please try again or contact support.",
      );
      setBusy(false);
    }
  }

  return (
    <div
      className="delete-account-container"
      style={{ maxWidth: 760, margin: "0 auto", padding: "2rem 1.25rem 4rem" }}
    >
      {/* Header */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          marginBottom: "2rem",
          borderBottom: "1px solid var(--border)",
          paddingBottom: "1.25rem",
        }}
      >
        <Link
          to="/"
          style={{
            display: "flex",
            alignItems: "center",
            gap: "0.6rem",
            textDecoration: "none",
          }}
        >
          <img
            src={logoImg}
            alt="Lodha Parinay"
            style={{ width: 34, height: 34, objectFit: "contain" }}
          />
          <span
            style={{
              fontFamily: "var(--font-serif)",
              fontSize: "1.25rem",
              fontWeight: 700,
              color: "var(--auth-maroon)",
            }}
          >
            Lodha Parinay
          </span>
        </Link>
        <Link
          to="/browse"
          className="secondary small"
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: "0.4rem",
            textDecoration: "none",
          }}
        >
          <Icon name="arrow-left" size={14} />
          <span>Back to App</span>
        </Link>
      </div>

      <div
        className="card"
        style={{
          padding: "2.5rem 2rem",
          background: "white",
          borderRadius: "var(--radius-lg)",
          boxShadow: "var(--shadow-sm)",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "0.75rem",
            marginBottom: "0.5rem",
          }}
        >
          <div
            style={{
              width: 40,
              height: 40,
              borderRadius: "50%",
              background: "#FEE2E2",
              color: "#DC2626",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Icon name="trash" size={20} />
          </div>
          <h1
            style={{
              fontFamily: "var(--font-serif)",
              fontSize: "1.85rem",
              color: "var(--auth-maroon)",
              margin: 0,
            }}
          >
            Delete Your Account
          </h1>
        </div>

        <p
          className="muted"
          style={{ fontSize: "0.92rem", marginBottom: "2rem" }}
        >
          We are sorry to see you go. You can delete your account and personal
          data using either of the methods below.
        </p>

        {done ? (
          <div
            style={{
              background: "#ECFDF5",
              border: "1px solid #A7F3D0",
              borderRadius: "var(--radius-md)",
              padding: "1.75rem",
              textAlign: "center",
            }}
          >
            <div
              style={{
                width: 48,
                height: 48,
                borderRadius: "50%",
                background: "#10B981",
                color: "white",
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                marginBottom: "1rem",
              }}
            >
              <Icon name="check" size={24} />
            </div>
            <h2
              style={{
                fontSize: "1.35rem",
                color: "#065F46",
                margin: "0 0 0.5rem",
              }}
            >
              Account Deleted Successfully
            </h2>
            <p
              style={{
                color: "#047857",
                margin: "0 0 1.5rem",
                fontSize: "0.95rem",
              }}
            >
              Your profile has been removed from search and discovery. All
              personal records and uploaded photos are scheduled for permanent
              deletion.
            </p>
            <Link
              to="/login"
              className="btn-primary"
              style={{
                display: "inline-block",
                padding: "0.7rem 1.5rem",
                textDecoration: "none",
              }}
            >
              Go to Home / Login
            </Link>
          </div>
        ) : (
          <>
            {/* Method 1: In-App 1-Click Action */}
            <div
              style={{
                background: "#FFF5F5",
                border: "1px solid #FED7D7",
                borderRadius: "var(--radius-md)",
                padding: "1.5rem",
                marginBottom: "1.75rem",
              }}
            >
              <div
                style={{
                  fontSize: "0.75rem",
                  textTransform: "uppercase",
                  letterSpacing: "0.08em",
                  fontWeight: 700,
                  color: "#C53030",
                  marginBottom: "0.4rem",
                }}
              >
                Option 1: Instant Self-Service
              </div>
              <h3
                style={{
                  margin: "0 0 0.5rem",
                  fontSize: "1.15rem",
                  color: "#742A2A",
                }}
              >
                Delete directly from this browser
              </h3>
              <p
                style={{
                  margin: "0 0 1.25rem",
                  color: "#4A5568",
                  fontSize: "0.9rem",
                  lineHeight: 1.5,
                }}
              >
                {loggedIn
                  ? "You are currently signed in. Clicking the button below will immediately soft-delete your profile, log you out, and queue your data for complete deletion."
                  : "If you have an active account, please log in first to delete your account instantly with 1 click."}
              </p>

              {error && (
                <div className="error" style={{ marginBottom: "1rem" }}>
                  {error}
                </div>
              )}

              {loggedIn ? (
                confirming ? (
                  <div
                    style={{
                      background: "white",
                      padding: "1.25rem",
                      borderRadius: "var(--radius-sm)",
                      border: "1px solid #FEB2B2",
                    }}
                  >
                    <p
                      style={{
                        fontWeight: 700,
                        color: "#9B2C2C",
                        margin: "0 0 0.75rem",
                        fontSize: "0.95rem",
                      }}
                    >
                      ⚠️ Are you completely sure? This will remove your biodata
                      and unmatch all connections.
                    </p>
                    <div style={{ display: "flex", gap: "0.75rem" }}>
                      <button
                        type="button"
                        onClick={handleDelete}
                        disabled={busy}
                        style={{
                          background: "#E53E3E",
                          color: "white",
                          border: "none",
                          padding: "0.6rem 1.2rem",
                          borderRadius: 6,
                          fontWeight: 700,
                          cursor: "pointer",
                        }}
                      >
                        {busy ? "Deleting..." : "Yes, Delete My Account Now"}
                      </button>
                      <button
                        type="button"
                        className="secondary"
                        onClick={() => setConfirming(false)}
                        disabled={busy}
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => setConfirming(true)}
                    style={{
                      background: "#E53E3E",
                      color: "white",
                      border: "none",
                      padding: "0.7rem 1.4rem",
                      borderRadius: "var(--radius-sm)",
                      fontWeight: 700,
                      cursor: "pointer",
                      display: "inline-flex",
                      alignItems: "center",
                      gap: "0.5rem",
                    }}
                  >
                    <Icon name="trash" size={16} />
                    <span>Delete My Account</span>
                  </button>
                )
              ) : (
                <Link
                  to="/login"
                  state={{ from: "/delete-account" }}
                  className="btn-primary"
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "0.4rem",
                    padding: "0.65rem 1.2rem",
                    textDecoration: "none",
                  }}
                >
                  <Icon name="lock" size={15} />
                  <span>Log in to Delete Account</span>
                </Link>
              )}
            </div>

            {/* Method 2: Request via Support Email */}
            <div
              style={{
                background: "#F8FAFC",
                border: "1px solid #E2E8F0",
                borderRadius: "var(--radius-md)",
                padding: "1.5rem",
                marginBottom: "2rem",
              }}
            >
              <div
                style={{
                  fontSize: "0.75rem",
                  textTransform: "uppercase",
                  letterSpacing: "0.08em",
                  fontWeight: 700,
                  color: "#64748B",
                  marginBottom: "0.4rem",
                }}
              >
                Option 2: Without Logging In / Email Request
              </div>
              <h3
                style={{
                  margin: "0 0 0.5rem",
                  fontSize: "1.15rem",
                  color: "#1E293B",
                }}
              >
                Request Account Deletion via Email
              </h3>
              <p
                style={{
                  margin: "0 0 1rem",
                  color: "#475569",
                  fontSize: "0.9rem",
                  lineHeight: 1.6,
                }}
              >
                If you no longer have access to your account or prefer human
                assistance, send an email request from your registered email
                address:
              </p>
              <a
                href="mailto:lovewanshisamaj@gmail.com?subject=Account%20Deletion%20Request%20-%20LOVEWANSHI%20Parinay&body=Please%20delete%20my%20LOVEWANSHI%20Parinay%20account.%0A%0ARegistered%20Email%3A%20%0ARegistered%20Mobile%20Number%3A%20%0AFull%20Name%3A%20"
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "0.5rem",
                  background: "var(--auth-crimson)",
                  color: "white",
                  padding: "0.7rem 1.25rem",
                  borderRadius: "var(--radius-sm)",
                  textDecoration: "none",
                  fontWeight: 600,
                  fontSize: "0.92rem",
                }}
              >
                <Icon name="message-circle" size={16} />
                <span>Email lovewanshisamaj@gmail.com →</span>
              </a>
              <p
                style={{
                  fontSize: "0.82rem",
                  color: "var(--text-muted)",
                  marginTop: "0.85rem",
                  marginBottom: 0,
                }}
              >
                * We process manual email requests within 48-72 business hours
                upon verifying ownership.
              </p>
            </div>

            {/* Table of What Gets Deleted */}
            <h2
              style={{
                fontSize: "1.25rem",
                color: "var(--auth-maroon)",
                marginBottom: "0.85rem",
              }}
            >
              What happens when your account is deleted:
            </h2>
            <table
              style={{
                width: "100%",
                borderCollapse: "collapse",
                fontSize: "0.9rem",
                marginBottom: "2rem",
              }}
            >
              <thead>
                <tr style={{ background: "#FDF2F4", textAlign: "left" }}>
                  <th
                    style={{
                      padding: "0.75rem",
                      borderBottom: "1px solid var(--border)",
                      color: "var(--auth-maroon)",
                    }}
                  >
                    Data Type
                  </th>
                  <th
                    style={{
                      padding: "0.75rem",
                      borderBottom: "1px solid var(--border)",
                      color: "var(--auth-maroon)",
                    }}
                  >
                    Action Taken
                  </th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td
                    style={{
                      padding: "0.75rem",
                      borderBottom: "1px solid var(--border)",
                      fontWeight: 600,
                    }}
                  >
                    Profile & Photos
                  </td>
                  <td
                    style={{
                      padding: "0.75rem",
                      borderBottom: "1px solid var(--border)",
                      color: "var(--text-muted)",
                    }}
                  >
                    Immediately removed from search and discovery. Photos
                    permanently deleted from cloud storage.
                  </td>
                </tr>
                <tr>
                  <td
                    style={{
                      padding: "0.75rem",
                      borderBottom: "1px solid var(--border)",
                      fontWeight: 600,
                    }}
                  >
                    Vedic Kundali Data
                  </td>
                  <td
                    style={{
                      padding: "0.75rem",
                      borderBottom: "1px solid var(--border)",
                      color: "var(--text-muted)",
                    }}
                  >
                    Astrological charts and birth coordinates are erased.
                  </td>
                </tr>
                <tr>
                  <td
                    style={{
                      padding: "0.75rem",
                      borderBottom: "1px solid var(--border)",
                      fontWeight: 600,
                    }}
                  >
                    Login Credentials
                  </td>
                  <td
                    style={{
                      padding: "0.75rem",
                      borderBottom: "1px solid var(--border)",
                      color: "var(--text-muted)",
                    }}
                  >
                    Session tokens revoked. You will not be able to log back in
                    without creating a new profile.
                  </td>
                </tr>
              </tbody>
            </table>
          </>
        )}

        <div
          style={{
            borderTop: "1px solid var(--border)",
            paddingTop: "1.5rem",
            display: "flex",
            justifyContent: "space-between",
            flexWrap: "wrap",
            gap: "0.5rem",
          }}
        >
          <Link
            to="/privacy"
            style={{
              fontSize: "0.85rem",
              color: "var(--auth-crimson)",
              textDecoration: "underline",
            }}
          >
            View Privacy Policy
          </Link>
          <span className="muted small">
            © {new Date().getFullYear()} Lodha Parinay
          </span>
        </div>
      </div>
    </div>
  );
}

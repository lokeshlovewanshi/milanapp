import React, { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ticketAPI } from "../api";
import { Icon } from "../components/Icons";

function timeAgo(iso) {
  if (!iso) return "";
  const diff = Date.now() - new Date(iso).getTime();
  const days = Math.floor(diff / (24 * 60 * 60 * 1000));
  if (days < 1) return "Today";
  if (days === 1) return "Yesterday";
  return new Date(iso).toLocaleDateString();
}

export default function Support() {
  const navigate = useNavigate();
  const [tickets, setTickets] = useState([]);
  const [contact, setContact] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  function load() {
    setLoading(true);
    Promise.all([ticketAPI.list().catch(() => []), ticketAPI.contact().catch(() => null)])
      .then(([tList, cData]) => {
        setTickets(Array.isArray(tList) ? tList : []);
        setContact(cData);
      })
      .finally(() => setLoading(false));
  }

  useEffect(load, []);

  const openTicket = tickets.find((t) => t.status === "OPEN");

  async function handleSubmit(e) {
    e.preventDefault();
    if (!subject.trim() || !message.trim()) return;
    setSubmitting(true);
    setError("");
    try {
      const ticket = await ticketAPI.create(subject.trim(), message.trim());
      navigate(`/support/${ticket.id}`);
    } catch (err) {
      setError(
        err?.status === 409
          ? err.message || "You already have an open ticket - please reply on it instead."
          : "Could not submit your query. Please try again."
      );
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="content-narrow">
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem" }}>
        <div>
          <h1 className="detail-profile-name" style={{ fontSize: "1.8rem" }}>
            Help & Support (सहायता केंद्र)
          </h1>
          <p className="muted" style={{ margin: "0.2rem 0 0" }}>
            Have a question about your account, verification or a profile? We are here to help.
          </p>
        </div>

        {openTicket ? (
          <Link to={`/support/${openTicket.id}`}>
            <button className="small">Open Ticket</button>
          </Link>
        ) : (
          <button className="small" onClick={() => setShowForm((s) => !s)}>
            <Icon name={showForm ? "close" : "message-circle"} size={14} />
            <span>{showForm ? "Cancel" : "Raise a Query"}</span>
          </button>
        )}
      </div>

      {contact && (
        <div className="card" style={{ marginBottom: "1.5rem", background: "#FFFDF9", borderColor: "#F3ECE8" }}>
          <h4 style={{ margin: "0 0 0.5rem", color: "var(--auth-maroon)" }}>Community Support Desk</h4>
          <div style={{ display: "flex", flexWrap: "wrap", gap: "1rem", fontSize: "0.88rem" }}>
            {contact.phone && (
              <div style={{ display: "flex", alignItems: "center", gap: "0.4rem" }}>
                <Icon name="phone" size={15} color="#C8622A" />
                <span>{contact.phone}</span>
              </div>
            )}
            {contact.email && (
              <div style={{ display: "flex", alignItems: "center", gap: "0.4rem" }}>
                <Icon name="mail" size={15} color="#C8622A" />
                <span>{contact.email}</span>
              </div>
            )}
          </div>
        </div>
      )}

      {showForm && !openTicket && (
        <form className="card" style={{ marginBottom: "1.5rem", display: "flex", flexDirection: "column", gap: "0.9rem" }} onSubmit={handleSubmit}>
          <h3 style={{ margin: "0 0 0.25rem", color: "var(--auth-maroon)" }}>Raise a Support Query</h3>
          <label>
            <span>Subject / विषय</span>
            <input
              placeholder="e.g. Question regarding profile verification"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              maxLength={200}
              required
            />
          </label>
          <label>
            <span>Message / विवरण</span>
            <textarea
              rows={4}
              placeholder="Please describe your question or issue in detail..."
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              required
            />
          </label>

          {error && <div className="error">{error}</div>}

          <button type="submit" disabled={submitting}>
            <Icon name="check" size={16} />
            <span>{submitting ? "Submitting Query..." : "Submit Query / भेजें"}</span>
          </button>
        </form>
      )}

      <div style={{ marginTop: "1.5rem" }}>
        <h3 style={{ fontSize: "1.2rem", margin: "0 0 0.85rem" }}>My Support Tickets</h3>

        {loading && (
          <div style={{ textAlign: "center", padding: "2rem" }}>
            <p className="muted">Loading tickets...</p>
          </div>
        )}

        {!loading && tickets.length === 0 && (
          <div className="card" style={{ textAlign: "center", padding: "3rem 1.5rem" }}>
            <Icon name="message-circle" size={36} color="#D1D5DB" />
            <p className="muted" style={{ marginTop: "0.75rem" }}>No tickets raised yet.</p>
          </div>
        )}

        <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
          {tickets.map((t) => (
            <Link to={`/support/${t.id}`} key={t.id} style={{ textDecoration: "none" }}>
              <div className="card" style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "1rem" }}>
                <div>
                  <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "0.25rem" }}>
                    <span
                      style={{
                        fontSize: "0.72rem",
                        fontWeight: 700,
                        padding: "2px 8px",
                        borderRadius: 999,
                        background: t.status === "OPEN" ? "var(--accent-soft)" : "var(--hairline)",
                        color: t.status === "OPEN" ? "var(--auth-crimson)" : "var(--text-muted)",
                      }}
                    >
                      {t.status}
                    </span>
                    <strong style={{ fontSize: "0.95rem", color: "var(--text)" }}>{t.subject}</strong>
                  </div>
                  <span className="muted small">Updated {timeAgo(t.updatedAt || t.createdAt)}</span>
                </div>

                <Icon name="chevron-right" size={18} color="#9CA3AF" />
              </div>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}

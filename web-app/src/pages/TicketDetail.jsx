import React, { useEffect, useRef, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { ticketAPI } from "../api";
import { Icon } from "../components/Icons";

function formatTime(iso) {
  if (!iso) return "";
  return new Date(iso).toLocaleDateString() + " " + new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

export default function TicketDetail() {
  const { id } = useParams();
  const [ticket, setTicket] = useState(null);
  const [loading, setLoading] = useState(true);
  const [reply, setReply] = useState("");
  const [sending, setSending] = useState(false);
  const [reopening, setReopening] = useState(false);
  const [error, setError] = useState("");
  const bottomRef = useRef(null);

  function load() {
    setLoading(true);
    ticketAPI
      .get(id)
      .then(setTicket)
      .catch(() => setError("Could not load this ticket"))
      .finally(() => setLoading(false));
  }

  useEffect(load, [id]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }, [ticket?.messages?.length]);

  async function handleReply(e) {
    e.preventDefault();
    if (!reply.trim()) return;
    setSending(true);
    setError("");
    try {
      const updated = await ticketAPI.addMessage(id, reply.trim());
      setTicket(updated);
      setReply("");
    } catch {
      setError("Could not send this message");
    } finally {
      setSending(false);
    }
  }

  async function handleReopen() {
    setReopening(true);
    setError("");
    try {
      const updated = await ticketAPI.reopen(id);
      setTicket(updated);
    } catch {
      setError("Could not reopen this ticket");
    } finally {
      setReopening(false);
    }
  }

  if (loading) {
    return (
      <div style={{ textAlign: "center", padding: "4rem" }}>
        <p className="muted">Loading conversation...</p>
      </div>
    );
  }

  if (error && !ticket) {
    return (
      <div className="card" style={{ textAlign: "center", padding: "3rem" }}>
        <h3 style={{ color: "var(--danger)" }}>{error}</h3>
        <Link to="/support">
          <button className="secondary small">&larr; Back to Support</button>
        </Link>
      </div>
    );
  }

  if (!ticket) return null;

  return (
    <div className="content-narrow">
      <Link to="/support" className="muted small" style={{ display: "inline-flex", alignItems: "center", gap: "0.35rem", marginBottom: "1rem", fontWeight: 600 }}>
        <Icon name="arrow-left" size={15} /> Back to Support
      </Link>

      <div className="card">
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: "0.75rem", borderBottom: "1px solid var(--hairline)", paddingBottom: "1rem" }}>
          <div>
            <h2 style={{ margin: "0 0 0.25rem", fontSize: "1.3rem" }}>{ticket.subject}</h2>
            <span className="muted small">Ticket #{ticket.id} • Created {formatTime(ticket.createdAt)}</span>
          </div>

          <span
            style={{
              fontSize: "0.75rem",
              fontWeight: 700,
              padding: "4px 10px",
              borderRadius: 999,
              background: ticket.status === "OPEN" ? "var(--accent-soft)" : "var(--hairline)",
              color: ticket.status === "OPEN" ? "var(--auth-crimson)" : "var(--text-muted)",
            }}
          >
            {ticket.status}
          </span>
        </div>

        {/* Message Thread */}
        <div className="ticket-thread-box">
          {(ticket.messages || []).map((m) => {
            const isMine = m.senderType === "USER";
            return (
              <div key={m.id} className={`ticket-bubble ${isMine ? "mine" : ""}`}>
                <div className="ticket-bubble-meta">
                  <strong>{isMine ? "You" : m.senderName || "Support Team"}</strong>
                  <span>{formatTime(m.createdAt)}</span>
                </div>
                <p className="ticket-bubble-text">{m.message}</p>
              </div>
            );
          })}
          <div ref={bottomRef} />
        </div>

        {error && <div className="error" style={{ marginBottom: "1rem" }}>{error}</div>}

        {/* Reply Box / Reopen Action */}
        {ticket.status === "OPEN" ? (
          <form onSubmit={handleReply} style={{ borderTop: "1px solid var(--hairline)", paddingTop: "1rem", display: "flex", flexDirection: "column", gap: "0.75rem" }}>
            <textarea
              rows={3}
              placeholder="Type your reply message..."
              value={reply}
              onChange={(e) => setReply(e.target.value)}
              required
            />
            <div style={{ display: "flex", justifyContent: "flex-end" }}>
              <button type="submit" disabled={sending || !reply.trim()}>
                <Icon name="arrow-right" size={15} />
                <span>{sending ? "Sending..." : "Send Reply"}</span>
              </button>
            </div>
          </form>
        ) : (
          <div style={{ borderTop: "1px solid var(--hairline)", paddingTop: "1rem", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <span className="muted small">This ticket is currently marked as resolved.</span>
            <button type="button" className="secondary small" onClick={handleReopen} disabled={reopening}>
              {reopening ? "Reopening..." : "Reopen Ticket"}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

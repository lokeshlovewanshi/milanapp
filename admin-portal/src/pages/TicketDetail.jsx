import { useEffect, useRef, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { api } from "../api";

function formatTime(iso) {
  if (!iso) return "";
  return new Date(iso).toLocaleString();
}

export default function TicketDetail() {
  const { id } = useParams();
  const [ticket, setTicket] = useState(null);
  const [loading, setLoading] = useState(true);
  const [reply, setReply] = useState("");
  const [sending, setSending] = useState(false);
  const [closing, setClosing] = useState(false);
  const [error, setError] = useState("");
  const bottomRef = useRef(null);

  function load() {
    setLoading(true);
    api
      .getTicket(id)
      .then(setTicket)
      .catch(() => setError("Could not load this ticket"))
      .finally(() => setLoading(false));
  }

  useEffect(load, [id]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ block: "nearest" });
  }, [ticket?.messages?.length]);

  async function handleReply() {
    if (!reply.trim()) return;
    setSending(true);
    setError("");
    try {
      const updated = await api.replyTicket(id, reply.trim());
      setTicket(updated);
      setReply("");
    } catch {
      setError("Could not send this reply");
    } finally {
      setSending(false);
    }
  }

  async function handleClose() {
    setClosing(true);
    setError("");
    try {
      await api.closeTicket(id);
      load();
    } catch {
      setError("Could not close this ticket");
    } finally {
      setClosing(false);
    }
  }

  if (loading) return <p className="muted">Loading...</p>;
  if (error && !ticket) return <p className="error">{error}</p>;
  if (!ticket) return null;

  return (
    <div>
      <Link to="/tickets" className="back-link">
        &larr; Back to tickets
      </Link>

      <div className="card detail-card">
        <div className="detail-header">
          <h1>{ticket.subject}</h1>
          <span className={`badge ${ticket.status === "OPEN" ? "badge-pending" : "badge-verified"}`}>
            {ticket.status}
          </span>
        </div>
        <div className="muted">
          {ticket.profileName || "(no name)"} · {ticket.displayId} · {ticket.profileEmail}
        </div>

        <div className="ticket-thread">
          {ticket.messages?.map((m) => (
            <div
              key={m.id}
              className={`ticket-message ${m.senderType === "ADMIN" ? "ticket-message-admin" : "ticket-message-user"}`}
            >
              <div className="ticket-message-meta">
                <strong>{m.senderName || (m.senderType === "ADMIN" ? "Support Team" : "Member")}</strong>
                <span className="muted small">{formatTime(m.createdAt)}</span>
              </div>
              <p>{m.message}</p>
            </div>
          ))}
          <div ref={bottomRef} />
        </div>

        {error && <p className="error">{error}</p>}

        <div className="ticket-reply">
          <textarea
            rows={3}
            placeholder="Write a reply..."
            value={reply}
            onChange={(e) => setReply(e.target.value)}
          />
          <div className="detail-actions">
            <button onClick={handleReply} disabled={sending || !reply.trim()}>
              {sending ? "Sending..." : "Send reply"}
            </button>
            {ticket.status === "OPEN" ? (
              <button className="danger" onClick={handleClose} disabled={closing}>
                {closing ? "Closing..." : "Close ticket"}
              </button>
            ) : (
              <span className="muted small" style={{ alignSelf: "center" }}>
                Closed - the member can reopen it from their side if needed.
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

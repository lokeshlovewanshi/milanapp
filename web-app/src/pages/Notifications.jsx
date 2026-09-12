import React, { useEffect, useState } from "react";
import { notificationAPI } from "../api";
import { Icon } from "../components/Icons";

function timeAgo(iso) {
  if (!iso) return "";
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "Just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(iso).toLocaleDateString();
}

export default function Notifications() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(0);
  const [marking, setMarking] = useState(false);

  function load() {
    setLoading(true);
    notificationAPI
      .list(page, 20)
      .then(setData)
      .finally(() => setLoading(false));
  }

  useEffect(load, [page]);

  async function markAllRead() {
    setMarking(true);
    try {
      await notificationAPI.markAllRead();
      load();
    } finally {
      setMarking(false);
    }
  }

  const list = data?.content || [];

  return (
    <div className="content-narrow">
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.25rem" }}>
        <div>
          <h1 className="detail-profile-name" style={{ fontSize: "1.8rem" }}>
            Notifications (सूचनाएं)
          </h1>
          <p className="muted" style={{ margin: "0.2rem 0 0" }}>Stay updated on interests, matches, and activity.</p>
        </div>

        {list.some((n) => !n.read) && (
          <button className="small secondary" onClick={markAllRead} disabled={marking}>
            <Icon name="check" size={14} />
            <span>{marking ? "Marking..." : "Mark all read"}</span>
          </button>
        )}
      </div>

      {loading && (
        <div style={{ textAlign: "center", padding: "3rem" }}>
          <p className="muted">Loading notifications...</p>
        </div>
      )}

      {!loading && list.length === 0 && (
        <div className="card" style={{ textAlign: "center", padding: "3.5rem 1.5rem" }}>
          <Icon name="bell" size={40} color="#D1D5DB" />
          <h3 style={{ marginTop: "1rem", color: "var(--text)" }}>No notifications yet</h3>
          <p className="muted">You will be notified when members send interest or accept your requests.</p>
        </div>
      )}

      <div>
        {list.map((n) => (
          <div className={`notif-row-card ${n.read ? "" : "unread"}`} key={n.id}>
            <div style={{ display: "flex", alignItems: "flex-start", gap: "0.75rem" }}>
              <div
                style={{
                  width: 32,
                  height: 32,
                  borderRadius: "50%",
                  background: n.read ? "var(--hairline)" : "var(--accent-soft)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  flexShrink: 0,
                }}
              >
                <Icon
                  name={
                    n.type === "LIKE" || n.type === "LIKE_RECEIVED"
                      ? "heart"
                      : n.type === "ACCEPT" || n.type === "LIKE_ACCEPTED"
                      ? "check"
                      : n.type === "PROFILE_VERIFIED"
                      ? "shield-check"
                      : "bell"
                  }
                  size={16}
                  color={
                    n.type === "PROFILE_VERIFIED"
                      ? "#10B981"
                      : n.read
                      ? "#6B7280"
                      : "#A5122F"
                  }
                />
              </div>

              <div style={{ flex: 1 }}>
                <div className="notif-title-line">{n.title}</div>
                <div className="notif-msg">{n.message}</div>
                <div className="notif-time">{timeAgo(n.createdAt)}</div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {data && data.totalPages > 1 && (
        <div style={{ display: "flex", justifyContent: "center", alignItems: "center", gap: "1rem", marginTop: "1.5rem" }}>
          <button className="secondary small" disabled={page === 0} onClick={() => setPage((p) => p - 1)}>
            Previous
          </button>
          <span className="muted small">
            Page {page + 1} of {data.totalPages}
          </span>
          <button className="secondary small" disabled={page + 1 >= data.totalPages} onClick={() => setPage((p) => p + 1)}>
            Next
          </button>
        </div>
      )}
    </div>
  );
}

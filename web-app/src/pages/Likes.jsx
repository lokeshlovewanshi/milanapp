import React, { useEffect, useState, useMemo } from "react";
import { Link } from "react-router-dom";
import { likeAPI } from "../api";
import { Icon } from "../components/Icons";
import ProfileRow from "../components/ProfileRow";

function timeAgo(dateString) {
  if (!dateString) return "";
  const diff = Date.now() - new Date(dateString).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "Just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}d ago`;
  return new Date(dateString).toLocaleDateString();
}

function normalise(item) {
  const p = item.likedProfile || item.profile || item.user || {};
  let status = String(item.status ?? "").toLowerCase();
  if (status === "rejected") status = "declined";
  return { raw: item, profile: p, status, at: item.likedAt || item.liked_at || item.createdAt };
}

export default function Likes() {
  const [tab, setTab] = useState("received");
  const [received, setReceived] = useState([]);
  const [sent, setSent] = useState([]);
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState("recent");
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState(null);

  function load() {
    setLoading(true);
    Promise.all([likeAPI.getReceivedLikes(), likeAPI.getSentLikes()])
      .then(([recRes, sentRes]) => {
        const clean = (res) => (Array.isArray(res) ? res : res?.content || []).map(normalise);
        setReceived(clean(recRes));
        setSent(clean(sentRes));
      })
      .finally(() => setLoading(false));
  }

  useEffect(load, []);

  async function act(fn, id) {
    setBusyId(id);
    try {
      await fn();
      load();
    } finally {
      setBusyId(null);
    }
  }

  const list = tab === "received" ? received : sent;

  const filteredList = useMemo(() => {
    let res = list.filter((item) => {
      const name = (item.profile.name || item.profile.fullName || "").toLowerCase();
      const code = String(item.profile.id || "").toLowerCase();
      const q = query.trim().toLowerCase();
      if (!q) return true;
      return name.includes(q) || code.includes(q);
    });

    if (sort === "name") {
      res.sort((a, b) => (a.profile.name || "").localeCompare(b.profile.name || ""));
    } else {
      res.sort((a, b) => new Date(b.at || 0).getTime() - new Date(a.at || 0).getTime());
    }

    return res;
  }, [list, query, sort]);

  return (
    <div className="content-narrow">
      <div className="section-header-simple" style={{ marginBottom: "1.25rem" }}>
        <h1 className="detail-profile-name" style={{ fontSize: "1.8rem" }}>
          Interests (रुचि एवं अनुरोध)
        </h1>
        <p className="muted">Manage connection requests received from members and sent by you.</p>
      </div>

      {/* Segmented Tabs Header */}
      <div className="segmented-tabs-header">
        <button
          className={`segmented-tab ${tab === "received" ? "active" : ""}`}
          onClick={() => setTab("received")}
        >
          <Icon name="user" size={17} />
          <span>Received ({received.length})</span>
        </button>
        <button
          className={`segmented-tab ${tab === "sent" ? "active" : ""}`}
          onClick={() => setTab("sent")}
        >
          <Icon name="heart" size={17} />
          <span>Sent ({sent.length})</span>
        </button>
      </div>

      {/* Search & Sort Controls */}
      <div style={{ display: "flex", gap: "0.75rem", alignItems: "center", marginBottom: "1.25rem" }}>
        <div className="input-field-wrap" style={{ flex: 1 }}>
          <span className="input-field-icon">
            <Icon name="search" size={16} />
          </span>
          <input
            placeholder="Search by name or GM ID..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </div>

        <button
          type="button"
          className="secondary small"
          style={{ height: 38, flexShrink: 0 }}
          onClick={() => setSort((s) => (s === "recent" ? "name" : "recent"))}
          title="Change sort"
        >
          Sort: {sort === "recent" ? "Recent" : "Name"}
        </button>
      </div>

      {loading && (
        <div style={{ textAlign: "center", padding: "3rem" }}>
          <p className="muted">Loading requests...</p>
        </div>
      )}

      {!loading && filteredList.length === 0 && (
        <div className="card" style={{ textAlign: "center", padding: "3.5rem 1.5rem" }}>
          <Icon name="heart" size={40} color="#D1D5DB" />
          <h3 style={{ marginTop: "1rem", color: "var(--text)" }}>
            {query ? "No matching requests" : tab === "received" ? "No interests received yet" : "You haven't sent any requests"}
          </h3>
          <p className="muted">
            {tab === "received"
              ? "When other members connect with you, they will appear here."
              : "Explore matches and send connection requests to begin."}
          </p>
          <Link to="/browse">
            <button className="small" style={{ marginTop: "0.5rem" }}>
              Browse Profiles
            </button>
          </Link>
        </div>
      )}

      {/* Requests List */}
      <div>
        {filteredList.map((item) => {
          const p = item.profile;
          const id = p.id;
          const status = item.status;

          let actionBtn = null;
          if (tab === "received") {
            if (status === "pending") {
              actionBtn = (
                <div style={{ display: "flex", gap: "0.4rem" }}>
                  <button
                    type="button"
                    className="small"
                    disabled={busyId === id}
                    onClick={() => act(() => likeAPI.acceptLike(id), id)}
                  >
                    Accept
                  </button>
                  <button
                    type="button"
                    className="small secondary"
                    disabled={busyId === id}
                    onClick={() => act(() => likeAPI.declineLike(id), id)}
                  >
                    Decline
                  </button>
                </div>
              );
            } else if (status === "accepted") {
              actionBtn = (
                <button type="button" className="small btn-connected-action" style={{ cursor: "default" }}>
                  <Icon name="check" size={14} color="#047857" /> Connected
                </button>
              );
            }
          } else {
            if (status === "pending") {
              actionBtn = (
                <button
                  type="button"
                  className="small btn-requested-action"
                  disabled={busyId === id}
                  onClick={() => act(() => likeAPI.unlikeProfile(id), id)}
                  title="Click to withdraw request"
                >
                  Withdraw
                </button>
              );
            } else if (status === "accepted") {
              actionBtn = (
                <button type="button" className="small btn-connected-action" style={{ cursor: "default" }}>
                  <Icon name="check" size={14} color="#047857" /> Connected
                </button>
              );
            }
          }

          return (
            <ProfileRow
              key={`${id}-${status}`}
              profile={p}
              meta={timeAgo(item.at)}
              action={actionBtn}
            />
          );
        })}
      </div>
    </div>
  );
}

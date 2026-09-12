import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { shortlistAPI, likeAPI } from "../api";
import { Icon, HeartIcon } from "../components/Icons";
import ProfileRow from "../components/ProfileRow";

export default function Shortlist() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState(null);

  function load() {
    setLoading(true);
    shortlistAPI
      .getAll()
      .then((res) => setItems(Array.isArray(res) ? res : res?.content || []))
      .finally(() => setLoading(false));
  }

  useEffect(load, []);

  async function remove(id) {
    setBusyId(id);
    try {
      await shortlistAPI.remove(id);
      setItems((prev) => prev.filter((item) => (item.shortlistedProfile || item.profile || item || {}).id !== id));
    } finally {
      setBusyId(null);
    }
  }

  async function sendConnect(id) {
    setBusyId(id);
    try {
      await likeAPI.likeProfile(id);
      setItems((prev) =>
        prev.map((item) => {
          const p = item.shortlistedProfile || item.profile || item || {};
          return p.id === id ? { ...item, isLiked: true } : item;
        })
      );
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div className="content-narrow">
      <div className="section-header-simple" style={{ marginBottom: "1.25rem" }}>
        <h1 className="detail-profile-name" style={{ fontSize: "1.8rem" }}>
          Shortlist (शॉर्टलिस्ट)
        </h1>
        <p className="muted">Profiles you have bookmarked for future reference.</p>
      </div>

      {loading && (
        <div style={{ textAlign: "center", padding: "3rem" }}>
          <p className="muted">Loading shortlisted profiles...</p>
        </div>
      )}

      {!loading && items.length === 0 && (
        <div className="card" style={{ textAlign: "center", padding: "3.5rem 1.5rem" }}>
          <Icon name="bookmark" size={40} color="#D1D5DB" />
          <h3 style={{ marginTop: "1rem", color: "var(--text)" }}>Your shortlist is empty</h3>
          <p className="muted">Bookmark candidate profiles while browsing to review them here anytime.</p>
          <Link to="/browse">
            <button className="small" style={{ marginTop: "0.5rem" }}>
              Browse Matches
            </button>
          </Link>
        </div>
      )}

      <div>
        {items.map((item) => {
          const profile = item.shortlistedProfile || item.profile || item;
          const id = profile.id;
          const isLiked = item.isLiked || profile.isLiked;

          return (
            <ProfileRow
              key={id}
              profile={profile}
              action={
                <div style={{ display: "flex", gap: "0.4rem" }}>
                  {!isLiked ? (
                    <button
                      type="button"
                      className="small"
                      disabled={busyId === id}
                      onClick={() => sendConnect(id)}
                    >
                      <HeartIcon size={14} /> Connect
                    </button>
                  ) : (
                    <button type="button" className="small secondary" disabled>
                      Requested
                    </button>
                  )}
                </div>
              }
              onDismiss={() => remove(id)}
              dismissLabel="Remove from shortlist"
            />
          );
        })}
      </div>
    </div>
  );
}

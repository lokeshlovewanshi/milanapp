import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../api";
import AccountStatus from "../components/AccountStatus";
import ContactMessageModal from "../components/ContactMessageModal";
import EditProfileModal from "../components/EditProfileModal";

function timeAgo(dateString) {
  if (!dateString) return "-";
  const diff = Date.now() - new Date(dateString).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "Just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

export default function Queue() {
  const [page, setPage] = useState(0);
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [verifyingId, setVerifyingId] = useState(null);
  const [viewMode, setViewMode] = useState("table"); // "table" (default monitoring) or "grid"
  const [searchTerm, setSearchTerm] = useState("");
  const [blockFilter, setBlockFilter] = useState("all"); // "all", "hide_blocked", "only_blocked"
  const [updatingBlockId, setUpdatingBlockId] = useState(null);
  const [actionMessage, setActionMessage] = useState(null);
  const [contactingProfile, setContactingProfile] = useState(null);
  const [editingProfileId, setEditingProfileId] = useState(null);

  function load(p) {
    setLoading(true);
    api
      .unverifiedProfiles(p, 20)
      .then((res) => {
        setData(res);
      })
      .finally(() => setLoading(false));
  }

  useEffect(() => load(page), [page]);

  async function handleVerify(id, name) {
    setVerifyingId(id);
    setActionMessage(null);
    try {
      await api.verifyProfile(id);
      setData((prev) => ({
        ...prev,
        content: prev.content.filter((p) => p.id !== id),
        totalElements: Math.max(0, (prev.totalElements || 1) - 1),
      }));
      setActionMessage(`✓ Profile "${name || id}" verified successfully.`);
      setTimeout(() => setActionMessage(null), 4000);
    } catch {
      setActionMessage(`❌ Failed to verify profile.`);
    } finally {
      setVerifyingId(null);
    }
  }

  async function handleToggleBlock(profile) {
    if (!profile || !profile.id) return;
    const isCurrentlyBlocked = Boolean(profile.blocked);
    const confirmPrompt = isCurrentlyBlocked
      ? `Are you sure you want to unblock "${profile.name || profile.displayId || profile.id}"?`
      : `Are you sure you want to block "${profile.name || profile.displayId || profile.id}"?`;

    if (!window.confirm(confirmPrompt)) return;

    setUpdatingBlockId(profile.id);
    setActionMessage(null);
    try {
      const updated = isCurrentlyBlocked
        ? await api.unblockProfile(profile.id)
        : await api.blockProfile(profile.id);

      const nextBlocked = updated?.blocked !== undefined ? updated.blocked : !isCurrentlyBlocked;
      setData((prev) => {
        if (!prev || !prev.content) return prev;
        return {
          ...prev,
          content: prev.content.map((p) =>
            p.id === profile.id ? { ...p, blocked: nextBlocked } : p
          ),
        };
      });
      setActionMessage(
        `✓ Profile "${profile.name || profile.id}" has been ${nextBlocked ? "blocked" : "unblocked"} successfully.`
      );
      setTimeout(() => setActionMessage(null), 4000);
    } catch (err) {
      console.error("Failed to toggle block status:", err);
      setActionMessage(`❌ Failed to ${isCurrentlyBlocked ? "unblock" : "block"} profile.`);
      setTimeout(() => setActionMessage(null), 4000);
    } finally {
      setUpdatingBlockId(null);
    }
  }

  function handleProfileUpdated(updated) {
    if (!updated || !updated.id) return;
    setData((prev) => {
      if (!prev || !prev.content) return prev;
      return {
        ...prev,
        content: prev.content.map((p) =>
          p.id === updated.id
            ? {
                ...p,
                name: updated.name ?? p.name,
                gender: updated.gender ?? p.gender,
                mobileNo: updated.mobileNo ?? updated.mobileNumber ?? p.mobileNo,
                email: updated.email ?? p.email,
              }
            : p
        ),
      };
    });
    setActionMessage(`✓ Profile "${updated.name || updated.id}" updated successfully.`);
    setTimeout(() => setActionMessage(null), 4000);
  }

  const list = data?.content || [];
  const filteredList = list.filter((p) => {
    if (blockFilter === "hide_blocked" && p.blocked) return false;
    if (blockFilter === "only_blocked" && !p.blocked) return false;
    if (!searchTerm.trim()) return true;
    const q = searchTerm.toLowerCase();
    return (
      p.name?.toLowerCase().includes(q) ||
      p.displayId?.toLowerCase().includes(q) ||
      p.mobileNo?.includes(q) ||
      p.email?.toLowerCase().includes(q)
    );
  });

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 style={{ margin: "0 0 0.25rem 0" }}>User Monitoring &amp; Verification Queue</h1>
          <p className="muted" style={{ margin: 0 }}>
            Newly registered profiles waiting for approval (Sorted newest first).
          </p>
        </div>

        <div className="page-header-actions">
          <Link to="/profiles/new">
            <button type="button" className="primary small">
              ➕ Create Profile
            </button>
          </Link>
          <div className="view-toggle">
            <button
              type="button"
              className={viewMode === "table" ? "small primary" : "small secondary"}
              onClick={() => setViewMode("table")}
            >
              📊 Monitoring List
            </button>
            <button
              type="button"
              className={viewMode === "grid" ? "small primary" : "small secondary"}
              onClick={() => setViewMode("grid")}
            >
              🗂️ Cards View
            </button>
          </div>
        </div>
      </div>

      {actionMessage && (
        <div className="success-banner">
          {actionMessage}
        </div>
      )}

      {/* Filter Bar */}
      <div className="filter-bar" style={{ display: "flex", flexWrap: "wrap", gap: "0.5rem", alignItems: "center" }}>
        <input
          type="text"
          placeholder="Filter by name, mobile, display ID..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="input-field"
          style={{ flex: "1 1 240px", maxWidth: "380px", padding: "0.52rem 0.85rem", fontSize: "0.88rem" }}
        />

        {/* 1-Click Hide/Show Blocked Toggle Button */}
        <button
          type="button"
          onClick={() => setBlockFilter((prev) => (prev === "hide_blocked" ? "all" : "hide_blocked"))}
          style={{
            background: blockFilter === "hide_blocked" ? "#FEF3C7" : "#F3F4F6",
            color: blockFilter === "hide_blocked" ? "#92400E" : "#374151",
            border: blockFilter === "hide_blocked" ? "1px solid #FCD34D" : "1px solid #D1D5DB",
            padding: "0.52rem 0.75rem",
            borderRadius: "6px",
            fontSize: "0.85rem",
            fontWeight: 600,
            cursor: "pointer",
            display: "inline-flex",
            alignItems: "center",
            gap: "0.3rem",
            whiteSpace: "nowrap",
          }}
          title={
            blockFilter === "hide_blocked"
              ? "Blocked profiles are currently HIDDEN. Click to show blocked accounts."
              : "Click to hide blocked accounts from the table"
          }
        >
          <span>{blockFilter === "hide_blocked" ? "🚫" : "👁️"}</span>
          {blockFilter === "hide_blocked" ? "Blocked: Hidden (Show)" : "Hide Blocked"}
        </button>

        {/* Detailed Block Status Filter Dropdown */}
        <select
          value={blockFilter}
          onChange={(e) => setBlockFilter(e.target.value)}
          className="input-field"
          style={{
            width: "auto",
            minWidth: "165px",
            padding: "0.52rem 0.75rem",
            borderRadius: "6px",
            border: "1px solid #D1D5DB",
            fontSize: "0.85rem",
            fontWeight: 500,
            cursor: "pointer",
            background: blockFilter !== "all" ? "#FFFBEB" : "white",
          }}
          title="Filter queue by Block Status"
        >
          <option value="all">🛡️ Block: All Profiles</option>
          <option value="hide_blocked">✅ Hide Blocked (Active only)</option>
          <option value="only_blocked">🚫 Blocked Only</option>
        </select>

        <span className="muted small" style={{ marginLeft: "auto", fontWeight: 500 }}>
          {data ? `${filteredList.length} of ${data.totalElements || list.length} pending profiles` : ""}
        </span>
      </div>

      {loading && <p className="muted">Loading verification queue...</p>}

      {!loading && filteredList.length === 0 && (
        <div className="card" style={{ padding: "2.5rem", textAlign: "center", color: "#6B7280" }}>
          {searchTerm || blockFilter !== "all" ? (
            <>
              <p style={{ margin: "0 0 0.5rem 0" }}>No pending profiles match your search or filter.</p>
              <button
                type="button"
                className="secondary small"
                onClick={() => {
                  setSearchTerm("");
                  setBlockFilter("all");
                }}
              >
                Reset Filters
              </button>
            </>
          ) : (
            "🎉 Great job! The verification queue is currently empty."
          )}
        </div>
      )}

      {/* 1. Monitoring Table View */}
      {!loading && viewMode === "table" && filteredList.length > 0 && (
        <div className="table-container">
          <table className="data-table">
            <thead>
              <tr style={{ background: "#F9FAFB", borderBottom: "1px solid #E5E7EB" }}>
                <th style={{ padding: "0.75rem 1rem", fontWeight: "600", fontSize: "0.85rem", color: "#374151" }}>ID</th>
                <th style={{ padding: "0.75rem 1rem", fontWeight: "600", fontSize: "0.85rem", color: "#374151" }}>Name</th>
                <th style={{ padding: "0.75rem 1rem", fontWeight: "600", fontSize: "0.85rem", color: "#374151" }}>Account status</th>
                <th style={{ padding: "0.75rem 1rem", fontWeight: "600", fontSize: "0.85rem", color: "#374151" }}>Mobile No</th>
                <th style={{ padding: "0.75rem 1rem", fontWeight: "600", fontSize: "0.85rem", color: "#374151" }}>Is Photo</th>
                <th style={{ padding: "0.75rem 1rem", fontWeight: "600", fontSize: "0.85rem", color: "#374151" }}>Registered</th>
                <th style={{ padding: "0.75rem 1rem", fontWeight: "600", fontSize: "0.85rem", color: "#374151", textAlign: "center" }}>Reach / Contact</th>
                <th style={{ padding: "0.75rem 1rem", fontWeight: "600", fontSize: "0.85rem", color: "#374151", textAlign: "center" }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredList.map((p) => {
                const hasPhoto = Boolean(p.isPhoto || p.profileImage);
                return (
                  <tr
                    key={p.id}
                    style={
                      p.blocked
                        ? { background: "#FFF5F5", borderBottom: "1px solid #FECACA" }
                        : { borderBottom: "1px solid #F3F4F6", transition: "background 0.15s" }
                    }
                  >
                    {/* ID */}
                    <td style={{ padding: "0.85rem 1rem", whiteSpace: "nowrap" }}>
                      <Link to={`/profiles/${p.id}`} style={{ fontWeight: "600", color: "#A5122F" }}>
                        {p.displayId || `GM${String(p.id).padStart(5, "0")}`}
                      </Link>
                    </td>

                    {/* Name */}
                    <td style={{ padding: "0.85rem 1rem" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: "0.6rem" }}>
                        <Link to={`/profiles/${p.id}`} style={{ fontWeight: "500", color: "#111827", textDecoration: "none" }}>
                          {p.name || "(No name)"}
                        </Link>
                        {p.gender && (
                          <span
                            style={{
                              fontSize: "11px",
                              padding: "1px 6px",
                              borderRadius: "10px",
                              background: p.gender.toLowerCase() === "female" ? "#FCE7F3" : "#E0E7FF",
                              color: p.gender.toLowerCase() === "female" ? "#9D174D" : "#3730A3",
                              fontWeight: "600",
                            }}
                          >
                            {p.gender}
                          </span>
                        )}
                        {p.blocked && <span className="badge badge-blocked">🚫 Blocked</span>}
                      </div>
                      {p.email && <div className="muted small">{p.email}</div>}
                    </td>

                    <td style={{ padding: "0.85rem 1rem" }}>
                      <AccountStatus profile={p} />
                    </td>

                    {/* Mobile No */}
                    <td style={{ padding: "0.85rem 1rem", whiteSpace: "nowrap", fontFamily: "monospace", fontSize: "0.9rem" }}>
                      {p.mobileNo || <span className="muted">-</span>}
                    </td>

                    {/* Is Photo */}
                    <td style={{ padding: "0.85rem 1rem", whiteSpace: "nowrap" }}>
                      {hasPhoto ? (
                        <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                          <img
                            src={p.profileImage || "/placeholder.svg"}
                            alt=""
                            style={{
                              width: "34px",
                              height: "34px",
                              borderRadius: "6px",
                              objectFit: "cover",
                              border: "1px solid #E5E7EB",
                            }}
                          />
                          <span
                            style={{
                              color: "#065F46",
                              background: "#D1FAE5",
                              fontSize: "12px",
                              fontWeight: "600",
                              padding: "2px 6px",
                              borderRadius: "4px",
                            }}
                          >
                            Yes
                          </span>
                        </div>
                      ) : (
                        <span
                          style={{
                            color: "#991B1B",
                            background: "#FEE2E2",
                            fontSize: "12px",
                            fontWeight: "600",
                            padding: "2px 6px",
                            borderRadius: "4px",
                          }}
                        >
                          No Photo
                        </span>
                      )}
                    </td>

                    {/* Registered */}
                    <td style={{ padding: "0.85rem 1rem", whiteSpace: "nowrap", color: "#4B5563", fontSize: "0.85rem" }}>
                      {timeAgo(p.createdAt)}
                    </td>

                    {/* Reach / Contact Options */}
                    <td style={{ padding: "0.85rem 1rem", textAlign: "center", whiteSpace: "nowrap" }}>
                      <div style={{ display: "inline-flex", gap: "0.4rem", alignItems: "center" }}>
                        <button
                          type="button"
                          onClick={() => setContactingProfile(p)}
                          title="Message on WhatsApp / Choose template"
                          style={{
                            background: "#25D366",
                            color: "#FFFFFF",
                            border: "none",
                            borderRadius: "6px",
                            padding: "0.4rem 0.65rem",
                            fontWeight: "600",
                            fontSize: "0.82rem",
                            display: "inline-flex",
                            alignItems: "center",
                            gap: "0.25rem",
                            cursor: "pointer",
                            boxShadow: "0 1px 2px rgba(0,0,0,0.05)",
                          }}
                        >
                          <span>💬</span> WhatsApp
                        </button>
                        {p.mobileNo && (
                          <a
                            href={`tel:${p.mobileNo}`}
                            title={`Direct Call: ${p.mobileNo}`}
                            style={{
                              background: "#3B82F6",
                              color: "#FFFFFF",
                              borderRadius: "6px",
                              padding: "0.4rem 0.55rem",
                              fontWeight: "600",
                              fontSize: "0.82rem",
                              textDecoration: "none",
                              display: "inline-flex",
                              alignItems: "center",
                              gap: "0.2rem",
                            }}
                          >
                            <span>📞</span> Call
                          </a>
                        )}
                        {p.email && (
                          <button
                            type="button"
                            onClick={() => setContactingProfile(p)}
                            title={`Email: ${p.email}`}
                            style={{
                              background: "#6B7280",
                              color: "#FFFFFF",
                              border: "none",
                              borderRadius: "6px",
                              padding: "0.4rem 0.55rem",
                              fontWeight: "600",
                              fontSize: "0.82rem",
                              display: "inline-flex",
                              alignItems: "center",
                              cursor: "pointer",
                            }}
                          >
                            <span>✉️</span>
                          </button>
                        )}
                      </div>
                    </td>

                    {/* Last Column: Actions (Edit, Block/Unblock & Verify) */}
                    <td style={{ padding: "0.85rem 1rem", textAlign: "center", whiteSpace: "nowrap" }}>
                      <div style={{ display: "inline-flex", gap: "0.35rem", alignItems: "center" }}>
                        <button
                          type="button"
                          onClick={() => setEditingProfileId(p.id)}
                          title="Edit this profile details"
                          style={{
                            background: "#A5122F",
                            color: "#FFFFFF",
                            border: "none",
                            borderRadius: "6px",
                            padding: "0.45rem 0.65rem",
                            fontWeight: "600",
                            fontSize: "0.82rem",
                            display: "inline-flex",
                            alignItems: "center",
                            gap: "0.25rem",
                            cursor: "pointer",
                          }}
                        >
                          <span>✏️</span> Edit
                        </button>
                        <button
                          type="button"
                          onClick={() => handleToggleBlock(p)}
                          disabled={updatingBlockId === p.id}
                          title={p.blocked ? "Click to unblock profile" : "Click to block profile"}
                          style={{
                            background: p.blocked ? "#10B981" : "#FEE2E2",
                            color: p.blocked ? "#FFFFFF" : "#991B1B",
                            border: p.blocked ? "none" : "1px solid #FCA5A5",
                            borderRadius: "6px",
                            padding: "0.45rem 0.65rem",
                            fontWeight: "600",
                            fontSize: "0.82rem",
                            display: "inline-flex",
                            alignItems: "center",
                            gap: "0.2rem",
                            cursor: "pointer",
                          }}
                        >
                          {updatingBlockId === p.id ? "..." : p.blocked ? "✅ Unblock" : "🚫 Block"}
                        </button>
                        <button
                          type="button"
                          onClick={() => handleVerify(p.id, p.name)}
                          disabled={verifyingId === p.id}
                          title="Verify this profile now"
                          style={{
                            background: "#10B981",
                            color: "#FFFFFF",
                            border: "none",
                            borderRadius: "6px",
                            padding: "0.45rem 0.8rem",
                            fontWeight: "600",
                            fontSize: "0.82rem",
                            display: "inline-flex",
                            alignItems: "center",
                            gap: "0.3rem",
                            cursor: "pointer",
                            boxShadow: "0 1px 2px rgba(0,0,0,0.05)",
                          }}
                        >
                          {verifyingId === p.id ? "Verifying..." : "✓ Verify"}
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* 2. Cards Grid View */}
      {!loading && viewMode === "grid" && filteredList.length > 0 && (
        <div className="profile-grid">
          {filteredList.map((p) => {
            const hasPhoto = Boolean(p.isPhoto || p.profileImage);
            return (
              <div
                className="card profile-card"
                key={p.id}
                style={p.blocked ? { border: "1px solid #FECACA", background: "#FFF8F8" } : {}}
              >
                <img
                  src={p.profileImage || "/placeholder.svg"}
                  alt=""
                  className="profile-thumb"
                />
                <div className="profile-card-body">
                  <div style={{ display: "flex", alignItems: "center", gap: "0.4rem", flexWrap: "wrap" }}>
                    <Link to={`/profiles/${p.id}`} className="profile-name">
                      {p.name || "(no name)"}
                    </Link>
                    {p.blocked && <span className="badge badge-blocked">🚫 Blocked</span>}
                  </div>
                  <div className="muted">{p.displayId}</div>
                  <div className="muted">{p.gender}</div>
                  <div className="muted small">Mobile: {p.mobileNo || "-"}</div>
                  <div className="muted small">Photo: {hasPhoto ? "✓ Yes" : "❌ No"}</div>
                  <div className="muted small">{timeAgo(p.createdAt)}</div>
                </div>
                <div style={{ display: "flex", gap: "0.4rem", marginTop: "0.4rem" }}>
                  <button
                    type="button"
                    onClick={() => setContactingProfile(p)}
                    style={{
                      background: "#25D366",
                      color: "white",
                      flex: 1,
                      padding: "0.4rem",
                      fontSize: "0.8rem",
                      border: "none",
                      borderRadius: "6px",
                      cursor: "pointer",
                      fontWeight: 600,
                    }}
                  >
                    💬 WhatsApp
                  </button>
                  {p.mobileNo && (
                    <a
                      href={`tel:${p.mobileNo}`}
                      title={`Call ${p.mobileNo}`}
                      style={{
                        background: "#3B82F6",
                        color: "white",
                        padding: "0.4rem 0.6rem",
                        borderRadius: "6px",
                        fontSize: "0.8rem",
                        textDecoration: "none",
                        display: "inline-flex",
                        alignItems: "center",
                        fontWeight: 600,
                      }}
                    >
                      📞
                    </a>
                  )}
                </div>
                <div style={{ display: "flex", gap: "0.4rem", marginTop: "0.4rem" }}>
                  <button
                    type="button"
                    onClick={() => handleToggleBlock(p)}
                    disabled={updatingBlockId === p.id}
                    style={{
                      background: p.blocked ? "#10B981" : "#FEE2E2",
                      color: p.blocked ? "#FFFFFF" : "#991B1B",
                      border: p.blocked ? "none" : "1px solid #FCA5A5",
                      flex: 1,
                      padding: "0.45rem",
                      fontSize: "0.82rem",
                      borderRadius: "6px",
                      cursor: "pointer",
                      fontWeight: 600,
                    }}
                    title={p.blocked ? "Unblock account" : "Block account"}
                  >
                    {updatingBlockId === p.id ? "..." : p.blocked ? "✅ Unblock" : "🚫 Block"}
                  </button>
                </div>
                <div style={{ display: "flex", gap: "0.4rem", marginTop: "0.4rem" }}>
                  <button
                    type="button"
                    onClick={() => setEditingProfileId(p.id)}
                    style={{
                      background: "#A5122F",
                      color: "white",
                      flex: 1,
                      padding: "0.45rem",
                      fontSize: "0.82rem",
                      border: "none",
                      borderRadius: "6px",
                      cursor: "pointer",
                      fontWeight: 600,
                    }}
                  >
                    ✏️ Edit
                  </button>
                  <button
                    type="button"
                    onClick={() => handleVerify(p.id, p.name)}
                    disabled={verifyingId === p.id}
                    style={{
                      background: "#10B981",
                      color: "white",
                      flex: 1,
                      padding: "0.45rem",
                      fontSize: "0.82rem",
                      border: "none",
                      borderRadius: "6px",
                      cursor: "pointer",
                      fontWeight: 600,
                    }}
                  >
                    {verifyingId === p.id ? "Verifying..." : "✓ Verify"}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {data && data.totalPages > 1 && (
        <div className="pager" style={{ marginTop: "1.5rem" }}>
          <button disabled={page === 0} onClick={() => setPage((p) => p - 1)}>
            Previous
          </button>
          <span>
            Page {page + 1} of {Math.max(data.totalPages, 1)}
          </span>
          <button
            disabled={page + 1 >= data.totalPages}
            onClick={() => setPage((p) => p + 1)}
          >
            Next
          </button>
        </div>
      )}

      {contactingProfile && (
        <ContactMessageModal
          profile={contactingProfile}
          onClose={() => setContactingProfile(null)}
        />
      )}

      {editingProfileId && (
        <EditProfileModal
          profileId={editingProfileId}
          onClose={() => setEditingProfileId(null)}
          onSaved={handleProfileUpdated}
        />
      )}
    </div>
  );
}

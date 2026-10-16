import { useEffect, useState, useCallback } from "react";
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

export default function VerifiedProfiles() {
  const [page, setPage] = useState(0);
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState("table"); // "table" or "grid"
  const [searchTerm, setSearchTerm] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [actionMessage, setActionMessage] = useState(null);

  // Filters for table monitoring: Block status and Feed visibility
  const [blockFilter, setBlockFilter] = useState("all"); // "all", "hide_blocked", "only_blocked"
  const [visibilityFilter, setVisibilityFilter] = useState("all"); // "all", "visible_only", "hidden_only"

  // In-flight action tracking
  const [updatingBlockId, setUpdatingBlockId] = useState(null);
  const [updatingVisibilityId, setUpdatingVisibilityId] = useState(null);

  // Modals
  const [contactingProfile, setContactingProfile] = useState(null);
  const [editingProfileId, setEditingProfileId] = useState(null);

  // Debounce search input
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearch(searchTerm);
      setPage(0);
    }, 350);
    return () => clearTimeout(handler);
  }, [searchTerm]);

  const loadProfiles = useCallback(
    async (p, query) => {
      setLoading(true);
      try {
        // First try the dedicated /verified endpoint
        const res = await api.verifiedProfiles(query, p, 20);
        setData(res);
      } catch (err) {
        // Graceful fallback to allProfiles filtering verified if endpoint is 404/reloading
        console.warn("Falling back to allProfiles filter for verified:", err);
        try {
          const fallbackRes = await api.allProfiles(query, p, 20);
          if (fallbackRes && Array.isArray(fallbackRes.content)) {
            const verifiedOnly = fallbackRes.content.filter((item) => Boolean(item.verified));
            setData({
              ...fallbackRes,
              content: verifiedOnly,
              totalElements: verifiedOnly.length,
            });
          } else {
            setData(fallbackRes);
          }
        } catch (innerErr) {
          console.error("Failed to load verified profiles:", innerErr);
          setData({ content: [], totalPages: 0, totalElements: 0 });
        }
      } finally {
        setLoading(false);
      }
    },
    []
  );

  useEffect(() => {
    loadProfiles(page, debouncedSearch);
  }, [page, debouncedSearch, loadProfiles]);

  async function handleToggleBlock(profile) {
    if (!profile || !profile.id) return;
    const isCurrentlyBlocked = Boolean(profile.blocked);
    const confirmPrompt = isCurrentlyBlocked
      ? `Are you sure you want to unblock "${profile.name || profile.displayId || profile.id}"?`
      : `Are you sure you want to block "${profile.name || profile.displayId || profile.id}"? The user will be logged out and cannot browse matches.`;

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

  async function handleToggleVisibility(profile) {
    if (!profile || !profile.id) return;
    const nextHidden = !Boolean(profile.hidden);
    setUpdatingVisibilityId(profile.id);
    setActionMessage(null);
    try {
      const updated = await api.setProfileVisibility(profile.id, nextHidden);
      const isHidden = updated?.hidden !== undefined ? updated.hidden : nextHidden;
      setData((prev) => {
        if (!prev || !prev.content) return prev;
        return {
          ...prev,
          content: prev.content.map((p) =>
            p.id === profile.id ? { ...p, hidden: isHidden } : p
          ),
        };
      });
      setActionMessage(
        `✓ Profile "${profile.name || profile.id}" is now ${
          isHidden ? "hidden from member feeds" : "unhidden and visible to members"
        }.`
      );
      setTimeout(() => setActionMessage(null), 4000);
    } catch (err) {
      console.error("Failed to toggle visibility:", err);
      setActionMessage(`❌ Failed to update visibility for "${profile.name || profile.id}".`);
      setTimeout(() => setActionMessage(null), 4000);
    } finally {
      setUpdatingVisibilityId(null);
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
                city: updated.city ?? p.city,
                state: updated.state ?? p.state,
                profession: updated.profession ?? p.profession,
              }
            : p
        ),
      };
    });
    setActionMessage(`✓ Profile "${updated.name || updated.id}" updated successfully.`);
    setTimeout(() => setActionMessage(null), 4000);
  }

  const list = data?.content || [];
  const displayedProfiles = list.filter((p) => {
    if (blockFilter === "hide_blocked" && p.blocked) return false;
    if (blockFilter === "only_blocked" && !p.blocked) return false;
    if (visibilityFilter === "visible_only" && p.hidden) return false;
    if (visibilityFilter === "hidden_only" && !p.hidden) return false;
    return true;
  });

  return (
    <div>
      {/* Page Header */}
      <div className="page-header">
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: "0.6rem" }}>
            <h1 style={{ margin: "0 0 0.25rem 0" }}>Verified Profiles</h1>
            <span
              style={{
                background: "#D1FAE5",
                color: "#065F46",
                fontSize: "0.85rem",
                fontWeight: 700,
                padding: "3px 10px",
                borderRadius: "999px",
                display: "inline-flex",
                alignItems: "center",
                gap: "0.3rem",
              }}
            >
              ✅ Approved &amp; Live
            </span>
          </div>
          <p className="muted" style={{ margin: 0 }}>
            Directory of all verified members. Search, contact via WhatsApp/Call, and edit profile details.
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

      {/* Filter / Search Bar */}
      <div className="filter-bar" style={{ display: "flex", flexWrap: "wrap", gap: "0.5rem", alignItems: "center" }}>
        <div style={{ position: "relative", flex: "1 1 240px", maxWidth: "380px" }}>
          <input
            type="text"
            placeholder="Search by Name, Mobile, Email, or Profile ID (GM00382)..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="input-field"
            style={{
              width: "100%",
              padding: "0.52rem 2.2rem 0.52rem 0.85rem",
              borderRadius: "6px",
              border: "1px solid #D1D5DB",
              fontSize: "0.88rem",
            }}
          />
          {searchTerm && (
            <button
              type="button"
              onClick={() => setSearchTerm("")}
              style={{
                position: "absolute",
                right: "8px",
                top: "50%",
                transform: "translateY(-50%)",
                background: "none",
                border: "none",
                color: "#9CA3AF",
                cursor: "pointer",
                fontSize: "1rem",
                padding: "2px 6px",
              }}
            >
              ✕
            </button>
          )}
        </div>

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
          title="Filter table by Block Status"
        >
          <option value="all">🛡️ Block: All Profiles</option>
          <option value="hide_blocked">✅ Hide Blocked (Active only)</option>
          <option value="only_blocked">🚫 Blocked Only</option>
        </select>

        {/* Feed Visibility Filter Dropdown */}
        <select
          value={visibilityFilter}
          onChange={(e) => setVisibilityFilter(e.target.value)}
          className="input-field"
          style={{
            width: "auto",
            minWidth: "160px",
            padding: "0.52rem 0.75rem",
            borderRadius: "6px",
            border: "1px solid #D1D5DB",
            fontSize: "0.85rem",
            fontWeight: 500,
            cursor: "pointer",
            background: visibilityFilter !== "all" ? "#EFF6FF" : "white",
          }}
          title="Filter table by App Feed Visibility"
        >
          <option value="all">🌐 Feeds: All Profiles</option>
          <option value="visible_only">👁️ Visible on App</option>
          <option value="hidden_only">🙈 Hidden from App</option>
        </select>

        <button
          type="button"
          className="secondary small"
          onClick={() => loadProfiles(page, debouncedSearch)}
          title="Refresh List"
          style={{ padding: "0.52rem 0.75rem", borderRadius: "6px" }}
        >
          🔄 Refresh
        </button>

        <span className="muted small" style={{ marginLeft: "auto", fontWeight: 500 }}>
          {data ? `Showing ${displayedProfiles.length} of ${data.totalElements || list.length} verified` : ""}
        </span>
      </div>

      {loading && <p className="muted">Loading verified profiles...</p>}

      {!loading && displayedProfiles.length === 0 && (
        <div className="card" style={{ padding: "3rem", textAlign: "center", color: "#6B7280" }}>
          {searchTerm || blockFilter !== "all" || visibilityFilter !== "all" ? (
            <>
              <p style={{ fontSize: "1.1rem", margin: "0 0 0.5rem 0" }}>No profiles match current search or filters.</p>
              <div style={{ display: "flex", gap: "0.5rem", justifyContent: "center" }}>
                <button
                  type="button"
                  className="secondary small"
                  onClick={() => {
                    setSearchTerm("");
                    setBlockFilter("all");
                    setVisibilityFilter("all");
                  }}
                >
                  Reset All Filters
                </button>
              </div>
            </>
          ) : (
            <p style={{ fontSize: "1.1rem", margin: 0 }}>No verified profiles found.</p>
          )}
        </div>
      )}

      {/* 1. Monitoring Table View */}
      {!loading && viewMode === "table" && list.length > 0 && (
        <div className="table-container">
          <table className="data-table">
            <thead>
              <tr style={{ background: "#F9FAFB", borderBottom: "1px solid #E5E7EB" }}>
                <th style={{ padding: "0.75rem 1rem", fontWeight: "600", fontSize: "0.85rem", color: "#374151" }}>
                  ID
                </th>
                <th style={{ padding: "0.75rem 1rem", fontWeight: "600", fontSize: "0.85rem", color: "#374151" }}>
                  Name &amp; Account
                </th>
                <th style={{ padding: "0.75rem 1rem", fontWeight: "600", fontSize: "0.85rem", color: "#374151" }}>
                  Account status
                </th>
                <th style={{ padding: "0.75rem 1rem", fontWeight: "600", fontSize: "0.85rem", color: "#374151" }}>
                  Mobile No
                </th>
                <th style={{ padding: "0.75rem 1rem", fontWeight: "600", fontSize: "0.85rem", color: "#374151" }}>
                  Photo
                </th>
                <th style={{ padding: "0.75rem 1rem", fontWeight: "600", fontSize: "0.85rem", color: "#374151" }}>
                  Registered
                </th>
                <th
                  style={{
                    padding: "0.75rem 1rem",
                    fontWeight: "600",
                    fontSize: "0.85rem",
                    color: "#374151",
                    textAlign: "center",
                  }}
                >
                  Reach / Outreach
                </th>
                <th
                  style={{
                    padding: "0.75rem 1rem",
                    fontWeight: "600",
                    fontSize: "0.85rem",
                    color: "#374151",
                    textAlign: "center",
                  }}
                >
                  Actions
                </th>
              </tr>
            </thead>
            <tbody>
              {displayedProfiles.map((p) => {
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
                      <Link to={`/profiles/${p.id}`} style={{ fontWeight: "700", color: "#A5122F" }}>
                        {p.displayId || `GM${String(p.id).padStart(5, "0")}`}
                      </Link>
                    </td>

                    {/* Name & Account Details */}
                    <td style={{ padding: "0.85rem 1rem" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: "0.45rem", flexWrap: "wrap" }}>
                        <Link
                          to={`/profiles/${p.id}`}
                          style={{ fontWeight: "600", color: "#111827", textDecoration: "none" }}
                        >
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
                        <span
                          style={{
                            fontSize: "10px",
                            padding: "1px 5px",
                            borderRadius: "4px",
                            background: "#D1FAE5",
                            color: "#065F46",
                            fontWeight: 700,
                          }}
                        >
                          ✓ Verified
                        </span>
                        {p.blocked && <span className="badge badge-blocked">🚫 Blocked</span>}
                        {p.hidden && (
                          <span
                            style={{
                              fontSize: "10px",
                              padding: "1px 5px",
                              borderRadius: "4px",
                              background: "#FEF3C7",
                              color: "#92400E",
                              border: "1px solid #FCD34D",
                              fontWeight: 700,
                            }}
                          >
                            🙈 Hidden
                          </span>
                        )}
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

                    {/* Photo */}
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

                    {/* Outreach Options */}
                    <td style={{ padding: "0.85rem 1rem", textAlign: "center", whiteSpace: "nowrap" }}>
                      <div style={{ display: "inline-flex", gap: "0.35rem", alignItems: "center" }}>
                        <button
                          type="button"
                          onClick={() => setContactingProfile(p)}
                          title="Message on WhatsApp / Choose template"
                          style={{
                            background: "#25D366",
                            color: "#FFFFFF",
                            border: "none",
                            borderRadius: "6px",
                            padding: "0.35rem 0.65rem",
                            fontWeight: "600",
                            fontSize: "0.82rem",
                            display: "inline-flex",
                            alignItems: "center",
                            gap: "0.25rem",
                            cursor: "pointer",
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
                              padding: "0.35rem 0.55rem",
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
                              padding: "0.35rem 0.55rem",
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

                    {/* Actions: Edit, Block/Unblock, Hide/Show, View */}
                    <td style={{ padding: "0.85rem 1rem", textAlign: "center", whiteSpace: "nowrap" }}>
                      <div style={{ display: "inline-flex", gap: "0.35rem", alignItems: "center" }}>
                        <button
                          type="button"
                          onClick={() => setEditingProfileId(p.id)}
                          title="Edit this profile (all fields)"
                          style={{
                            background: "#A5122F",
                            color: "#FFFFFF",
                            border: "none",
                            borderRadius: "6px",
                            padding: "0.38rem 0.65rem",
                            fontWeight: "600",
                            fontSize: "0.82rem",
                            display: "inline-flex",
                            alignItems: "center",
                            gap: "0.2rem",
                            cursor: "pointer",
                            boxShadow: "0 1px 2px rgba(0,0,0,0.05)",
                          }}
                        >
                          <span>✏️</span> Edit
                        </button>

                        {/* Block / Unblock Action Button */}
                        <button
                          type="button"
                          onClick={() => handleToggleBlock(p)}
                          disabled={updatingBlockId === p.id}
                          title={p.blocked ? "Click to unblock member account" : "Click to block member account"}
                          style={{
                            background: p.blocked ? "#10B981" : "#FEE2E2",
                            color: p.blocked ? "#FFFFFF" : "#991B1B",
                            border: p.blocked ? "none" : "1px solid #FCA5A5",
                            borderRadius: "6px",
                            padding: "0.38rem 0.6rem",
                            fontWeight: "600",
                            fontSize: "0.82rem",
                            display: "inline-flex",
                            alignItems: "center",
                            gap: "0.2rem",
                            cursor: "pointer",
                            transition: "all 0.15s ease",
                          }}
                        >
                          {updatingBlockId === p.id
                            ? "..."
                            : p.blocked
                              ? "✅ Unblock"
                              : "🚫 Block"}
                        </button>

                        {/* Hide / Show Visibility Toggle Button */}
                        <button
                          type="button"
                          onClick={() => handleToggleVisibility(p)}
                          disabled={updatingVisibilityId === p.id}
                          title={
                            p.hidden
                              ? "Profile is currently hidden from app feeds. Click to show/unhide."
                              : "Profile is currently visible on app feeds. Click to hide."
                          }
                          style={{
                            background: p.hidden ? "#FEF3C7" : "#F3F4F6",
                            color: p.hidden ? "#92400E" : "#4B5563",
                            border: p.hidden ? "1px solid #FCD34D" : "1px solid #D1D5DB",
                            borderRadius: "6px",
                            padding: "0.38rem 0.6rem",
                            fontWeight: "600",
                            fontSize: "0.82rem",
                            display: "inline-flex",
                            alignItems: "center",
                            gap: "0.2rem",
                            cursor: "pointer",
                            transition: "all 0.15s ease",
                          }}
                        >
                          {updatingVisibilityId === p.id
                            ? "..."
                            : p.hidden
                              ? "👁️ Show"
                              : "🙈 Hide"}
                        </button>

                        <Link
                          to={`/profiles/${p.id}`}
                          title="View complete profile details"
                          style={{
                            background: "#F3F4F6",
                            color: "#374151",
                            border: "1px solid #D1D5DB",
                            borderRadius: "6px",
                            padding: "0.38rem 0.6rem",
                            fontWeight: "600",
                            fontSize: "0.82rem",
                            textDecoration: "none",
                            display: "inline-flex",
                            alignItems: "center",
                            gap: "0.2rem",
                          }}
                        >
                          <span>👁️</span> View
                        </Link>
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
      {!loading && viewMode === "grid" && displayedProfiles.length > 0 && (
        <div className="profile-grid">
          {displayedProfiles.map((p) => {
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
                    <span
                      style={{
                        fontSize: "10px",
                        padding: "1px 5px",
                        borderRadius: "4px",
                        background: "#D1FAE5",
                        color: "#065F46",
                        fontWeight: 700,
                      }}
                    >
                      ✓ Verified
                    </span>
                    {p.blocked && <span className="badge badge-blocked">🚫 Blocked</span>}
                    {p.hidden && (
                      <span
                        style={{
                          fontSize: "10px",
                          padding: "1px 5px",
                          borderRadius: "4px",
                          background: "#FEF3C7",
                          color: "#92400E",
                          border: "1px solid #FCD34D",
                          fontWeight: 700,
                        }}
                      >
                        🙈 Hidden
                      </span>
                    )}
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

                {/* Block / Unblock and Hide / Show Actions in Card View */}
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
                      padding: "0.4rem",
                      fontSize: "0.8rem",
                      borderRadius: "6px",
                      cursor: "pointer",
                      fontWeight: 600,
                    }}
                    title={p.blocked ? "Unblock account" : "Block account"}
                  >
                    {updatingBlockId === p.id ? "..." : p.blocked ? "✅ Unblock" : "🚫 Block"}
                  </button>
                  <button
                    type="button"
                    onClick={() => handleToggleVisibility(p)}
                    disabled={updatingVisibilityId === p.id}
                    style={{
                      background: p.hidden ? "#FEF3C7" : "#F3F4F6",
                      color: p.hidden ? "#92400E" : "#4B5563",
                      border: p.hidden ? "1px solid #FCD34D" : "1px solid #D1D5DB",
                      flex: 1,
                      padding: "0.4rem",
                      fontSize: "0.8rem",
                      borderRadius: "6px",
                      cursor: "pointer",
                      fontWeight: 600,
                    }}
                    title={p.hidden ? "Unhide in feeds" : "Hide from feeds"}
                  >
                    {updatingVisibilityId === p.id ? "..." : p.hidden ? "👁️ Show" : "🙈 Hide"}
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
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      gap: "0.3rem",
                    }}
                  >
                    <span>✏️</span> Edit Profile
                  </button>
                  <Link
                    to={`/profiles/${p.id}`}
                    style={{
                      background: "#F3F4F6",
                      color: "#374151",
                      border: "1px solid #D1D5DB",
                      borderRadius: "6px",
                      padding: "0.45rem 0.65rem",
                      fontSize: "0.82rem",
                      textDecoration: "none",
                      fontWeight: 600,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    👁️
                  </Link>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Pagination */}
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

      {/* Modals */}
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

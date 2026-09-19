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
      <div className="filter-bar">
        <div style={{ position: "relative", flex: "1 1 320px", maxWidth: "480px" }}>
          <input
            type="text"
            placeholder="Search by Name, Mobile, Email, or Profile ID (GM00382)..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="input-field"
            style={{
              width: "100%",
              padding: "0.55rem 2.2rem 0.55rem 0.85rem",
              borderRadius: "6px",
              border: "1px solid #D1D5DB",
              fontSize: "0.9rem",
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

        <button
          type="button"
          className="secondary small"
          onClick={() => loadProfiles(page, debouncedSearch)}
          title="Refresh List"
          style={{ padding: "0.55rem 0.85rem", borderRadius: "6px" }}
        >
          🔄 Refresh
        </button>

        <span className="muted small" style={{ marginLeft: "auto", fontWeight: 500 }}>
          {data ? `Showing ${list.length} of ${data.totalElements || list.length} verified profiles` : ""}
        </span>
      </div>

      {loading && <p className="muted">Loading verified profiles...</p>}

      {!loading && list.length === 0 && (
        <div className="card" style={{ padding: "3rem", textAlign: "center", color: "#6B7280" }}>
          {searchTerm ? (
            <>
              <p style={{ fontSize: "1.1rem", margin: "0 0 0.5rem 0" }}>No verified profiles match "{searchTerm}"</p>
              <button
                type="button"
                className="secondary small"
                onClick={() => setSearchTerm("")}
              >
                Clear Search
              </button>
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
              {list.map((p) => {
                const hasPhoto = Boolean(p.isPhoto || p.profileImage);
                return (
                  <tr key={p.id} style={{ borderBottom: "1px solid #F3F4F6", transition: "background 0.15s" }}>
                    {/* ID */}
                    <td style={{ padding: "0.85rem 1rem", whiteSpace: "nowrap" }}>
                      <Link to={`/profiles/${p.id}`} style={{ fontWeight: "700", color: "#A5122F" }}>
                        {p.displayId || `GM${String(p.id).padStart(5, "0")}`}
                      </Link>
                    </td>

                    {/* Name & Account Details */}
                    <td style={{ padding: "0.85rem 1rem" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
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
                        {p.blocked && <span className="badge badge-blocked">Blocked</span>}
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

                    {/* Actions: Edit & View */}
                    <td style={{ padding: "0.85rem 1rem", textAlign: "center", whiteSpace: "nowrap" }}>
                      <div style={{ display: "inline-flex", gap: "0.4rem", alignItems: "center" }}>
                        <button
                          type="button"
                          onClick={() => setEditingProfileId(p.id)}
                          title="Edit this profile (all fields)"
                          style={{
                            background: "#A5122F",
                            color: "#FFFFFF",
                            border: "none",
                            borderRadius: "6px",
                            padding: "0.4rem 0.75rem",
                            fontWeight: "600",
                            fontSize: "0.82rem",
                            display: "inline-flex",
                            alignItems: "center",
                            gap: "0.25rem",
                            cursor: "pointer",
                            boxShadow: "0 1px 2px rgba(0,0,0,0.05)",
                          }}
                        >
                          <span>✏️</span> Edit
                        </button>
                        <Link
                          to={`/profiles/${p.id}`}
                          title="View complete profile details"
                          style={{
                            background: "#F3F4F6",
                            color: "#374151",
                            border: "1px solid #D1D5DB",
                            borderRadius: "6px",
                            padding: "0.38rem 0.65rem",
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
      {!loading && viewMode === "grid" && list.length > 0 && (
        <div className="profile-grid">
          {list.map((p) => {
            const hasPhoto = Boolean(p.isPhoto || p.profileImage);
            return (
              <div className="card profile-card" key={p.id}>
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
                  </div>
                  {p.blocked && <span className="badge badge-blocked">Blocked</span>}
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

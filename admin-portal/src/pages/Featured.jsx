import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../api";

export default function Featured() {
  const [featured, setFeatured] = useState([]);
  const [featuredLoading, setFeaturedLoading] = useState(true);

  const [search, setSearch] = useState("");
  const [page, setPage] = useState(0);
  const [profiles, setProfiles] = useState(null);
  const [profilesLoading, setProfilesLoading] = useState(true);

  const [busyId, setBusyId] = useState(null);
  const [error, setError] = useState("");

  function loadFeatured() {
    setFeaturedLoading(true);
    api
      .featuredStories()
      .then(setFeatured)
      .finally(() => setFeaturedLoading(false));
  }

  function loadProfiles() {
    setProfilesLoading(true);
    api
      .allProfiles(search, page, 20)
      .then(setProfiles)
      .finally(() => setProfilesLoading(false));
  }

  useEffect(loadFeatured, []);
  useEffect(loadProfiles, [page]);

  // Debounced so typing doesn't fire a request per keystroke; resets to page
  // 0 since a new search invalidates whatever page you were on.
  useEffect(() => {
    const handle = setTimeout(() => {
      if (page !== 0) {
        setPage(0);
      } else {
        loadProfiles();
      }
    }, 300);
    return () => clearTimeout(handle);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search]);

  const featuredIds = new Set(featured.map((f) => f.userProfileId));

  const filteredFeatured = search.trim()
    ? featured.filter((f) => {
        const q = search.toLowerCase().trim();
        return (
          f.name?.toLowerCase().includes(q) ||
          f.displayId?.toLowerCase().includes(q) ||
          String(f.userProfileId).includes(q) ||
          f.note?.toLowerCase().includes(q)
        );
      })
    : featured;

  async function handleAdd(profileId) {
    setError("");
    setBusyId(profileId);
    try {
      await api.addFeaturedStory(profileId, featured.length, "");
      loadFeatured();
    } catch (err) {
      setError(err.message.includes("409") ? "Already highlighted" : "Could not add this profile");
    } finally {
      setBusyId(null);
    }
  }

  async function handleRemove(id) {
    await api.removeFeaturedStory(id);
    setFeatured((prev) => prev.filter((f) => f.id !== id));
  }

  return (
    <div>
      <div className="page-header" style={{ marginBottom: "1.25rem" }}>
        <div>
          <h1 style={{ margin: "0 0 0.25rem 0" }}>Featured &amp; All Member Profiles</h1>
          <p className="muted" style={{ margin: 0 }}>
            Manage highlighted stories shown on the app homepage, and search all registered members.
          </p>
        </div>
      </div>

      {/* Top Search Bar */}
      <div
        className="card"
        style={{
          padding: "1rem 1.25rem",
          marginBottom: "1.75rem",
          background: "#FFFFFF",
          boxShadow: "0 1px 3px rgba(0,0,0,0.08)",
          borderRadius: "8px",
        }}
      >
        <label
          htmlFor="featured-search-input"
          style={{
            display: "block",
            fontWeight: 600,
            fontSize: "0.9rem",
            color: "#374151",
            marginBottom: "0.5rem",
          }}
        >
          🔍 Search Profiles (Name, Email, Phone Number, or Profile ID)
        </label>
        <div style={{ display: "flex", gap: "0.5rem", alignItems: "center" }}>
          <div style={{ position: "relative", flex: 1 }}>
            <input
              id="featured-search-input"
              type="text"
              className="input-field"
              placeholder="e.g. Rahul Sharma, rahul@gmail.com, 9876543210, GM00382, or 382..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              style={{
                width: "100%",
                padding: "0.65rem 2.2rem 0.65rem 0.85rem",
                fontSize: "0.95rem",
                borderRadius: "6px",
                border: "1px solid #D1D5DB",
              }}
            />
            {search && (
              <button
                type="button"
                onClick={() => setSearch("")}
                style={{
                  position: "absolute",
                  right: "8px",
                  top: "50%",
                  transform: "translateY(-50%)",
                  background: "transparent",
                  border: "none",
                  color: "#9CA3AF",
                  cursor: "pointer",
                  fontSize: "1.1rem",
                  padding: "4px",
                }}
                title="Clear search"
              >
                ✕
              </button>
            )}
          </div>
          {search && (
            <button
              type="button"
              className="secondary"
              onClick={() => setSearch("")}
              style={{ padding: "0.6rem 0.9rem" }}
            >
              Clear
            </button>
          )}
        </div>
        {search && (
          <div className="muted small" style={{ marginTop: "0.4rem" }}>
            Searching for: <strong>"{search}"</strong>
          </div>
        )}
      </div>

      {error && <div className="error-banner" style={{ marginBottom: "1rem" }}>{error}</div>}

      {/* 1. Highlighted Profiles Section */}
      <div style={{ marginBottom: "2rem" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: "0.75rem" }}>
          <h2 style={{ margin: 0, fontSize: "1.2rem", color: "#111827" }}>
            Highlighted Profiles
          </h2>
          <span className="muted small">
            {featuredLoading ? "Loading..." : `${filteredFeatured.length} ${search ? "matching" : ""} featured`}
          </span>
        </div>

        {featuredLoading && <p className="muted">Loading highlighted profiles...</p>}
        {!featuredLoading && filteredFeatured.length === 0 && (
          <div className="card" style={{ padding: "1.5rem", textAlign: "center", color: "#6B7280" }}>
            {search ? `No highlighted profiles match "${search}".` : "Nothing highlighted yet - add one from the list below."}
          </div>
        )}

        <div className="profile-grid">
          {filteredFeatured.map((f) => (
            <div className="card profile-card" key={f.id}>
              <img
                src={f.profileImage || "/placeholder.svg"}
                alt=""
                className="profile-thumb"
              />
              <div className="profile-card-body">
                <Link to={`/profiles/${f.userProfileId}`} className="profile-name">
                  {f.name || "(no name)"}
                </Link>
                <div className="muted" style={{ fontWeight: 600 }}>{f.displayId}</div>
                {f.note && <div className="muted small">{f.note}</div>}
              </div>
              <button className="secondary" onClick={() => handleRemove(f.id)}>
                Remove
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* 2. All Profiles Search Results Section */}
      <div>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: "0.75rem" }}>
          <h2 style={{ margin: 0, fontSize: "1.2rem", color: "#111827" }}>
            {search ? `Search Results for "${search}"` : "All Member Profiles"}
          </h2>
          <span className="muted small">
            {profilesLoading
              ? "Searching..."
              : profiles
              ? `${profiles.totalElements} profiles found`
              : ""}
          </span>
        </div>

        {profilesLoading && <p className="muted">Searching profiles...</p>}

        {!profilesLoading && profiles?.content?.length === 0 && (
          <div className="card" style={{ padding: "2rem", textAlign: "center", color: "#6B7280" }}>
            No profiles found matching "{search}".
          </div>
        )}

        <div className="profile-grid">
          {profiles?.content?.map((p) => {
            const isFeatured = featuredIds.has(p.id);
            return (
              <div className="card profile-card" key={p.id}>
                <img
                  src={p.profileImage || "/placeholder.svg"}
                  alt=""
                  className="profile-thumb"
                />
                <div className="profile-card-body">
                  <Link to={`/profiles/${p.id}`} className="profile-name">
                    {p.name || "(no name)"}
                  </Link>
                  {p.blocked && <span className="badge badge-blocked">Blocked</span>}
                  <div className="muted" style={{ fontWeight: 600 }}>{p.displayId}</div>
                  {p.mobileNo && <div className="muted small">📱 {p.mobileNo}</div>}
                  {p.email && <div className="muted small">✉️ {p.email}</div>}
                </div>
                <button
                  className={isFeatured ? "secondary" : undefined}
                  disabled={isFeatured || busyId === p.id}
                  onClick={() => handleAdd(p.id)}
                >
                  {isFeatured ? "Already highlighted" : busyId === p.id ? "Adding..." : "+ Highlight"}
                </button>
              </div>
            );
          })}
        </div>

        {profiles && profiles.totalPages > 1 && (
          <div className="pager" style={{ marginTop: "1.5rem" }}>
            <button disabled={page === 0} onClick={() => setPage((p) => p - 1)}>
              Previous
            </button>
            <span>
              Page {page + 1} of {Math.max(profiles.totalPages, 1)}
            </span>
            <button
              disabled={page + 1 >= profiles.totalPages}
              onClick={() => setPage((p) => p + 1)}
            >
              Next
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

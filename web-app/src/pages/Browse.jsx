import React, { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { profileAPI, referenceAPI, likeAPI, shortlistAPI } from "../api";
import { VerifiedBadge, HeartIcon, BookmarkIcon, Icon } from "../components/Icons";
import AvatarFallback from "../components/AvatarFallback";
import TrustRow from "../components/TrustRow";
import {
  formatHeight,
  formatAnnualIncome,
  formatEducation,
  formatProfession,
  formatMaritalStatus,
  HEIGHT_MAP,
  MARITAL_STATUS_MAP,
  MANGLIK_MAP,
  EDUCATION_MAP,
} from "../formatters";

function calculateAge(dob) {
  if (!dob) return null;
  const diff = Date.now() - new Date(dob).getTime();
  const age = Math.floor(diff / (365.25 * 24 * 60 * 60 * 1000));
  return age > 0 && age < 120 ? age : null;
}

function formatProfileCode(id) {
  if (!id) return "";
  const raw = String(id);
  const digits = raw.startsWith("JM") || raw.startsWith("GM") ? raw.slice(2) : raw.padStart(5, "0");
  return `GM${digits}`;
}

const GAHOI_GOTRAS = [
  "Katheriya", "Seth", "Mor", "Pahariya", "Piparsaniya", 
  "Kharya", "Rawat", "Kasondhan", "Gupta", "Budholiya", 
  "Nagariya", "Kankane", "Sijariya", "Nikhra", "Bhadan", 
  "Taran", "Chudigar", "Kapasya", "Makhariya", "Goyal"
];

const EMPTY_FILTER = {
  ageFrom: "",
  ageTo: "",
  maritalStatus: "",
  manglik: "",
  gotra: "",
  profession: "",
  heightFrom: "",
  heightTo: "",
  education: "",
};

export default function Browse() {
  const navigate = useNavigate();
  const [oppositeGender, setOppositeGender] = useState(true);
  const [filter, setFilter] = useState(EMPTY_FILTER);
  const [appliedFilter, setAppliedFilter] = useState(EMPTY_FILTER);
  const [page, setPage] = useState(0);
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [options, setOptions] = useState({});
  const [busyId, setBusyId] = useState(null);

  // Profile status & filter drawer
  const [myProfile, setMyProfile] = useState(null);
  const [showFilterDrawer, setShowFilterDrawer] = useState(false);

  useEffect(() => {
    referenceAPI.allOptions().then(setOptions).catch(() => {});
    
    profileAPI
      .getMe()
      .then(setMyProfile)
      .catch(() => {});
  }, []);

  useEffect(() => {
    setLoading(true);
    profileAPI
      .getProfiles(page, 21, oppositeGender, appliedFilter)
      .then(setData)
      .finally(() => setLoading(false));
  }, [page, oppositeGender, appliedFilter]);

  function applyFilters() {
    setPage(0);
    setAppliedFilter(filter);
    setShowFilterDrawer(false);
  }

  function clearFilters() {
    setFilter(EMPTY_FILTER);
    setAppliedFilter(EMPTY_FILTER);
    setPage(0);
    setShowFilterDrawer(false);
  }

  const activeFilterCount = Object.values(appliedFilter).filter(Boolean).length;
  const hasActiveFilters = activeFilterCount > 0;

  async function toggleShortlist(profile, e) {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    setBusyId(profile.id);
    try {
      if (profile.isShortlisted) await shortlistAPI.remove(profile.id);
      else await shortlistAPI.add(profile.id);
      setData((prev) => ({
        ...prev,
        content: (prev?.content || []).map((p) =>
          p.id === profile.id ? { ...p, isShortlisted: !p.isShortlisted } : p
        ),
      }));
    } finally {
      setBusyId(null);
    }
  }

  async function sendLike(profile, e) {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    setBusyId(profile.id);
    try {
      await likeAPI.likeProfile(profile.id);
      setData((prev) => ({
        ...prev,
        content: (prev?.content || []).map((p) =>
          p.id === profile.id ? { ...p, isLiked: true, likeStatus: "PENDING" } : p
        ),
      }));
    } catch (err) {
      console.error("Failed to connect:", err);
      if (err?.message?.includes("already liked")) {
        setData((prev) => ({
          ...prev,
          content: (prev?.content || []).map((p) =>
            p.id === profile.id ? { ...p, isLiked: true, likeStatus: "PENDING" } : p
          ),
        }));
      } else {
        alert(err?.message || "Could not send connection request. Please try again.");
      }
    } finally {
      setBusyId(null);
    }
  }

  async function withdrawLike(profile, e) {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    setBusyId(profile.id);
    try {
      await likeAPI.unlikeProfile(profile.id);
      setData((prev) => ({
        ...prev,
        content: (prev?.content || []).map((p) =>
          p.id === profile.id ? { ...p, isLiked: false, likeStatus: null } : p
        ),
      }));
    } catch (err) {
      console.error("Failed to withdraw request:", err);
      alert(err?.message || "Could not withdraw request. Please try again.");
    } finally {
      setBusyId(null);
    }
  }

  async function handleToggleConnect(profile, e) {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    const isLiked = profile.isLiked || profile.likeStatus === "PENDING" || profile.likeStatus === "ACCEPTED";
    if (isLiked) {
      await withdrawLike(profile, e);
    } else {
      await sendLike(profile, e);
    }
  }

  // Fallback options if reference endpoint is loading
  const maritalOptions = options.marital_status?.length
    ? options.marital_status
    : Object.entries(MARITAL_STATUS_MAP).map(([code, label]) => ({ code, label }));

  const manglikOptions = options.manglik?.length
    ? options.manglik
    : Object.entries(MANGLIK_MAP).map(([code, label]) => ({ code, label }));

  const heightOptions = options.height?.length
    ? options.height
    : Object.entries(HEIGHT_MAP).map(([code, label]) => ({ code, label }));

  const educationOptions = options.education?.length
    ? options.education
    : Object.entries(EDUCATION_MAP).map(([code, label]) => ({ code, label }));

  const profilesList = data?.content || [];
  const totalElements = data?.totalElements || profilesList.length;
  const totalPages = data?.totalPages || 1;
  const startCount = totalElements === 0 ? 0 : page * 21 + 1;
  const endCount = Math.min(totalElements, page * 21 + profilesList.length);

  return (
    <div className="browse-page-wrapper">
      {/* 1. Top Filter Controls Bar (Exact match to Reference Mockup) */}
      <div className="discovery-filter-control-bar">
        <div className="filter-pill-group">
          <button
            type="button"
            className={`filter-chip-btn ${oppositeGender ? "active" : ""}`}
            onClick={() => {
              setOppositeGender(true);
              setPage(0);
            }}
          >
            <HeartIcon size={16} filled={oppositeGender} color={oppositeGender ? "#FFFFFF" : "#E83A5B"} />
            <span>Matches for you</span>
          </button>

          <button
            type="button"
            className={`filter-chip-btn ${!oppositeGender ? "active" : ""}`}
            onClick={() => {
              setOppositeGender(false);
              setPage(0);
            }}
          >
            <Icon name="users" size={16} color={!oppositeGender ? "#FFFFFF" : "#667085"} />
            <span>All Verified</span>
          </button>

          <button
            type="button"
            className={`filter-chip-btn filter-trigger ${hasActiveFilters ? "has-active" : ""}`}
            onClick={() => setShowFilterDrawer(true)}
          >
            <Icon name="filter" size={15} color={hasActiveFilters ? "#E83A5B" : "#667085"} />
            <span>Filter</span>
            {activeFilterCount > 0 && <span className="filter-count-badge">{activeFilterCount}</span>}
          </button>
        </div>

        {/* Right side: Results count & pagination arrows */}
        <div className="filter-pagination-group desktop-only">
          <span className="filter-results-text">
            Showing {startCount} - {endCount} of {totalElements}
          </span>
          <div className="filter-pagination-arrows">
            <button
              type="button"
              className="filter-arrow-btn"
              disabled={page === 0}
              onClick={() => setPage((p) => Math.max(0, p - 1))}
              title="Previous page"
            >
              <Icon name="chevron-left" size={16} />
            </button>
            <button
              type="button"
              className="filter-arrow-btn"
              disabled={page + 1 >= totalPages}
              onClick={() => setPage((p) => p + 1)}
              title="Next page"
            >
              <Icon name="chevron-right" size={16} />
            </button>
          </div>
        </div>
      </div>

      {/* 2. Loading State */}
      {loading && (
        <div className="discovery-loading-box">
          <div className="loading-spinner-ring" />
          <p className="loading-spinner-text">Loading verified Gahoi matches...</p>
        </div>
      )}

      {/* 3. Empty State */}
      {!loading && profilesList.length === 0 && (
        <div className="discovery-empty-card">
          <Icon name="search" size={40} color="#E83A5B" />
          <h3>No matching profiles found</h3>
          <p>Try relaxing your filters to discover more compatible community profiles.</p>
          {hasActiveFilters && (
            <button type="button" className="btn-connect-primary" onClick={clearFilters} style={{ maxWidth: 200, margin: "0 auto" }}>
              Reset Filters
            </button>
          )}
        </div>
      )}

      {/* 4. Profile Cards Grid (1 col on mobile, 3 col on laptop) */}
      {!loading && profilesList.length > 0 && (
        <div className="matrimony-grid">
          {profilesList.map((p) => {
            const age = calculateAge(p.dateOfBirth);
            const code = formatProfileCode(p.id);
            const isMine = p.isMine || (myProfile && p.id === myProfile.id);
            const isLiked = p.isLiked || p.likeStatus === "ACCEPTED" || p.likeStatus === "PENDING";
            const isConnected = p.likeStatus === "ACCEPTED";
            const isShortlisted = p.isShortlisted;

            const heightFormatted = formatHeight(p.height);
            const professionFormatted = formatProfession(p.profession);
            const educationFormatted = formatEducation(p.education);
            const gotraLabel = p.gotra || "Gahoi";
            const photoSrc = p.profileImageFull || p.profileImage || p.imageUrl;
            const locationText = [p.city || p.presentAddress, p.state].filter(Boolean).join(", ") || "India";

            return (
              <div className="matrimony-profile-card" key={p.id}>
                {/* Photo Frame Container */}
                <Link to={`/profiles/${p.id}`} className="card-photo-container">
                  {photoSrc ? (
                    <img src={photoSrc} alt={p.name} className="card-photo-img" loading="lazy" />
                  ) : (
                    <AvatarFallback profile={p} name={p.name} size={360} />
                  )}

                  {/* Top-Left: Code Pill (GM00373) */}
                  <div className="card-badge-code">{code}</div>

                  {/* Top-Right: Bookmark Circle */}
                  {!isMine && (
                    <button
                      type="button"
                      className="card-bookmark-btn"
                      onClick={(e) => toggleShortlist(p, e)}
                      title={isShortlisted ? "Remove from shortlist" : "Add to shortlist"}
                      disabled={busyId === p.id}
                    >
                      <BookmarkIcon
                        filled={isShortlisted}
                        size={17}
                        color={isShortlisted ? "#E83A5B" : "#1F2937"}
                      />
                    </button>
                  )}

                  {/* Bottom-Left: Verified Gahoi Member Badge */}
                  <div className="card-verified-tag">
                    <span className="verified-blue-shield">
                      <svg width="15" height="15" viewBox="0 0 20 20" fill="none">
                        <path d="M10 1L12.5 3.5H16V7L18.5 9.5L16 12V15.5H12.5L10 18L7.5 15.5H4V12L1.5 9.5L4 7V3.5H7.5L10 1Z" fill="#2563EB" />
                        <path d="M6.5 9.5L9 12L13.5 7.5" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    </span>
                    <span>Verified Gahoi Member</span>
                  </div>
                </Link>

                {/* Card Details Body */}
                <div className="card-details-box">
                  <div className="card-name-line">
                    <Link to={`/profiles/${p.id}`} className="card-profile-name">
                      {p.name || "Gahoi Member"}
                    </Link>
                  </div>

                  <div className="card-vital-metrics">
                    {[age ? `${age} Yrs` : "", heightFormatted].filter(Boolean).join(" • ")}
                  </div>

                  <div className="card-gotra-pill">
                    <span className="gotra-prefix">गोत्र:</span>
                    <span className="gotra-name">{gotraLabel}</span>
                    <span className="gotra-dot">•</span>
                    <span className="gotra-community">Gahoi</span>
                  </div>

                  <div className="card-career-line" title={`${professionFormatted || ""} ${educationFormatted ? `• ${educationFormatted}` : ""}`}>
                    <Icon name="briefcase" size={14} color="#667085" />
                    <span>{[professionFormatted, educationFormatted].filter(Boolean).join(" • ") || "Details on request"}</span>
                  </div>

                  <div className="card-location-line">
                    <Icon name="map-pin" size={14} color="#667085" />
                    <span>{locationText}</span>
                  </div>

                  {/* Card Actions Row */}
                  <div className="card-actions-row">
                    {isMine ? (
                      <button
                        type="button"
                        className="btn-connect-primary"
                        onClick={() => navigate("/me")}
                      >
                        <Icon name="pencil" size={15} />
                        <span>Edit My Profile</span>
                      </button>
                    ) : isConnected ? (
                      <button
                        type="button"
                        className="btn-connect-primary connected"
                        onClick={() => navigate(`/profiles/${p.id}`)}
                      >
                        <Icon name="check" size={15} color="#166534" />
                        <span>Connected</span>
                      </button>
                    ) : isLiked ? (
                      <button
                        type="button"
                        className="btn-connect-primary pending"
                        disabled={busyId === p.id}
                        onClick={(e) => withdrawLike(p, e)}
                        title="Click to withdraw request"
                      >
                        <Icon name="clock" size={14} color="#92400E" />
                        <span>Request Sent</span>
                      </button>
                    ) : (
                      <button
                        type="button"
                        className="btn-connect-primary"
                        disabled={busyId === p.id}
                        onClick={(e) => sendLike(p, e)}
                      >
                        <HeartIcon size={16} />
                        <span>Connect</span>
                      </button>
                    )}

                    <Link to={`/profiles/${p.id}`} className="btn-next-arrow" title="View Full Biodata">
                      <Icon name="chevron-right" size={18} color="#E83A5B" />
                    </Link>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* 5. Mobile & Desktop Bottom Pager */}
      {!loading && totalPages > 1 && (
        <div className="discovery-pager-row">
          <button
            type="button"
            className="filter-arrow-btn large"
            disabled={page === 0}
            onClick={() => {
              setPage((p) => Math.max(0, p - 1));
              window.scrollTo({ top: 0, behavior: "smooth" });
            }}
          >
            <Icon name="chevron-left" size={16} />
            <span>Previous</span>
          </button>

          <span className="discovery-pager-indicator">
            Page {page + 1} of {totalPages}
          </span>

          <button
            type="button"
            className="filter-arrow-btn large"
            disabled={page + 1 >= totalPages}
            onClick={() => {
              setPage((p) => p + 1);
              window.scrollTo({ top: 0, behavior: "smooth" });
            }}
          >
            <span>Next</span>
            <Icon name="chevron-right" size={16} />
          </button>
        </div>
      )}

      {/* 6. Footer Trust Row */}
      <TrustRow />

      {/* 7. Clean Filter Slide-over Drawer */}
      {showFilterDrawer && (
        <div className="filter-drawer-overlay" onClick={() => setShowFilterDrawer(false)}>
          <div className="filter-drawer-panel" onClick={(e) => e.stopPropagation()}>
            <div className="filter-drawer-header">
              <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                <Icon name="filter" size={18} color="#E83A5B" />
                <h3 className="filter-drawer-title">Filter Gahoi Matches</h3>
              </div>
              <button
                type="button"
                className="filter-drawer-close"
                onClick={() => setShowFilterDrawer(false)}
                title="Close"
              >
                ✕
              </button>
            </div>

            <div className="filter-drawer-body">
              {/* Gotra Selector */}
              <div className="filter-field-block">
                <label className="filter-field-label">Gotra (गोत्र)</label>
                <select
                  className="filter-field-select"
                  value={filter.gotra}
                  onChange={(e) => setFilter({ ...filter, gotra: e.target.value })}
                >
                  <option value="">All Gotras (सभी गोत्र)</option>
                  {GAHOI_GOTRAS.map((g) => (
                    <option value={g} key={g}>{g}</option>
                  ))}
                </select>
              </div>

              {/* Age Range */}
              <div className="filter-field-block">
                <label className="filter-field-label">Age Range (आयु)</label>
                <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                  <input
                    type="number"
                    className="filter-field-input"
                    min="18"
                    max="80"
                    placeholder="Min (18)"
                    value={filter.ageFrom}
                    onChange={(e) => setFilter({ ...filter, ageFrom: e.target.value })}
                  />
                  <span style={{ color: "#667085" }}>to</span>
                  <input
                    type="number"
                    className="filter-field-input"
                    min="18"
                    max="80"
                    placeholder="Max (60)"
                    value={filter.ageTo}
                    onChange={(e) => setFilter({ ...filter, ageTo: e.target.value })}
                  />
                </div>
              </div>

              {/* Height From */}
              <div className="filter-field-block">
                <label className="filter-field-label">Minimum Height</label>
                <select
                  className="filter-field-select"
                  value={filter.heightFrom}
                  onChange={(e) => setFilter({ ...filter, heightFrom: e.target.value })}
                >
                  <option value="">Any Height</option>
                  {heightOptions.map((o) => (
                    <option value={o.code} key={o.code}>{o.label}</option>
                  ))}
                </select>
              </div>

              {/* Education */}
              <div className="filter-field-block">
                <label className="filter-field-label">Education</label>
                <select
                  className="filter-field-select"
                  value={filter.education}
                  onChange={(e) => setFilter({ ...filter, education: e.target.value })}
                >
                  <option value="">Any Education</option>
                  {educationOptions.map((o) => (
                    <option value={o.code} key={o.code}>{o.label}</option>
                  ))}
                </select>
              </div>

              {/* Profession */}
              <div className="filter-field-block">
                <label className="filter-field-label">Profession / Job</label>
                <input
                  type="text"
                  className="filter-field-input"
                  placeholder="e.g. Software Engineer, Doctor, CA"
                  value={filter.profession}
                  onChange={(e) => setFilter({ ...filter, profession: e.target.value })}
                />
              </div>

              {/* Marital Status */}
              <div className="filter-field-block">
                <label className="filter-field-label">Marital Status</label>
                <select
                  className="filter-field-select"
                  value={filter.maritalStatus}
                  onChange={(e) => setFilter({ ...filter, maritalStatus: e.target.value })}
                >
                  <option value="">Any Status</option>
                  {maritalOptions.map((o) => (
                    <option value={o.code} key={o.code}>{o.label}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="filter-drawer-actions">
              <button
                type="button"
                className="filter-drawer-btn-reset"
                onClick={clearFilters}
              >
                Reset All
              </button>
              <button
                type="button"
                className="filter-drawer-btn-apply"
                onClick={applyFilters}
              >
                Apply Filters
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

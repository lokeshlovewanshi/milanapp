import React, { useEffect, useState } from "react";
import { Link, useNavigate, useParams, useLocation } from "react-router-dom";
import {
  profileAPI,
  likeAPI,
  shortlistAPI,
  viewsAPI,
  isLoggedIn,
} from "../api";
import {
  VerifiedBadge,
  HeartIcon,
  BookmarkIcon,
  Icon,
} from "../components/Icons";
import AvatarFallback from "../components/AvatarFallback";
import KundaliMatchCard from "../components/KundaliMatchCard";
import DetailCard from "../components/DetailCard";
import ShareProfileModal from "../components/ShareProfileModal";
import {
  formatHeight,
  formatAnnualIncome,
  formatEducation,
  formatEmployedIn,
  formatProfession,
  formatMaritalStatus,
  formatDiet,
  formatComplexion,
  formatBloodGroup,
  formatManglik,
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
  const digits =
    raw.startsWith("JM") || raw.startsWith("GM")
      ? raw.slice(2)
      : raw.padStart(5, "0");
  return `GM${digits}`;
}

export default function ProfileDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [activePhotoIdx, setActivePhotoIdx] = useState(0);
  const [busy, setBusy] = useState(false);
  const [showShareModal, setShowShareModal] = useState(false);
  const [imageLoadFailed, setImageLoadFailed] = useState(false);

  useEffect(() => {
    setLoading(true);
    setImageLoadFailed(false);
    setActivePhotoIdx(0);
    profileAPI
      .getProfile(id)
      .then((p) => {
        setProfile(p);
        if (isLoggedIn()) {
          viewsAPI.addView(id).catch(() => {});
        }
      })
      .catch((err) => setError(err?.message || "Could not load this profile"))
      .finally(() => setLoading(false));
  }, [id]);

  async function toggleShortlist() {
    if (!isLoggedIn()) {
      navigate("/login", { state: { from: location.pathname } });
      return;
    }
    setBusy(true);
    try {
      if (profile.isShortlisted) await shortlistAPI.remove(id);
      else await shortlistAPI.add(id);
      setProfile((prev) => ({ ...prev, isShortlisted: !prev.isShortlisted }));
    } finally {
      setBusy(false);
    }
  }

  async function sendLike() {
    if (!isLoggedIn()) {
      navigate("/login", { state: { from: location.pathname } });
      return;
    }
    setBusy(true);
    try {
      await likeAPI.likeProfile(id);
      setProfile((prev) => ({ ...prev, isLiked: true, likeStatus: "PENDING" }));
    } catch (err) {
      console.error("Failed to connect:", err);
      if (err?.message?.includes("already liked")) {
        setProfile((prev) => ({
          ...prev,
          isLiked: true,
          likeStatus: "PENDING",
        }));
      } else {
        alert(
          err?.message ||
            "Could not send connection request. Please try again.",
        );
      }
    } finally {
      setBusy(false);
    }
  }

  async function withdrawLike() {
    setBusy(true);
    try {
      await likeAPI.unlikeProfile(id);
      setProfile((prev) => ({ ...prev, isLiked: false, likeStatus: null }));
    } catch (err) {
      console.error("Failed to withdraw request:", err);
      alert(err?.message || "Could not withdraw request. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  // Ensure primary photo is always first, followed by all candidate photo sources
  const sortedDetails = (profile?.profileImageDetails || [])
    .slice()
    .sort((a, b) => (b.isPrimary ? 1 : 0) - (a.isPrimary ? 1 : 0))
    .map((p) => p?.url)
    .filter(Boolean);

  const directUrls = profile
    ? [
        profile.profileImageFull,
        profile.profileImage,
        ...(profile.profileImages || []),
        profile.imageUrl,
      ].filter(Boolean)
    : [];

  const photos = Array.from(new Set([...sortedDetails, ...directUrls]));

  const age = profile ? calculateAge(profile.dateOfBirth) : null;
  const code = profile ? formatProfileCode(profile.id) : "";
  const isConnected = profile?.likeStatus === "ACCEPTED";
  const isPending = !!(profile?.isLiked && profile?.likeStatus === "PENDING");
  const isMine = !!profile?.isMine;

  // Dynamic Open Graph & Page Title Updater (Must remain top-level hook before any early returns)
  useEffect(() => {
    if (!profile) return;
    const candidateName = profile.name || "Member";
    const heightFormatted = formatHeight(profile.height);
    const primaryImg =
      photos[0] || profile.profileImage || profile.profileImageFull;

    document.title = `${candidateName} (${code}) - Lovewanshi Parinay Matrimony`;

    const updateMeta = (prop, content) => {
      if (!content) return;
      let el =
        document.querySelector(`meta[property="${prop}"]`) ||
        document.querySelector(`meta[name="${prop}"]`);
      if (!el) {
        el = document.createElement("meta");
        if (prop.startsWith("og:")) el.setAttribute("property", prop);
        else el.setAttribute("name", prop);
        document.head.appendChild(el);
      }
      el.setAttribute("content", content);
    };

    updateMeta(
      "og:title",
      `${candidateName} (${code})${age ? ` - ${age} Yrs` : ""}${heightFormatted ? `, ${heightFormatted}` : ""} | Lovewanshi Parinay`,
    );
    updateMeta(
      "og:description",
      [
        profile.profession,
        profile.education,
        profile.city,
        profile.gotra ? `Gotra: ${profile.gotra}` : "",
      ]
        .filter(Boolean)
        .join(" • "),
    );
    if (primaryImg) {
      updateMeta("og:image", primaryImg);
      updateMeta("og:image:secure_url", primaryImg);
      updateMeta("twitter:image", primaryImg);
    }
    updateMeta("og:url", window.location.href);
    updateMeta("twitter:card", "summary_large_image");
  }, [profile, photos, age, code]);

  if (loading) {
    return (
      <div style={{ textAlign: "center", padding: "5rem 1rem" }}>
        <div
          style={{
            width: 44,
            height: 44,
            border: "3px solid #F3E8EC",
            borderTopColor: "#8A1538",
            borderRadius: "50%",
            animation: "spin 0.8s linear infinite",
            margin: "0 auto 1rem",
          }}
        />
        <p className="muted" style={{ fontWeight: 600 }}>
          Loading verified matrimonial biodata...
        </p>
      </div>
    );
  }

  if (error || !profile) {
    return (
      <div
        className="card"
        style={{
          maxWidth: 540,
          margin: "4rem auto",
          textAlign: "center",
          padding: "3rem 2rem",
        }}
      >
        <Icon name="user" size={44} color="#9CA3AF" />
        <h3 style={{ marginTop: "1rem", color: "var(--auth-maroon)" }}>
          {error || "Profile Unavailable"}
        </h3>
        <p className="muted small">
          This profile may have been deactivated or is temporarily unavailable.
        </p>
        <Link to="/browse">
          <button
            className="secondary"
            style={{ marginTop: "1rem", borderRadius: "var(--radius-pill)" }}
          >
            &larr; Return to Matches
          </button>
        </Link>
      </div>
    );
  }

  const handlePrevPhoto = (e) => {
    e.stopPropagation();
    setActivePhotoIdx((prev) => (prev > 0 ? prev - 1 : photos.length - 1));
  };

  const handleNextPhoto = (e) => {
    e.stopPropagation();
    setActivePhotoIdx((prev) => (prev < photos.length - 1 ? prev + 1 : 0));
  };

  const renderAttr = (icon, label, value) => {
    if (!value && value !== 0) return null;
    return (
      <div className="biodata-attr-item" key={label}>
        <div className="biodata-attr-icon">
          <Icon name={icon} size={15} color="#8A1538" />
        </div>
        <div className="biodata-attr-content">
          <span className="biodata-attr-label">{label}</span>
          <span className="biodata-attr-value">{value}</span>
        </div>
      </div>
    );
  };

  return (
    <div className="biodata-detail-page">
      {/* Top Breadcrumb navigation */}
      <div className="biodata-breadcrumb-bar">
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            flexWrap: "wrap",
            gap: "0.5rem",
            width: "100%",
          }}
        >
          <Link
            to="/browse"
            className="muted small"
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "0.4rem",
              fontWeight: 600,
              color: "var(--auth-maroon)",
            }}
          >
            <Icon name="arrow-left" size={14} /> Back to Search & Matches
          </Link>
          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
            <button
              type="button"
              className="action-circle-btn"
              onClick={() => setShowShareModal(true)}
              title="Share profile with family & friends"
            >
              <Icon name="share" size={16} />
            </button>
          </div>
        </div>
      </div>

      <div className="matrimony-biodata-grid">
        {/* ================================================================= */}
        {/* LEFT COLUMN: CANDIDATE PORTRAIT & ACTION HUB                      */}
        {/* ================================================================= */}
        <aside className="biodata-left-rail">
          <div className="biodata-portrait-card">
            {/* Main Portrait Frame (3:4 ratio) */}
            <div className="biodata-portrait-frame">
              {photos.length > 0 && !imageLoadFailed ? (
                <img
                  src={photos[activePhotoIdx] || photos[0]}
                  alt={profile.name}
                  className="biodata-portrait-img"
                  crossOrigin="anonymous"
                  onError={() => {
                    if (activePhotoIdx + 1 < photos.length) {
                      setActivePhotoIdx((prev) => prev + 1);
                    } else {
                      setImageLoadFailed(true);
                    }
                  }}
                />
              ) : (
                <AvatarFallback
                  profile={profile}
                  name={profile.name}
                  size={360}
                  glyphSize={90}
                />
              )}

              {/* Code & Verification Badge */}
              <div className="biodata-portrait-code-badge">
                <span>{code}</span>
                {profile.verified !== false && <VerifiedBadge size={15} />}
              </div>

              {/* Photo Counter */}
              {photos.length > 1 && (
                <div className="biodata-portrait-counter">
                  {activePhotoIdx + 1} / {photos.length}
                </div>
              )}

              {/* Navigation Arrows for Photo Carousel */}
              {photos.length > 1 && (
                <>
                  <button
                    type="button"
                    className="biodata-nav-arrow prev"
                    onClick={handlePrevPhoto}
                    title="Previous photo"
                  >
                    <Icon name="arrow-left" size={16} />
                  </button>
                  <button
                    type="button"
                    className="biodata-nav-arrow next"
                    onClick={handleNextPhoto}
                    title="Next photo"
                  >
                    <Icon name="arrow-right" size={16} />
                  </button>
                </>
              )}
            </div>

            {/* Thumbnail Strip */}
            {photos.length > 1 && (
              <div className="biodata-thumbs-strip">
                {photos.map((src, i) => (
                  <button
                    key={i}
                    type="button"
                    className={`biodata-thumb-item ${i === activePhotoIdx ? "active" : ""}`}
                    onClick={() => setActivePhotoIdx(i)}
                  >
                    <img
                      src={src}
                      alt={`Thumbnail ${i + 1}`}
                      crossOrigin="anonymous"
                    />
                  </button>
                ))}
              </div>
            )}

            {/* Action Buttons Box */}
            <div className="biodata-actions-box">
              {!isMine && (
                <>
                  {/* Connect / Like Action */}
                  {!profile.isLiked && !isConnected && (
                    <button
                      type="button"
                      className="btn-connect-primary"
                      style={{
                        width: "100%",
                        justifyContent: "center",
                        padding: "0.85rem 1rem",
                        fontSize: "0.95rem",
                      }}
                      disabled={busy}
                      onClick={sendLike}
                    >
                      <HeartIcon size={18} />
                      <span>
                        {busy ? "Sending..." : "Send Proposal / Connect"}
                      </span>
                    </button>
                  )}

                  {isPending && (
                    <button
                      type="button"
                      className="secondary"
                      style={{
                        width: "100%",
                        justifyContent: "center",
                        padding: "0.75rem 1rem",
                      }}
                      disabled={busy}
                      onClick={withdrawLike}
                    >
                      <span>
                        {busy ? "Withdrawing..." : "Withdraw Proposal"}
                      </span>
                    </button>
                  )}

                  {isConnected && (
                    <div
                      style={{
                        background: "#ECFDF5",
                        color: "#065F46",
                        border: "1px solid #A7F3D0",
                        borderRadius: "var(--radius-pill)",
                        padding: "0.65rem 1rem",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        gap: "0.45rem",
                        fontWeight: 700,
                        fontSize: "0.92rem",
                      }}
                    >
                      <Icon name="check" size={18} />
                      <span>Connected Member</span>
                    </div>
                  )}

                  {/* Shortlist Bookmark */}
                  <button
                    type="button"
                    className="secondary"
                    style={{
                      width: "100%",
                      justifyContent: "center",
                      padding: "0.7rem 1rem",
                    }}
                    disabled={busy}
                    onClick={toggleShortlist}
                  >
                    <BookmarkIcon
                      filled={profile.isShortlisted}
                      size={18}
                      color={profile.isShortlisted ? "#ED4956" : "currentColor"}
                    />
                    <span>
                      {profile.isShortlisted
                        ? "Shortlisted in your list"
                        : "Add to Shortlist"}
                    </span>
                  </button>
                </>
              )}

              {isMine && (
                <Link to="/my-profile" style={{ width: "100%" }}>
                  <button
                    className="secondary"
                    style={{ width: "100%", justifyContent: "center" }}
                  >
                    <Icon name="pencil" size={16} />
                    <span>Edit Your Biodata</span>
                  </button>
                </Link>
              )}

              {/* Share Profile Button */}
              <button
                type="button"
                className="btn-share-profile"
                onClick={() => setShowShareModal(true)}
                title="Share this profile with family on WhatsApp"
              >
                <Icon name="share" size={18} color="#FFFFFF" />
                <span>Share Profile on WhatsApp</span>
              </button>

              {/* Profile Trust Info */}
              <div className="biodata-meta-list">
                <div className="biodata-meta-item">
                  <Icon name="check" size={14} color="#059669" />
                  <span>100% LOVEWANSHI Vaishya Community</span>
                </div>
                {profile.profileCreatedBy && (
                  <div className="biodata-meta-item">
                    <Icon name="user" size={14} color="#8A1538" />
                    <span>
                      Profile created by:{" "}
                      <strong>{profile.profileCreatedBy}</strong>
                    </span>
                  </div>
                )}
                <div className="biodata-meta-item">
                  <Icon name="sparkles" size={14} color="#D4AF37" />
                  <span>Verified Identity & Biodata</span>
                </div>
              </div>
            </div>
          </div>
        </aside>

        {/* ================================================================= */}
        {/* RIGHT COLUMN: DETAILED MATRIMONIAL BIODATA SHEETS                 */}
        {/* ================================================================= */}
        <main className="biodata-right-content">
          {/* Candidate Hero Card */}
          <div className="biodata-hero-card">
            <h1 className="biodata-hero-title">
              {profile.name || "LOVEWANSHI Member"}
              {profile.verified !== false && <VerifiedBadge size={22} />}
            </h1>

            <div className="biodata-hero-subtitle">
              <span>{age ? `${age} Yrs` : "Age not specified"}</span>
              {profile.height && (
                <>
                  <span className="bullet-dot">•</span>
                  <span>{formatHeight(profile.height)}</span>
                </>
              )}
              {profile.maritalStatus && (
                <>
                  <span className="bullet-dot">•</span>
                  <span>{formatMaritalStatus(profile.maritalStatus)}</span>
                </>
              )}
              {profile.gotra && (
                <>
                  <span className="bullet-dot">•</span>
                  <strong style={{ color: "var(--auth-maroon)" }}>
                    {profile.gotra} Gotra
                  </strong>
                </>
              )}
              {(profile.city || profile.state) && (
                <>
                  <span className="bullet-dot">•</span>
                  <span>
                    {[profile.city, profile.state].filter(Boolean).join(", ")}
                  </span>
                </>
              )}
            </div>

            {/* Quick Metrics Matrix Grid */}
            <div className="biodata-quick-matrix">
              <div className="matrix-pill">
                <div className="matrix-pill-icon">
                  <Icon name="sparkles" size={18} />
                </div>
                <div className="matrix-pill-info">
                  <span className="matrix-pill-label">Gotra (गोत्र)</span>
                  <span className="matrix-pill-val">
                    {profile.gotra || "Not specified"}
                  </span>
                </div>
              </div>

              <div className="matrix-pill">
                <div className="matrix-pill-icon">
                  <Icon name="calendar" size={18} />
                </div>
                <div className="matrix-pill-info">
                  <span className="matrix-pill-label">Age & DOB</span>
                  <span
                    className="matrix-pill-val"
                    title={
                      profile.dateOfBirth
                        ? String(profile.dateOfBirth).slice(0, 10)
                        : ""
                    }
                  >
                    {age ? `${age} Yrs` : "Not specified"}
                    {profile.dateOfBirth
                      ? ` (${String(profile.dateOfBirth).slice(0, 4)})`
                      : ""}
                  </span>
                </div>
              </div>

              <div className="matrix-pill">
                <div className="matrix-pill-icon">
                  <Icon name="user" size={18} />
                </div>
                <div className="matrix-pill-info">
                  <span className="matrix-pill-label">Height</span>
                  <span className="matrix-pill-val">
                    {formatHeight(profile.height) || "Not specified"}
                  </span>
                </div>
              </div>

              <div className="matrix-pill">
                <div className="matrix-pill-icon">
                  <Icon name="education" size={18} />
                </div>
                <div className="matrix-pill-info">
                  <span className="matrix-pill-label">Education</span>
                  <span className="matrix-pill-val">
                    {formatEducation(profile.education) || "Graduate"}
                  </span>
                </div>
              </div>

              <div className="matrix-pill">
                <div className="matrix-pill-icon">
                  <Icon name="profession" size={18} />
                </div>
                <div className="matrix-pill-info">
                  <span className="matrix-pill-label">Profession</span>
                  <span className="matrix-pill-val">
                    {formatProfession(profile.profession) || "Not specified"}
                  </span>
                </div>
              </div>

              <div className="matrix-pill">
                <div className="matrix-pill-icon">
                  <Icon name="cash" size={18} />
                </div>
                <div className="matrix-pill-info">
                  <span className="matrix-pill-label">Annual Income</span>
                  <span className="matrix-pill-val">
                    {formatAnnualIncome(profile.annualIncome) ||
                      "Not disclosed"}
                  </span>
                </div>
              </div>

              <div className="matrix-pill">
                <div className="matrix-pill-icon">
                  <Icon name="sparkles" size={18} />
                </div>
                <div className="matrix-pill-info">
                  <span className="matrix-pill-label">Manglik (मांगलिक)</span>
                  <span className="matrix-pill-val">
                    {formatManglik(profile.manglik) || "Not specified"}
                  </span>
                </div>
              </div>

              <div className="matrix-pill">
                <div className="matrix-pill-icon">
                  <Icon name="location" size={18} />
                </div>
                <div className="matrix-pill-info">
                  <span className="matrix-pill-label">Location</span>
                  <span className="matrix-pill-val">
                    {profile.city || profile.state || "India"}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* About Candidate */}
          {profile.aboutMyself && (
            <div className="biodata-section-card">
              <div className="biodata-section-header">
                <h3 className="biodata-section-title">
                  <Icon name="user" size={18} color="#8A1538" />
                  About {profile.name || "Member"}
                </h3>
                <span className="biodata-section-subtitle">
                  In their own words
                </span>
              </div>
              <div className="biodata-quote-box">"{profile.aboutMyself}"</div>
            </div>
          )}

          {/* Horoscope & Community Details */}
          <div className="biodata-section-card">
            <div className="biodata-section-header">
              <h3 className="biodata-section-title">
                <Icon name="sparkles" size={18} color="#8A1538" />
                Gotra & Astrology
              </h3>
              <span className="biodata-section-subtitle">
                Astro and cultural lineage
              </span>
            </div>

            <div className="biodata-attributes-grid">
              {renderAttr("sparkles", "Gotra (गोत्र)", profile.gotra)}
              {renderAttr(
                "sparkles",
                "Manglik (मांगलिक)",
                formatManglik(profile.manglik),
              )}
              {renderAttr("sparkles", "Zodiac / Rashi (राशि)", profile.zodiac)}
              {renderAttr("sparkles", "Nakshatra (नक्षत्र)", profile.nakshatra)}
              {renderAttr(
                "clock",
                "Time of Birth (जन्म समय)",
                profile.timeOfBirth,
              )}
              {renderAttr(
                "location",
                "Birth City / Place of Birth (जन्म शहर)",
                profile.placeOfBirth ||
                  profile.birthCity ||
                  profile.cityOfBirth ||
                  profile.place_of_birth ||
                  "Not Specified",
              )}
            </div>
          </div>

          {/* Education & Career Details */}
          <div className="biodata-section-card">
            <div className="biodata-section-header">
              <h3 className="biodata-section-title">
                <Icon name="education" size={18} color="#8A1538" />
                Education & Career
              </h3>
              <span className="biodata-section-subtitle">
                Qualifications and occupation
              </span>
            </div>

            <div className="biodata-attributes-grid">
              {renderAttr(
                "education",
                "Highest Education",
                formatEducation(profile.education),
              )}
              {renderAttr(
                "education",
                "Education Details (College / Stream)",
                profile.educationDetails,
              )}
              {renderAttr(
                "profession",
                "Profession",
                formatProfession(profile.profession),
              )}
              {renderAttr(
                "profession",
                "Occupation Details",
                profile.occupationDetails,
              )}
              {renderAttr(
                "profession",
                "Employed In",
                formatEmployedIn(profile.employedIn),
              )}
              {renderAttr(
                "profession",
                "Organization / Company",
                profile.organization,
              )}
              {renderAttr(
                "cash",
                "Annual Income",
                formatAnnualIncome(profile.annualIncome),
              )}
              {renderAttr("location", "Work City", profile.workCity)}
            </div>
          </div>

          {/* Family Background */}
          {isLoggedIn() ? (
            <div className="biodata-section-card">
              <div className="biodata-section-header">
                <h3 className="biodata-section-title">
                  <Icon name="users" size={18} color="#8A1538" />
                  Family Details
                </h3>
                <span className="biodata-section-subtitle">
                  Parents, siblings and maternal relatives
                </span>
              </div>

              <div className="biodata-attributes-grid">
                {renderAttr("users", "Father's Name", profile.fathersName)}
                {renderAttr(
                  "profession",
                  "Father's Occupation",
                  profile.fathersOccupation,
                )}
                {renderAttr("users", "Mother's Name", profile.mothersName)}
                {renderAttr(
                  "profession",
                  "Mother's Occupation",
                  profile.mothersOccupation,
                )}
                {renderAttr(
                  "users",
                  "Married Brothers",
                  profile.marriedBrothers,
                )}
                {renderAttr(
                  "users",
                  "Unmarried Brothers",
                  profile.unmarriedBrothers,
                )}
                {renderAttr("users", "Married Sisters", profile.marriedSisters)}
                {renderAttr(
                  "users",
                  "Unmarried Sisters",
                  profile.unmarriedSisters,
                )}
                {renderAttr(
                  "users",
                  "Maternal Uncle's Name (मामाजी)",
                  profile.maternalUnclesName,
                )}
                {renderAttr(
                  "sparkles",
                  "Maternal Uncle's Gotra",
                  profile.maternalUnclesGotra || profile.maternalUnclesAakna,
                )}
              </div>
            </div>
          ) : null}

          {/* Personal Lifestyle & Physical Attributes */}
          <div className="biodata-section-card">
            <div className="biodata-section-header">
              <h3 className="biodata-section-title">
                <Icon name="user" size={18} color="#8A1538" />
                Physical & Lifestyle
              </h3>
              <span className="biodata-section-subtitle">
                Habits and personal traits
              </span>
            </div>

            <div className="biodata-attributes-grid">
              {renderAttr(
                "user",
                "Marital Status",
                formatMaritalStatus(profile.maritalStatus),
              )}
              {renderAttr("user", "Diet Preference", formatDiet(profile.diet))}
              {renderAttr("user", "Height", formatHeight(profile.height))}
              {renderAttr(
                "user",
                "Weight",
                profile.weight ? `${profile.weight} kg` : null,
              )}
              {renderAttr(
                "user",
                "Complexion",
                profile.complexion
                  ? formatComplexion(profile.complexion)
                  : null,
              )}
              {renderAttr(
                "user",
                "Blood Group",
                profile.bloodGroup
                  ? formatBloodGroup(profile.bloodGroup)
                  : null,
              )}
              {renderAttr("user", "Mother Tongue", profile.motherTongue)}
            </div>
          </div>

          {/* Desired Partner Preferences */}
          {profile.partnerPreferences && (
            <div className="biodata-section-card">
              <div className="biodata-section-header">
                <h3 className="biodata-section-title">
                  <Icon name="heart" size={18} color="#8A1538" />
                  Partner Expectations
                </h3>
                <span className="biodata-section-subtitle">
                  Desired attributes in a life partner
                </span>
              </div>
              <div className="biodata-quote-box">
                {profile.partnerPreferences}
              </div>
            </div>
          )}

          {/* Contact Details (Mutually Connected or My Profile Only) */}
          {isLoggedIn() && (
            <div className="biodata-section-card">
              <div className="biodata-section-header">
                <h3 className="biodata-section-title">
                  <Icon name="phone" size={18} color="#8A1538" />
                  Contact & Residence
                </h3>
                <span className="biodata-section-subtitle">
                  {isConnected || isMine
                    ? "Visible because you are connected"
                    : "Protected for privacy"}
                </span>
              </div>

              {isConnected || isMine ? (
                <div className="biodata-attributes-grid">
                  {renderAttr(
                    "phone",
                    "Father's / Guardian Contact",
                    profile.fathersContactNo,
                  )}
                  {renderAttr("mail", "Email Address", profile.email)}
                  {renderAttr("location", "Current City", profile.city)}
                  {renderAttr("location", "State", profile.state)}
                  {renderAttr(
                    "location",
                    "Present Address",
                    profile.presentAddress,
                  )}
                  {renderAttr(
                    "location",
                    "Permanent Address",
                    profile.permanentAddress,
                  )}
                </div>
              ) : (
                <div className="biodata-locked-box">
                  <Icon name="lock" size={24} color="#8A1538" />
                  <div>
                    <strong
                      style={{
                        color: "var(--auth-maroon)",
                        display: "block",
                        marginBottom: 2,
                      }}
                    >
                      Contact information is private
                    </strong>
                    <span>
                      Direct phone numbers, email, and home address are revealed
                      once your proposal / connection request is accepted by{" "}
                      {profile.name || "the family"}.
                    </span>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Kundali Guna Milan Match (Moved to Bottom as Requested) */}
          {isLoggedIn() && !isMine && id && (
            <KundaliMatchCard profileId={id} name={profile.name} />
          )}

          {/* Guest Callout (when visitor is not logged in) */}
          {!isLoggedIn() && (
            <div className="biodata-guest-card">
              <div
                style={{
                  width: 58,
                  height: 58,
                  borderRadius: "50%",
                  background: "#FDF2F4",
                  display: "inline-flex",
                  alignItems: "center",
                  justifyContent: "center",
                  margin: "0 auto 0.5rem",
                }}
              >
                <Icon name="lock" size={28} color="#8A1538" />
              </div>
              <h3 className="biodata-guest-title">
                Connect with {profile.name || "this LOVEWANSHI Member"}
              </h3>
              <p className="biodata-guest-sub">
                Create a free profile on Lovewanshi Parinay to unlock full
                family details, match Kundali with 36 Gunas, and send marriage
                proposals.
              </p>
              <div
                style={{
                  display: "flex",
                  gap: "0.85rem",
                  justifyContent: "center",
                  flexWrap: "wrap",
                }}
              >
                <Link to="/login" state={{ from: location.pathname }}>
                  <button
                    className="btn-connect-primary"
                    style={{ padding: "0.75rem 2rem", fontSize: "0.95rem" }}
                  >
                    Log In to Connect
                  </button>
                </Link>
                <Link to="/signup" state={{ from: location.pathname }}>
                  <button
                    className="secondary"
                    style={{
                      padding: "0.75rem 2rem",
                      fontSize: "0.95rem",
                      borderRadius: "var(--radius-pill)",
                      fontWeight: 700,
                    }}
                  >
                    Register Free
                  </button>
                </Link>
              </div>
            </div>
          )}
        </main>
      </div>

      {showShareModal && (
        <ShareProfileModal
          profile={profile}
          photos={photos}
          onClose={() => setShowShareModal(false)}
        />
      )}
    </div>
  );
}

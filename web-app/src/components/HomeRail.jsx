import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { VerifiedBadge, HeartIcon, BookmarkIcon, Icon } from "./Icons";
import AvatarFallback from "./AvatarFallback";
import { formatHeight, formatProfession } from "../formatters";

function calculateAge(dob) {
  if (!dob) return null;
  const diff = Date.now() - new Date(dob).getTime();
  const age = Math.floor(diff / (365.25 * 24 * 60 * 60 * 1000));
  return age > 0 && age < 120 ? age : null;
}

export default function HomeRail({
  title,
  profiles = [],
  variant = "filled",
  onConnect,
  onShortlist,
  seeAllLink = "/browse",
}) {
  const navigate = useNavigate();
  const [busyId, setBusyId] = useState(null);

  if (!profiles || profiles.length === 0) return null;

  async function handleConnect(p, e) {
    e.preventDefault();
    e.stopPropagation();
    if (!onConnect) return;
    setBusyId(p.id);
    try {
      await onConnect(p);
    } finally {
      setBusyId(null);
    }
  }

  async function handleShortlist(p, e) {
    e.preventDefault();
    e.stopPropagation();
    if (!onShortlist) return;
    setBusyId(p.id);
    try {
      await onShortlist(p);
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div className="home-rail-section">
      <div className="rail-header">
        <h3 className="rail-title">{title}</h3>
        {seeAllLink && (
          <Link to={seeAllLink} className="rail-see-all">
            See all
          </Link>
        )}
      </div>

      <div className="rail-scroll-wrap">
        {profiles.map((profile, idx) => {
          const id = profile.id || profile.profileId || idx;
          const name = profile.name || profile.fullName || "Anonymous";
          const img = profile.profileImageFull || profile.profileImage || profile.imageUrl;
          const age = calculateAge(profile.dateOfBirth);
          const isMine = profile.isMine;
          const isLiked = profile.isLiked || profile.likeStatus === "ACCEPTED" || profile.likeStatus === "PENDING";
          const isConnected = profile.likeStatus === "ACCEPTED";
          const isShortlisted = profile.isShortlisted;
          const heightFormatted = formatHeight(profile.height);
          const professionFormatted = formatProfession(profile.profession);

          return (
            <div className={`rail-card ${variant}`} key={id}>
              <Link to={`/profiles/${id}`} className="rail-card-link">
                <div className="rail-photo-wrap">
                  {img ? (
                    <img src={img} alt={name} className="rail-photo" />
                  ) : (
                    <AvatarFallback profile={profile} name={name} size={180} />
                  )}

                  {profile.verified !== false && (
                    <div className="rail-verified-tag">
                      <VerifiedBadge size={14} />
                    </div>
                  )}

                  {/* Bookmark Button */}
                  {!isMine && (
                    <button
                      type="button"
                      className={`rail-save-btn ${isShortlisted ? "active" : ""}`}
                      onClick={(e) => handleShortlist(profile, e)}
                      title={isShortlisted ? "Remove from shortlist" : "Add to shortlist"}
                      disabled={busyId === id}
                    >
                      <BookmarkIcon filled={isShortlisted} size={15} color={isShortlisted ? "#ED4956" : "#262626"} />
                    </button>
                  )}
                </div>

                <div className="rail-card-body">
                  <div className="rail-name-row">
                    <span className="rail-name">{name}</span>
                  </div>

                  <div className="rail-meta">
                    {[age ? `${age} yrs` : "", heightFormatted].filter(Boolean).join(" • ")}
                  </div>

                  {professionFormatted && <div className="rail-meta rail-profession">{professionFormatted}</div>}
                  {profile.city && <div className="rail-location">{profile.city}</div>}
                </div>
              </Link>

              <div className="rail-spacer" />

              {!isMine && (
                <div className="rail-action-wrap">
                  {!isLiked ? (
                    <button
                      type="button"
                      className={`rail-connect-btn ${variant === "outline" ? "outline" : ""}`}
                      disabled={busyId === id}
                      onClick={(e) => handleConnect(profile, e)}
                    >
                      <HeartIcon size={14} />
                      <span>Connect</span>
                    </button>
                  ) : isConnected ? (
                    <button
                      type="button"
                      className="rail-connect-btn connected"
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        navigate(`/profiles/${id}`);
                      }}
                    >
                      <Icon name="check" size={14} />
                      <span>Connected</span>
                    </button>
                  ) : (
                    <button
                      type="button"
                      className="rail-connect-btn requested"
                      disabled={busyId === id}
                      onClick={(e) => handleConnect(profile, e)}
                      title="Click to withdraw request"
                    >
                      <span>Requested</span>
                    </button>
                  )}
                </div>
              )}
            </div>
          );
        })}

        {seeAllLink && (
          <Link to={seeAllLink} className="rail-more-card">
            <div className="rail-more-icon-wrap">
              <Icon name="search" size={22} color="#A5122F" />
            </div>
            <span className="rail-more-text">See more</span>
            <span className="rail-more-hindi">और देखें</span>
          </Link>
        )}
      </div>
    </div>
  );
}

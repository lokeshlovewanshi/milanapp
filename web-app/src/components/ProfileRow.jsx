import React from "react";
import { Link } from "react-router-dom";
import { VerifiedBadge, Icon } from "./Icons";
import AvatarFallback from "./AvatarFallback";
import { formatHeight, formatProfession } from "../formatters";

export function formatProfileCode(id) {
  if (!id) return "";
  const raw = String(id);
  const digits = raw.startsWith("JM") || raw.startsWith("GM") ? raw.slice(2) : raw.padStart(5, "0");
  return `GM${digits}`;
}

export default function ProfileRow({
  profile = {},
  action,
  onDismiss,
  dismissLabel = "Remove",
  meta,
  linkTo,
}) {
  const id = profile.id || profile.profileId;
  const name = profile.name || profile.fullName || "Anonymous";
  const img = profile.profileImageFull || profile.profileImage || profile.imageUrl;
  const code = formatProfileCode(id);

  const subtitle = [
    formatProfession(profile.profession),
    formatHeight(profile.height),
    profile.city || profile.presentAddress,
  ]
    .filter(Boolean)
    .join(" • ");

  const rowContent = (
    <div className="profile-row-card">
      <div className="row-avatar-wrap">
        <div className="row-avatar-ring">
          {img ? (
            <img src={img} alt={name} className="row-avatar-img" />
          ) : (
            <AvatarFallback profile={profile} name={name} size={54} glyphSize={20} />
          )}
        </div>
      </div>

      <div className="row-info-col">
        <div className="row-name-line">
          <span className="row-profile-name">{name}</span>
          {profile.verified !== false && <VerifiedBadge size={14} />}
          <span className="row-profile-code">{code}</span>
        </div>

        {meta && <div className="row-meta-tag">{meta}</div>}
        {subtitle && <div className="row-subtitle-text">{subtitle}</div>}
      </div>

      {action && (
        <div className="row-action-slot" onClick={(e) => e.stopPropagation()}>
          {action}
        </div>
      )}

      {onDismiss && (
        <button
          type="button"
          className="row-dismiss-btn"
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            onDismiss();
          }}
          title={dismissLabel}
        >
          <Icon name="close" size={16} color="#A5122F" />
        </button>
      )}
    </div>
  );

  if (linkTo || id) {
    return (
      <Link to={linkTo || `/profiles/${id}`} className="profile-row-link">
        {rowContent}
      </Link>
    );
  }

  return rowContent;
}

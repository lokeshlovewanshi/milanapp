import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { storyAPI } from "../api";
import AvatarFallback from "./AvatarFallback";

export default function TopStories({ fallbackProfiles = [], myId = null }) {
  const [stories, setStories] = useState([]);

  useEffect(() => {
    let alive = true;
    storyAPI
      .getTopStories()
      .then((res) => {
        const list = Array.isArray(res) ? res : res?.content || [];
        if (alive) {
          setStories(list.length > 0 ? list : fallbackProfiles.slice(0, 12));
        }
      })
      .catch(() => {
        if (alive) setStories(fallbackProfiles.slice(0, 12));
      });

    return () => {
      alive = false;
    };
  }, [fallbackProfiles]);

  const rawList = stories.length > 0 ? stories : fallbackProfiles.slice(0, 12);
  const currentUser = (() => {
    try {
      const u = localStorage.getItem("user");
      return u ? JSON.parse(u) : null;
    } catch {
      return null;
    }
  })();
  const currentUserId = myId || currentUser?.id || currentUser?.profileId || currentUser?.userProfileId || currentUser?.displayId;

  const displayList = rawList.filter((p) => {
    if (!currentUserId) return true;
    const pId = p.id || p.profileId || p.userProfileId || p.displayId;
    const clean = (v) => (v != null ? String(v).trim().toUpperCase() : "");
    const myIdStr = clean(currentUserId);
    const itemStr = clean(pId);
    return itemStr !== myIdStr &&
           itemStr.replace(/^JM0*/, "") !== myIdStr.replace(/^JM0*/, "");
  });

  if (!displayList || displayList.length === 0) return null;

  return (
    <div className="top-stories-section">
      <div className="section-header-simple">
        <h3 className="section-title">Top Stories</h3>
        <span className="section-subtitle">Featured by Gahoi Parinay</span>
      </div>

      <div className="stories-rail">
        {displayList.map((p, idx) => {
          const id = p.id || p.profileId || idx;
          const name = p.name || p.fullName || "Member";
          const img = p.profileImageFull || p.profileImage || p.imageUrl;

          return (
            <Link to={`/profiles/${id}`} key={id} className="story-item">
              <div className="story-ring-wrap">
                <div className="story-inset">
                  {img ? (
                    <img src={img} alt={name} className="story-avatar" />
                  ) : (
                    <AvatarFallback profile={p} name={name} size={64} glyphSize={20} />
                  )}
                </div>
              </div>
              <span className="story-name">{name}</span>
            </Link>
          );
        })}
      </div>
    </div>
  );
}

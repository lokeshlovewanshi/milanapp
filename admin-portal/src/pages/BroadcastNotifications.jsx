import React, { useState } from "react";
import { api } from "../api";

const PRESETS = [
  {
    label: "🎉 Festival Greeting",
    title: "✨ Festival Greetings from Lovewanshi Parinay",
    body: "Wishing you and your family joy and prosperity on this auspicious occasion! Find your perfect match today.",
    link: "/browse",
  },
  {
    label: "👑 New Verified Profiles",
    title: "✨ New Profiles Added Today!",
    body: "New verified profiles from Jhansi, Kanpur, Gwalior & Mauranipur have joined Lovewanshi Parinay. Check them out now!",
    link: "/browse",
  },
  {
    label: "💎 Special Membership Offer",
    title: "🔥 Special Discount on Premium Plan",
    body: "Upgrade your membership today to unlock unlimited direct phone numbers and horoscope compatibility!",
    link: "/plans",
  },
  {
    label: "🚀 App Update Announcement",
    title: "📲 New App Feature Available",
    body: "We have updated the Lovewanshi Parinay app with a clean new design and faster Kundali matching. Update now on Play Store!",
    link: "/browse",
  },
];

export default function BroadcastNotifications() {
  const [activeTab, setActiveTab] = useState("broadcast"); // "broadcast" or "single"

  // Common notification fields
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [link, setLink] = useState("/browse");

  // Broadcast specific
  const [topic, setTopic] = useState("all-users");
  const [saveToFeed, setSaveToFeed] = useState(true);

  // Single user specific
  const [targetUserId, setTargetUserId] = useState("");
  const [userSearchQuery, setUserSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [searchingUser, setSearchingUser] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);

  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState(null);
  const [error, setError] = useState(null);
  const [showConfirm, setShowConfirm] = useState(false);

  function applyPreset(preset) {
    setTitle(preset.title);
    setBody(preset.body);
    setLink(preset.link);
    setError(null);
    setMessage(null);
  }

  async function handleSearchUser(query) {
    setUserSearchQuery(query);
    if (!query || query.trim().length < 2) {
      setSearchResults([]);
      return;
    }

    setSearchingUser(true);
    try {
      const res = await api.allProfiles(query.trim(), 0, 5);
      setSearchResults(res?.content || []);
    } catch {
      setSearchResults([]);
    } finally {
      setSearchingUser(false);
    }
  }

  function handleSelectUser(user) {
    setSelectedUser(user);
    setTargetUserId(String(user.id));
    setSearchResults([]);
    setUserSearchQuery(`${user.name || "Member"} (${user.displayId || user.id})`);
  }

  async function handleSend(e) {
    if (e) e.preventDefault();
    if (!title.trim()) {
      setError("Notification title is required.");
      return;
    }
    if (!body.trim()) {
      setError("Notification message body is required.");
      return;
    }

    if (activeTab === "single") {
      const uid = parseInt(targetUserId, 10);
      if (isNaN(uid) || uid <= 0) {
        setError("Please enter or select a valid target user.");
        return;
      }
    }

    setLoading(true);
    setError(null);
    setMessage(null);

    try {
      if (activeTab === "broadcast") {
        const res = await api.sendBroadcastNotification({
          title: title.trim(),
          body: body.trim(),
          topic: topic || "all-users",
          link: link.trim() || null,
          saveToFeed: saveToFeed,
        });
        setMessage(res?.message || "🎉 Broadcast push notification sent successfully to all users!");
      } else {
        const uid = parseInt(targetUserId, 10);
        const res = await api.sendSingleUserNotification({
          userId: uid,
          title: title.trim(),
          body: body.trim(),
          link: link.trim() || null,
        });
        setMessage(
          res?.message ||
            `🎉 Push notification sent successfully to ${selectedUser?.name ? selectedUser.name : `User #${uid}`}!`
        );
      }
      setShowConfirm(false);
    } catch (err) {
      setError(err?.message || "Failed to send notification.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="broadcast-page">
      <div className="page-header" style={{ marginBottom: "1.5rem" }}>
        <div>
          <h2>📢 Notifications Center</h2>
          <p className="muted" style={{ margin: 0 }}>
            Send real-time mobile push notifications (FCM) and in-app bell announcements to members.
          </p>
        </div>

        {/* Tab switcher */}
        <div style={{ display: "flex", background: "#E5E7EB", borderRadius: "8px", padding: "4px" }}>
          <button
            type="button"
            className={activeTab === "broadcast" ? "primary" : "secondary"}
            onClick={() => {
              setActiveTab("broadcast");
              setError(null);
              setMessage(null);
            }}
            style={{ borderRadius: "6px", padding: "0.5rem 1rem", fontSize: "0.9rem" }}
          >
            📢 Broadcast to All
          </button>
          <button
            type="button"
            className={activeTab === "single" ? "primary" : "secondary"}
            onClick={() => {
              setActiveTab("single");
              setError(null);
              setMessage(null);
            }}
            style={{ borderRadius: "6px", padding: "0.5rem 1rem", fontSize: "0.9rem" }}
          >
            👤 Send to Single User
          </button>
        </div>
      </div>

      {message && <div className="success-banner" style={{ marginBottom: "1rem" }}>{message}</div>}
      {error && <div className="error-banner" style={{ marginBottom: "1rem" }}>{error}</div>}

      {/* Preset Quick Select */}
      <div className="card" style={{ marginBottom: "1.5rem" }}>
        <h3 style={{ margin: "0 0 0.75rem 0", fontSize: "1rem" }}>⚡ Quick Message Templates</h3>
        <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
          {PRESETS.map((p, i) => (
            <button
              key={i}
              type="button"
              className="secondary small"
              onClick={() => applyPreset(p)}
              style={{ borderRadius: "20px" }}
            >
              {p.label}
            </button>
          ))}
        </div>
      </div>

      <div className="broadcast-layout">
        {/* Form Column */}
        <div className="card">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              setShowConfirm(true);
            }}
          >
            {activeTab === "single" && (
              <div
                style={{
                  background: "#F9FAFB",
                  border: "1px solid #E5E7EB",
                  borderRadius: "8px",
                  padding: "1rem",
                  marginBottom: "1.2rem",
                }}
              >
                <label style={{ display: "block", fontWeight: "600", marginBottom: "0.4rem" }}>
                  Target Member <span style={{ color: "#DC2626" }}>*</span>
                </label>
                <div style={{ position: "relative" }}>
                  <input
                    type="text"
                    className="input-field"
                    placeholder="Search by name, email, mobile or enter Raw User ID..."
                    value={userSearchQuery}
                    onChange={(e) => {
                      handleSearchUser(e.target.value);
                      if (/^\d+$/.test(e.target.value.trim())) {
                        setTargetUserId(e.target.value.trim());
                      }
                    }}
                    required
                    style={{ width: "100%", padding: "0.65rem 0.85rem" }}
                  />
                  {searchingUser && (
                    <div style={{ position: "absolute", right: "12px", top: "10px", fontSize: "0.8rem", color: "#6B7280" }}>
                      Searching...
                    </div>
                  )}

                  {searchResults.length > 0 && (
                    <div
                      style={{
                        position: "absolute",
                        top: "100%",
                        left: 0,
                        right: 0,
                        background: "#FFFFFF",
                        border: "1px solid #D1D5DB",
                        borderRadius: "8px",
                        boxShadow: "0 10px 15px rgba(0,0,0,0.1)",
                        zIndex: 10,
                        marginTop: "4px",
                        maxHeight: "220px",
                        overflowY: "auto",
                      }}
                    >
                      {searchResults.map((u) => (
                        <div
                          key={u.id}
                          onClick={() => handleSelectUser(u)}
                          style={{
                            padding: "0.65rem 0.85rem",
                            borderBottom: "1px solid #F3F4F6",
                            cursor: "pointer",
                            display: "flex",
                            alignItems: "center",
                            gap: "0.75rem",
                            transition: "background 0.1s",
                          }}
                          onMouseEnter={(e) => (e.currentTarget.style.background = "#F3F4F6")}
                          onMouseLeave={(e) => (e.currentTarget.style.background = "#FFFFFF")}
                        >
                          <img
                            src={u.profileImage || "/placeholder.svg"}
                            alt=""
                            style={{ width: "30px", height: "30px", borderRadius: "50%", objectFit: "cover" }}
                          />
                          <div>
                            <div style={{ fontWeight: "600", fontSize: "0.9rem" }}>{u.name || "Member"}</div>
                            <div style={{ fontSize: "0.78rem", color: "#6B7280" }}>
                              {u.displayId} | {u.mobileNo || u.email || `ID: ${u.id}`}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {selectedUser && (
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "0.75rem",
                      background: "#ECFDF5",
                      border: "1px solid #A7F3D0",
                      borderRadius: "6px",
                      padding: "0.6rem 0.85rem",
                      marginTop: "0.75rem",
                    }}
                  >
                    <img
                      src={selectedUser.profileImage || "/placeholder.svg"}
                      alt=""
                      style={{ width: "36px", height: "36px", borderRadius: "50%", objectFit: "cover" }}
                    />
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: "600", color: "#065F46" }}>{selectedUser.name}</div>
                      <div style={{ fontSize: "0.8rem", color: "#047857" }}>
                        ID: {selectedUser.displayId} | Mobile: {selectedUser.mobileNo || "N/A"}
                      </div>
                    </div>
                    <button
                      type="button"
                      className="secondary small"
                      onClick={() => {
                        setSelectedUser(null);
                        setTargetUserId("");
                        setUserSearchQuery("");
                      }}
                      style={{ padding: "0.2rem 0.5rem", fontSize: "0.75rem" }}
                    >
                      Change
                    </button>
                  </div>
                )}
              </div>
            )}

            <div className="form-group" style={{ marginBottom: "1.2rem" }}>
              <label style={{ display: "block", fontWeight: "600", marginBottom: "0.4rem" }}>
                Notification Title <span style={{ color: "#DC2626" }}>*</span>
              </label>
              <input
                type="text"
                className="input-field"
                placeholder="e.g. ✨ Greetings from Lovewanshi Parinay!"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                required
                style={{ width: "100%", padding: "0.65rem 0.85rem" }}
              />
            </div>

            <div className="form-group" style={{ marginBottom: "1.2rem" }}>
              <label style={{ display: "block", fontWeight: "600", marginBottom: "0.4rem" }}>
                Notification Message Body <span style={{ color: "#DC2626" }}>*</span>
              </label>
              <textarea
                className="input-field"
                rows={4}
                placeholder="Write message details for the push notification..."
                value={body}
                onChange={(e) => setBody(e.target.value)}
                required
                style={{ width: "100%", padding: "0.65rem 0.85rem", resize: "vertical" }}
              />
            </div>

            <div
              className="form-grid"
              style={{
                gridTemplateColumns: activeTab === "broadcast" ? undefined : "1fr",
                marginBottom: "1.2rem",
              }}
            >
              {activeTab === "broadcast" && (
                <div>
                  <label style={{ display: "block", fontWeight: "600", marginBottom: "0.4rem" }}>
                    Target Topic Audience
                  </label>
                  <select
                    className="input-field"
                    value={topic}
                    onChange={(e) => setTopic(e.target.value)}
                    style={{ width: "100%", padding: "0.65rem 0.85rem" }}
                  >
                    <option value="all-users">📢 All Registered Users (Default)</option>
                    <option value="android">📱 Android App Users</option>
                    <option value="ios">🍎 iOS App Users</option>
                  </select>
                </div>
              )}

              <div>
                <label style={{ display: "block", fontWeight: "600", marginBottom: "0.4rem" }}>
                  In-App Deep Link (Optional)
                </label>
                <input
                  type="text"
                  className="input-field"
                  placeholder="e.g. /browse or /plans or /me"
                  value={link}
                  onChange={(e) => setLink(e.target.value)}
                  style={{ width: "100%", padding: "0.65rem 0.85rem" }}
                />
              </div>
            </div>

            {activeTab === "broadcast" && (
              <div style={{ marginBottom: "1.5rem", display: "flex", alignItems: "center", gap: "0.6rem" }}>
                <input
                  type="checkbox"
                  id="saveToFeed"
                  checked={saveToFeed}
                  onChange={(e) => setSaveToFeed(e.target.checked)}
                  style={{ width: "18px", height: "18px", cursor: "pointer" }}
                />
                <label htmlFor="saveToFeed" style={{ cursor: "pointer", fontWeight: "500", fontSize: "0.92rem" }}>
                  Also save to user in-app Notification Feed (Bell icon)
                </label>
              </div>
            )}

            <button
              type="submit"
              className="primary"
              disabled={
                loading ||
                !title.trim() ||
                !body.trim() ||
                (activeTab === "single" && !targetUserId)
              }
              style={{ width: "100%", padding: "0.75rem", fontSize: "1rem" }}
            >
              {loading
                ? "Sending..."
                : activeTab === "broadcast"
                ? "🚀 Send Broadcast Notification Now"
                : "🚀 Send Push Notification to User"}
            </button>
          </form>
        </div>

        {/* Live Device Preview Column */}
        <div>
          <div className="card">
            <h3 style={{ margin: "0 0 1rem 0", fontSize: "1rem", color: "#374151" }}>📱 Mobile Lockscreen Preview</h3>

            <div
              style={{
                background: "linear-gradient(135deg, #1E1E2E 0%, #2A2A3C 100%)",
                borderRadius: "16px",
                padding: "1.25rem 1rem",
                color: "#FFFFFF",
                boxShadow: "0 10px 25px rgba(0,0,0,0.2)",
              }}
            >
              <div style={{ fontSize: "0.75rem", opacity: 0.7, marginBottom: "0.75rem", textAlign: "center" }}>
                Lovewanshi Parinay Push Notification
              </div>

              <div
                style={{
                  background: "rgba(255, 255, 255, 0.12)",
                  backdropFilter: "blur(10px)",
                  borderRadius: "12px",
                  padding: "0.85rem 1rem",
                  border: "1px solid rgba(255, 255, 255, 0.15)",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "0.35rem" }}>
                  <div
                    style={{
                      width: "20px",
                      height: "20px",
                      borderRadius: "5px",
                      background: "#A5122F",
                      color: "white",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontSize: "10px",
                      fontWeight: "bold",
                    }}
                  >
                    GP
                  </div>
                  <span style={{ fontSize: "0.8rem", fontWeight: "600", opacity: 0.9 }}>Lovewanshi Parinay</span>
                  <span style={{ fontSize: "0.7rem", opacity: 0.5, marginLeft: "auto" }}>now</span>
                </div>

                <div style={{ fontWeight: "700", fontSize: "0.92rem", marginBottom: "0.2rem", color: "#FFFFFF" }}>
                  {title || "Notification Title Header"}
                </div>

                <div
                  style={{
                    fontSize: "0.83rem",
                    opacity: 0.85,
                    lineHeight: "1.35",
                    wordBreak: "break-word",
                  }}
                >
                  {body || "Your message text will appear right here on user's phone."}
                </div>
              </div>
            </div>

            <div style={{ marginTop: "1.2rem", fontSize: "0.82rem", color: "#6B7280", lineHeight: "1.4" }}>
              {activeTab === "broadcast" ? (
                <>💡 <strong>Note:</strong> Sending delivers a real-time FCM push notification to all active devices subscribed to <code>{topic}</code>.</>
              ) : (
                <>💡 <strong>Note:</strong> Delivers directly to {selectedUser ? <strong>{selectedUser.name}</strong> : "the target user's"} device and records in their bell notification feed.</>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Confirmation Modal */}
      {showConfirm && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.5)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 1000,
            padding: "1rem",
          }}
        >
          <div className="card" style={{ maxWidth: "450px", width: "100%", padding: "1.5rem" }}>
            <h3 style={{ margin: "0 0 0.5rem 0", color: "#991B1B" }}>
              ⚠️ Confirm {activeTab === "broadcast" ? "Broadcast" : "Direct Push"}
            </h3>
            <p style={{ fontSize: "0.92rem", color: "#374151", marginBottom: "1rem" }}>
              {activeTab === "broadcast" ? (
                <>Are you sure you want to broadcast this notification to <strong>ALL users</strong>?</>
              ) : (
                <>Are you sure you want to send this notification to <strong>{selectedUser?.name || `User #${targetUserId}`}</strong>?</>
              )}
            </p>

            <div style={{ background: "#F3F4F6", padding: "0.75rem 1rem", borderRadius: "8px", marginBottom: "1.2rem" }}>
              <div style={{ fontWeight: "700", marginBottom: "0.25rem" }}>{title}</div>
              <div style={{ fontSize: "0.85rem", color: "#4B5563" }}>{body}</div>
            </div>

            <div style={{ display: "flex", gap: "0.75rem", justifyContent: "flex-end" }}>
              <button type="button" className="secondary" onClick={() => setShowConfirm(false)}>
                Cancel
              </button>
              <button type="button" className="primary" onClick={handleSend} disabled={loading}>
                {loading ? "Sending..." : "Yes, Send Now"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

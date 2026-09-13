import { useEffect, useRef, useState } from "react";
import {
  Link,
  useNavigate,
  useParams,
  useSearchParams,
} from "react-router-dom";
import { api } from "../api";
import ContactMessageModal from "../components/ContactMessageModal";
import {
  GENDER_OPTIONS,
  HEIGHT_OPTIONS,
  MARITAL_STATUS_OPTIONS,
  COMPLEXION_OPTIONS,
  DIET_OPTIONS,
  BLOOD_GROUP_OPTIONS,
  MOTHER_TONGUE_OPTIONS,
  PROFILE_CREATED_BY_OPTIONS,
  STATE_OPTIONS,
  GOTRA_OPTIONS,
  MANGLIK_OPTIONS,
  ZODIAC_OPTIONS,
  NAKSHATRA_OPTIONS,
  EDUCATION_OPTIONS,
  PROFESSION_OPTIONS,
  EMPLOYED_IN_OPTIONS,
  INCOME_OPTIONS,
  HOUSE_STATUS_OPTIONS,
  CAR_STATUS_OPTIONS,
  DISABILITY_OPTIONS,
  BODY_TYPE_OPTIONS,
  useReference,
  useLocations,
} from "../referenceData";
import { formatCode } from "../formatters";

function age(dob) {
  if (!dob) return null;
  const diff = Date.now() - new Date(dob).getTime();
  return Math.floor(diff / (365.25 * 24 * 60 * 60 * 1000));
}

// Every field an admin can edit, grouped for the form with proper types and options
const EDIT_SECTIONS = [
  {
    title: "Personal",
    fields: [
      { key: "name", label: "Full Name", required: true },
      {
        key: "gender",
        label: "Gender",
        type: "select",
        category: "gender",
        options: GENDER_OPTIONS,
      },
      {
        key: "maritalStatus",
        label: "Marital Status",
        type: "select",
        category: "marital_status",
        options: MARITAL_STATUS_OPTIONS,
      },
      { key: "dateOfBirth", label: "Date of Birth", type: "date" },
      {
        key: "height",
        label: "Height",
        type: "select",
        category: "height",
        options: HEIGHT_OPTIONS,
      },
      { key: "weight", label: "Weight (kg)", type: "number" },
      {
        key: "complexion",
        label: "Complexion",
        type: "select",
        category: "complexion",
        options: COMPLEXION_OPTIONS,
      },
      {
        key: "diet",
        label: "Diet",
        type: "select",
        category: "diet",
        options: DIET_OPTIONS,
      },
      {
        key: "bloodGroup",
        label: "Blood Group",
        type: "select",
        category: "blood_group",
        options: BLOOD_GROUP_OPTIONS,
      },
      {
        key: "motherTongue",
        label: "Mother Tongue",
        type: "select",
        category: "mother_tongue",
        options: MOTHER_TONGUE_OPTIONS,
      },
      {
        key: "profileCreatedBy",
        label: "Profile Created By",
        type: "select",
        category: "profile_created_by",
        options: PROFILE_CREATED_BY_OPTIONS,
      },
      {
        key: "disability",
        label: "Disability / Special Needs",
        type: "select",
        category: "disability",
        options: DISABILITY_OPTIONS,
      },
    ],
  },
  {
    title: "Location & Address",
    fields: [
      { key: "country", label: "Country" },
      {
        key: "state",
        label: "State",
        type: "select",
        category: "states",
        options: STATE_OPTIONS,
      },
      { key: "city", label: "City" },
      { key: "town", label: "Town / Native Place (मूल निवास)" },
      { key: "presentAddress", label: "Present Address", type: "textarea" },
      { key: "permanentAddress", label: "Permanent Address", type: "textarea" },
    ],
  },
  {
    title: "Contact",
    fields: [
      { key: "whatsappNo", label: "WhatsApp Number" },
      { key: "fathersContactNo", label: "Father's Contact Number" },
    ],
  },
  {
    title: "Religion & Astrology",
    fields: [
      {
        key: "gotra",
        label: "Gotra",
        type: "select",
        category: "gotra",
        options: GOTRA_OPTIONS,
      },
      { key: "aakna", label: "Aakna" },
      {
        key: "manglik",
        label: "Manglik Status",
        type: "select",
        category: "manglik",
        options: MANGLIK_OPTIONS,
      },
      { key: "timeOfBirth", label: "Time of Birth" },
      { key: "placeOfBirth", label: "Place of Birth (City)" },
      {
        key: "zodiac",
        label: "Zodiac / Rashi",
        type: "select",
        category: "rashi",
        options: ZODIAC_OPTIONS,
      },
      {
        key: "nakshatra",
        label: "Nakshatra",
        type: "select",
        category: "nakshatra",
        options: NAKSHATRA_OPTIONS,
      },
    ],
  },
  {
    title: "Family Details",
    fields: [
      { key: "fathersName", label: "Father's Name" },
      {
        key: "fathersOccupation",
        label: "Father's Occupation",
        type: "select",
        category: "profession",
        options: PROFESSION_OPTIONS,
      },
      { key: "mothersName", label: "Mother's Name" },
      {
        key: "mothersOccupation",
        label: "Mother's Occupation",
        type: "select",
        category: "profession",
        options: PROFESSION_OPTIONS,
      },
      { key: "marriedBrothers", label: "Married Brothers", type: "number" },
      { key: "unmarriedBrothers", label: "Unmarried Brothers", type: "number" },
      { key: "marriedSisters", label: "Married Sisters", type: "number" },
      { key: "unmarriedSisters", label: "Unmarried Sisters", type: "number" },
      { key: "maternalUnclesName", label: "Maternal Uncle's Name (मामाजी)" },
      { key: "maternalUnclesAakna", label: "Maternal Uncle's Aakna" },
      { key: "maternalUnclesGotra", label: "Maternal Uncle's Gotra" },
    ],
  },
  {
    title: "Education & Career",
    fields: [
      {
        key: "education",
        label: "Highest Education",
        type: "select",
        category: "education",
        options: EDUCATION_OPTIONS,
      },
      {
        key: "educationDetails",
        label: "Education Details (College / Stream)",
      },
      {
        key: "profession",
        label: "Profession",
        type: "select",
        category: "profession",
        options: PROFESSION_OPTIONS,
      },
      {
        key: "employedIn",
        label: "Employed In",
        type: "select",
        category: "employed_in",
        options: EMPLOYED_IN_OPTIONS,
      },
      { key: "organization", label: "Company / Organization" },
      {
        key: "annualIncome",
        label: "Annual Income",
        type: "select",
        category: "annual_income",
        options: INCOME_OPTIONS,
      },
      { key: "workCity", label: "Work City / Location" },
    ],
  },
  {
    title: "Assets",
    fields: [
      {
        key: "houseStatus",
        label: "House Status",
        type: "select",
        category: "house_status",
        options: HOUSE_STATUS_OPTIONS,
      },
      {
        key: "carStatus",
        label: "Car Status",
        type: "select",
        category: "car_status",
        options: CAR_STATUS_OPTIONS,
      },
    ],
  },
  {
    title: "About & Expectations",
    fields: [
      { key: "aboutMyself", label: "About Myself", type: "textarea" },
      {
        key: "partnerPreferences",
        label: "Partner Preferences",
        type: "textarea",
      },
    ],
  },
];

function toFormState(profile) {
  const state = {};
  for (const section of EDIT_SECTIONS) {
    for (const field of section.fields) {
      const value = profile[field.key];
      if (field.type === "date") {
        state[field.key] = value ? String(value).slice(0, 10) : "";
      } else {
        state[field.key] = value ?? "";
      }
    }
  }
  return state;
}

function toPayload(form) {
  const payload = {};
  for (const section of EDIT_SECTIONS) {
    for (const field of section.fields) {
      const raw = form[field.key];
      if (field.type === "number") {
        payload[field.key] = raw === "" ? null : Number(raw);
      } else if (field.type === "date") {
        payload[field.key] = raw ? `${raw}T00:00:00` : null;
      } else {
        payload[field.key] = raw === "" ? null : raw;
      }
    }
  }
  return payload;
}

export default function ProfileDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const fileInputRef = useRef(null);

  const { list } = useReference();
  const { states } = useLocations();

  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [verifying, setVerifying] = useState(false);
  const [featuring, setFeaturing] = useState(false);
  const [featured, setFeatured] = useState(false);
  const [blocking, setBlocking] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState(null);
  const [saving, setSaving] = useState(false);

  // Photo management state
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [settingPrimaryId, setSettingPrimaryId] = useState(null);
  const [deletingPhotoId, setDeletingPhotoId] = useState(null);

  // Visibility & Delete Account State
  const [togglingVisibility, setTogglingVisibility] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deletingProfile, setDeletingProfile] = useState(false);

  // Contact Message Outreach Modal State
  const [showContactModal, setShowContactModal] = useState(false);

  // Single User Notification Modal State
  const [showNotifModal, setShowNotifModal] = useState(false);
  const [notifTitle, setNotifTitle] = useState("");
  const [notifBody, setNotifBody] = useState("");
  const [notifLink, setNotifLink] = useState("/browse");
  const [sendingNotif, setSendingNotif] = useState(false);

  const [searchParams] = useSearchParams();

  function loadProfile() {
    setLoading(true);
    api
      .getProfile(id)
      .then(setProfile)
      .catch(() => setError("Could not load this profile"))
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    loadProfile();
  }, [id]);

  useEffect(() => {
    if (profile && searchParams.get("edit") === "true") {
      setForm(toFormState(profile));
      setEditing(true);
    }
  }, [profile, searchParams]);

  async function handleVerify() {
    setVerifying(true);
    setError("");
    setSuccess("");
    try {
      const updated = await api.verifyProfile(id);
      setProfile((prev) => ({ ...prev, verified: updated.verified }));
      setSuccess("Profile verified successfully!");
    } catch {
      setError("Could not verify profile");
    } finally {
      setVerifying(false);
    }
  }

  async function handleToggleBlock() {
    setBlocking(true);
    setError("");
    setSuccess("");
    try {
      const updated = profile.blocked
        ? await api.unblockProfile(id)
        : await api.blockProfile(id);
      setProfile((prev) => ({ ...prev, blocked: updated.blocked }));
      setSuccess(profile.blocked ? "Profile unblocked" : "Profile blocked");
    } catch {
      setError("Could not update the block status");
    } finally {
      setBlocking(false);
    }
  }

  function handleStartEdit() {
    setForm(toFormState(profile));
    setError("");
    setSuccess("");
    setEditing(true);
  }

  function handleFieldChange(key, value) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  async function handleSaveEdit() {
    setSaving(true);
    setError("");
    setSuccess("");
    try {
      const updated = await api.updateProfile(id, toPayload(form));
      setProfile((prev) => ({ ...prev, ...updated }));
      setEditing(false);
      setForm(null);
      setSuccess("Profile updated successfully!");
    } catch {
      setError("Could not save these changes");
    } finally {
      setSaving(false);
    }
  }

  async function handleFeature() {
    setFeaturing(true);
    setError("");
    setSuccess("");
    try {
      await api.addFeaturedStory(Number(id), 0, "");
      setFeatured(true);
      setSuccess("Added to highlighted profiles!");
    } catch (err) {
      setError(
        err.message.includes("409")
          ? "Already highlighted"
          : "Could not add to highlighted profiles",
      );
    } finally {
      setFeaturing(false);
    }
  }

  async function handlePhotoUpload(e) {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadingPhoto(true);
    setError("");
    setSuccess("");
    try {
      const updated = await api.uploadProfilePhoto(id, file);
      setProfile((prev) => ({
        ...prev,
        photos: updated.photos || prev.photos,
        photoDetails: updated.photoDetails || prev.photoDetails,
      }));
      setSuccess("Photo uploaded successfully!");
    } catch (err) {
      setError(err?.message || "Failed to upload photo");
    } finally {
      setUploadingPhoto(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }

  async function handleSetPrimaryPhoto(photoId) {
    if (!photoId) return;
    setSettingPrimaryId(photoId);
    setError("");
    setSuccess("");
    try {
      const updated = await api.setPrimaryProfilePhoto(id, photoId);
      setProfile((prev) => ({
        ...prev,
        photos: updated.photos || prev.photos,
        photoDetails: updated.photoDetails || prev.photoDetails,
      }));
      setSuccess("Primary photo updated successfully!");
    } catch (err) {
      setError(err?.message || "Failed to set primary photo");
    } finally {
      setSettingPrimaryId(null);
    }
  }

  async function handleDeletePhoto(photoId) {
    if (!photoId) return;
    if (!window.confirm("Are you sure you want to delete this photo?")) return;
    setDeletingPhotoId(photoId);
    setError("");
    setSuccess("");
    try {
      const updated = await api.deleteProfilePhoto(id, photoId);
      setProfile((prev) => ({
        ...prev,
        photos: updated.photos || [],
        photoDetails: updated.photoDetails || [],
      }));
      setSuccess("Photo deleted successfully!");
    } catch (err) {
      setError(err?.message || "Failed to delete photo");
    } finally {
      setDeletingPhotoId(null);
    }
  }

  async function handleToggleVisibility() {
    setTogglingVisibility(true);
    setError("");
    setSuccess("");
    const nextHidden = !profile.hidden;
    try {
      const updated = await api.setProfileVisibility(id, nextHidden);
      setProfile((prev) => ({ ...prev, hidden: updated.hidden }));
      setSuccess(
        nextHidden
          ? "Profile is now hidden from member feeds."
          : "Profile is now unhidden and visible to members.",
      );
    } catch (err) {
      setError(err?.message || "Failed to update profile visibility");
    } finally {
      setTogglingVisibility(false);
    }
  }

  async function handleDeleteAccount() {
    setDeletingProfile(true);
    setError("");
    try {
      await api.deleteProfile(id);
      alert(`Account for "${profile.name}" has been successfully deleted.`);
      navigate("/featured");
    } catch (err) {
      setError(err?.message || "Failed to delete profile");
      setDeletingProfile(false);
      setShowDeleteModal(false);
    }
  }

  async function handleSendDirectNotification(e) {
    e.preventDefault();
    if (!notifTitle.trim() || !notifBody.trim()) {
      setError("Notification title and body are required.");
      return;
    }

    setSendingNotif(true);
    setError("");
    try {
      await api.sendSingleUserNotification({
        userId: Number(id),
        title: notifTitle.trim(),
        body: notifBody.trim(),
        link: notifLink.trim() || null,
      });
      setSuccess(`Push notification sent successfully to ${profile.name}!`);
      setShowNotifModal(false);
      setNotifTitle("");
      setNotifBody("");
    } catch (err) {
      setError(err?.message || "Failed to send notification to this user.");
    } finally {
      setSendingNotif(false);
    }
  }

  if (loading) return <p className="muted">Loading profile...</p>;
  if (error && !profile) return <p className="error">{error}</p>;
  if (!profile) return null;

  const photos = profile.photos?.length ? profile.photos : [];

  return (
    <div>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: "1rem",
        }}
      >
        <Link to="/queue" className="back-link">
          &larr; Back to Verification Queue
        </Link>
        <div
          style={{
            display: "flex",
            gap: "0.5rem",
            flexWrap: "wrap",
            alignItems: "center",
          }}
        >
          <button
            type="button"
            onClick={() => setShowContactModal(true)}
            style={{
              background: "#25D366",
              color: "#FFFFFF",
              border: "none",
              borderRadius: "6px",
              padding: "0.45rem 0.85rem",
              fontWeight: 600,
              fontSize: "0.85rem",
              display: "inline-flex",
              alignItems: "center",
              gap: "0.35rem",
              cursor: "pointer",
              boxShadow: "0 1px 2px rgba(0,0,0,0.05)",
            }}
          >
            <span>💬</span> Contact Member
          </button>

          <button
            type="button"
            className="secondary"
            onClick={() => setShowNotifModal(true)}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "0.35rem",
            }}
          >
            <span>🔔</span> Send Notification
          </button>

          <button
            type="button"
            className="secondary"
            onClick={handleToggleVisibility}
            disabled={togglingVisibility}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "0.35rem",
            }}
            title={
              profile.hidden
                ? "Unhide profile so members can view it"
                : "Hide profile from member search and feeds"
            }
          >
            <span>{profile.hidden ? "👁️" : "🙈"}</span>{" "}
            {profile.hidden ? "Unhide Profile" : "Hide Profile"}
          </button>

          <button
            type="button"
            className="secondary"
            onClick={() => setShowDeleteModal(true)}
            style={{
              color: "#DC2626",
              borderColor: "#FCA5A5",
              display: "inline-flex",
              alignItems: "center",
              gap: "0.35rem",
            }}
            title="Soft delete member account"
          >
            <span>🗑️</span> Delete Account
          </button>
        </div>
      </div>

      {success && (
        <div className="success-banner" style={{ marginBottom: "1rem" }}>
          {success}
        </div>
      )}
      {error && (
        <div className="error-banner" style={{ marginBottom: "1rem" }}>
          {error}
        </div>
      )}

      <div className="card detail-card">
        {/* Photo Gallery & Upload Section */}
        <div style={{ marginBottom: "1.5rem" }}>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              marginBottom: "0.75rem",
            }}
          >
            <h3 style={{ margin: 0, fontSize: "1.05rem" }}>
              Profile Photos ({photos.length})
            </h3>
            <div>
              <input
                type="file"
                ref={fileInputRef}
                accept="image/*"
                onChange={handlePhotoUpload}
                style={{ display: "none" }}
              />
              <button
                type="button"
                className="secondary small"
                disabled={uploadingPhoto}
                onClick={() => fileInputRef.current?.click()}
              >
                {uploadingPhoto ? "Uploading..." : "📷 Upload Photo"}
              </button>
            </div>
          </div>

          <div
            className="photo-row"
            style={{
              display: "flex",
              gap: "1rem",
              flexWrap: "wrap",
              alignItems: "flex-start",
            }}
          >
            {photos.length === 0 &&
            (!profile.photoDetails || profile.photoDetails.length === 0) ? (
              <div
                style={{
                  padding: "1.5rem",
                  background: "#F9FAFB",
                  borderRadius: "8px",
                  border: "1px dashed #D1D5DB",
                  color: "#6B7280",
                  fontSize: "0.9rem",
                  width: "100%",
                }}
              >
                No photos uploaded yet. Use "Upload Photo" above to add one on
                behalf of this user.
              </div>
            ) : (
              (profile.photoDetails && profile.photoDetails.length > 0
                ? profile.photoDetails
                : photos.map((src, i) => ({
                    id: null,
                    url: src,
                    isPrimary: i === 0,
                  }))
              ).map((item, i) => {
                const src = item.url || item;
                const isPrimary = Boolean(
                  item.isPrimary || (i === 0 && !profile.photoDetails?.length),
                );
                return (
                  <div
                    key={item.id || i}
                    style={{
                      display: "inline-flex",
                      flexDirection: "column",
                      gap: "0.35rem",
                      alignItems: "center",
                      background: "#F9FAFB",
                      padding: "6px",
                      borderRadius: "8px",
                      border: isPrimary
                        ? "2px solid #10B981"
                        : "1px solid #E5E7EB",
                    }}
                  >
                    <div style={{ position: "relative" }}>
                      <img
                        src={src}
                        alt=""
                        className="detail-photo"
                        style={{
                          borderRadius: "6px",
                          width: "120px",
                          height: "120px",
                          objectFit: "cover",
                        }}
                      />
                      {isPrimary && (
                        <span
                          style={{
                            position: "absolute",
                            bottom: "6px",
                            left: "6px",
                            background: "#10B981",
                            color: "#fff",
                            fontSize: "10px",
                            fontWeight: 600,
                            padding: "2px 6px",
                            borderRadius: "4px",
                            boxShadow: "0 1px 2px rgba(0,0,0,0.3)",
                          }}
                        >
                          ★ Primary
                        </span>
                      )}
                    </div>
                    {item.id && (
                      <div
                        style={{
                          display: "flex",
                          gap: "0.3rem",
                          width: "100%",
                          justifyContent: "center",
                        }}
                      >
                        {!isPrimary && (
                          <button
                            type="button"
                            className="secondary small"
                            style={{ fontSize: "11px", padding: "2px 6px" }}
                            onClick={() => handleSetPrimaryPhoto(item.id)}
                            disabled={settingPrimaryId === item.id}
                            title="Set as profile primary photo"
                          >
                            {settingPrimaryId === item.id ? "..." : "★ Primary"}
                          </button>
                        )}
                        <button
                          type="button"
                          className="secondary small"
                          style={{
                            fontSize: "11px",
                            padding: "2px 6px",
                            color: "#DC2626",
                          }}
                          onClick={() => handleDeletePhoto(item.id)}
                          disabled={deletingPhotoId === item.id}
                          title="Delete this photo"
                        >
                          {deletingPhotoId === item.id ? "..." : "🗑️ Delete"}
                        </button>
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Profile Header */}
        <div className="detail-header">
          <div>
            <h1 style={{ margin: "0 0 0.25rem 0" }}>
              {profile.name || "(No name)"}
            </h1>
            <div className="muted" style={{ fontSize: "0.95rem" }}>
              ID: <strong>{profile.displayId}</strong> (Raw ID: {profile.id})
            </div>
          </div>
          <div
            style={{
              display: "flex",
              gap: "0.5rem",
              alignItems: "center",
              flexWrap: "wrap",
            }}
          >
            <span
              className={`badge ${profile.verified ? "badge-verified" : "badge-pending"}`}
            >
              {profile.verified ? "✓ Verified" : "⏳ Not verified"}
            </span>
            {profile.hidden && (
              <span
                style={{
                  background: "#FEF3C7",
                  color: "#92400E",
                  fontWeight: 600,
                  fontSize: "12px",
                  padding: "2px 8px",
                  borderRadius: "12px",
                  border: "1px solid #FCD34D",
                }}
              >
                🙈 Profile Hidden
              </span>
            )}
            {profile.blocked && (
              <span className="badge badge-blocked">Blocked</span>
            )}
          </div>
        </div>

        {/* Display Mode with Decoded Values */}
        {!editing && (
          <>
            <div style={{ marginTop: "1.5rem" }}>
              <h3
                style={{
                  borderBottom: "1px solid #E5E7EB",
                  paddingBottom: "0.4rem",
                  marginBottom: "0.75rem",
                  fontSize: "1.05rem",
                }}
              >
                Personal Details
              </h3>
              <dl className="detail-grid">
                <dt>Gender</dt>
                <dd>{formatCode("gender", profile.gender)}</dd>
                <dt>Age</dt>
                <dd>
                  {age(profile.dateOfBirth)
                    ? `${age(profile.dateOfBirth)} yrs`
                    : "-"}
                </dd>
                <dt>Date of Birth</dt>
                <dd>
                  {profile.dateOfBirth
                    ? String(profile.dateOfBirth).slice(0, 10)
                    : "-"}
                </dd>
                <dt>Marital status</dt>
                <dd>
                  <strong>
                    {formatCode("marital_status", profile.maritalStatus)}
                  </strong>
                </dd>
                <dt>Height</dt>
                <dd>
                  <strong style={{ color: "#1E3A8A" }}>
                    {formatCode("height", profile.height)}
                  </strong>
                </dd>
                <dt>Weight</dt>
                <dd>{profile.weight ? `${profile.weight} kg` : "-"}</dd>
                <dt>Complexion</dt>
                <dd>{formatCode("complexion", profile.complexion)}</dd>
                <dt>Diet</dt>
                <dd>{formatCode("diet", profile.diet)}</dd>
                <dt>Blood group</dt>
                <dd>{formatCode("blood_group", profile.bloodGroup)}</dd>
                <dt>Mother Tongue</dt>
                <dd>{formatCode("mother_tongue", profile.motherTongue)}</dd>
                <dt>Profile Created By</dt>
                <dd>
                  {formatCode("profile_created_by", profile.profileCreatedBy)}
                </dd>
                <dt>Disability</dt>
                <dd>{formatCode("disability", profile.disability)}</dd>
              </dl>
            </div>

            <div style={{ marginTop: "1.5rem" }}>
              <h3
                style={{
                  borderBottom: "1px solid #E5E7EB",
                  paddingBottom: "0.4rem",
                  marginBottom: "0.75rem",
                  fontSize: "1.05rem",
                }}
              >
                Location & Contact
              </h3>
              <dl className="detail-grid">
                <dt>City</dt>
                <dd>{profile.city || "-"}</dd>
                <dt>State</dt>
                <dd>{formatCode("state", profile.state)}</dd>
                <dt>Country</dt>
                <dd>{profile.country || "India"}</dd>
                <dt>Town / Native</dt>
                <dd>{profile.town || "-"}</dd>
                <dt>Mobile No</dt>
                <dd>
                  <strong>{profile.mobileNo || "-"}</strong>
                </dd>
                <dt>Email</dt>
                <dd>{profile.email || "-"}</dd>
                <dt>WhatsApp No</dt>
                <dd>{profile.whatsappNo || "-"}</dd>
                <dt>Father's Contact</dt>
                <dd>{profile.fathersContactNo || "-"}</dd>
                <dt>Present Address</dt>
                <dd>{profile.presentAddress || "-"}</dd>
                <dt>Permanent Address</dt>
                <dd>{profile.permanentAddress || "-"}</dd>
              </dl>
            </div>

            <div style={{ marginTop: "1.5rem" }}>
              <h3
                style={{
                  borderBottom: "1px solid #E5E7EB",
                  paddingBottom: "0.4rem",
                  marginBottom: "0.75rem",
                  fontSize: "1.05rem",
                }}
              >
                Religion & Astrology
              </h3>
              <dl className="detail-grid">
                <dt>Gotra</dt>
                <dd>
                  <strong>{formatCode("gotra", profile.gotra)}</strong>
                </dd>
                <dt>Aakna</dt>
                <dd>{profile.aakna || "-"}</dd>
                <dt>Manglik</dt>
                <dd>{formatCode("manglik", profile.manglik)}</dd>
                <dt>Time of Birth</dt>
                <dd>{profile.timeOfBirth || "-"}</dd>
                <dt>Place of Birth</dt>
                <dd>{profile.placeOfBirth || "-"}</dd>
                <dt>Zodiac / Rashi</dt>
                <dd>{formatCode("rashi", profile.zodiac)}</dd>
                <dt>Nakshatra</dt>
                <dd>{formatCode("nakshatra", profile.nakshatra)}</dd>
              </dl>
            </div>

            <div style={{ marginTop: "1.5rem" }}>
              <h3
                style={{
                  borderBottom: "1px solid #E5E7EB",
                  paddingBottom: "0.4rem",
                  marginBottom: "0.75rem",
                  fontSize: "1.05rem",
                }}
              >
                Education & Career
              </h3>
              <dl className="detail-grid">
                <dt>Highest Education</dt>
                <dd>
                  <strong>{formatCode("education", profile.education)}</strong>
                </dd>
                <dt>Education Details</dt>
                <dd>{profile.educationDetails || "-"}</dd>
                <dt>Profession</dt>
                <dd>
                  <strong>
                    {formatCode("profession", profile.profession)}
                  </strong>
                </dd>
                <dt>Employed In</dt>
                <dd>{formatCode("employed_in", profile.employedIn)}</dd>
                <dt>Company / Org</dt>
                <dd>{profile.organization || "-"}</dd>
                <dt>Annual Income</dt>
                <dd>
                  <strong style={{ color: "#047857" }}>
                    {formatCode("annual_income", profile.annualIncome)}
                  </strong>
                </dd>
                <dt>Work Location</dt>
                <dd>{profile.workCity || "-"}</dd>
              </dl>
            </div>

            <div style={{ marginTop: "1.5rem" }}>
              <h3
                style={{
                  borderBottom: "1px solid #E5E7EB",
                  paddingBottom: "0.4rem",
                  marginBottom: "0.75rem",
                  fontSize: "1.05rem",
                }}
              >
                Family & Assets
              </h3>
              <dl className="detail-grid">
                <dt>Father's Name</dt>
                <dd>{profile.fathersName || "-"}</dd>
                <dt>Father's Occupation</dt>
                <dd>{formatCode("profession", profile.fathersOccupation)}</dd>
                <dt>Mother's Name</dt>
                <dd>{profile.mothersName || "-"}</dd>
                <dt>Mother's Occupation</dt>
                <dd>{formatCode("profession", profile.mothersOccupation)}</dd>
                <dt>Brothers</dt>
                <dd>
                  Married: {profile.marriedBrothers ?? "-"} | Unmarried:{" "}
                  {profile.unmarriedBrothers ?? "-"}
                </dd>
                <dt>Sisters</dt>
                <dd>
                  Married: {profile.marriedSisters ?? "-"} | Unmarried:{" "}
                  {profile.unmarriedSisters ?? "-"}
                </dd>
                <dt>Maternal Uncle</dt>
                <dd>{profile.maternalUnclesName || "-"}</dd>
                <dt>Uncle's Aakna</dt>
                <dd>{profile.maternalUnclesAakna || "-"}</dd>
                <dt>Uncle's Gotra</dt>
                <dd>
                  {profile.maternalUnclesGotra ||
                    profile.maternalUnclesAakna ||
                    "-"}
                </dd>
                <dt>House Status</dt>
                <dd>{formatCode("house_status", profile.houseStatus)}</dd>
                <dt>Car Status</dt>
                <dd>{formatCode("car_status", profile.carStatus)}</dd>
              </dl>
            </div>

            {(profile.aboutMyself || profile.partnerPreferences) && (
              <div style={{ marginTop: "1.5rem" }}>
                <h3
                  style={{
                    borderBottom: "1px solid #E5E7EB",
                    paddingBottom: "0.4rem",
                    marginBottom: "0.75rem",
                    fontSize: "1.05rem",
                  }}
                >
                  About & Expectations
                </h3>
                {profile.aboutMyself && (
                  <div style={{ marginBottom: "1rem" }}>
                    <div
                      className="muted"
                      style={{ fontWeight: 600, fontSize: "0.85rem" }}
                    >
                      ABOUT MYSELF
                    </div>
                    <p style={{ marginTop: "0.25rem", whiteSpace: "pre-wrap" }}>
                      {profile.aboutMyself}
                    </p>
                  </div>
                )}
                {profile.partnerPreferences && (
                  <div>
                    <div
                      className="muted"
                      style={{ fontWeight: 600, fontSize: "0.85rem" }}
                    >
                      PARTNER PREFERENCES
                    </div>
                    <p style={{ marginTop: "0.25rem", whiteSpace: "pre-wrap" }}>
                      {profile.partnerPreferences}
                    </p>
                  </div>
                )}
              </div>
            )}
          </>
        )}

        {/* Edit Form with Rich Dropdowns */}
        {editing && form && (
          <div className="edit-form" style={{ marginTop: "1.5rem" }}>
            {EDIT_SECTIONS.map((section) => (
              <fieldset className="edit-section" key={section.title}>
                <legend>{section.title}</legend>
                {section.fields.map((field) => (
                  <label key={field.key}>
                    {field.label}{" "}
                    {field.required && (
                      <span style={{ color: "#DC2626" }}>*</span>
                    )}
                    {field.type === "textarea" ? (
                      <textarea
                        rows={3}
                        value={form[field.key]}
                        onChange={(e) =>
                          handleFieldChange(field.key, e.target.value)
                        }
                      />
                    ) : field.type === "select" ? (
                      (() => {
                        const rawOpts =
                          field.key === "state"
                            ? states
                            : field.category
                              ? list(field.category)
                              : field.options || [];
                        const currentVal = form[field.key];
                        const hasCurrent =
                          !currentVal ||
                          rawOpts.some(
                            (o) =>
                              (typeof o === "object" ? o.code : o) ===
                              currentVal,
                          );

                        return (
                          <select
                            value={currentVal ?? ""}
                            onChange={(e) =>
                              handleFieldChange(field.key, e.target.value)
                            }
                          >
                            <option value="">-- Select {field.label} --</option>
                            {!hasCurrent && (
                              <option
                                value={currentVal}
                                key={`cur-${currentVal}`}
                              >
                                {currentVal} (Current)
                              </option>
                            )}
                            {rawOpts.map((opt) => {
                              const val =
                                typeof opt === "object" ? opt.code : opt;
                              const txt =
                                typeof opt === "object" ? opt.label : opt;
                              return (
                                <option value={val} key={val}>
                                  {txt}
                                </option>
                              );
                            })}
                          </select>
                        );
                      })()
                    ) : (
                      <input
                        type={
                          field.type === "number"
                            ? "number"
                            : field.type === "date"
                              ? "date"
                              : "text"
                        }
                        value={form[field.key]}
                        onChange={(e) =>
                          handleFieldChange(field.key, e.target.value)
                        }
                      />
                    )}
                  </label>
                ))}
              </fieldset>
            ))}
          </div>
        )}

        {/* Action Buttons */}
        <div className="detail-actions" style={{ marginTop: "2rem" }}>
          {!editing && !profile.verified && (
            <button
              onClick={handleVerify}
              disabled={verifying}
              className="primary"
            >
              {verifying ? "Verifying..." : "✓ Verify this profile"}
            </button>
          )}
          {!editing && (
            <button
              className="secondary"
              onClick={handleFeature}
              disabled={featuring || featured}
            >
              {featured
                ? "★ Highlighted"
                : featuring
                  ? "Adding..."
                  : "Add to Highlighted"}
            </button>
          )}
          {!editing && (
            <button
              className="danger"
              onClick={handleToggleBlock}
              disabled={blocking}
            >
              {blocking
                ? "Updating..."
                : profile.blocked
                  ? "Unblock this profile"
                  : "Block this profile"}
            </button>
          )}
          {!editing && (
            <button className="secondary" onClick={handleStartEdit}>
              ✏️ Edit profile
            </button>
          )}
          {editing && (
            <>
              <button
                onClick={handleSaveEdit}
                disabled={saving}
                className="primary"
              >
                {saving ? "Saving changes..." : "Save changes"}
              </button>
              <button
                className="secondary"
                onClick={() => {
                  setEditing(false);
                  setForm(null);
                  setError("");
                }}
                disabled={saving}
              >
                Cancel
              </button>
            </>
          )}
        </div>
      </div>

      {/* Direct Push Notification Modal */}
      {showNotifModal && (
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
          <div
            className="card"
            style={{ maxWidth: "520px", width: "100%", padding: "1.5rem" }}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                marginBottom: "1rem",
              }}
            >
              <h3 style={{ margin: 0 }}>🔔 Send Push Notification</h3>
              <button
                type="button"
                className="secondary small"
                onClick={() => setShowNotifModal(false)}
                style={{ padding: "0.2rem 0.6rem" }}
              >
                ✕
              </button>
            </div>

            <p
              style={{
                fontSize: "0.88rem",
                color: "#4B5563",
                marginBottom: "1.2rem",
              }}
            >
              Sending directly to <strong>{profile.name}</strong> (
              {profile.displayId} | {profile.mobileNo})
            </p>

            <form onSubmit={handleSendDirectNotification}>
              <div className="form-group" style={{ marginBottom: "1rem" }}>
                <label
                  style={{
                    display: "block",
                    fontWeight: 600,
                    marginBottom: "0.3rem",
                  }}
                >
                  Title <span style={{ color: "#DC2626" }}>*</span>
                </label>
                <input
                  type="text"
                  className="input-field"
                  placeholder="e.g. 🌸 Update regarding your Lovewanshi Parinay profile"
                  value={notifTitle}
                  onChange={(e) => setNotifTitle(e.target.value)}
                  required
                  style={{ width: "100%", padding: "0.6rem" }}
                />
              </div>

              <div className="form-group" style={{ marginBottom: "1rem" }}>
                <label
                  style={{
                    display: "block",
                    fontWeight: 600,
                    marginBottom: "0.3rem",
                  }}
                >
                  Message Body <span style={{ color: "#DC2626" }}>*</span>
                </label>
                <textarea
                  className="input-field"
                  rows={3}
                  placeholder="Write the message that will pop up on the member's phone..."
                  value={notifBody}
                  onChange={(e) => setNotifBody(e.target.value)}
                  required
                  style={{ width: "100%", padding: "0.6rem" }}
                />
              </div>

              <div className="form-group" style={{ marginBottom: "1.2rem" }}>
                <label
                  style={{
                    display: "block",
                    fontWeight: 600,
                    marginBottom: "0.3rem",
                  }}
                >
                  In-App Deep Link (Optional)
                </label>
                <input
                  type="text"
                  className="input-field"
                  placeholder="/browse or /me or /plans"
                  value={notifLink}
                  onChange={(e) => setNotifLink(e.target.value)}
                  style={{ width: "100%", padding: "0.6rem" }}
                />
              </div>

              <div
                style={{
                  display: "flex",
                  gap: "0.75rem",
                  justifyContent: "flex-end",
                }}
              >
                <button
                  type="button"
                  className="secondary"
                  onClick={() => setShowNotifModal(false)}
                  disabled={sendingNotif}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="primary"
                  disabled={
                    sendingNotif || !notifTitle.trim() || !notifBody.trim()
                  }
                >
                  {sendingNotif
                    ? "Sending Push..."
                    : "🚀 Send Push Notification"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Direct Outreach Contact Message Modal */}
      {showContactModal && (
        <ContactMessageModal
          profile={profile}
          onClose={() => setShowContactModal(false)}
        />
      )}

      {/* Delete Account Confirmation Modal */}
      {showDeleteModal && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.55)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 1200,
            padding: "1rem",
          }}
        >
          <div
            className="card"
            style={{ maxWidth: "480px", width: "100%", padding: "1.5rem" }}
          >
            <h3 style={{ margin: "0 0 0.5rem 0", color: "#DC2626" }}>
              ⚠️ Delete Member Account
            </h3>
            <p
              style={{
                fontSize: "0.9rem",
                color: "#374151",
                lineHeight: "1.4",
              }}
            >
              Are you sure you want to delete the account for{" "}
              <strong>{profile.name}</strong> ({profile.displayId})?
            </p>
            <p
              style={{
                fontSize: "0.85rem",
                color: "#6B7280",
                lineHeight: "1.4",
              }}
            >
              This will soft-delete the profile and remove it permanently from
              all member feeds and searches. Member history (likes, shortlists,
              views) will remain safely intact in the database.
            </p>
            <div
              style={{
                display: "flex",
                justifyContent: "flex-end",
                gap: "0.5rem",
                marginTop: "1.25rem",
              }}
            >
              <button
                type="button"
                className="secondary"
                onClick={() => setShowDeleteModal(false)}
                disabled={deletingProfile}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDeleteAccount}
                disabled={deletingProfile}
                style={{
                  background: "#DC2626",
                  color: "#FFFFFF",
                  border: "none",
                  borderRadius: "6px",
                  padding: "0.5rem 1rem",
                  fontWeight: 600,
                  cursor: deletingProfile ? "not-allowed" : "pointer",
                }}
              >
                {deletingProfile ? "Deleting..." : "Yes, Delete Account"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

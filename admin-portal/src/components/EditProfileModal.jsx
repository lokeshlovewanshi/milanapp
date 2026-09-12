import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../api";
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
  useReference,
  useLocations,
} from "../referenceData";

const SECTIONS = [
  {
    id: "personal",
    title: "👤 Personal",
    fields: [
      { key: "name", label: "Full Name", required: true },
      { key: "gender", label: "Gender", type: "select", category: "gender", options: GENDER_OPTIONS },
      { key: "maritalStatus", label: "Marital Status", type: "select", category: "marital_status", options: MARITAL_STATUS_OPTIONS },
      { key: "dateOfBirth", label: "Date of Birth", type: "date" },
      { key: "height", label: "Height", type: "select", category: "height", options: HEIGHT_OPTIONS },
      { key: "weight", label: "Weight (kg)", type: "number" },
      { key: "complexion", label: "Complexion", type: "select", category: "complexion", options: COMPLEXION_OPTIONS },
      { key: "diet", label: "Diet", type: "select", category: "diet", options: DIET_OPTIONS },
      { key: "bloodGroup", label: "Blood Group", type: "select", category: "blood_group", options: BLOOD_GROUP_OPTIONS },
      { key: "motherTongue", label: "Mother Tongue", type: "select", category: "mother_tongue", options: MOTHER_TONGUE_OPTIONS },
      { key: "profileCreatedBy", label: "Profile Created By", type: "select", category: "profile_created_by", options: PROFILE_CREATED_BY_OPTIONS },
      { key: "disability", label: "Disability / Special Needs", type: "select", category: "disability", options: DISABILITY_OPTIONS },
    ],
  },
  {
    id: "location",
    title: "📍 Location & Address",
    fields: [
      { key: "country", label: "Country" },
      { key: "state", label: "State", type: "select", category: "states", options: STATE_OPTIONS },
      { key: "city", label: "City" },
      { key: "town", label: "Town / Native Place (मूल निवास)" },
      { key: "presentAddress", label: "Present Address", type: "textarea" },
      { key: "permanentAddress", label: "Permanent Address", type: "textarea" },
    ],
  },
  {
    id: "contact",
    title: "📞 Contact",
    fields: [
      { key: "whatsappNo", label: "WhatsApp Number" },
      { key: "fathersContactNo", label: "Father's Contact Number" },
    ],
  },
  {
    id: "astrology",
    title: "🕉️ Religion & Astrology",
    fields: [
      { key: "gotra", label: "Gotra", type: "select", category: "gotra", options: GOTRA_OPTIONS },
      { key: "aakna", label: "Aakna" },
      { key: "manglik", label: "Manglik Status", type: "select", category: "manglik", options: MANGLIK_OPTIONS },
      { key: "timeOfBirth", label: "Time of Birth" },
      { key: "placeOfBirth", label: "Place of Birth (City)" },
      { key: "zodiac", label: "Zodiac / Rashi", type: "select", category: "rashi", options: ZODIAC_OPTIONS },
      { key: "nakshatra", label: "Nakshatra", type: "select", category: "nakshatra", options: NAKSHATRA_OPTIONS },
    ],
  },
  {
    id: "family",
    title: "👨‍👩‍👧‍👦 Family Details",
    fields: [
      { key: "fathersName", label: "Father's Name" },
      { key: "fathersOccupation", label: "Father's Occupation", type: "select", category: "profession", options: PROFESSION_OPTIONS },
      { key: "mothersName", label: "Mother's Name" },
      { key: "mothersOccupation", label: "Mother's Occupation", type: "select", category: "profession", options: PROFESSION_OPTIONS },
      { key: "marriedBrothers", label: "Married Brothers", type: "number" },
      { key: "unmarriedBrothers", label: "Unmarried Brothers", type: "number" },
      { key: "marriedSisters", label: "Married Sisters", type: "number" },
      { key: "unmarriedSisters", label: "Unmarried Sisters", type: "number" },
      { key: "maternalUnclesName", label: "Maternal Uncle's Name (मामाजी)" },
      { key: "maternalUnclesAakna", label: "Maternal Uncle's Aakna" },
    ],
  },
  {
    id: "education",
    title: "🎓 Education & Career",
    fields: [
      { key: "education", label: "Highest Education", type: "select", category: "education", options: EDUCATION_OPTIONS },
      { key: "educationDetails", label: "Education Details (College / Stream)" },
      { key: "profession", label: "Profession", type: "select", category: "profession", options: PROFESSION_OPTIONS },
      { key: "employedIn", label: "Employed In", type: "select", category: "employed_in", options: EMPLOYED_IN_OPTIONS },
      { key: "organization", label: "Company / Organization" },
      { key: "annualIncome", label: "Annual Income", type: "select", category: "annual_income", options: INCOME_OPTIONS },
      { key: "workCity", label: "Work City / Location" },
    ],
  },
  {
    id: "assets",
    title: "🏠 Assets",
    fields: [
      { key: "houseStatus", label: "House Status", type: "select", category: "house_status", options: HOUSE_STATUS_OPTIONS },
      { key: "carStatus", label: "Car Status", type: "select", category: "car_status", options: CAR_STATUS_OPTIONS },
    ],
  },
  {
    id: "bio",
    title: "📝 Bio & Preferences",
    fields: [
      { key: "aboutMyself", label: "About Myself", type: "textarea" },
      { key: "partnerPreferences", label: "Partner Preferences", type: "textarea" },
    ],
  },
];

export default function EditProfileModal({ profileId, onClose, onSaved }) {
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [activeTab, setActiveTab] = useState("all");
  const [form, setForm] = useState({});

  const { list } = useReference();
  const { states } = useLocations();

  useEffect(() => {
    if (!profileId) return;
    setLoading(true);
    setError("");
    api
      .getProfile(profileId)
      .then((data) => {
        setProfile(data);
        const initialForm = {};
        for (const sec of SECTIONS) {
          for (const f of sec.fields) {
            const val = data[f.key];
            if (f.type === "date") {
              initialForm[f.key] = val ? String(val).slice(0, 10) : "";
            } else {
              initialForm[f.key] = val ?? "";
            }
          }
        }
        setForm(initialForm);
      })
      .catch((err) => {
        console.error("Failed to load profile for editing:", err);
        setError("Could not load profile details. Please try again.");
      })
      .finally(() => setLoading(false));
  }, [profileId]);

  function handleChange(key, value) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (!profileId) return;

    setSaving(true);
    setError("");
    setSuccess("");

    const payload = {};
    for (const sec of SECTIONS) {
      for (const f of sec.fields) {
        const raw = form[f.key];
        if (f.type === "number") {
          payload[f.key] = raw === "" ? null : Number(raw);
        } else if (f.type === "date") {
          payload[f.key] = raw ? `${raw}T00:00:00` : null;
        } else {
          payload[f.key] = raw === "" ? null : raw;
        }
      }
    }

    try {
      const updated = await api.updateProfile(profileId, payload);
      setSuccess("✓ Profile updated successfully!");
      if (onSaved) {
        onSaved(updated || { ...profile, ...payload });
      }
      setTimeout(() => {
        if (onClose) onClose();
      }, 900);
    } catch (err) {
      console.error("Failed to save profile changes:", err);
      setError(err?.message || "Failed to update profile. Please verify your inputs.");
    } finally {
      setSaving(false);
    }
  }

  const visibleSections = activeTab === "all" ? SECTIONS : SECTIONS.filter((s) => s.id === activeTab);

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        backgroundColor: "rgba(0, 0, 0, 0.55)",
        backdropFilter: "blur(2px)",
        zIndex: 1100,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "1rem",
      }}
      onClick={onClose}
    >
      <div
        style={{
          background: "#FFFFFF",
          borderRadius: "12px",
          width: "100%",
          maxWidth: "880px",
          maxHeight: "92vh",
          display: "flex",
          flexDirection: "column",
          boxShadow: "0 20px 25px -5px rgba(0,0,0,0.15), 0 8px 10px -6px rgba(0,0,0,0.1)",
          overflow: "hidden",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div
          style={{
            padding: "1rem 1.5rem",
            borderBottom: "1px solid #E5E7EB",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            background: "#F9FAFB",
          }}
        >
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: "0.6rem" }}>
              <h2 style={{ margin: 0, fontSize: "1.25rem", color: "#111827", fontWeight: 700 }}>
                ✏️ Edit Profile: {profile?.name || (loading ? "Loading..." : "Member")}
              </h2>
              {profile?.displayId && (
                <span
                  style={{
                    background: "#FEE2E2",
                    color: "#991B1B",
                    fontSize: "0.8rem",
                    fontWeight: 700,
                    padding: "2px 8px",
                    borderRadius: "999px",
                  }}
                >
                  {profile.displayId}
                </span>
              )}
            </div>
            <p style={{ margin: "0.2rem 0 0 0", fontSize: "0.82rem", color: "#6B7280" }}>
              Update verified member information directly. Changes sync immediately to the database.
            </p>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
            <Link
              to={`/profiles/${profileId}`}
              target="_blank"
              style={{
                fontSize: "0.8rem",
                color: "#A5122F",
                textDecoration: "none",
                fontWeight: 600,
              }}
            >
              Full Profile Details ↗
            </Link>
            <button
              type="button"
              onClick={onClose}
              style={{
                background: "transparent",
                border: "none",
                fontSize: "1.5rem",
                lineHeight: 1,
                cursor: "pointer",
                color: "#6B7280",
                padding: "0.2rem 0.5rem",
              }}
            >
              &times;
            </button>
          </div>
        </div>

        {/* Section Tabs */}
        <div
          style={{
            display: "flex",
            gap: "0.4rem",
            padding: "0.5rem 1.25rem",
            background: "#F3F4F6",
            borderBottom: "1px solid #E5E7EB",
            overflowX: "auto",
            whiteSpace: "nowrap",
          }}
        >
          <button
            type="button"
            onClick={() => setActiveTab("all")}
            style={{
              padding: "0.3rem 0.75rem",
              borderRadius: "6px",
              border: "none",
              fontSize: "0.78rem",
              fontWeight: 600,
              cursor: "pointer",
              background: activeTab === "all" ? "#A5122F" : "#FFFFFF",
              color: activeTab === "all" ? "#FFFFFF" : "#374151",
            }}
          >
            📋 All Sections
          </button>
          {SECTIONS.map((sec) => (
            <button
              key={sec.id}
              type="button"
              onClick={() => setActiveTab(sec.id)}
              style={{
                padding: "0.3rem 0.75rem",
                borderRadius: "6px",
                border: "none",
                fontSize: "0.78rem",
                fontWeight: 600,
                cursor: "pointer",
                background: activeTab === sec.id ? "#A5122F" : "#FFFFFF",
                color: activeTab === sec.id ? "#FFFFFF" : "#374151",
              }}
            >
              {sec.title}
            </button>
          ))}
        </div>

        {/* Modal Body */}
        <div style={{ padding: "1.25rem 1.5rem", overflowY: "auto", flex: 1 }}>
          {error && (
            <div
              style={{
                background: "#FEE2E2",
                color: "#991B1B",
                padding: "0.75rem",
                borderRadius: "6px",
                marginBottom: "1rem",
                fontSize: "0.85rem",
              }}
            >
              ❌ {error}
            </div>
          )}

          {success && (
            <div
              style={{
                background: "#D1FAE5",
                color: "#065F46",
                padding: "0.75rem",
                borderRadius: "6px",
                marginBottom: "1rem",
                fontSize: "0.85rem",
                fontWeight: 600,
              }}
            >
              {success}
            </div>
          )}

          {loading ? (
            <div style={{ textAlign: "center", padding: "3rem", color: "#6B7280" }}>
              <p>Loading profile details...</p>
            </div>
          ) : (
            <form id="edit-profile-form" onSubmit={handleSubmit}>
              {visibleSections.map((section) => (
                <div
                  key={section.id}
                  style={{
                    marginBottom: "1.5rem",
                    border: "1px solid #E5E7EB",
                    borderRadius: "8px",
                    padding: "1rem 1.25rem",
                    background: "#FAFAFA",
                  }}
                >
                  <h3
                    style={{
                      margin: "0 0 0.85rem 0",
                      fontSize: "0.95rem",
                      fontWeight: 700,
                      color: "#1F2937",
                      borderBottom: "1px solid #E5E7EB",
                      paddingBottom: "0.4rem",
                    }}
                  >
                    {section.title}
                  </h3>

                  <div
                    style={{
                      display: "grid",
                      gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
                      gap: "0.85rem",
                    }}
                  >
                    {section.fields.map((field) => {
                      const options =
                        field.category === "states"
                          ? states.map((s) => ({ code: s.name, label: s.name }))
                          : field.category
                          ? list(field.category, field.options)
                          : field.options;

                      const isFullWidth = field.type === "textarea";

                      return (
                        <div
                          key={field.key}
                          style={{
                            gridColumn: isFullWidth ? "1 / -1" : "auto",
                          }}
                        >
                          <label
                            style={{
                              display: "block",
                              fontSize: "0.78rem",
                              fontWeight: 600,
                              color: "#4B5563",
                              marginBottom: "0.25rem",
                            }}
                          >
                            {field.label} {field.required && <span style={{ color: "#DC2626" }}>*</span>}
                          </label>

                          {field.type === "select" ? (
                            <select
                              value={form[field.key] ?? ""}
                              onChange={(e) => handleChange(field.key, e.target.value)}
                              style={{
                                width: "100%",
                                padding: "0.45rem 0.6rem",
                                borderRadius: "6px",
                                border: "1px solid #D1D5DB",
                                fontSize: "0.85rem",
                                background: "#FFFFFF",
                              }}
                            >
                              <option value="">-- Select --</option>
                              {options?.map((opt) => (
                                <option key={opt.code} value={opt.code}>
                                  {opt.label}
                                </option>
                              ))}
                            </select>
                          ) : field.type === "textarea" ? (
                            <textarea
                              rows={3}
                              value={form[field.key] ?? ""}
                              onChange={(e) => handleChange(field.key, e.target.value)}
                              placeholder={`Enter ${field.label.toLowerCase()}...`}
                              style={{
                                width: "100%",
                                padding: "0.45rem 0.6rem",
                                borderRadius: "6px",
                                border: "1px solid #D1D5DB",
                                fontSize: "0.85rem",
                                fontFamily: "inherit",
                              }}
                            />
                          ) : (
                            <input
                              type={field.type || "text"}
                              required={field.required}
                              value={form[field.key] ?? ""}
                              onChange={(e) => handleChange(field.key, e.target.value)}
                              placeholder={`Enter ${field.label.toLowerCase()}...`}
                              style={{
                                width: "100%",
                                padding: "0.45rem 0.6rem",
                                borderRadius: "6px",
                                border: "1px solid #D1D5DB",
                                fontSize: "0.85rem",
                              }}
                            />
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </form>
          )}
        </div>

        {/* Modal Footer */}
        <div
          style={{
            padding: "0.85rem 1.5rem",
            borderTop: "1px solid #E5E7EB",
            display: "flex",
            justifyContent: "flex-end",
            gap: "0.75rem",
            background: "#F9FAFB",
          }}
        >
          <button
            type="button"
            className="secondary"
            onClick={onClose}
            disabled={saving}
            style={{ padding: "0.5rem 1rem", fontSize: "0.85rem" }}
          >
            Cancel
          </button>
          <button
            type="submit"
            form="edit-profile-form"
            className="primary"
            disabled={saving || loading}
            style={{
              padding: "0.5rem 1.25rem",
              fontSize: "0.85rem",
              fontWeight: 600,
              background: "#A5122F",
              color: "#FFFFFF",
              border: "none",
              borderRadius: "6px",
              cursor: saving || loading ? "not-allowed" : "pointer",
            }}
          >
            {saving ? "Saving Changes..." : "💾 Save Changes"}
          </button>
        </div>
      </div>
    </div>
  );
}

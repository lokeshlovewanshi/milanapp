import React, { useEffect, useRef, useState, useCallback } from "react";
import { useNavigate, Link } from "react-router-dom";
import {
  profileAPI,
  referenceAPI,
  attachmentAPI,
  biodataAPI,
  clearSession,
} from "../api";
import { VerifiedBadge, Icon } from "../components/Icons";
import KundaliCard from "../components/KundaliCard";
import {
  HEIGHT_MAP,
  ANNUAL_INCOME_MAP,
  MARITAL_STATUS_MAP,
  MANGLIK_MAP,
  COMPLEXION_MAP,
  BLOOD_GROUP_MAP,
  EMPLOYED_IN_MAP,
  EDUCATION_MAP,
  PROFESSION_MAP,
  formatHeight,
  formatAnnualIncome,
  formatEducation,
  formatProfession,
  formatMaritalStatus,
  formatManglik,
  formatDiet,
  formatComplexion,
  formatBloodGroup,
  formatEmployedIn,
} from "../formatters";

const GENDER_OPTIONS = [
  { code: "MALE", label: "Male" },
  { code: "FEMALE", label: "Female" },
];

const HEIGHT_OPTIONS = Object.entries(HEIGHT_MAP).map(([code, label]) => ({
  code,
  label,
}));
const INCOME_OPTIONS = Object.entries(ANNUAL_INCOME_MAP).map(
  ([code, label]) => ({ code, label }),
);
const MARITAL_STATUS_OPTIONS = Object.entries(MARITAL_STATUS_MAP).map(
  ([code, label]) => ({ code, label }),
);
const DIET_OPTIONS = [
  { code: "VEG", label: "Vegetarian" },
  { code: "NON_VEG", label: "Non-Vegetarian" },
  { code: "EGGETARIAN", label: "Eggetarian" },
  { code: "VEGAN", label: "Vegan" },
  { code: "JAIN", label: "Jain Vegetarian" },
];
const MANGLIK_OPTIONS = Object.entries(MANGLIK_MAP).map(([code, label]) => ({
  code,
  label,
}));
const COMPLEXION_OPTIONS = Object.entries(COMPLEXION_MAP).map(
  ([code, label]) => ({ code, label }),
);
const BLOOD_GROUP_OPTIONS = Object.entries(BLOOD_GROUP_MAP).map(
  ([code, label]) => ({ code, label }),
);
const EMPLOYED_IN_OPTIONS = Object.entries(EMPLOYED_IN_MAP).map(
  ([code, label]) => ({ code, label }),
);
const EDUCATION_OPTIONS = Object.entries(EDUCATION_MAP).map(
  ([code, label]) => ({ code, label }),
);
const PROFESSION_OPTIONS = Object.entries(PROFESSION_MAP).map(
  ([code, label]) => ({ code, label }),
);

const MOTHER_TONGUE_OPTIONS = [
  { code: "Hindi", label: "Hindi (हिन्दी)" },
  { code: "Bundelkhandi", label: "Bundelkhandi (बुंदेलखंडी)" },
  { code: "English", label: "English" },
  { code: "Marathi", label: "Marathi (मराठी)" },
  { code: "Gujarati", label: "Gujarati (गुजराती)" },
  { code: "Marwari", label: "Marwari (मारवाड़ी)" },
  { code: "Other", label: "Other / अन्य" },
];

const GOTRA_OPTIONS = [];

const ZODIAC_OPTIONS = [
  { code: "Mesha", label: "Mesha / मेष (Aries)" },
  { code: "Vrishabha", label: "Vrishabha / वृषभ (Taurus)" },
  { code: "Mithuna", label: "Mithuna / मिथुन (Gemini)" },
  { code: "Karka", label: "Karka / कर्क (Cancer)" },
  { code: "Simha", label: "Simha / सिंह (Leo)" },
  { code: "Kanya", label: "Kanya / कन्या (Virgo)" },
  { code: "Tula", label: "Tula / तुला (Libra)" },
  { code: "Vrishchika", label: "Vrishchika / वृश्चिक (Scorpio)" },
  { code: "Dhanu", label: "Dhanu / धनु (Sagittarius)" },
  { code: "Makara", label: "Makara / मकर (Capricorn)" },
  { code: "Kumbha", label: "Kumbha / कुंभ (Aquarius)" },
  { code: "Meena", label: "Meena / मीन (Pisces)" },
];

const NAKSHATRA_OPTIONS = [
  { code: "Ashwini", label: "Ashwini (अश्विनी)" },
  { code: "Bharani", label: "Bharani (भरणी)" },
  { code: "Krittika", label: "Krittika (कृत्तिका)" },
  { code: "Rohini", label: "Rohini (रोहिणी)" },
  { code: "Mrigashira", label: "Mrigashira (मृगशिरा)" },
  { code: "Ardra", label: "Ardra (आर्द्रा)" },
  { code: "Punarvasu", label: "Punarvasu (पुनर्वसु)" },
  { code: "Pushya", label: "Pushya (पुष्य)" },
  { code: "Ashlesha", label: "Ashlesha (आश्लेषा)" },
  { code: "Magha", label: "Magha (मघा)" },
  { code: "Purva Phalguni", label: "Purva Phalguni (पूर्वा फाल्गुनी)" },
  { code: "Uttara Phalguni", label: "Uttara Phalguni (उत्तरा फाल्गुनी)" },
  { code: "Hasta", label: "Hasta (हस्त)" },
  { code: "Chitra", label: "Chitra (चित्रा)" },
  { code: "Swati", label: "Swati (स्वाति)" },
  { code: "Vishakha", label: "Vishakha (विशाखा)" },
  { code: "Anuradha", label: "Anuradha (अनुराधा)" },
  { code: "Jyeshtha", label: "Jyeshtha (ज्येष्ठा)" },
  { code: "Mula", label: "Mula (मूल)" },
  { code: "Purva Ashadha", label: "Purva Ashadha (पूर्वाषाढ़ा)" },
  { code: "Uttara Ashadha", label: "Uttara Ashadha (उत्तराषाढ़ा)" },
  { code: "Shravana", label: "Shravana (श्रवण)" },
  { code: "Dhanishta", label: "Dhanishta (धनिष्ठा)" },
  { code: "Shatabhisha", label: "Shatabhisha (शतभिषा)" },
  { code: "Purva Bhadrapada", label: "Purva Bhadrapada (पूर्वाभाद्रपद)" },
  { code: "Uttara Bhadrapada", label: "Uttara Bhadrapada (उत्तराभाद्रपद)" },
  { code: "Revati", label: "Revati (रेवती)" },
];

const STATE_OPTIONS = [
  { code: "Madhya Pradesh", label: "Madhya Pradesh (मध्य प्रदेश)" },
  { code: "Uttar Pradesh", label: "Uttar Pradesh (उत्तर प्रदेश)" },
  { code: "Maharashtra", label: "Maharashtra (महाराष्ट्र)" },
  { code: "Delhi NCR", label: "Delhi NCR (दिल्ली एनसीआर)" },
  { code: "Rajasthan", label: "Rajasthan (राजस्थान)" },
  { code: "Gujarat", label: "Gujarat (गुजरात)" },
  { code: "Chhattisgarh", label: "Chhattisgarh (छत्तीसगढ़)" },
  { code: "Karnataka", label: "Karnataka (कर्नाटक)" },
  { code: "Telangana", label: "Telangana (तेलंगाना)" },
  { code: "Haryana", label: "Haryana (हरियाणा)" },
  { code: "Punjab", label: "Punjab (पंजाब)" },
  { code: "Bihar", label: "Bihar (बिहार)" },
  { code: "West Bengal", label: "West Bengal (पश्चिम बंगाल)" },
];

const PROFILE_CREATED_BY_OPTIONS = [
  { code: "SELF", label: "Self (स्वयं)" },
  { code: "PARENT", label: "Parents / Guardian (माता-पिता)" },
  { code: "SIBLING", label: "Sibling (भाई / बहन)" },
  { code: "RELATIVE", label: "Relative (रिश्तेदार)" },
  { code: "FRIEND", label: "Friend (मित्र)" },
];

// Sections Configuration (Matching Jeevansathi Image 4)
const EDIT_SECTIONS = [
  {
    id: "basic",
    title: "Basic Details",
    subtitle: "Brief outline of personal information",
    icon: "user",
    fields: [
      { key: "name", label: "Full Name", required: true },
      {
        key: "gender",
        label: "Gender",
        type: "pills",
        options: GENDER_OPTIONS,
      },
      {
        key: "maritalStatus",
        label: "Marital Status",
        type: "pills",
        options: MARITAL_STATUS_OPTIONS,
        category: "marital_status",
      },
      { key: "dateOfBirth", label: "Date of Birth", type: "date" },
      {
        key: "height",
        label: "Height",
        type: "select",
        options: HEIGHT_OPTIONS,
        category: "height",
      },
      { key: "weight", label: "Weight (kg)", type: "number" },
      {
        key: "motherTongue",
        label: "Mother Tongue (मातृभाषा)",
        type: "select",
        options: MOTHER_TONGUE_OPTIONS,
        category: "mother_tongue",
      },
      {
        key: "diet",
        label: "Diet Preference",
        type: "pills",
        options: DIET_OPTIONS,
        category: "diet",
      },
      {
        key: "bloodGroup",
        label: "Blood Group",
        type: "select",
        options: BLOOD_GROUP_OPTIONS,
        category: "blood_group",
      },
      {
        key: "complexion",
        label: "Complexion",
        type: "select",
        options: COMPLEXION_OPTIONS,
        category: "complexion",
      },
      {
        key: "profileCreatedBy",
        label: "Profile Created By",
        type: "pills",
        options: PROFILE_CREATED_BY_OPTIONS,
        category: "profile_created_by",
      },
    ],
  },
  {
    id: "about",
    title: "About Me",
    subtitle: "Describe yourself in a few words",
    icon: "heart",
    fields: [
      {
        key: "aboutMyself",
        label: "About Myself",
        type: "textarea",
        placeholder:
          "Write a short paragraph about your personality, hobbies, goals, and values...",
      },
    ],
  },
  {
    id: "location",
    title: "Location & Address",
    subtitle: "Current residence and native place details",
    icon: "map-pin",
    fields: [
      { key: "city", label: "Current City (शहर)", type: "city_search" },
      {
        key: "state",
        label: "State (राज्य)",
        type: "select",
        options: STATE_OPTIONS,
      },
      { key: "town", label: "Town / Native Place (मूल निवास)" },
      { key: "country", label: "Country", placeholder: "India" },
      { key: "presentAddress", label: "Present Address", type: "textarea" },
      { key: "permanentAddress", label: "Permanent Address", type: "textarea" },
    ],
  },
  {
    id: "contact",
    title: "Contact Details",
    subtitle: "Direct channels unlocked upon connection",
    icon: "phone",
    fields: [
      { key: "whatsappNo", label: "WhatsApp Number" },
      { key: "fathersContactNo", label: "Father's / Guardian Contact" },
    ],
  },
  {
    id: "education",
    title: "Education & Career",
    subtitle: "Qualifications, employment and earnings",
    icon: "briefcase",
    fields: [
      {
        key: "education",
        label: "Highest Degree",
        type: "select",
        options: EDUCATION_OPTIONS,
        category: "education",
      },
      { key: "educationDetails", label: "College / University / Stream" },
      {
        key: "profession",
        label: "Profession / Designation",
        type: "select",
        options: PROFESSION_OPTIONS,
        category: "profession",
      },
      {
        key: "employedIn",
        label: "Employed In",
        type: "pills",
        options: EMPLOYED_IN_OPTIONS,
        category: "employed_in",
      },
      { key: "organization", label: "Organization / Company" },
      {
        key: "annualIncome",
        label: "Annual Income",
        type: "select",
        options: INCOME_OPTIONS,
        category: "annual_income",
      },
      { key: "workCity", label: "Work Location / City" },
    ],
  },
  {
    id: "family",
    title: "Family Details",
    subtitle: "Parents, siblings and maternal relatives",
    icon: "users",
    fields: [
      { key: "fathersName", label: "Father's Name" },
      { key: "fathersOccupation", label: "Father's Occupation" },
      { key: "mothersName", label: "Mother's Name" },
      { key: "mothersOccupation", label: "Mother's Occupation" },
      { key: "marriedBrothers", label: "Married Brothers", type: "number" },
      { key: "unmarriedBrothers", label: "Unmarried Brothers", type: "number" },
      { key: "marriedSisters", label: "Married Sisters", type: "number" },
      { key: "unmarriedSisters", label: "Unmarried Sisters", type: "number" },
      { key: "maternalUnclesName", label: "Maternal Uncle's Name (मामाजी)" },
      { key: "maternalUnclesGotra", label: "Maternal Uncle's Gotra" },
    ],
  },
  {
    id: "religion",
    title: "Religion & Astro Kundali",
    subtitle: "Community, Gotra and birth timing coordinates",
    icon: "sparkles",
    fields: [
      {
        key: "gotra",
        label: "Gotra (गोत्र)",
        type: "select",
        options: GOTRA_OPTIONS,
        category: "gotra",
      },
      {
        key: "placeOfBirth",
        label: "Birth City / Place of Birth (जन्म स्थान / शहर)",
        type: "city_search",
      },
      { key: "timeOfBirth", label: "Time of Birth (जन्म समय)", type: "time" },
      {
        key: "manglik",
        label: "Manglik Status",
        type: "pills",
        options: MANGLIK_OPTIONS,
        category: "manglik",
      },
      {
        key: "zodiac",
        label: "Zodiac / Rashi (राशि)",
        type: "select",
        options: ZODIAC_OPTIONS,
        category: "rashi",
      },
      {
        key: "nakshatra",
        label: "Nakshatra (नक्षत्र)",
        type: "select",
        options: NAKSHATRA_OPTIONS,
        category: "nakshatra",
      },
    ],
  },
  {
    id: "partner",
    title: "Partner Expectations",
    subtitle: "Desired preferences in a life partner",
    icon: "heart",
    fields: [
      {
        key: "partnerPreferences",
        label: "Partner Preferences & Expectations",
        type: "textarea",
        placeholder:
          "Describe what you are looking for in terms of education, family values, lifestyle, and location...",
      },
    ],
  },
];

// Searchable database city selector component
function CitySearchInput({
  value,
  onChange,
  placeholder = "Search database city (e.g. Jhansi, Gwalior, Kanpur)...",
}) {
  const [query, setQuery] = useState(value || "");
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const [selectedCity, setSelectedCity] = useState(value || "");

  useEffect(() => {
    setQuery(value || "");
    setSelectedCity(value || "");
  }, [value]);

  const handleSearch = async (val) => {
    setQuery(val);
    setSelectedCity("");
    if (!val || val.trim().length < 2) {
      setResults([]);
      setOpen(false);
      return;
    }
    setLoading(true);
    try {
      const res = await referenceAPI.cities({ search: val.trim() });
      setResults(res || []);
      setOpen(true);
    } catch {
      setResults([]);
    } finally {
      setLoading(false);
    }
  };

  const handleSelect = (city) => {
    const cityName = city.name;
    setQuery(cityName);
    setSelectedCity(cityName);
    onChange(cityName);
    setOpen(false);
  };

  return (
    <div className="city-search-box">
      <div
        style={{ position: "relative", display: "flex", alignItems: "center" }}
      >
        <input
          type="text"
          value={query}
          onChange={(e) => handleSearch(e.target.value)}
          onFocus={() => {
            if (results.length > 0) setOpen(true);
          }}
          placeholder={placeholder}
          className="city-search-input"
          style={{ paddingRight: selectedCity ? "2.5rem" : "1rem" }}
        />
        {selectedCity && (
          <span
            style={{
              position: "absolute",
              right: 12,
              color: "#166534",
              fontWeight: 800,
              fontSize: "1rem",
              pointerEvents: "none",
            }}
            title="Recognized Database City"
          >
            ✓
          </span>
        )}
      </div>

      {open && (
        <div className="city-dropdown-list">
          {loading && (
            <div
              className="city-dropdown-item"
              style={{ color: "var(--secondary-text)" }}
            >
              Searching cities database...
            </div>
          )}
          {!loading && results.length === 0 && (
            <div
              className="city-dropdown-item"
              style={{ color: "var(--secondary-text)", fontSize: "0.82rem" }}
            >
              No recognized city found for "{query}". Please pick your nearest
              major city.
            </div>
          )}
          {!loading &&
            results.map((c) => (
              <div
                key={c.id || c.name}
                className="city-dropdown-item"
                onClick={() => handleSelect(c)}
              >
                <span style={{ fontWeight: 600 }}>{c.name}</span>
                {c.state && (
                  <span className="city-dropdown-state">{c.state}</span>
                )}
              </div>
            ))}
        </div>
      )}
    </div>
  );
}

function TimePickerInput({ value, onChange }) {
  const parseTime = (val) => {
    if (!val) return { hour: "12", minute: "00", ampm: "AM" };
    const str = String(val).trim();
    const match12 = str.match(/^(\d{1,2}):(\d{2})\s*(AM|PM)?$/i);
    if (match12) {
      const h = String(parseInt(match12[1], 10)).padStart(2, "0");
      const m = match12[2];
      const p = (match12[3] || "AM").toUpperCase();
      return { hour: h, minute: m, ampm: p };
    }
    const match24 = str.match(/^(\d{1,2}):(\d{2})(:\d{2})?$/);
    if (match24) {
      let hNum = parseInt(match24[1], 10);
      const m = match24[2];
      const p = hNum >= 12 ? "PM" : "AM";
      if (hNum > 12) hNum -= 12;
      if (hNum === 0) hNum = 12;
      return { hour: String(hNum).padStart(2, "0"), minute: m, ampm: p };
    }
    return { hour: "12", minute: "00", ampm: "AM" };
  };

  const current = parseTime(value);

  const handleChange = (part, val) => {
    const updated = { ...current, [part]: val };
    onChange(`${updated.hour}:${updated.minute} ${updated.ampm}`);
  };

  const hours = Array.from({ length: 12 }, (_, i) =>
    String(i + 1).padStart(2, "0"),
  );
  const minutes = Array.from({ length: 60 }, (_, i) =>
    String(i).padStart(2, "0"),
  );

  return (
    <div style={{ display: "flex", gap: "0.4rem", alignItems: "center" }}>
      <select
        value={current.hour}
        onChange={(e) => handleChange("hour", e.target.value)}
        style={{
          flex: 1,
          padding: "0.65rem 0.5rem",
          borderRadius: 8,
          border: "1px solid var(--border)",
        }}
        title="Hour"
      >
        {hours.map((h) => (
          <option key={h} value={h}>
            {h}
          </option>
        ))}
      </select>

      <span style={{ fontWeight: "bold", color: "var(--secondary-text)" }}>
        :
      </span>

      <select
        value={current.minute}
        onChange={(e) => handleChange("minute", e.target.value)}
        style={{
          flex: 1,
          padding: "0.65rem 0.5rem",
          borderRadius: 8,
          border: "1px solid var(--border)",
        }}
        title="Minute"
      >
        {minutes.map((m) => (
          <option key={m} value={m}>
            {m}
          </option>
        ))}
      </select>

      <select
        value={current.ampm}
        onChange={(e) => handleChange("ampm", e.target.value)}
        style={{
          width: "80px",
          padding: "0.65rem 0.5rem",
          borderRadius: 8,
          border: "1px solid var(--border)",
        }}
        title="AM/PM"
      >
        <option value="AM">AM</option>
        <option value="PM">PM</option>
      </select>
    </div>
  );
}

function toFormState(profile) {
  const state = {};
  for (const section of EDIT_SECTIONS) {
    for (const field of section.fields) {
      let value = profile[field.key];
      if (field.key === "placeOfBirth" && !value) {
        value =
          profile.birthCity ||
          profile.cityOfBirth ||
          profile.place_of_birth ||
          "";
      }
      if (field.type === "date" && value) {
        state[field.key] = String(value).slice(0, 10);
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
      if (
        field.type === "number" ||
        field.key === "weight" ||
        field.key.toLowerCase().includes("brothers") ||
        field.key.toLowerCase().includes("sisters")
      ) {
        payload[field.key] = raw === "" || raw == null ? null : Number(raw);
      } else if (field.type === "date") {
        if (!raw) {
          payload[field.key] = null;
        } else {
          const str = String(raw).trim();
          payload[field.key] = str.includes("T") ? str : `${str}T00:00:00`;
        }
      } else {
        payload[field.key] = raw === "" ? null : raw;
      }
    }
  }
  if (form.placeOfBirth || form.birthCity) {
    payload.placeOfBirth = form.placeOfBirth || form.birthCity || null;
    payload.birthCity = form.placeOfBirth || form.birthCity || null;
  }
  return payload;
}

export default function MyProfile() {
  const navigate = useNavigate();
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState(null);
  const [refOptions, setRefOptions] = useState({});

  // Active editing section id (null = view cards mode, string = edit sheet mode Image 5)
  const [editingSectionId, setEditingSectionId] = useState(null);
  const [saving, setSaving] = useState(false);
  const [savedMessage, setSavedMessage] = useState("");
  const [error, setError] = useState("");

  // Modals state
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [showMembershipModal, setShowMembershipModal] = useState(false);

  // Photo studio state
  const [uploading, setUploading] = useState(false);
  const [photoBusyId, setPhotoBusyId] = useState(null);
  const [photoError, setPhotoError] = useState("");
  const fileInputRef = useRef(null);

  // Biodata download state
  const [biodataBusy, setBiodataBusy] = useState(false);
  const [biodataError, setBiodataError] = useState("");

  function reloadProfile() {
    return profileAPI.getMe().then((p) => {
      setProfile(p);
      setForm(toFormState(p));
      return p;
    });
  }

  useEffect(() => {
    reloadProfile().then(() => setLoading(false));
    referenceAPI
      .allOptions()
      .then((data) => setRefOptions(data || {}))
      .catch(() => {});
  }, []);

  async function handleDownloadBiodata() {
    setBiodataBusy(true);
    setBiodataError("");
    try {
      const html = await biodataAPI.fetchHtml();
      const win = window.open("", "_blank");
      if (!win) {
        setBiodataError(
          "Please allow pop-ups for this site to download your biodata",
        );
        return;
      }
      win.document.write(html);
      win.document.close();
      win.onload = () => setTimeout(() => win.print(), 400);
    } catch (err) {
      setBiodataError(err?.message || "Could not build your biodata");
    } finally {
      setBiodataBusy(false);
    }
  }

  async function handleFileSelected(e) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;

    setUploading(true);
    setPhotoError("");
    try {
      await attachmentAPI.uploadFile(file);
      await reloadProfile();
    } catch {
      setPhotoError(
        "Could not upload this photo. Please try a different image.",
      );
    } finally {
      setUploading(false);
    }
  }

  async function handleSetPrimary(id) {
    setPhotoBusyId(id);
    setPhotoError("");
    try {
      await attachmentAPI.setPrimary(id);
      await reloadProfile();
    } catch {
      setPhotoError("Could not set this as primary photo");
    } finally {
      setPhotoBusyId(null);
    }
  }

  async function handleDeletePhoto(id) {
    if (
      !window.confirm(
        "Are you sure you want to delete this photo?\nThis cannot be undone.",
      )
    )
      return;
    setPhotoBusyId(id);
    setPhotoError("");
    try {
      await attachmentAPI.deleteFile(id);
      await reloadProfile();
    } catch {
      setPhotoError("Could not delete this photo");
    } finally {
      setPhotoBusyId(null);
    }
  }

  function handleFieldChange(key, value) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  async function handleSaveSection() {
    setSaving(true);
    setError("");
    setSavedMessage("");
    try {
      const payload = toPayload(form);
      await profileAPI.updateProfile(payload);
      await reloadProfile();
      setSavedMessage("Details updated successfully!");
      setTimeout(() => {
        setSavedMessage("");
        setEditingSectionId(null);
      }, 700);
    } catch (err) {
      setError(
        err?.message || "Could not save details. Please check your inputs.",
      );
    } finally {
      setSaving(false);
    }
  }

  async function handleToggleVisibility() {
    if (!profile) return;
    const nextHidden = !profile.hidden;
    try {
      await profileAPI.setHidden(nextHidden);
      setProfile((prev) => ({ ...prev, hidden: nextHidden }));
    } catch (err) {
      alert(err?.message || "Could not change profile visibility");
    }
  }

  function handleLogout() {
    clearSession();
    window.location.href = "/login";
  }

  if (loading || !profile || !form) {
    return (
      <div style={{ textAlign: "center", padding: "5rem 2rem" }}>
        <div className="loading-spinner-ring" />
        <p style={{ color: "var(--secondary-text)", fontWeight: 600 }}>
          Loading your profile...
        </p>
      </div>
    );
  }

  const rawId = String(profile.id || "");
  const digits = rawId.replace(/\D/g, "");
  const code = digits ? `GM${digits}` : rawId ? `GM${rawId}` : "";
  const photos = profile.profileImageDetails || [];
  const activeEditingSection = EDIT_SECTIONS.find(
    (s) => s.id === editingSectionId,
  );

  return (
    <div
      className="profile-editor-container"
      style={{ maxWidth: 880, margin: "0 auto", padding: "0.5rem 0.5rem 5rem" }}
    >
      {/* 1. Header Greeting (No maroon background, only 'Hi, {name}') */}
      <div className="profile-greeting-header">
        <div className="profile-greeting-left">
          <div className="profile-greeting-name-row">
            <h1 className="profile-greeting-title">
              Hi, {profile.name || "Member"}
            </h1>
            {profile.verified !== false && <VerifiedBadge size={19} />}
            <span className="profile-code-pill">{code}</span>
            <span
              className={`profile-visibility-status ${profile.hidden ? "hidden" : "visible"}`}
            >
              {profile.hidden ? "Profile Hidden" : "Profile Visible"}
            </span>
          </div>
          <p className="profile-greeting-sub">
            {profile.email ||
              profile.mobileNo ||
              "Lovewanshi Parinay Community Member"}
          </p>
        </div>
      </div>

      {/* 2. Photo Studio (Upload photos, no helper paragraph text) */}
      <div className="photo-studio-card" style={{ marginBottom: "1.25rem" }}>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            flexWrap: "wrap",
            gap: "0.75rem",
            marginBottom: "0.5rem",
          }}
        >
          <div>
            <h3
              style={{
                margin: "0 0 0.15rem",
                fontSize: "1.15rem",
                color: "var(--dark-navy)",
                fontWeight: 800,
              }}
            >
              Photo Studio ({photos.length} Photo
              {photos.length !== 1 ? "s" : ""})
            </h3>
          </div>
          <button
            type="button"
            className="btn-connect-primary"
            style={{ padding: "0.5rem 1.1rem", fontSize: "0.86rem" }}
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
          >
            <Icon name="camera" size={16} />
            <span>{uploading ? "Uploading..." : "Upload New Photo"}</span>
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            style={{ display: "none" }}
            onChange={handleFileSelected}
          />
        </div>

        {photoError && (
          <div className="error" style={{ marginBottom: "0.75rem" }}>
            {photoError}
          </div>
        )}

        {photos.length === 0 && (
          <div
            style={{
              background: "#FAF8F8",
              padding: "1.75rem",
              borderRadius: 12,
              textAlign: "center",
              border: "1.5px dashed var(--border)",
              marginTop: "0.5rem",
            }}
          >
            <Icon name="camera" size={32} color="#9CA3AF" />
            <p
              style={{
                margin: "0.5rem 0 0",
                fontSize: "0.88rem",
                color: "var(--secondary-text)",
              }}
            >
              No photos uploaded yet. Add a portrait photo to receive more
              proposals.
            </p>
          </div>
        )}

        {photos.length > 0 && (
          <div className="photo-studio-grid" style={{ marginTop: "0.75rem" }}>
            {photos.map((photo) => (
              <div key={photo.id} className="photo-item-card">
                <img src={photo.url} alt="Candidate portrait" />
                {photo.isPrimary && (
                  <div className="photo-primary-badge">Primary ★</div>
                )}
                <div
                  style={{
                    position: "absolute",
                    bottom: 0,
                    left: 0,
                    right: 0,
                    padding: "0.45rem",
                    background:
                      "linear-gradient(to top, rgba(0,0,0,0.85) 0%, transparent 100%)",
                    display: "flex",
                    flexDirection: "column",
                    gap: "0.3rem",
                  }}
                >
                  {!photo.isPrimary && (
                    <button
                      type="button"
                      className="small secondary"
                      style={{
                        padding: "0.3rem 0.5rem",
                        fontSize: "0.72rem",
                        background: "rgba(255,255,255,0.95)",
                        border: "none",
                        fontWeight: 700,
                      }}
                      disabled={photoBusyId === photo.id}
                      onClick={() => handleSetPrimary(photo.id)}
                    >
                      Make Primary
                    </button>
                  )}
                  <button
                    type="button"
                    className="small danger"
                    style={{
                      padding: "0.3rem 0.5rem",
                      fontSize: "0.72rem",
                      fontWeight: 700,
                    }}
                    disabled={photoBusyId === photo.id}
                    onClick={() => handleDeletePhoto(photo.id)}
                  >
                    Delete
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 3. Elegant Quick Action Buttons Bar (Biodata, Kundali, Membership, Account settings, Logout) */}
      <div className="profile-quick-actions-grid">
        {/* Generate Biodata */}
        <button
          type="button"
          className="profile-action-card"
          onClick={handleDownloadBiodata}
          disabled={biodataBusy}
          title="Download printable matrimonial biodata PDF"
        >
          <div className="action-card-icon icon-biodata">
            <Icon name="download" size={20} />
          </div>
          <div className="action-card-text">
            <strong>Generate Biodata</strong>
            <span>{biodataBusy ? "Creating PDF..." : "Download PDF"}</span>
          </div>
        </button>

        {/* Generate Kundali / Kundali Banayen */}
        <button
          type="button"
          className="profile-action-card"
          onClick={() => navigate("/kundali")}
          title="Vedic Kundali Matching & Horoscope generator"
        >
          <div className="action-card-icon icon-kundali">
            <Icon name="sparkles" size={20} />
          </div>
          <div className="action-card-text">
            <strong>Generate Kundali</strong>
            <span>Kundali Banayen</span>
          </div>
        </button>

        {/* Membership Plan */}
        <button
          type="button"
          className="profile-action-card"
          onClick={() => setShowMembershipModal(true)}
          title="View Lovewanshi Parinay membership plan"
        >
          <div className="action-card-icon icon-membership">
            <Icon name="award" size={20} />
          </div>
          <div className="action-card-text">
            <strong>Membership Plan</strong>
            <span>Free Community</span>
          </div>
        </button>

        {/* Account Settings (Show / Hide profile) */}
        <button
          type="button"
          className="profile-action-card"
          onClick={() => setShowSettingsModal(true)}
          title="Configure profile visibility & settings"
        >
          <div className="action-card-icon icon-settings">
            <Icon name="settings" size={20} />
          </div>
          <div className="action-card-text">
            <strong>Account Settings</strong>
            <span>
              {profile.hidden ? "Hidden from search" : "Visible in search"}
            </span>
          </div>
        </button>

        {/* Logout Button (Visibly accessible on mobile & desktop) */}
        <button
          type="button"
          className="profile-action-card"
          onClick={handleLogout}
          title="Sign out of your account"
        >
          <div className="action-card-icon icon-logout">
            <Icon name="log-out" size={20} />
          </div>
          <div className="action-card-text">
            <strong>Log Out</strong>
            <span>Sign out securely</span>
          </div>
        </button>
      </div>

      {biodataError && (
        <div className="error" style={{ marginBottom: "1rem" }}>
          {biodataError}
        </div>
      )}

      {/* 4. EDIT MODE: Slide-over / Sheet Edit View (Reference 5) */}
      {activeEditingSection && (
        <div className="jeevansathi-edit-wrapper">
          {/* Edit Top Bar (< Back Arrow, Title, Subtitle) */}
          <div className="jeevansathi-edit-top-bar">
            <button
              type="button"
              className="edit-back-btn"
              onClick={() => {
                setEditingSectionId(null);
                setError("");
                setSavedMessage("");
              }}
              title="Back to profile overview"
            >
              <Icon name="arrow-left" size={18} />
            </button>
            <div className="edit-top-title-group">
              <h2>{activeEditingSection.title}</h2>
              <p>{activeEditingSection.subtitle}</p>
            </div>
          </div>

          {error && (
            <div className="error" style={{ marginBottom: "1rem" }}>
              {error}
            </div>
          )}
          {savedMessage && (
            <div
              style={{
                marginBottom: "1rem",
                color: "#065F46",
                background: "#ECFDF5",
                border: "1px solid #A7F3D0",
                padding: "0.75rem 1rem",
                borderRadius: 8,
                fontWeight: 700,
              }}
            >
              {savedMessage}
            </div>
          )}

          {/* Section Edit Fields */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))",
              gap: "1.25rem",
            }}
          >
            {activeEditingSection.fields.map((field) => {
              const dynamicOpts =
                field.category && refOptions[field.category]?.length
                  ? refOptions[field.category]
                  : field.options;

              // 1. Choice Pills (Marital Status, Manglik, Diet, Gender, Profile Created By, Employed In)
              if (field.type === "pills") {
                const currentVal = form[field.key] || "";
                return (
                  <div key={field.key} style={{ gridColumn: "1 / -1" }}>
                    <label
                      style={{
                        fontWeight: 700,
                        fontSize: "0.88rem",
                        color: "var(--dark-navy)",
                        display: "block",
                        marginBottom: "0.3rem",
                      }}
                    >
                      {field.label}{" "}
                      {field.required && (
                        <strong style={{ color: "#ED4956" }}>*</strong>
                      )}
                    </label>
                    <div className="pill-select-group">
                      {(dynamicOpts || []).map((opt) => {
                        const codeVal =
                          typeof opt === "object" ? opt.code : opt;
                        const labelVal =
                          typeof opt === "object" ? opt.label : opt;
                        const isSelected =
                          String(currentVal) === String(codeVal);

                        return (
                          <button
                            type="button"
                            key={codeVal}
                            className={`choice-pill ${isSelected ? "active" : ""}`}
                            onClick={() =>
                              handleFieldChange(field.key, codeVal)
                            }
                          >
                            {labelVal}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                );
              }

              // 2. Database City Search Autocomplete (placeOfBirth & city)
              if (field.type === "city_search") {
                return (
                  <div
                    key={field.key}
                    style={{
                      gridColumn:
                        field.key === "placeOfBirth" ? "1 / -1" : "auto",
                    }}
                  >
                    <label
                      style={{
                        fontWeight: 700,
                        fontSize: "0.88rem",
                        color: "var(--dark-navy)",
                        display: "block",
                        marginBottom: "0.35rem",
                      }}
                    >
                      {field.label}{" "}
                      {field.required && (
                        <strong style={{ color: "#ED4956" }}>*</strong>
                      )}
                    </label>
                    <CitySearchInput
                      value={form[field.key] || ""}
                      onChange={(val) => {
                        handleFieldChange(field.key, val);
                        if (field.key === "placeOfBirth") {
                          handleFieldChange("birthCity", val);
                        }
                      }}
                      placeholder="Search database city (e.g. Jhansi, Gwalior, Kanpur)..."
                    />
                    {field.key === "placeOfBirth" && (
                      <span
                        style={{
                          fontSize: "0.76rem",
                          color: "var(--secondary-text)",
                          marginTop: 4,
                          display: "block",
                        }}
                      >
                        Coordinates for Vedic Kundali calculation are
                        automatically verified against the city database.
                      </span>
                    )}
                  </div>
                );
              }

              // 3. Textarea
              if (field.type === "textarea") {
                return (
                  <label key={field.key} style={{ gridColumn: "1 / -1" }}>
                    <span
                      style={{
                        fontWeight: 700,
                        fontSize: "0.88rem",
                        color: "var(--dark-navy)",
                        display: "block",
                        marginBottom: "0.35rem",
                      }}
                    >
                      {field.label}{" "}
                      {field.required && (
                        <strong style={{ color: "#ED4956" }}>*</strong>
                      )}
                    </span>
                    <textarea
                      rows={4}
                      value={form[field.key] || ""}
                      placeholder={field.placeholder || ""}
                      onChange={(e) =>
                        handleFieldChange(field.key, e.target.value)
                      }
                      style={{
                        width: "100%",
                        borderRadius: 8,
                        padding: "0.75rem 0.85rem",
                        border: "1px solid var(--border)",
                        fontFamily: "inherit",
                        fontSize: "0.9rem",
                      }}
                    />
                  </label>
                );
              }

              // 4. Time Picker
              if (field.type === "time") {
                return (
                  <label key={field.key}>
                    <span
                      style={{
                        fontWeight: 700,
                        fontSize: "0.88rem",
                        color: "var(--dark-navy)",
                        display: "block",
                        marginBottom: "0.35rem",
                      }}
                    >
                      {field.label}{" "}
                      {field.required && (
                        <strong style={{ color: "#ED4956" }}>*</strong>
                      )}
                    </span>
                    <TimePickerInput
                      value={form[field.key] || ""}
                      onChange={(val) => handleFieldChange(field.key, val)}
                    />
                  </label>
                );
              }

              // 5. Select Dropdown
              if (field.type === "select") {
                return (
                  <label key={field.key}>
                    <span
                      style={{
                        fontWeight: 700,
                        fontSize: "0.88rem",
                        color: "var(--dark-navy)",
                        display: "block",
                        marginBottom: "0.35rem",
                      }}
                    >
                      {field.label}{" "}
                      {field.required && (
                        <strong style={{ color: "#ED4956" }}>*</strong>
                      )}
                    </span>
                    <select
                      value={form[field.key] || ""}
                      onChange={(e) =>
                        handleFieldChange(field.key, e.target.value)
                      }
                      style={{
                        width: "100%",
                        borderRadius: 8,
                        padding: "0.65rem 0.85rem",
                        border: "1px solid var(--border)",
                        fontSize: "0.9rem",
                      }}
                    >
                      <option value="">-- Select {field.label} --</option>
                      {(dynamicOpts || []).map((opt) => (
                        <option
                          value={typeof opt === "object" ? opt.code : opt}
                          key={typeof opt === "object" ? opt.code : opt}
                        >
                          {typeof opt === "object" ? opt.label : opt}
                        </option>
                      ))}
                    </select>
                  </label>
                );
              }

              // 6. Regular text / number / date inputs
              return (
                <label key={field.key}>
                  <span
                    style={{
                      fontWeight: 700,
                      fontSize: "0.88rem",
                      color: "var(--dark-navy)",
                      display: "block",
                      marginBottom: "0.35rem",
                    }}
                  >
                    {field.label}{" "}
                    {field.required && (
                      <strong style={{ color: "#ED4956" }}>*</strong>
                    )}
                  </span>
                  <input
                    type={
                      field.type === "number"
                        ? "number"
                        : field.type === "date"
                          ? "date"
                          : "text"
                    }
                    placeholder={field.placeholder || ""}
                    value={form[field.key] || ""}
                    onChange={(e) =>
                      handleFieldChange(field.key, e.target.value)
                    }
                    style={{
                      width: "100%",
                      borderRadius: 8,
                      padding: "0.65rem 0.85rem",
                      border: "1px solid var(--border)",
                      fontSize: "0.9rem",
                    }}
                  />
                </label>
              );
            })}
          </div>

          {/* Big Pink/Red Save Button (Image 5) */}
          <div className="edit-sheet-save-row">
            <button
              type="button"
              className="secondary"
              style={{
                borderRadius: "var(--radius-pill)",
                padding: "0.85rem 1.5rem",
                fontWeight: 600,
              }}
              onClick={() => {
                setEditingSectionId(null);
                setError("");
              }}
            >
              Cancel
            </button>
            <button
              type="button"
              className="edit-sheet-save-btn"
              onClick={handleSaveSection}
              disabled={saving}
            >
              <Icon name="check" size={18} />
              <span>{saving ? "Saving..." : "Save"}</span>
            </button>
          </div>
        </div>
      )}

      {/* 5. VIEW MODE: Stack of Editable Cards with Icons (Reference 4) */}
      {!activeEditingSection && (
        <div className="jeevansathi-sections-stack">
          {EDIT_SECTIONS.map((sec) => (
            <div key={sec.id} className="jeevansathi-section-card">
              <div className="jeevansathi-card-header">
                <div className="jeevansathi-header-left">
                  <h3>{sec.title}</h3>
                  <p>{sec.subtitle}</p>
                </div>
                <button
                  type="button"
                  className="edit-pencil-btn"
                  onClick={() => {
                    setEditingSectionId(sec.id);
                    setError("");
                    setSavedMessage("");
                  }}
                  title={`Edit ${sec.title}`}
                >
                  <Icon name="pencil" size={16} />
                </button>
              </div>

              {/* Card Body Attributes with Icons (Image 4 format) */}
              <div className="jeevansathi-attr-list">
                {sec.id === "basic" && (
                  <>
                    <div className="jeevansathi-attr-row">
                      <div className="jeevansathi-attr-icon">
                        <Icon name="user" size={16} />
                      </div>
                      <div className="jeevansathi-attr-content">
                        <span className="jeevansathi-attr-label">Height</span>
                        <span className="jeevansathi-attr-val">
                          {formatHeight(profile.height) || "Not specified"}
                        </span>
                      </div>
                    </div>
                    <div className="jeevansathi-attr-row">
                      <div className="jeevansathi-attr-icon">
                        <Icon name="sparkles" size={16} />
                      </div>
                      <div className="jeevansathi-attr-content">
                        <span className="jeevansathi-attr-label">
                          Community / Religion
                        </span>
                        <span className="jeevansathi-attr-val">
                          LOVEWANSHI Vaishya
                        </span>
                      </div>
                    </div>
                    <div className="jeevansathi-attr-row">
                      <div className="jeevansathi-attr-icon">
                        <Icon name="globe" size={16} />
                      </div>
                      <div className="jeevansathi-attr-content">
                        <span className="jeevansathi-attr-label">
                          Mother Tongue
                        </span>
                        <span className="jeevansathi-attr-val">
                          {profile.motherTongue || "Hindi"}
                        </span>
                      </div>
                    </div>
                    <div className="jeevansathi-attr-row">
                      <div className="jeevansathi-attr-icon">
                        <Icon name="calendar" size={16} />
                      </div>
                      <div className="jeevansathi-attr-content">
                        <span className="jeevansathi-attr-label">
                          Date of Birth
                        </span>
                        <span className="jeevansathi-attr-val">
                          {profile.dateOfBirth
                            ? String(profile.dateOfBirth).slice(0, 10)
                            : "Not specified"}
                        </span>
                      </div>
                    </div>
                    <div className="jeevansathi-attr-row">
                      <div className="jeevansathi-attr-icon">
                        <Icon name="heart" size={16} />
                      </div>
                      <div className="jeevansathi-attr-content">
                        <span className="jeevansathi-attr-label">
                          Marital Status
                        </span>
                        <span className="jeevansathi-attr-val">
                          {formatMaritalStatus(profile.maritalStatus) ||
                            "Never Married"}
                        </span>
                      </div>
                    </div>
                    {profile.diet && (
                      <div className="jeevansathi-attr-row">
                        <div className="jeevansathi-attr-icon">
                          <Icon name="check" size={16} />
                        </div>
                        <div className="jeevansathi-attr-content">
                          <span className="jeevansathi-attr-label">Diet</span>
                          <span className="jeevansathi-attr-val">
                            {formatDiet(profile.diet)}
                          </span>
                        </div>
                      </div>
                    )}
                  </>
                )}

                {sec.id === "about" && (
                  <div
                    style={{
                      fontSize: "0.92rem",
                      color: "var(--dark-navy)",
                      lineHeight: 1.6,
                    }}
                  >
                    {profile.aboutMyself ? (
                      <p style={{ margin: 0, fontStyle: "italic" }}>
                        "{profile.aboutMyself}"
                      </p>
                    ) : (
                      <p style={{ margin: 0, color: "var(--secondary-text)" }}>
                        No description added yet. Tap the edit pencil above to
                        add a few words about yourself.
                      </p>
                    )}
                  </div>
                )}

                {sec.id === "location" && (
                  <>
                    <div className="jeevansathi-attr-row">
                      <div className="jeevansathi-attr-icon">
                        <Icon name="map-pin" size={16} />
                      </div>
                      <div className="jeevansathi-attr-content">
                        <span className="jeevansathi-attr-label">
                          Current City & State
                        </span>
                        <span className="jeevansathi-attr-val">
                          {[
                            profile.city,
                            profile.state,
                            profile.country || "India",
                          ]
                            .filter(Boolean)
                            .join(", ") || "Not specified"}
                        </span>
                      </div>
                    </div>
                    {profile.town && (
                      <div className="jeevansathi-attr-row">
                        <div className="jeevansathi-attr-icon">
                          <Icon name="location" size={16} />
                        </div>
                        <div className="jeevansathi-attr-content">
                          <span className="jeevansathi-attr-label">
                            Town / Native Place
                          </span>
                          <span className="jeevansathi-attr-val">
                            {profile.town}
                          </span>
                        </div>
                      </div>
                    )}
                    {profile.presentAddress && (
                      <div className="jeevansathi-attr-row">
                        <div className="jeevansathi-attr-icon">
                          <Icon name="map-pin" size={16} />
                        </div>
                        <div className="jeevansathi-attr-content">
                          <span className="jeevansathi-attr-label">
                            Present Address
                          </span>
                          <span className="jeevansathi-attr-val">
                            {profile.presentAddress}
                          </span>
                        </div>
                      </div>
                    )}
                  </>
                )}

                {sec.id === "contact" && (
                  <>
                    <div className="jeevansathi-attr-row">
                      <div className="jeevansathi-attr-icon">
                        <Icon name="phone" size={16} />
                      </div>
                      <div className="jeevansathi-attr-content">
                        <span className="jeevansathi-attr-label">
                          Mobile Number
                        </span>
                        <span className="jeevansathi-attr-val">
                          {profile.mobileNo || "Not specified"}
                        </span>
                      </div>
                    </div>
                    <div className="jeevansathi-attr-row">
                      <div className="jeevansathi-attr-icon">
                        <Icon name="phone" size={16} />
                      </div>
                      <div className="jeevansathi-attr-content">
                        <span className="jeevansathi-attr-label">
                          WhatsApp Number
                        </span>
                        <span className="jeevansathi-attr-val">
                          {profile.whatsappNo || "Not specified"}
                        </span>
                      </div>
                    </div>
                    {profile.fathersContactNo && (
                      <div className="jeevansathi-attr-row">
                        <div className="jeevansathi-attr-icon">
                          <Icon name="phone" size={16} />
                        </div>
                        <div className="jeevansathi-attr-content">
                          <span className="jeevansathi-attr-label">
                            Father's / Guardian Contact
                          </span>
                          <span className="jeevansathi-attr-val">
                            {profile.fathersContactNo}
                          </span>
                        </div>
                      </div>
                    )}
                  </>
                )}

                {sec.id === "education" && (
                  <>
                    <div className="jeevansathi-attr-row">
                      <div className="jeevansathi-attr-icon">
                        <Icon name="education" size={16} />
                      </div>
                      <div className="jeevansathi-attr-content">
                        <span className="jeevansathi-attr-label">
                          Highest Education
                        </span>
                        <span className="jeevansathi-attr-val">
                          {formatEducation(profile.education) ||
                            "Not specified"}
                        </span>
                      </div>
                    </div>
                    <div className="jeevansathi-attr-row">
                      <div className="jeevansathi-attr-icon">
                        <Icon name="briefcase" size={16} />
                      </div>
                      <div className="jeevansathi-attr-content">
                        <span className="jeevansathi-attr-label">
                          Profession
                        </span>
                        <span className="jeevansathi-attr-val">
                          {formatProfession(profile.profession) ||
                            "Not specified"}
                        </span>
                      </div>
                    </div>
                    {profile.annualIncome && (
                      <div className="jeevansathi-attr-row">
                        <div className="jeevansathi-attr-icon">
                          <Icon name="cash" size={16} />
                        </div>
                        <div className="jeevansathi-attr-content">
                          <span className="jeevansathi-attr-label">
                            Annual Income
                          </span>
                          <span className="jeevansathi-attr-val">
                            {formatAnnualIncome(profile.annualIncome)}
                          </span>
                        </div>
                      </div>
                    )}
                    {profile.organization && (
                      <div className="jeevansathi-attr-row">
                        <div className="jeevansathi-attr-icon">
                          <Icon name="briefcase" size={16} />
                        </div>
                        <div className="jeevansathi-attr-content">
                          <span className="jeevansathi-attr-label">
                            Company / Organization
                          </span>
                          <span className="jeevansathi-attr-val">
                            {profile.organization}
                          </span>
                        </div>
                      </div>
                    )}
                  </>
                )}

                {sec.id === "family" && (
                  <>
                    <div className="jeevansathi-attr-row">
                      <div className="jeevansathi-attr-icon">
                        <Icon name="users" size={16} />
                      </div>
                      <div className="jeevansathi-attr-content">
                        <span className="jeevansathi-attr-label">Father</span>
                        <span className="jeevansathi-attr-val">
                          {[
                            profile.fathersName,
                            profile.fathersOccupation
                              ? `(${profile.fathersOccupation})`
                              : "",
                          ]
                            .filter(Boolean)
                            .join(" ") || "Not specified"}
                        </span>
                      </div>
                    </div>
                    <div className="jeevansathi-attr-row">
                      <div className="jeevansathi-attr-icon">
                        <Icon name="users" size={16} />
                      </div>
                      <div className="jeevansathi-attr-content">
                        <span className="jeevansathi-attr-label">Mother</span>
                        <span className="jeevansathi-attr-val">
                          {[
                            profile.mothersName,
                            profile.mothersOccupation
                              ? `(${profile.mothersOccupation})`
                              : "",
                          ]
                            .filter(Boolean)
                            .join(" ") || "Not specified"}
                        </span>
                      </div>
                    </div>
                    <div className="jeevansathi-attr-row">
                      <div className="jeevansathi-attr-icon">
                        <Icon name="users" size={16} />
                      </div>
                      <div className="jeevansathi-attr-content">
                        <span className="jeevansathi-attr-label">Siblings</span>
                        <span className="jeevansathi-attr-val">
                          {profile.marriedBrothers || 0} Married Bro,{" "}
                          {profile.unmarriedBrothers || 0} Unmarried Bro •{" "}
                          {profile.marriedSisters || 0} Married Sis,{" "}
                          {profile.unmarriedSisters || 0} Unmarried Sis
                        </span>
                      </div>
                    </div>
                    {profile.maternalUnclesName && (
                      <div className="jeevansathi-attr-row">
                        <div className="jeevansathi-attr-icon">
                          <Icon name="sparkles" size={16} />
                        </div>
                        <div className="jeevansathi-attr-content">
                          <span className="jeevansathi-attr-label">
                            Maternal Uncle (मामाजी)
                          </span>
                          <span className="jeevansathi-attr-val">
                            {[
                              profile.maternalUnclesName,
                              profile.maternalUnclesGotra ||
                              profile.maternalUnclesAakna
                                ? `(${profile.maternalUnclesGotra || profile.maternalUnclesAakna})`
                                : "",
                            ]
                              .filter(Boolean)
                              .join(" ")}
                          </span>
                        </div>
                      </div>
                    )}
                  </>
                )}

                {sec.id === "religion" && (
                  <>
                    <div className="jeevansathi-attr-row">
                      <div className="jeevansathi-attr-icon">
                        <Icon name="sparkles" size={16} />
                      </div>
                      <div className="jeevansathi-attr-content">
                        <span className="jeevansathi-attr-label">
                          Gotra (गोत्र)
                        </span>
                        <span className="jeevansathi-attr-val">
                          {profile.gotra || "Not specified"}
                        </span>
                      </div>
                    </div>
                    <div className="jeevansathi-attr-row">
                      <div className="jeevansathi-attr-icon">
                        <Icon name="map-pin" size={16} />
                      </div>
                      <div className="jeevansathi-attr-content">
                        <span className="jeevansathi-attr-label">
                          Birth City / Place of Birth (जन्म शहर)
                        </span>
                        <span className="jeevansathi-attr-val">
                          {profile.placeOfBirth ||
                            profile.birthCity ||
                            "Not specified"}
                        </span>
                      </div>
                    </div>
                    <div className="jeevansathi-attr-row">
                      <div className="jeevansathi-attr-icon">
                        <Icon name="clock" size={16} />
                      </div>
                      <div className="jeevansathi-attr-content">
                        <span className="jeevansathi-attr-label">
                          Time of Birth (जन्म समय)
                        </span>
                        <span className="jeevansathi-attr-val">
                          {profile.timeOfBirth || "Not specified"}
                        </span>
                      </div>
                    </div>
                    <div className="jeevansathi-attr-row">
                      <div className="jeevansathi-attr-icon">
                        <Icon name="sparkles" size={16} />
                      </div>
                      <div className="jeevansathi-attr-content">
                        <span className="jeevansathi-attr-label">Manglik</span>
                        <span className="jeevansathi-attr-val">
                          {formatManglik(profile.manglik) || "Non-Manglik"}
                        </span>
                      </div>
                    </div>
                  </>
                )}

                {sec.id === "partner" && (
                  <div
                    style={{
                      fontSize: "0.92rem",
                      color: "var(--dark-navy)",
                      lineHeight: 1.6,
                    }}
                  >
                    {profile.partnerPreferences ? (
                      <p style={{ margin: 0 }}>{profile.partnerPreferences}</p>
                    ) : (
                      <p style={{ margin: 0, color: "var(--secondary-text)" }}>
                        No partner expectations listed. Tap the edit pencil
                        above to add details.
                      </p>
                    )}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* 5. Embedded Kundali Milan / Horoscope Viewer */}
      {!activeEditingSection && (
        <div style={{ marginTop: "1.5rem" }}>
          <KundaliCard />
        </div>
      )}

      {/* 6. Account Settings Modal (Profile Visibility Toggle) */}
      {showSettingsModal && (
        <div
          className="modal-overlay"
          onClick={() => setShowSettingsModal(false)}
        >
          <div className="modal-card" onClick={(e) => e.stopPropagation()}>
            <button
              type="button"
              className="modal-close-btn"
              onClick={() => setShowSettingsModal(false)}
            >
              ✕
            </button>
            <h3
              style={{
                margin: "0 0 0.25rem",
                fontSize: "1.25rem",
                color: "var(--dark-navy)",
                fontWeight: 800,
              }}
            >
              Account Settings
            </h3>
            <p
              style={{
                margin: "0 0 1.25rem",
                fontSize: "0.85rem",
                color: "var(--secondary-text)",
              }}
            >
              Manage your profile privacy and search visibility
            </p>

            <div className="visibility-toggle-box">
              <div>
                <strong
                  style={{
                    fontSize: "0.92rem",
                    color: "var(--dark-navy)",
                    display: "block",
                    marginBottom: 3,
                  }}
                >
                  Profile Visibility
                </strong>
                <span
                  style={{
                    fontSize: "0.78rem",
                    color: "var(--secondary-text)",
                    lineHeight: 1.4,
                    display: "block",
                  }}
                >
                  {profile.hidden
                    ? "Your profile is currently hidden from search listings."
                    : "Your profile is visible to all verified LOVEWANSHI members."}
                </span>
              </div>
              <button
                type="button"
                className={`toggle-switch-btn ${profile.hidden ? "show-btn" : "hide-btn"}`}
                onClick={handleToggleVisibility}
              >
                {profile.hidden ? "Make Visible" : "Hide Profile"}
              </button>
            </div>

            <div
              style={{
                display: "flex",
                flexDirection: "column",
                gap: "0.75rem",
                borderTop: "1px solid #F3F4F6",
                paddingTop: "1.25rem",
              }}
            >
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  fontSize: "0.88rem",
                }}
              >
                <span style={{ color: "var(--secondary-text)" }}>
                  Member ID
                </span>
                <strong style={{ color: "var(--dark-navy)" }}>{code}</strong>
              </div>
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  fontSize: "0.88rem",
                }}
              >
                <span style={{ color: "var(--secondary-text)" }}>
                  Registered Email
                </span>
                <span style={{ color: "var(--dark-navy)", fontWeight: 600 }}>
                  {profile.email || "--"}
                </span>
              </div>
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  fontSize: "0.88rem",
                }}
              >
                <span style={{ color: "var(--secondary-text)" }}>
                  Registered Phone
                </span>
                <span style={{ color: "var(--dark-navy)", fontWeight: 600 }}>
                  {profile.mobileNo || "--"}
                </span>
              </div>
              <div
                style={{
                  borderTop: "1px solid #F3F4F6",
                  paddingTop: "0.75rem",
                  marginTop: "0.5rem",
                  display: "flex",
                  justifyContent: "space-between",
                }}
              >
                <Link
                  to="/delete-account"
                  style={{
                    color: "#DC2626",
                    fontSize: "0.82rem",
                    textDecoration: "none",
                    fontWeight: 600,
                  }}
                >
                  Delete Account
                </Link>
                <button
                  type="button"
                  onClick={() => setShowSettingsModal(false)}
                  className="btn-connect-primary"
                  style={{ padding: "0.45rem 1.25rem", fontSize: "0.85rem" }}
                >
                  Done
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 7. Membership Plan Modal */}
      {showMembershipModal && (
        <div
          className="modal-overlay"
          onClick={() => setShowMembershipModal(false)}
        >
          <div className="modal-card" onClick={(e) => e.stopPropagation()}>
            <button
              type="button"
              className="modal-close-btn"
              onClick={() => setShowMembershipModal(false)}
            >
              ✕
            </button>
            <div style={{ textAlign: "center", marginBottom: "1.25rem" }}>
              <div
                style={{
                  width: 52,
                  height: 52,
                  borderRadius: "50%",
                  background: "#FEF3C7",
                  color: "#D97706",
                  display: "inline-flex",
                  alignItems: "center",
                  justifyContent: "center",
                  marginBottom: "0.75rem",
                }}
              >
                <Icon name="award" size={28} />
              </div>
              <h3
                style={{
                  margin: "0 0 0.25rem",
                  fontSize: "1.3rem",
                  color: "var(--dark-navy)",
                  fontWeight: 800,
                }}
              >
                Lovewanshi Parinay Community Membership
              </h3>
              <span
                style={{
                  background: "#ECFDF5",
                  color: "#065F46",
                  border: "1px solid #A7F3D0",
                  padding: "2px 10px",
                  borderRadius: "var(--radius-pill)",
                  fontSize: "0.78rem",
                  fontWeight: 700,
                }}
              >
                100% Free Lifetime Community Service ★
              </span>
            </div>

            <div
              style={{
                display: "flex",
                flexDirection: "column",
                gap: "0.75rem",
                marginBottom: "1.5rem",
              }}
            >
              <div
                style={{
                  display: "flex",
                  gap: "0.6rem",
                  alignItems: "flex-start",
                  fontSize: "0.88rem",
                }}
              >
                <span style={{ color: "#166534", fontWeight: 800 }}>✓</span>
                <span>
                  Unlimited profile browsing across all 20 LOVEWANSHI Gotras
                </span>
              </div>
              <div
                style={{
                  display: "flex",
                  gap: "0.6rem",
                  alignItems: "flex-start",
                  fontSize: "0.88rem",
                }}
              >
                <span style={{ color: "#166534", fontWeight: 800 }}>✓</span>
                <span>Free Vedic Kundali Milan and 36 Guna scoring</span>
              </div>
              <div
                style={{
                  display: "flex",
                  gap: "0.6rem",
                  alignItems: "flex-start",
                  fontSize: "0.88rem",
                }}
              >
                <span style={{ color: "#166534", fontWeight: 800 }}>✓</span>
                <span>
                  Direct phone & family contact access upon connection
                  acceptance
                </span>
              </div>
              <div
                style={{
                  display: "flex",
                  gap: "0.6rem",
                  alignItems: "flex-start",
                  fontSize: "0.88rem",
                }}
              >
                <span style={{ color: "#166534", fontWeight: 800 }}>✓</span>
                <span>
                  Unlimited printable matrimonial biodata PDF downloads
                </span>
              </div>
              <div
                style={{
                  display: "flex",
                  gap: "0.6rem",
                  alignItems: "flex-start",
                  fontSize: "0.88rem",
                }}
              >
                <span style={{ color: "#166534", fontWeight: 800 }}>✓</span>
                <span>Photo studio with high-resolution image uploads</span>
              </div>
            </div>

            <button
              type="button"
              className="btn-connect-primary"
              style={{
                width: "100%",
                justifyContent: "center",
                padding: "0.75rem 1rem",
              }}
              onClick={() => setShowMembershipModal(false)}
            >
              Great, Got It!
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

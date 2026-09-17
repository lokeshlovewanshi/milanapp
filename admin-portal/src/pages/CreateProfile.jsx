import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
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

export default function CreateProfile() {
  const navigate = useNavigate();
  const { list } = useReference();
  const { states } = useLocations();

  // Basic Account Credentials
  const [name, setName] = useState("");
  const [mobileNo, setMobileNo] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [profileCreatedBy, setProfileCreatedBy] = useState("PARENTS");

  // Personal
  const [gender, setGender] = useState("MALE");
  const [maritalStatus, setMaritalStatus] = useState("NEVER_MARRIED");
  const [dateOfBirth, setDateOfBirth] = useState("");
  const [height, setHeight] = useState("H_66");
  const [weight, setWeight] = useState("");
  const [complexion, setComplexion] = useState("FAIR");
  const [diet, setDiet] = useState("VEG");
  const [bloodGroup, setBloodGroup] = useState("");
  const [motherTongue, setMotherTongue] = useState("HINDI");
  const [disability, setDisability] = useState("NONE");

  // Location
  const [country, setCountry] = useState("India");
  const [state, setState] = useState("Madhya Pradesh");
  const [city, setCity] = useState("");
  const [town, setTown] = useState("");
  const [presentAddress, setPresentAddress] = useState("");
  const [permanentAddress, setPermanentAddress] = useState("");

  // Contact
  const [whatsappNo, setWhatsappNo] = useState("");
  const [fathersContactNo, setFathersContactNo] = useState("");

  // Religion & Astrology
  const [gotra, setGotra] = useState("Katheriya");
  const [manglik, setManglik] = useState("NO");
  const [timeOfBirth, setTimeOfBirth] = useState("");
  const [placeOfBirth, setPlaceOfBirth] = useState("");
  const [zodiac, setZodiac] = useState("");
  const [nakshatra, setNakshatra] = useState("");

  // Family
  const [fathersName, setFathersName] = useState("");
  const [fathersOccupation, setFathersOccupation] = useState("");
  const [mothersName, setMothersName] = useState("");
  const [mothersOccupation, setMothersOccupation] = useState("");
  const [marriedBrothers, setMarriedBrothers] = useState("");
  const [unmarriedBrothers, setUnmarriedBrothers] = useState("");
  const [marriedSisters, setMarriedSisters] = useState("");
  const [unmarriedSisters, setUnmarriedSisters] = useState("");
  const [maternalUnclesName, setMaternalUnclesName] = useState("");
  const [maternalUnclesGotra, setMaternalUnclesGotra] = useState("");

  // Education & Career
  const [education, setEducation] = useState("BE_BTECH");
  const [educationDetails, setEducationDetails] = useState("");
  const [profession, setProfession] = useState("SOFTWARE_ENGINEER");
  const [employedIn, setEmployedIn] = useState("PRIVATE");
  const [organization, setOrganization] = useState("");
  const [annualIncome, setAnnualIncome] = useState("INR_10_15");
  const [workCity, setWorkCity] = useState("");

  // Assets
  const [houseStatus, setHouseStatus] = useState("OWNED");
  const [carStatus, setCarStatus] = useState("OWNED");

  // About
  const [aboutMyself, setAboutMyself] = useState("");
  const [partnerPreferences, setPartnerPreferences] = useState("");

  // Photo uploads
  const [selectedPhotos, setSelectedPhotos] = useState([]);
  const [photoPreviews, setPhotoPreviews] = useState([]);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  function handlePhotoSelect(e) {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;

    setSelectedPhotos((prev) => [...prev, ...files]);

    const newPreviews = files.map((file) => URL.createObjectURL(file));
    setPhotoPreviews((prev) => [...prev, ...newPreviews]);
  }

  function handleRemovePhoto(index) {
    setSelectedPhotos((prev) => prev.filter((_, i) => i !== index));
    setPhotoPreviews((prev) => {
      URL.revokeObjectURL(prev[index]);
      return prev.filter((_, i) => i !== index);
    });
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (!name.trim()) {
      setError("Member name is required.");
      return;
    }
    if (!mobileNo.trim()) {
      setError("Mobile number is required.");
      return;
    }

    setLoading(true);
    setError(null);

    const payload = {
      name: name.trim(),
      mobileNo: mobileNo.trim(),
      email: email.trim() || null,
      password: password.trim() || null,
      profileCreatedBy,
      gender,
      maritalStatus,
      dateOfBirth: dateOfBirth ? `${dateOfBirth}T00:00:00` : null,
      height,
      weight: weight ? Number(weight) : null,
      complexion,
      diet,
      bloodGroup: bloodGroup || null,
      motherTongue,
      disability: disability.trim() || null,
      country: country.trim() || "India",
      state,
      city: city.trim() || null,
      town: town.trim() || null,
      presentAddress: presentAddress.trim() || null,
      permanentAddress: permanentAddress.trim() || null,
      whatsappNo: whatsappNo.trim() || null,
      fathersContactNo: fathersContactNo.trim() || null,
      gotra,
      manglik,
      timeOfBirth: timeOfBirth.trim() || null,
      placeOfBirth: placeOfBirth.trim() || null,
      zodiac: zodiac || null,
      nakshatra: nakshatra || null,
      fathersName: fathersName.trim() || null,
      fathersOccupation: fathersOccupation.trim() || null,
      mothersName: mothersName.trim() || null,
      mothersOccupation: mothersOccupation.trim() || null,
      marriedBrothers: marriedBrothers ? Number(marriedBrothers) : null,
      unmarriedBrothers: unmarriedBrothers ? Number(unmarriedBrothers) : null,
      marriedSisters: marriedSisters ? Number(marriedSisters) : null,
      unmarriedSisters: unmarriedSisters ? Number(unmarriedSisters) : null,
      maternalUnclesName: maternalUnclesName.trim() || null,
      maternalUnclesGotra: maternalUnclesGotra.trim() || null,
      education,
      educationDetails: educationDetails.trim() || null,
      profession,
      employedIn,
      organization: organization.trim() || null,
      annualIncome,
      workCity: workCity.trim() || null,
      houseStatus,
      carStatus,
      aboutMyself: aboutMyself.trim() || null,
      partnerPreferences: partnerPreferences.trim() || null,
      verified: true, // created directly by admin
    };

    try {
      const created = await api.createProfile(payload);
      const newId = created.id;

      // If photos were selected, upload them now
      if (selectedPhotos.length > 0) {
        for (const photoFile of selectedPhotos) {
          try {
            await api.uploadProfilePhoto(newId, photoFile);
          } catch (uploadErr) {
            console.warn("Photo upload failed:", uploadErr);
          }
        }
      }

      navigate(`/profiles/${newId}`);
    } catch (err) {
      setError(err?.message || "Failed to create profile on behalf of user.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{ maxWidth: "880px", margin: "0 auto" }}>
    <div style={{ maxWidth: "880px", margin: "0 auto", width: "100%" }}>
      <div style={{ marginBottom: "1rem" }}>
        <Link to="/queue" className="back-link">
          &larr; Back to Verification Queue
        </Link>
      </div>

      <div className="card" style={{ padding: "2rem" }}>
      <div className="card">
        <div
          style={{
            borderBottom: "1px solid #E5E7EB",
            paddingBottom: "1rem",
            marginBottom: "1.5rem",
          }}
        >
          <h1 style={{ margin: "0 0 0.4rem 0" }}>
            ➕ Create Profile on Behalf of User
          </h1>
          <p className="muted" style={{ margin: 0 }}>
            Create and verify a new matrimonial candidate profile. All dropdown
            values are standardized with the member portal.
          </p>
        </div>

        {error && (
          <div className="error-banner" style={{ marginBottom: "1.5rem" }}>
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          {/* Section 1: Account / Credentials */}
          <fieldset className="edit-section" style={{ marginBottom: "1.5rem" }}>
            <legend>1. Account &amp; Identity</legend>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr",
                gap: "1rem",
              }}
            >
            <div className="form-grid">
              <label>
                Full Name <span style={{ color: "#DC2626" }}>*</span>
                <input
                  type="text"
                  placeholder="Candidate Full Name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                />
              </label>

              <label>
                Mobile Number <span style={{ color: "#DC2626" }}>*</span>
                <input
                  type="tel"
                  placeholder="10-digit mobile number"
                  value={mobileNo}
                  onChange={(e) => setMobileNo(e.target.value)}
                  required
                />
              </label>

              <label>
                Email Address (Optional)
                <input
                  type="email"
                  placeholder="Leave empty to auto-generate"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </label>

              <label>
                Initial Password (Optional)
                <input
                  type="text"
                  placeholder="Defaults to Lovewanshi@2026"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
              </label>

              <label>
                Profile Created By
                <select
                  value={profileCreatedBy}
                  onChange={(e) => setProfileCreatedBy(e.target.value)}
                >
                  {list("profile_created_by").map((opt) => (
                    <option key={opt.code} value={opt.code}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              </label>
            </div>
          </fieldset>

          {/* Section 2: Photo Upload */}
          <fieldset className="edit-section" style={{ marginBottom: "1.5rem" }}>
            <legend>2. Candidate Photos</legend>
            <p className="muted small" style={{ margin: "0 0 0.75rem 0" }}>
              Select one or multiple photos. The first photo will be
              automatically set as the primary profile photo.
            </p>

            <input
              type="file"
              accept="image/*"
              multiple
              onChange={handlePhotoSelect}
              style={{ marginBottom: "0.75rem" }}
            />

            {photoPreviews.length > 0 && (
              <div
                style={{
                  display: "flex",
                  gap: "0.75rem",
                  flexWrap: "wrap",
                  marginTop: "0.5rem",
                }}
              >
                {photoPreviews.map((src, i) => (
                  <div key={i} style={{ position: "relative" }}>
                    <img
                      src={src}
                      alt=""
                      style={{
                        width: "90px",
                        height: "90px",
                        objectFit: "cover",
                        borderRadius: "8px",
                        border: "1px solid #D1D5DB",
                      }}
                    />
                    {i === 0 && (
                      <span
                        style={{
                          position: "absolute",
                          bottom: "4px",
                          left: "4px",
                          background: "#047857",
                          color: "white",
                          fontSize: "10px",
                          fontWeight: "bold",
                          padding: "1px 5px",
                          borderRadius: "4px",
                        }}
                      >
                        Primary
                      </span>
                    )}
                    <button
                      type="button"
                      onClick={() => handleRemovePhoto(i)}
                      style={{
                        position: "absolute",
                        top: "-6px",
                        right: "-6px",
                        background: "#DC2626",
                        color: "white",
                        borderRadius: "50%",
                        width: "20px",
                        height: "20px",
                        padding: 0,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        fontSize: "11px",
                        cursor: "pointer",
                      }}
                    >
                      ✕
                    </button>
                  </div>
                ))}
              </div>
            )}
          </fieldset>

          {/* Section 3: Personal Details */}
          <fieldset className="edit-section" style={{ marginBottom: "1.5rem" }}>
            <legend>3. Personal Details</legend>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr",
                gap: "1rem",
              }}
            >
            <div className="form-grid">
              <label>
                Gender <span style={{ color: "#DC2626" }}>*</span>
                <select
                  value={gender}
                  onChange={(e) => setGender(e.target.value)}
                >
                  {list("gender").map((opt) => (
                    <option key={opt.code} value={opt.code}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              </label>

              <label>
                Marital Status <span style={{ color: "#DC2626" }}>*</span>
                <select
                  value={maritalStatus}
                  onChange={(e) => setMaritalStatus(e.target.value)}
                >
                  {list("marital_status").map((opt) => (
                    <option key={opt.code} value={opt.code}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              </label>

              <label>
                Date of Birth
                <input
                  type="date"
                  value={dateOfBirth}
                  onChange={(e) => setDateOfBirth(e.target.value)}
                />
              </label>

              <label>
                Height (Decoded)
                <select
                  value={height}
                  onChange={(e) => setHeight(e.target.value)}
                >
                  {list("height").map((opt) => (
                    <option key={opt.code} value={opt.code}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              </label>

              <label>
                Weight (kg)
                <input
                  type="number"
                  placeholder="e.g. 65"
                  value={weight}
                  onChange={(e) => setWeight(e.target.value)}
                />
              </label>

              <label>
                Complexion
                <select
                  value={complexion}
                  onChange={(e) => setComplexion(e.target.value)}
                >
                  {list("complexion").map((opt) => (
                    <option key={opt.code} value={opt.code}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              </label>

              <label>
                Diet
                <select value={diet} onChange={(e) => setDiet(e.target.value)}>
                  {list("diet").map((opt) => (
                    <option key={opt.code} value={opt.code}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              </label>

              <label>
                Blood Group
                <select
                  value={bloodGroup}
                  onChange={(e) => setBloodGroup(e.target.value)}
                >
                  <option value="">-- Select Blood Group --</option>
                  {list("blood_group").map((opt) => (
                    <option key={opt.code} value={opt.code}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              </label>

              <label>
                Mother Tongue
                <select
                  value={motherTongue}
                  onChange={(e) => setMotherTongue(e.target.value)}
                >
                  {list("mother_tongue").map((opt) => (
                    <option key={opt.code} value={opt.code}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              </label>

              <label>
                Disability / Special Needs
                <select
                  value={disability}
                  onChange={(e) => setDisability(e.target.value)}
                >
                  {list("disability").map((opt) => (
                    <option key={opt.code} value={opt.code}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              </label>
            </div>
          </fieldset>

          {/* Section 4: Location & Contact */}
          <fieldset className="edit-section" style={{ marginBottom: "1.5rem" }}>
            <legend>4. Location &amp; Contact</legend>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr",
                gap: "1rem",
              }}
            >
            <div className="form-grid">
              <label>
                State
                <select
                  value={state}
                  onChange={(e) => setState(e.target.value)}
                >
                  {states.map((opt) => {
                    const code = opt.code || opt.name;
                    const label = opt.label || opt.name;
                    return (
                      <option key={code} value={code}>
                        {label}
                      </option>
                    );
                  })}
                </select>
              </label>

              <label>
                City
                <input
                  type="text"
                  placeholder="e.g. Jhansi"
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                />
              </label>

              <label>
                Town / Native Place (मूल निवास)
                <input
                  type="text"
                  placeholder="e.g. Mauranipur"
                  value={town}
                  onChange={(e) => setTown(e.target.value)}
                />
              </label>

              <label>
                Country
                <input
                  type="text"
                  value={country}
                  onChange={(e) => setCountry(e.target.value)}
                />
              </label>

              <label>
                WhatsApp Number
                <input
                  type="tel"
                  placeholder="WhatsApp No"
                  value={whatsappNo}
                  onChange={(e) => setWhatsappNo(e.target.value)}
                />
              </label>

              <label>
                Father's / Guardian Contact No
                <input
                  type="tel"
                  placeholder="Father's Contact"
                  value={fathersContactNo}
                  onChange={(e) => setFathersContactNo(e.target.value)}
                />
              </label>

              <label style={{ gridColumn: "1 / -1" }}>
                Present Address
                <textarea
                  rows={2}
                  value={presentAddress}
                  onChange={(e) => setPresentAddress(e.target.value)}
                />
              </label>

              <label style={{ gridColumn: "1 / -1" }}>
                Permanent Address
                <textarea
                  rows={2}
                  value={permanentAddress}
                  onChange={(e) => setPermanentAddress(e.target.value)}
                />
              </label>
            </div>
          </fieldset>

          {/* Section 5: Religion & Astrology */}
          <fieldset className="edit-section" style={{ marginBottom: "1.5rem" }}>
            <legend>5. Religion &amp; Astrology</legend>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr",
                gap: "1rem",
              }}
            >
            <div className="form-grid">
              <label>
                Gotra
                <select
                  value={gotra}
                  onChange={(e) => setGotra(e.target.value)}
                >
                  {list("gotra").map((opt) => (
                    <option key={opt.code} value={opt.code}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              </label>

              <label>
                Manglik Status
                <select
                  value={manglik}
                  onChange={(e) => setManglik(e.target.value)}
                >
                  {list("manglik").map((opt) => (
                    <option key={opt.code} value={opt.code}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              </label>

              <label>
                Zodiac / Rashi (राशि)
                <select
                  value={zodiac}
                  onChange={(e) => setZodiac(e.target.value)}
                >
                  <option value="">-- Select Rashi --</option>
                  {list("rashi").map((opt) => (
                    <option key={opt.code} value={opt.code}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              </label>

              <label>
                Nakshatra (नक्षत्र)
                <select
                  value={nakshatra}
                  onChange={(e) => setNakshatra(e.target.value)}
                >
                  <option value="">-- Select Nakshatra --</option>
                  {list("nakshatra").map((opt) => (
                    <option key={opt.code} value={opt.code}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              </label>

              <label>
                Time of Birth
                <input
                  type="time"
                  value={timeOfBirth}
                  onChange={(e) => setTimeOfBirth(e.target.value)}
                />
              </label>

              <label>
                Place of Birth (City)
                <input
                  type="text"
                  placeholder="Birth City"
                  value={placeOfBirth}
                  onChange={(e) => setPlaceOfBirth(e.target.value)}
                />
              </label>
            </div>
          </fieldset>

          {/* Section 6: Education & Career */}
          <fieldset className="edit-section" style={{ marginBottom: "1.5rem" }}>
            <legend>6. Education &amp; Career</legend>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr",
                gap: "1rem",
              }}
            >
            <div className="form-grid">
              <label>
                Highest Education
                <select
                  value={education}
                  onChange={(e) => setEducation(e.target.value)}
                >
                  {list("education").map((opt) => (
                    <option key={opt.code} value={opt.code}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              </label>

              <label>
                Education Details (College / Stream)
                <input
                  type="text"
                  placeholder="e.g. B.Tech in CS"
                  value={educationDetails}
                  onChange={(e) => setEducationDetails(e.target.value)}
                />
              </label>

              <label>
                Profession
                <select
                  value={profession}
                  onChange={(e) => setProfession(e.target.value)}
                >
                  {list("profession").map((opt) => (
                    <option key={opt.code} value={opt.code}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              </label>

              <label>
                Employed In
                <select
                  value={employedIn}
                  onChange={(e) => setEmployedIn(e.target.value)}
                >
                  {list("employed_in").map((opt) => (
                    <option key={opt.code} value={opt.code}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              </label>

              <label>
                Organization / Company
                <input
                  type="text"
                  placeholder="e.g. TCS"
                  value={organization}
                  onChange={(e) => setOrganization(e.target.value)}
                />
              </label>

              <label>
                Annual Income
                <select
                  value={annualIncome}
                  onChange={(e) => setAnnualIncome(e.target.value)}
                >
                  {list("annual_income").map((opt) => (
                    <option key={opt.code} value={opt.code}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              </label>

              <label>
                Work Location / City
                <input
                  type="text"
                  placeholder="e.g. Bengaluru"
                  value={workCity}
                  onChange={(e) => setWorkCity(e.target.value)}
                />
              </label>
            </div>
          </fieldset>

          {/* Section 7: Family Details & Assets */}
          <fieldset className="edit-section" style={{ marginBottom: "1.5rem" }}>
            <legend>7. Family &amp; Assets</legend>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr",
                gap: "1rem",
              }}
            >
            <div className="form-grid">
              <label>
                Father's Name
                <input
                  type="text"
                  value={fathersName}
                  onChange={(e) => setFathersName(e.target.value)}
                />
              </label>

              <label>
                Father's Occupation
                <select
                  value={fathersOccupation}
                  onChange={(e) => setFathersOccupation(e.target.value)}
                >
                  <option value="">-- Select Father's Occupation --</option>
                  {list("profession").map((opt) => (
                    <option key={opt.code} value={opt.code}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              </label>

              <label>
                Mother's Name
                <input
                  type="text"
                  value={mothersName}
                  onChange={(e) => setMothersName(e.target.value)}
                />
              </label>

              <label>
                Mother's Occupation
                <select
                  value={mothersOccupation}
                  onChange={(e) => setMothersOccupation(e.target.value)}
                >
                  <option value="">-- Select Mother's Occupation --</option>
                  {list("profession").map((opt) => (
                    <option key={opt.code} value={opt.code}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              </label>

              <label>
                Married Brothers
                <input
                  type="number"
                  min="0"
                  value={marriedBrothers}
                  onChange={(e) => setMarriedBrothers(e.target.value)}
                />
              </label>

              <label>
                Unmarried Brothers
                <input
                  type="number"
                  min="0"
                  value={unmarriedBrothers}
                  onChange={(e) => setUnmarriedBrothers(e.target.value)}
                />
              </label>

              <label>
                Married Sisters
                <input
                  type="number"
                  min="0"
                  value={marriedSisters}
                  onChange={(e) => setMarriedSisters(e.target.value)}
                />
              </label>

              <label>
                Unmarried Sisters
                <input
                  type="number"
                  min="0"
                  value={unmarriedSisters}
                  onChange={(e) => setUnmarriedSisters(e.target.value)}
                />
              </label>

              <label>
                Maternal Uncle's Name (मामाजी)
                <input
                  type="text"
                  value={maternalUnclesName}
                  onChange={(e) => setMaternalUnclesName(e.target.value)}
                />
              </label>

              <label>
                Uncle's Gotra
                <input
                  type="text"
                  value={maternalUnclesGotra}
                  onChange={(e) => setMaternalUnclesGotra(e.target.value)}
                />
              </label>

              <label>
                House Status
                <select
                  value={houseStatus}
                  onChange={(e) => setHouseStatus(e.target.value)}
                >
                  {list("house_status").map((opt) => (
                    <option key={opt.code} value={opt.code}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              </label>

              <label>
                Car Status
                <select
                  value={carStatus}
                  onChange={(e) => setCarStatus(e.target.value)}
                >
                  {list("car_status").map((opt) => (
                    <option key={opt.code} value={opt.code}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              </label>
            </div>
          </fieldset>

          {/* Section 8: About & Expectations */}
          <fieldset className="edit-section" style={{ marginBottom: "2rem" }}>
            <legend>8. About &amp; Expectations</legend>
            <div
              style={{ display: "flex", flexDirection: "column", gap: "1rem" }}
            >
              <label>
                About Myself
                <textarea
                  rows={3}
                  placeholder="Candidate bio, interests, personality..."
                  value={aboutMyself}
                  onChange={(e) => setAboutMyself(e.target.value)}
                />
              </label>

              <label>
                Partner Preferences
                <textarea
                  rows={3}
                  placeholder="Candidate expectations for life partner..."
                  value={partnerPreferences}
                  onChange={(e) => setPartnerPreferences(e.target.value)}
                />
              </label>
            </div>
          </fieldset>

          <div
            style={{ display: "flex", gap: "1rem", justifyContent: "flex-end" }}
          >
            <Link to="/queue">
              <button type="button" className="secondary" disabled={loading}>
                Cancel
              </button>
            </Link>
            <button
              type="submit"
              className="primary"
              disabled={loading || !name.trim() || !mobileNo.trim()}
              style={{ padding: "0.75rem 2rem", fontSize: "1rem" }}
            >
              {loading
                ? "Creating Profile & Uploading Photos..."
                : "🚀 Create Profile Now"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

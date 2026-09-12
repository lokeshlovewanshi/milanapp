import React, { useEffect, useState } from "react";
import { profileAPI } from "../api";
import { Icon } from "../components/Icons";
import KundaliCard from "../components/KundaliCard";

export default function Kundali() {
  const [values, setValues] = useState({
    dateOfBirth: "",
    timeOfBirth: "",
    placeOfBirth: "",
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    Promise.all([profileAPI.getBasicInfo().catch(() => null), profileAPI.getReligionInfo().catch(() => null)])
      .then(([basic, religion]) => {
        const bData = basic || {};
        const rData = religion || {};
        setValues({
          dateOfBirth: bData.dateOfBirth ? String(bData.dateOfBirth).slice(0, 10) : "",
          timeOfBirth: rData.timeOfBirth || "",
          placeOfBirth: rData.placeOfBirth || rData.birthCity || rData.cityOfBirth || "",
        });
      })
      .finally(() => setLoading(false));
  }, []);

  async function handleSave(e) {
    e.preventDefault();
    setSaving(true);
    setError("");
    setSuccess(false);

    try {
      await Promise.all([
        profileAPI.updateBasicInfo({
          dateOfBirth: values.dateOfBirth ? `${values.dateOfBirth}T00:00:00` : null,
        }),
        profileAPI.updateReligionInfo({
          timeOfBirth: values.timeOfBirth || null,
          placeOfBirth: values.placeOfBirth || null,
          birthCity: values.placeOfBirth || null,
        }),
      ]);

      try {
        await profileAPI.generateKundali();
      } catch {
        // Swallowed if chart generation has minor warning
      }

      setSuccess(true);
    } catch (err) {
      setError(err?.message || "Could not save birth details. Please check values and try again.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="content-narrow">
      <div className="section-header-simple" style={{ marginBottom: "1.5rem" }}>
        <h1 className="detail-profile-name" style={{ fontSize: "1.8rem" }}>
          Kundali (जन्म कुंडली)
        </h1>
        <p className="muted">
          Your Vedic horoscope chart is calculated from your exact date, time, and place of birth.
        </p>
      </div>

      {/* Embedded Chart Card */}
      <KundaliCard />

      {/* Birth Details Form */}
      <div className="card" style={{ marginTop: "1.5rem" }}>
        <h3 style={{ margin: "0 0 1rem", fontSize: "1.15rem", color: "var(--auth-maroon)" }}>
          Birth Details (जन्म विवरण)
        </h3>

        <form onSubmit={handleSave} style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
          <label>
            <span>Date of Birth (जन्म तिथि)</span>
            <input
              type="date"
              required
              value={values.dateOfBirth}
              onChange={(e) => setValues({ ...values, dateOfBirth: e.target.value })}
            />
          </label>

          <label>
            <span>Time of Birth (जन्म समय)</span>
            <input
              type="text"
              placeholder="e.g. 05:30 AM or 14:45"
              value={values.timeOfBirth}
              onChange={(e) => setValues({ ...values, timeOfBirth: e.target.value })}
            />
          </label>

          <label>
            <span>Place of Birth (जन्म स्थान / शहर)</span>
            <input
              type="text"
              placeholder="e.g. Gwalior, Jhansi, Bhopal, Indore"
              value={values.placeOfBirth}
              onChange={(e) => setValues({ ...values, placeOfBirth: e.target.value })}
            />
          </label>

          {error && <div className="error">{error}</div>}
          {success && (
            <div style={{ color: "var(--success)", background: "#ECFDF5", padding: "0.6rem 0.85rem", borderRadius: 8, fontSize: "0.88rem", fontWeight: 600 }}>
              Birth details saved & Kundali updated!
            </div>
          )}

          <button type="submit" disabled={saving || loading}>
            <Icon name="sparkles" size={16} />
            <span>{saving ? "Saving & Generating..." : "Save & Generate Chart / बनाएं"}</span>
          </button>
        </form>
      </div>
    </div>
  );
}

import React, { useEffect, useState } from "react";
import { profileAPI } from "../api";
import { Icon } from "./Icons";
import kundaliIcon from "../assets/kundali-icon.png";

export default function KundaliCard() {
  const [chart, setChart] = useState(null);
  const [loading, setLoading] = useState(false);
  const [checking, setChecking] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let alive = true;
    profileAPI
      .getKundali()
      .then((res) => {
        if (alive && res?.svg) setChart(res);
      })
      .catch(() => {})
      .finally(() => {
        if (alive) setChecking(false);
      });
    return () => {
      alive = false;
    };
  }, []);

  async function generate() {
    setLoading(true);
    setError(null);
    try {
      const res = await profileAPI.generateKundali();
      setChart(res);
    } catch (e) {
      setError(e?.message || "Could not generate your kundali. Please ensure birth date, time, and city are filled in your profile.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="kundali-card-container">
      <div className="kundali-card-head">
        <img src={kundaliIcon} alt="Kundali" className="kundali-head-icon" />
        <div>
          <h3 className="kundali-head-title">Kundali (जन्म कुंडली)</h3>
          <p className="kundali-head-subtitle">
            North Indian Vedic birth chart calculated from your date, time and place of birth
          </p>
        </div>
      </div>

      {checking ? (
        <div className="kundali-loading">
          <p className="muted">Checking birth chart...</p>
        </div>
      ) : chart?.svg ? (
        <div className="kundali-chart-view">
          <div
            className="kundali-svg-wrap"
            dangerouslySetInnerHTML={{ __html: chart.svg }}
          />

          <div className="kundali-facts-grid">
            {chart.ascendant?.rashi && (
              <div className="kundali-fact">
                <span className="fact-label">Lagna (लग्न)</span>
                <span className="fact-val">{chart.ascendant.rashi}</span>
              </div>
            )}
            {chart.moon_sign && (
              <div className="kundali-fact">
                <span className="fact-label">Rashi (राशि)</span>
                <span className="fact-val">{chart.moon_sign}</span>
              </div>
            )}
            {chart.nakshatra && (
              <div className="kundali-fact">
                <span className="fact-label">Nakshatra (नक्षत्र)</span>
                <span className="fact-val">
                  {chart.nakshatra} {chart.nakshatra_pada ? `(${chart.nakshatra_pada})` : ""}
                </span>
              </div>
            )}
            <div className="kundali-fact">
              <span className="fact-label">Manglik (मांगलिक)</span>
              <span className={`fact-val ${chart.manglik ? "manglik-yes" : ""}`}>
                {chart.manglik ? "Yes (मांगलिक)" : "No (गैर-मांगलिक)"}
              </span>
            </div>
          </div>

          {chart.manglik_rule && <p className="kundali-rule-note">{chart.manglik_rule}</p>}

          <button type="button" className="secondary small" style={{ marginTop: "1rem" }} onClick={generate} disabled={loading}>
            {loading ? "Regenerating..." : "Regenerate Chart"}
          </button>
        </div>
      ) : (
        <div className="kundali-action-view">
          {error && <div className="kundali-error-box">{error}</div>}

          <button type="button" className="btn-primary" onClick={generate} disabled={loading}>
            <Icon name="sparkles" size={16} />
            <span>{loading ? "Generating your chart..." : "Generate Kundali Chart"}</span>
          </button>
        </div>
      )}
    </div>
  );
}

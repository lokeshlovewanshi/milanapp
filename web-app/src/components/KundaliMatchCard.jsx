import React, { useState } from "react";
import { profileAPI } from "../api";
import { Icon } from "./Icons";

export default function KundaliMatchCard({ profileId, name = "" }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  async function handleMatch() {
    setLoading(true);
    setError(null);
    try {
      const res = await profileAPI.matchKundali(profileId);
      setData(res);
    } catch (e) {
      setError(
        e?.message ||
          "Could not match kundalis. Please ensure both your profile and this member have birth details filled (Date, Time, Place)."
      );
    } finally {
      setLoading(false);
    }
  }

  const m = data?.match;

  return (
    <div className="kundali-match-card">
      <div className="match-card-head">
        <div className="match-icon-box">
          <Icon name="sparkles" size={18} color="#A5122F" />
        </div>
        <div>
          <h4 className="match-card-title">Kundali Milan (कुंडली मिलान)</h4>
          <p className="match-card-subtitle">
            Ashtakoota 36 Guna Milan & compatibility analysis {name ? `with ${name}` : ""}
          </p>
        </div>
      </div>

      {!m ? (
        <div className="match-action-prompt">
          {error && <div className="match-error-box">{error}</div>}
          <button type="button" className="btn-primary" onClick={handleMatch} disabled={loading}>
            <Icon name="sparkles" size={16} />
            <span>{loading ? "Matching kundalis..." : "Match Kundali / गुण मिलान करें"}</span>
          </button>
        </div>
      ) : (
        <div className="match-result-view">
          <div className="match-score-banner">
            <div className="match-score-primary">
              <span className="match-score-num">{m.score}</span>
              <span className="match-score-total">/ {m.maximum || 36}</span>
            </div>
            <div className="match-verdict-box">
              <span className="match-verdict-title">{m.verdict}</span>
              <span className="match-verdict-pct">{m.percentage}% Compatibility</span>
            </div>
          </div>

          <div className="kootas-grid">
            {(m.kootas || []).map((k) => {
              const pct = (k.score / (k.max || 1)) * 100;
              return (
                <div key={k.name} className="koota-item">
                  <div className="koota-header">
                    <span className="koota-name">{k.name}</span>
                    <span className="koota-score">
                      {k.score}/{k.max}
                    </span>
                  </div>
                  <div className="koota-track">
                    <div
                      className={`koota-fill ${k.score === 0 ? "zero" : ""}`}
                      style={{ width: `${Math.max(pct, 5)}%` }}
                    />
                  </div>
                  {k.detail && <span className="koota-detail">{k.detail}</span>}
                </div>
              );
            })}
          </div>

          {/* Manglik comparison notice */}
          {(data?.theirs?.manglik !== undefined || data?.mine?.manglik !== undefined) && (
            <div className="match-manglik-notice">
              <Icon name="shield-check" size={16} color="#B45309" />
              <span>
                {data?.mine?.manglik && data?.theirs?.manglik
                  ? "Both charts are Manglik."
                  : data?.theirs?.manglik
                  ? `${name || "This member"} is Manglik, you are not.`
                  : data?.mine?.manglik
                  ? `You are Manglik, ${name || "this member"} is not.`
                  : "Neither profile is Manglik."}{" "}
                (Manglik dosha is evaluated separately from the 36 Gunas).
              </span>
            </div>
          )}

          {/* Partner's chart if available */}
          {data?.theirs?.svg && (
            <div className="partner-chart-section">
              <h5 className="partner-chart-title">{name ? `${name}'s Kundali` : "Partner's Kundali"}</h5>
              <div
                className="kundali-svg-wrap mini"
                dangerouslySetInnerHTML={{ __html: data.theirs.svg }}
              />
            </div>
          )}

          {m.note && <p className="match-note">{m.note}</p>}

          <button type="button" className="secondary small" onClick={handleMatch} disabled={loading}>
            {loading ? "Matching..." : "Match Again"}
          </button>
        </div>
      )}
    </div>
  );
}

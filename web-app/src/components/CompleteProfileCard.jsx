import React from "react";
import { Link } from "react-router-dom";
import { Icon } from "./Icons";
import kundaliIcon from "../assets/kundali-icon.png";

export default function CompleteProfileCard({ completion = 0 }) {
  const pct = Math.max(0, Math.min(100, Math.round(completion)));
  const ringSize = 54;
  const stroke = 5;
  const r = (ringSize - stroke) / 2 - 2;
  const circumference = 2 * Math.PI * r;
  const offset = circumference * (1 - pct / 100);

  const benefits = [
    { icon: "shield-check", title: "5X more profile visibility" },
    { icon: "user", title: "Better match recommendations" },
    { icon: "lock", title: "100% safe & privacy secured" },
  ];

  return (
    <div className="complete-profile-card">
      <div className="complete-profile-header">
        <div className="completion-ring-wrap" style={{ width: ringSize, height: ringSize }}>
          <svg width={ringSize} height={ringSize} className="completion-ring-svg">
            <defs>
              <linearGradient id="ringGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#ED4956" />
                <stop offset="100%" stopColor="#A5122F" />
              </linearGradient>
            </defs>
            <circle
              cx={ringSize / 2}
              cy={ringSize / 2}
              r={r}
              stroke="#F5D6DF"
              strokeWidth={stroke}
              fill="none"
            />
            <circle
              cx={ringSize / 2}
              cy={ringSize / 2}
              r={r}
              stroke="url(#ringGrad)"
              strokeWidth={stroke}
              strokeDasharray={circumference}
              strokeDashoffset={offset}
              strokeLinecap="round"
              fill="none"
              transform={`rotate(-90 ${ringSize / 2} ${ringSize / 2})`}
              style={{ transition: "stroke-dashoffset 0.6s ease" }}
            />
          </svg>
          <div className="completion-ring-label">{pct}%</div>
        </div>

        <div className="complete-profile-text">
          <h3 className="complete-profile-title">Complete your profile</h3>
          <p className="complete-profile-subtitle">Add more details to get better matches</p>
        </div>
      </div>

      <div className="benefits-list">
        {benefits.map((b, i) => (
          <div key={i} className="benefit-item">
            <div className="benefit-icon-box">
              <Icon name={b.icon} size={15} color="#ED4956" />
            </div>
            <span className="benefit-title">{b.title}</span>
          </div>
        ))}
      </div>

      <Link to="/me" className="complete-profile-cta">
        <span>Complete Profile / प्रोफ़ाइल बनाएं</span>
        <Icon name="arrow-right" size={16} />
      </Link>

      <Link to="/kundali" className="complete-kundali-card">
        <img src={kundaliIcon} alt="Kundali" className="complete-kundali-img" />
        <div className="complete-kundali-info">
          <span className="kundali-badge">★ Prime Feature</span>
          <h4 className="kundali-title">Generate Your Kundali / कुंडली बनाएं</h4>
          <p className="kundali-subtitle">Find your match with astrology & Ashtakoota Milan</p>
        </div>
        <Icon name="chevron-right" size={20} color="#7B1220" />
      </Link>
    </div>
  );
}

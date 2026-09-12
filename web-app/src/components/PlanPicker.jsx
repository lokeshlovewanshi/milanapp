import React, { useState } from "react";
import { VerifiedBadge, Icon } from "./Icons";
import bronzeMedal from "../assets/medals/bronze.png";
import silverMedal from "../assets/medals/silver.png";
import goldMedal from "../assets/medals/gold.png";

const MEDALS = {
  free: bronzeMedal,
  silver: silverMedal,
  gold: goldMedal,
};

const TIERS = [
  {
    id: "free",
    name: "Free",
    monthly: 0,
    yearly: 0,
    pitch: "Perfect to explore profiles",
    features: [
      "See all profiles",
      "View basic details",
      "Shortlist profiles",
      "Receive requests",
      "Daily recommendations",
    ],
  },
  {
    id: "silver",
    name: "Silver",
    monthly: 499,
    yearly: 333,
    pitch: "Best for active matchmaking",
    features: [
      "Unlimited contact requests",
      "Chat with interested profiles",
      "See who viewed you",
      "5X profile visibility",
      "Priority recommendations",
    ],
  },
  {
    id: "gold",
    name: "Gold",
    monthly: 999,
    yearly: 666,
    pitch: "Maximum visibility and faster matches",
    popular: true,
    features: [
      "Unlimited contact & messaging",
      "Unlimited profile boosts",
      "See phone number (when allowed)",
      "Advanced filters & compatibility score",
      "Free Kundali matching",
      "Priority customer support",
    ],
  },
];

export default function PlanPicker() {
  const [activePlan, setActivePlan] = useState("gold");
  const [msg, setMsg] = useState("");

  function handleSelect(tier) {
    if (tier.id === "free") return;
    setActivePlan(tier.id);
    setMsg(`${tier.name} 12-month membership is active under the Free Launch Offer.`);
    setTimeout(() => setMsg(""), 5000);
  }

  return (
    <div className="plan-picker-section">
      <div className="plan-picker-header">
        <h3 className="section-title">Choose your plan</h3>
        <p className="section-subtitle">Unlock premium features and find your perfect match</p>
      </div>

      <div className="launch-offer-banner">
        <Icon name="gift" size={16} color="#A5122F" />
        <span>Launch offer — every 12-month membership is 100% free right now.</span>
      </div>

      {msg && <div className="plan-success-notice">{msg}</div>}

      <div className="plans-grid">
        {TIERS.map((tier) => {
          const isFree = tier.id === "free";
          const isSelected = activePlan === tier.id;

          return (
            <div key={tier.id} className={`plan-card ${tier.popular ? "popular" : ""} ${isSelected ? "active" : ""}`}>
              {tier.popular && <div className="popular-badge">Most Popular</div>}

              <div className="plan-head">
                <div className="plan-name-wrap">
                  <h4 className="plan-name">{tier.name}</h4>
                  <p className="plan-pitch">{tier.pitch}</p>
                </div>
                <img src={MEDALS[tier.id]} alt={tier.name} className="plan-medal-img" />
              </div>

              <div className="plan-price-row">
                <span className="plan-price">₹0</span>
                <span className="plan-per">/ month</span>
                {!isFree && <span className="plan-struck">₹{tier.monthly} / mo</span>}
              </div>

              <div className="plan-divider" />

              <div className="plan-features">
                {tier.features.map((f, i) => (
                  <div key={i} className="plan-feature-item">
                    <VerifiedBadge size={15} />
                    <span>{f}</span>
                  </div>
                ))}
              </div>

              <div className="plan-action">
                {isFree ? (
                  <button type="button" className="plan-btn active-btn" style={{ cursor: "default" }}>
                    <Icon name="check" size={16} /> Current Plan
                  </button>
                ) : isSelected ? (
                  <button type="button" className="plan-btn active-btn" style={{ cursor: "default" }}>
                    <Icon name="check" size={16} /> Plan Activated
                  </button>
                ) : (
                  <button type="button" className="plan-btn select-btn" onClick={() => handleSelect(tier)}>
                    Get {tier.name} Free
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

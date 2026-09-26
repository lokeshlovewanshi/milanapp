import React from "react";
import { Link } from "react-router-dom";
import { HeartIcon, Icon } from "./Icons";
import authHeroImg from "../assets/auth-hero.jpg";
import SeoFooter from "./SeoFooter";

export default function AuthHero({
  title,
  subtitle,
  titleAccessory,
  tagline = ["Find the one who", "completes your story."],
  backTo,
  children,
}) {
  return (
    <div className="auth-page-wrapper">
      <div className="auth-hero-container">
        {/* Background decoration */}
        <div className="auth-hero-wrap">
          {/* Left Column: Photographic Hero & Brand */}
          <div className="auth-hero-media">
            <div className="auth-hero-photo-wrap">
              <img
                src={authHeroImg}
                alt="Lodha Parinay Couple"
                className="auth-hero-photo"
              />
              <div className="auth-hero-photo-fade" />
            </div>

            <div className="auth-hero-brand">
              {backTo && (
                <Link to={backTo} className="auth-hero-back" title="Go back">
                  <Icon name="chevron-left" size={20} color="#7B1220" />
                </Link>
              )}

              {/* Interlocking wedding rings mark */}
              <div className="auth-rings">
                <div className="auth-ring" />
                <div className="auth-ring auth-ring-overlap" />
              </div>

              <h1 className="auth-brand-title">Forever</h1>
              <h1 className="auth-brand-title">Together</h1>

              <div className="auth-brand-rule">
                <div className="auth-rule-line" />
                <HeartIcon filled size={13} color="#D98A86" />
                <div className="auth-rule-line" />
              </div>

              <div className="auth-tagline">
                <p>{tagline[0]}</p>
                <p>{tagline[1]}</p>
              </div>
            </div>
          </div>

          {/* Right Column: Form Card */}
          <div className="auth-form-column">
            <div className="auth-card">
              {backTo && (
                <div className="auth-mobile-back">
                  <Link to={backTo}>
                    <Icon name="arrow-left" size={18} /> Back
                  </Link>
                </div>
              )}

              <div className="auth-card-header">
                <h2 className="auth-card-title">
                  {title}{" "}
                  {titleAccessory || (
                    <HeartIcon filled size={20} color="#A5122F" />
                  )}
                </h2>
                {subtitle && <p className="auth-card-subtitle">{subtitle}</p>}
              </div>

              {children}
            </div>
          </div>
        </div>
      </div>

      {/* Indexable SEO Footer & FAQ Section */}
      <SeoFooter />
    </div>
  );
}

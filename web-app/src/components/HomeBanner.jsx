import React from "react";
import { HeartIcon } from "./Icons";
import authHeroImg from "../assets/auth-hero.jpg";

export default function HomeBanner() {
  return (
    <div className="home-banner-card">
      <div className="home-banner-photo-wrap">
        <img src={authHeroImg} alt="Gahoi Parinay" className="home-banner-photo" />
      </div>
      <div className="home-banner-content">
        <div className="banner-rings">
          <div className="banner-ring" />
          <div className="banner-ring banner-ring-overlap" />
        </div>
        <h2 className="banner-wordmark">Forever Together</h2>
        <div className="banner-rule">
          <div className="banner-rule-line" />
          <HeartIcon filled size={11} color="#D98A86" />
          <div className="banner-rule-line" />
        </div>
        <p className="banner-tagline">Find your perfect match in Gahoi community</p>
      </div>
    </div>
  );
}

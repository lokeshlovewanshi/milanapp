import React from "react";

export default function AvatarFallback({ profile = {}, name = "", gender = "", size = 48, glyphSize = 24 }) {
  const pName = name || profile.name || profile.fullName || "";
  const pGender = (gender || profile.gender || "").toUpperCase();
  
  const initials = pName
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0].toUpperCase())
    .join("");

  const bgGrad = pGender === "FEMALE" ? "linear-gradient(135deg, #FDE7EA, #FBE8EA)" : "linear-gradient(135deg, #E0F2FE, #F0F9FF)";
  const textColor = pGender === "FEMALE" ? "#A5122F" : "#0369A1";

  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        minWidth: size,
        minHeight: size,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: bgGrad,
        color: textColor,
        fontWeight: "700",
        fontSize: glyphSize || size * 0.4,
        letterSpacing: "0.5px",
        userSelect: "none",
      }}
    >
      {initials || "GM"}
    </div>
  );
}

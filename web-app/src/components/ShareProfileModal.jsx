import React, { useState, useRef, useEffect } from "react";
import { VerifiedBadge, WhatsAppIcon, Icon } from "./Icons";
import { formatHeight, formatEducation, formatProfession } from "../formatters";

function calculateAge(dob) {
  if (!dob) return null;
  const diff = Date.now() - new Date(dob).getTime();
  const age = Math.floor(diff / (365.25 * 24 * 60 * 60 * 1000));
  return age > 0 && age < 120 ? age : null;
}

function formatProfileCode(id) {
  if (!id) return "";
  const raw = String(id);
  const digits =
    raw.startsWith("JM") || raw.startsWith("GM")
      ? raw.slice(2)
      : raw.padStart(5, "0");
  return `GM${digits}`;
}

// Robust cross-origin image loader that bypasses browser cache collisions
// and wraps octet-stream responses into valid image/jpeg Blobs for untainted canvas rendering
async function loadCandidateImageElement(url) {
  if (!url) return null;

  // 1. Fetch with mode 'cors', credentials 'omit', and cache 'reload' (bypasses non-CORS cached responses)
  try {
    const res = await fetch(url, {
      mode: "cors",
      credentials: "omit",
      cache: "reload",
    });
    if (res.ok) {
      const rawBlob = await res.blob();
      const mime =
        rawBlob.type && rawBlob.type.startsWith("image/")
          ? rawBlob.type
          : "image/jpeg";
      const imageBlob = new Blob([rawBlob], { type: mime });
      const objectUrl = URL.createObjectURL(imageBlob);
      const img = new Image();
      await new Promise((resolve, reject) => {
        img.onload = resolve;
        img.onerror = reject;
        img.src = objectUrl;
      });
      return { img, objectUrl };
    }
  } catch (err) {
    console.warn(
      "loadCandidateImageElement: reload fetch failed, trying standard fetch:",
      err,
    );
  }

  // 2. Standard fetch with mode 'cors'
  try {
    const res = await fetch(url, {
      mode: "cors",
      credentials: "omit",
    });
    if (res.ok) {
      const rawBlob = await res.blob();
      const mime =
        rawBlob.type && rawBlob.type.startsWith("image/")
          ? rawBlob.type
          : "image/jpeg";
      const imageBlob = new Blob([rawBlob], { type: mime });
      const objectUrl = URL.createObjectURL(imageBlob);
      const img = new Image();
      await new Promise((resolve, reject) => {
        img.onload = resolve;
        img.onerror = reject;
        img.src = objectUrl;
      });
      return { img, objectUrl };
    }
  } catch (err) {
    console.warn(
      "loadCandidateImageElement: standard fetch failed, trying direct Image:",
      err,
    );
  }

  // 3. Direct new Image with crossOrigin
  try {
    const img = new Image();
    img.crossOrigin = "anonymous";
    await new Promise((resolve, reject) => {
      img.onload = resolve;
      img.onerror = reject;
      img.src = url;
    });
    return { img, objectUrl: null };
  } catch (err) {
    console.warn("loadCandidateImageElement: direct Image failed:", err);
  }

  return null;
}

export default function ShareProfileModal({ profile, photos = [], onClose }) {
  const [copied, setCopied] = useState(false);
  const [sharing, setSharing] = useState(false);
  const [cardBlob, setCardBlob] = useState(null);
  const [generatingCard, setGeneratingCard] = useState(true);
  const canvasRef = useRef(null);

  const name = profile?.name || "Member";
  const code = formatProfileCode(profile?.id);
  const age = calculateAge(profile?.dateOfBirth);
  const heightStr = formatHeight(profile?.height);
  const educationStr = formatEducation(profile?.education);
  const professionStr = formatProfession(profile?.profession);
  const cityStr = [profile?.city || profile?.town, profile?.state]
    .filter(Boolean)
    .join(", ");
  const gotraStr = profile?.gotra || "LOVEWANSHI";

  const candidatePhotos = Array.from(
    new Set([
      photos[0],
      profile?.profileImage,
      profile?.profileImageFull,
      ...(photos || []),
      ...(profile?.profileImages || []),
      profile?.imageUrl,
      ...(profile?.profileImageDetails || []).map((p) => p?.url),
    ]),
  ).filter(Boolean);

  const primaryPhoto = candidatePhotos[0] || null;
  const shareUrl = `https://www.lovewanshisamaj.in/profiles/${code}`;
  const playStoreUrl =
    "https://play.google.com/store/apps/details?id=com.lovewanshi.jeevanmilansathi";

  // Build clean quick details line
  const quickDetails = [
    heightStr,
    educationStr,
    professionStr,
    profile?.city || profile?.town || "India",
  ]
    .filter(Boolean)
    .join(" • ");

  // Exact proposal message format matching the reference image
  const shareMessage = [
    `Hi 👋 ${name} This Side`,
    `🙏`,
    `🆔 Profile ID: ${code}`,
    `📋 Details: ${quickDetails}`,
    `🌿 Gotra: ${gotraStr}`,
    `🔗 Check my profile:`,
    `${shareUrl}`,
    `Let Me Know After Checking`,
    `& if you don't have the app, download here 👇`,
    `${playStoreUrl}`,
  ].join("\n");

  // Render High-Res Composite Photo Card onto HTML5 Canvas
  useEffect(() => {
    let alive = true;
    let currentObjectUrl = null;

    async function renderCard() {
      setGeneratingCard(true);
      const canvas = canvasRef.current;
      if (!canvas) return;

      const width = 800;
      const height = 1000;
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext("2d");

      // Draw dark background placeholder
      ctx.fillStyle = "#1E293B";
      ctx.fillRect(0, 0, width, height);

      // Attempt to load candidate image using fallback chain
      let loadedResult = null;
      for (const candidateUrl of candidatePhotos) {
        loadedResult = await loadCandidateImageElement(candidateUrl);
        if (loadedResult && loadedResult.img) {
          break;
        }
      }

      if (!alive) {
        if (loadedResult?.objectUrl)
          URL.revokeObjectURL(loadedResult.objectUrl);
        return;
      }

      if (loadedResult && loadedResult.img) {
        currentObjectUrl = loadedResult.objectUrl;
        const img = loadedResult.img;
        const imgW = img.naturalWidth || img.width;
        const imgH = img.naturalHeight || img.height;
        const imgAspect = imgW / imgH;
        const canvasAspect = width / height;
        let renderW, renderH, offsetX, offsetY;

        if (imgAspect > canvasAspect) {
          renderH = height;
          renderW = height * imgAspect;
          offsetX = (width - renderW) / 2;
          offsetY = 0;
        } else {
          renderW = width;
          renderH = width / imgAspect;
          offsetX = 0;
          offsetY = 0; // anchor to top for face
        }

        ctx.drawImage(img, offsetX, offsetY, renderW, renderH);
      } else {
        console.warn(
          "Could not load any candidate photo on canvas, using fallback gradient",
        );
        // Draw elegant gradient background
        const bgGrad = ctx.createLinearGradient(0, 0, width, height);
        bgGrad.addColorStop(0, "#8A1538");
        bgGrad.addColorStop(1, "#1E1B4B");
        ctx.fillStyle = bgGrad;
        ctx.fillRect(0, 0, width, height);
      }

      // 1. Dark bottom gradient overlay for clear contrast
      const grad = ctx.createLinearGradient(0, height - 420, 0, height);
      grad.addColorStop(0, "rgba(0,0,0,0)");
      grad.addColorStop(0.35, "rgba(15, 23, 42, 0.75)");
      grad.addColorStop(1, "rgba(15, 23, 42, 0.96)");
      ctx.fillStyle = grad;
      ctx.fillRect(0, height - 420, width, 420);

      // 2. White Verified Pill Badge
      const badgeY = height - 340;
      ctx.fillStyle = "#FFFFFF";
      ctx.beginPath();
      ctx.roundRect(40, badgeY, 230, 42, 21);
      ctx.fill();

      // Badge blue checkmark icon
      ctx.fillStyle = "#2563EB";
      ctx.beginPath();
      ctx.arc(62, badgeY + 21, 11, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = "#FFFFFF";
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.moveTo(57, badgeY + 21);
      ctx.lineTo(60, badgeY + 24);
      ctx.lineTo(67, badgeY + 17);
      ctx.stroke();

      // Badge text
      ctx.fillStyle = "#1E293B";
      ctx.font = "bold 17px 'Nunito Sans', -apple-system, sans-serif";
      ctx.fillText("Verified LOVEWANSHI Member", 82, badgeY + 27);

      // 3. Candidate Name
      ctx.fillStyle = "#FFFFFF";
      ctx.font = "800 42px 'Nunito Sans', -apple-system, sans-serif";
      ctx.fillText(name, 40, height - 260);

      // 4. Age & Height line
      ctx.fillStyle = "#E2E8F0";
      ctx.font = "600 22px 'Nunito Sans', -apple-system, sans-serif";
      const metricsText = [age ? `${age} Yrs` : "", heightStr ? heightStr : ""]
        .filter(Boolean)
        .join(" • ");
      ctx.fillText(
        metricsText || "LOVEWANSHI Community Member",
        40,
        height - 220,
      );

      // 5. Gotra Badge Pill
      const gotraBadgeY = height - 190;
      ctx.fillStyle = "#FFF1F4";
      ctx.beginPath();
      ctx.roundRect(40, gotraBadgeY, 200, 36, 18);
      ctx.fill();
      ctx.fillStyle = "#E83A5B";
      ctx.font = "700 17px 'Nunito Sans', -apple-system, sans-serif";
      ctx.fillText(`गोत्र: ${gotraStr} • LOVEWANSHI`, 54, gotraBadgeY + 24);

      // 6. Career & Education line
      ctx.fillStyle = "#F8FAFC";
      ctx.font = "600 20px 'Nunito Sans', -apple-system, sans-serif";
      const careerText = [professionStr, educationStr]
        .filter(Boolean)
        .join(" • ");
      if (careerText) {
        ctx.fillText(`💼 ${careerText}`, 40, height - 120);
      }

      // 7. Location line
      ctx.fillStyle = "#CBD5E1";
      ctx.font = "500 19px 'Nunito Sans', -apple-system, sans-serif";
      ctx.fillText(`📍 ${cityStr || "India"}`, 40, height - 80);

      // 8. Branding Footer Bar
      ctx.fillStyle = "rgba(255, 255, 255, 0.4)";
      ctx.font = "600 15px 'Nunito Sans', -apple-system, sans-serif";
      ctx.fillText(
        `Lovewanshi Parinay (lovewanshisamaj.in) • ID: ${code}`,
        40,
        height - 35,
      );

      // Convert to blob
      canvas.toBlob(
        (b) => {
          if (alive) {
            setCardBlob(b);
            setGeneratingCard(false);
            if (currentObjectUrl) {
              URL.revokeObjectURL(currentObjectUrl);
              currentObjectUrl = null;
            }
          }
        },
        "image/jpeg",
        0.95,
      );
    }

    renderCard();
    return () => {
      alive = false;
      if (currentObjectUrl) URL.revokeObjectURL(currentObjectUrl);
    };
  }, [
    profile,
    primaryPhoto,
    name,
    code,
    age,
    heightStr,
    educationStr,
    professionStr,
    cityStr,
    gotraStr,
  ]);

  // Handle Share to WhatsApp
  async function handleShareWhatsApp() {
    setSharing(true);
    try {
      // 1. Mobile Web Share API with image attachment (produces exact photo + caption on WhatsApp)
      if (
        cardBlob &&
        navigator.canShare &&
        navigator.canShare({
          files: [
            new File([cardBlob], `${code}_card.jpg`, { type: "image/jpeg" }),
          ],
        })
      ) {
        const file = new File([cardBlob], `${code}_card.jpg`, {
          type: "image/jpeg",
        });
        await navigator.share({
          files: [file],
          title: `${name} - Lovewanshi Parinay Matrimony`,
          text: shareMessage,
        });
        return;
      }

      // 2. Fallback: Open WhatsApp directly with the pre-filled proposal message text
      const waUrl = `https://api.whatsapp.com/send?text=${encodeURIComponent(shareMessage)}`;
      window.open(waUrl, "_blank");

      // Also copy text to clipboard for convenience
      await navigator.clipboard.writeText(shareMessage);
      setCopied(true);
      setTimeout(() => setCopied(false), 3500);
    } catch (err) {
      if (err?.name !== "AbortError") {
        const waUrl = `https://api.whatsapp.com/send?text=${encodeURIComponent(shareMessage)}`;
        window.open(waUrl, "_blank");
      }
    } finally {
      setSharing(false);
    }
  }

  // Handle Download Card
  function handleDownloadCard() {
    if (cardBlob) {
      const url = URL.createObjectURL(cardBlob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${code}_${name.replace(/\s+/g, "_")}_LOVEWANSHIParinay.jpg`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      setTimeout(() => URL.revokeObjectURL(url), 2000);
      return;
    }
    if (!canvasRef.current) return;
    try {
      const dataUrl = canvasRef.current.toDataURL("image/jpeg", 0.95);
      const a = document.createElement("a");
      a.href = dataUrl;
      a.download = `${code}_${name.replace(/\s+/g, "_")}_LOVEWANSHIParinay.jpg`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    } catch (e) {
      console.error("Could not export canvas to dataUrl:", e);
    }
  }

  // Handle Copy Message Text
  async function handleCopyText() {
    try {
      await navigator.clipboard.writeText(shareMessage);
      setCopied(true);
      setTimeout(() => setCopied(false), 3000);
    } catch {
      alert("Could not copy to clipboard. Please copy manually.");
    }
  }

  return (
    <div className="share-modal-overlay" onClick={onClose}>
      <div className="share-modal-card" onClick={(e) => e.stopPropagation()}>
        {/* Top Header */}
        <div className="share-modal-header">
          <div style={{ display: "flex", alignItems: "center", gap: "0.6rem" }}>
            <div
              style={{
                width: 36,
                height: 36,
                borderRadius: "50%",
                background: "#ECFDF5",
                color: "#059669",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <Icon name="share" size={18} />
            </div>
            <div>
              <h3
                style={{
                  margin: 0,
                  fontSize: "1.2rem",
                  fontWeight: 800,
                  color: "var(--dark-navy)",
                }}
              >
                Share Matrimonial Profile
              </h3>
              <span
                style={{ fontSize: "0.82rem", color: "var(--secondary-text)" }}
              >
                Share with family and friends on WhatsApp
              </span>
            </div>
          </div>
          <button
            type="button"
            className="modal-close-btn"
            onClick={onClose}
            title="Close"
          >
            ✕
          </button>
        </div>

        {/* Modal Body */}
        <div className="share-modal-body">
          {/* Card Preview Column */}
          <div className="share-preview-col">
            <div className="share-card-visual-frame">
              {/* Visible Live HTML Preview */}
              <div className="share-card-inner">
                {primaryPhoto ? (
                  <img
                    src={primaryPhoto}
                    alt={name}
                    className="share-card-bg-img"
                    crossOrigin="anonymous"
                  />
                ) : (
                  <div className="share-card-bg-placeholder" />
                )}
                <div className="share-card-overlay-gradient">
                  <div className="share-card-badge-row">
                    <span className="share-verified-badge">
                      <VerifiedBadge size={14} /> Verified LOVEWANSHI Member
                    </span>
                  </div>
                  <h4 className="share-card-name">{name}</h4>
                  <div className="share-card-metrics">
                    {[age ? `${age} Yrs` : "", heightStr]
                      .filter(Boolean)
                      .join(" • ")}
                  </div>
                  <div className="share-card-gotra-pill">
                    गोत्र: {gotraStr} • LOVEWANSHI
                  </div>
                  <div className="share-card-sub-info">
                    <span>
                      💼{" "}
                      {[professionStr, educationStr]
                        .filter(Boolean)
                        .join(" • ")}
                    </span>
                    <span>📍 {cityStr || "India"}</span>
                  </div>
                </div>
              </div>

              {/* Hidden Canvas for High-Res PNG/JPG Download & File Share */}
              <canvas ref={canvasRef} style={{ display: "none" }} />
            </div>
          </div>

          {/* Proposal Message Text Preview */}
          <div className="share-text-col">
            <label
              style={{
                fontSize: "0.86rem",
                fontWeight: 700,
                color: "var(--dark-navy)",
                display: "block",
                marginBottom: "0.4rem",
              }}
            >
              Proposal Message Preview:
            </label>
            <div className="share-message-preview-box">
              <pre>{shareMessage}</pre>
            </div>

            {copied && (
              <div className="share-copied-toast">
                <Icon name="check" size={16} />
                <span>Proposal text copied to clipboard!</span>
              </div>
            )}

            {/* Action Buttons */}
            <div className="share-actions-stack">
              {/* WhatsApp Share Button */}
              <button
                type="button"
                className="btn-whatsapp-share"
                onClick={handleShareWhatsApp}
                disabled={sharing || generatingCard}
              >
                <WhatsAppIcon size={22} color="#FFFFFF" />
                <span>
                  {generatingCard
                    ? "Preparing photo card..."
                    : sharing
                      ? "Opening WhatsApp..."
                      : "Share to WhatsApp"}
                </span>
              </button>

              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "1fr 1fr",
                  gap: "0.6rem",
                }}
              >
                {/* Download Photo Card */}
                <button
                  type="button"
                  className="btn-share-secondary"
                  onClick={handleDownloadCard}
                  disabled={generatingCard}
                  title="Download photo card as an image"
                >
                  <Icon name="download" size={16} />
                  <span>
                    {generatingCard ? "Preparing..." : "Download Card"}
                  </span>
                </button>

                {/* Copy Text */}
                <button
                  type="button"
                  className="btn-share-secondary"
                  onClick={handleCopyText}
                >
                  <Icon name="copy" size={16} />
                  <span>Copy Text</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

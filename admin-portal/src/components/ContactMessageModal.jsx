import { useEffect, useState } from "react";
import { api } from "../api";

export default function ContactMessageModal({ profile, onClose }) {
  const [channel, setChannel] = useState("whatsapp"); // "whatsapp" | "call" | "mail" | "manage"
  const [templates, setTemplates] = useState([]);
  const [loadingTemplates, setLoadingTemplates] = useState(false);
  const [selectedTemplateId, setSelectedTemplateId] = useState("");

  // WhatsApp / Email state
  const [messageText, setMessageText] = useState("");
  const [mailSubject, setMailSubject] = useState(
    `Important update regarding your Lovewanshi Parinay profile (${profile?.displayId || `GM${profile?.id}`})`
  );
  const [copied, setCopied] = useState(false);
  const [sendingMail, setSendingMail] = useState(false);
  const [mailSuccess, setMailSuccess] = useState("");
  const [mailError, setMailError] = useState("");

  // Manage templates state
  const [editingTemplate, setEditingTemplate] = useState(null); // null or { id, title, content, templateType }
  const [templateForm, setTemplateForm] = useState({ title: "", content: "", templateType: "WHATSAPP" });
  const [templateSaving, setTemplateSaving] = useState(false);
  const [templateError, setTemplateError] = useState("");

  const cleanPhone = (phone) => {
    if (!phone) return "";
    let digits = phone.replace(/[^0-9]/g, "");
    if (digits.length === 10) digits = `91${digits}`;
    return digits;
  };

  const recipientPhone = cleanPhone(profile?.mobileNo || profile?.whatsappNo);
  const recipientEmail = profile?.email || "";

  function interpolate(text) {
    if (!text) return "";
    const name = profile?.name || "Member";
    const profileId = profile?.displayId || (profile?.id ? `GM${String(profile.id).padStart(5, "0")}` : "");
    const mobileNo = profile?.mobileNo || profile?.whatsappNo || "";
    const email = profile?.email || "";
    const profileUrl = profile?.id ? `https://www.lovewanshisamaj.in/profiles/${profile.id}` : "https://www.lovewanshisamaj.in";

    return text
      .replace(/{name}/g, name)
      .replace(/{profileId}/g, profileId)
      .replace(/{mobileNo}/g, mobileNo)
      .replace(/{email}/g, email)
      .replace(/{profileUrl}/g, profileUrl);
  }

  function loadTemplates() {
    setLoadingTemplates(true);
    api
      .listTemplates()
      .then((data) => {
        setTemplates(data || []);
        if (data && data.length > 0 && !selectedTemplateId) {
          setSelectedTemplateId(String(data[0].id));
          setMessageText(interpolate(data[0].content));
        }
      })
      .catch((err) => {
        console.error("Failed to load message templates", err);
      })
      .finally(() => setLoadingTemplates(false));
  }

  useEffect(() => {
    loadTemplates();
  }, []);

  function handleSelectTemplate(e) {
    const idStr = e.target.value;
    setSelectedTemplateId(idStr);
    if (!idStr) {
      setMessageText("");
      return;
    }
    const found = templates.find((t) => String(t.id) === idStr);
    if (found) {
      setMessageText(interpolate(found.content));
    }
  }

  function insertVariable(variable) {
    setMessageText((prev) => prev + variable);
  }

  function handleSendWhatsApp() {
    if (!recipientPhone) {
      alert("No phone number available for this profile.");
      return;
    }
    const url = `https://api.whatsapp.com/send?phone=${encodeURIComponent(recipientPhone)}&text=${encodeURIComponent(messageText)}`;
    window.open(url, "_blank", "noopener,noreferrer");
  }

  async function handleSendServerMail() {
    if (!recipientEmail) {
      alert("No email address available for this profile.");
      return;
    }
    if (!messageText.trim()) {
      alert("Please enter email body content.");
      return;
    }
    setSendingMail(true);
    setMailSuccess("");
    setMailError("");
    try {
      const res = await api.sendOutreachEmail({
        to: recipientEmail,
        subject: mailSubject,
        content: messageText,
        recipientName: profile?.name || "Member",
        profileId: profile?.displayId || (profile?.id ? `GM${String(profile.id).padStart(5, "0")}` : ""),
      });
      setMailSuccess(res?.message || "Email sent successfully from noreply@lovewanshisamaj.in!");
    } catch (err) {
      setMailError(err?.message || "Failed to send email");
    } finally {
      setSendingMail(false);
    }
  }

  function handleOpenLocalMail() {
    if (!recipientEmail) {
      alert("No email address available for this profile.");
      return;
    }
    const mailto = `mailto:${encodeURIComponent(recipientEmail)}?subject=${encodeURIComponent(mailSubject)}&body=${encodeURIComponent(messageText)}`;
    window.location.href = mailto;
  }

  function handleCopyPhone() {
    if (!profile?.mobileNo) return;
    navigator.clipboard?.writeText(profile.mobileNo);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  // --- Template Management Operations ---
  function startNewTemplate() {
    setEditingTemplate("new");
    setTemplateForm({ title: "", content: "", templateType: "WHATSAPP" });
    setTemplateError("");
  }

  function startEditTemplate(tpl) {
    setEditingTemplate(tpl.id);
    setTemplateForm({
      title: tpl.title || "",
      content: tpl.content || "",
      templateType: tpl.templateType || "WHATSAPP",
    });
    setTemplateError("");
  }

  async function handleSaveTemplate(e) {
    e.preventDefault();
    if (!templateForm.title.trim() || !templateForm.content.trim()) {
      setTemplateError("Title and content are required.");
      return;
    }
    if (templateForm.content.length > 5000) {
      setTemplateError("Content exceeds maximum limit of 5000 characters.");
      return;
    }

    setTemplateSaving(true);
    setTemplateError("");
    try {
      if (editingTemplate === "new") {
        const created = await api.createTemplate(templateForm);
        setTemplates((prev) => [...prev, created]);
        setSelectedTemplateId(String(created.id));
        setMessageText(interpolate(created.content));
      } else {
        const updated = await api.updateTemplate(editingTemplate, templateForm);
        setTemplates((prev) => prev.map((t) => (t.id === updated.id ? updated : t)));
        if (selectedTemplateId === String(updated.id)) {
          setMessageText(interpolate(updated.content));
        }
      }
      setEditingTemplate(null);
    } catch (err) {
      setTemplateError(err?.message || "Failed to save template");
    } finally {
      setTemplateSaving(false);
    }
  }

  async function handleDeleteTemplate(id) {
    if (!window.confirm("Are you sure you want to delete this template?")) return;
    try {
      await api.deleteTemplate(id);
      setTemplates((prev) => prev.filter((t) => t.id !== id));
      if (selectedTemplateId === String(id)) {
        setSelectedTemplateId("");
        setMessageText("");
      }
    } catch (err) {
      alert("Failed to delete template: " + (err?.message || "Unknown error"));
    }
  }

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,0.55)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 1100,
        padding: "1rem",
      }}
    >
      <div
        className="card"
        style={{
          maxWidth: "680px",
          width: "100%",
          maxHeight: "92vh",
          overflowY: "auto",
          padding: "1.5rem",
          display: "flex",
          flexDirection: "column",
          gap: "1rem",
        }}
      >
        {/* Header */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
          <div>
            <h2 style={{ margin: "0 0 0.25rem 0", fontSize: "1.25rem", color: "#111827" }}>
              Message &amp; Outreach
            </h2>
            <div style={{ fontSize: "0.88rem", color: "#4B5563" }}>
              Recipient: <strong>{profile?.name || "(No Name)"}</strong>{" "}
              <span style={{ color: "#A5122F", fontWeight: 600 }}>({profile?.displayId || `GM${profile?.id}`})</span>
            </div>
          </div>
          <button
            type="button"
            className="secondary small"
            onClick={onClose}
            style={{ padding: "0.3rem 0.6rem", fontSize: "1rem" }}
          >
            ✕
          </button>
        </div>

        {/* Channel Navigation Pills */}
        <div style={{ display: "flex", gap: "0.5rem", borderBottom: "1px solid #E5E7EB", paddingBottom: "0.6rem" }}>
          <button
            type="button"
            className={channel === "whatsapp" ? "primary small" : "secondary small"}
            onClick={() => setChannel("whatsapp")}
            style={{ display: "inline-flex", alignItems: "center", gap: "0.35rem" }}
          >
            <span>💬</span> WhatsApp
          </button>
          <button
            type="button"
            className={channel === "call" ? "primary small" : "secondary small"}
            onClick={() => setChannel("call")}
            style={{ display: "inline-flex", alignItems: "center", gap: "0.35rem" }}
          >
            <span>📞</span> Direct Call
          </button>
          <button
            type="button"
            className={channel === "mail" ? "primary small" : "secondary small"}
            onClick={() => setChannel("mail")}
            style={{ display: "inline-flex", alignItems: "center", gap: "0.35rem" }}
          >
            <span>✉️</span> Mail
          </button>
          <button
            type="button"
            className={channel === "manage" ? "primary small" : "secondary small"}
            onClick={() => setChannel("manage")}
            style={{ marginLeft: "auto", display: "inline-flex", alignItems: "center", gap: "0.35rem" }}
          >
            <span>⚙️</span> Manage Templates
          </button>
        </div>

        {/* 1. WHATSAPP TAB */}
        {channel === "whatsapp" && (
          <div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.75rem" }}>
              <div style={{ fontSize: "0.85rem", color: "#4B5563" }}>
                Target Number:{" "}
                <strong style={{ fontFamily: "monospace", color: "#111827" }}>
                  {profile?.mobileNo || profile?.whatsappNo || "No number saved"}
                </strong>
                {recipientPhone && <span style={{ color: "#059669", marginLeft: "0.4rem" }}>({recipientPhone})</span>}
              </div>
              <button
                type="button"
                className="secondary small"
                onClick={() => setChannel("manage")}
                style={{ fontSize: "0.8rem", padding: "0.2rem 0.5rem" }}
              >
                + Add / Edit Templates
              </button>
            </div>

            {/* Template Selector */}
            <div style={{ marginBottom: "0.75rem" }}>
              <label style={{ display: "block", fontSize: "0.85rem", fontWeight: 600, marginBottom: "0.3rem" }}>
                Select Predefined Template
              </label>
              <select
                value={selectedTemplateId}
                onChange={handleSelectTemplate}
                style={{ width: "100%", padding: "0.5rem", borderRadius: "6px", border: "1px solid #D1D5DB" }}
              >
                <option value="">-- Custom / Blank Message --</option>
                {templates.map((tpl) => (
                  <option key={tpl.id} value={tpl.id}>
                    {tpl.title}
                  </option>
                ))}
              </select>
            </div>

            {/* Variable Pills */}
            <div style={{ marginBottom: "0.5rem", display: "flex", gap: "0.35rem", flexWrap: "wrap", alignItems: "center" }}>
              <span style={{ fontSize: "0.75rem", color: "#6B7280" }}>Insert dynamic tag:</span>
              {["{name}", "{profileId}", "{mobileNo}", "{email}", "{profileUrl}"].map((tag) => (
                <button
                  key={tag}
                  type="button"
                  onClick={() => insertVariable(tag)}
                  style={{
                    fontSize: "11px",
                    padding: "2px 6px",
                    background: "#F3F4F6",
                    border: "1px solid #D1D5DB",
                    borderRadius: "4px",
                    cursor: "pointer",
                    fontFamily: "monospace",
                  }}
                  title={`Insert ${tag}`}
                >
                  {tag}
                </button>
              ))}
            </div>

            {/* Message Area */}
            <div style={{ position: "relative", marginBottom: "1rem" }}>
              <textarea
                rows={8}
                value={messageText}
                onChange={(e) => setMessageText(e.target.value)}
                placeholder="Enter or customize message to send..."
                maxLength={5000}
                style={{
                  width: "100%",
                  padding: "0.75rem",
                  fontSize: "0.9rem",
                  lineHeight: "1.4",
                  borderRadius: "6px",
                  border: "1px solid #D1D5DB",
                  fontFamily: "inherit",
                }}
              />
              <div style={{ textAlign: "right", fontSize: "11px", color: "#6B7280", marginTop: "2px" }}>
                {messageText.length} / 5000 characters
              </div>
            </div>

            {/* Action Bar */}
            <div style={{ display: "flex", justifyContent: "flex-end", gap: "0.75rem" }}>
              <button type="button" className="secondary" onClick={onClose}>
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSendWhatsApp}
                disabled={!recipientPhone || !messageText.trim()}
                style={{
                  background: "#25D366",
                  color: "#FFFFFF",
                  border: "none",
                  borderRadius: "6px",
                  padding: "0.55rem 1.25rem",
                  fontWeight: "600",
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "0.4rem",
                  cursor: !recipientPhone || !messageText.trim() ? "not-allowed" : "pointer",
                  opacity: !recipientPhone || !messageText.trim() ? 0.6 : 1,
                }}
              >
                <span>💬</span> Redirect to WhatsApp
              </button>
            </div>
          </div>
        )}

        {/* 2. CALL TAB */}
        {channel === "call" && (
          <div style={{ textAlign: "center", padding: "1.5rem 1rem" }}>
            <div style={{ fontSize: "2.5rem", marginBottom: "0.5rem" }}>📞</div>
            <h3 style={{ margin: "0 0 0.5rem 0", color: "#111827" }}>Call Member Directly</h3>
            <p style={{ color: "#4B5563", fontSize: "0.9rem", marginBottom: "1.5rem" }}>
              Connect with <strong>{profile?.name || "Member"}</strong> via phone call.
            </p>

            <div
              style={{
                display: "inline-block",
                padding: "0.75rem 1.5rem",
                background: "#F3F4F6",
                borderRadius: "8px",
                fontSize: "1.3rem",
                fontFamily: "monospace",
                fontWeight: 600,
                color: "#111827",
                marginBottom: "1.5rem",
                letterSpacing: "0.05em",
              }}
            >
              {profile?.mobileNo || profile?.whatsappNo || "No phone number available"}
            </div>

            <div style={{ display: "flex", justifyContent: "center", gap: "0.75rem" }}>
              <button
                type="button"
                className="secondary"
                onClick={handleCopyPhone}
                disabled={!profile?.mobileNo}
              >
                {copied ? "✓ Copied!" : "📋 Copy Number"}
              </button>

              <a
                href={profile?.mobileNo ? `tel:${profile.mobileNo}` : "#"}
                style={{ textDecoration: "none" }}
              >
                <button
                  type="button"
                  disabled={!profile?.mobileNo}
                  style={{
                    background: "#10B981",
                    color: "white",
                    border: "none",
                    borderRadius: "6px",
                    padding: "0.55rem 1.25rem",
                    fontWeight: 600,
                    cursor: profile?.mobileNo ? "pointer" : "not-allowed",
                  }}
                >
                  📞 Call Now ({profile?.mobileNo})
                </button>
              </a>
            </div>
          </div>
        )}

        {/* 3. MAIL TAB */}
        {channel === "mail" && (
          <div>
            {/* Sender / From Information Banner */}
            <div
              style={{
                marginBottom: "0.85rem",
                padding: "0.65rem 0.85rem",
                background: "#FEF2F2",
                borderRadius: "8px",
                border: "1px solid #FECACA",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                flexWrap: "wrap",
                gap: "0.5rem",
              }}
            >
              <div>
                <div style={{ fontSize: "0.78rem", color: "#6B7280", textTransform: "uppercase", fontWeight: 600 }}>
                  From (Official Matrimony Outreach)
                </div>
                <div style={{ fontSize: "0.95rem", fontWeight: 700, color: "#7B1220", fontFamily: "monospace" }}>
                  noreply@lovewanshisamaj.in
                </div>
              </div>
              <span
                style={{
                  fontSize: "0.75rem",
                  background: "#7B1220",
                  color: "#FFFFFF",
                  padding: "3px 10px",
                  borderRadius: "999px",
                  fontWeight: 600,
                  letterSpacing: "0.03em",
                }}
              >
                OCI Secure SMTP
              </span>
            </div>

            {/* Recipient info */}
            <div style={{ marginBottom: "0.75rem" }}>
              <div style={{ fontSize: "0.85rem", color: "#4B5563" }}>
                Target Recipient:{" "}
                <strong style={{ color: recipientEmail ? "#111827" : "#DC2626" }}>
                  {recipientEmail || "⚠️ No email address saved for this profile"}
                </strong>
              </div>
            </div>

            {/* Status alerts */}
            {mailSuccess && (
              <div
                style={{
                  marginBottom: "0.85rem",
                  padding: "0.75rem 1rem",
                  background: "#ECFDF5",
                  border: "1px solid #A7F3D0",
                  borderRadius: "6px",
                  color: "#065F46",
                  fontSize: "0.88rem",
                  display: "flex",
                  alignItems: "center",
                  gap: "0.5rem",
                }}
              >
                <span style={{ fontSize: "1.1rem" }}>✅</span>
                <div>
                  <strong>Success:</strong> {mailSuccess}
                </div>
              </div>
            )}

            {mailError && (
              <div
                style={{
                  marginBottom: "0.85rem",
                  padding: "0.75rem 1rem",
                  background: "#FEF2F2",
                  border: "1px solid #FCA5A5",
                  borderRadius: "6px",
                  color: "#991B1B",
                  fontSize: "0.88rem",
                  display: "flex",
                  alignItems: "center",
                  gap: "0.5rem",
                }}
              >
                <span style={{ fontSize: "1.1rem" }}>⚠️</span>
                <div>
                  <strong>Error:</strong> {mailError}
                </div>
              </div>
            )}

            {/* Template Selector */}
            <div style={{ marginBottom: "0.75rem" }}>
              <label style={{ display: "block", fontSize: "0.85rem", fontWeight: 600, marginBottom: "0.3rem" }}>
                Select Predefined Template
              </label>
              <select
                value={selectedTemplateId}
                onChange={handleSelectTemplate}
                style={{ width: "100%", padding: "0.5rem", borderRadius: "6px", border: "1px solid #D1D5DB" }}
              >
                <option value="">-- Custom / Blank Message --</option>
                {templates.map((tpl) => (
                  <option key={tpl.id} value={tpl.id}>
                    {tpl.title}
                  </option>
                ))}
              </select>
            </div>

            {/* Dynamic Tag Pills */}
            <div style={{ marginBottom: "0.5rem", display: "flex", gap: "0.35rem", flexWrap: "wrap", alignItems: "center" }}>
              <span style={{ fontSize: "0.75rem", color: "#6B7280" }}>Insert dynamic tag:</span>
              {["{name}", "{profileId}", "{mobileNo}", "{email}", "{profileUrl}"].map((tag) => (
                <button
                  key={tag}
                  type="button"
                  onClick={() => insertVariable(tag)}
                  style={{
                    fontSize: "11px",
                    padding: "2px 6px",
                    background: "#F3F4F6",
                    border: "1px solid #D1D5DB",
                    borderRadius: "4px",
                    cursor: "pointer",
                    fontFamily: "monospace",
                  }}
                  title={`Insert ${tag}`}
                >
                  {tag}
                </button>
              ))}
            </div>

            <div style={{ marginBottom: "0.75rem" }}>
              <label style={{ display: "block", fontSize: "0.85rem", fontWeight: 600, marginBottom: "0.3rem" }}>
                Subject
              </label>
              <input
                type="text"
                value={mailSubject}
                onChange={(e) => setMailSubject(e.target.value)}
                style={{ width: "100%", padding: "0.5rem", borderRadius: "6px", border: "1px solid #D1D5DB" }}
              />
            </div>

            <div style={{ marginBottom: "1rem" }}>
              <label style={{ display: "block", fontSize: "0.85rem", fontWeight: 600, marginBottom: "0.3rem" }}>
                Message Body
              </label>
              <textarea
                rows={8}
                value={messageText}
                onChange={(e) => setMessageText(e.target.value)}
                placeholder="Enter email content..."
                maxLength={5000}
                style={{
                  width: "100%",
                  padding: "0.75rem",
                  fontSize: "0.9rem",
                  lineHeight: "1.4",
                  borderRadius: "6px",
                  border: "1px solid #D1D5DB",
                  fontFamily: "inherit",
                }}
              />
              <div style={{ textAlign: "right", fontSize: "11px", color: "#6B7280", marginTop: "2px" }}>
                {messageText.length} / 5000 characters
              </div>
            </div>

            {/* Actions */}
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                flexWrap: "wrap",
                gap: "0.75rem",
              }}
            >
              <div>
                {recipientEmail && (
                  <button
                    type="button"
                    className="secondary small"
                    onClick={handleOpenLocalMail}
                    style={{ fontSize: "0.8rem", color: "#6B7280" }}
                    title="Open mailto: link in your desktop mail client"
                  >
                    Open in Local Mail Client
                  </button>
                )}
              </div>
              <div style={{ display: "flex", gap: "0.75rem" }}>
                <button type="button" className="secondary" onClick={onClose} disabled={sendingMail}>
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleSendServerMail}
                  disabled={!recipientEmail || !messageText.trim() || sendingMail}
                  style={{
                    background: "#7B1220",
                    color: "#FFFFFF",
                    border: "none",
                    borderRadius: "6px",
                    padding: "0.55rem 1.25rem",
                    fontWeight: "600",
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "0.4rem",
                    cursor: !recipientEmail || !messageText.trim() || sendingMail ? "not-allowed" : "pointer",
                    opacity: !recipientEmail || !messageText.trim() || sendingMail ? 0.6 : 1,
                  }}
                >
                  <span>{sendingMail ? "⏳" : "✉️"}</span>
                  {sendingMail ? "Sending via noreply@lovewanshisamaj.in..." : "Send Email from noreply@lovewanshisamaj.in"}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* 4. MANAGE TEMPLATES TAB */}
        {channel === "manage" && (
          <div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.75rem" }}>
              <h3 style={{ margin: 0, fontSize: "1rem" }}>Database Message Templates</h3>
              {!editingTemplate && (
                <button type="button" className="primary small" onClick={startNewTemplate}>
                  ➕ New Template
                </button>
              )}
            </div>

            {templateError && (
              <div className="error-banner" style={{ marginBottom: "0.75rem", fontSize: "0.85rem" }}>
                {templateError}
              </div>
            )}

            {/* Template Editor Form */}
            {editingTemplate && (
              <form onSubmit={handleSaveTemplate} style={{ background: "#F9FAFB", padding: "1rem", borderRadius: "8px", marginBottom: "1rem", border: "1px solid #E5E7EB" }}>
                <h4 style={{ margin: "0 0 0.5rem 0", fontSize: "0.95rem" }}>
                  {editingTemplate === "new" ? "Create New Template" : "Edit Template"}
                </h4>

                <div style={{ marginBottom: "0.6rem" }}>
                  <label style={{ display: "block", fontSize: "0.8rem", fontWeight: 600, marginBottom: "0.2rem" }}>
                    Title *
                  </label>
                  <input
                    type="text"
                    required
                    value={templateForm.title}
                    onChange={(e) => setTemplateForm((p) => ({ ...p, title: e.target.value }))}
                    placeholder="e.g. Incomplete Profile Alert"
                    style={{ width: "100%", padding: "0.4rem", borderRadius: "4px", border: "1px solid #D1D5DB" }}
                  />
                </div>

                <div style={{ marginBottom: "0.6rem" }}>
                  <label style={{ display: "block", fontSize: "0.8rem", fontWeight: 600, marginBottom: "0.2rem" }}>
                    Content * (Supports tags: {"{name}"}, {"{profileId}"}, {"{mobileNo}"}, {"{profileUrl}"})
                  </label>
                  <textarea
                    rows={6}
                    required
                    maxLength={5000}
                    value={templateForm.content}
                    onChange={(e) => setTemplateForm((p) => ({ ...p, content: e.target.value }))}
                    placeholder="Enter template message text..."
                    style={{ width: "100%", padding: "0.5rem", borderRadius: "4px", border: "1px solid #D1D5DB" }}
                  />
                  <div style={{ textAlign: "right", fontSize: "11px", color: "#6B7280" }}>
                    {templateForm.content.length} / 5000 chars
                  </div>
                </div>

                <div style={{ display: "flex", justifyContent: "flex-end", gap: "0.5rem" }}>
                  <button type="button" className="secondary small" onClick={() => setEditingTemplate(null)}>
                    Cancel
                  </button>
                  <button type="submit" className="primary small" disabled={templateSaving}>
                    {templateSaving ? "Saving..." : "Save Template"}
                  </button>
                </div>
              </form>
            )}

            {/* List of Templates */}
            <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
              {loadingTemplates && <p className="muted small">Loading templates from database...</p>}
              {!loadingTemplates && templates.length === 0 && (
                <p className="muted small">No templates stored in DB yet. Click "New Template" above to create one.</p>
              )}
              {templates.map((t) => (
                <div
                  key={t.id}
                  style={{
                    border: "1px solid #E5E7EB",
                    borderRadius: "6px",
                    padding: "0.75rem",
                    background: "#FFFFFF",
                  }}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.3rem" }}>
                    <strong style={{ fontSize: "0.9rem", color: "#111827" }}>{t.title}</strong>
                    <div style={{ display: "flex", gap: "0.35rem" }}>
                      <button
                        type="button"
                        className="secondary small"
                        style={{ padding: "0.2rem 0.5rem", fontSize: "0.75rem" }}
                        onClick={() => startEditTemplate(t)}
                      >
                        ✏️ Edit
                      </button>
                      <button
                        type="button"
                        className="secondary small"
                        style={{ padding: "0.2rem 0.5rem", fontSize: "0.75rem", color: "#DC2626" }}
                        onClick={() => handleDeleteTemplate(t.id)}
                      >
                        🗑️ Delete
                      </button>
                    </div>
                  </div>
                  <p style={{ margin: 0, fontSize: "0.8rem", color: "#4B5563", whiteSpace: "pre-wrap", maxHeight: "80px", overflow: "hidden" }}>
                    {t.content}
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

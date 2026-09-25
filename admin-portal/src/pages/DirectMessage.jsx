import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../api";

export default function DirectMessage() {
  const [phoneNumber, setPhoneNumber] = useState("");
  const [recipientName, setRecipientName] = useState("");
  const [profileId, setProfileId] = useState("");
  const [email, setEmail] = useState("");

  const [matchedProfile, setMatchedProfile] = useState(null);
  const [searchingProfile, setSearchingProfile] = useState(false);

  // Saved Contacts (DB)
  const [contacts, setContacts] = useState([]);
  const [loadingContacts, setLoadingContacts] = useState(false);
  const [selectedContactId, setSelectedContactId] = useState("");
  const [showManageContacts, setShowManageContacts] = useState(false);
  const [editingContact, setEditingContact] = useState(null); // null, 'new', or id
  const [contactForm, setContactForm] = useState({
    name: "",
    phoneNumber: "",
    email: "",
    category: "PROSPECT",
    notes: "",
  });
  const [contactSaving, setContactSaving] = useState(false);
  const [contactError, setContactError] = useState("");
  const [contactSearch, setContactSearch] = useState("");

  // Templates
  const [templates, setTemplates] = useState([]);
  const [loadingTemplates, setLoadingTemplates] = useState(false);
  const [selectedTemplateId, setSelectedTemplateId] = useState("");
  const [messageText, setMessageText] = useState("");

  const [copied, setCopied] = useState(false);
  const [actionSuccess, setActionSuccess] = useState("");

  // Manage templates state
  const [showManageTemplates, setShowManageTemplates] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState(null);
  const [templateForm, setTemplateForm] = useState({
    title: "",
    content: "",
    templateType: "WHATSAPP",
  });
  const [templateSaving, setTemplateSaving] = useState(false);
  const [templateError, setTemplateError] = useState("");

  const cleanDigits = (phone) => (phone || "").replace(/[^0-9]/g, "");

  const getWhatsAppNumber = (phone) => {
    let digits = cleanDigits(phone);
    if (digits.length === 10) digits = `91${digits}`;
    return digits;
  };

  function interpolate(text, customName, customId, customPhone, customEmail) {
    if (!text) return "";
    const name = customName || recipientName.trim() || "Member";
    const id = customId || profileId.trim() || "Lodha Parinay";
    const mobile = customPhone || phoneNumber.trim() || "";
    const mail = customEmail || email.trim() || "";
    const profileUrl = matchedProfile?.id
      ? `https://www.lovewanshisamaj.in/profiles/${matchedProfile.id}`
      : "https://www.lovewanshisamaj.in";

    return text
      .replace(/{name}/g, name)
      .replace(/{profileId}/g, id)
      .replace(/{mobileNo}/g, mobile)
      .replace(/{email}/g, mail)
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
      .catch((err) => console.error("Failed to load templates", err))
      .finally(() => setLoadingTemplates(false));
  }

  function loadContacts() {
    setLoadingContacts(true);
    api
      .listOutreachContacts()
      .then((data) => setContacts(data || []))
      .catch((err) => console.error("Failed to load contacts", err))
      .finally(() => setLoadingContacts(false));
  }

  useEffect(() => {
    loadTemplates();
    loadContacts();
  }, []);

  // When phone number is typed, debounced lookup in database for registered member
  useEffect(() => {
    const raw = cleanDigits(phoneNumber);
    if (raw.length >= 10) {
      const timer = setTimeout(() => {
        setSearchingProfile(true);
        api
          .allProfiles(raw, 0, 5)
          .then((res) => {
            const found = res?.content?.find(
              (p) =>
                cleanDigits(p.mobileNo).includes(raw) ||
                raw.includes(cleanDigits(p.mobileNo)),
            );
            if (found) {
              setMatchedProfile(found);
              if (!recipientName) setRecipientName(found.name || "");
              if (!profileId) setProfileId(found.displayId || `GM${found.id}`);
              if (!email && found.email) setEmail(found.email);
            } else {
              setMatchedProfile(null);
            }
          })
          .catch(() => setMatchedProfile(null))
          .finally(() => setSearchingProfile(false));
      }, 400);

      return () => clearTimeout(timer);
    } else {
      setMatchedProfile(null);
    }
  }, [phoneNumber]);

  // Handle selecting a saved contact from dropdown
  function handleSelectContact(e) {
    const cId = e.target.value;
    setSelectedContactId(cId);
    if (!cId) return;

    const contact = contacts.find((c) => String(c.id) === cId);
    if (contact) {
      setPhoneNumber(contact.phoneNumber);
      setRecipientName(contact.name);
      if (contact.email) setEmail(contact.email);

      // Re-interpolate template with selected contact's details
      const tpl = templates.find((t) => String(t.id) === selectedTemplateId);
      if (tpl) {
        setMessageText(
          interpolate(
            tpl.content,
            contact.name,
            profileId,
            contact.phoneNumber,
            contact.email,
          ),
        );
      }
      setActionSuccess(
        `Selected contact: ${contact.name} (${contact.phoneNumber})`,
      );
      setTimeout(() => setActionSuccess(""), 3000);
    }
  }

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

  function handleReapplyTemplate() {
    if (!selectedTemplateId) return;
    const found = templates.find((t) => String(t.id) === selectedTemplateId);
    if (found) {
      setMessageText(interpolate(found.content));
    }
  }

  function insertVariable(variable) {
    setMessageText((prev) => prev + variable);
  }

  function handleSendWhatsApp() {
    const digits = getWhatsAppNumber(phoneNumber);
    if (!digits) {
      alert("Please enter a valid phone number.");
      return;
    }
    if (!messageText.trim()) {
      alert("Please enter message content or select a template.");
      return;
    }

    const url = `https://api.whatsapp.com/send?phone=${encodeURIComponent(digits)}&text=${encodeURIComponent(messageText)}`;
    window.open(url, "_blank", "noopener,noreferrer");
    setActionSuccess(`Redirected to WhatsApp for ${digits}`);
    setTimeout(() => setActionSuccess(""), 4000);
  }

  function handleSendSMS() {
    const digits = cleanDigits(phoneNumber);
    if (!digits) {
      alert("Please enter a valid phone number.");
      return;
    }
    if (!messageText.trim()) {
      alert("Please enter message content or select a template.");
      return;
    }

    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
    const separator = isIOS ? "&" : "?";
    const smsUrl = `sms:${digits}${separator}body=${encodeURIComponent(messageText)}`;
    window.location.href = smsUrl;
    setActionSuccess(`Opening SMS app for ${digits}`);
    setTimeout(() => setActionSuccess(""), 4000);
  }

  function handleCopyMessage() {
    if (!messageText) return;
    navigator.clipboard?.writeText(messageText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  }

  // --- Quick Save Current Number to Database ---
  async function handleQuickSaveToContacts() {
    const raw = cleanDigits(phoneNumber);
    if (!raw || raw.length < 10) {
      alert("Please enter a valid 10-digit mobile number first.");
      return;
    }
    const nameToSave = recipientName.trim() || `Contact ${raw.slice(-4)}`;

    try {
      const created = await api.createOutreachContact({
        name: nameToSave,
        phoneNumber: raw,
        email: email.trim() || null,
        category: matchedProfile ? "REGISTERED_MEMBER" : "PROSPECT",
        notes: profileId ? `Profile ID: ${profileId}` : "",
      });
      setContacts((prev) => [created, ...prev]);
      setSelectedContactId(String(created.id));
      setActionSuccess(`✓ "${created.name}" saved to Database Contacts!`);
      setTimeout(() => setActionSuccess(""), 4000);
    } catch (err) {
      alert("Failed to save contact: " + (err?.message || "Unknown error"));
    }
  }

  // --- Contacts Management Functions ---
  function startNewContact() {
    setEditingContact("new");
    setContactForm({
      name: recipientName.trim() || "",
      phoneNumber: phoneNumber.trim() || "",
      email: email.trim() || "",
      category: matchedProfile ? "INCOMPLETE" : "PROSPECT",
      notes: profileId ? `Profile ID: ${profileId}` : "",
    });
    setContactError("");
  }

  function startEditContact(c) {
    setEditingContact(c.id);
    setContactForm({
      name: c.name || "",
      phoneNumber: c.phoneNumber || "",
      email: c.email || "",
      category: c.category || "PROSPECT",
      notes: c.notes || "",
    });
    setContactError("");
  }

  async function handleSaveContact(e) {
    e.preventDefault();
    if (!contactForm.name.trim() || !contactForm.phoneNumber.trim()) {
      setContactError("Name and Phone Number are required.");
      return;
    }

    setContactSaving(true);
    setContactError("");
    try {
      if (editingContact === "new") {
        const created = await api.createOutreachContact(contactForm);
        setContacts((prev) => [created, ...prev]);
        setSelectedContactId(String(created.id));
        setPhoneNumber(created.phoneNumber);
        setRecipientName(created.name);
        setActionSuccess(`✓ Contact "${created.name}" added to Database.`);
      } else {
        const updated = await api.updateOutreachContact(
          editingContact,
          contactForm,
        );
        setContacts((prev) =>
          prev.map((c) => (c.id === updated.id ? updated : c)),
        );
        if (selectedContactId === String(updated.id)) {
          setPhoneNumber(updated.phoneNumber);
          setRecipientName(updated.name);
        }
        setActionSuccess(`✓ Contact "${updated.name}" updated.`);
      }
      setEditingContact(null);
      setTimeout(() => setActionSuccess(""), 4000);
    } catch (err) {
      setContactError(err?.message || "Failed to save contact");
    } finally {
      setContactSaving(false);
    }
  }

  async function handleDeleteContact(id) {
    if (
      !window.confirm(
        "Are you sure you want to delete this contact from the database?",
      )
    )
      return;
    try {
      await api.deleteOutreachContact(id);
      setContacts((prev) => prev.filter((c) => c.id !== id));
      if (selectedContactId === String(id)) {
        setSelectedContactId("");
      }
      setActionSuccess("Contact removed from database.");
      setTimeout(() => setActionSuccess(""), 3000);
    } catch (err) {
      alert("Failed to delete contact: " + (err?.message || "Unknown error"));
    }
  }

  // --- Template Management Functions ---
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
        setTemplates((prev) =>
          prev.map((t) => (t.id === updated.id ? updated : t)),
        );
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
    if (!window.confirm("Are you sure you want to delete this template?"))
      return;
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

  const filteredContacts = contactSearch.trim()
    ? contacts.filter(
        (c) =>
          c.name?.toLowerCase().includes(contactSearch.toLowerCase()) ||
          c.phoneNumber?.includes(contactSearch) ||
          c.category?.toLowerCase().includes(contactSearch.toLowerCase()) ||
          c.notes?.toLowerCase().includes(contactSearch.toLowerCase()),
      )
    : contacts;

  return (
    <div style={{ maxWidth: "920px", margin: "0 auto" }}>
      {/* Page Header */}
      <div className="page-header" style={{ marginBottom: "1.25rem" }}>
        <div>
          <h1 style={{ margin: "0 0 0.25rem 0" }}>
            Direct Outreach &amp; Quick Messaging
          </h1>
          <p className="muted" style={{ margin: 0 }}>
            Select a saved contact from DB or type any number to dispatch
            WhatsApp/SMS messages instantly.
          </p>
        </div>
        <div style={{ display: "flex", gap: "0.5rem" }}>
          <button
            type="button"
            className="secondary small"
            onClick={() => {
              setShowManageContacts(!showManageContacts);
              if (!showManageContacts) setShowManageTemplates(false);
            }}
            style={{ fontWeight: 600 }}
          >
            {showManageContacts
              ? "✕ Close Contacts"
              : `📇 Saved Numbers (${contacts.length})`}
          </button>
          <button
            type="button"
            className="secondary small"
            onClick={() => {
              setShowManageTemplates(!showManageTemplates);
              if (!showManageTemplates) setShowManageContacts(false);
            }}
          >
            {showManageTemplates ? "✕ Close Templates" : "⚙️ DB Templates"}
          </button>
        </div>
      </div>

      {actionSuccess && (
        <div className="success-banner" style={{ marginBottom: "1rem" }}>
          {actionSuccess}
        </div>
      )}

      {/* 1. Recipient Details Card */}
      <div
        className="card"
        style={{
          padding: "1.25rem",
          marginBottom: "1.25rem",
          background: "#FFFFFF",
        }}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: "0.75rem",
          }}
        >
          <h3 style={{ margin: 0, fontSize: "1.05rem", color: "#111827" }}>
            1. Recipient &amp; Contact Selection
          </h3>
          <button
            type="button"
            className="secondary small"
            onClick={startNewContact}
            style={{ fontSize: "0.8rem", padding: "0.25rem 0.6rem" }}
          >
            ➕ Add New Number to DB
          </button>
        </div>

        {/* Saved Numbers Dropdown */}
        <div
          style={{
            marginBottom: "1rem",
            background: "#F9FAFB",
            padding: "0.85rem",
            borderRadius: "8px",
            border: "1px solid #E5E7EB",
          }}
        >
          <label
            style={{
              display: "block",
              fontSize: "0.85rem",
              fontWeight: 700,
              color: "#374151",
              marginBottom: "0.35rem",
            }}
          >
            📇 Select from Saved Numbers (DB Table):
          </label>
          <div style={{ display: "flex", gap: "0.5rem" }}>
            <select
              value={selectedContactId}
              onChange={handleSelectContact}
              className="input-field"
              style={{
                flex: 1,
                padding: "0.55rem 0.75rem",
                borderRadius: "6px",
                border: "1px solid #D1D5DB",
                fontSize: "0.9rem",
                background: "#FFFFFF",
              }}
            >
              <option value="">
                -- Choose from saved contacts ({contacts.length} available) --
              </option>
              {contacts.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name} — {c.phoneNumber} [{c.category || "General"}]
                  {c.notes ? ` • ${c.notes}` : ""}
                </option>
              ))}
            </select>
            {selectedContactId && (
              <button
                type="button"
                className="secondary small"
                onClick={() => {
                  setSelectedContactId("");
                  setPhoneNumber("");
                  setRecipientName("");
                  setMatchedProfile(null);
                }}
                title="Clear selected contact"
              >
                ✕ Clear
              </button>
            )}
          </div>
        </div>

        {/* Manual inputs & quick save */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
            gap: "1rem",
          }}
        >
          {/* Phone Number Input */}
          <div>
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                marginBottom: "0.3rem",
              }}
            >
              <label style={{ fontSize: "0.85rem", fontWeight: 600 }}>
                Mobile Phone Number <span style={{ color: "#DC2626" }}>*</span>
              </label>
              {phoneNumber.length >= 10 &&
                !contacts.some(
                  (c) =>
                    cleanDigits(c.phoneNumber) === cleanDigits(phoneNumber),
                ) && (
                  <button
                    type="button"
                    onClick={handleQuickSaveToContacts}
                    style={{
                      background: "none",
                      border: "none",
                      color: "#A5122F",
                      fontSize: "0.78rem",
                      fontWeight: 700,
                      cursor: "pointer",
                      padding: 0,
                    }}
                    title="Save this phone number to the database table"
                  >
                    💾 Save to DB
                  </button>
                )}
            </div>
            <input
              type="tel"
              placeholder="e.g. 9876543210"
              value={phoneNumber}
              onChange={(e) => {
                setPhoneNumber(e.target.value);
                setSelectedContactId("");
              }}
              className="input-field"
              style={{
                width: "100%",
                padding: "0.55rem 0.75rem",
                fontSize: "1rem",
                fontFamily: "monospace",
              }}
            />
            {searchingProfile && (
              <div className="muted small" style={{ marginTop: "2px" }}>
                Looking up member...
              </div>
            )}
          </div>

          {/* Recipient Name Input */}
          <div>
            <label
              style={{
                display: "block",
                fontSize: "0.85rem",
                fontWeight: 600,
                marginBottom: "0.3rem",
              }}
            >
              Recipient Name (Optional)
            </label>
            <input
              type="text"
              placeholder="e.g. Rahul Gupta"
              value={recipientName}
              onChange={(e) => setRecipientName(e.target.value)}
              className="input-field"
              style={{ width: "100%", padding: "0.55rem 0.75rem" }}
            />
          </div>

          {/* Profile ID Input */}
          <div>
            <label
              style={{
                display: "block",
                fontSize: "0.85rem",
                fontWeight: 600,
                marginBottom: "0.3rem",
              }}
            >
              Profile ID (Optional)
            </label>
            <input
              type="text"
              placeholder="e.g. GM00382"
              value={profileId}
              onChange={(e) => setProfileId(e.target.value)}
              className="input-field"
              style={{ width: "100%", padding: "0.55rem 0.75rem" }}
            />
          </div>
        </div>

        {/* Matched Member Banner */}
        {matchedProfile && (
          <div
            style={{
              marginTop: "1rem",
              padding: "0.75rem 1rem",
              background: "#ECFDF5",
              borderRadius: "6px",
              border: "1px solid #A7F3D0",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
            }}
          >
            <div
              style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}
            >
              <img
                src={matchedProfile.profileImage || "/placeholder.svg"}
                alt=""
                style={{
                  width: "40px",
                  height: "40px",
                  borderRadius: "50%",
                  objectFit: "cover",
                }}
              />
              <div>
                <div style={{ fontWeight: 600, color: "#065F46" }}>
                  Registered Member: {matchedProfile.name} (
                  {matchedProfile.displayId})
                </div>
                <div style={{ fontSize: "0.8rem", color: "#047857" }}>
                  {matchedProfile.gender} • {matchedProfile.city || "India"} •
                  Mobile: {matchedProfile.mobileNo}
                </div>
              </div>
            </div>
            <Link
              to={`/profiles/${matchedProfile.id}`}
              target="_blank"
              style={{
                background: "#059669",
                color: "white",
                padding: "0.35rem 0.75rem",
                borderRadius: "4px",
                textDecoration: "none",
                fontSize: "0.8rem",
                fontWeight: 600,
              }}
            >
              View Profile ↗
            </Link>
          </div>
        )}
      </div>

      {/* 2. Message Composition Card */}
      <div
        className="card"
        style={{
          padding: "1.25rem",
          marginBottom: "1.25rem",
          background: "#FFFFFF",
        }}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: "0.75rem",
          }}
        >
          <h3 style={{ margin: 0, fontSize: "1.05rem", color: "#111827" }}>
            2. Choose Message Template or Compose
          </h3>
          <button
            type="button"
            className="secondary small"
            onClick={handleReapplyTemplate}
            title="Re-populate template with current recipient info"
          >
            🔄 Re-interpolate
          </button>
        </div>

        {/* Template Selector Dropdown */}
        <div style={{ marginBottom: "1rem" }}>
          <label
            style={{
              display: "block",
              fontSize: "0.85rem",
              fontWeight: 600,
              marginBottom: "0.3rem",
            }}
          >
            Predefined Template:
          </label>
          <select
            value={selectedTemplateId}
            onChange={handleSelectTemplate}
            className="input-field"
            style={{
              width: "100%",
              padding: "0.55rem 0.75rem",
              fontSize: "0.9rem",
            }}
          >
            <option value="">-- Custom Message (No Template) --</option>
            {templates.map((tpl) => (
              <option key={tpl.id} value={tpl.id}>
                {tpl.title}
              </option>
            ))}
          </select>
        </div>

        {/* Quick Insert Variable Tags */}
        <div style={{ marginBottom: "0.75rem" }}>
          <span
            style={{
              fontSize: "0.8rem",
              color: "#6B7280",
              marginRight: "0.5rem",
            }}
          >
            Quick Insert Tag:
          </span>
          {[
            "{name}",
            "{profileId}",
            "{mobileNo}",
            "{email}",
            "{profileUrl}",
          ].map((tag) => (
            <button
              key={tag}
              type="button"
              className="secondary small"
              onClick={() => insertVariable(tag)}
              style={{
                marginRight: "0.4rem",
                padding: "0.2rem 0.5rem",
                fontSize: "0.75rem",
                fontFamily: "monospace",
              }}
            >
              +{tag}
            </button>
          ))}
        </div>

        {/* Message Editor Textarea */}
        <div style={{ marginBottom: "0.5rem" }}>
          <textarea
            rows={8}
            value={messageText}
            onChange={(e) => setMessageText(e.target.value)}
            placeholder="Type your message here with greetings, emojis, and links..."
            style={{
              width: "100%",
              padding: "0.75rem",
              borderRadius: "6px",
              border: "1px solid #D1D5DB",
              fontSize: "0.9rem",
              fontFamily: "inherit",
              lineHeight: 1.5,
            }}
          />
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              fontSize: "12px",
              color: "#6B7280",
            }}
          >
            <span>
              Supports emojis (🙏, 🌸, 💍, ✨, 💐) &amp; multi-line formatting
            </span>
            <span>{messageText.length} characters</span>
          </div>
        </div>
      </div>

      {/* 3. Action Dispatcher Bar */}
      <div
        className="card"
        style={{
          padding: "1.25rem",
          background: "#F9FAFB",
          marginBottom: "1.5rem",
          display: "flex",
          gap: "0.75rem",
          alignItems: "center",
          flexWrap: "wrap",
        }}
      >
        <button
          type="button"
          onClick={handleSendWhatsApp}
          style={{
            background: "#25D366",
            color: "#FFFFFF",
            border: "none",
            borderRadius: "6px",
            padding: "0.65rem 1.4rem",
            fontWeight: 700,
            fontSize: "0.95rem",
            display: "inline-flex",
            alignItems: "center",
            gap: "0.4rem",
            cursor: "pointer",
            boxShadow: "0 2px 4px rgba(0,0,0,0.1)",
          }}
        >
          <span style={{ fontSize: "1.1rem" }}>🟢</span> Send on WhatsApp
        </button>

        <button
          type="button"
          onClick={handleSendSMS}
          style={{
            background: "#3B82F6",
            color: "#FFFFFF",
            border: "none",
            borderRadius: "6px",
            padding: "0.65rem 1.25rem",
            fontWeight: 600,
            fontSize: "0.95rem",
            display: "inline-flex",
            alignItems: "center",
            gap: "0.4rem",
            cursor: "pointer",
          }}
        >
          <span>💬</span> Send SMS App
        </button>

        {phoneNumber && (
          <a
            href={`tel:${phoneNumber}`}
            style={{
              background: "#1F2937",
              color: "#FFFFFF",
              borderRadius: "6px",
              padding: "0.65rem 1.1rem",
              fontWeight: 600,
              fontSize: "0.95rem",
              textDecoration: "none",
              display: "inline-flex",
              alignItems: "center",
              gap: "0.3rem",
            }}
          >
            <span>📞</span> Call Number
          </a>
        )}

        <button
          type="button"
          className="secondary"
          onClick={handleCopyMessage}
          style={{ padding: "0.65rem 1rem", fontSize: "0.9rem" }}
        >
          {copied ? "✓ Copied!" : "📋 Copy Message"}
        </button>
      </div>

      {/* 4. Section: Manage Saved Contacts (DB Table) */}
      {showManageContacts && (
        <div
          className="card"
          style={{
            padding: "1.25rem",
            marginBottom: "1.5rem",
            background: "#F9FAFB",
            border: "2px solid #E5E7EB",
          }}
        >
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              marginBottom: "1rem",
            }}
          >
            <div>
              <h3
                style={{
                  margin: "0 0 0.2rem 0",
                  color: "#111827",
                  fontSize: "1.1rem",
                }}
              >
                📇 Saved Numbers &amp; Contacts Directory (DB Table:{" "}
                <code>outreach_contact</code>)
              </h3>
              <p className="muted small" style={{ margin: 0 }}>
                Store phone numbers and names in the database for instant
                outreach and template messaging.
              </p>
            </div>
            <button
              type="button"
              className="primary small"
              onClick={startNewContact}
            >
              ➕ Add New Number
            </button>
          </div>

          {/* Search Contacts Bar */}
          <div style={{ marginBottom: "0.75rem" }}>
            <input
              type="text"
              placeholder="Search saved contacts by name, phone, or notes..."
              value={contactSearch}
              onChange={(e) => setContactSearch(e.target.value)}
              className="input-field"
              style={{
                width: "100%",
                maxWidth: "400px",
                padding: "0.45rem 0.75rem",
                fontSize: "0.85rem",
              }}
            />
          </div>

          {/* List of Contacts */}
          {loadingContacts ? (
            <p className="muted small">
              Loading saved contacts from database...
            </p>
          ) : filteredContacts.length === 0 ? (
            <p
              className="muted small"
              style={{ textAlign: "center", padding: "1.5rem" }}
            >
              {contactSearch
                ? "No contacts match search filter."
                : "No saved contacts yet. Add your first number above!"}
            </p>
          ) : (
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                gap: "0.5rem",
                maxHeight: "360px",
                overflowY: "auto",
              }}
            >
              {filteredContacts.map((c) => (
                <div
                  key={c.id}
                  style={{
                    border: "1px solid #E5E7EB",
                    borderRadius: "6px",
                    padding: "0.65rem 0.85rem",
                    background:
                      selectedContactId === String(c.id)
                        ? "#EFF6FF"
                        : "#FFFFFF",
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    gap: "0.5rem",
                  }}
                >
                  <div>
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "0.5rem",
                      }}
                    >
                      <strong style={{ fontSize: "0.9rem", color: "#111827" }}>
                        {c.name}
                      </strong>
                      <span
                        style={{
                          fontSize: "11px",
                          fontWeight: 700,
                          padding: "1px 6px",
                          borderRadius: "4px",
                          background: "#E5E7EB",
                          color: "#374151",
                        }}
                      >
                        {c.category}
                      </span>
                    </div>
                    <div
                      style={{
                        fontSize: "0.82rem",
                        color: "#4B5563",
                        fontFamily: "monospace",
                      }}
                    >
                      📞 {c.phoneNumber} {c.email ? `• ✉️ ${c.email}` : ""}
                    </div>
                    {c.notes && (
                      <div
                        style={{
                          fontSize: "0.78rem",
                          color: "#6B7280",
                          marginTop: "2px",
                        }}
                      >
                        📝 {c.notes}
                      </div>
                    )}
                  </div>

                  <div
                    style={{
                      display: "flex",
                      gap: "0.35rem",
                      whiteSpace: "nowrap",
                    }}
                  >
                    <button
                      type="button"
                      className="primary small"
                      style={{ padding: "0.25rem 0.6rem", fontSize: "0.78rem" }}
                      onClick={() => {
                        setSelectedContactId(String(c.id));
                        setPhoneNumber(c.phoneNumber);
                        setRecipientName(c.name);
                        if (c.email) setEmail(c.email);
                        setShowManageContacts(false);
                        const tpl = templates.find(
                          (t) => String(t.id) === selectedTemplateId,
                        );
                        if (tpl) {
                          setMessageText(
                            interpolate(
                              tpl.content,
                              c.name,
                              profileId,
                              c.phoneNumber,
                              c.email,
                            ),
                          );
                        }
                        setActionSuccess(
                          `Loaded contact "${c.name}" into composer.`,
                        );
                        setTimeout(() => setActionSuccess(""), 3000);
                      }}
                    >
                      💬 Use &amp; Send
                    </button>
                    <button
                      type="button"
                      className="secondary small"
                      style={{ padding: "0.25rem 0.5rem", fontSize: "0.78rem" }}
                      onClick={() => startEditContact(c)}
                    >
                      ✏️
                    </button>
                    <button
                      type="button"
                      className="secondary small"
                      style={{
                        padding: "0.25rem 0.5rem",
                        fontSize: "0.78rem",
                        color: "#DC2626",
                      }}
                      onClick={() => handleDeleteContact(c.id)}
                    >
                      🗑️
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* 5. Section: Manage Message Templates */}
      {showManageTemplates && (
        <div
          className="card"
          style={{
            padding: "1.25rem",
            marginBottom: "1.5rem",
            background: "#F9FAFB",
            border: "2px solid #E5E7EB",
          }}
        >
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              marginBottom: "1rem",
            }}
          >
            <h3 style={{ margin: 0, color: "#111827", fontSize: "1.1rem" }}>
              ⚙️ Predefined Message Templates (Database Table:{" "}
              <code>message_template</code>)
            </h3>
            <button
              type="button"
              className="primary small"
              onClick={startNewTemplate}
            >
              ➕ Add New Template
            </button>
          </div>

          {editingTemplate && (
            <form
              onSubmit={handleSaveTemplate}
              style={{
                background: "#FFFFFF",
                padding: "1rem",
                borderRadius: "8px",
                border: "1px solid #D1D5DB",
                marginBottom: "1rem",
              }}
            >
              <h4 style={{ margin: "0 0 0.75rem 0", color: "#111827" }}>
                {editingTemplate === "new"
                  ? "Create New Template"
                  : "Edit Template"}
              </h4>

              {templateError && (
                <div
                  style={{
                    color: "#DC2626",
                    fontSize: "0.85rem",
                    marginBottom: "0.5rem",
                  }}
                >
                  ❌ {templateError}
                </div>
              )}

              <div style={{ marginBottom: "0.6rem" }}>
                <label
                  style={{
                    display: "block",
                    fontSize: "0.8rem",
                    fontWeight: 600,
                    marginBottom: "0.2rem",
                  }}
                >
                  Title *
                </label>
                <input
                  type="text"
                  required
                  value={templateForm.title}
                  onChange={(e) =>
                    setTemplateForm((p) => ({ ...p, title: e.target.value }))
                  }
                  placeholder="e.g. Incomplete Profile Notice"
                  style={{
                    width: "100%",
                    padding: "0.4rem",
                    borderRadius: "4px",
                    border: "1px solid #D1D5DB",
                  }}
                />
              </div>

              <div style={{ marginBottom: "0.6rem" }}>
                <label
                  style={{
                    display: "block",
                    fontSize: "0.8rem",
                    fontWeight: 600,
                    marginBottom: "0.2rem",
                  }}
                >
                  Content * (Supports tags: {"{name}"}, {"{profileId}"},{" "}
                  {"{mobileNo}"}, {"{profileUrl}"})
                </label>
                <textarea
                  rows={6}
                  required
                  maxLength={5000}
                  value={templateForm.content}
                  onChange={(e) =>
                    setTemplateForm((p) => ({ ...p, content: e.target.value }))
                  }
                  placeholder="Template content with emojis..."
                  style={{
                    width: "100%",
                    padding: "0.5rem",
                    borderRadius: "4px",
                    border: "1px solid #D1D5DB",
                  }}
                />
                <div
                  style={{
                    textAlign: "right",
                    fontSize: "11px",
                    color: "#6B7280",
                  }}
                >
                  {templateForm.content.length} / 5000 chars
                </div>
              </div>

              <div
                style={{
                  display: "flex",
                  justifyContent: "flex-end",
                  gap: "0.5rem",
                }}
              >
                <button
                  type="button"
                  className="secondary small"
                  onClick={() => setEditingTemplate(null)}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="primary small"
                  disabled={templateSaving}
                >
                  {templateSaving ? "Saving..." : "Save Template"}
                </button>
              </div>
            </form>
          )}

          {/* List of Templates */}
          <div
            style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}
          >
            {loadingTemplates && (
              <p className="muted small">Loading templates from database...</p>
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
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    marginBottom: "0.3rem",
                  }}
                >
                  <strong style={{ fontSize: "0.9rem", color: "#111827" }}>
                    {t.title}
                  </strong>
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
                      style={{
                        padding: "0.2rem 0.5rem",
                        fontSize: "0.75rem",
                        color: "#DC2626",
                      }}
                      onClick={() => handleDeleteTemplate(t.id)}
                    >
                      🗑️ Delete
                    </button>
                  </div>
                </div>
                <p
                  style={{
                    margin: 0,
                    fontSize: "0.8rem",
                    color: "#4B5563",
                    whiteSpace: "pre-wrap",
                    maxHeight: "80px",
                    overflow: "hidden",
                  }}
                >
                  {t.content}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 6. Add / Edit Contact Modal Dialog (Always available from any Add / Edit button) */}
      {editingContact && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            backgroundColor: "rgba(0, 0, 0, 0.55)",
            backdropFilter: "blur(3px)",
            zIndex: 1200,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: "1rem",
          }}
          onClick={() => setEditingContact(null)}
        >
          <div
            style={{
              background: "#FFFFFF",
              borderRadius: "12px",
              width: "100%",
              maxWidth: "520px",
              padding: "1.5rem",
              boxShadow:
                "0 20px 25px -5px rgba(0,0,0,0.2), 0 10px 10px -5px rgba(0,0,0,0.1)",
              border: "1px solid #E5E7EB",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                marginBottom: "0.85rem",
              }}
            >
              <h3
                style={{
                  margin: 0,
                  fontSize: "1.2rem",
                  color: "#111827",
                  fontWeight: 700,
                }}
              >
                {editingContact === "new"
                  ? "➕ Add Number to Database"
                  : "✏️ Edit Saved Contact"}
              </h3>
              <button
                type="button"
                onClick={() => setEditingContact(null)}
                style={{
                  background: "transparent",
                  border: "none",
                  fontSize: "1.5rem",
                  lineHeight: 1,
                  cursor: "pointer",
                  color: "#6B7280",
                  padding: "0.2rem 0.4rem",
                }}
              >
                &times;
              </button>
            </div>

            <p
              style={{
                margin: "0 0 1rem 0",
                fontSize: "0.83rem",
                color: "#6B7280",
              }}
            >
              Save this number to the database table (
              <code>outreach_contact</code>) for quick selection in templates
              and WhatsApp/SMS dispatch.
            </p>

            {contactError && (
              <div
                style={{
                  background: "#FEE2E2",
                  color: "#991B1B",
                  padding: "0.6rem 0.8rem",
                  borderRadius: "6px",
                  fontSize: "0.85rem",
                  marginBottom: "0.85rem",
                }}
              >
                ❌ {contactError}
              </div>
            )}

            <form onSubmit={handleSaveContact}>
              <div style={{ marginBottom: "0.85rem" }}>
                <label
                  style={{
                    display: "block",
                    fontSize: "0.82rem",
                    fontWeight: 600,
                    color: "#374151",
                    marginBottom: "0.25rem",
                  }}
                >
                  Full Name <span style={{ color: "#DC2626" }}>*</span>
                </label>
                <input
                  type="text"
                  required
                  value={contactForm.name}
                  onChange={(e) =>
                    setContactForm((p) => ({ ...p, name: e.target.value }))
                  }
                  placeholder="e.g. Suresh Lodha"
                  style={{
                    width: "100%",
                    padding: "0.55rem 0.75rem",
                    borderRadius: "6px",
                    border: "1px solid #D1D5DB",
                    fontSize: "0.9rem",
                  }}
                  autoFocus
                />
              </div>

              <div style={{ marginBottom: "0.85rem" }}>
                <label
                  style={{
                    display: "block",
                    fontSize: "0.82rem",
                    fontWeight: 600,
                    color: "#374151",
                    marginBottom: "0.25rem",
                  }}
                >
                  Mobile Phone Number{" "}
                  <span style={{ color: "#DC2626" }}>*</span>
                </label>
                <input
                  type="tel"
                  required
                  value={contactForm.phoneNumber}
                  onChange={(e) =>
                    setContactForm((p) => ({
                      ...p,
                      phoneNumber: e.target.value,
                    }))
                  }
                  placeholder="e.g. 9876543210"
                  style={{
                    width: "100%",
                    padding: "0.55rem 0.75rem",
                    borderRadius: "6px",
                    border: "1px solid #D1D5DB",
                    fontSize: "0.95rem",
                    fontFamily: "monospace",
                  }}
                />
              </div>

              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "1fr 1fr",
                  gap: "0.75rem",
                  marginBottom: "0.85rem",
                }}
              >
                <div>
                  <label
                    style={{
                      display: "block",
                      fontSize: "0.82rem",
                      fontWeight: 600,
                      color: "#374151",
                      marginBottom: "0.25rem",
                    }}
                  >
                    Category
                  </label>
                  <select
                    value={contactForm.category}
                    onChange={(e) =>
                      setContactForm((p) => ({
                        ...p,
                        category: e.target.value,
                      }))
                    }
                    style={{
                      width: "100%",
                      padding: "0.55rem 0.6rem",
                      borderRadius: "6px",
                      border: "1px solid #D1D5DB",
                      fontSize: "0.85rem",
                      background: "#FFFFFF",
                    }}
                  >
                    <option value="PROSPECT">Prospect / Lead</option>
                    <option value="INCOMPLETE">Incomplete Profile</option>
                    <option value="COMMUNITY_LEAD">Lodha Samaj Lead</option>
                    <option value="MATCHMAKER">Matchmaker / Pandit</option>
                    <option value="FAMILY_ELDER">Family Elder</option>
                    <option value="GENERAL">General</option>
                  </select>
                </div>

                <div>
                  <label
                    style={{
                      display: "block",
                      fontSize: "0.82rem",
                      fontWeight: 600,
                      color: "#374151",
                      marginBottom: "0.25rem",
                    }}
                  >
                    Email (Optional)
                  </label>
                  <input
                    type="email"
                    value={contactForm.email}
                    onChange={(e) =>
                      setContactForm((p) => ({ ...p, email: e.target.value }))
                    }
                    placeholder="e.g. name@example.com"
                    style={{
                      width: "100%",
                      padding: "0.55rem 0.6rem",
                      borderRadius: "6px",
                      border: "1px solid #D1D5DB",
                      fontSize: "0.85rem",
                    }}
                  />
                </div>
              </div>

              <div style={{ marginBottom: "1.25rem" }}>
                <label
                  style={{
                    display: "block",
                    fontSize: "0.82rem",
                    fontWeight: 600,
                    color: "#374151",
                    marginBottom: "0.25rem",
                  }}
                >
                  Notes (Optional)
                </label>
                <textarea
                  rows={2}
                  value={contactForm.notes}
                  onChange={(e) =>
                    setContactForm((p) => ({ ...p, notes: e.target.value }))
                  }
                  placeholder="e.g. Looking for groom in Jhansi, called on 12 Sep"
                  style={{
                    width: "100%",
                    padding: "0.5rem 0.6rem",
                    borderRadius: "6px",
                    border: "1px solid #D1D5DB",
                    fontSize: "0.85rem",
                    fontFamily: "inherit",
                  }}
                />
              </div>

              <div
                style={{
                  display: "flex",
                  justifyContent: "flex-end",
                  gap: "0.75rem",
                }}
              >
                <button
                  type="button"
                  className="secondary"
                  onClick={() => setEditingContact(null)}
                  disabled={contactSaving}
                  style={{ padding: "0.5rem 1rem" }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="primary"
                  disabled={contactSaving}
                  style={{
                    padding: "0.5rem 1.25rem",
                    background: "#A5122F",
                    color: "#FFFFFF",
                    fontWeight: 600,
                    border: "none",
                    borderRadius: "6px",
                    cursor: contactSaving ? "not-allowed" : "pointer",
                  }}
                >
                  {contactSaving ? "Saving to DB..." : "💾 Save to Database"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

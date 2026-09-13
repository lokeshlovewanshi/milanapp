const BASE_URL = import.meta.env.VITE_API_BASE_URL || "https://api.lovewanshisamaj.in";

function getToken() {
  return localStorage.getItem("adminToken");
}

async function request(path, options = {}) {
  const token = getToken();
  const res = await fetch(`${BASE_URL}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options.headers,
    },
  });

  // A 401 from the login endpoint itself means "wrong credentials" - the
  // caller shows that inline. Everywhere else, 401 means an expired/invalid
  // token on an already-logged-in session, which does need the hard redirect.
  if (res.status === 401 && path !== "/api/v1/admin/login") {
    localStorage.removeItem("adminToken");
    localStorage.removeItem("adminName");
    window.location.href = "/login";
    throw new Error("Session expired");
  }

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(text || `Request failed: ${res.status}`);
  }

  const text = await res.text();
  return text ? JSON.parse(text) : null;
}

export const api = {
  login: (email, password) =>
    request("/api/v1/admin/login", {
      method: "POST",
      body: JSON.stringify({ email, password }),
    }),

  unverifiedProfiles: (page = 0, size = 20) =>
    request(`/api/v1/admin/profiles/unverified?page=${page}&size=${size}`),

  verifiedProfiles: (search = "", page = 0, size = 20) =>
    request(
      `/api/v1/admin/profiles/verified?search=${encodeURIComponent(search)}&page=${page}&size=${size}`
    ),

  allProfiles: (search = "", page = 0, size = 20) =>
    request(
      `/api/v1/admin/profiles?search=${encodeURIComponent(search)}&page=${page}&size=${size}`
    ),

  getProfile: (id) => request(`/api/v1/admin/profiles/${id}`),

  updateProfile: (id, fields) =>
    request(`/api/v1/admin/profiles/${id}`, {
      method: "PATCH",
      body: JSON.stringify(fields),
    }),

  verifyProfile: (id) =>
    request(`/api/v1/admin/profiles/${id}/verify`, { method: "POST" }),

  blockProfile: (id) =>
    request(`/api/v1/admin/profiles/${id}/block`, { method: "POST" }),

  unblockProfile: (id) =>
    request(`/api/v1/admin/profiles/${id}/unblock`, { method: "POST" }),

  featuredStories: () => request("/api/v1/admin/featured-stories"),

  addFeaturedStory: (profileId, sortOrder, note) =>
    request("/api/v1/admin/featured-stories", {
      method: "POST",
      body: JSON.stringify({ profileId, sortOrder, note }),
    }),

  removeFeaturedStory: (id) =>
    request(`/api/v1/admin/featured-stories/${id}`, { method: "DELETE" }),

  listTickets: (status = "", page = 0, size = 20) =>
    request(
      `/api/v1/admin/tickets?status=${encodeURIComponent(status)}&page=${page}&size=${size}`
    ),

  getTicket: (id) => request(`/api/v1/admin/tickets/${id}`),

  replyTicket: (id, message) =>
    request(`/api/v1/admin/tickets/${id}/messages`, {
      method: "POST",
      body: JSON.stringify({ message }),
    }),

  closeTicket: (id) =>
    request(`/api/v1/admin/tickets/${id}/close`, { method: "POST" }),

  // --- Plans & Offers Management ---
  listPlans: () => request("/api/v1/admin/plans"),

  getPlan: (id) => request(`/api/v1/admin/plans/${id}`),

  updatePlan: (id, fields) =>
    request(`/api/v1/admin/plans/${id}`, {
      method: "PUT",
      body: JSON.stringify(fields),
    }),

  setFreeSignupOffer: (id) =>
    request(`/api/v1/admin/plans/${id}/set-free-signup`, { method: "POST" }),

  listMemberships: (page = 0, size = 20) =>
    request(`/api/v1/admin/plans/memberships?page=${page}&size=${size}`),

  // --- Notifications ---
  sendBroadcastNotification: (payload) =>
    request("/api/v1/admin/notifications/broadcast", {
      method: "POST",
      body: JSON.stringify(payload),
    }),

  sendSingleUserNotification: (payload) =>
    request("/api/v1/admin/notifications/send-user", {
      method: "POST",
      body: JSON.stringify(payload),
    }),

  // --- Profile Creation & Photos ---
  createProfile: (payload) =>
    request("/api/v1/admin/profiles", {
      method: "POST",
      body: JSON.stringify(payload),
    }),

  uploadProfilePhoto: async (id, file) => {
    const token = getToken();
    const formData = new FormData();
    formData.append("file", file);
    const res = await fetch(`${BASE_URL}/api/v1/admin/profiles/${id}/photos`, {
      method: "POST",
      headers: {
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: formData,
    });
    if (!res.ok) {
      const text = await res.text().catch(() => "");
      throw new Error(text || `Photo upload failed: ${res.status}`);
    }
    return res.json();
  },

  deleteProfilePhoto: (id, photoId) =>
    request(`/api/v1/admin/profiles/${id}/photos/${photoId}`, {
      method: "DELETE",
    }),

  setPrimaryProfilePhoto: (id, photoId) =>
    request(`/api/v1/admin/profiles/${id}/photos/${photoId}/primary`, {
      method: "POST",
    }),

  setProfileVisibility: (id, hidden) =>
    request(`/api/v1/admin/profiles/${id}/visibility`, {
      method: "PATCH",
      body: JSON.stringify({ hidden }),
    }),

  deleteProfile: (id) =>
    request(`/api/v1/admin/profiles/${id}`, {
      method: "DELETE",
    }),

  // --- Message Templates (Outreach WhatsApp / Email / Call) ---
  listTemplates: (type = "") =>
    request(`/api/v1/admin/templates${type ? `?type=${encodeURIComponent(type)}` : ""}`),

  createTemplate: (payload) =>
    request("/api/v1/admin/templates", {
      method: "POST",
      body: JSON.stringify(payload),
    }),

  updateTemplate: (id, payload) =>
    request(`/api/v1/admin/templates/${id}`, {
      method: "PUT",
      body: JSON.stringify(payload),
    }),

  deleteTemplate: (id) =>
    request(`/api/v1/admin/templates/${id}`, {
      method: "DELETE",
    }),

  sendOutreachEmail: (payload) =>
    request("/api/v1/admin/templates/send-email", {
      method: "POST",
      body: JSON.stringify(payload),
    }),

  // --- Saved Outreach Contacts Directory (Custom Numbers & Prospects) ---
  listOutreachContacts: (search = "") =>
    request(`/api/v1/admin/outreach-contacts${search ? `?search=${encodeURIComponent(search)}` : ""}`),

  createOutreachContact: (payload) =>
    request("/api/v1/admin/outreach-contacts", {
      method: "POST",
      body: JSON.stringify(payload),
    }),

  updateOutreachContact: (id, payload) =>
    request(`/api/v1/admin/outreach-contacts/${id}`, {
      method: "PUT",
      body: JSON.stringify(payload),
    }),

  deleteOutreachContact: (id) =>
    request(`/api/v1/admin/outreach-contacts/${id}`, {
      method: "DELETE",
    }),

  // Reference data endpoints (synchronized with backend & app)
  allReferenceOptions: () => request("/api/v1/reference/options"),
  referenceOptionsByCategory: (category) => request(`/api/v1/reference/options/${category}`),
  states: () => request("/api/v1/reference/states"),
  cities: (params = {}) => {
    const q = new URLSearchParams();
    if (params.stateId) q.set("stateId", params.stateId);
    if (params.stateCode) q.set("stateCode", params.stateCode);
    if (params.search) q.set("search", params.search);
    if (params.limit) q.set("limit", params.limit);
    return request(`/api/v1/reference/cities?${q.toString()}`);
  },
};

export const referenceAPI = {
  allOptions: api.allReferenceOptions,
  options: api.referenceOptionsByCategory,
  states: api.states,
  cities: api.cities,
};


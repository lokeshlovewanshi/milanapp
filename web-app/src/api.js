const BASE_URL = import.meta.env.VITE_API_BASE_URL || "https://api.lovewanshisamaj.in";
const API_URL = BASE_URL + "/api/v1";

export function getToken() {
  return localStorage.getItem("memberToken");
}

export function isLoggedIn() {
  return Boolean(getToken());
}

export function setToken(token) {
  localStorage.setItem("memberToken", token);
}

export function clearSession() {
  localStorage.removeItem("memberToken");
}

function isBlockedOrDeletedAccount(status, body) {
  if (status !== 401 && status !== 403 && status !== 410) return false;
  return /\b(account|profile)\b[^.]*\b(deleted|blocked)\b|\b(deleted|blocked)\b[^.]*\b(account|profile)\b/i.test(body || "");
}

export function toBackendId(id) {
  if (id == null) return "";
  const str = String(id).trim();
  if (str.startsWith("JM")) return str;
  if (str.startsWith("GM")) return "JM" + str.slice(2);
  const digits = str.replace(/\D/g, "");
  if (digits) return `JM${digits.padStart(5, "0")}`;
  return str;
}

async function request(path, options = {}) {
  const token = getToken();
  const res = await fetch(`${API_URL}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options.headers,
    },
  });

  // An under-review member gets a normal 403 for actions such as Like and
  // Shortlist. Keep that session active. Only an explicit blocked/deleted
  // account response ends the saved login session.
  const errorBody = !res.ok ? await res.clone().text().catch(() => "") : "";
  if (isBlockedOrDeletedAccount(res.status, errorBody) && getToken()) {
    clearSession();
    window.location.href = "/login";
    throw new Error("Account is no longer available");
  }

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    let message = text;
    try {
      const parsed = JSON.parse(text);
      message = parsed.message || parsed.detail || text;
    } catch {
      // Plain-text error body - use as-is.
    }
    const error = new Error(message || `Request failed: ${res.status}`);
    error.status = res.status;
    throw error;
  }

  const text = await res.text().catch(() => "");
  if (!text) return null;
  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}

export const authAPI = {
  signup: (data) => request("/auth/signup", { method: "POST", body: JSON.stringify(data) }),
  login: (email, password) =>
    request("/auth/login", { method: "POST", body: JSON.stringify({ email, password }) }),
  restore: (email, password) =>
    request("/auth/restore", { method: "POST", body: JSON.stringify({ email, password }) }),
  googleAuth: (idToken) => request("/auth/google", { method: "POST", body: JSON.stringify({ idToken }) }),
  restoreGoogle: (idToken) =>
    request("/auth/google/restore", { method: "POST", body: JSON.stringify({ idToken }) }),
};

export const otpAPI = {
  status: () => request("/auth/otp/status"),
  request: (email, purpose) =>
    request("/auth/otp/request", { method: "POST", body: JSON.stringify({ email, purpose }) }),
  resetPassword: (email, code, newPassword) =>
    request("/auth/password/reset", { method: "POST", body: JSON.stringify({ email, code, newPassword }) }),
};

export const profileAPI = {
  getMe: () => request("/user"),
  updateProfile: (data) => request("/user/profile", { method: "PATCH", body: JSON.stringify(data) }),

  getStories: (size = 12) => request(`/user/stories?size=${size}`),

  getProfiles: (page = 0, size = 20, oppositeGender = false, filter = {}) => {
    const params = new URLSearchParams({ page: String(page), size: String(size), oppositeGender: String(oppositeGender) });
    Object.entries(filter).forEach(([key, value]) => {
      if (value !== null && value !== undefined && value !== "") params.set(key, String(value));
    });
    return request(`/users?${params.toString()}`);
  },
  getProfile: (id) => request(`/users/${toBackendId(id)}`),

  setHidden: (hidden) => request("/user/profile/visibility", { method: "PATCH", body: JSON.stringify({ hidden }) }),
  deleteAccount: () => request("/user/profile", { method: "DELETE" }),

  // Kundali methods
  generateKundali: () => request("/user/kundali", { method: "POST" }),
  getKundali: () => request("/user/kundali"),
  matchKundali: (id) => request(`/user/kundali/match/${toBackendId(id)}`),

  // Split section endpoints
  getBasicInfo: () => request("/user/profile/basic"),
  getContactInfo: () => request("/user/profile/contact"),
  getReligionInfo: () => request("/user/profile/religion"),
  getEducationInfo: () => request("/user/profile/education"),
  getFamilyInfo: () => request("/user/profile/family"),

  updateBasicInfo: (data) => request("/user/profile/basic", { method: "PATCH", body: JSON.stringify(data) }),
  updateContactInfo: (data) => request("/user/profile/contact", { method: "PATCH", body: JSON.stringify(data) }),
  updateReligionInfo: (data) => request("/user/profile/religion", { method: "PATCH", body: JSON.stringify(data) }),
  updateEducationInfo: (data) => request("/user/profile/education", { method: "PATCH", body: JSON.stringify(data) }),
  updateFamilyInfo: (data) => request("/user/profile/family", { method: "PATCH", body: JSON.stringify(data) }),
};

export const storyAPI = {
  getTopStories: () => request("/stories/top"),
};

export const likeAPI = {
  likeProfile: (id) => request(`/likes/${toBackendId(id)}`, { method: "POST" }),
  unlikeProfile: (id) => request(`/likes/${toBackendId(id)}`, { method: "DELETE" }),
  getReceivedLikes: () => request("/likes"),
  getSentLikes: () => request("/likes/me"),
  acceptLike: (id) => request(`/likes/accept/${toBackendId(id)}`, { method: "POST" }),
  declineLike: (id) => request(`/likes/reject/${toBackendId(id)}`, { method: "POST" }),
};

export const shortlistAPI = {
  add: (id) => request(`/shortlist/${toBackendId(id)}`, { method: "POST" }),
  remove: (id) => request(`/shortlist/${toBackendId(id)}`, { method: "DELETE" }),
  getAll: () => request("/shortlist"),
};

export const viewsAPI = {
  getProfileViews: (page = 0, size = 10) => request(`/views?page=${page}&size=${size}`),
  addView: (profileId) => request("/views", { method: "POST", body: JSON.stringify({ profileId: toBackendId(profileId) }) }),
};

export const referenceAPI = {
  allOptions: () => request("/reference/options"),
  options: (category) => request(`/reference/options/${category}`),
  states: () => request("/reference/states"),
  cities: (params = {}) => {
    const q = new URLSearchParams();
    Object.entries(params).forEach(([k, v]) => {
      if (v != null && v !== "") q.set(k, String(v));
    });
    return request(`/reference/cities?${q.toString()}`);
  },
};

export const notificationAPI = {
  list: (page = 0, size = 20) => request(`/notifications?page=${page}&size=${size}`),
  unreadCount: () => request("/notifications/unread-count"),
  markAllRead: () => request("/notifications/read-all", { method: "POST" }),
};

export const biodataAPI = {
  fetchHtml: async () => {
    const token = getToken();
    const res = await fetch(`${API_URL}/user/biodata`, {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    });
    if (!res.ok) {
      const text = await res.text().catch(() => "");
      throw new Error(text || "Could not build your biodata");
    }
    return res.text();
  },
};

export const attachmentAPI = {
  uploadFile: async (file) => {
    const token = getToken();
    const formData = new FormData();
    formData.append("file", file);
    const res = await fetch(`${API_URL}/attachment/upload`, {
      method: "POST",
      body: formData,
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    });
    if (!res.ok) {
      const text = await res.text().catch(() => "");
      throw new Error(text || "Upload failed");
    }
    return res.text();
  },

  setPrimaryImage: (id) => request(`/attachment/${id}/set-primary`, { method: "PUT" }),
  deleteImage: (id) => request(`/attachment/${id}`, { method: "DELETE" }),
};

export const ticketAPI = {
  list: () => request("/support/tickets"),
  create: (subject, message) =>
    request("/support/tickets", { method: "POST", body: JSON.stringify({ subject, message }) }),
  get: (id) => request(`/support/tickets/${id}`),
  addMessage: (id, message) =>
    request(`/support/tickets/${id}/messages`, { method: "POST", body: JSON.stringify({ message }) }),
  reopen: (id) => request(`/support/tickets/${id}/reopen`, { method: "POST" }),
  contact: () => request("/support/contact"),
};

export { BASE_URL, API_URL };

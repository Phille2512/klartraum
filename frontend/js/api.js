// Kleiner Wrapper um fetch für die REST-API
const api = {
  async request(path, options = {}) {
    const headers = { "Content-Type": "application/json" };
    if (auth.token) headers["Authorization"] = `Bearer ${auth.token}`;
    let res;
    try {
      res = await fetch(path, { headers, ...options });
    } catch {
      const err = new Error("Server nicht erreichbar");
      err.isNetworkError = true;
      throw err;
    }
    if (res.status === 401) {
      auth.onUnauthorized();
      const err = new Error("Nicht angemeldet");
      err.isAuthError = true;
      throw err;
    }
    if (!res.ok) {
      const detail = await res.json().catch(() => ({}));
      throw new Error(detail.detail || `Fehler ${res.status}`);
    }
    return res.status === 204 ? null : res.json();
  },

  listDreams(params = {}) {
    const query = new URLSearchParams(
      Object.entries(params).filter(([, v]) => v !== "" && v != null)
    ).toString();
    return this.request(`/api/dreams${query ? "?" + query : ""}`);
  },
  createDream(data) {
    return this.request("/api/dreams", { method: "POST", body: JSON.stringify(data) });
  },
  updateDream(id, data) {
    return this.request(`/api/dreams/${id}`, { method: "PUT", body: JSON.stringify(data) });
  },
  deleteDream(id) {
    return this.request(`/api/dreams/${id}`, { method: "DELETE" });
  },
  listTags() {
    return this.request("/api/tags");
  },
  setTagCategory(id, category) {
    return this.request(`/api/tags/${id}/category`, {
      method: "PUT",
      body: JSON.stringify({ category }),
    });
  },
  stats() {
    return this.request("/api/stats");
  },
};

function showToast(message) {
  const toast = document.getElementById("toast");
  toast.textContent = message;
  toast.classList.remove("hidden");
  clearTimeout(showToast._timer);
  showToast._timer = setTimeout(() => toast.classList.add("hidden"), 2500);
}

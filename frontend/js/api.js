// Kleiner Wrapper um fetch für die REST-API
const api = {
  async request(path, options = {}) {
    const res = await fetch(path, {
      headers: { "Content-Type": "application/json" },
      ...options,
    });
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

// Kleiner Wrapper um fetch für die REST-API
const api = {
  async request(path, options = {}) {
    // TD.2: bei FormData (Datei-Upload) KEIN Content-Type setzen -- der
    // Browser braucht die Kontrolle über den multipart-Boundary-String.
    const headers = options.body instanceof FormData ? {} : { "Content-Type": "application/json" };
    if (auth.token) headers["Authorization"] = `Bearer ${auth.token}`;
    let res;
    try {
      res = await fetch(path, { headers, ...options });
    } catch {
      const err = new Error(t("auth.serverUnreachable"));
      err.isNetworkError = true;
      throw err;
    }
    if (res.status === 401) {
      auth.onUnauthorized();
      const err = new Error(tErrCode("not_authenticated"));
      err.isAuthError = true;
      throw err;
    }
    if (!res.ok) {
      const detail = await res.json().catch(() => ({}));
      const err = new Error(detail.detail ? tErrCode(detail.detail) : t("auth.genericError", { status: res.status }));
      err.status = res.status;
      err.code = detail.detail || null;
      throw err;
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
  stats(params = {}) {
    const query = new URLSearchParams(
      Object.entries(params).filter(([, v]) => v !== "" && v != null)
    ).toString();
    return this.request(`/api/stats${query ? "?" + query : ""}`);
  },
  statsConnections(params = {}) {
    const query = new URLSearchParams(
      Object.entries(params).filter(([, v]) => v !== "" && v != null)
    ).toString();
    return this.request(`/api/stats/connections${query ? "?" + query : ""}`);
  },
  currentIntention() {
    return this.request("/api/intentions/current");
  },
  createIntention(text) {
    return this.request("/api/intentions", { method: "POST", body: JSON.stringify({ text }) });
  },
  fulfillIntention(id, fulfilled) {
    return this.request(`/api/intentions/${id}`, { method: "PATCH", body: JSON.stringify({ fulfilled }) });
  },
  listGoals() {
    return this.request("/api/goals");
  },
  createGoal(text) {
    return this.request("/api/goals", { method: "POST", body: JSON.stringify({ text }) });
  },
  toggleGoal(id, done) {
    return this.request(`/api/goals/${id}`, { method: "PATCH", body: JSON.stringify({ done }) });
  },
  deleteGoal(id) {
    return this.request(`/api/goals/${id}`, { method: "DELETE" });
  },
  getMap() {
    return this.request("/api/map");
  },
  placeNode(tagId, x, y) {
    return this.request(`/api/map/nodes/${tagId}`, { method: "PUT", body: JSON.stringify({ x, y }) });
  },
  removeNode(tagId) {
    return this.request(`/api/map/nodes/${tagId}`, { method: "DELETE" });
  },
  createPath(fromTagId, toTagId, note) {
    return this.request("/api/map/paths", { method: "POST", body: JSON.stringify({ from_tag_id: fromTagId, to_tag_id: toTagId, note }) });
  },
  deletePath(id) {
    return this.request(`/api/map/paths/${id}`, { method: "DELETE" });
  },
  createRegion(name, color, tagIds) {
    return this.request("/api/map/regions", { method: "POST", body: JSON.stringify({ name, color, tag_ids: tagIds }) });
  },
  deleteRegion(id) {
    return this.request(`/api/map/regions/${id}`, { method: "DELETE" });
  },
  setTagRegion(tagId, regionId) {
    return this.request(`/api/tags/${tagId}/region`, { method: "PUT", body: JSON.stringify({ region_id: regionId }) });
  },
  setArchetype(tagId, archetype) {
    return this.request(`/api/tags/${tagId}/archetype`, { method: "PUT", body: JSON.stringify({ archetype }) });
  },
  listReflections(dreamId) {
    return this.request(`/api/dreams/${dreamId}/reflections`);
  },
  createReflection(dreamId, question, answer) {
    return this.request(`/api/dreams/${dreamId}/reflections`, { method: "POST", body: JSON.stringify({ question, answer }) });
  },
  deleteReflection(id) {
    return this.request(`/api/reflections/${id}`, { method: "DELETE" });
  },
  listSymbolNotes(tagId) {
    return this.request(`/api/tags/${tagId}/notes`);
  },
  createSymbolNote(tagId, text) {
    return this.request(`/api/tags/${tagId}/notes`, { method: "POST", body: JSON.stringify({ text }) });
  },
  deleteSymbolNote(id) {
    return this.request(`/api/symbol-notes/${id}`, { method: "DELETE" });
  },
  listImaginations(dreamId) {
    return this.request(`/api/dreams/${dreamId}/imaginations`);
  },
  createImagination(dreamId, text) {
    return this.request(`/api/dreams/${dreamId}/imaginations`, { method: "POST", body: JSON.stringify({ text }) });
  },
  deleteImagination(id) {
    return this.request(`/api/imaginations/${id}`, { method: "DELETE" });
  },
  dreamEchoes(text, excludeId) {
    const params = new URLSearchParams({ text });
    if (excludeId) params.set("exclude_id", excludeId);
    return this.request(`/api/dreams/echoes?${params}`);
  },
  getInnenwelt(params = {}) {
    const query = new URLSearchParams(
      Object.entries(params).filter(([, v]) => v !== "" && v != null)
    ).toString();
    return this.request(`/api/innenwelt${query ? "?" + query : ""}`);
  },
  getMandala(from, to) {
    const params = new URLSearchParams();
    if (from) params.set("from", from);
    if (to) params.set("to", to);
    return this.request(`/api/mandala?${params}`);
  },
  listSyncEvents() {
    return this.request("/api/sync-events");
  },
  createSyncEvent(dreamId, date, text) {
    return this.request("/api/sync-events", { method: "POST", body: JSON.stringify({ dream_id: dreamId, date, text }) });
  },
  deleteSyncEvent(id) {
    return this.request(`/api/sync-events/${id}`, { method: "DELETE" });
  },
  listDreamAnalysis(dreamId) {
    return this.request(`/api/dreams/${dreamId}/analysis`);
  },
  createDreamAnalysis(dreamId, station, answer) {
    return this.request(`/api/dreams/${dreamId}/analysis`, { method: "POST", body: JSON.stringify({ station, answer }) });
  },
  deleteDreamAnalysis(id) {
    return this.request(`/api/dream-analysis/${id}`, { method: "DELETE" });
  },
  dataInfo() {
    return this.request("/api/datainfo");
  },
  getNight(date) {
    return this.request(`/api/nights/${date}`);
  },
  putNight(date, payload) {
    return this.request(`/api/nights/${date}`, { method: "PUT", body: JSON.stringify(payload) });
  },
  latestExactNight() {
    return this.request("/api/nights/latest-exact");
  },
  medianBedtime() {
    return this.request("/api/nights/median-bedtime");
  },
  importNights(formData) {
    return this.request("/api/nights/import", { method: "POST", body: formData });
  },
};

function showToast(message) {
  const toast = document.getElementById("toast");
  toast.textContent = message;
  toast.classList.remove("hidden");
  clearTimeout(showToast._timer);
  showToast._timer = setTimeout(() => toast.classList.add("hidden"), 2500);
}

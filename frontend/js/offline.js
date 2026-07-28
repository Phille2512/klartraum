// Offline-Warteschlange: Ist der Server nicht erreichbar, landen neue Träume
// in IndexedDB und werden automatisch nachgereicht, sobald er wieder antwortet.
const offline = {
  DB_NAME: "klartraum-offline",
  STORE: "outbox",
  syncing: false,

  openDB() {
    return new Promise((resolve, reject) => {
      const req = indexedDB.open(this.DB_NAME, 1);
      req.onupgradeneeded = () => {
        req.result.createObjectStore(this.STORE, { keyPath: "queueId", autoIncrement: true });
      };
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
  },

  async enqueue(payload) {
    const db = await this.openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(this.STORE, "readwrite");
      tx.objectStore(this.STORE).add({ payload, savedAt: new Date().toISOString() });
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  },

  async list() {
    const db = await this.openDB();
    return new Promise((resolve, reject) => {
      const req = db.transaction(this.STORE).objectStore(this.STORE).getAll();
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
  },

  async remove(queueId) {
    const db = await this.openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(this.STORE, "readwrite");
      tx.objectStore(this.STORE).delete(queueId);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  },

  async sync() {
    if (this.syncing) return;
    this.syncing = true;
    try {
      const items = await this.list();
      let synced = 0;
      let existing;
      try { existing = await api.listDreams(); } catch { break; }
      for (const item of items) {
        try {
          const isDupe = existing.some((d) =>
            d.date === item.payload.date && d.title === item.payload.title
          );
          if (isDupe) {
            await this.remove(item.queueId);
            continue;
          }
          await api.createDream(item.payload);
          await this.remove(item.queueId);
          synced++;
        } catch (err) {
          if (err.isNetworkError || err.isAuthError) break;
          await this.remove(item.queueId);
          showToast(t("offline.entryRejected", { title: item.payload.title, message: err.message }));
        }
      }
      if (synced) {
        showToast(synced === 1 ? t("offline.syncedOne") : t("offline.syncedMany", { count: synced }));
        journal.load();
      }
    } finally {
      this.syncing = false;
    }
  },

  init() {
    window.addEventListener("online", () => this.sync());
    // Fallback: "online" feuert nicht, wenn nur der Server aus war (WLAN blieb an)
    setInterval(() => this.sync(), 60 * 1000);
    this.sync();
  },
};

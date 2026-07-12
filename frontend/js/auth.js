// Anmeldung: Beim ersten Start wird ein Passwort festgelegt, danach meldet
// sich jedes Gerät einmal an und erhält ein Token (localStorage).
const auth = {
  token: localStorage.getItem("auth-token"),
  setupMode: false,

  init() {
    this.overlay = document.getElementById("login-overlay");
    document.getElementById("login-form").addEventListener("submit", (e) => this.submit(e));
    this.check();
  },

  async check() {
    try {
      const res = await fetch("/api/auth/status");
      const status = await res.json();
      if (!status.configured) {
        this.show(true);
      } else if (!this.token) {
        this.show(false);
      }
    } catch {
      // Server offline: nichts tun – die App zeigt den Offline-Hinweis
    }
  },

  show(setupMode) {
    this.setupMode = setupMode;
    document.getElementById("login-title").textContent = setupMode
      ? "🔒 Passwort festlegen"
      : "🔒 Anmelden";
    document.getElementById("login-hint").textContent = setupMode
      ? "Schütze dein Traumtagebuch: Lege ein Passwort fest (mind. 4 Zeichen). Du brauchst es auf jedem Gerät einmal."
      : "Gib dein Traumader-Passwort ein.";
    document.getElementById("login-confirm-label").classList.toggle("hidden", !setupMode);
    document.getElementById("login-error").textContent = "";
    this.overlay.classList.remove("hidden");
    document.getElementById("login-password").focus();
  },

  hide() {
    this.overlay.classList.add("hidden");
    document.getElementById("login-form").reset();
  },

  async submit(event) {
    event.preventDefault();
    const password = document.getElementById("login-password").value;
    const errorEl = document.getElementById("login-error");

    if (this.setupMode) {
      const confirm = document.getElementById("login-confirm").value;
      if (password !== confirm) {
        errorEl.textContent = "Die Passwörter stimmen nicht überein.";
        return;
      }
    }

    try {
      const res = await fetch(`/api/auth/${this.setupMode ? "setup" : "login"}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });
      if (!res.ok) {
        const detail = await res.json().catch(() => ({}));
        errorEl.textContent = detail.detail || `Fehler ${res.status}`;
        return;
      }
      const data = await res.json();
      this.token = data.token;
      localStorage.setItem("auth-token", this.token);
      this.hide();
      showToast(this.setupMode ? "Passwort festgelegt 🔒" : "Angemeldet ✓");
      journal.load();
      offline.sync();
    } catch {
      errorEl.textContent = "Server nicht erreichbar.";
    }
  },

  // Wird von api.js gerufen, wenn der Server 401 antwortet
  onUnauthorized() {
    this.token = null;
    localStorage.removeItem("auth-token");
    if (this.overlay.classList.contains("hidden")) this.show(false);
  },
};

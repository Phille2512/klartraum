// Das Lesezimmer: ein stiller Gegenpol zum Analyse-Tab — ein Traum pro
// Bildschirm, zum Wiederlesen statt zum Auswerten. Lädt bewusst einen
// eigenen, ungefilterten Datensatz statt journal.dreams zu teilen, damit ein
// aktiver Tagebuch-Filter die Auswahl hier nicht verfälscht.
const lesezimmer = {
  dreams: [],
  queue: [],
  index: 0,
  source: null,
  readLogKey: "lesezimmer-read-log",

  init() {
    this.overlay = document.getElementById("lesezimmer-overlay");

    document.getElementById("lesezimmer-btn").addEventListener("click", () => this.open());
    document.getElementById("ritual-lesezimmer-link")?.addEventListener("click", (e) => {
      e.preventDefault();
      document.getElementById("ritual-overlay").classList.add("hidden");
      this.open("night");
    });
    document.getElementById("lesezimmer-close").addEventListener("click", () => this.close());
    this.overlay.addEventListener("click", (e) => {
      if (e.target === this.overlay) this.close();
    });
    document.getElementById("lesezimmer-prev").addEventListener("click", () => this.step(-1));
    document.getElementById("lesezimmer-next").addEventListener("click", () => this.step(1));
    document.getElementById("lesezimmer-reveal").addEventListener("click", () => this.toggleDetails());
    document.getElementById("lesezimmer-dream").addEventListener("click", (e) => {
      if (e.target.closest(".lesezimmer-details")) return; // Klicks in Details sollen nicht wieder zuklappen
      this.toggleDetails();
    });
    document.querySelectorAll("#lesezimmer-sources .chip").forEach((chip) => {
      chip.addEventListener("click", () => this.selectSource(chip.dataset.source));
    });
    document.addEventListener("keydown", (e) => {
      if (this.overlay.classList.contains("hidden")) return;
      if (e.key === "Escape") this.close();
      if (e.key === "ArrowLeft") this.step(-1);
      if (e.key === "ArrowRight") this.step(1);
    });
  },

  async open(initialSource = "random") {
    this.overlay.classList.remove("hidden");
    try {
      this.dreams = await api.listDreams();
    } catch {
      this.dreams = [];
    }
    this.selectSource(initialSource);
  },

  close() {
    this.overlay.classList.add("hidden");
  },

  getReadLog() {
    try {
      return JSON.parse(localStorage.getItem(this.readLogKey) || "{}");
    } catch {
      return {};
    }
  },

  markRead(id) {
    const log = this.getReadLog();
    log[id] = new Date().toISOString();
    localStorage.setItem(this.readLogKey, JSON.stringify(log));
  },

  shuffled(list) {
    return [...list].sort(() => Math.random() - 0.5);
  },

  buildQueue(source) {
    const pool = this.dreams;
    if (!pool.length) return [];

    if (source === "night") {
      const today = new Date();
      const monthDay = `${today.getMonth()}-${today.getDate()}`;
      const matches = pool
        .filter((d) => {
          const dd = new Date(`${d.date}T00:00:00`);
          return `${dd.getMonth()}-${dd.getDate()}` === monthDay;
        })
        .sort((a, b) => b.date.localeCompare(a.date));
      return matches.length ? matches : this.shuffled(pool);
    }
    if (source === "big") {
      return this.shuffled(pool.filter((d) => d.big_dream));
    }
    if (source === "stale") {
      const log = this.getReadLog();
      return [...pool].sort((a, b) => (log[a.id] || a.date).localeCompare(log[b.id] || b.date));
    }
    return this.shuffled(pool);
  },

  selectSource(source) {
    this.source = source;
    document.querySelectorAll("#lesezimmer-sources .chip").forEach((c) => {
      c.classList.toggle("active", c.dataset.source === source);
    });
    this.queue = this.buildQueue(source);
    this.index = 0;
    this.render();
  },

  step(delta) {
    if (!this.queue.length) return;
    this.index = (this.index + delta + this.queue.length) % this.queue.length;
    this.render();
  },

  toggleDetails() {
    document.getElementById("lesezimmer-details").classList.toggle("hidden");
  },

  render() {
    const empty = document.getElementById("lesezimmer-empty");
    const article = document.getElementById("lesezimmer-dream");
    const nav = document.getElementById("lesezimmer-nav");

    if (!this.queue.length) {
      empty.classList.remove("hidden");
      article.classList.add("hidden");
      nav.classList.add("hidden");
      document.getElementById("lesezimmer-echoes").innerHTML = "";
      return;
    }

    empty.classList.add("hidden");
    article.classList.remove("hidden");
    nav.classList.remove("hidden");

    const d = this.queue[this.index];
    article.classList.remove("lesezimmer-fade-in");
    void article.offsetWidth; // Animation bei jedem Blättern neu anstoßen
    article.classList.add("lesezimmer-fade-in");

    document.getElementById("lesezimmer-date").textContent = formatDate(d.date);
    document.getElementById("lesezimmer-title").textContent = (d.big_dream ? "⭐ " : "") + d.title;
    document.getElementById("lesezimmer-text").textContent = d.content || "(kein Text festgehalten)";

    const details = document.getElementById("lesezimmer-details");
    details.classList.add("hidden");
    details.innerHTML = this.renderDetails(d);

    this.markRead(d.id);
    this.loadEchoesFor(d);
  },

  renderDetails(d) {
    const lucidityLabels = ["keine Erinnerung", "Fragment", "Traum", "kurz luzide", "voll luzide ✨"];
    const parts = [
      `<span class="badge ${d.lucidity >= 3 ? "lucid" : ""}">${lucidityLabels[d.lucidity]}</span>`,
      ...d.dream_signs.map((s) => `<span class="badge sign">🔮 ${escapeHtml(s)}</span>`),
      ...d.places.map((p) => `<span class="badge place">📍 ${escapeHtml(p)}</span>`),
      ...d.persons.map((p) => `<span class="badge person">👤 ${escapeHtml(p)}</span>`),
      ...d.tags.map((t) => `<span class="badge">${escapeHtml(t)}</span>`),
      ...(d.emotions || []).map((e) =>
        EMOTIONS[e]
          ? `<span class="badge emotion-badge" style="--emo-color:${EMOTIONS[e].color}">${EMOTIONS[e].icon} ${EMOTIONS[e].label}</span>`
          : ""
      ),
      ...SUBSTANCES.filter((s) => d.substances.includes(s.key)).map((s) => `<span class="badge herb">${s.icon} ${s.label}</span>`),
      d.substance_other ? `<span class="badge herb">🧪 ${escapeHtml(d.substance_other)}</span>` : "",
      ...PHENOMENA.filter((p) => d[p.field]).map((p) => `<span class="badge phenomenon">${p.icon} ${p.label}</span>`),
    ];
    let html = `<div class="lesezimmer-badges">${parts.join("")}</div>`;
    if (d.notes_analysis) html += `<p class="hint">📝 ${escapeHtml(d.notes_analysis)}</p>`;
    return html;
  },

  async loadEchoesFor(d) {
    const el = document.getElementById("lesezimmer-echoes");
    el.innerHTML = "";
    if (!d.content || d.content.trim().length < 10) return;
    try {
      const echoes = await api.dreamEchoes(d.content.trim(), d.id);
      if (!echoes.length) return;
      el.innerHTML =
        `<p class="hint">Ähnliche Träume:</p>` +
        echoes.map((e) => `<button type="button" class="chip echo-jump" data-id="${e.id}">${escapeHtml(e.title)}</button>`).join("");
      el.querySelectorAll(".echo-jump").forEach((btn) => {
        btn.addEventListener("click", () => this.jumpTo(Number(btn.dataset.id)));
      });
    } catch {
      /* Echos sind ein optionales Extra, kein Fehler wert */
    }
  },

  jumpTo(id) {
    const idx = this.queue.findIndex((d) => d.id === id);
    if (idx >= 0) {
      this.index = idx;
      this.render();
      return;
    }
    const d = this.dreams.find((x) => x.id === id);
    if (!d) return;
    this.queue = [d, ...this.queue];
    this.index = 0;
    this.render();
  },
};

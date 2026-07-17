// Analyse: Kennzahlen + Diagramme (Chart.js) + Traumkompass nach LaBerge
const COMPASS = {
  awareness: {
    icon: "💭", get label() { return t("stats.compass.awareness.label"); },
    get hint() { return t("stats.compass.awareness.hint"); },
    get mission() { return t("stats.compass.awareness.mission"); },
  },
  action: {
    icon: "⚡", get label() { return t("stats.compass.action.label"); },
    get hint() { return t("stats.compass.action.hint"); },
    get mission() { return t("stats.compass.action.mission"); },
  },
  form: {
    icon: "🌀", get label() { return t("stats.compass.form.label"); },
    get hint() { return t("stats.compass.form.hint"); },
    get mission() { return t("stats.compass.form.mission"); },
  },
  context: {
    icon: "🗺️", get label() { return t("stats.compass.context.label"); },
    get hint() { return t("stats.compass.context.hint"); },
    get mission() { return t("stats.compass.context.mission"); },
  },
};

const SPLIT_OPTIONS = [
  { value: "", get label() { return t("stats.splitNone"); } },
  { value: "beifuss", get label() { return t("stats.splitBeifuss"); } },
  { value: "weekend", get label() { return t("stats.splitWeekend"); } },
  { value: "big_dream", get label() { return t("journal.filterBigDreams"); } },
  { value: "sleep", get label() { return t("stats.splitSleep"); } },
];

// E.2: Statistische Ehrlichkeit -- kleines "n=X"-Badge neben jeder Quote;
// unter threshold zusaetzlich grau + Tooltip ("Tendenz, kein Befund").
function nBadge(n, threshold = 5) {
  const low = n < threshold;
  return `<span class="n-badge${low ? " n-badge-low" : ""}"${low ? ` title="${escapeHtml(t("stats.nBadgeLowTooltip"))}"` : ""}>n=${n}</span>`;
}

// E.2: Ab n<3 ist eine Prozentzahl reines Rauschen -- lieber ehrlich "--" zeigen.
function rateOrDash(pctText, n, minN = 3) {
  return n < minN
    ? `<span class="dash-hint" title="${escapeHtml(t("stats.tooFewForRate"))}">—</span>`
    : pctText;
}

// D.1: Reihenfolge fuer die Swipe-Navigation zwischen den Analyse-Sektionen.
const STATS_SECTION_ORDER = ["overview", "write", "lucidity", "emotions", "experiments", "compass", "review"];

// D.2: Karten in den Themen-Sektionen, die sich an den Ueberblick anheften
// lassen. Review-Sektion (Archetypen/Mandala) bewusst ausgenommen -- deren
// Render-Funktionen laden asynchron nach (api.getInnenwelt, mandala.render)
// und passen nicht ins synchrone ensureCardRendered-Muster unten.
const PINNABLE_CARD_IDS = [
  "card-writing", "card-recall", "card-heatmap", "card-histogram", "card-detail", "card-score",
  "card-weeks", "card-lucidity-dist", "incubation-card", "phenomena-card",
  "emotion-section",
  "card-beifuss", "card-sleep", "card-connections", "correlation-section",
  "card-compass", "card-signs", "new-elements-card",
];
// Reine Chart.js-Karten: Canvas-Inhalt laesst sich beim Klonen nicht als Bild
// mitnehmen, daher fuer die Pin-Vorschau ohne eigenen Render-Aufruf geklont
// (Titel/Hinweistext genuegen als Kontext, siehe renderPinnedCards).
const CANVAS_ONLY_CARD_IDS = new Set([
  "card-recall", "card-histogram", "card-detail", "card-score",
  "card-weeks", "card-lucidity-dist", "card-compass", "card-signs",
]);

// D.2: reine Funktionen fuer Trend-Pfeil und Mini-Sparkline -- unabhaengig
// von DOM/state testbar (drei Faelle: steigend/fallend/stabil + leere Buckets).
function trendArrow(curr, prev) {
  if (curr == null || prev == null || Number.isNaN(curr) || Number.isNaN(prev)) return "";
  if (curr > prev) return "▲";
  if (curr < prev) return "▼";
  return "▬";
}

function sparklineSvg(values, { width = 72, height = 22, color = "var(--accent)" } = {}) {
  const nums = values.filter((v) => v != null && !Number.isNaN(v));
  if (nums.length < 2) return `<div class="sparkline-empty">${t("stats.overviewNoTrend")}</div>`;
  const min = Math.min(...nums), max = Math.max(...nums);
  const range = max - min || 1;
  const step = width / (values.length - 1);
  const points = values.map((v, i) => {
    const x = i * step;
    const y = v == null || Number.isNaN(v) ? height / 2 : height - ((v - min) / range) * height;
    return `${x.toFixed(1)},${y.toFixed(1)}`;
  }).join(" ");
  return `<svg class="sparkline" viewBox="0 0 ${width} ${height}" width="${width}" height="${height}">
    <polyline points="${points}" fill="none" stroke="${color}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
  </svg>`;
}

// D.2: "Traeume/Woche" soll ohne Datumsformat-Parserei (Bucket-Keys sehen je
// nach Granularitaet anders aus) aus der Bucket-Anzahl geschaetzt werden.
function weeksInBuckets(perBucket, granularity) {
  const n = perBucket.length;
  if (!n) return 0;
  if (granularity === "day") return n / 7;
  if (granularity === "month") return n * (365.25 / 12 / 7);
  return n;
}

const stats = {
  charts: {},
  data: null,
  bound: false,

  // ---- Steuerzeile (A.1) ----
  get range() { return localStorage.getItem("stats-range") || "all"; },
  set range(v) { localStorage.setItem("stats-range", v); },
  get granularity() { return localStorage.getItem("stats-granularity") || "week"; },
  set granularity(v) { localStorage.setItem("stats-granularity", v); },
  get section() { return localStorage.getItem("stats-section") || "overview"; },
  set section(v) { localStorage.setItem("stats-section", v); },
  get split() { return localStorage.getItem("stats-split") || ""; },
  set split(v) { localStorage.setItem("stats-split", v); },
  get customFrom() { return localStorage.getItem("stats-from") || ""; },
  set customFrom(v) { localStorage.setItem("stats-from", v); },
  get customTo() { return localStorage.getItem("stats-to") || ""; },
  set customTo(v) { localStorage.setItem("stats-to", v); },

  computeFromTo() {
    if (this.range === "all") return { from: null, to: null };
    if (this.range === "custom") return { from: this.customFrom || null, to: this.customTo || null };
    const days = parseInt(this.range, 10);
    const from = new Date();
    from.setDate(from.getDate() - days);
    return { from: from.toISOString().slice(0, 10), to: null };
  },

  spanDays({ from, to }) {
    if (!from) return Infinity;
    const start = new Date(from);
    const end = to ? new Date(to) : new Date();
    return (end - start) / 86400000;
  },

  async load() {
    this.bindControls();
    const range = this.computeFromTo();
    let granularity = this.granularity;
    const hint = document.getElementById("stats-gran-hint");
    if (granularity === "day" && this.spanDays(range) > 90) {
      granularity = "week";
      hint.classList.remove("hidden");
    } else {
      hint.classList.add("hidden");
    }

    let data;
    try {
      data = await api.stats({ from: range.from, to: range.to, granularity, split: this.split || null });
    } catch (err) {
      showToast(err.message);
      return;
    }
    this.data = data;
    // D.2: pro Datensatz neu tracken, welche Sektionen schon einen echten
    // Render-Durchlauf hatten (fuer ensureCardRendered bei Pin-Vorschauen).
    this._renderedSections = new Set();
    this.renderCards(data);
    this.renderSplitControls();
    this.renderSection(this.section);
  },

  bindControls() {
    if (this.bound) {
      this.syncControlUI();
      return;
    }
    this.bound = true;
    this.bindPinButtons();

    document.getElementById("stats-range-chips").querySelectorAll(".chip").forEach((chip) => {
      chip.addEventListener("click", () => {
        this.range = chip.dataset.range;
        document.getElementById("stats-custom-range").classList.toggle("hidden", this.range !== "custom");
        this.syncControlUI();
        this.load();
      });
    });
    document.getElementById("stats-from").addEventListener("change", (e) => { this.customFrom = e.target.value; this.load(); });
    document.getElementById("stats-to").addEventListener("change", (e) => { this.customTo = e.target.value; this.load(); });

    document.getElementById("stats-gran-chips").querySelectorAll(".chip").forEach((chip) => {
      chip.addEventListener("click", () => {
        this.granularity = chip.dataset.gran;
        this.syncControlUI();
        this.load();
      });
    });

    document.getElementById("stats-section-nav").querySelectorAll(".chip").forEach((chip) => {
      chip.addEventListener("click", () => {
        this.section = chip.dataset.section;
        this.syncControlUI();
        this.renderSection(this.section);
      });
    });

    this.bindStickyNav();
    this.bindSwipeNav();
    this.syncControlUI();
  },

  // D.1: Filterleiste + Sektions-Chips bleiben beim Scrollen sichtbar.
  // header ist selbst sticky top:0 -- die Filterleiste muss darunter kleben
  // (Hoehe per CSS-Var), die Sektions-Chips wiederum unter der Filterleiste,
  // deren Hoehe sich durchs Einklappen aendert -- daher hier statt in CSS.
  bindStickyNav() {
    const updateHeaderHeightVar = () => {
      const header = document.querySelector("header");
      if (header) document.documentElement.style.setProperty("--app-header-h", `${header.offsetHeight}px`);
    };
    updateHeaderHeightVar();
    window.addEventListener("resize", updateHeaderHeightVar);

    let forceExpanded = false;
    let expandedAt = 0;
    let ticking = false;
    const sync = () => {
      ticking = false;
      const bar = document.querySelector(".stats-controlbar");
      const nav = document.getElementById("stats-section-nav");
      if (!bar || !nav || !document.getElementById("tab-stats").classList.contains("active")) return;
      const stickyTop = parseFloat(getComputedStyle(bar).top) || 0;
      const isStuck = bar.getBoundingClientRect().top <= stickyTop + 0.5;
      bar.classList.toggle("collapsed", isStuck && !forceExpanded);
      nav.style.top = `${Math.round(bar.getBoundingClientRect().bottom)}px`;
    };
    window.addEventListener("scroll", () => {
      // Tap-to-expand loest durchs eigene Hoehenwachstum ein "scroll"-Event
      // aus (Scroll-Anchoring) -- kurze Schonfrist, damit das den gerade
      // geoeffneten Zustand nicht sofort wieder zuklappt.
      if (forceExpanded && Date.now() - expandedAt < 300) {
        if (!ticking) { ticking = true; requestAnimationFrame(sync); }
        return;
      }
      forceExpanded = false;
      if (!ticking) { ticking = true; requestAnimationFrame(sync); }
    }, { passive: true });

    document.getElementById("stats-controlbar-summary").addEventListener("click", () => {
      forceExpanded = true;
      expandedAt = Date.now();
      sync();
    });
    this._syncStickyNav = sync;
  },

  updateControlbarSummary() {
    const el = document.getElementById("stats-controlbar-summary");
    if (!el) return;
    const rangeLabel = document.querySelector("#stats-range-chips .chip.active")?.textContent || "";
    const granLabel = document.querySelector("#stats-gran-chips .chip.active")?.textContent || "";
    el.textContent = `🔎 ${rangeLabel} · ${granLabel}`;
  },

  // D.1: Swipe zwischen den Sektionen (Zielgeraet Pixel, 412px) -- einfache
  // touchstart/touchend-Delta-Logik, kein Bibliotheks-Import.
  bindSwipeNav() {
    const el = document.getElementById("stats-sections");
    if (!el) return;
    let startX = 0, startY = 0;
    el.addEventListener("touchstart", (e) => {
      startX = e.touches[0].clientX;
      startY = e.touches[0].clientY;
    }, { passive: true });
    el.addEventListener("touchend", (e) => {
      const dx = e.changedTouches[0].clientX - startX;
      const dy = e.changedTouches[0].clientY - startY;
      if (Math.abs(dx) < 60 || Math.abs(dx) < Math.abs(dy)) return;
      const idx = STATS_SECTION_ORDER.indexOf(this.section);
      const next = STATS_SECTION_ORDER[idx + (dx < 0 ? 1 : -1)];
      if (!next) return;
      this.section = next;
      this.syncControlUI();
      this.renderSection(this.section);
    }, { passive: true });
  },

  syncControlUI() {
    document.getElementById("stats-range-chips").querySelectorAll(".chip").forEach((chip) => {
      chip.classList.toggle("active", chip.dataset.range === this.range);
    });
    document.getElementById("stats-custom-range").classList.toggle("hidden", this.range !== "custom");
    document.getElementById("stats-from").value = this.customFrom;
    document.getElementById("stats-to").value = this.customTo;
    document.getElementById("stats-gran-chips").querySelectorAll(".chip").forEach((chip) => {
      chip.classList.toggle("active", chip.dataset.gran === this.granularity);
    });
    document.getElementById("stats-section-nav").querySelectorAll(".chip").forEach((chip) => {
      chip.classList.toggle("active", chip.dataset.section === this.section);
    });
    document.querySelectorAll(".stats-section").forEach((sec) => {
      sec.classList.toggle("hidden", sec.dataset.section !== this.section);
    });
    this.updateControlbarSummary();
    this._syncStickyNav?.();
  },

  // ---- Vergleichs-Aufriss (A.4) ----
  renderSplitControls() {
    const split = this.data?.split;
    document.querySelectorAll(".split-control").forEach((el) => {
      el.innerHTML = `<label>${t("stats.splitLabel")}
        <select class="split-select">
          ${SPLIT_OPTIONS.map((o) => `<option value="${o.value}" ${o.value === this.split ? "selected" : ""}>${o.label}</option>`).join("")}
        </select>
      </label>
      ${split ? `<span class="split-n-badges">${nBadge(split.n_a)} · ${nBadge(split.n_b)}</span>` : ""}`;
      el.querySelector(".split-select").addEventListener("change", (e) => {
        this.split = e.target.value;
        this.load();
      });
      hilfe.attach(el.querySelector("label"), "analyse-aufriss");
    });
  },

  // ---- Sektionen (A.2) ----
  renderSection(section) {
    if (!this.data) return;
    const data = this.data;
    this._renderedSections?.add(section);
    if (section === "overview") this.renderOverview(data);
    if (section === "write") this.renderWriting(data);
    if (section === "lucidity") this.renderLucidity(data);
    if (section === "emotions") this.renderEmotionsSection(data);
    if (section === "experiments") this.renderExperiments(data);
    if (section === "compass") this.renderCompassSection(data);
    if (section === "review") this.renderReview();
  },

  // ---- 🏠 Überblick (D.2) ----
  renderOverview(data) {
    this.renderOverviewTiles(data);
    this.renderPinnedCards();
  },

  renderOverviewTiles(data) {
    const el = document.getElementById("overview-tiles");
    if (!el) return;
    const perBucket = data.per_bucket;
    const last = (arr, key, i = 1) => arr.length >= i ? arr[arr.length - i]?.[key] : null;

    // 🔥 Streak -- hat keine natuerliche "vorherige Bucket"-Vergleichsgroesse
    // (ein Streak ist ein laufender Zaehler, kein Messwert je Zeitfenster).
    // Statt eines nicht-aussagekraeftigen Trend-Pfeils zeigt die Kachel einen
    // 14-Tage-Praesenz-Streifen aus dem ohnehin geladenen Schreib-Kalender.
    const last14 = data.writing.heatmap.slice(-14);
    const byDate = Object.fromEntries(last14.map((h) => [h.date, h]));
    const days = [];
    for (let i = 13; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      days.push(d.toISOString().slice(0, 10));
    }
    const streakStrip = `<div class="streak-strip">${days.map((d) =>
      `<span class="streak-dot${byDate[d] ? " filled" : ""}"></span>`).join("")}</div>`;

    const dreamsTotal = perBucket.map((b) => b.total);
    const weeks = weeksInBuckets(perBucket, data.granularity);
    const perWeek = weeks > 0 ? Math.round(data.total / weeks) : null;

    const avgWordsSeries = perBucket.map((b) => b.avg_words);

    // Schlafend-Regel (wie E.6): Klartraum-Quote erst ab dem ersten Traum
    // mit Luziditaet >= 3, sonst Erinnerungs-Score als Ersatz-Kachel.
    const hasLucid = data.lucid > 0;
    let fourth;
    if (hasLucid) {
      const rateSeries = perBucket.map((b) => b.total ? Math.round((b.lucid / b.total) * 100) : null);
      fourth = {
        icon: "✨", value: `${data.lucid_rate}%`, label: t("stats.cardLucidRate"),
        series: rateSeries, color: "var(--lucid)",
        jumpSection: "lucidity", jumpTarget: "card-lucidity-dist",
      };
    } else {
      const scoreSeries = data.writing.score_per_bucket.map((s) => s.score);
      const lastScore = last(data.writing.score_per_bucket, "score");
      fourth = {
        icon: "🧮", value: lastScore != null ? lastScore : "–", label: t("stats.overviewRecallScore"),
        series: scoreSeries, color: "var(--accent)",
        jumpSection: "write", jumpTarget: "card-score",
      };
    }

    const tile = ({ icon, value, label, trend, sparkline, jumpSection, jumpTarget }) => `
      <div class="overview-tile" data-jump-section="${jumpSection}" data-jump-target="${jumpTarget}">
        <div class="overview-tile-top">
          <span class="overview-tile-icon">${icon}</span>
          <span class="overview-tile-value">${value}</span>
          ${trend ? `<span class="overview-tile-trend ${trend === "▲" ? "up" : trend === "▼" ? "down" : ""}">${trend}</span>` : ""}
        </div>
        <div class="overview-tile-label">${label}</div>
        ${sparkline}
      </div>`;

    el.innerHTML = [
      tile({
        icon: "🔥", value: data.streak, label: t("stats.cardStreak"),
        trend: "", sparkline: streakStrip,
        jumpSection: "write", jumpTarget: "card-heatmap",
      }),
      tile({
        icon: "🌙", value: perWeek != null ? perWeek : "–", label: t("stats.overviewDreamsPerWeek"),
        trend: trendArrow(last(perBucket, "total"), last(perBucket, "total", 2)),
        sparkline: sparklineSvg(dreamsTotal, { color: "var(--accent)" }),
        jumpSection: "lucidity", jumpTarget: "card-weeks",
      }),
      tile({
        icon: "✍️", value: data.writing.avg_words, label: t("stats.avgWordsPerEntry"),
        trend: trendArrow(last(perBucket, "avg_words"), last(perBucket, "avg_words", 2)),
        sparkline: sparklineSvg(avgWordsSeries, { color: "var(--accent)" }),
        jumpSection: "write", jumpTarget: "card-recall",
      }),
      tile({
        icon: fourth.icon, value: fourth.value, label: fourth.label,
        trend: trendArrow(fourth.series[fourth.series.length - 1], fourth.series[fourth.series.length - 2]),
        sparkline: sparklineSvg(fourth.series, { color: fourth.color }),
        jumpSection: fourth.jumpSection, jumpTarget: fourth.jumpTarget,
      }),
    ].join("");

    el.querySelectorAll(".overview-tile").forEach((tileEl) => {
      tileEl.addEventListener("click", () => this.jumpTo(tileEl.dataset.jumpSection, tileEl.dataset.jumpTarget));
    });
  },

  // D.2: sorgt dafuer, dass eine Karte echten Inhalt hat, bevor sie fuer die
  // Pin-Vorschau geklont wird -- noetig, weil renderXxx() sonst nur beim
  // tatsaechlichen Besuch der jeweiligen Sektion laeuft. Blendet die Sektion
  // dafuer kurz (synchron, kein Repaint dazwischen) ein, da Chart.js beim
  // Zeichnen eine echte Layout-Groesse braucht.
  ensureCardRendered(id) {
    if (CANVAS_ONLY_CARD_IDS.has(id)) return;
    const card = document.getElementById(id);
    const section = card?.closest(".stats-section")?.dataset.section;
    if (!section || this._renderedSections?.has(section)) return;
    const sectionEl = document.querySelector(`.stats-section[data-section="${section}"]`);
    const wasHidden = sectionEl?.classList.contains("hidden");
    if (wasHidden) sectionEl.classList.remove("hidden");
    this.renderSection(section);
    if (wasHidden) sectionEl.classList.add("hidden");
  },

  // D.2: "Render-Funktion wiederverwenden" -- statt eigener Kachel-Vorlagen
  // je Pin wird die bereits gerenderte Quellkarte geklont. <canvas> laesst
  // sich beim Klonen nicht als Bild mitnehmen (kein Bitmap-Transfer), daher
  // wird es entfernt; Titel/Hinweistext bleiben als Kontext erhalten.
  renderPinnedCards() {
    const container = document.getElementById("overview-pinned");
    if (!container) return;
    const pins = this.pins.filter((id) => document.getElementById(id));
    pins.forEach((id) => this.ensureCardRendered(id));

    container.innerHTML = "";
    pins.forEach((id) => {
      const source = document.getElementById(id);
      if (!source) return;
      const clone = source.cloneNode(true);
      clone.removeAttribute("id");
      clone.classList.add("overview-pinned-card");
      clone.querySelectorAll("canvas").forEach((c) => c.remove());
      clone.querySelectorAll(".card-pin-btn").forEach((b) => b.remove());

      const pinBtn = document.createElement("button");
      pinBtn.type = "button";
      pinBtn.className = "card-pin-btn pinned";
      pinBtn.title = t("stats.pinRemove");
      pinBtn.innerHTML = "📌";
      pinBtn.addEventListener("click", (e) => { e.stopPropagation(); this.togglePin(id); });
      clone.appendChild(pinBtn);

      clone.addEventListener("click", (e) => {
        if (e.target.closest(".card-pin-btn")) return;
        const section = source.closest(".stats-section")?.dataset.section;
        if (section) this.jumpTo(section, id);
      });
      container.appendChild(clone);
    });
  },

  // D.2: Tap auf Kachel/gepinnte Karte -> zugehoerige Sektion oeffnen, zur
  // Quell-Karte scrollen, kurz hervorheben (~1,5s CSS-Animation).
  jumpTo(section, targetId) {
    this.section = section;
    this.syncControlUI();
    this.renderSection(section);
    requestAnimationFrame(() => {
      const target = document.getElementById(targetId);
      if (!target) return;
      target.scrollIntoView({ behavior: "smooth", block: "start" });
      target.classList.add("jump-highlight");
      setTimeout(() => target.classList.remove("jump-highlight"), 1500);
    });
  },

  // ---- 📌 Pins (D.2) ----
  get pins() {
    try { return JSON.parse(localStorage.getItem("stats-pins") || "[]"); } catch { return []; }
  },
  set pins(v) { localStorage.setItem("stats-pins", JSON.stringify(v)); },

  togglePin(id) {
    const pins = this.pins;
    const i = pins.indexOf(id);
    if (i === -1) pins.push(id); else pins.splice(i, 1);
    this.pins = pins;
    this.syncPinButtons();
    if (this.section === "overview") this.renderPinnedCards();
  },

  syncPinButtons() {
    const pins = this.pins;
    PINNABLE_CARD_IDS.forEach((id) => {
      const btn = document.querySelector(`#${id} > .card-pin-btn`);
      if (!btn) return;
      const pinned = pins.includes(id);
      btn.classList.toggle("pinned", pinned);
      btn.title = pinned ? t("stats.pinRemove") : t("stats.pinAdd");
    });
  },

  bindPinButtons() {
    PINNABLE_CARD_IDS.forEach((id) => {
      const card = document.getElementById(id);
      if (!card || card.querySelector(":scope > .card-pin-btn")) return;
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "card-pin-btn";
      btn.innerHTML = "📌";
      btn.addEventListener("click", (e) => {
        e.stopPropagation();
        this.togglePin(id);
      });
      card.appendChild(btn);
    });
    this.syncPinButtons();
  },

  renderCards(data) {
    document.getElementById("stat-cards").innerHTML = `
      <div class="stat-card"><div class="value">${data.total}</div><div class="label">${t("stats.cardEntries")}</div></div>
      <div class="stat-card"><div class="value gold">${data.lucid}</div><div class="label">${t("stats.cardLucidDreams")}</div></div>
      <div class="stat-card"><div class="value">${data.lucid_rate}%</div><div class="label">${t("stats.cardLucidRate")}</div></div>
      <div class="stat-card"><div class="value">${data.streak} 🔥</div><div class="label">${t("stats.cardStreak")}</div></div>`;
  },

  // ---- ✍️ Schreiben (A.3) ----
  renderWriting(data) {
    const split = data.split;
    const writing = split ? null : data.writing;
    this.renderWritingHeadline(split ? null : data.writing, split);
    this.renderRecall(split ? null : data.per_bucket, split);
    this.renderHeatmap(split ? data.writing.heatmap : data.writing.heatmap);
    this.renderHistogram(data.writing.histogram);
    this.renderDetailChart(data.writing.detail_depth_per_bucket);
    this.renderScoreChart(data.writing.score_per_bucket);
  },

  renderWritingHeadline(writing, split) {
    const el = document.getElementById("writing-headline-cards");
    if (split) {
      const w = data_or(this.data.split.writing_a), v = data_or(this.data.split.writing_b);
      el.innerHTML = `<div class="stat-card"><div class="value gold">${w.total_words}</div>
          <div class="label">${t("stats.wordsSplit", { label: escapeHtml(this.data.split.label_a), n: this.data.split.n_a })}</div></div>
        <div class="stat-card"><div class="value">${v.total_words}</div>
          <div class="label">${t("stats.wordsSplit", { label: escapeHtml(this.data.split.label_b), n: this.data.split.n_b })}</div></div>`;
      return;
    }
    const w = writing;
    const trendArrow = w.trend.delta_pct == null ? "" : (w.trend.delta_pct >= 0 ? "▲" : "▼");
    el.innerHTML = `
      <div class="stat-card"><div class="value gold">${w.total_words.toLocaleString(localeForLang())}</div><div class="label">${t("stats.wordsInJournal")}</div></div>
      <div class="stat-card"><div class="value">${w.avg_words}</div><div class="label">${t("stats.avgWordsPerEntry")}</div></div>
      <div class="stat-card"><div class="value">${w.median_words}</div><div class="label">${t("stats.medianWordsPerEntry")}</div></div>
      ${w.longest ? `<div class="stat-card"><div class="value">${w.longest.words}</div><div class="label">${t("stats.longestDream", { title: escapeHtml(w.longest.title) })}</div></div>` : ""}
      <div class="stat-card"><div class="value">${trendArrow} ${w.trend.delta_pct == null ? "–" : w.trend.delta_pct + "%"}</div><div class="label">${t("stats.trendLabel")}</div></div>`;
  },

  renderRecall(perBucket, split) {
    if (split) {
      const a = this.data.split.per_bucket_a, b = this.data.split.per_bucket_b;
      this.makeChart("chart-recall", {
        type: "line",
        data: {
          labels: this.mergedBuckets(a, b),
          datasets: [
            { label: this.data.split.label_a, data: this.alignSeries(a, "avg_words"), borderColor: "#f5c66a", backgroundColor: "rgba(245,198,106,.15)", tension: 0.3 },
            { label: this.data.split.label_b, data: this.alignSeries(b, "avg_words"), borderColor: "#8fd49a", backgroundColor: "rgba(143,212,154,.15)", tension: 0.3 },
          ],
        },
        options: this.baseOptions(),
      });
      return;
    }
    const movingAvg = perBucket.map((_, i) => {
      const window = perBucket.slice(Math.max(0, i - 4), i + 1);
      return Math.round(window.reduce((s, w) => s + w.avg_words, 0) / window.length);
    });
    this.makeChart("chart-recall", {
      type: "line",
      data: {
        labels: perBucket.map((w) => w.bucket),
        datasets: [
          { label: t("stats.avgWordsDataset"), data: perBucket.map((w) => w.avg_words), borderColor: "#8fd49a", backgroundColor: "rgba(143, 212, 154, 0.15)", fill: true, tension: 0.3, borderWidth: 1 },
          { label: t("stats.movingAvgDataset"), data: movingAvg, borderColor: "#f5c66a", borderWidth: 3, tension: 0.3, pointRadius: 0 },
        ],
      },
      options: this.baseOptions(),
    });
  },

  mergedBuckets(a, b) {
    return [...new Set([...a.map((x) => x.bucket), ...b.map((x) => x.bucket)])].sort();
  },
  alignSeries(series, field) {
    const map = Object.fromEntries(series.map((s) => [s.bucket, s[field]]));
    return this.mergedBuckets(series, series).map((k) => map[k] ?? null);
  },

  renderHeatmap(heatmap) {
    const el = document.getElementById("writing-heatmap");
    const byDate = Object.fromEntries(heatmap.map((h) => [h.date, h]));
    const maxWords = Math.max(1, ...heatmap.map((h) => h.words));
    const today = new Date();
    const days = [];
    for (let i = 181; i >= 0; i--) {
      const d = new Date(today);
      d.setDate(d.getDate() - i);
      days.push(d.toISOString().slice(0, 10));
    }
    // Grid mit 7 Reihen (Wochentag), Spalten = Wochen
    const firstDow = (new Date(days[0]).getDay() + 6) % 7; // Mo=0
    const cells = Array(firstDow).fill(null).concat(days);
    el.innerHTML = cells.map((date) => {
      if (!date) return `<div class="heatmap-cell empty"></div>`;
      const entry = byDate[date];
      const pct = entry ? Math.max(0.15, entry.words / maxWords) : 0;
      const title = entry ? t("stats.heatmapTooltipEntry", { date, words: entry.words, title: entry.title }) : t("stats.heatmapTooltipEmpty", { date });
      return `<div class="heatmap-cell" title="${escapeHtml(title)}"
        style="background:${entry ? `rgba(143,212,154,${pct})` : "var(--bg-input)"}"></div>`;
    }).join("");
  },

  renderHistogram(histogram) {
    this.makeChart("chart-histogram", {
      type: "bar",
      data: {
        labels: histogram.map((h) => h.bucket),
        datasets: [{ label: t("stats.cardEntries"), data: histogram.map((h) => h.count), backgroundColor: "#c9bfff" }],
      },
      options: this.baseOptions({ y: { ticks: { stepSize: 1 } } }),
    });
  },

  renderDetailChart(detail) {
    this.makeChart("chart-detail", {
      type: "line",
      data: {
        labels: detail.map((d) => d.bucket),
        datasets: [{ label: t("stats.avgTaggedDataset"), data: detail.map((d) => d.avg_detail), borderColor: "#8b7ff5", backgroundColor: "rgba(139,127,245,.15)", fill: true, tension: 0.3 }],
      },
      options: this.baseOptions(),
    });
  },

  renderScoreChart(score) {
    this.makeChart("chart-score", {
      type: "line",
      data: {
        labels: score.map((s) => s.bucket),
        datasets: [{ label: t("stats.recallScoreDataset"), data: score.map((s) => s.score), borderColor: "#f5c66a", backgroundColor: "rgba(245,198,106,.15)", fill: true, tension: 0.3 }],
      },
      options: this.baseOptions({ y: { max: 100 } }),
    });
  },

  // ---- ✨ Luzidität ----
  renderLucidity(data) {
    this.renderIncubation(data.incubation);
    this.renderPhenomena(data.phenomena);
    if (data.split) {
      const a = data.split.per_bucket_a, b = data.split.per_bucket_b;
      this.makeChart("chart-weeks", {
        type: "bar",
        data: {
          labels: this.mergedBuckets(a, b),
          datasets: [
            { label: `${t("stats.cardLucidDreams")} · ${data.split.label_a}`, data: this.alignSeries(a, "lucid"), backgroundColor: "#f5c66a" },
            { label: `${t("stats.cardLucidDreams")} · ${data.split.label_b}`, data: this.alignSeries(b, "lucid"), backgroundColor: "#8b7ff5" },
          ],
        },
        options: this.baseOptions({ y: { ticks: { stepSize: 1 } } }),
      });
    } else {
      this.renderWeeks(data.per_bucket);
    }
    this.renderLucidityChart(data.lucidity_distribution);
  },

  renderIncubation(incubation) {
    const card = document.getElementById("incubation-card");
    if (!incubation || incubation.total === 0) {
      card.classList.add("hidden");
      return;
    }
    card.classList.remove("hidden");
    document.getElementById("incubation-stats").innerHTML = `
      <div class="stat-card"><div class="value">${incubation.total}</div><div class="label">${t("stats.incubationTotal")}</div></div>
      <div class="stat-card"><div class="value gold">${incubation.fulfilled}</div><div class="label">${t("stats.incubationFulfilled")}</div></div>
      <div class="stat-card"><div class="value">${incubation.rate}%</div><div class="label">${t("stats.incubationRate")}</div></div>`;
  },

  renderPhenomena(phenomena) {
    const card = document.getElementById("phenomena-card");
    const total = phenomena ? Object.values(phenomena.counts).reduce((a, b) => a + b, 0) : 0;
    if (!total) {
      card.classList.add("hidden");
      return;
    }
    card.classList.remove("hidden");
    const labels = Object.fromEntries(PHENOMENA.map((p) => [p.field, p]));
    document.getElementById("phenomena-stats").innerHTML = Object.entries(phenomena.counts)
      .filter(([, count]) => count > 0)
      .map(([key, count]) => `<div class="stat-card"><div class="value">${count}</div><div class="label">${labels[key].icon} ${labels[key].label}</div></div>`)
      .join("");
    document.getElementById("phenomena-hints").innerHTML = (phenomena.hints || [])
      .map((h) => `<p class="hint">💡 ${escapeHtml(h)}</p>`)
      .join("");
  },

  renderWeeks(perBucket) {
    this.makeChart("chart-weeks", {
      type: "bar",
      data: {
        labels: perBucket.map((w) => w.bucket),
        datasets: [
          { label: t("stats.totalDreamsDataset"), data: perBucket.map((w) => w.total), backgroundColor: "#8b7ff5" },
          { label: t("stats.lucidDreamsDataset"), data: perBucket.map((w) => w.lucid), backgroundColor: "#f5c66a" },
        ],
      },
      options: this.baseOptions({ y: { ticks: { stepSize: 1 } } }),
    });
  },

  renderLucidityChart(distribution) {
    this.makeChart("chart-lucidity", {
      type: "doughnut",
      data: {
        labels: [0, 1, 2, 3, 4].map((i) => t(`stats.lucidityDist.${i}`)),
        datasets: [{
          data: distribution,
          backgroundColor: ["#3a3c55", "#565a80", "#8b7ff5", "#e0b25a", "#f5c66a"],
          borderWidth: 0,
        }],
      },
      options: { plugins: { legend: { position: "bottom", labels: { color: "#9d9ab5" } } } },
    });
  },

  // ---- 💛 Gefühle (A.5) ----
  renderEmotionsSection(data) {
    const emotions = data.split
      ? (this.splitEmotionsChoice || "a") === "a" ? data.split.emotions_analysis_a : data.split.emotions_analysis_b
      : data.emotions_analysis;
    this.renderEmotions(emotions);
  },

  renderEmotions(emotions) {
    const section = document.getElementById("emotion-section");
    if (!emotions || !emotions.distribution.length) {
      section.classList.add("hidden");
      return;
    }
    section.classList.remove("hidden");

    const dist = emotions.distribution;
    document.getElementById("emotion-distribution").innerHTML = `<div class="emotion-bars">
      ${dist.map((d) => {
        const e = EMOTIONS[d.emotion] || { icon: "?", label: d.emotion, color: "#888" };
        const pct = Math.round(d.count / dist[0].count * 100);
        return `<div class="emotion-bar-row">
          <span class="emotion-bar-label">${e.icon} ${e.label}</span>
          <div class="emotion-bar-track"><div class="emotion-bar-fill" style="width:${pct}%;background:${e.color}"></div></div>
          <span class="emotion-bar-count">${d.count}×</span>
        </div>`;
      }).join("")}
    </div>`;

    this.makeChart("chart-emotions-time", {
      type: "line",
      data: {
        labels: emotions.over_time.map((r) => r.bucket),
        datasets: [...emotions.top_emotions, "andere"].map((key) => {
          const e = EMOTIONS[key] || { icon: "🔘", label: key === "andere" ? t("stats.otherEmotion") : key, color: "#888" };
          return {
            label: `${e.icon} ${e.label}`,
            data: emotions.over_time.map((r) => r[key] || 0),
            backgroundColor: e.color, borderColor: e.color,
            fill: true, tension: 0.25, pointRadius: 0,
          };
        }),
      },
      options: {
        ...this.baseOptions(),
        scales: { x: this.baseOptions().scales.x, y: { ...this.baseOptions().scales.y, stacked: true } },
        interaction: { mode: "index" },
      },
    });

    const valEl = document.getElementById("emotion-valence");
    const legendHint = Object.entries(emotions.valence.legend)
      .map(([e, v]) => `${(EMOTIONS[e] || {}).icon || "?"} ${e} → ${v}`).join(", ");
    valEl.innerHTML = `<h3 style="margin-top:1rem">${t("stats.valenceTitle")}</h3>
      <p class="hint">${t("stats.valenceText")} <strong>${emotions.valence.current_month_positive_share ?? "–"}${emotions.valence.current_month_positive_share != null ? "%" : ""}</strong>
        <span title="${escapeHtml(legendHint)}"> 💡</span></p>
      <div class="corr-grid" style="grid-template-columns:repeat(${Math.max(emotions.valence.over_time.length, 1)},1fr)">
        ${emotions.valence.over_time.map((v) => `<div class="corr-cell">
          <div class="corr-bar" style="height:${Math.max(v.positive_share || 4, 4)}%;background:var(--lucid)"></div>
          <span class="corr-label">${v.bucket}</span>
          <span class="corr-value">${v.positive_share ?? "–"}${v.positive_share != null ? "%" : ""}</span>
        </div>`).join("")}
      </div>`;

    const lqEl = document.getElementById("emotion-lucid-quote");
    lqEl.innerHTML = emotions.lucid_quote.length ? `<h3 style="margin-top:1rem">${t("stats.lucidQuoteTitle")}</h3>
      <p class="hint">${t("stats.lucidQuoteHint")}</p>
      <div class="emotion-bars">
        ${emotions.lucid_quote.map((q) => {
          const e = EMOTIONS[q.emotion] || { icon: "?", label: q.emotion, color: "#888" };
          return `<div class="emotion-bar-row">
            <span class="emotion-bar-label">${e.icon} ${e.label}</span>
            <div class="emotion-bar-track"><div class="emotion-bar-fill" style="width:${q.rate}%;background:${e.color}"></div></div>
            <span class="emotion-bar-count">${q.rate}%</span>
          </div>`;
        }).join("")}
      </div>` : "";

    const pairsEl = document.getElementById("emotion-pairs");
    pairsEl.innerHTML = emotions.top_pairs.length ? `<h3 style="margin-top:1rem">${t("stats.pairsTitle")}</h3>
      <ul class="hint" style="list-style:none;padding:0">
        ${emotions.top_pairs.map((p) => {
          const a = EMOTIONS[p.a] || { icon: "?", label: p.a }, b = EMOTIONS[p.b] || { icon: "?", label: p.b };
          return `<li>${a.icon} ${a.label} + ${b.icon} ${b.label}: ${p.count}×</li>`;
        }).join("")}
      </ul>` : "";

    const matrix = document.getElementById("emotion-place-matrix");
    const entries = Object.entries(emotions.place_matrix).filter(([, places]) => places.length > 0);
    matrix.innerHTML = entries.length ? `<h3 style="margin-top:1rem">${t("stats.placeMatrixTitle")}</h3>
        <p class="hint">${t("stats.placeMatrixHint")}</p>
        ${entries.map(([emo, places]) => {
          const e = EMOTIONS[emo] || { icon: "?", label: emo };
          return `<div class="emotion-matrix-row">
            <span>${e.icon} ${e.label}</span>
            <span class="hint">→ ${places.map((p) => `${escapeHtml(p.place)} (${p.count}×)`).join(", ")}</span>
          </div>`;
        }).join("")}` : "";

    const combosEl = document.getElementById("emotion-combos");
    const placeCombos = emotions.top_place_combos.map((c) => {
      const e = EMOTIONS[c.emotion] || { icon: "?", label: c.emotion };
      return `<li>${t("stats.comboPlaceTemplate", { emo: `${e.icon} ${e.label}`, place: escapeHtml(c.place), count: c.count })}</li>`;
    });
    const personCombos = emotions.top_person_combos.map((c) => {
      const e = EMOTIONS[c.emotion] || { icon: "?", label: c.emotion };
      return `<li>${t("stats.comboPersonTemplate", { emo: `${e.icon} ${e.label}`, person: escapeHtml(c.person), count: c.count })}</li>`;
    });
    combosEl.innerHTML = (placeCombos.length || personCombos.length) ? `<h3 style="margin-top:1rem">${t("stats.combosTitle")}</h3>
      <ul class="hint" style="list-style:none;padding:0">${[...placeCombos, ...personCombos].join("")}</ul>` : "";
  },

  // ---- 🔬 Experimente ----
  renderExperiments(data) {
    this.renderBeifuss(data.beifuss);
    this.renderSleepAnalysis(data.sleep);
    this.renderConnections();
    this.renderCorrelations(data.correlations);
  },

  // E.1: Verbindungs-Analyse (Co-Occurrence) — eigener Endpoint, respektiert
  // (anders als die Schlaf-Terzile) den Zeitraum-Filter der Seite.
  async renderConnections() {
    const elEl = document.getElementById("connections-elements");
    const emoEl = document.getElementById("connections-emotions");
    const range = this.computeFromTo();
    let data;
    try {
      data = await api.statsConnections({ from: range.from, to: range.to });
    } catch {
      elEl.innerHTML = "";
      emoEl.innerHTML = "";
      return;
    }

    const bar = (label, n, maxN, onClick) => `<div class="connection-row"${onClick ? ' style="cursor:pointer"' : ""}>
      <span class="connection-label">${label}</span>
      <span class="connection-bar"><span class="connection-bar-fill" style="width:${Math.max(Math.round((n / maxN) * 100), 6)}%"></span></span>
      <span class="connection-count">${n}×</span>
    </div>`;

    if (!data.element_pairs.length) {
      elEl.innerHTML = `<p class="hint">${t("stats.connectionsEmpty")}</p>`;
    } else {
      const pairs = data.element_pairs.slice(0, 10);
      const maxN = Math.max(...pairs.map((p) => p.n));
      elEl.innerHTML = pairs.map((p, i) => {
        const label = `${atlas.ICONS[p.a.kind] || ""} ${escapeHtml(p.a.name)} × ${atlas.ICONS[p.b.kind] || ""} ${escapeHtml(p.b.name)}`;
        return `<div data-pair-idx="${i}">${bar(label, p.n, maxN, true)}</div>`;
      }).join("");
      elEl.querySelectorAll("[data-pair-idx]").forEach((row) => {
        const p = pairs[Number(row.dataset.pairIdx)];
        row.addEventListener("click", () => journal.filterByPair(p.a, p.b));
      });
    }

    if (data.emotion_elements.length) {
      const combos = data.emotion_elements.slice(0, 10);
      const maxN = Math.max(...combos.map((c) => c.n));
      emoEl.innerHTML = `<h3>${t("stats.connectionsEmotionsTitle")}</h3>` + combos.map((c) => {
        const emo = EMOTIONS[c.emotion];
        const label = `${emo?.icon || ""} ${emo?.label || c.emotion} × ${atlas.ICONS[c.element.kind] || ""} ${escapeHtml(c.element.name)}`;
        return bar(label, c.n, maxN, false);
      }).join("");
    } else {
      emoEl.innerHTML = "";
    }
  },

  // N.3: Terzil-Analyse Schlafdauer x Erinnerung — immer über alle Nächte
  // gerechnet (nicht vom Zeitraum-Filter der Seite abhängig, s. Backend).
  renderSleepAnalysis(sleep) {
    const el = document.getElementById("sleep-analysis");
    if (!sleep.available) {
      el.innerHTML = `<p class="hint">${t("stats.sleepTooFew", { n: sleep.n_total })}</p>`;
      return;
    }
    const groups = [
      { key: "kurz", label: t("stats.sleepShortLabel") },
      { key: "mittel", label: t("stats.sleepMediumLabel") },
      { key: "lang", label: t("stats.sleepLongLabel") },
    ];
    const maxWords = Math.max(...groups.map((g) => sleep[g.key].avg_words), 1);

    const bars = (valueFn, pctFn, color, isRate) => groups.map((g) => {
      const s = sleep[g.key];
      const lowN = s.n_dreams < 3;
      const pct = pctFn(s);
      const valueText = isRate ? rateOrDash(valueFn(s), s.n_dreams) : valueFn(s);
      return `<div class="corr-cell ${lowN ? "low-n" : ""}" title="n=${s.n_dreams}">
        <div class="corr-bar" style="height:${Math.max(pct, 4)}%;background:${lowN ? "var(--bg-input)" : color}"></div>
        <span class="corr-label">${g.label}</span>
        <span class="corr-value">${valueText}</span>
      </div>`;
    }).join("");

    el.innerHTML = `
      <h3>${t("stats.avgWordsDataset")} ${nBadge(sleep.n_total)}</h3>
      <div class="corr-grid corr-3">${bars((s) => s.avg_words, (s) => Math.round((s.avg_words / maxWords) * 100), "var(--accent)", false)}</div>
      <h3>${t("stats.cardLucidRate")}</h3>
      <div class="corr-grid corr-3">${bars((s) => s.lucid_rate + "%", (s) => s.lucid_rate, "var(--lucid)", true)}</div>
      <p class="hint">${t("stats.sleepFooter", { total: sleep.n_total, estimated: sleep.n_estimated, unknown: sleep.n_unknown })}</p>
      <p class="hint">${t("stats.sleepDisclaimer")}</p>`;
  },

  renderBeifuss(beifuss) {
    const el = document.getElementById("beifuss-compare");
    if (!beifuss.with.count) {
      el.innerHTML = `<p class="hint">${t("stats.beifussEmpty")}</p>`;
      return;
    }
    const fmt = (g) => rateOrDash(g.lucid_rate == null ? "–" : g.lucid_rate + "%", g.count);
    const nightNoun = (count) => count === 1 ? t("stats.nightOne") : t("stats.nightMany");
    el.innerHTML = `<div class="stat-cards">
        <div class="stat-card"><div class="value gold">${fmt(beifuss.with)}</div>
          <div class="label">${t("stats.beifussWithLabel", { count: beifuss.with.count, noun: nightNoun(beifuss.with.count) })} ${nBadge(beifuss.with.count)}</div></div>
        <div class="stat-card"><div class="value">${fmt(beifuss.without)}</div>
          <div class="label">${t("stats.beifussWithoutLabel", { count: beifuss.without.count, noun: nightNoun(beifuss.without.count) })} ${nBadge(beifuss.without.count)}</div></div>
      </div>
      ${beifuss.with.count < 5 ? `<p class="hint">${t("stats.beifussLowN")}</p>` : ""}`;
  },

  renderCorrelations(corr) {
    const section = document.getElementById("correlation-section");
    if (!corr) { section.classList.add("hidden"); return; }

    const hasWeekday = corr.weekday.some((d) => d.total > 0);
    const hasSleep = corr.sleep_quality.some((d) => d.total > 0);
    if (!hasWeekday && !hasSleep) { section.classList.add("hidden"); return; }
    section.classList.remove("hidden");

    const wdEl = document.getElementById("correlation-weekday");
    if (hasWeekday) {
      const totalAll = corr.weekday.reduce((s, d) => s + d.total, 0);
      wdEl.innerHTML = `<h3>${t("stats.weekdayTitle")} ${nBadge(totalAll)}</h3>
        <div class="corr-grid">
          ${corr.weekday.map((d) => {
            const rate = d.total ? Math.round(d.lucid / d.total * 100) : 0;
            return `<div class="corr-cell ${d.total < 3 ? "low-n" : ""}" title="n=${d.total}">
              <div class="corr-bar" style="height:${Math.max(rate, 4)}%;background:${rate > 0 ? "var(--lucid)" : "var(--bg-input)"}"></div>
              <span class="corr-label">${d.day}</span>
              <span class="corr-value">${rateOrDash(rate + "%", d.total)}</span>
            </div>`;
          }).join("")}
        </div>
        <p class="hint">${t("stats.weekdayHint", { count: totalAll })}</p>`;
    }

    const sqEl = document.getElementById("correlation-sleep");
    if (hasSleep) {
      const totalAllSq = corr.sleep_quality.reduce((s, d) => s + d.total, 0);
      sqEl.innerHTML = `<h3>${t("stats.sleepTitle")} ${nBadge(totalAllSq)}</h3>
        <div class="corr-grid corr-5">
          ${corr.sleep_quality.map((d) => {
            const rate = d.total ? Math.round(d.lucid / d.total * 100) : 0;
            return `<div class="corr-cell ${d.total < 3 ? "low-n" : ""}" title="n=${d.total}">
              <div class="corr-bar" style="height:${Math.max(rate, 4)}%;background:${rate > 0 ? "var(--accent)" : "var(--bg-input)"}"></div>
              <span class="corr-label">Q${d.quality}</span>
              <span class="corr-value">${rateOrDash(rate + "%", d.total)}</span>
            </div>`;
          }).join("")}
        </div>
        <p class="hint">${t("stats.sleepHint")}</p>`;
    }
  },

  // ---- 🧭 Kompass ----
  renderCompassSection(data) {
    this.renderCompass(data.compass);
    this.renderMission(data);
    this.renderSorter();
    this.renderSigns(data.top_dream_signs);
    this.renderNewElements(data.new_elements);
  },

  renderNewElements(newElements) {
    const el = document.getElementById("new-elements-list");
    if (!newElements || !newElements.length) {
      el.innerHTML = `<p class="hint">${t("stats.newElementsEmpty")}</p>`;
      return;
    }
    const icons = { dream_sign: "🔮", place: "📍", person: "👤", tag: "🏷️" };
    el.innerHTML = newElements
      .map((e) => `<span class="badge">${icons[e.kind] || ""} ${escapeHtml(e.name)}</span>`)
      .join("");
  },

  renderCompass(compass) {
    const keys = Object.keys(COMPASS);
    this.makeChart("chart-compass", {
      type: "radar",
      data: {
        labels: keys.map((k) => `${COMPASS[k].icon} ${COMPASS[k].label}`),
        datasets: [{
          label: t("stats.compassDataset"),
          data: keys.map((k) => compass[k]),
          backgroundColor: "rgba(139, 127, 245, 0.25)",
          borderColor: "#8b7ff5",
          pointBackgroundColor: "#f5c66a",
        }],
      },
      options: {
        plugins: { legend: { display: false } },
        scales: {
          r: {
            beginAtZero: true,
            ticks: { stepSize: 1, display: false },
            grid: { color: "#2a2c44" },
            angleLines: { color: "#2a2c44" },
            pointLabels: { color: "#e8e6f0", font: { size: 12 } },
          },
        },
      },
    });
  },

  renderMission(data) {
    const el = document.getElementById("mission");
    const keys = Object.keys(COMPASS);
    const total = keys.reduce((sum, k) => sum + data.compass[k], 0);

    if (!total) {
      el.innerHTML = `<div class="mission-card">${t("stats.missionEmpty")}</div>`;
      return;
    }
    const dominant = keys.reduce((a, b) => (data.compass[a] >= data.compass[b] ? a : b));
    const c = COMPASS[dominant];
    const focus = data.focus_sign
      ? `<p>${t("stats.missionFocusSign", { name: escapeHtml(data.focus_sign.name), count: data.focus_sign.count })}</p>`
      : "";
    el.innerHTML = `<div class="mission-card">
      <h3>${c.icon} ${t("stats.missionTitle")}</h3>
      <p>${t("stats.missionLeaning", { label: c.label, hint: c.hint.toLowerCase() })}</p>
      <p>👉 ${c.mission}</p>
      ${focus}
    </div>`;
  },

  async renderSorter() {
    const el = document.getElementById("compass-sorter");
    const tags = await api.listTags().catch(() => []);
    const unsorted = tags.filter((t) => t.kind === "dream_sign" && !t.category && t.count > 0);
    if (!unsorted.length) {
      el.innerHTML = "";
      return;
    }
    const noun = unsorted.length === 1 ? t("stats.sorterNounOne") : t("stats.sorterNounMany");
    const verb = unsorted.length === 1 ? t("stats.sorterVerbOne") : t("stats.sorterVerbMany");
    const pronoun = unsorted.length === 1 ? t("stats.sorterPronounOne") : t("stats.sorterPronounMany");
    el.innerHTML = `
      <p class="hint">${t("stats.sorterHint", { count: unsorted.length, noun, verb, pronoun })}</p>
      <div class="sorter-chips">
        ${unsorted.map((t) => `<button class="badge sign sorter-chip" data-id="${t.id}"
          data-name="${escapeHtml(t.name)}">🔮 ${escapeHtml(t.name)} (${t.count}×)</button>`).join("")}
      </div>
      <div id="sorter-picker" class="hidden"></div>`;

    el.querySelectorAll(".sorter-chip").forEach((chip) => {
      chip.addEventListener("click", () => this.openPicker(chip.dataset.id, chip.dataset.name));
    });
  },

  openPicker(tagId, name) {
    const picker = document.getElementById("sorter-picker");
    picker.classList.remove("hidden");
    picker.innerHTML = `
      <p>${t("stats.pickerPrompt", { name: `<strong>${name}</strong>` })}</p>
      <div class="picker-grid">
        ${Object.entries(COMPASS).map(([key, c]) => `
          <button class="picker-btn" data-cat="${key}">
            <span class="picker-icon">${c.icon}</span>
            <strong>${c.label}</strong>
            <small>${c.hint}</small>
          </button>`).join("")}
      </div>`;
    picker.querySelectorAll(".picker-btn").forEach((btn) => {
      btn.addEventListener("click", async () => {
        try {
          await api.setTagCategory(tagId, btn.dataset.cat);
          showToast(t("stats.categorySorted", { icon: COMPASS[btn.dataset.cat].icon, name }));
          this.load();
        } catch (err) {
          showToast(err.message);
        }
      });
    });
  },

  renderSigns(signs) {
    this.makeChart("chart-signs", {
      type: "bar",
      data: {
        labels: signs.map((s) => s.name),
        datasets: [{ label: t("stats.signsDataset"), data: signs.map((s) => s.count), backgroundColor: "#c9bfff" }],
      },
      options: this.baseOptions({ x: { ticks: { stepSize: 1 } } }, "y"),
    });
  },

  // ---- 🌗 Rückblick ----
  async renderReview() {
    await this.renderArchetypeFigures();
    const mc = document.getElementById("mandala-card");
    if (mc) await mandala.render(mc);
  },

  // ---- 🌗 Deine inneren Figuren (H.3: Bezug Lexikon ↔ eigene Analyse) ----
  async renderArchetypeFigures() {
    const el = document.getElementById("archetype-bars");
    if (!el) return;
    let figures;
    try {
      figures = await api.getInnenwelt();
    } catch {
      el.innerHTML = "";
      return;
    }
    const withArch = figures.filter((f) => f.archetype);
    document.getElementById("archetype-detail").innerHTML = "";
    if (!withArch.length) {
      el.innerHTML = `<p class="hint">${t("stats.archetypeEmpty")}</p>`;
      return;
    }

    const groups = {};
    withArch.forEach((f) => {
      const g = (groups[f.archetype] = groups[f.archetype] || { figures: [], dreamCount: 0, emotions: {}, lastDate: null });
      g.figures.push(f);
      g.dreamCount += f.count;
      Object.entries(f.emotions || {}).forEach(([e, c]) => { g.emotions[e] = (g.emotions[e] || 0) + c; });
      if (!g.lastDate || f.last_date > g.lastDate) g.lastDate = f.last_date;
    });

    const entries = Object.entries(groups).sort((a, b) => b[1].figures.length - a[1].figures.length);
    const maxCount = Math.max(...entries.map(([, g]) => g.figures.length));

    el.innerHTML = `<div class="emotion-bars">
      ${entries.map(([key, g]) => {
        const a = atlas.ARCHETYPES[key] || { icon: "❔", label: key };
        const pct = Math.round(g.figures.length / maxCount * 100);
        return `<div class="emotion-bar-row archetype-bar-row" data-arch="${key}">
          <span class="emotion-bar-label">${a.icon} ${a.label}</span>
          <div class="emotion-bar-track"><div class="emotion-bar-fill" style="width:${pct}%;background:var(--accent)"></div></div>
          <span class="emotion-bar-count">${g.figures.length}×</span>
        </div>`;
      }).join("")}
    </div>`;

    el.querySelectorAll(".archetype-bar-row").forEach((row) => {
      row.addEventListener("click", () => this.showArchetypeDetail(row.dataset.arch, groups[row.dataset.arch]));
    });
  },

  showArchetypeDetail(key, group) {
    const el = document.getElementById("archetype-detail");
    const a = atlas.ARCHETYPES[key] || { icon: "❔", label: key };
    const lex = ARCHETYPE_LEXICON.find((x) => x.key === key);
    const topEmos = Object.entries(group.emotions).sort((x, y) => y[1] - x[1]).slice(0, 3)
      .map(([e]) => EMOTIONS[e]?.icon || e).join(" ");

    el.innerHTML = `<div class="archetype-detail-panel">
      <div class="archetype-detail-lexicon">
        <h4>${a.icon} ${a.label}</h4>
        ${lex ? `<p>${lex.kern}</p><p class="hint"><em>${lex.frage}</em></p>` : ""}
      </div>
      <div class="archetype-detail-own">
        <p><strong>${t("stats.archetypeYours")}</strong> ${group.figures.length} ${group.figures.length === 1 ? t("stats.figureOne") : t("stats.figureMany")}
          (${group.figures.map((f) => `<button class="archetype-figure-link">${escapeHtml(f.name)}</button>`).join(", ")})
          · ${group.dreamCount} ${group.dreamCount === 1 ? t("stats.dreamOne") : t("stats.dreamMany")}
          ${topEmos ? ` · ${t("stats.topEmotionsPrefix")} ${topEmos}` : ""}
          · ${t("stats.lastOn")} ${formatDate(group.lastDate)}</p>
      </div>
    </div>`;

    el.querySelectorAll(".archetype-figure-link").forEach((btn, i) => {
      btn.addEventListener("click", () => {
        const fig = group.figures[i];
        document.querySelector('[data-tab="atlas"]').click();
        document.querySelector('[data-view="innenwelt"]').click();
        setTimeout(() => innenwelt.showDossier(fig), 250);
      });
    });
  },

  makeChart(id, config) {
    const canvas = document.getElementById(id);
    if (!canvas) return;
    if (this.charts[id]) this.charts[id].destroy();
    this.charts[id] = new Chart(canvas, config);
  },

  async downloadExport(format) {
    try {
      const res = await fetch(`/api/export?format=${format}`, {
        headers: auth.token ? { Authorization: `Bearer ${auth.token}` } : {},
      });
      if (!res.ok) throw new Error(t("stats.exportFailed", { status: res.status }));
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `klartraum-export-${todayISO()}.${format}`;
      a.click();
      URL.revokeObjectURL(url);
      showToast(t("stats.exportDownloaded"));
    } catch (err) {
      showToast(err.message);
    }
  },

  baseOptions(scaleOverrides = {}, indexAxis = "x") {
    const axis = { grid: { color: "#2a2c44" }, ticks: { color: "#9d9ab5" } };
    return {
      indexAxis,
      plugins: { legend: { labels: { color: "#9d9ab5" } } },
      scales: {
        x: { ...axis, ...(scaleOverrides.x || {}) },
        y: { ...axis, beginAtZero: true, ...(scaleOverrides.y || {}) },
      },
    };
  },
};

function data_or(w) {
  return w || { total_words: 0 };
}

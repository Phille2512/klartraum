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

const stats = {
  charts: {},
  data: null,
  bound: false,

  // ---- Steuerzeile (A.1) ----
  get range() { return localStorage.getItem("stats-range") || "all"; },
  set range(v) { localStorage.setItem("stats-range", v); },
  get granularity() { return localStorage.getItem("stats-granularity") || "week"; },
  set granularity(v) { localStorage.setItem("stats-granularity", v); },
  get section() { return localStorage.getItem("stats-section") || "write"; },
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

    this.syncControlUI();
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
    if (section === "write") this.renderWriting(data);
    if (section === "sleep") this.renderSleepSection(data);
    if (section === "lucidity") this.renderLucidity(data);
    if (section === "emotions") this.renderEmotionsSection(data);
    if (section === "experiments") this.renderExperiments(data);
    if (section === "compass") this.renderCompassSection(data);
    if (section === "review") this.renderReview();
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
    this.renderHeatmap(split ? null : data.writing.heatmap);
    this.renderHistogram(split ? null : data.writing.histogram);
    this.renderDetailChart(split ? null : data.writing.detail_depth_per_bucket);
    this.renderScoreChart(split ? null : data.writing.score_per_bucket);
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
    if (!heatmap) { el.innerHTML = ""; return; }
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
    if (!histogram) { this.charts["chart-histogram"]?.destroy(); return; }
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
    if (!detail) { this.charts["chart-detail"]?.destroy(); return; }
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
    if (!score) { this.charts["chart-score"]?.destroy(); return; }
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
    this.renderConnections();
    this.renderCorrelations(data.correlations);
  },

  // ---- 😴 Schlaf (SS.1) ----
  renderSleepSection(data) {
    this.renderSleepOverviewTiles(data.sleep_overview);
    this.renderNightBars(data.sleep_overview.night_bars);
    this.renderWeekdayRhythm(data.sleep_overview.weekday_rhythm);
    this.renderSleepAnalysis(data.sleep);
    this.renderTrackerAnalysis(data.tracker);
    nightDetail.loadList();
  },

  renderSleepOverviewTiles(ov) {
    const el = document.getElementById("sleep-overview-tiles");
    if (!ov.n_total) {
      el.innerHTML = `<p class="hint">${t("stats.sleepOverviewEmpty")}</p>`;
      return;
    }
    const regularityLabel = ov.regularity ? t("stats.regularity." + ov.regularity) : "–";
    const tiles = [
      { value: ov.avg_duration_14d != null ? this.fmtHours(ov.avg_duration_14d) : "–", label: t("stats.tileAvg14d") },
      { value: ov.median_duration != null ? this.fmtHours(ov.median_duration) : "–", label: t("stats.tileMedian") },
      { value: regularityLabel, label: t("stats.tileRegularity") },
      { value: ov.n_total, label: t("stats.tileNightsTotal") },
    ];
    if (ov.tracker_tiles) {
      tiles.push(
        { value: `${ov.tracker_tiles.avg_rem_share_pct}%`, label: t("stats.tileRemShare"), gold: true },
        { value: ov.tracker_tiles.avg_awakenings, label: t("stats.tileAwakenings") },
      );
    }
    el.innerHTML = tiles.map((tile) =>
      `<div class="stat-card"><div class="value${tile.gold ? " gold" : ""}">${tile.value}</div><div class="label">${tile.label}</div></div>`
    ).join("");
  },

  fmtHours(minutes) {
    const h = Math.floor(minutes / 60), m = Math.round(minutes % 60);
    return `${h} h ${m ? `${m} min` : ""}`.trim();
  },

  // Horizontale Nacht-Balken, 18-Uhr-bis-12-Uhr-Achse, Inline-SVG (kein
  // Chart.js -- die Achse ist eine feste Zeitspanne, kein Datenbereich).
  renderNightBars(bars) {
    const el = document.getElementById("sleep-night-bars");
    if (!bars.length) { el.innerHTML = `<p class="hint">${t("stats.sleepOverviewEmpty")}</p>`; return; }

    const rowH = 16, gap = 4, padL = 70, padR = 10, width = 900;
    const dayMinutes = 18 * 100; // Achse: 18:00 -> 12:00 naechster Tag = 18h = 1080min, in "Stunden*100"-Einheiten unten skaliert
    const axisStartMin = 18 * 60; // Minuten seit Mitternacht, Achsenstart 18:00
    const totalAxisMin = 18 * 60; // 18:00 bis 12:00 naechster Tag = 18h
    const toX = (hhmm) => {
      if (!hhmm) return null;
      const [h, m] = hhmm.split(":").map(Number);
      let mins = h * 60 + m;
      if (mins < axisStartMin) mins += 24 * 60; // nach Mitternacht -> rechts vom Achsenstart weiterzaehlen
      const rel = mins - axisStartMin;
      return padL + (rel / totalAxisMin) * (width - padL - padR);
    };
    const height = bars.length * (rowH + gap) + 24;

    let svg = `<svg viewBox="0 0 ${width} ${height}" class="night-bars-svg" role="img" aria-label="${t("stats.nightBarsTitle")}">`;
    [18, 21, 0, 3, 6, 9, 12].forEach((h) => {
      const x = toX(`${String(h).padStart(2, "0")}:00`);
      svg += `<line x1="${x}" y1="0" x2="${x}" y2="${height - 20}" stroke="var(--bg-input)" stroke-width="1"/>`;
      svg += `<text x="${x}" y="${height - 6}" fill="var(--text-dim)" font-size="10" text-anchor="middle">${String(h).padStart(2, "0")}:00</text>`;
    });
    bars.forEach((n, i) => {
      const y = i * (rowH + gap);
      if (n.confidence === "unknown" || !n.bed_time || !n.wake_time) {
        svg += `<circle cx="${padL - 12}" cy="${y + rowH / 2}" r="3" fill="var(--text-dim)"/>`;
        return;
      }
      const x1 = toX(n.bed_time), x2 = toX(n.wake_time);
      const color = n.source === "tracker" ? "var(--sleep-rem)" : "var(--accent)";
      const dash = n.confidence === "rough" ? ` stroke-dasharray="4,3"` : "";
      svg += `<rect data-date="${n.date}" x="${Math.min(x1, x2)}" y="${y}" width="${Math.max(2, Math.abs(x2 - x1))}" height="${rowH}" rx="3" fill="${color}"${n.confidence === "rough" ? ` fill-opacity="0.55" stroke="${color}"${dash}` : ""} style="cursor:pointer"/>`;
    });
    svg += "</svg>";
    el.innerHTML = svg;
    el.querySelectorAll("rect[data-date]").forEach((r) => {
      r.addEventListener("click", () => {
        nightDetail.nights = bars.filter((b) => b.bed_time && b.wake_time).slice().reverse();
        nightDetail.open(r.dataset.date);
      });
    });
  },

  renderWeekdayRhythm(rhythm) {
    const el = document.getElementById("sleep-weekday-rhythm");
    const hasData = rhythm.some((d) => d.n > 0);
    if (!hasData) { el.innerHTML = `<p class="hint">${t("stats.sleepOverviewEmpty")}</p>`; return; }
    const width = 700, padL = 40, padR = 10, rowY = { bed: 25, wake: 65 };
    const toX = (hhmm) => {
      if (!hhmm) return null;
      const [h, m] = hhmm.split(":").map(Number);
      let mins = h * 60 + m;
      if (mins < 12 * 60) mins += 24 * 60; // Abendzeiten vor Mittag als "spaeter" einordnen
      return padL + ((mins - 12 * 60) / (24 * 60)) * (width - padL - padR);
    };
    let svg = `<svg viewBox="0 0 ${width} 90" class="weekday-rhythm-svg" role="img">`;
    rhythm.forEach((d, i) => {
      const cx = padL + (i / 6) * (width - padL - padR) + 10;
      if (d.avg_bed_time) svg += `<circle cx="${toX(d.avg_bed_time)}" cy="${rowY.bed}" r="4" fill="var(--accent)"/>`;
      if (d.avg_wake_time) svg += `<circle cx="${toX(d.avg_wake_time)}" cy="${rowY.wake}" r="4" fill="var(--lucid)"/>`;
    });
    svg += "</svg>";
    const dayLabels = rhythm.map((d) => `<span>${d.day}</span>`).join("");
    el.innerHTML = `${svg}<div class="weekday-rhythm-labels">${dayLabels}</div>
      <div class="night-legend"><span><i style="background:var(--accent)"></i>${t("stats.rhythmBedLabel")}</span><span><i style="background:var(--lucid)"></i>${t("stats.rhythmWakeLabel")}</span></div>`;
  },

  // TD.3: Tracker-Analysen -- dockt uebergangsweise hier an (SS.1 aus
  // UMSETZUNGSPLAN-SCHLAFSCHULE.md existiert noch nicht). Karten 4/5 aus dem
  // Plan (Schlafarchitektur x Valenz, Tiefschlaf x Tagesbilanz) fehlen bewusst
  // -- die setzen auf E.4b/E.5/E.7 auf, die es noch nicht gibt.
  renderTrackerAnalysis(tracker) {
    const el = document.getElementById("tracker-analysis-card");
    const body = document.getElementById("tracker-analysis");
    if (!tracker.available) {
      el.classList.remove("hidden");
      body.innerHTML = `<p class="hint">${t("stats.trackerTooFew", { n: tracker.n_total })}</p>`;
      return;
    }
    el.classList.remove("hidden");

    const groupBars = (groups, order, labels, valueFn, pctFn, color, isRate) => order.map((key) => {
      const g = groups[key];
      const lowN = g.n_dreams < 3;
      const pct = pctFn(g);
      const raw = valueFn(g);
      const valueText = isRate
        ? (raw == null ? "–" : rateOrDash(raw + "%", g.n_dreams))
        : raw;
      return `<div class="corr-cell ${lowN ? "low-n" : ""}" title="n=${g.n_dreams}">
        <div class="corr-bar" style="height:${Math.max(pct, 4)}%;background:${lowN ? "var(--bg-input)" : color}"></div>
        <span class="corr-label">${labels[key]}</span>
        <span class="corr-value">${valueText}</span>
      </div>`;
    }).join("");

    const remOrder = ["wenig", "mittel", "viel"];
    const remLabels = { wenig: t("stats.remLittleLabel"), mittel: t("stats.remMediumLabel"), viel: t("stats.remMuchLabel") };
    const maxAmountWords = Math.max(...remOrder.map((k) => tracker.rem_amount[k].avg_words), 1);
    const maxDensityWords = Math.max(...remOrder.map((k) => tracker.rem_density[k].avg_words), 1);

    const awOrder = ["0-1", "2-3", "4+"];
    const awLabels = { "0-1": t("stats.awakenings01Label"), "2-3": t("stats.awakenings23Label"), "4+": t("stats.awakenings4plusLabel") };
    const maxAwWords = Math.max(...awOrder.map((k) => tracker.awakenings[k].avg_words), 1);
    const maxAwDreams = Math.max(...awOrder.map((k) => tracker.awakenings[k].avg_dreams_per_night), 1);

    const wbtbOrder = ["durchgeschlafen", "wbtb"];
    const wbtbLabels = { durchgeschlafen: t("stats.throughGroupLabel"), wbtb: t("stats.wbtbGroupLabel") };

    const wakeMomentsHtml = tracker.wbtb.wake_moments.length
      ? `<ul class="hint" style="list-style:none;padding:0">${tracker.wbtb.wake_moments.map((m) =>
          `<li>${t("stats.wakeMomentLine", { time: m.time, minutes: m.rem_after_minutes })}</li>`).join("")}</ul>`
      : `<p class="hint">${t("stats.wakeMomentsEmpty")}</p>`;

    const calib = tracker.calibration;
    const calibrationHtml = calib.pairs.length
      ? `<p>${t("stats.calibrationDeviation", { minutes: calib.avg_deviation_minutes })}</p>
         <p class="hint">${t("stats.trackerCalibrationHint")} ${nBadge(calib.pairs.length)}</p>`
      : `<p class="hint">${t("stats.calibrationEmpty")}</p>`;

    const scoreHtml = tracker.tracker_score
      ? `<h3>${t("stats.trackerScoreTitle")} ${nBadge(tracker.tracker_score.n_total)}</h3>
        <div class="corr-grid corr-3">${groupBars(tracker.tracker_score, remOrder, remLabels, (g) => g.lucid_rate, (g) => g.lucid_rate ?? 0, "var(--lucid)", true)}</div>`
      : `<h3>${t("stats.trackerScoreTitle")}</h3><p class="hint">${t("stats.trackerScoreUnavailable")}</p>`;

    const lat = tracker.latency;
    const latencyHtml = lat.n_total ? `
      <p>${t("stats.latencyAvgLabel")}: ${t("stats.latencyMinutes", { minutes: lat.avg_minutes })} ${nBadge(lat.n_total)}</p>
      <div class="stat-cards">
        <div class="stat-card"><div class="value">${lat.with_substance.avg_minutes != null ? t("stats.latencyMinutes", { minutes: lat.with_substance.avg_minutes }) : "–"}</div>
          <div class="label">${t("stats.latencyWithSubstanceLabel")} ${nBadge(lat.with_substance.n)}</div></div>
        <div class="stat-card"><div class="value">${lat.without_substance.avg_minutes != null ? t("stats.latencyMinutes", { minutes: lat.without_substance.avg_minutes }) : "–"}</div>
          <div class="label">${t("stats.latencyWithoutSubstanceLabel")} ${nBadge(lat.without_substance.n)}</div></div>
      </div>
      <p class="hint">${t("stats.latencyLowWarning")}</p>` : "";

    body.innerHTML = `
      <h3>${t("stats.trackerRemAmountTitle")} ${nBadge(tracker.n_total)}</h3>
      <div class="corr-grid corr-3">${groupBars(tracker.rem_amount, remOrder, remLabels, (g) => g.avg_words, (g) => (g.avg_words / maxAmountWords) * 100, "var(--accent)", false)}</div>
      <h3>${t("stats.trackerRemDensityTitle")}</h3>
      <div class="corr-grid corr-3">${groupBars(tracker.rem_density, remOrder, remLabels, (g) => g.avg_words, (g) => (g.avg_words / maxDensityWords) * 100, "var(--accent)", false)}</div>
      <p class="hint">${t("stats.trackerRemHint")}</p>
      <h3 style="margin-top:1rem">${t("stats.trackerAwakeningsTitle")}</h3>
      <div class="corr-grid corr-3">${groupBars(tracker.awakenings, awOrder, awLabels, (g) => g.avg_words, (g) => (g.avg_words / maxAwWords) * 100, "var(--accent)", false)}</div>
      <div class="corr-grid corr-3">${groupBars(tracker.awakenings, awOrder, awLabels, (g) => g.avg_dreams_per_night, (g) => (g.avg_dreams_per_night / maxAwDreams) * 100, "var(--lucid)", false)}</div>
      <h3 style="margin-top:1rem">${t("stats.trackerWbtbTitle")}</h3>
      <p class="hint">${t("stats.trackerWbtbHint")}</p>
      <div class="corr-grid corr-2">${groupBars(tracker.wbtb, wbtbOrder, wbtbLabels, (g) => g.lucid_rate, (g) => g.lucid_rate ?? 0, "var(--lucid)", true)}</div>
      <h4>${t("stats.wakeMomentsTitle")}</h4>
      ${wakeMomentsHtml}
      <h3 style="margin-top:1rem" id="tracker-calibration-heading">${t("stats.trackerCalibrationTitle")}</h3>
      ${calibrationHtml}
      ${scoreHtml}
      <h3 style="margin-top:1rem">${t("stats.trackerLatencyTitle")}</h3>
      ${latencyHtml}
      <p class="hint">${t("stats.trackerDisclaimer")}</p>`;

    wissen.attach(document.getElementById("tracker-analysis-heading"), "tracker");
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

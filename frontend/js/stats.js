// Analyse: Kennzahlen + Diagramme (Chart.js) + Traumkompass nach LaBerge
const COMPASS = {
  awareness: {
    icon: "💭", label: "Inneres Erleben",
    hint: "Ungewöhnliche Gedanken oder Gefühle im Traum",
    mission: 'Halte heute 5× inne und frag dich: „Fühlt sich dieser Moment wach an – oder wie ein Traum?“',
  },
  action: {
    icon: "⚡", label: "Handlung",
    hint: "Du oder andere tun Unmögliches (fliegen, schweben …)",
    mission: "Achte heute auf Bewegungen: Immer wenn etwas Überraschendes passiert → Reality Check!",
  },
  form: {
    icon: "🌀", label: "Form",
    hint: "Dinge, Orte oder Körper sind verformt oder verwandeln sich",
    mission: "Sieh dir heute 5× deine Hände genau an: Stimmen Form und Fingerzahl?",
  },
  context: {
    icon: "🗺️", label: "Kontext",
    hint: "Falscher Ort, falsche Zeit, absurde Situation",
    mission: 'Frag dich bei jedem Ortswechsel: „Wie genau bin ich hierhergekommen?"',
  },
};

const SPLIT_OPTIONS = [
  { value: "", label: "–" },
  { value: "beifuss", label: "🌿 Beifuß" },
  { value: "weekend", label: "Wochenende/Werktag" },
  { value: "big_dream", label: "⭐ Große Träume" },
];

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
    document.querySelectorAll(".split-control").forEach((el) => {
      el.innerHTML = `<label>Aufreißen nach
        <select class="split-select">
          ${SPLIT_OPTIONS.map((o) => `<option value="${o.value}" ${o.value === this.split ? "selected" : ""}>${o.label}</option>`).join("")}
        </select>
      </label>`;
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
    if (section === "lucidity") this.renderLucidity(data);
    if (section === "emotions") this.renderEmotionsSection(data);
    if (section === "experiments") this.renderExperiments(data);
    if (section === "compass") this.renderCompassSection(data);
    if (section === "review") this.renderReview();
  },

  renderCards(data) {
    document.getElementById("stat-cards").innerHTML = `
      <div class="stat-card"><div class="value">${data.total}</div><div class="label">Einträge</div></div>
      <div class="stat-card"><div class="value gold">${data.lucid}</div><div class="label">Klarträume</div></div>
      <div class="stat-card"><div class="value">${data.lucid_rate}%</div><div class="label">Klartraum-Quote</div></div>
      <div class="stat-card"><div class="value">${data.streak} 🔥</div><div class="label">Tage-Streak</div></div>`;
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
          <div class="label">Wörter · ${escapeHtml(this.data.split.label_a)} (${this.data.split.n_a})</div></div>
        <div class="stat-card"><div class="value">${v.total_words}</div>
          <div class="label">Wörter · ${escapeHtml(this.data.split.label_b)} (${this.data.split.n_b})</div></div>`;
      return;
    }
    const w = writing;
    const trendArrow = w.trend.delta_pct == null ? "" : (w.trend.delta_pct >= 0 ? "▲" : "▼");
    el.innerHTML = `
      <div class="stat-card"><div class="value gold">${w.total_words.toLocaleString("de-DE")}</div><div class="label">Wörter im Traumbuch</div></div>
      <div class="stat-card"><div class="value">${w.avg_words}</div><div class="label">Ø Wörter/Eintrag</div></div>
      <div class="stat-card"><div class="value">${w.median_words}</div><div class="label">Median Wörter/Eintrag</div></div>
      ${w.longest ? `<div class="stat-card"><div class="value">${w.longest.words}</div><div class="label">Längster Traum: "${escapeHtml(w.longest.title)}"</div></div>` : ""}
      <div class="stat-card"><div class="value">${trendArrow} ${w.trend.delta_pct == null ? "–" : w.trend.delta_pct + "%"}</div><div class="label">Letzte 7 Tage vs. 7 davor</div></div>`;
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
          { label: "Ø Wörter pro Eintrag", data: perBucket.map((w) => w.avg_words), borderColor: "#8fd49a", backgroundColor: "rgba(143, 212, 154, 0.15)", fill: true, tension: 0.3, borderWidth: 1 },
          { label: "Gleitender Ø (5 Buckets)", data: movingAvg, borderColor: "#f5c66a", borderWidth: 3, tension: 0.3, pointRadius: 0 },
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
      const title = entry ? `${date}: ${entry.words} Wörter – "${entry.title}"` : `${date}: kein Eintrag`;
      return `<div class="heatmap-cell" title="${escapeHtml(title)}"
        style="background:${entry ? `rgba(143,212,154,${pct})` : "var(--bg-input)"}"></div>`;
    }).join("");
  },

  renderHistogram(histogram) {
    this.makeChart("chart-histogram", {
      type: "bar",
      data: {
        labels: histogram.map((h) => h.bucket),
        datasets: [{ label: "Einträge", data: histogram.map((h) => h.count), backgroundColor: "#c9bfff" }],
      },
      options: this.baseOptions({ y: { ticks: { stepSize: 1 } } }),
    });
  },

  renderDetailChart(detail) {
    this.makeChart("chart-detail", {
      type: "line",
      data: {
        labels: detail.map((d) => d.bucket),
        datasets: [{ label: "Ø getaggte Elemente", data: detail.map((d) => d.avg_detail), borderColor: "#8b7ff5", backgroundColor: "rgba(139,127,245,.15)", fill: true, tension: 0.3 }],
      },
      options: this.baseOptions(),
    });
  },

  renderScoreChart(score) {
    this.makeChart("chart-score", {
      type: "line",
      data: {
        labels: score.map((s) => s.bucket),
        datasets: [{ label: "Erinnerungs-Score", data: score.map((s) => s.score), borderColor: "#f5c66a", backgroundColor: "rgba(245,198,106,.15)", fill: true, tension: 0.3 }],
      },
      options: this.baseOptions({ y: { max: 100 } }),
    });
  },

  // ---- ✨ Luzidität ----
  renderLucidity(data) {
    this.renderIncubation(data.incubation);
    if (data.split) {
      const a = data.split.per_bucket_a, b = data.split.per_bucket_b;
      this.makeChart("chart-weeks", {
        type: "bar",
        data: {
          labels: this.mergedBuckets(a, b),
          datasets: [
            { label: `Klarträume · ${data.split.label_a}`, data: this.alignSeries(a, "lucid"), backgroundColor: "#f5c66a" },
            { label: `Klarträume · ${data.split.label_b}`, data: this.alignSeries(b, "lucid"), backgroundColor: "#8b7ff5" },
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
      <div class="stat-card"><div class="value">${incubation.total}</div><div class="label">Absichten bewertet</div></div>
      <div class="stat-card"><div class="value gold">${incubation.fulfilled}</div><div class="label">davon erfüllt</div></div>
      <div class="stat-card"><div class="value">${incubation.rate}%</div><div class="label">Erfolgsquote</div></div>`;
  },

  renderWeeks(perBucket) {
    this.makeChart("chart-weeks", {
      type: "bar",
      data: {
        labels: perBucket.map((w) => w.bucket),
        datasets: [
          { label: "Träume gesamt", data: perBucket.map((w) => w.total), backgroundColor: "#8b7ff5" },
          { label: "davon luzide", data: perBucket.map((w) => w.lucid), backgroundColor: "#f5c66a" },
        ],
      },
      options: this.baseOptions({ y: { ticks: { stepSize: 1 } } }),
    });
  },

  renderLucidityChart(distribution) {
    this.makeChart("chart-lucidity", {
      type: "doughnut",
      data: {
        labels: ["keine Erinnerung", "Fragment", "normaler Traum", "kurz luzide", "voll luzide"],
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
          const e = EMOTIONS[key] || { icon: "🔘", label: key === "andere" ? "Andere" : key, color: "#888" };
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
    valEl.innerHTML = `<h3 style="margin-top:1rem">💚 Valenz-Bilanz</h3>
      <p class="hint">Anteil positiver Gefühle diesen Monat: <strong>${emotions.valence.current_month_positive_share ?? "–"}${emotions.valence.current_month_positive_share != null ? "%" : ""}</strong>
        <span title="${escapeHtml(legendHint)}"> 💡</span></p>
      <div class="corr-grid" style="grid-template-columns:repeat(${Math.max(emotions.valence.over_time.length, 1)},1fr)">
        ${emotions.valence.over_time.map((v) => `<div class="corr-cell">
          <div class="corr-bar" style="height:${Math.max(v.positive_share || 4, 4)}%;background:var(--lucid)"></div>
          <span class="corr-label">${v.bucket}</span>
          <span class="corr-value">${v.positive_share ?? "–"}${v.positive_share != null ? "%" : ""}</span>
        </div>`).join("")}
      </div>`;

    const lqEl = document.getElementById("emotion-lucid-quote");
    lqEl.innerHTML = emotions.lucid_quote.length ? `<h3 style="margin-top:1rem">✨ Klartraum-Quote je Emotion</h3>
      <p class="hint">Nur Emotionen mit ≥ 3 Vorkommen.</p>
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
    pairsEl.innerHTML = emotions.top_pairs.length ? `<h3 style="margin-top:1rem">🤝 Gefühls-Paare</h3>
      <ul class="hint" style="list-style:none;padding:0">
        ${emotions.top_pairs.map((p) => {
          const a = EMOTIONS[p.a] || { icon: "?", label: p.a }, b = EMOTIONS[p.b] || { icon: "?", label: p.b };
          return `<li>${a.icon} ${a.label} + ${b.icon} ${b.label}: ${p.count}×</li>`;
        }).join("")}
      </ul>` : "";

    const matrix = document.getElementById("emotion-place-matrix");
    const entries = Object.entries(emotions.place_matrix).filter(([, places]) => places.length > 0);
    matrix.innerHTML = entries.length ? `<h3 style="margin-top:1rem">Gefühle × Orte</h3>
        <p class="hint">Welche Emotionen tauchen an welchen Orten auf?</p>
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
      return `<li>${e.icon} ${e.label} am 📍 ${escapeHtml(c.place)}: ${c.count}×</li>`;
    });
    const personCombos = emotions.top_person_combos.map((c) => {
      const e = EMOTIONS[c.emotion] || { icon: "?", label: c.emotion };
      return `<li>${e.icon} ${e.label} bei 👤 ${escapeHtml(c.person)}: ${c.count}×</li>`;
    });
    combosEl.innerHTML = (placeCombos.length || personCombos.length) ? `<h3 style="margin-top:1rem">🔗 Emotion × Ort/Person</h3>
      <ul class="hint" style="list-style:none;padding:0">${[...placeCombos, ...personCombos].join("")}</ul>` : "";
  },

  // ---- 🔬 Experimente ----
  renderExperiments(data) {
    this.renderBeifuss(data.beifuss);
    this.renderCorrelations(data.correlations);
  },

  renderBeifuss(beifuss) {
    const el = document.getElementById("beifuss-compare");
    if (!beifuss.with.count) {
      el.innerHTML = `<p class="hint">Noch keine Einträge mit Beifuß. Hake beim Eintragen
        "🌿 Beifuß getrunken" an – hier entsteht dann dein persönliches Experiment:
        Klartraum-Quote mit vs. ohne.</p>`;
      return;
    }
    const fmt = (g) => (g.lucid_rate == null ? "–" : g.lucid_rate + "%");
    el.innerHTML = `<div class="stat-cards">
        <div class="stat-card"><div class="value gold">${fmt(beifuss.with)}</div>
          <div class="label">mit Beifuß (${beifuss.with.count} ${beifuss.with.count === 1 ? "Nacht" : "Nächte"})</div></div>
        <div class="stat-card"><div class="value">${fmt(beifuss.without)}</div>
          <div class="label">ohne Beifuß (${beifuss.without.count} ${beifuss.without.count === 1 ? "Nacht" : "Nächte"})</div></div>
      </div>
      ${beifuss.with.count < 5 ? `<p class="hint">Für eine belastbare Aussage brauchst du
        mehrere Nächte in beiden Gruppen – als Data Scientist weißt du das besser als jede App. 😉</p>` : ""}`;
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
      wdEl.innerHTML = `<h3>Wochentag × Luzidität</h3>
        <div class="corr-grid">
          ${corr.weekday.map((d) => {
            const rate = d.total ? Math.round(d.lucid / d.total * 100) : 0;
            return `<div class="corr-cell">
              <div class="corr-bar" style="height:${Math.max(rate, 4)}%;background:${rate > 0 ? "var(--lucid)" : "var(--bg-input)"}"></div>
              <span class="corr-label">${d.day}</span>
              <span class="corr-value">${rate}%</span>
            </div>`;
          }).join("")}
        </div>
        <p class="hint">Klartraum-Quote nach Wochentag (${corr.weekday.reduce((s, d) => s + d.total, 0)} Einträge)</p>`;
    }

    const sqEl = document.getElementById("correlation-sleep");
    if (hasSleep) {
      sqEl.innerHTML = `<h3>Schlafqualität × Luzidität</h3>
        <div class="corr-grid corr-5">
          ${corr.sleep_quality.map((d) => {
            const rate = d.total ? Math.round(d.lucid / d.total * 100) : 0;
            return `<div class="corr-cell">
              <div class="corr-bar" style="height:${Math.max(rate, 4)}%;background:${rate > 0 ? "var(--accent)" : "var(--bg-input)"}"></div>
              <span class="corr-label">Q${d.quality}</span>
              <span class="corr-value">${rate}%</span>
            </div>`;
          }).join("")}
        </div>
        <p class="hint">Klartraum-Quote nach Schlafqualität (1=schlecht, 5=sehr gut)</p>`;
    }
  },

  // ---- 🧭 Kompass ----
  renderCompassSection(data) {
    this.renderCompass(data.compass);
    this.renderMission(data);
    this.renderSorter();
    this.renderSigns(data.top_dream_signs);
  },

  renderCompass(compass) {
    const keys = Object.keys(COMPASS);
    this.makeChart("chart-compass", {
      type: "radar",
      data: {
        labels: keys.map((k) => `${COMPASS[k].icon} ${COMPASS[k].label}`),
        datasets: [{
          label: "Traumzeichen-Vorkommen",
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
      el.innerHTML = `<div class="mission-card">🧭 Sortiere oben deine Traumzeichen ein –
        dann erhältst du hier deine persönliche Reality-Check-Mission.</div>`;
      return;
    }
    const dominant = keys.reduce((a, b) => (data.compass[a] >= data.compass[b] ? a : b));
    const c = COMPASS[dominant];
    const focus = data.focus_sign
      ? `<p>🎯 <strong>Fokus-Zeichen der Woche:</strong> "${escapeHtml(data.focus_sign.name)}"
         (${data.focus_sign.count}×) – mach jedes Mal einen Reality Check, wenn es dir tagsüber
         begegnet oder in den Sinn kommt.</p>`
      : "";
    el.innerHTML = `<div class="mission-card">
      <h3>${c.icon} Deine Mission</h3>
      <p>Deine Träume lehnen zu <strong>${c.label}</strong> (${c.hint.toLowerCase()}).</p>
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
    el.innerHTML = `
      <p class="hint">🧩 <strong>${unsorted.length} Traumzeichen</strong> ${unsorted.length === 1 ? "wartet" : "warten"} aufs Einsortieren –
        tippe ${unsorted.length === 1 ? "es" : "eines"} an und wähle, wozu es am besten passt:</p>
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
      <p>"<strong>${name}</strong>" ist am ehesten …</p>
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
          showToast(`${COMPASS[btn.dataset.cat].icon} "${name}" einsortiert`);
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
        datasets: [{ label: "Häufigkeit", data: signs.map((s) => s.count), backgroundColor: "#c9bfff" }],
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
      el.innerHTML = `<p class="hint">Noch keine Figur hat eine Rolle bekommen — sortiere im Atlas oder in der Innenwelt ein.</p>`;
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
        <p><strong>Bei dir:</strong> ${group.figures.length} ${group.figures.length === 1 ? "Figur" : "Figuren"}
          (${group.figures.map((f) => `<button class="archetype-figure-link">${escapeHtml(f.name)}</button>`).join(", ")})
          · ${group.dreamCount} ${group.dreamCount === 1 ? "Traum" : "Träume"}
          ${topEmos ? ` · häufigste Gefühle ${topEmos}` : ""}
          · zuletzt am ${formatDate(group.lastDate)}</p>
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
      if (!res.ok) throw new Error(`Export fehlgeschlagen (${res.status})`);
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `klartraum-export-${todayISO()}.${format}`;
      a.click();
      URL.revokeObjectURL(url);
      showToast("Export heruntergeladen 📤");
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

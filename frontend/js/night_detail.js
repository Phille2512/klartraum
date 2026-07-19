// SS.2: Nacht-Detail -- eigenständig erreichbar über die "🌙 Deine Nächte"-
// Liste (Analyse → Experimente), bewusst NICHT ans Traum-Formular gehängt
// (dort wäre sie beim Bearbeiten störend). Hypnogramm-Optik lehnt sich an
// den Nachtkino-Prototyp an (prototyp-nachtkino-generator.py, git-ignoriert).
// Zieht später komplett nach SS.1 um, wenn die eigene Schlaf-Sektion mit
// Nacht-Balken existiert -- deshalb ist die Nächte-Liste bewusst generisch
// (api.listNights() liefert alle Nächte, nicht nur Tracker-Nächte).

// Segment-State-Codes -- müssen zu backend/tracker_adapters.py passen.
const NIGHT_STATE = {
  2: { icon: "💤", key: "deep" },
  3: { icon: "😴", key: "light" },
  4: { icon: "✨", key: "rem" },
  5: { icon: "👁️", key: "wake" },
};
const NIGHT_STATE_ORDER = [5, 4, 3, 2]; // Zeilen im Hypnogramm von oben: Wach/REM/Leicht/Tief

const nightDetail = {
  nights: [],       // Tracker-Nächte, neueste zuerst -- Grundlage für Vor/Zurück
  currentIndex: -1,
  medians: null,
  remOn: false,
  hrOn: false,

  init() {
    const overlay = document.getElementById("night-detail-overlay");
    document.getElementById("night-detail-close").addEventListener("click", () => this.close());
    overlay.addEventListener("click", (e) => { if (e.target === overlay) this.close(); });
    document.addEventListener("keydown", (e) => {
      if (overlay.classList.contains("hidden")) return;
      if (e.key === "Escape") this.close();
      if (e.key === "ArrowLeft") this.step(-1);
      if (e.key === "ArrowRight") this.step(1);
    });
    document.getElementById("night-detail-prev").addEventListener("click", () => this.step(-1));
    document.getElementById("night-detail-next").addEventListener("click", () => this.step(1));
  },

  // Von stats.js beim Rendern der Experimente-Sektion aufgerufen.
  async loadList() {
    const card = document.getElementById("night-list-card");
    const listEl = document.getElementById("night-list");
    try {
      const all = await api.listNights(90);
      this.nights = all.filter((n) => n.rem_minutes != null);
      if (!this.nights.length) {
        card.classList.add("hidden");
        return;
      }
      card.classList.remove("hidden");
      listEl.innerHTML = this.nights.map((n) => {
        const parts = [];
        if (n.rem_minutes != null) parts.push(`✨ ${n.rem_minutes} min`);
        if (n.tracker_score != null) parts.push(`${n.tracker_score}/100`);
        return `<button type="button" class="night-list-row" data-date="${n.date}">
          <span class="night-list-date">${formatDate(n.date)}</span>
          <span class="night-list-summary hint">${parts.join(" · ")}</span>
        </button>`;
      }).join("");
      listEl.querySelectorAll(".night-list-row").forEach((btn) => {
        btn.addEventListener("click", () => this.open(btn.dataset.date));
      });
    } catch {
      card.classList.add("hidden"); // offline oder Server ohne diese Route (alte Version)
    }
  },

  async open(date) {
    this.currentIndex = this.nights.findIndex((n) => n.date === date);
    let night, dreams;
    try {
      [night, dreams] = await Promise.all([
        api.getNight(date),
        api.listDreams({ from: date, to: date }).catch(() => []),
      ]);
    } catch (err) {
      showToast(err.message);
      return;
    }
    if (!this.medians) {
      this.medians = await api.nightMedians().catch(() => null);
    }

    document.getElementById("night-detail-overlay").classList.remove("hidden");
    document.getElementById("night-detail-date").textContent = formatDate(date);
    document.getElementById("night-detail-title").textContent = t("ss2.nightTitle");
    document.getElementById("night-detail-badge").textContent =
      night.source === "tracker" ? t("ss2.sourceTracker") : t("ss2.sourceManual");

    this.remOn = false;
    this.hrOn = false;
    this.renderHighlight(night);
    this.renderHypnogram(night);
    this.renderMedians(night);
    this.renderRemList(night);
    this.renderWakeMoments(night);
    this.renderBridge(date, dreams);
  },

  close() {
    document.getElementById("night-detail-overlay").classList.add("hidden");
  },

  step(delta) {
    if (!this.nights.length) return;
    const next = (this.currentIndex + delta + this.nights.length) % this.nights.length;
    this.open(this.nights[next].date);
  },

  // "Diese Nacht hatte ungewöhnlich viel REM" -- auffälligste Abweichung vom
  // Median als ein Satz oben, falls vorhanden.
  renderHighlight(night) {
    const el = document.getElementById("night-detail-highlight");
    if (!this.medians || !this.medians.n_total) { el.classList.add("hidden"); return; }
    const fields = [
      { key: "rem_minutes", label: t("ss2.phaseRem") },
      { key: "deep_minutes", label: t("ss2.phaseDeep") },
    ];
    let best = null;
    for (const f of fields) {
      const med = this.medians[f.key];
      const val = night[f.key];
      if (med == null || val == null || !med) continue;
      const diffPct = Math.abs(val - med) / med;
      if (diffPct >= 0.3 && (!best || diffPct > best.diffPct)) {
        best = { ...f, val, med, diffPct, more: val > med };
      }
    }
    if (!best) { el.classList.add("hidden"); return; }
    el.classList.remove("hidden");
    el.textContent = t(best.more ? "ss2.highlightMore" : "ss2.highlightLess", { phase: best.label });
  },

  renderHypnogram(night) {
    const wrap = document.getElementById("night-detail-hypno-wrap");
    const fallback = document.getElementById("night-detail-fallback");
    const stages = night.stages;
    if (!stages || !stages.segments || !stages.segments.length) {
      wrap.classList.add("hidden");
      fallback.classList.remove("hidden");
      fallback.innerHTML = this.renderFallbackBars(night);
      return;
    }
    fallback.classList.add("hidden");
    wrap.classList.remove("hidden");

    const segs = [...stages.segments].sort((a, b) => a.s - b.s);
    const bed = segs[0].s;
    const wake = segs[segs.length - 1].e;
    const svg = document.getElementById("night-detail-hypno");
    svg.innerHTML = "";
    const NS = "http://www.w3.org/2000/svg";
    const X0 = 70, X1 = 900, ROWY = { 5: 20, 4: 70, 3: 120, 2: 170 }, ROWH = 26, YB = 220;
    const x = (ts) => X0 + ((ts - bed) / (wake - bed)) * (X1 - X0);
    const el = (tag, attrs) => {
      const e = document.createElementNS(NS, tag);
      for (const k in attrs) e.setAttribute(k, attrs[k]);
      return e;
    };

    // Stunden-Gitterlinien + Uhrzeit-Beschriftung
    const tz = stages.tz_offset_minutes || 0;
    const localHour = (ts) => {
      const d = new Date((ts + tz * 60) * 1000);
      return `${String(d.getUTCHours()).padStart(2, "0")}:${String(d.getUTCMinutes()).padStart(2, "0")}`;
    };
    let firstHour = Math.ceil(bed / 3600) * 3600;
    for (let ts = firstHour; ts < wake; ts += 3600) {
      svg.appendChild(el("line", { x1: x(ts), y1: 12, x2: x(ts), y2: YB - 16, stroke: "var(--bg-input)", "stroke-width": 1 }));
      const lb = el("text", { x: x(ts), y: YB - 4, fill: "var(--text-dim)", "font-size": 10, "text-anchor": "middle" });
      lb.textContent = localHour(ts);
      svg.appendChild(lb);
    }
    NIGHT_STATE_ORDER.forEach((st) => {
      const lb = el("text", { x: 4, y: ROWY[st] + ROWH / 2 + 4, fill: "var(--text-dim)", "font-size": 10 });
      lb.textContent = NIGHT_STATE[st].icon;
      svg.appendChild(lb);
    });

    const rects = [];
    segs.forEach((s) => {
      const r = el("rect", { x: x(s.s), y: ROWY[s.st], width: Math.max(2, x(s.e) - x(s.s)), height: ROWH, rx: 4 });
      r.style.fill = `var(--sleep-${NIGHT_STATE[s.st].key})`;
      r.style.cursor = "pointer";
      r._seg = s;
      rects.push(r);
      svg.appendChild(r);
    });
    this._segRects = rects;

    const infoEl = document.getElementById("night-detail-seginfo");
    const showInfo = (s) => {
      const mins = Math.round((s.e - s.s) / 60);
      infoEl.textContent = `${NIGHT_STATE[s.st].icon} ${t("ss2.state." + NIGHT_STATE[s.st].key)} · ${localHour(s.s)}–${localHour(s.e)} · ${mins} min — ${t("ss2.stateInfo." + NIGHT_STATE[s.st].key)}`;
    };
    rects.forEach((r) => r.addEventListener("click", (e) => { e.stopPropagation(); showInfo(r._seg); }));
    showInfo(segs[segs.length - 1].st === 5 ? segs[segs.length - 1] : segs[0]);

    // Legende
    document.getElementById("night-detail-legend").innerHTML = [5, 4, 3, 2].map((st) =>
      `<span><i style="background:var(--sleep-${NIGHT_STATE[st].key})"></i>${t("ss2.legend." + NIGHT_STATE[st].key)}</span>`
    ).join("");

    // Steuerzeile: REM hervorheben + optional Puls
    const hasHr = stages.hr && stages.hr.length > 1;
    document.getElementById("night-detail-controls").innerHTML = `
      <button type="button" class="chip" id="night-detail-rem-toggle">✨ ${t("ss2.highlightRemBtn")}</button>
      ${hasHr ? `<button type="button" class="chip" id="night-detail-hr-toggle">❤️ ${t("ss2.showHrBtn")}</button>` : ""}`;
    document.getElementById("night-detail-rem-toggle").addEventListener("click", (e) => {
      this.remOn = !this.remOn;
      e.currentTarget.classList.toggle("active", this.remOn);
      rects.forEach((r) => { r.style.opacity = (!this.remOn || r._seg.st === 4) ? 1 : 0.25; });
    });
    const hrBtn = document.getElementById("night-detail-hr-toggle");
    if (hrBtn) {
      hrBtn.addEventListener("click", (e) => {
        this.hrOn = !this.hrOn;
        e.currentTarget.classList.toggle("active", this.hrOn);
        if (this.hrOn) {
          const bpms = stages.hr.map((p) => p[1]);
          const lo = Math.min(...bpms) - 5, hi = Math.max(...bpms) + 5;
          const points = stages.hr.map((p) => `${x(p[0]).toFixed(1)},${(YB - 14 - ((p[1] - lo) / (hi - lo)) * (YB - 30)).toFixed(1)}`).join(" ");
          const poly = el("polyline", { points, fill: "none", stroke: "var(--danger)", "stroke-width": 1.6, "stroke-opacity": 0.85 });
          poly.id = "night-detail-hr-line";
          svg.appendChild(poly);
        } else {
          document.getElementById("night-detail-hr-line")?.remove();
        }
      });
    }
  },

  renderFallbackBars(night) {
    // Import ohne Segment-Zeitleiste (z. B. künftiger generic_csv-Adapter):
    // nur die vier Summen als gestapelter Balken, keine leere Hypnogramm-UI.
    const total = (night.deep_minutes || 0) + (night.light_minutes || 0) + (night.rem_minutes || 0) + (night.awake_minutes || 0);
    if (!total) return `<p class="hint">${t("ss2.noPhaseData")}</p>`;
    const seg = (mins, key) => `<div style="flex:${mins};background:var(--sleep-${key})" title="${t("ss2.state." + key)}: ${mins} min"></div>`;
    return `<div class="night-stack-bar">
        ${seg(night.deep_minutes || 0, "deep")}${seg(night.light_minutes || 0, "light")}${seg(night.rem_minutes || 0, "rem")}${seg(night.awake_minutes || 0, "wake")}
      </div>
      <div class="night-legend">${[5, 4, 3, 2].map((st) => `<span><i style="background:var(--sleep-${NIGHT_STATE[st].key})"></i>${t("ss2.legend." + NIGHT_STATE[st].key)}</span>`).join("")}</div>`;
  },

  renderMedians(night) {
    const el = document.getElementById("night-detail-medians");
    if (!this.medians || !this.medians.n_total) { el.innerHTML = ""; return; }
    const rows = [
      { key: "rem_minutes", label: t("ss2.phaseRem") },
      { key: "deep_minutes", label: t("ss2.phaseDeep") },
      { key: "light_minutes", label: t("ss2.phaseLight") },
      { key: "awake_minutes", label: t("ss2.phaseAwake") },
    ].filter((r) => night[r.key] != null && this.medians[r.key] != null);
    if (!rows.length) { el.innerHTML = ""; return; }
    el.innerHTML = `<h3>${t("ss2.mediansTitle")}</h3><ul class="hint" style="list-style:none;padding:0">
      ${rows.map((r) => `<li>${t("ss2.mediansLine", { phase: r.label, value: night[r.key], median: this.medians[r.key] })}</li>`).join("")}
    </ul>`;
  },

  renderRemList(night) {
    const el = document.getElementById("night-detail-remlist");
    const segs = night.stages?.segments;
    if (!segs) { el.innerHTML = ""; return; }
    const rem = segs.filter((s) => s.st === 4).sort((a, b) => a.s - b.s);
    if (!rem.length) { el.innerHTML = ""; return; }
    const tz = night.stages.tz_offset_minutes || 0;
    const hhmm = (ts) => {
      const d = new Date((ts + tz * 60) * 1000);
      return `${String(d.getUTCHours()).padStart(2, "0")}:${String(d.getUTCMinutes()).padStart(2, "0")}`;
    };
    const maxDur = Math.max(...rem.map((s) => s.e - s.s));
    el.innerHTML = `<h3>${t("ss2.remWindowsTitle", { n: rem.length })}</h3>` + rem.map((s) => {
      const mins = Math.round((s.e - s.s) / 60);
      const isTop = (s.e - s.s) === maxDur;
      return `<p class="hint">${isTop ? "⭐ " : ""}${hhmm(s.s)}–${hhmm(s.e)} · ${mins} min</p>`;
    }).join("");
  },

  renderWakeMoments(night) {
    const el = document.getElementById("night-detail-wakemoments");
    const segs = night.stages?.segments;
    if (!segs) { el.innerHTML = ""; return; }
    const sorted = [...segs].sort((a, b) => a.s - b.s);
    const tz = night.stages.tz_offset_minutes || 0;
    const hhmm = (ts) => {
      const d = new Date((ts + tz * 60) * 1000);
      return `${String(d.getUTCHours()).padStart(2, "0")}:${String(d.getUTCMinutes()).padStart(2, "0")}`;
    };
    const moments = [];
    sorted.forEach((s, i) => {
      if (s.st !== 5) return;
      let remAfter = 0;
      for (const later of sorted.slice(i + 1)) {
        if (later.st === 5) break;
        if (later.st === 4) remAfter += (later.e - later.s) / 60;
      }
      if (remAfter > 0) moments.push({ time: hhmm(s.s), minutes: Math.round(remAfter) });
    });
    if (!moments.length) { el.innerHTML = ""; return; }
    el.innerHTML = `<h3>${t("ss2.wakeMomentsTitle")}</h3>` +
      moments.map((m) => `<p class="hint">🕓 ${t("stats.wakeMomentLine", { time: m.time, minutes: m.minutes })}</p>`).join("");
  },

  renderBridge(date, dreams) {
    const el = document.getElementById("night-detail-bridge");
    if (!dreams.length) {
      el.innerHTML = `<p class="hint">${t("ss2.noDreamThisNight")}</p>`;
      return;
    }
    el.innerHTML = `<h3>${t("ss2.dreamBridgeTitle")}</h3>` + dreams.map((d) =>
      `<button type="button" class="chip night-bridge-chip" data-id="${d.id}">${escapeHtml(d.title)}</button>`
    ).join(" ");
    el.querySelectorAll(".night-bridge-chip").forEach((btn) => {
      btn.addEventListener("click", () => {
        const id = Number(btn.dataset.id);
        const dream = dreams.find((d) => d.id === id);
        if (dream && !journal.dreams.some((d) => d.id === id)) journal.dreams.push(dream);
        this.close();
        document.querySelector('[data-tab="journal"]').click();
        setTimeout(() => journal.openDreamEntry(id), 150);
      });
    });
  },
};

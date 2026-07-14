// Traumatlas: Netzwerk-Karte aus Orten, Personen und Traumzeichen.
// Verbunden, wenn sie im selben Traum auftauchen; Knotengröße = Häufigkeit.
const atlas = {
  COLORS: { place: "#8fd49a", person: "#f5c66a", dream_sign: "#c9bfff" },
  ICONS: { place: "📍", person: "👤", dream_sign: "🔮" },

  allNodes: [],
  allLinks: [],
  bound: false,
  limit: 20,
  focus: null, // { id, name, kind }
  // Zeitraffer-Stand bewusst NICHT in localStorage (H.1): ein in der
  // Vergangenheit geparkter Slider aus einer früheren Sitzung war die
  // "perfekte Verwirrungsmaschine". Startet bei jedem Seitenaufruf neu bei "heute".
  timelapseDate: "",

  // Traumtakt: Knoten, die schon einmal gerendert wurden, "keimen" nicht
  // erneut (nur echt neue bzw. per Zeitraffer neu auftauchende Knoten sollen
  // aus dem Nebel wachsen, nicht jeder Knoten bei jedem Filter-Klick).
  _knownNodeIds: new Set(),

  // ---- Filter-Zustand (B.1) ----
  get activeKinds() {
    const raw = localStorage.getItem("atlas-kinds");
    return raw ? JSON.parse(raw) : ["place", "person", "dream_sign"];
  },
  set activeKinds(v) { localStorage.setItem("atlas-kinds", JSON.stringify(v)); },
  get minCount() { return parseInt(localStorage.getItem("atlas-min-count") || "1", 10); },
  set minCount(v) { localStorage.setItem("atlas-min-count", String(v)); },
  get range() { return localStorage.getItem("atlas-range") || "all"; },
  set range(v) { localStorage.setItem("atlas-range", v); },

  isDefaultFilters() {
    return this.minCount === 1 && this.range === "all" && this.activeKinds.length === 3 && !this.focus && !this.timelapseDate;
  },

  resetFilters() {
    this.minCount = 1;
    this.range = "all";
    this.activeKinds = ["place", "person", "dream_sign"];
    this.focus = null;
    this.timelapseDate = "";
    this.limit = 20;
    const slider = document.getElementById("atlas-timelapse-slider");
    if (slider) slider.value = slider.max;
    this.load();
  },

  computeFrom() {
    if (this.range === "all") return null;
    const days = parseInt(this.range, 10);
    const d = new Date();
    d.setDate(d.getDate() - days);
    return d.toISOString().slice(0, 10);
  },

  async load() {
    this.bindControls();
    const graphEl = document.getElementById("atlas-graph");
    // min_count wird bewusst NICHT an den Server geschickt (H.1): der volle,
    // ungefilterte Bestand wird einmal geladen — Häufigkeits-Filter und die
    // Sichtbarkeits-Bilanz rechnen anschließend clientseitig darauf.
    const params = new URLSearchParams();
    const from = this.computeFrom();
    if (from) params.set("from", from);

    // Kanonisches Layout: einmal für den Endstand (heute) berechnen und
    // einfrieren, damit der Zeitraffer nicht "zappelt" (B.5).
    const canonicalKey = `${from || ""}`;
    if (this.canonicalKey !== canonicalKey) {
      let canonicalData;
      try {
        canonicalData = await api.request(`/api/atlas?${params}`);
      } catch (err) {
        showToast(err.message);
        return;
      }
      this.canonicalKey = canonicalKey;
      this.canonicalNodes = canonicalData.nodes;
      this.canonicalLinks = canonicalData.links;
      const clone = canonicalData.nodes.map((n) => ({ ...n }));
      const height = Math.max(300, Math.min(60 * clone.length + 160, 460));
      this.layout(clone, canonicalData.links, 680, height);
      this.canonicalPositions = Object.fromEntries(clone.map((n) => [n.id, { x: n.x, y: n.y }]));
    }

    let data;
    if (this.timelapseDate) {
      const pastParams = new URLSearchParams(params);
      pastParams.set("to", this.timelapseDate);
      try {
        data = await api.request(`/api/atlas?${pastParams}`);
      } catch (err) {
        showToast(err.message);
        return;
      }
    } else {
      data = { nodes: this.canonicalNodes, links: this.canonicalLinks };
    }

    this.allNodes = data.nodes;
    this.allLinks = data.links;
    document.getElementById("atlas-series").innerHTML = "";
    if (!this.canonicalNodes.length) {
      graphEl.innerHTML = `<div class="empty-state">${t("atlas.empty")}</div>`;
      return;
    }
    await this.buildTimelapseRange();
    this.renderGraph();
  },

  // ---- Filterleiste, Fokus, Suche (B.1) ----
  bindControls() {
    if (this.bound) {
      this.syncControlUI();
      return;
    }
    this.bound = true;

    document.querySelectorAll(".atlas-kind-toggle").forEach((btn) => {
      btn.addEventListener("click", () => {
        const kinds = this.activeKinds;
        const idx = kinds.indexOf(btn.dataset.kind);
        if (idx >= 0) kinds.splice(idx, 1); else kinds.push(btn.dataset.kind);
        this.activeKinds = kinds.length ? kinds : [btn.dataset.kind];
        this.limit = 20;
        this.syncControlUI();
        this.renderGraph();
      });
    });

    document.querySelectorAll(".atlas-min-chip").forEach((chip) => {
      chip.addEventListener("click", () => {
        this.minCount = parseInt(chip.dataset.min, 10);
        this.limit = 20;
        this.syncControlUI();
        this.renderGraph();
      });
    });

    document.querySelectorAll(".atlas-range-chip").forEach((chip) => {
      chip.addEventListener("click", () => {
        this.range = chip.dataset.range;
        this.load();
      });
    });

    const searchInput = document.getElementById("atlas-search");
    searchInput.addEventListener("keydown", (e) => {
      if (e.key === "Enter") this.searchNode(searchInput.value.trim());
    });
    document.getElementById("atlas-search-btn").addEventListener("click", () => this.searchNode(searchInput.value.trim()));

    document.getElementById("atlas-more-btn").addEventListener("click", () => {
      this.limit += 20;
      this.renderGraph();
    });

    document.getElementById("atlas-unfocus-btn").addEventListener("click", () => {
      this.focus = null;
      this.renderGraph();
    });

    // Zeitraffer (B.5)
    const slider = document.getElementById("atlas-timelapse-slider");
    slider.addEventListener("input", () => this.onTimelapseInput(parseInt(slider.value, 10)));
    document.getElementById("atlas-timelapse-play").addEventListener("click", () => this.toggleTimelapsePlay());

    this.syncControlUI();
  },

  syncControlUI() {
    document.querySelectorAll(".atlas-kind-toggle").forEach((btn) => {
      btn.classList.toggle("active", this.activeKinds.includes(btn.dataset.kind));
    });
    document.querySelectorAll(".atlas-min-chip").forEach((chip) => {
      chip.classList.toggle("active", parseInt(chip.dataset.min, 10) === this.minCount);
    });
    document.querySelectorAll(".atlas-range-chip").forEach((chip) => {
      chip.classList.toggle("active", chip.dataset.range === this.range);
    });
  },

  searchNode(term) {
    if (!term) return;
    const hit = this.allNodes.find((n) => n.name.toLowerCase().includes(term.toLowerCase()));
    if (!hit) {
      showToast(t("atlas.notFound", { term }));
      return;
    }
    this.focus = { id: hit.id, name: hit.name, kind: hit.kind };
    this.searchHighlight = hit.id;
    this.renderGraph();
  },

  visibleNodesAndLinks() {
    // rawTotal: alles, was im gewählten Zeitraum überhaupt existiert (vor
    // Art-/Häufigkeits-Filter, Fokus, Top-N) — Basis für die Bilanz-Zeile (H.1).
    const rawTotal = this.allNodes.length;
    let nodes = this.allNodes.filter((n) => this.activeKinds.includes(n.kind) && n.count >= this.minCount);
    let links = this.allLinks;

    if (this.focus) {
      const neighborIds = new Set([this.focus.id]);
      links.forEach((l) => {
        if (l.source === this.focus.id) neighborIds.add(l.target);
        if (l.target === this.focus.id) neighborIds.add(l.source);
      });
      nodes = nodes.filter((n) => neighborIds.has(n.id));
      links = links.filter((l) => neighborIds.has(l.source) && neighborIds.has(l.target));
      return { nodes, links, truncated: false, rawTotal, filteredTotal: nodes.length };
    }

    nodes = [...nodes].sort((a, b) => b.count - a.count);
    const filteredTotal = nodes.length;
    const truncated = nodes.length > this.limit;
    nodes = nodes.slice(0, this.limit);
    const ids = new Set(nodes.map((n) => n.id));
    links = links.filter((l) => ids.has(l.source) && ids.has(l.target));
    return { nodes, links, truncated, total: filteredTotal, rawTotal, filteredTotal };
  },

  filterDescription() {
    const parts = [];
    if (this.minCount > 1) parts.push(`≥${this.minCount}×`);
    if (this.range !== "all") parts.push(this.range === "30" ? t("stats.range30") : this.range === "90" ? t("stats.range90") : this.range);
    if (this.activeKinds.length < 3) {
      const labels = { place: t("atlas.kindPlace"), person: t("atlas.kindPerson"), dream_sign: t("atlas.kindDreamSign") };
      parts.push(t("atlas.filterOnlyKinds", { kinds: this.activeKinds.map((k) => labels[k]).join("/") }));
    }
    if (this.focus) parts.push(t("atlas.filterFocus", { name: this.focus.name }));
    if (this.timelapseDate) parts.push(t("atlas.filterTimelapsePast"));
    return parts;
  },

  renderBalance(rawTotal, filteredTotal) {
    const el = document.getElementById("atlas-balance");
    if (!el) return;
    const filters = this.filterDescription();
    if (!filters.length) {
      el.innerHTML = `<p class="hint">${t("atlas.elementsVisibleSimple", { count: rawTotal, noun: rawTotal === 1 ? t("atlas.elementOne") : t("atlas.elementMany") })}</p>`;
      return;
    }
    el.innerHTML = `<p class="hint">
      <strong>${t("atlas.balanceDetail", { filtered: filteredTotal, raw: rawTotal })}</strong> · ${t("atlas.filterPrefix")} ${filters.join(", ")} ·
      <button class="hint atlas-reset-link" id="atlas-reset-filters">${t("journal.filterReset")}</button>
    </p>`;
    document.getElementById("atlas-reset-filters").addEventListener("click", () => this.resetFilters());
  },

  renderGraph() {
    const graphEl = document.getElementById("atlas-graph");
    const { nodes, links, truncated, total, rawTotal, filteredTotal } = this.visibleNodesAndLinks();
    this.renderBalance(rawTotal, filteredTotal);

    const focusBar = document.getElementById("atlas-focus-bar");
    if (this.focus) {
      focusBar.classList.remove("hidden");
      document.getElementById("atlas-focus-label").textContent = t("atlas.filterFocus", { name: this.focus.name });
    } else {
      focusBar.classList.add("hidden");
    }

    const moreBtn = document.getElementById("atlas-more-btn");
    if (!this.focus && truncated) {
      moreBtn.classList.remove("hidden");
      moreBtn.textContent = t("atlas.showMore", { n: total - nodes.length });
    } else {
      moreBtn.classList.add("hidden");
    }

    if (!nodes.length) {
      // H.1: Freundlicher Leer-Zustand statt totem SVG, wenn Filter alles verstecken
      graphEl.innerHTML = rawTotal > 0
        ? `<div class="empty-state">${t("atlas.filtersHideAll", { raw: rawTotal })}
            <button class="chip" id="atlas-reset-filters-empty">${t("journal.filterReset")}</button></div>`
        : `<div class="empty-state">${t("atlas.noElementsFiltered")}</div>`;
      document.getElementById("atlas-reset-filters-empty")?.addEventListener("click", () => this.resetFilters());
      return;
    }
    this.render(graphEl, { nodes, links });
  },

  render(el, { nodes, links }) {
    const width = Math.min(el.clientWidth || 680, 680);
    const height = Math.max(300, Math.min(60 * (this.canonicalNodes?.length || nodes.length) + 160, 460));
    if (!this.focus && this.canonicalPositions) {
      // Eingefrorenes Layout wiederverwenden (Zeitraffer-Stabilität, B.5)
      nodes.forEach((n) => {
        const pos = this.canonicalPositions[n.id];
        n.x = pos ? pos.x : width / 2;
        n.y = pos ? pos.y : height / 2;
      });
    } else {
      this.layout(nodes, links, width, height);
    }

    const byId = Object.fromEntries(nodes.map((n) => [n.id, n]));
    const radius = (n) => 10 + Math.min(n.count, 8) * 4;

    const lines = links.map((l) => {
      const a = byId[l.source], b = byId[l.target];
      return `<line x1="${a.x}" y1="${a.y}" x2="${b.x}" y2="${b.y}"
        stroke="#3a3c55" stroke-width="${Math.min(l.weight * 1.5, 5)}" />`;
    }).join("");

    // H.1: Bei wenigen sichtbaren Knoten (≤15) alle Namen zeigen — erst
    // darüber greift die Hygiene-Regel gegen das Knäuel (B.1).
    const showAllLabels = nodes.length <= 15;
    // Traumtakt-Microinteraction: nur wirklich neue Knoten (noch nie gesehen,
    // z. B. beim Zeitraffer-Vorlauf) "keimen" aus dem Nebel — nicht jeder
    // Knoten bei jedem Filter-Wechsel.
    const circles = nodes.map((n) => {
      const showLabel = showAllLabels || n.count >= 2 || radius(n) > 15;
      const highlighted = this.searchHighlight === n.id;
      const isNew = !this._knownNodeIds.has(n.id);
      return `
      <g class="atlas-node${isNew ? " atlas-node-keimen" : ""}" data-id="${escapeHtml(n.id)}" data-name="${escapeHtml(n.name)}" data-kind="${n.kind}" style="--keim-x:${n.x}px;--keim-y:${n.y}px">
        <title>${escapeHtml(n.name)} (${n.count}×)</title>
        <circle cx="${n.x}" cy="${n.y}" r="${radius(n)}"
          fill="${this.COLORS[n.kind]}" fill-opacity="0.85"
          ${highlighted ? 'stroke="#f5c66a" stroke-width="3"' : ""} />
        ${showLabel ? `<text x="${n.x}" y="${n.y - radius(n) - 5}" text-anchor="middle"
          fill="#e8e6f0" font-size="12">${this.ICONS[n.kind]} ${escapeHtml(n.name)}${n.count > 1 ? ` (${n.count}×)` : ""}</text>` : ""}
      </g>`;
    }).join("");

    el.innerHTML = `<svg viewBox="0 0 ${width} ${height}" width="100%" height="${height}">
      ${lines}${circles}</svg>`;

    el.querySelectorAll(".atlas-node").forEach((g) => {
      g.addEventListener("click", () => this.showSeries(g.dataset.name, g.dataset.kind, g.dataset.id));
    });
    nodes.forEach((n) => this._knownNodeIds.add(n.id));
    this.searchHighlight = null;
  },

  // Einfache Kräfte-Simulation: Knoten stoßen sich ab, Verbindungen ziehen an
  layout(nodes, links, width, height) {
    nodes.forEach((n, i) => {
      const angle = (i / nodes.length) * 2 * Math.PI;
      n.x = width / 2 + Math.cos(angle) * width * 0.28;
      n.y = height / 2 + Math.sin(angle) * height * 0.28;
    });
    const index = Object.fromEntries(nodes.map((n, i) => [n.id, i]));
    const repulsion = 1800 + 80 * nodes.length;
    const iterations = nodes.length > 40 ? 150 : 250;

    for (let iter = 0; iter < iterations; iter++) {
      for (let i = 0; i < nodes.length; i++) {
        for (let j = i + 1; j < nodes.length; j++) {
          let dx = nodes[j].x - nodes[i].x, dy = nodes[j].y - nodes[i].y;
          const d2 = dx * dx + dy * dy || 1;
          const force = repulsion / d2;
          dx *= force; dy *= force;
          nodes[i].x -= dx; nodes[i].y -= dy;
          nodes[j].x += dx; nodes[j].y += dy;
        }
      }
      for (const l of links) {
        const a = nodes[index[l.source]], b = nodes[index[l.target]];
        if (!a || !b) continue;
        const pull = 0.006 * Math.min(l.weight, 3);
        const dx = b.x - a.x, dy = b.y - a.y;
        a.x += dx * pull; a.y += dy * pull;
        b.x -= dx * pull; b.y -= dy * pull;
      }
      for (const n of nodes) {
        n.x += (width / 2 - n.x) * 0.012;
        n.y += (height / 2 - n.y) * 0.012;
      }
    }
    for (const n of nodes) {
      n.x = Math.round(Math.max(45, Math.min(width - 45, n.x)));
      n.y = Math.round(Math.max(40, Math.min(height - 25, n.y)));
    }
  },

  // ---- Atlas-Zeitraffer (B.5) ----
  async buildTimelapseRange() {
    if (this.timelapseDates) return;
    let dreams;
    try {
      dreams = await api.listDreams({});
    } catch {
      return;
    }
    if (!dreams.length) return;
    const dates = dreams.map((d) => d.date).sort();
    const first = new Date(dates[0]);
    const today = new Date();
    const months = [];
    const cursor = new Date(first.getFullYear(), first.getMonth(), 1);
    while (cursor <= today) {
      months.push(cursor.toISOString().slice(0, 10));
      cursor.setMonth(cursor.getMonth() + 1);
    }
    months.push(today.toISOString().slice(0, 10));
    this.timelapseDates = months;
    const slider = document.getElementById("atlas-timelapse-slider");
    slider.max = String(months.length - 1);
    slider.value = String(months.length - 1);
    document.getElementById("atlas-timelapse-date").textContent = t("atlas.today");
  },

  onTimelapseInput(idx) {
    if (!this.timelapseDates) return;
    const isLast = idx === this.timelapseDates.length - 1;
    this.timelapseDate = isLast ? "" : this.timelapseDates[idx];
    document.getElementById("atlas-timelapse-date").textContent = isLast ? t("atlas.today") : this.timelapseDates[idx];
    this.load();
  },

  toggleTimelapsePlay() {
    const btn = document.getElementById("atlas-timelapse-play");
    const slider = document.getElementById("atlas-timelapse-slider");
    if (this.playTimer) {
      clearInterval(this.playTimer);
      this.playTimer = null;
      btn.textContent = "▶";
      return;
    }
    btn.textContent = "⏸";
    this.playTimer = setInterval(() => {
      let v = parseInt(slider.value, 10) + 1;
      if (v > parseInt(slider.max, 10)) {
        clearInterval(this.playTimer);
        this.playTimer = null;
        btn.textContent = "▶";
        return;
      }
      slider.value = String(v);
      this.onTimelapseInput(v);
    }, 800);
  },

  // label/hint sind Getter statt fester Strings: bestehende Zugriffe
  // (a.label, a.hint) bleiben unverändert, liefern aber übersetzten Text.
  ARCHETYPES: {
    schatten:      { icon: "🌑", get label() { return t("atlas.archetype.schatten.label"); },     get hint() { return t("atlas.archetype.schatten.hint"); } },
    anima_animus:  { icon: "🌗", get label() { return t("atlas.archetype.animaAnimus.label"); },  get hint() { return t("atlas.archetype.animaAnimus.hint"); } },
    weiser:        { icon: "🧙", get label() { return t("atlas.archetype.weiser.label"); },        get hint() { return t("atlas.archetype.weiser.hint"); } },
    kind:          { icon: "🧒", get label() { return t("atlas.archetype.kind.label"); },          get hint() { return t("atlas.archetype.kind.hint"); } },
    trickster:     { icon: "🃏", get label() { return t("atlas.archetype.trickster.label"); },     get hint() { return t("atlas.archetype.trickster.hint"); } },
    held:          { icon: "⚔️", get label() { return t("atlas.archetype.held.label"); },          get hint() { return t("atlas.archetype.held.hint"); } },
    grosse_mutter: { icon: "🌳", get label() { return t("atlas.archetype.grosseMutter.label"); },  get hint() { return t("atlas.archetype.grosseMutter.hint"); } },
    persona:       { icon: "🎭", get label() { return t("atlas.archetype.persona.label"); },       get hint() { return t("atlas.archetype.persona.hint"); } },
  },

  AMPLIFICATION_PROMPTS: [
    "atlas.amplify1",
    "atlas.amplify2",
    "atlas.amplify3",
    "atlas.amplify4",
    "atlas.amplify5",
  ],

  async showSeries(name, kind, nodeId) {
    const el = document.getElementById("atlas-series");
    let dreams, tags;
    try {
      [dreams, tags] = await Promise.all([api.listDreams({ tag: name }), api.listTags()]);
    } catch (err) {
      showToast(err.message);
      return;
    }

    const tag = tags.find((t) => t.name === name && t.kind === kind);
    const tagId = tag?.id;

    // Dominant emotions
    const emoCounts = {};
    dreams.forEach((d) => (d.emotions || []).forEach((e) => emoCounts[e] = (emoCounts[e] || 0) + 1));
    const topEmos = Object.entries(emoCounts).sort((a, b) => b[1] - a[1]).slice(0, 3);

    const lucidityLabels = [0, 1, 2, 3, 4].map((i) => t(`journal.lucidityBadge.${i}`));

    // Archetyp section for persons
    let archetypeHtml = "";
    if (kind === "person" && tagId) {
      const current = tag.archetype;
      const currentA = current ? this.ARCHETYPES[current] : null;
      archetypeHtml = `<div class="symbol-section">
        <h3>${t("atlas.archetypeLensTitle")} <small><em>${t("stats.afterJung")}</em></small></h3>
        <p class="hint">${t("atlas.archetypeLensHint")}</p>
        <div class="archetype-current">${currentA ? `${currentA.icon} ${currentA.label}` : `<em>${t("atlas.archetypeNone")}</em>`}</div>
        <div class="archetype-picker" id="archetype-picker">
          <button class="arch-btn ${!current ? "selected" : ""}" data-arch="">${t("atlas.archetypeNoneOption")}</button>
          ${Object.entries(this.ARCHETYPES).map(([key, a]) =>
            `<button class="arch-btn ${current === key ? "selected" : ""}" data-arch="${key}" title="${a.hint}">
              ${a.icon} ${a.label}
            </button>`
          ).join("")}
        </div>
        <a href="#" class="archetype-lexicon-link">${t("atlas.archetypeLexiconLink")}</a>
      </div>`;
    }

    // Amplification prompt
    const promptKey = this.AMPLIFICATION_PROMPTS[Math.floor(Math.random() * this.AMPLIFICATION_PROMPTS.length)];
    const prompt = t(promptKey, { name: escapeHtml(name) });

    el.innerHTML = `<div class="card">
      <h2>${this.ICONS[kind]} ${t("atlas.seriesTitle", { name: escapeHtml(name) })}</h2>
      <div class="stat-cards" style="margin-bottom:0.75rem">
        <div class="stat-card"><span class="stat-value">${dreams.length}</span><span class="stat-label">${dreams.length === 1 ? t("stats.dreamOne") : t("stats.dreamMany")}</span></div>
        ${topEmos.length ? `<div class="stat-card"><span class="stat-value">${topEmos.map(([e]) => EMOTIONS[e]?.icon || e).join(" ")}</span><span class="stat-label">${t("stats.topEmotionsPrefix")}</span></div>` : ""}
      </div>
      ${nodeId ? `<button id="atlas-focus-btn" class="chip">${t("atlas.focusBtn")}</button>` : ""}
      ${archetypeHtml}
      ${tagId ? `<div class="symbol-section">
        <h3>${t("atlas.assocTitle")} <small><em>${t("atlas.assocSubtitle")}</em></small></h3>
        <p class="hint">${t("atlas.assocHint")}</p>
        <div id="symbol-notes"></div>
        <div class="symbol-input-row">
          <input type="text" id="symbol-note-input" placeholder="${escapeHtml(prompt)}">
          <button id="symbol-note-add" class="primary">+</button>
        </div>
      </div>` : ""}
      <p class="hint" style="margin-top:0.5rem">${t("atlas.reappearHint", { name: escapeHtml(name) })}</p>
      ${dreams.map((d) => `
        <div class="series-entry">
          <div class="entry-head">
            <h3>${d.big_dream ? "⭐ " : ""}${escapeHtml(d.title)}</h3>
            <span class="entry-date">${formatDate(d.date)}</span>
          </div>
          ${d.content ? `<p>${escapeHtml(d.content.length > 180 ? d.content.slice(0, 180) + "…" : d.content)}</p>` : ""}
          <span class="badge ${d.lucidity >= 3 ? "lucid" : ""}">${lucidityLabels[d.lucidity]}</span>
        </div>`).join("")}
    </div>`;

    if (nodeId) {
      document.getElementById("atlas-focus-btn").addEventListener("click", () => {
        this.focus = { id: nodeId, name, kind };
        this.renderGraph();
        document.getElementById("atlas-graph").scrollIntoView({ behavior: "smooth" });
      });
    }

    // Wire up symbol notes
    if (tagId) {
      this.loadSymbolNotes(tagId);
      document.getElementById("symbol-note-add").addEventListener("click", () => this.addSymbolNote(tagId));
      document.getElementById("symbol-note-input").addEventListener("keydown", (e) => {
        if (e.key === "Enter") this.addSymbolNote(tagId);
      });
    }

    // Wire up archetype picker
    if (kind === "person" && tagId) {
      document.getElementById("archetype-picker").addEventListener("click", async (e) => {
        const btn = e.target.closest(".arch-btn");
        if (!btn) return;
        const arch = btn.dataset.arch || null;
        try {
          await api.setArchetype(tagId, arch);
          document.querySelectorAll(".arch-btn").forEach((b) => b.classList.remove("selected"));
          btn.classList.add("selected");
          const a = arch ? this.ARCHETYPES[arch] : null;
          document.querySelector(".archetype-current").innerHTML = a ? `${a.icon} ${a.label}` : `<em>${t("atlas.archetypeNone")}</em>`;
          showToast(a ? t("atlas.archetypeAssigned", { icon: a.icon, label: a.label }) : t("atlas.archetypeRemoved"));
        } catch (err) { showToast(err.message); }
      });
      el.querySelector(".archetype-lexicon-link")?.addEventListener("click", (e) => {
        e.preventDefault();
        openArchetypeLexikon();
      });
    }

    // Wissens-Momente
    const archSection = el.querySelector(".archetype-picker")?.closest(".symbol-section");
    if (archSection) wissen.attach(archSection.querySelector("h3"), "archetypen");
    const symbolSection = el.querySelector("#symbol-notes")?.closest(".symbol-section");
    if (symbolSection) wissen.attach(symbolSection.querySelector("h3"), "amplifikation");

    el.scrollIntoView({ behavior: "smooth" });
  },

  async loadSymbolNotes(tagId) {
    const el = document.getElementById("symbol-notes");
    try {
      const notes = await api.listSymbolNotes(tagId);
      if (!notes.length) {
        el.innerHTML = `<p class="hint">${t("atlas.noAssociations")}</p>`;
        return;
      }
      el.innerHTML = notes.map((n) => `
        <div class="symbol-note">
          <span>${escapeHtml(n.text)}</span>
          <span class="hint">${new Date(n.created_at).toLocaleDateString(localeForLang())}</span>
          <button class="ref-del hint" onclick="atlas.removeSymbolNote(${n.id},${tagId})">✕</button>
        </div>`).join("");
    } catch {}
  },

  async addSymbolNote(tagId) {
    const input = document.getElementById("symbol-note-input");
    const text = input.value.trim();
    if (!text) return;
    try {
      await api.createSymbolNote(tagId, text);
      input.value = "";
      this.loadSymbolNotes(tagId);
      showToast(t("atlas.associationSaved"));
    } catch (err) { showToast(err.message); }
  },

  async removeSymbolNote(noteId, tagId) {
    try {
      await api.deleteSymbolNote(noteId);
      this.loadSymbolNotes(tagId);
    } catch (err) { showToast(err.message); }
  },
};

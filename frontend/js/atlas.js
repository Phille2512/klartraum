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
      graphEl.innerHTML = `<div class="empty-state">Noch keine Karte: Gib deinen Träumen
        📍 Orte, 👤 Personen und 🔮 Traumzeichen – hier entsteht daraus deine Traumwelt.</div>`;
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
      showToast(`„${term}" nicht gefunden`);
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
    if (this.range !== "all") parts.push(this.range === "30" ? "30 Tage" : this.range === "90" ? "90 Tage" : this.range);
    if (this.activeKinds.length < 3) {
      const labels = { place: "Orte", person: "Personen", dream_sign: "Traumzeichen" };
      parts.push(`nur ${this.activeKinds.map((k) => labels[k]).join("/")}`);
    }
    if (this.focus) parts.push(`Fokus: ${this.focus.name}`);
    if (this.timelapseDate) parts.push("Zeitraffer in der Vergangenheit");
    return parts;
  },

  renderBalance(rawTotal, filteredTotal) {
    const el = document.getElementById("atlas-balance");
    if (!el) return;
    const filters = this.filterDescription();
    if (!filters.length) {
      el.innerHTML = `<p class="hint">${rawTotal} ${rawTotal === 1 ? "Element" : "Elemente"} sichtbar</p>`;
      return;
    }
    el.innerHTML = `<p class="hint">
      <strong>${filteredTotal} von ${rawTotal} Elementen sichtbar</strong> · Filter: ${filters.join(", ")} ·
      <button class="hint atlas-reset-link" id="atlas-reset-filters">Filter zurücksetzen</button>
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
      document.getElementById("atlas-focus-label").textContent = `Fokus: ${this.focus.name}`;
    } else {
      focusBar.classList.add("hidden");
    }

    const moreBtn = document.getElementById("atlas-more-btn");
    if (!this.focus && truncated) {
      moreBtn.classList.remove("hidden");
      moreBtn.textContent = `+ ${total - nodes.length} weitere anzeigen`;
    } else {
      moreBtn.classList.add("hidden");
    }

    if (!nodes.length) {
      // H.1: Freundlicher Leer-Zustand statt totem SVG, wenn Filter alles verstecken
      graphEl.innerHTML = rawTotal > 0
        ? `<div class="empty-state">Deine Filter verstecken gerade alle ${rawTotal} Elemente.
            <button class="chip" id="atlas-reset-filters-empty">Filter zurücksetzen</button></div>`
        : `<div class="empty-state">Keine Elemente mit diesem Filter.</div>`;
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
    const circles = nodes.map((n) => {
      const showLabel = showAllLabels || n.count >= 2 || radius(n) > 15;
      const highlighted = this.searchHighlight === n.id;
      return `
      <g class="atlas-node" data-id="${escapeHtml(n.id)}" data-name="${escapeHtml(n.name)}" data-kind="${n.kind}">
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
    document.getElementById("atlas-timelapse-date").textContent = "Heute";
  },

  onTimelapseInput(idx) {
    if (!this.timelapseDates) return;
    const isLast = idx === this.timelapseDates.length - 1;
    this.timelapseDate = isLast ? "" : this.timelapseDates[idx];
    document.getElementById("atlas-timelapse-date").textContent = isLast ? "Heute" : this.timelapseDates[idx];
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

  ARCHETYPES: {
    schatten:      { icon: "🌑", label: "Der Schatten",    hint: "verkörpert, was du an dir ablehnst oder nicht siehst" },
    anima_animus:  { icon: "🌗", label: "Anima/Animus",    hint: "die innere Gegenstimme, oft gegengeschlechtlich" },
    weiser:        { icon: "🧙", label: "Der/die Weise",   hint: "Rat, Führung, Wissen" },
    kind:          { icon: "🧒", label: "Das Kind",        hint: "Anfang, Spiel, Verletzlichkeit, Potenzial" },
    trickster:     { icon: "🃏", label: "Der Trickster",   hint: "bricht Regeln, stört, bringt Wandel" },
    held:          { icon: "⚔️", label: "Held/in",         hint: "stellt sich, kämpft, überwindet" },
    grosse_mutter: { icon: "🌳", label: "Große Mutter",    hint: "nährt, hält, verschlingt" },
    persona:       { icon: "🎭", label: "Persona",         hint: "die gesellschaftliche Maske" },
  },

  AMPLIFICATION_PROMPTS: [
    "Was verbindest du persönlich mit …?",
    "Was war … für dich als Kind?",
    "Wo ist dir … zuletzt im Wachleben begegnet?",
    "Welche Redewendung fällt dir zu … ein?",
    "Wenn … sprechen könnte — was würde es sagen?",
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

    const lucidityLabels = ["keine Erinnerung", "Fragment", "Traum", "kurz luzide", "voll luzide ✨"];

    // Archetyp section for persons
    let archetypeHtml = "";
    if (kind === "person" && tagId) {
      const current = tag.archetype;
      const currentA = current ? this.ARCHETYPES[current] : null;
      archetypeHtml = `<div class="symbol-section">
        <h3>🌗 Archetyp-Linse <small><em>nach C. G. Jung</em></small></h3>
        <p class="hint">Reflexions-Linse, keine Diagnose — welche passt am ehesten?</p>
        <div class="archetype-current">${currentA ? `${currentA.icon} ${currentA.label}` : "<em>noch keine</em>"}</div>
        <div class="archetype-picker" id="archetype-picker">
          <button class="arch-btn ${!current ? "selected" : ""}" data-arch="">Keine</button>
          ${Object.entries(this.ARCHETYPES).map(([key, a]) =>
            `<button class="arch-btn ${current === key ? "selected" : ""}" data-arch="${key}" title="${a.hint}">
              ${a.icon} ${a.label}
            </button>`
          ).join("")}
        </div>
        <a href="#" class="archetype-lexicon-link">Was bedeuten die Rollen? →</a>
      </div>`;
    }

    // Amplification prompt
    const prompt = this.AMPLIFICATION_PROMPTS[Math.floor(Math.random() * this.AMPLIFICATION_PROMPTS.length)]
      .replace("…", `"${escapeHtml(name)}"`);

    el.innerHTML = `<div class="card">
      <h2>${this.ICONS[kind]} Traumserie: "${escapeHtml(name)}"</h2>
      <div class="stat-cards" style="margin-bottom:0.75rem">
        <div class="stat-card"><span class="stat-value">${dreams.length}</span><span class="stat-label">${dreams.length === 1 ? "Traum" : "Träume"}</span></div>
        ${topEmos.length ? `<div class="stat-card"><span class="stat-value">${topEmos.map(([e]) => EMOTIONS[e]?.icon || e).join(" ")}</span><span class="stat-label">häufigste Gefühle</span></div>` : ""}
      </div>
      ${nodeId ? `<button id="atlas-focus-btn" class="chip">🎯 Fokussieren</button>` : ""}
      ${archetypeHtml}
      ${tagId ? `<div class="symbol-section">
        <h3>📖 Deine Assoziationen <small><em>Amplifikation nach C. G. Jung</em></small></h3>
        <p class="hint">Das Symbol gehört dir — sammle, was es in dir anstößt. Es gibt keine falsche Antwort.</p>
        <div id="symbol-notes"></div>
        <div class="symbol-input-row">
          <input type="text" id="symbol-note-input" placeholder="${escapeHtml(prompt)}">
          <button id="symbol-note-add" class="primary">+</button>
        </div>
      </div>` : ""}
      <p class="hint" style="margin-top:0.5rem">Taucht "${escapeHtml(name)}" wieder auf, ist das dein Stichwort für einen Reality Check.</p>
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
          document.querySelector(".archetype-current").innerHTML = a ? `${a.icon} ${a.label}` : "<em>noch keine</em>";
          showToast(a ? `${a.icon} ${a.label} zugeordnet` : "Archetyp entfernt");
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
        el.innerHTML = '<p class="hint">Noch keine Assoziationen.</p>';
        return;
      }
      el.innerHTML = notes.map((n) => `
        <div class="symbol-note">
          <span>${escapeHtml(n.text)}</span>
          <span class="hint">${new Date(n.created_at).toLocaleDateString("de-DE")}</span>
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
      showToast("Assoziation gespeichert");
    } catch (err) { showToast(err.message); }
  },

  async removeSymbolNote(noteId, tagId) {
    try {
      await api.deleteSymbolNote(noteId);
      this.loadSymbolNotes(tagId);
    } catch (err) { showToast(err.message); }
  },
};

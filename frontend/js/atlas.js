// Traumatlas: Netzwerk-Karte aus Orten, Personen und Traumzeichen.
// Verbunden, wenn sie im selben Traum auftauchen; Knotengröße = Häufigkeit.
const atlas = {
  COLORS: { place: "#8fd49a", person: "#f5c66a", dream_sign: "#c9bfff" },
  ICONS: { place: "📍", person: "👤", dream_sign: "🔮" },

  async load() {
    const graphEl = document.getElementById("atlas-graph");
    let data;
    try {
      data = await api.request("/api/atlas");
    } catch (err) {
      showToast(err.message);
      return;
    }
    document.getElementById("atlas-series").innerHTML = "";
    if (!data.nodes.length) {
      graphEl.innerHTML = `<div class="empty-state">Noch keine Karte: Gib deinen Träumen
        📍 Orte, 👤 Personen und 🔮 Traumzeichen – hier entsteht daraus deine Traumwelt.</div>`;
      return;
    }
    this.render(graphEl, data);
  },

  render(el, { nodes, links }) {
    const width = Math.min(el.clientWidth || 680, 680);
    const height = Math.max(300, Math.min(60 * nodes.length + 160, 460));
    this.layout(nodes, links, width, height);

    const byId = Object.fromEntries(nodes.map((n) => [n.id, n]));
    const radius = (n) => 10 + Math.min(n.count, 8) * 4;

    const lines = links.map((l) => {
      const a = byId[l.source], b = byId[l.target];
      return `<line x1="${a.x}" y1="${a.y}" x2="${b.x}" y2="${b.y}"
        stroke="#3a3c55" stroke-width="${Math.min(l.weight * 1.5, 5)}" />`;
    }).join("");

    const circles = nodes.map((n) => `
      <g class="atlas-node" data-name="${escapeHtml(n.name)}" data-kind="${n.kind}">
        <circle cx="${n.x}" cy="${n.y}" r="${radius(n)}"
          fill="${this.COLORS[n.kind]}" fill-opacity="0.85" />
        <text x="${n.x}" y="${n.y - radius(n) - 5}" text-anchor="middle"
          fill="#e8e6f0" font-size="12">${this.ICONS[n.kind]} ${escapeHtml(n.name)}${n.count > 1 ? ` (${n.count}×)` : ""}</text>
      </g>`).join("");

    el.innerHTML = `<svg viewBox="0 0 ${width} ${height}" width="100%" height="${height}">
      ${lines}${circles}</svg>`;

    el.querySelectorAll(".atlas-node").forEach((g) => {
      g.addEventListener("click", () => this.showSeries(g.dataset.name, g.dataset.kind));
    });
  },

  // Einfache Kräfte-Simulation: Knoten stoßen sich ab, Verbindungen ziehen an
  layout(nodes, links, width, height) {
    nodes.forEach((n, i) => {
      const angle = (i / nodes.length) * 2 * Math.PI;
      n.x = width / 2 + Math.cos(angle) * width * 0.28;
      n.y = height / 2 + Math.sin(angle) * height * 0.28;
    });
    const index = Object.fromEntries(nodes.map((n, i) => [n.id, i]));

    for (let iter = 0; iter < 250; iter++) {
      for (let i = 0; i < nodes.length; i++) {
        for (let j = i + 1; j < nodes.length; j++) {
          let dx = nodes[j].x - nodes[i].x, dy = nodes[j].y - nodes[i].y;
          const d2 = dx * dx + dy * dy || 1;
          const force = 2200 / d2;
          dx *= force; dy *= force;
          nodes[i].x -= dx; nodes[i].y -= dy;
          nodes[j].x += dx; nodes[j].y += dy;
        }
      }
      for (const l of links) {
        const a = nodes[index[l.source]], b = nodes[index[l.target]];
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

  async showSeries(name, kind) {
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

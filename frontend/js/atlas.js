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

  async showSeries(name, kind) {
    const el = document.getElementById("atlas-series");
    let dreams;
    try {
      dreams = await api.listDreams({ tag: name });
    } catch (err) {
      showToast(err.message);
      return;
    }
    const lucidityLabels = ["keine Erinnerung", "Fragment", "Traum", "kurz luzide", "voll luzide ✨"];
    el.innerHTML = `<div class="card">
      <h2>${this.ICONS[kind]} Traumserie: „${escapeHtml(name)}“</h2>
      <p class="hint">${dreams.length} ${dreams.length === 1 ? "Traum" : "Träume"} –
        taucht „${escapeHtml(name)}“ wieder auf, ist das dein Stichwort für einen Reality Check.</p>
      ${dreams.map((d) => `
        <div class="series-entry">
          <div class="entry-head">
            <h3>${escapeHtml(d.title)}</h3>
            <span class="entry-date">${formatDate(d.date)}</span>
          </div>
          ${d.content ? `<p>${escapeHtml(d.content.length > 180 ? d.content.slice(0, 180) + "…" : d.content)}</p>` : ""}
          <span class="badge ${d.lucidity >= 3 ? "lucid" : ""}">${lucidityLabels[d.lucidity]}</span>
        </div>`).join("")}
    </div>`;
    el.scrollIntoView({ behavior: "smooth" });
  },
};

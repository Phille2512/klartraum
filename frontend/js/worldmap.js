const worldmap = {
  data: null,
  mode: "move",
  selectedChip: null,
  pathFirst: null,
  dragging: null,

  async load() {
    try {
      this.data = await api.getMap();
    } catch (err) {
      showToast(err.message);
      return;
    }
    this.render();
  },

  render() {
    const container = document.getElementById("worldmap-container");
    if (!container) return;
    const d = this.data;

    const W = 1000, H = 700;

    // Build node lookup
    const nodeMap = {};
    d.placed.forEach((n) => { nodeMap[n.tag_id] = n; });

    // SVG
    let svg = `<svg id="wm-svg" viewBox="0 0 ${W} ${H}" xmlns="http://www.w3.org/2000/svg" style="width:100%;height:auto;display:block;touch-action:none">`;

    // Background
    svg += `<defs>
      <radialGradient id="wm-bg-grad" cx="50%" cy="50%" r="60%">
        <stop offset="0%" stop-color="#1a1520"/>
        <stop offset="100%" stop-color="#0a0810"/>
      </radialGradient>
      <pattern id="wm-dots" width="20" height="20" patternUnits="userSpaceOnUse">
        <circle cx="10" cy="10" r="0.5" fill="rgba(255,255,255,0.05)"/>
      </pattern>
      <filter id="wm-blur"><feGaussianBlur stdDeviation="25"/></filter>
      <mask id="wm-fog-mask">
        <rect width="${W}" height="${H}" fill="white"/>
        ${d.placed.map((n) => {
          const r = 90 + 15 * Math.min(n.dream_count, 6);
          return `<circle cx="${n.x * W}" cy="${n.y * H}" r="${r}" fill="black" filter="url(#wm-blur)"/>`;
        }).join("")}
      </mask>
    </defs>`;

    svg += `<rect width="${W}" height="${H}" fill="url(#wm-bg-grad)"/>`;
    svg += `<rect width="${W}" height="${H}" fill="url(#wm-dots)"/>`;

    // Paths
    d.paths.forEach((p) => {
      const from = nodeMap[p.from_tag_id];
      const to = nodeMap[p.to_tag_id];
      if (from && to) {
        svg += `<line class="wm-path" data-path-id="${p.id}"
          x1="${from.x * W}" y1="${from.y * H}" x2="${to.x * W}" y2="${to.y * H}"
          stroke="var(--text-dim)" stroke-width="2" stroke-dasharray="6,4" opacity="0.6"/>`;
      }
    });

    // Fog overlay
    svg += `<rect width="${W}" height="${H}" fill="rgba(10,8,16,0.75)" mask="url(#wm-fog-mask)"/>`;

    // Nodes
    d.placed.forEach((n) => {
      const r = 8 + Math.min(n.dream_count, 10) * 2;
      const cx = n.x * W, cy = n.y * H;
      const fill = n.lucid_count > 0 ? "var(--lucid)" : "var(--accent)";
      svg += `<g class="wm-node" data-tag-id="${n.tag_id}">
        <circle cx="${cx}" cy="${cy}" r="${r}" fill="${fill}" opacity="0.85"/>
        <text x="${cx}" y="${cy + r + 14}" text-anchor="middle" fill="var(--text)" font-size="11">${escapeHtml(n.name)}</text>
      </g>`;
    });

    // Empty state
    if (!d.placed.length) {
      svg += `<text x="${W / 2}" y="${H / 2}" text-anchor="middle" fill="var(--text-dim)" font-size="14">
        Tippe einen Ort in der Ablage an und dann auf die Karte —
      </text>
      <text x="${W / 2}" y="${H / 2 + 22}" text-anchor="middle" fill="var(--text-dim)" font-size="14">
        deine Traumwelt beginnt hier.
      </text>`;
    }

    svg += `</svg>`;

    // Toolbar
    const toolbar = `<div class="wm-toolbar">
      <button class="wm-mode-btn ${this.mode === "move" ? "active" : ""}" data-mode="move">✋ Bewegen</button>
      <button class="wm-mode-btn ${this.mode === "path" ? "active" : ""}" data-mode="path">🚶 Weg</button>
    </div>`;

    // Unplaced chips
    const chips = d.unplaced.length
      ? `<div class="wm-unplaced">
          <p class="hint">📍 Unkartierte Orte — antippen, dann auf die Karte tippen:</p>
          <div class="wm-chips">${d.unplaced.map((u) =>
            `<button class="badge place wm-chip" data-tag-id="${u.tag_id}">📍 ${escapeHtml(u.name)} (${u.dream_count}×)</button>`
          ).join("")}</div>
        </div>`
      : "";

    // Detail card
    const detail = `<div id="wm-detail"></div>`;

    container.innerHTML = toolbar + svg + chips + detail;
    this.bind();
  },

  bind() {
    const svg = document.getElementById("wm-svg");
    if (!svg) return;

    // Mode buttons
    document.querySelectorAll(".wm-mode-btn").forEach((btn) => {
      btn.addEventListener("click", () => {
        this.mode = btn.dataset.mode;
        this.pathFirst = null;
        document.querySelectorAll(".wm-mode-btn").forEach((b) => b.classList.remove("active"));
        btn.classList.add("active");
      });
    });

    // Chip selection
    document.querySelectorAll(".wm-chip").forEach((chip) => {
      chip.addEventListener("click", () => {
        document.querySelectorAll(".wm-chip").forEach((c) => c.classList.remove("wm-chip-selected"));
        if (this.selectedChip === Number(chip.dataset.tagId)) {
          this.selectedChip = null;
        } else {
          this.selectedChip = Number(chip.dataset.tagId);
          chip.classList.add("wm-chip-selected");
        }
      });
    });

    // SVG click — place chip or path mode
    svg.addEventListener("click", (e) => {
      if (this.dragging) return;
      const pt = this.svgPoint(svg, e);
      const x = pt.x / 1000, y = pt.y / 700;

      if (this.selectedChip && x >= 0 && x <= 1 && y >= 0 && y <= 1) {
        this.placeChip(this.selectedChip, x, y);
        return;
      }

      const node = e.target.closest(".wm-node");
      if (node) {
        const tagId = Number(node.dataset.tagId);
        if (this.mode === "path") {
          this.handlePathClick(tagId);
        } else {
          this.showDetail(tagId);
        }
        return;
      }

      if (this.mode === "path") {
        const path = e.target.closest(".wm-path");
        if (path) {
          this.confirmDeletePath(Number(path.dataset.pathId));
        }
      }
    });

    // Drag for move mode
    svg.addEventListener("pointerdown", (e) => {
      if (this.mode !== "move") return;
      const node = e.target.closest(".wm-node");
      if (!node) return;
      e.preventDefault();
      const tagId = Number(node.dataset.tagId);
      node.setPointerCapture(e.pointerId);
      this.dragging = { tagId, node, moved: false };
    });

    svg.addEventListener("pointermove", (e) => {
      if (!this.dragging) return;
      this.dragging.moved = true;
      const pt = this.svgPoint(svg, e);
      const circle = this.dragging.node.querySelector("circle");
      const text = this.dragging.node.querySelector("text");
      circle.setAttribute("cx", pt.x);
      circle.setAttribute("cy", pt.y);
      text.setAttribute("x", pt.x);
      text.setAttribute("y", pt.y + parseFloat(circle.getAttribute("r")) + 14);
    });

    svg.addEventListener("pointerup", async (e) => {
      if (!this.dragging) return;
      const d = this.dragging;
      this.dragging = null;
      if (!d.moved) return;
      const pt = this.svgPoint(svg, e);
      const x = Math.max(0, Math.min(1, pt.x / 1000));
      const y = Math.max(0, Math.min(1, pt.y / 700));
      try {
        await api.placeNode(d.tagId, x, y);
        this.load();
      } catch (err) { showToast(err.message); }
    });
  },

  svgPoint(svg, e) {
    const pt = svg.createSVGPoint();
    pt.x = e.clientX;
    pt.y = e.clientY;
    return pt.matrixTransform(svg.getScreenCTM().inverse());
  },

  async placeChip(tagId, x, y) {
    try {
      await api.placeNode(tagId, x, y);
      this.selectedChip = null;
      this.load();
    } catch (err) { showToast(err.message); }
  },

  handlePathClick(tagId) {
    if (!this.pathFirst) {
      this.pathFirst = tagId;
      showToast("Ersten Ort gewählt — tippe den zweiten an");
    } else {
      if (this.pathFirst === tagId) {
        this.pathFirst = null;
        return;
      }
      this.createPath(this.pathFirst, tagId);
      this.pathFirst = null;
    }
  },

  async createPath(from, to) {
    try {
      await api.createPath(from, to);
      this.load();
    } catch (err) { showToast(err.message); }
  },

  async confirmDeletePath(pathId) {
    if (!confirm("Diesen Weg löschen?")) return;
    try {
      await api.deletePath(pathId);
      this.load();
    } catch (err) { showToast(err.message); }
  },

  async showDetail(tagId) {
    const el = document.getElementById("wm-detail");
    const node = this.data.placed.find((n) => n.tag_id === tagId);
    if (!node) return;

    const connectedPaths = this.data.paths.filter(
      (p) => p.from_tag_id === tagId || p.to_tag_id === tagId
    );
    const connectedNames = connectedPaths.map((p) => {
      const otherId = p.from_tag_id === tagId ? p.to_tag_id : p.from_tag_id;
      const other = this.data.placed.find((n) => n.tag_id === otherId);
      return other ? other.name : "?";
    });

    let dreams = [];
    try {
      dreams = await api.listDreams({ tag: node.name });
    } catch { /* ignore */ }

    const lucidityLabels = ["keine Erinnerung", "Fragment", "Traum", "kurz luzide", "voll luzide ✨"];

    el.innerHTML = `<div class="card wm-detail-card">
      <h3>📍 ${escapeHtml(node.name)}</h3>
      <div class="stat-cards">
        <div class="stat-card"><div class="value">${node.dream_count}</div><div class="label">Träume</div></div>
        <div class="stat-card"><div class="value gold">${node.lucid_count}</div><div class="label">davon luzide</div></div>
        <div class="stat-card"><div class="value">${connectedPaths.length}</div><div class="label">Wege</div></div>
      </div>
      ${connectedNames.length ? `<p class="hint">Verbunden mit: ${connectedNames.map((n) => escapeHtml(n)).join(", ")}</p>` : ""}
      ${dreams.map((d) => `<div class="series-entry">
        <h3>${escapeHtml(d.title)} ${d.lucidity >= 3 ? '<span class="badge lucid">' + lucidityLabels[d.lucidity] + "</span>" : ""}</h3>
        <p>${formatDate(d.date)}</p>
      </div>`).join("")}
      <button class="danger" onclick="worldmap.removeFromMap(${tagId})">Von der Karte entfernen</button>
    </div>`;
    el.scrollIntoView({ behavior: "smooth" });
  },

  async removeFromMap(tagId) {
    try {
      await api.removeNode(tagId);
      document.getElementById("wm-detail").innerHTML = "";
      this.load();
    } catch (err) { showToast(err.message); }
  },
};

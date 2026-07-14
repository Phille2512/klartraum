const worldmap = {
  data: null,
  mode: "move",
  selectedChip: null,
  pathFirst: null,
  dragging: null,
  scale: 1,
  panX: 0,
  panY: 0,
  ghostPos: null,
  regionSelectMode: false,
  regionSelection: new Set(),
  undoStack: [],

  W: 1000,
  H: 700,

  get MODE_HINTS() {
    return {
      move: t("wm.modeHint.move"),
      place: t("wm.modeHint.place"),
      path: t("wm.modeHint.path"),
      remove: t("wm.modeHint.remove"),
    };
  },

  async load() {
    try {
      this.data = await api.getMap();
    } catch (err) {
      showToast(err.message);
      return;
    }
    this.render();
  },

  clampScale(s) { return Math.max(0.5, Math.min(3, s)); },

  viewBox() {
    const vw = this.W / this.scale, vh = this.H / this.scale;
    return { x: this.panX, y: this.panY, w: vw, h: vh };
  },

  render() {
    const container = document.getElementById("worldmap-container");
    if (!container) return;
    const d = this.data;
    const W = this.W, H = this.H;

    const nodeMap = {};
    d.placed.forEach((n) => { nodeMap[n.tag_id] = n; });
    const regionMap = Object.fromEntries((d.regions || []).map((r) => [r.id, r]));

    const vb = this.viewBox();
    let svg = `<svg id="wm-svg" viewBox="${vb.x} ${vb.y} ${vb.w} ${vb.h}" xmlns="http://www.w3.org/2000/svg" style="width:100%;height:auto;display:block;touch-action:none">`;

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

    svg += `<rect id="wm-bg-rect" width="${W}" height="${H}" fill="url(#wm-bg-grad)"/>`;
    svg += `<rect width="${W}" height="${H}" fill="url(#wm-dots)" pointer-events="none"/>`;

    // Regionen: weiche Farbfläche hinter den Knoten (B.2)
    const byRegion = {};
    d.placed.forEach((n) => { if (n.region_id) (byRegion[n.region_id] = byRegion[n.region_id] || []).push(n); });
    for (const [regionId, members] of Object.entries(byRegion)) {
      const region = regionMap[regionId];
      if (!region || members.length < 1) continue;
      const pts = members.map((n) => [n.x * W, n.y * H]);
      const hull = this.convexHull(pts);
      if (hull.length >= 3) {
        const path = this.roundedHullPath(hull, 55);
        svg += `<path d="${path}" fill="${region.color}" fill-opacity="0.18" stroke="${region.color}" stroke-opacity="0.4" stroke-width="2"/>`;
        const cx = hull.reduce((s, p) => s + p[0], 0) / hull.length;
        const cy = Math.min(...hull.map((p) => p[1])) - 65;
        svg += `<text x="${cx}" y="${cy}" text-anchor="middle" fill="${region.color}" font-size="13" opacity="0.85">${escapeHtml(region.name)}</text>`;
      } else if (members.length === 2) {
        svg += `<line x1="${pts[0][0]}" y1="${pts[0][1]}" x2="${pts[1][0]}" y2="${pts[1][1]}"
          stroke="${region.color}" stroke-opacity="0.18" stroke-width="110" stroke-linecap="round"/>`;
        const mx = (pts[0][0] + pts[1][0]) / 2, my = Math.min(pts[0][1], pts[1][1]) - 65;
        svg += `<text x="${mx}" y="${my}" text-anchor="middle" fill="${region.color}" font-size="13" opacity="0.85">${escapeHtml(region.name)}</text>`;
      } else if (members.length === 1) {
        svg += `<circle cx="${pts[0][0]}" cy="${pts[0][1]}" r="60" fill="${region.color}" fill-opacity="0.15"/>`;
        svg += `<text x="${pts[0][0]}" y="${pts[0][1] - 75}" text-anchor="middle" fill="${region.color}" font-size="13" opacity="0.85">${escapeHtml(region.name)}</text>`;
      }
    }

    d.paths.forEach((p) => {
      const from = nodeMap[p.from_tag_id];
      const to = nodeMap[p.to_tag_id];
      if (from && to) {
        svg += `<line class="wm-path" data-path-id="${p.id}"
          x1="${from.x * W}" y1="${from.y * H}" x2="${to.x * W}" y2="${to.y * H}"
          stroke="var(--text-dim)" stroke-width="2" stroke-dasharray="6,4" opacity="0.6"/>`;
      }
    });

    svg += `<rect class="wm-fog" width="${W}" height="${H}" fill="rgba(10,8,16,0.75)" mask="url(#wm-fog-mask)" pointer-events="none"/>`;

    d.placed.forEach((n) => {
      const r = 8 + Math.min(n.dream_count, 10) * 2;
      const cx = n.x * W, cy = n.y * H;
      const fill = n.lucid_count > 0 ? "var(--lucid)" : "var(--accent)";
      const selected = this.regionSelectMode && this.regionSelection.has(n.tag_id);
      const searchHit = this.searchHighlight === n.tag_id;
      svg += `<g class="wm-node" data-tag-id="${n.tag_id}">
        <circle cx="${cx}" cy="${cy}" r="${r}" fill="${fill}" opacity="0.85"
          ${selected ? 'stroke="#fff" stroke-width="3"' : ""}
          ${searchHit ? 'stroke="#f5c66a" stroke-width="3"' : ""}/>
        ${selected ? `<text x="${cx}" y="${cy + 4}" text-anchor="middle" font-size="12">✓</text>` : ""}
        <text x="${cx}" y="${cy + r + 14}" text-anchor="middle" fill="var(--text)" font-size="11">${escapeHtml(n.name)}</text>
      </g>`;
    });

    if (this.ghostPos && this.mode === "place" && this.selectedChip) {
      svg += `<circle id="wm-ghost" cx="${this.ghostPos.x}" cy="${this.ghostPos.y}" r="14" fill="var(--accent)" fill-opacity="0.45" stroke="var(--accent)" stroke-dasharray="4,3" pointer-events="none"/>`;
    }

    if (!d.placed.length) {
      svg += `<text x="${W / 2}" y="${H / 2}" text-anchor="middle" fill="var(--text-dim)" font-size="14">
        ${t("wm.emptyLine1")}
      </text>
      <text x="${W / 2}" y="${H / 2 + 22}" text-anchor="middle" fill="var(--text-dim)" font-size="14">
        ${t("wm.emptyLine2")}
      </text>`;
    }

    svg += `</svg>`;

    const modeLabels = { move: t("wm.modeMove"), place: t("wm.modePlace"), path: t("wm.modePath"), remove: t("wm.modeRemove") };
    const toolbar = `<div class="wm-toolbar">
      <div class="chip-row">
        ${Object.entries(modeLabels).map(([m, label]) =>
          `<button class="wm-mode-btn chip ${this.mode === m ? "active" : ""}" data-mode="${m}">${label}</button>`
        ).join("")}
      </div>
      <p class="hint wm-mode-hint">${this.MODE_HINTS[this.mode]}</p>
      <div class="chip-row">
        <button id="wm-zoom-out" class="chip">−</button>
        <button id="wm-zoom-reset" class="chip">⌂</button>
        <button id="wm-zoom-in" class="chip">+</button>
        <button id="wm-undo" class="chip" ${this.undoStack.length ? "" : "disabled"}>${t("wm.undo")}</button>
        <button id="wm-region-toggle" class="chip ${this.regionSelectMode ? "active" : ""}">${t("wm.region")}</button>
      </div>
      <div class="atlas-search-row">
        <input type="text" id="wm-search" placeholder="${t("wm.searchPlaceholder")}">
        <button id="wm-search-btn">🔍</button>
      </div>
      ${this.regionSelectMode ? `<div class="wm-region-bar">
        <span>${t("wm.regionSelected", { count: this.regionSelection.size })}</span>
        <button id="wm-region-group" class="primary" ${this.regionSelection.size < 2 ? "disabled" : ""}>${t("wm.regionNameIt")}</button>
        <button id="wm-region-cancel" class="chip">${t("common.cancel")}</button>
      </div>` : ""}
    `;

    const chips = d.unplaced.length
      ? `<div class="wm-unplaced">
          <p class="hint">${t("wm.unplacedHint")}</p>
          <div class="wm-chips">${d.unplaced.map((u) =>
            `<button class="badge place wm-chip ${this.selectedChip === u.tag_id ? "wm-chip-selected" : ""}" data-tag-id="${u.tag_id}">📍 ${escapeHtml(u.name)} (${u.dream_count}×)</button>`
          ).join("")}</div>
        </div>`
      : "";

    const detail = `<div id="wm-detail"></div>`;

    container.innerHTML = toolbar + svg + chips + detail;
    this.bind();
  },

  bind() {
    const svg = document.getElementById("wm-svg");
    if (!svg) return;

    document.querySelectorAll(".wm-mode-btn").forEach((btn) => {
      btn.addEventListener("click", () => {
        this.mode = btn.dataset.mode;
        this.pathFirst = null;
        this.selectedChip = null;
        this.render();
      });
    });

    document.getElementById("wm-zoom-in").addEventListener("click", () => this.zoomButtons(1.3));
    document.getElementById("wm-zoom-out").addEventListener("click", () => this.zoomButtons(1 / 1.3));
    document.getElementById("wm-zoom-reset").addEventListener("click", () => { this.scale = 1; this.panX = 0; this.panY = 0; this.render(); });
    document.getElementById("wm-undo").addEventListener("click", () => this.undo());
    document.getElementById("wm-region-toggle").addEventListener("click", () => {
      this.regionSelectMode = !this.regionSelectMode;
      this.regionSelection = new Set();
      this.render();
    });
    document.getElementById("wm-region-group")?.addEventListener("click", () => this.promptCreateRegion());
    document.getElementById("wm-region-cancel")?.addEventListener("click", () => {
      this.regionSelectMode = false;
      this.regionSelection = new Set();
      this.render();
    });

    const searchInput = document.getElementById("wm-search");
    const doSearch = () => {
      const term = searchInput.value.trim().toLowerCase();
      if (!term) return;
      const hit = this.data.placed.find((n) => n.name.toLowerCase().includes(term));
      if (!hit) { showToast(t("atlas.notFound", { term })); return; }
      this.centerOn(hit);
    };
    searchInput.addEventListener("keydown", (e) => { if (e.key === "Enter") doSearch(); });
    document.getElementById("wm-search-btn").addEventListener("click", doSearch);

    document.querySelectorAll(".wm-chip").forEach((chip) => {
      chip.addEventListener("click", () => {
        if (this.selectedChip === Number(chip.dataset.tagId)) {
          this.selectedChip = null;
          this.ghostPos = null;
        } else {
          this.selectedChip = Number(chip.dataset.tagId);
        }
        this.render();
      });
    });

    svg.addEventListener("click", (e) => {
      if (this.dragging || this.didPan) return;
      const pt = this.svgPoint(svg, e);
      const x = pt.x / this.W, y = pt.y / this.H;

      const node = e.target.closest(".wm-node");
      if (node) {
        const tagId = Number(node.dataset.tagId);
        if (this.regionSelectMode) {
          if (this.regionSelection.has(tagId)) this.regionSelection.delete(tagId);
          else this.regionSelection.add(tagId);
          this.render();
          return;
        }
        if (this.mode === "path") { this.handlePathClick(tagId); return; }
        if (this.mode === "remove") { this.confirmRemove(tagId); return; }
        this.showDetail(tagId);
        return;
      }

      if (this.mode === "place" && this.selectedChip && x >= 0 && x <= 1 && y >= 0 && y <= 1) {
        this.placeChip(this.selectedChip, x, y);
        return;
      }

      if (this.mode === "path") {
        const path = e.target.closest(".wm-path");
        if (path) this.confirmDeletePath(Number(path.dataset.pathId));
      }
    });

    svg.addEventListener("mousemove", (e) => {
      if (this.mode !== "place" || !this.selectedChip) return;
      const pt = this.svgPoint(svg, e);
      this.ghostPos = { x: pt.x, y: pt.y };
      const ghost = document.getElementById("wm-ghost");
      if (ghost) { ghost.setAttribute("cx", pt.x); ghost.setAttribute("cy", pt.y); }
    });

    // Zoom per Mausrad
    svg.addEventListener("wheel", (e) => {
      e.preventDefault();
      const pt = this.svgPoint(svg, e);
      this.zoomAt(pt.x, pt.y, e.deltaY < 0 ? 1.15 : 1 / 1.15);
    }, { passive: false });

    // Drag zum Verschieben von Knoten (Bewegen-Modus)
    svg.addEventListener("pointerdown", (e) => {
      const node = e.target.closest(".wm-node");
      if (node && this.mode === "move" && !this.regionSelectMode) {
        e.preventDefault();
        const tagId = Number(node.dataset.tagId);
        const prev = this.data.placed.find((n) => n.tag_id === tagId);
        node.setPointerCapture(e.pointerId);
        this.dragging = { tagId, node, moved: false, oldX: prev.x, oldY: prev.y };
        return;
      }
      if (!node && e.target.closest("#wm-bg-rect, svg#wm-svg")) {
        this.panStart = { clientX: e.clientX, clientY: e.clientY, panX: this.panX, panY: this.panY, pointerId: e.pointerId };
        this.didPan = false;
        svg.setPointerCapture(e.pointerId);
      }
    });

    svg.addEventListener("pointermove", (e) => {
      if (this.dragging) {
        this.dragging.moved = true;
        const pt = this.svgPoint(svg, e);
        const circle = this.dragging.node.querySelector("circle");
        const text = this.dragging.node.querySelector("text:last-child");
        circle.setAttribute("cx", pt.x);
        circle.setAttribute("cy", pt.y);
        text.setAttribute("x", pt.x);
        text.setAttribute("y", pt.y + parseFloat(circle.getAttribute("r")) + 14);
        return;
      }
      if (this.panStart) {
        const dx = (e.clientX - this.panStart.clientX) / (svg.clientWidth / this.viewBox().w);
        const dy = (e.clientY - this.panStart.clientY) / (svg.clientWidth / this.viewBox().w);
        if (Math.abs(dx) > 2 || Math.abs(dy) > 2) this.didPan = true;
        this.panX = this.panStart.panX - dx;
        this.panY = this.panStart.panY - dy;
        const vb = this.viewBox();
        svg.setAttribute("viewBox", `${vb.x} ${vb.y} ${vb.w} ${vb.h}`);
      }
    });

    svg.addEventListener("pointerup", async (e) => {
      if (this.dragging) {
        const d = this.dragging;
        this.dragging = null;
        if (!d.moved) return;
        const pt = this.svgPoint(svg, e);
        const x = Math.max(0, Math.min(1, pt.x / this.W));
        const y = Math.max(0, Math.min(1, pt.y / this.H));
        try {
          await api.placeNode(d.tagId, x, y);
          this.pushUndo(t("wm.undoLabelMove", { name: d.node.dataset.tagId }), () => api.placeNode(d.tagId, d.oldX, d.oldY));
          this.load();
        } catch (err) { showToast(err.message); }
        return;
      }
      if (this.panStart) {
        this.panStart = null;
        setTimeout(() => { this.didPan = false; }, 0);
      }
    });

    // Pinch-Zoom
    this.activePointers = this.activePointers || new Map();
    svg.addEventListener("pointerdown", (e) => this.activePointers.set(e.pointerId, e));
    svg.addEventListener("pointermove", (e) => {
      if (!this.activePointers.has(e.pointerId)) return;
      this.activePointers.set(e.pointerId, e);
      if (this.activePointers.size === 2) {
        const [p1, p2] = [...this.activePointers.values()];
        const dist = Math.hypot(p1.clientX - p2.clientX, p1.clientY - p2.clientY);
        if (this.pinchStart) {
          const factor = dist / this.pinchStart;
          const mid = { clientX: (p1.clientX + p2.clientX) / 2, clientY: (p1.clientY + p2.clientY) / 2 };
          const pt = this.svgPoint(svg, mid);
          this.zoomAt(pt.x, pt.y, factor);
        }
        this.pinchStart = dist;
      }
    });
    ["pointerup", "pointercancel"].forEach((evt) => {
      svg.addEventListener(evt, (e) => {
        this.activePointers.delete(e.pointerId);
        if (this.activePointers.size < 2) this.pinchStart = null;
      });
    });
  },

  zoomButtons(factor) {
    const vb = this.viewBox();
    this.zoomAt(vb.x + vb.w / 2, vb.y + vb.h / 2, factor);
    this.render();
  },

  zoomAt(ux, uy, factor) {
    const newScale = this.clampScale(this.scale * factor);
    const actualFactor = newScale / this.scale;
    this.panX = ux - (ux - this.panX) / actualFactor;
    this.panY = uy - (uy - this.panY) / actualFactor;
    this.scale = newScale;
    const svg = document.getElementById("wm-svg");
    if (svg) {
      const vb = this.viewBox();
      svg.setAttribute("viewBox", `${vb.x} ${vb.y} ${vb.w} ${vb.h}`);
    }
  },

  centerOn(node) {
    this.scale = 1.6;
    const vb0 = { w: this.W / this.scale, h: this.H / this.scale };
    this.panX = node.x * this.W - vb0.w / 2;
    this.panY = node.y * this.H - vb0.h / 2;
    this.searchHighlight = node.tag_id;
    this.render();
    setTimeout(() => { this.searchHighlight = null; }, 2000);
  },

  svgPoint(svg, e) {
    const pt = svg.createSVGPoint();
    pt.x = e.clientX;
    pt.y = e.clientY;
    return pt.matrixTransform(svg.getScreenCTM().inverse());
  },

  // ---- Undo (B.2) ----
  pushUndo(label, inverse) {
    this.undoStack.push({ label, inverse });
    if (this.undoStack.length > 10) this.undoStack.shift();
  },

  async undo() {
    const action = this.undoStack.pop();
    if (!action) return;
    try {
      await action.inverse();
      showToast(t("wm.undoToast", { label: action.label }));
      this.load();
    } catch (err) { showToast(err.message); }
  },

  async placeChip(tagId, x, y) {
    try {
      await api.placeNode(tagId, x, y);
      this.pushUndo(t("wm.undoLabelPlace"), () => api.removeNode(tagId));
      this.selectedChip = null;
      this.ghostPos = null;
      this.load();
    } catch (err) { showToast(err.message); }
  },

  handlePathClick(tagId) {
    if (!this.pathFirst) {
      this.pathFirst = tagId;
      showToast(t("wm.pathFirstChosen"));
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
      const path = await api.createPath(from, to);
      this.pushUndo(t("wm.undoLabelCreatePath"), () => api.deletePath(path.id));
      this.load();
    } catch (err) { showToast(err.message); }
  },

  async confirmDeletePath(pathId) {
    if (!confirm(t("wm.confirmDeletePath"))) return;
    const path = this.data.paths.find((p) => p.id === pathId);
    try {
      await api.deletePath(pathId);
      if (path) this.pushUndo(t("wm.undoLabelDeletePath"), () => api.createPath(path.from_tag_id, path.to_tag_id, path.note));
      this.load();
    } catch (err) { showToast(err.message); }
  },

  confirmRemove(tagId) {
    if (!confirm(t("wm.confirmRemove"))) return;
    this.removeFromMap(tagId);
  },

  // ---- Regionen (B.2) ----
  async promptCreateRegion() {
    const name = prompt(t("wm.regionNamePrompt"));
    if (!name || !name.trim()) return;
    const palette = ["#8b7ff5", "#f5c66a", "#8fd49a", "#e06c75", "#c9bfff"];
    const color = palette[Math.floor(Math.random() * palette.length)];
    try {
      await api.createRegion(name.trim(), color, [...this.regionSelection]);
      showToast(t("wm.regionCreated", { name: name.trim() }));
      this.regionSelectMode = false;
      this.regionSelection = new Set();
      this.load();
    } catch (err) { showToast(err.message); }
  },

  convexHull(points) {
    const pts = [...new Set(points.map((p) => p.join(",")))].map((s) => s.split(",").map(Number));
    if (pts.length < 3) return pts;
    pts.sort((a, b) => a[0] - b[0] || a[1] - b[1]);
    const cross = (o, a, b) => (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0]);
    const lower = [];
    for (const p of pts) {
      while (lower.length >= 2 && cross(lower[lower.length - 2], lower[lower.length - 1], p) <= 0) lower.pop();
      lower.push(p);
    }
    const upper = [];
    for (let i = pts.length - 1; i >= 0; i--) {
      const p = pts[i];
      while (upper.length >= 2 && cross(upper[upper.length - 2], upper[upper.length - 1], p) <= 0) upper.pop();
      upper.push(p);
    }
    lower.pop(); upper.pop();
    return [...lower, ...upper];
  },

  roundedHullPath(hull, padding) {
    const cx = hull.reduce((s, p) => s + p[0], 0) / hull.length;
    const cy = hull.reduce((s, p) => s + p[1], 0) / hull.length;
    const expanded = hull.map(([x, y]) => {
      const dx = x - cx, dy = y - cy;
      const len = Math.hypot(dx, dy) || 1;
      return [x + (dx / len) * padding, y + (dy / len) * padding];
    });
    return `M ${expanded.map((p) => p.join(",")).join(" L ")} Z`;
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

    const lucidityLabels = [
      t("journal.lucidityBadge.0"),
      t("journal.lucidityBadge.1"),
      t("journal.lucidityBadge.2"),
      t("journal.lucidityBadge.3"),
      t("journal.lucidityBadge.4"),
    ];
    const region = node.region_id ? (this.data.regions || []).find((r) => r.id === node.region_id) : null;

    el.innerHTML = `<div class="card wm-detail-card">
      <h3>📍 ${escapeHtml(node.name)}</h3>
      <div class="stat-cards">
        <div class="stat-card"><div class="value">${node.dream_count}</div><div class="label">${t("wm.dreamsLabel")}</div></div>
        <div class="stat-card"><div class="value gold">${node.lucid_count}</div><div class="label">${t("journal.lucidCountLabel")}</div></div>
        <div class="stat-card"><div class="value">${connectedPaths.length}</div><div class="label">${t("wm.pathsLabel")}</div></div>
      </div>
      ${connectedNames.length ? `<p class="hint">${t("wm.connectedWith")} ${connectedNames.map((n) => escapeHtml(n)).join(", ")}</p>` : ""}
      ${region ? `<p class="hint">${t("wm.regionLabel")} <strong>${escapeHtml(region.name)}</strong>
        <button class="hint" id="wm-region-remove" data-tag-id="${tagId}">${t("wm.regionRemove")}</button></p>` : ""}
      ${dreams.map((d) => `<div class="series-entry">
        <h3>${escapeHtml(d.title)} ${d.lucidity >= 3 ? '<span class="badge lucid">' + lucidityLabels[d.lucidity] + "</span>" : ""}</h3>
        <p>${formatDate(d.date)}</p>
      </div>`).join("")}
      <button class="danger" onclick="worldmap.removeFromMap(${tagId})">${t("wm.removeFromMap")}</button>
    </div>`;
    document.getElementById("wm-region-remove")?.addEventListener("click", async () => {
      try {
        await api.setTagRegion(tagId, null);
        this.load();
      } catch (err) { showToast(err.message); }
    });
    el.scrollIntoView({ behavior: "smooth" });
  },

  async removeFromMap(tagId) {
    const node = this.data.placed.find((n) => n.tag_id === tagId);
    try {
      await api.removeNode(tagId);
      if (node) this.pushUndo("Entfernen", () => api.placeNode(tagId, node.x, node.y));
      document.getElementById("wm-detail").innerHTML = "";
      this.load();
    } catch (err) { showToast(err.message); }
  },
};

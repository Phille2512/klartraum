const innenwelt = {
  SECTOR_ANGLES: {
    schatten:      0,
    anima_animus:  45,
    weiser:        90,
    kind:          135,
    trickster:     180,
    held:          225,
    grosse_mutter: 270,
    persona:       315,
  },

  get SECTOR_SUBTITLES() {
    return {
      schatten: t("innenwelt.sectorSubtitle.schatten"),
      anima_animus: t("innenwelt.sectorSubtitle.animaAnimus"),
      weiser: t("innenwelt.sectorSubtitle.weiser"),
      kind: t("innenwelt.sectorSubtitle.kind"),
      trickster: t("innenwelt.sectorSubtitle.trickster"),
      held: t("innenwelt.sectorSubtitle.held"),
      grosse_mutter: t("innenwelt.sectorSubtitle.grosseMutter"),
      persona: t("innenwelt.sectorSubtitle.persona"),
    };
  },

  MAX_PER_SECTOR: 4,
  MAX_OUTER: 6,

  allFigures: [],
  bound: false,
  sectorFocus: null,

  // ---- Filter-Zustand (B.4) ----
  get activeOnly() { return localStorage.getItem("innenwelt-active-only") !== "false"; },
  set activeOnly(v) { localStorage.setItem("innenwelt-active-only", String(v)); },
  get minCount() { return parseInt(localStorage.getItem("innenwelt-min-count") || "1", 10); },
  set minCount(v) { localStorage.setItem("innenwelt-min-count", String(v)); },
  get view() { return localStorage.getItem("innenwelt-view") || "stage"; },
  set view(v) { localStorage.setItem("innenwelt-view", v); },
  get introSeen() { return localStorage.getItem("innenwelt-intro-seen") === "true"; },
  set introSeen(v) { localStorage.setItem("innenwelt-intro-seen", String(v)); },

  async load() {
    const el = document.getElementById("innenwelt-view");
    let figures;
    try {
      figures = await api.getInnenwelt();
    } catch (err) {
      showToast(err.message);
      return;
    }
    this.allFigures = figures;

    if (!figures.length) {
      el.innerHTML = `<div class="card">
        <h2>${t("innenwelt.stageTitle")} <small>${t("innenwelt.stageSubtitle")}</small></h2>
        <div class="empty-state">${t("innenwelt.emptyStage")}</div>
      </div>`;
      return;
    }

    el.innerHTML = `
      ${this.introSeen ? "" : this.introCard()}
      <div class="card">
        <h2>${t("innenwelt.stageTitle")} <small>${t("innenwelt.stageSubtitle")}</small>
          ${this.introSeen ? `<button class="hint innenwelt-info-btn" id="innenwelt-info-btn">💡</button>` : ""}</h2>
        <p class="hint">${t("innenwelt.hint")}</p>
        <div class="chip-row">
          <button class="chip iw-view-chip ${this.view === "stage" ? "active" : ""}" data-view="stage">${t("innenwelt.viewStage")}</button>
          <button class="chip iw-view-chip ${this.view === "list" ? "active" : ""}" data-view="list">${t("innenwelt.viewList")}</button>
        </div>
        <div class="chip-row">
          <button class="chip iw-active-chip ${this.activeOnly ? "active" : ""}" data-active="true">${t("innenwelt.last12Months")}</button>
          <button class="chip iw-active-chip ${!this.activeOnly ? "active" : ""}" data-active="false">${t("innenwelt.allTime")}</button>
          <button class="chip iw-min-chip ${this.minCount === 1 ? "active" : ""}" data-min="1">${t("atlas.minAll")}</button>
          <button class="chip iw-min-chip ${this.minCount === 2 ? "active" : ""}" data-min="2">≥2×</button>
          <button class="chip iw-min-chip ${this.minCount === 3 ? "active" : ""}" data-min="3">≥3×</button>
        </div>
        <div class="atlas-search-row">
          <input type="text" id="innenwelt-search" placeholder="${t("innenwelt.searchPlaceholder")}">
          <button id="innenwelt-search-btn">🔍</button>
        </div>
        <div id="innenwelt-stage-wrap"></div>
      </div>
      <div id="innenwelt-dossier"></div>`;

    this.bindControls();
    this.renderBody();
    hilfe.attach(el.querySelector(".card h2"), "atlas-innenwelt");
  },

  introCard() {
    return `<div class="card innenwelt-intro">
      <h2>${t("innenwelt.introTitle")}</h2>
      <p>${t("innenwelt.introP1")}</p>
      <p>${t("innenwelt.introP2")}</p>
      <p>${t("innenwelt.introP3")}</p>
      <button class="primary" id="innenwelt-intro-close">${t("innenwelt.introClose")}</button>
    </div>`;
  },

  bindControls() {
    document.getElementById("innenwelt-intro-close")?.addEventListener("click", () => {
      this.introSeen = true;
      this.load();
    });
    document.getElementById("innenwelt-info-btn")?.addEventListener("click", () => {
      this.introSeen = false;
      this.load();
    });
    document.querySelectorAll(".iw-view-chip").forEach((chip) => {
      chip.addEventListener("click", () => {
        this.view = chip.dataset.view;
        this.sectorFocus = null;
        this.load();
      });
    });
    document.querySelectorAll(".iw-active-chip").forEach((chip) => {
      chip.addEventListener("click", () => {
        this.activeOnly = chip.dataset.active === "true";
        this.renderBody();
      });
    });
    document.querySelectorAll(".iw-min-chip").forEach((chip) => {
      chip.addEventListener("click", () => {
        this.minCount = parseInt(chip.dataset.min, 10);
        this.renderBody();
      });
    });
    const searchInput = document.getElementById("innenwelt-search");
    const doSearch = () => {
      const term = searchInput.value.trim().toLowerCase();
      if (!term) return;
      const hit = this.allFigures.find((f) => f.name.toLowerCase().includes(term));
      if (!hit) { showToast(t("atlas.notFound", { term })); return; }
      this.showDossier(hit);
    };
    searchInput.addEventListener("keydown", (e) => { if (e.key === "Enter") doSearch(); });
    document.getElementById("innenwelt-search-btn").addEventListener("click", doSearch);
  },

  filteredFigures() {
    const cutoff = new Date();
    cutoff.setMonth(cutoff.getMonth() - 12);
    return this.allFigures.filter((f) => {
      if (this.activeOnly && new Date(f.last_date) < cutoff) return false;
      if (f.count < this.minCount) return false;
      return true;
    });
  },

  renderBody() {
    const wrap = document.getElementById("innenwelt-stage-wrap");
    const figures = this.filteredFigures();
    if (this.view === "list") {
      this.renderList(wrap, figures);
    } else {
      this.renderStage(wrap, figures);
    }
  },

  // ---- ☰ Liste (B.4) ----
  renderList(wrap, figures) {
    const rows = [...figures].sort((a, b) => b.count - a.count);
    wrap.innerHTML = `<table class="innenwelt-table">
      <thead><tr><th>${t("innenwelt.tableName")}</th><th>${t("innenwelt.tableRole")}</th><th>${t("innenwelt.tableCount")}</th><th>${t("innenwelt.tableLast")}</th><th>${t("innenwelt.tableConversation")}</th></tr></thead>
      <tbody>
        ${rows.map((f) => {
          const a = f.archetype ? atlas.ARCHETYPES[f.archetype] : null;
          return `<tr class="innenwelt-row" data-name="${escapeHtml(f.name)}">
            <td>${escapeHtml(f.name)}</td>
            <td>${a ? `${a.icon} ${a.label}` : `<span class="hint">${t("innenwelt.noRole")}</span>`}</td>
            <td>${f.count}×</td>
            <td>${formatDate(f.last_date)}</td>
            <td>${f.has_imaginations ? "✅" : "–"}</td>
          </tr>`;
        }).join("")}
      </tbody>
    </table>`;
    wrap.querySelectorAll(".innenwelt-row").forEach((row) => {
      row.addEventListener("click", () => {
        const fig = this.allFigures.find((f) => f.name === row.dataset.name);
        if (fig) this.showDossier(fig);
      });
    });
  },

  // ---- 🎭 Bühne (B.3/B.4) ----
  renderStage(wrap, figures) {
    if (this.sectorFocus) {
      this.renderSectorView(wrap, figures, this.sectorFocus);
      return;
    }

    const withArch = figures.filter((f) => f.archetype);
    const withoutArch = figures.filter((f) => !f.archetype);

    const width = 380, height = 380, cx = 190, cy = 190;
    const innerR = 100, outerR = 155;

    let svgContent = "";
    svgContent += `<circle cx="${cx}" cy="${cy}" r="28" fill="var(--accent)" fill-opacity="0.2" stroke="var(--accent)" stroke-width="1.5"/>`;
    svgContent += `<text x="${cx}" y="${cy + 5}" text-anchor="middle" fill="var(--accent)" font-size="16">${t("innenwelt.self")}</text>`;

    for (const [arch, angle] of Object.entries(this.SECTOR_ANGLES)) {
      const a = atlas.ARCHETYPES[arch];
      if (!a) continue;
      const rad = (angle - 90) * Math.PI / 180;
      const lx = cx + Math.cos(rad) * (innerR + 45);
      const ly = cy + Math.sin(rad) * (innerR + 45);
      svgContent += `<g class="innenwelt-sector-label" data-arch="${arch}" style="cursor:pointer">
        <text x="${lx}" y="${ly}" text-anchor="middle" fill="var(--text-dim)" font-size="10" opacity="0.8">${a.icon} ${a.label}</text>
        <text x="${lx}" y="${ly + 11}" text-anchor="middle" fill="var(--text-dim)" font-size="8" opacity="0.55">${this.SECTOR_SUBTITLES[arch] || ""}</text>
      </g>`;
    }

    // Hauptbesetzung: max. 4 Figuren pro Sektor, Rest als Sammel-Chip (B.4)
    const archGroups = {};
    withArch.forEach((f) => { (archGroups[f.archetype] = archGroups[f.archetype] || []).push(f); });

    for (const [arch, allFigs] of Object.entries(archGroups)) {
      const figs = [...allFigs].sort((a, b) => b.count - a.count);
      const shown = figs.slice(0, this.MAX_PER_SECTOR);
      const rest = figs.length - shown.length;
      const baseAngle = this.SECTOR_ANGLES[arch] || 0;
      shown.forEach((f, i) => {
        const spread = shown.length > 1 ? 30 : 0;
        const angle = baseAngle - spread / 2 + (shown.length > 1 ? i * spread / (shown.length - 1) : 0);
        const rad = (angle - 90) * Math.PI / 180;
        const r = 8 + Math.min(f.count, 6) * 3;
        const fx = cx + Math.cos(rad) * innerR;
        const fy = cy + Math.sin(rad) * innerR;
        const color = this.dominantColor(f.emotions);
        const showLabel = f.count >= 2 || r > 15;
        svgContent += `<g class="innenwelt-figure" data-name="${escapeHtml(f.name)}" style="cursor:pointer">
          <circle cx="${fx}" cy="${fy}" r="${r}" fill="${color}" fill-opacity="0.8" stroke="var(--border)" stroke-width="1"/>
          <title>${escapeHtml(f.name)} (${f.count}×)</title>
          ${showLabel ? `<text x="${fx}" y="${fy - r - 4}" text-anchor="middle" fill="var(--text)" font-size="10">${escapeHtml(f.name)}</text>` : ""}
        </g>`;
      });
      if (rest > 0) {
        const rad = (baseAngle - 90) * Math.PI / 180;
        const fx = cx + Math.cos(rad) * (innerR + 22);
        const fy = cy + Math.sin(rad) * (innerR + 22);
        svgContent += `<g class="innenwelt-more-chip" data-arch="${arch}" style="cursor:pointer">
          <circle cx="${fx}" cy="${fy}" r="12" fill="var(--bg-input)" stroke="var(--accent)" stroke-width="1"/>
          <text x="${fx}" y="${fy + 4}" text-anchor="middle" fill="var(--accent)" font-size="10">+${rest}</text>
        </g>`;
      }
    }

    // Äußerer Ring: max. 6 ohne Rolle, Rest als Sammel-Chip
    const sortedOuter = [...withoutArch].sort((a, b) => b.count - a.count);
    const shownOuter = sortedOuter.slice(0, this.MAX_OUTER);
    const restOuter = sortedOuter.length - shownOuter.length;
    shownOuter.forEach((f, i) => {
      const angle = (i / Math.max(shownOuter.length, 1)) * 360;
      const rad = (angle - 90) * Math.PI / 180;
      const r = 7 + Math.min(f.count, 6) * 2;
      const fx = cx + Math.cos(rad) * outerR;
      const fy = cy + Math.sin(rad) * outerR;
      const showLabel = f.count >= 2 || r > 15;
      svgContent += `<g class="innenwelt-figure" data-name="${escapeHtml(f.name)}" style="cursor:pointer">
        <circle cx="${fx}" cy="${fy}" r="${r}" fill="var(--bg-input)" fill-opacity="0.5" stroke="var(--border)" stroke-width="1" stroke-dasharray="3,3"/>
        <title>${escapeHtml(f.name)} (${f.count}×)</title>
        ${showLabel ? `<text x="${fx}" y="${fy - r - 4}" text-anchor="middle" fill="var(--text-dim)" font-size="10">${escapeHtml(f.name)}</text>` : ""}
      </g>`;
    });
    if (restOuter > 0) {
      svgContent += `<g class="innenwelt-more-outer" style="cursor:pointer">
        <circle cx="${cx}" cy="${cy + outerR + 12}" r="14" fill="var(--bg-input)" stroke="var(--text-dim)" stroke-width="1"/>
        <text x="${cx}" y="${cy + outerR + 16}" text-anchor="middle" fill="var(--text-dim)" font-size="10">+${restOuter}</text>
      </g>`;
    }

    wrap.innerHTML = `
      <p class="hint" style="opacity:.7">${t("innenwelt.outerRingHint")}</p>
      <svg viewBox="0 0 ${width} ${height}" width="100%" height="${height}" class="innenwelt-svg">
        ${svgContent}
      </svg>`;

    wrap.querySelectorAll(".innenwelt-figure").forEach((g) => {
      g.addEventListener("click", () => {
        const fig = figures.find((f) => f.name === g.dataset.name);
        if (fig) this.showDossier(fig);
      });
    });
    wrap.querySelectorAll(".innenwelt-sector-label, .innenwelt-more-chip").forEach((g) => {
      g.addEventListener("click", () => {
        this.sectorFocus = g.dataset.arch;
        this.renderBody();
      });
    });
    wrap.querySelector(".innenwelt-more-outer")?.addEventListener("click", () => {
      this.sectorFocus = "__outer__";
      this.renderBody();
    });

    this.renderGuidedFirstContact(wrap, figures, withArch);
  },

  renderGuidedFirstContact(wrap, figures, withArch) {
    if (withArch.length > 0) return;
    const top = [...figures].sort((a, b) => b.count - a.count)[0];
    if (!top) return;
    const banner = document.createElement("div");
    banner.className = "innenwelt-guided";
    banner.innerHTML = t("innenwelt.guidedStart", { name: escapeHtml(top.name) });
    banner.addEventListener("click", () => this.showDossier(top));
    wrap.prepend(banner);
  },

  renderSectorView(wrap, figures, arch) {
    const isOuter = arch === "__outer__";
    const figs = isOuter
      ? figures.filter((f) => !f.archetype)
      : figures.filter((f) => f.archetype === arch);
    const label = isOuter ? t("innenwelt.noRoleLabel") : `${atlas.ARCHETYPES[arch]?.icon || ""} ${atlas.ARCHETYPES[arch]?.label || arch}`;

    const width = 380, cols = 4;
    const rows = Math.ceil(figs.length / cols) || 1;
    const height = Math.max(200, rows * 90 + 40);

    const cells = figs.map((f, i) => {
      const col = i % cols, row = Math.floor(i / cols);
      const fx = 60 + col * 85, fy = 60 + row * 85;
      const r = 10 + Math.min(f.count, 6) * 3;
      const color = isOuter ? "var(--bg-input)" : this.dominantColor(f.emotions);
      return `<g class="innenwelt-figure" data-name="${escapeHtml(f.name)}" style="cursor:pointer">
        <circle cx="${fx}" cy="${fy}" r="${r}" fill="${color}" fill-opacity="0.8" stroke="var(--border)" stroke-width="1"/>
        <text x="${fx}" y="${fy - r - 4}" text-anchor="middle" fill="var(--text)" font-size="10">${escapeHtml(f.name)}</text>
      </g>`;
    }).join("");

    wrap.innerHTML = `
      <div class="innenwelt-sector-header">
        <button class="chip" id="innenwelt-back-btn">${t("innenwelt.backToStage")}</button>
        <strong>${label}</strong> <span class="hint">(${figs.length})</span>
      </div>
      <svg viewBox="0 0 ${width} ${height}" width="100%" height="${height}">${cells}</svg>`;

    document.getElementById("innenwelt-back-btn").addEventListener("click", () => {
      this.sectorFocus = null;
      this.renderBody();
    });
    wrap.querySelectorAll(".innenwelt-figure").forEach((g) => {
      g.addEventListener("click", () => {
        const fig = figures.find((f) => f.name === g.dataset.name);
        if (fig) this.showDossier(fig);
      });
    });
  },

  dominantColor(emotions) {
    if (!emotions || !Object.keys(emotions).length) return "var(--bg-input)";
    const top = Object.entries(emotions).sort((a, b) => b[1] - a[1])[0][0];
    return EMOTIONS[top]?.color || "var(--bg-input)";
  },

  async showDossier(fig) {
    const el = document.getElementById("innenwelt-dossier");
    let dreams, tags, imaginations;
    try {
      [dreams, tags] = await Promise.all([
        api.listDreams({ tag: fig.name }),
        api.listTags(),
      ]);
    } catch (err) {
      showToast(err.message);
      return;
    }

    const tag = tags.find((t) => t.name === fig.name && t.kind === "person");
    const tagId = tag?.id;
    const current = fig.archetype;
    const currentA = current ? atlas.ARCHETYPES[current] : null;

    const topEmos = Object.entries(fig.emotions).sort((a, b) => b[1] - a[1]).slice(0, 3);

    // Load imaginations from dreams with this figure
    let imagTexts = [];
    for (const d of dreams.slice(0, 10)) {
      try {
        const imgs = await api.listImaginations(d.id);
        imgs.forEach((im) => imagTexts.push({ text: im.text, date: d.date, title: d.title }));
      } catch {}
    }

    el.innerHTML = `<div class="card">
      <button class="hint innenwelt-back-link" id="innenwelt-dossier-back">${t("innenwelt.backToStage")}</button>
      <h3>${currentA ? currentA.icon : "👤"} ${escapeHtml(fig.name)}</h3>
      <div class="stat-cards" style="margin-bottom:0.75rem">
        <div class="stat-card"><span class="stat-value">${fig.count}</span><span class="stat-label">${fig.count === 1 ? t("stats.dreamOne") : t("stats.dreamMany")}</span></div>
        ${topEmos.length ? `<div class="stat-card"><span class="stat-value">${topEmos.map(([e]) => EMOTIONS[e]?.icon || e).join(" ")}</span><span class="stat-label">${t("stats.topEmotionsPrefix")}</span></div>` : ""}
        <div class="stat-card"><span class="stat-value">${formatDate(fig.last_date)}</span><span class="stat-label">${t("innenwelt.lastLabel")}</span></div>
      </div>

      ${tagId ? `<div class="symbol-section">
        <h4>${t("atlas.archetypeLensTitle")}</h4>
        <div class="archetype-picker" id="innenwelt-arch-picker">
          <button class="arch-btn ${!current ? "selected" : ""}" data-arch="">${t("atlas.archetypeNoneOption")}</button>
          ${Object.entries(atlas.ARCHETYPES).map(([key, a]) =>
            `<button class="arch-btn ${current === key ? "selected" : ""}" data-arch="${key}" title="${a.hint}">
              ${a.icon} ${a.label}
            </button>`
          ).join("")}
        </div>
        <a href="#" class="archetype-lexicon-link">${t("atlas.archetypeLexiconLink")}</a>
      </div>` : ""}

      ${imagTexts.length ? `<div class="symbol-section">
        <h4>${t("innenwelt.conversationBand")}</h4>
        ${imagTexts.map((im) => `<blockquote class="imag-quote">
          <p>${escapeHtml(im.text)}</p>
          <cite>${escapeHtml(im.title)} — ${formatDate(im.date)}</cite>
        </blockquote>`).join("")}
      </div>` : ""}

      ${tagId ? `<button class="primary imag-continue-btn" data-name="${escapeHtml(fig.name)}">${t("innenwelt.continueConversation")}</button>` : ""}

      ${tagId ? `<div class="symbol-section">
        <h4>${t("innenwelt.associationsTitle")}</h4>
        <div id="innenwelt-notes"></div>
        <div class="symbol-input-row">
          <input type="text" id="innenwelt-note-input" placeholder="${t("innenwelt.associationPlaceholder", { name: escapeHtml(fig.name) })}">
          <button id="innenwelt-note-add" class="primary">+</button>
        </div>
      </div>` : ""}

      <div class="symbol-section">
        <h4>${t("innenwelt.dreamList")}</h4>
        ${dreams.map((d) => `<div class="series-entry">
          <div class="entry-head">
            <h3>${d.big_dream ? "⭐ " : ""}${escapeHtml(d.title)}</h3>
            <span class="entry-date">${formatDate(d.date)}</span>
          </div>
          <span class="badge ${d.lucidity >= 3 ? "lucid" : ""}">${t(`journal.lucidityBadge.${d.lucidity}`)}</span>
        </div>`).join("")}
      </div>
    </div>`;

    document.getElementById("innenwelt-dossier-back").addEventListener("click", () => {
      el.innerHTML = "";
      document.getElementById("innenwelt-stage-wrap").scrollIntoView({ behavior: "smooth" });
    });
    hilfe.attach(el.querySelector("h3"), "innenwelt-dossier");

    // Wire archetype picker
    if (tagId) {
      document.getElementById("innenwelt-arch-picker")?.addEventListener("click", async (e) => {
        const btn = e.target.closest(".arch-btn");
        if (!btn) return;
        const arch = btn.dataset.arch || null;
        try {
          await api.setArchetype(tagId, arch);
          document.querySelectorAll("#innenwelt-arch-picker .arch-btn").forEach((b) => b.classList.remove("selected"));
          btn.classList.add("selected");
          showToast(arch ? t("atlas.archetypeAssigned", { icon: atlas.ARCHETYPES[arch].icon, label: atlas.ARCHETYPES[arch].label }) : t("atlas.archetypeRemoved"));
          this.load();
        } catch (err) { showToast(err.message); }
      });
      el.querySelector(".archetype-lexicon-link")?.addEventListener("click", (e) => {
        e.preventDefault();
        openArchetypeLexikon();
      });

      // Symbol notes
      atlas.loadSymbolNotes(tagId);
      const notesEl = document.getElementById("innenwelt-notes");
      if (notesEl) {
        const loadNotes = async () => {
          try {
            const notes = await api.listSymbolNotes(tagId);
            if (!notes.length) { notesEl.innerHTML = `<p class="hint">${t("atlas.noAssociations")}</p>`; return; }
            notesEl.innerHTML = notes.map((n) => `
              <div class="symbol-note">
                <span>${escapeHtml(n.text)}</span>
                <span class="hint">${new Date(n.created_at).toLocaleDateString(localeForLang())}</span>
                <button class="ref-del hint" data-nid="${n.id}">&#x2715;</button>
              </div>`).join("");
            notesEl.querySelectorAll(".ref-del").forEach((btn) => {
              btn.addEventListener("click", async () => {
                try { await api.deleteSymbolNote(Number(btn.dataset.nid)); loadNotes(); } catch (err) { showToast(err.message); }
              });
            });
          } catch {}
        };
        loadNotes();
        document.getElementById("innenwelt-note-add")?.addEventListener("click", async () => {
          const input = document.getElementById("innenwelt-note-input");
          const text = input.value.trim();
          if (!text) return;
          try { await api.createSymbolNote(tagId, text); input.value = ""; loadNotes(); showToast(t("atlas.associationSaved")); } catch (err) { showToast(err.message); }
        });
      }

      // Continue imagination
      const continueBtn = el.querySelector(".imag-continue-btn");
      if (continueBtn) {
        continueBtn.addEventListener("click", () => {
          const latestDream = dreams[0];
          if (!latestDream) return;
          journal.openImagination(latestDream.id, t("innenwelt.turnToFigure", { name: fig.name }));
        });
      }
    }

    el.scrollIntoView({ behavior: "smooth" });
  },
};

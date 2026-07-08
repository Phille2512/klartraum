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

  async load() {
    const el = document.getElementById("innenwelt-view");
    let figures;
    try {
      figures = await api.getInnenwelt();
    } catch (err) {
      showToast(err.message);
      return;
    }

    if (!figures.length) {
      el.innerHTML = `<div class="card">
        <h2>🌗 Deine Innenwelt-Bühne</h2>
        <div class="empty-state">Deine Bühne ist noch leer. Gib den Menschen in deinen Träumen
          eine Linse — im Atlas oder hier.</div>
      </div>`;
      return;
    }

    const withArch = figures.filter((f) => f.archetype);
    const withoutArch = figures.filter((f) => !f.archetype);

    const width = 380, height = 380, cx = 190, cy = 190;
    const innerR = 100, outerR = 155;

    let svgContent = "";

    // Center: Selbst
    svgContent += `<circle cx="${cx}" cy="${cy}" r="28" fill="var(--accent)" fill-opacity="0.2" stroke="var(--accent)" stroke-width="1.5"/>`;
    svgContent += `<text x="${cx}" y="${cy + 5}" text-anchor="middle" fill="var(--accent)" font-size="16">&#x2B55; Selbst</text>`;

    // Sector labels
    for (const [arch, angle] of Object.entries(this.SECTOR_ANGLES)) {
      const a = atlas.ARCHETYPES[arch];
      if (!a) continue;
      const rad = (angle - 90) * Math.PI / 180;
      const lx = cx + Math.cos(rad) * (innerR + 45);
      const ly = cy + Math.sin(rad) * (innerR + 45);
      svgContent += `<text x="${lx}" y="${ly}" text-anchor="middle" fill="var(--text-dim)" font-size="10" opacity="0.6">${a.icon}</text>`;
    }

    // Inner ring: figures with archetype
    const archGroups = {};
    withArch.forEach((f) => {
      (archGroups[f.archetype] = archGroups[f.archetype] || []).push(f);
    });

    for (const [arch, figs] of Object.entries(archGroups)) {
      const baseAngle = this.SECTOR_ANGLES[arch] || 0;
      figs.forEach((f, i) => {
        const spread = figs.length > 1 ? 30 : 0;
        const angle = baseAngle - spread / 2 + (figs.length > 1 ? i * spread / (figs.length - 1) : 0);
        const rad = (angle - 90) * Math.PI / 180;
        const r = 8 + Math.min(f.count, 6) * 3;
        const fx = cx + Math.cos(rad) * innerR;
        const fy = cy + Math.sin(rad) * innerR;
        const color = this.dominantColor(f.emotions);
        svgContent += `<g class="innenwelt-figure" data-name="${escapeHtml(f.name)}" style="cursor:pointer">
          <circle cx="${fx}" cy="${fy}" r="${r}" fill="${color}" fill-opacity="0.8" stroke="var(--border)" stroke-width="1"/>
          <text x="${fx}" y="${fy - r - 4}" text-anchor="middle" fill="var(--text)" font-size="10">${escapeHtml(f.name)}</text>
        </g>`;
      });
    }

    // Outer ring: figures without archetype
    withoutArch.forEach((f, i) => {
      const angle = (i / withoutArch.length) * 360;
      const rad = (angle - 90) * Math.PI / 180;
      const r = 7 + Math.min(f.count, 6) * 2;
      const fx = cx + Math.cos(rad) * outerR;
      const fy = cy + Math.sin(rad) * outerR;
      svgContent += `<g class="innenwelt-figure" data-name="${escapeHtml(f.name)}" style="cursor:pointer">
        <circle cx="${fx}" cy="${fy}" r="${r}" fill="var(--bg-input)" fill-opacity="0.5" stroke="var(--border)" stroke-width="1" stroke-dasharray="3,3"/>
        <text x="${fx}" y="${fy - r - 4}" text-anchor="middle" fill="var(--text-dim)" font-size="10">${escapeHtml(f.name)}</text>
      </g>`;
    });

    el.innerHTML = `<div class="card">
      <h2>🌗 Deine Innenwelt-Bühne <small><em>nach C. G. Jung</em></small></h2>
      <p class="hint">Wer spielt in deinen Träumen — und in welcher Rolle? Innen: Figuren mit Archetyp-Linse. Außen: noch ohne Linse.</p>
      <svg viewBox="0 0 ${width} ${height}" width="100%" height="${height}" class="innenwelt-svg">
        ${svgContent}
      </svg>
    </div>
    <div id="innenwelt-dossier"></div>`;

    // Wissen-Moment
    const h2 = el.querySelector("h2");
    if (h2) wissen.attach(h2, "mandala");

    el.querySelectorAll(".innenwelt-figure").forEach((g) => {
      g.addEventListener("click", () => {
        const name = g.dataset.name;
        const fig = figures.find((f) => f.name === name);
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
      <h3>${currentA ? currentA.icon : "👤"} ${escapeHtml(fig.name)}</h3>
      <div class="stat-cards" style="margin-bottom:0.75rem">
        <div class="stat-card"><span class="stat-value">${fig.count}</span><span class="stat-label">${fig.count === 1 ? "Traum" : "Träume"}</span></div>
        ${topEmos.length ? `<div class="stat-card"><span class="stat-value">${topEmos.map(([e]) => EMOTIONS[e]?.icon || e).join(" ")}</span><span class="stat-label">häufigste Gefühle</span></div>` : ""}
        <div class="stat-card"><span class="stat-value">${formatDate(fig.last_date)}</span><span class="stat-label">zuletzt</span></div>
      </div>

      ${tagId ? `<div class="symbol-section">
        <h4>🌗 Archetyp-Linse</h4>
        <div class="archetype-picker" id="innenwelt-arch-picker">
          <button class="arch-btn ${!current ? "selected" : ""}" data-arch="">Keine</button>
          ${Object.entries(atlas.ARCHETYPES).map(([key, a]) =>
            `<button class="arch-btn ${current === key ? "selected" : ""}" data-arch="${key}" title="${a.hint}">
              ${a.icon} ${a.label}
            </button>`
          ).join("")}
        </div>
      </div>` : ""}

      ${imagTexts.length ? `<div class="symbol-section">
        <h4>🔮 Gesprächsband</h4>
        ${imagTexts.map((im) => `<blockquote class="imag-quote">
          <p>${escapeHtml(im.text)}</p>
          <cite>${escapeHtml(im.title)} — ${formatDate(im.date)}</cite>
        </blockquote>`).join("")}
      </div>` : ""}

      ${tagId ? `<button class="primary imag-continue-btn" data-name="${escapeHtml(fig.name)}">🔮 Gespräch fortsetzen</button>` : ""}

      ${tagId ? `<div class="symbol-section">
        <h4>📖 Assoziationen</h4>
        <div id="innenwelt-notes"></div>
        <div class="symbol-input-row">
          <input type="text" id="innenwelt-note-input" placeholder="Was verbindest du mit ${escapeHtml(fig.name)}?">
          <button id="innenwelt-note-add" class="primary">+</button>
        </div>
      </div>` : ""}

      <div class="symbol-section">
        <h4>Traumliste</h4>
        ${dreams.map((d) => `<div class="series-entry">
          <div class="entry-head">
            <h3>${d.big_dream ? "⭐ " : ""}${escapeHtml(d.title)}</h3>
            <span class="entry-date">${formatDate(d.date)}</span>
          </div>
          <span class="badge ${d.lucidity >= 3 ? "lucid" : ""}">${["keine Erinnerung", "Fragment", "Traum", "kurz luzide", "voll luzide ✨"][d.lucidity]}</span>
        </div>`).join("")}
      </div>
    </div>`;

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
          showToast(arch ? `${atlas.ARCHETYPES[arch].icon} ${atlas.ARCHETYPES[arch].label} zugeordnet` : "Archetyp entfernt");
          this.load();
        } catch (err) { showToast(err.message); }
      });

      // Symbol notes
      atlas.loadSymbolNotes(tagId);
      const notesEl = document.getElementById("innenwelt-notes");
      if (notesEl) {
        const loadNotes = async () => {
          try {
            const notes = await api.listSymbolNotes(tagId);
            if (!notes.length) { notesEl.innerHTML = '<p class="hint">Noch keine Assoziationen.</p>'; return; }
            notesEl.innerHTML = notes.map((n) => `
              <div class="symbol-note">
                <span>${escapeHtml(n.text)}</span>
                <span class="hint">${new Date(n.created_at).toLocaleDateString("de-DE")}</span>
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
          try { await api.createSymbolNote(tagId, text); input.value = ""; loadNotes(); showToast("Assoziation gespeichert"); } catch (err) { showToast(err.message); }
        });
      }

      // Continue imagination
      const continueBtn = el.querySelector(".imag-continue-btn");
      if (continueBtn) {
        continueBtn.addEventListener("click", () => {
          const latestDream = dreams[0];
          if (!latestDream) return;
          journal.openImagination(latestDream.id, `Wende dich ${fig.name} zu ...`);
        });
      }
    }

    el.scrollIntoView({ behavior: "smooth" });
  },
};

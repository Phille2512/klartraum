// Analyse: Kennzahlen + Diagramme (Chart.js) + Traumkompass nach LaBerge
const COMPASS = {
  awareness: {
    icon: "💭", label: "Inneres Erleben",
    hint: "Ungewöhnliche Gedanken oder Gefühle im Traum",
    mission: "Halte heute 5× inne und frag dich: „Fühlt sich dieser Moment wach an – oder wie ein Traum?“",
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
    mission: "Frag dich bei jedem Ortswechsel: „Wie genau bin ich hierhergekommen?“",
  },
};

const stats = {
  charts: {},

  async load() {
    let data;
    try {
      data = await api.stats();
    } catch (err) {
      showToast(err.message);
      return;
    }
    this.renderCards(data);
    this.renderCompass(data.compass);
    this.renderMission(data);
    this.renderSorter();
    this.renderBeifuss(data.beifuss);
    this.renderWeeks(data.per_week);
    this.renderSigns(data.top_dream_signs);
    this.renderLucidity(data.lucidity_distribution);
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
      ? `<p>🎯 <strong>Fokus-Zeichen der Woche:</strong> „${escapeHtml(data.focus_sign.name)}“
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
      <p>„<strong>${name}</strong>“ ist am ehesten …</p>
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
          showToast(`${COMPASS[btn.dataset.cat].icon} „${name}“ einsortiert`);
          this.load();
        } catch (err) {
          showToast(err.message);
        }
      });
    });
  },

  renderBeifuss(beifuss) {
    const el = document.getElementById("beifuss-compare");
    if (!beifuss.with.count) {
      el.innerHTML = `<p class="hint">Noch keine Einträge mit Beifuß. Hake beim Eintragen
        „🌿 Beifuß getrunken“ an – hier entsteht dann dein persönliches Experiment:
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

  renderCards(data) {
    document.getElementById("stat-cards").innerHTML = `
      <div class="stat-card"><div class="value">${data.total}</div><div class="label">Einträge</div></div>
      <div class="stat-card"><div class="value gold">${data.lucid}</div><div class="label">Klarträume</div></div>
      <div class="stat-card"><div class="value">${data.lucid_rate}%</div><div class="label">Klartraum-Quote</div></div>
      <div class="stat-card"><div class="value">${data.streak} 🔥</div><div class="label">Tage-Streak</div></div>`;
  },

  makeChart(id, config) {
    if (this.charts[id]) this.charts[id].destroy();
    this.charts[id] = new Chart(document.getElementById(id), config);
  },

  renderWeeks(perWeek) {
    this.makeChart("chart-weeks", {
      type: "bar",
      data: {
        labels: perWeek.map((w) => w.week),
        datasets: [
          { label: "Träume gesamt", data: perWeek.map((w) => w.total), backgroundColor: "#8b7ff5" },
          { label: "davon luzide", data: perWeek.map((w) => w.lucid), backgroundColor: "#f5c66a" },
        ],
      },
      options: this.baseOptions({ y: { ticks: { stepSize: 1 } } }),
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

  renderLucidity(distribution) {
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

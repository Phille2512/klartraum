// Analyse: Kennzahlen + Diagramme (Chart.js)
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
    this.renderWeeks(data.per_week);
    this.renderSigns(data.top_dream_signs);
    this.renderLucidity(data.lucidity_distribution);
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

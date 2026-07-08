// Navigation + Initialisierung
document.querySelectorAll(".tab-btn").forEach((btn) => {
  btn.addEventListener("click", () => {
    document.querySelectorAll(".tab-btn").forEach((b) => b.classList.remove("active"));
    document.querySelectorAll(".tab").forEach((t) => t.classList.remove("active"));
    btn.classList.add("active");
    document.getElementById(`tab-${btn.dataset.tab}`).classList.add("active");
    if (btn.dataset.tab === "stats") stats.load();
    if (btn.dataset.tab === "journal") journal.load();
    if (btn.dataset.tab === "atlas") {
      const view = localStorage.getItem("atlas-view") || "net";
      if (view === "map") worldmap.load();
      else if (view === "innenwelt") innenwelt.load();
      else atlas.load();
    }
    if (btn.dataset.tab === "learn") learn.loadJourney();
  });
});

// Rotlicht-Modus
const themeBtn = document.getElementById("theme-btn");
const savedTheme = localStorage.getItem("theme");
if (savedTheme === "night") {
  document.documentElement.setAttribute("data-theme", "night");
  themeBtn.textContent = "☀️";
  document.querySelector('meta[name="theme-color"]').content = "#140a0a";
}

themeBtn.addEventListener("click", () => {
  const isNight = document.documentElement.getAttribute("data-theme") === "night";
  if (isNight) {
    document.documentElement.removeAttribute("data-theme");
    themeBtn.textContent = "🔴";
    localStorage.removeItem("theme");
    document.querySelector('meta[name="theme-color"]').content = "#1a1b2e";
  } else {
    document.documentElement.setAttribute("data-theme", "night");
    themeBtn.textContent = "☀️";
    localStorage.setItem("theme", "night");
    document.querySelector('meta[name="theme-color"]').content = "#140a0a";
  }
});

auth.init();
journal.init();
learn.init();
offline.init();

// Abendritual
const ritualOverlay = document.getElementById("ritual-overlay");
const ritualBtn = document.getElementById("ritual-btn");
const ritualText = document.getElementById("ritual-text");
const ritualContent = document.getElementById("ritual-content");
const ritualDone = document.getElementById("ritual-done");
const ritualFocus = document.getElementById("ritual-focus");

ritualBtn.addEventListener("click", async () => {
  ritualOverlay.classList.remove("hidden");
  ritualContent.classList.remove("hidden");
  ritualDone.classList.add("hidden");
  ritualText.value = "";

  // Fokus-Zeichen laden
  try {
    const data = await api.stats();
    if (data.focus_sign) {
      ritualFocus.innerHTML = `<p class="hint">🎯 Dein Fokus-Zeichen: <strong>${escapeHtml(data.focus_sign.name)}</strong> (${data.focus_sign.count}× in 14 Tagen)</p>`;
    } else {
      ritualFocus.innerHTML = "";
    }
  } catch { ritualFocus.innerHTML = ""; }

  // Offene Bucket-List-Ziele laden
  try {
    const goals = await api.listGoals();
    const open = goals.filter((g) => !g.done).slice(0, 3);
    const goalsEl = document.getElementById("ritual-goals");
    if (open.length) {
      goalsEl.innerHTML = `<p class="hint">🏆 Nimm dir eins mit in den Traum:</p>
        <ul class="ritual-goals-list">${open.map((g) => `<li>${escapeHtml(g.text)}</li>`).join("")}</ul>`;
    } else {
      goalsEl.innerHTML = "";
    }
  } catch { document.getElementById("ritual-goals").innerHTML = ""; }

  // Bestehende Intention laden
  try {
    const current = await api.currentIntention();
    if (current && current.is_today) {
      ritualText.value = current.text;
    }
  } catch { /* ignorieren */ }
});

document.getElementById("ritual-save").addEventListener("click", async () => {
  const text = ritualText.value.trim();
  if (!text) return;
  try {
    await api.createIntention(text);
    ritualContent.classList.add("hidden");
    ritualDone.classList.remove("hidden");
  } catch (err) {
    showToast(err.message);
  }
});

document.getElementById("ritual-nightmode").addEventListener("click", (e) => {
  e.preventDefault();
  if (document.documentElement.getAttribute("data-theme") !== "night") {
    themeBtn.click();
  }
});

document.getElementById("ritual-close").addEventListener("click", () => {
  ritualOverlay.classList.add("hidden");
});

ritualOverlay.addEventListener("click", (e) => {
  if (e.target === ritualOverlay) ritualOverlay.classList.add("hidden");
});

// Atlas-View-Toggle
const atlasViews = ["atlas-net-view", "atlas-map-view", "innenwelt-view"];
function showAtlasView(view) {
  atlasViews.forEach((id) => document.getElementById(id)?.classList.add("hidden"));
  if (view === "map") {
    document.getElementById("atlas-map-view").classList.remove("hidden");
    worldmap.load();
  } else if (view === "innenwelt") {
    document.getElementById("innenwelt-view").classList.remove("hidden");
    innenwelt.load();
  } else {
    document.getElementById("atlas-net-view").classList.remove("hidden");
    atlas.load();
  }
}
const savedAtlasView = localStorage.getItem("atlas-view") || "net";
document.querySelectorAll(".atlas-toggle-btn").forEach((btn) => {
  if (btn.dataset.view === savedAtlasView) btn.classList.add("active");
  else btn.classList.remove("active");
  btn.addEventListener("click", () => {
    document.querySelectorAll(".atlas-toggle-btn").forEach((b) => b.classList.remove("active"));
    btn.classList.add("active");
    localStorage.setItem("atlas-view", btn.dataset.view);
    showAtlasView(btn.dataset.view);
  });
});

if (savedAtlasView !== "net") {
  atlasViews.forEach((id) => document.getElementById(id)?.classList.add("hidden"));
  if (savedAtlasView === "map") document.getElementById("atlas-map-view").classList.remove("hidden");
  else if (savedAtlasView === "innenwelt") document.getElementById("innenwelt-view").classList.remove("hidden");
}

document.getElementById("export-json").addEventListener("click", () => stats.downloadExport("json"));
document.getElementById("export-csv").addEventListener("click", () => stats.downloadExport("csv"));

// Mandala range change
document.querySelector(".mandala-range")?.addEventListener("change", () => {
  const mc = document.getElementById("mandala-card");
  if (mc) mandala.render(mc);
});

// Service Worker (funktioniert nur über HTTPS oder localhost)
if ("serviceWorker" in navigator) {
  navigator.serviceWorker.register("/sw.js").catch(() => {
    /* z. B. über http://<LAN-IP> nicht verfügbar – App läuft trotzdem */
  });
}

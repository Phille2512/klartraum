// Navigation + Initialisierung

// Traumtakt (Backlog "Der Faden führt"): die Tab-Markierung gleitet als
// feiner Faden vom alten zum neuen Tab, statt zu springen, und leuchtet
// unterwegs kurz golden auf. Respektiert prefers-reduced-motion (siehe CSS).
const navThread = document.getElementById("nav-thread");
const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

function moveTraumfaden(btn, { animate = true } = {}) {
  if (!navThread || !btn) return;
  const nav = btn.parentElement;
  const x = btn.offsetLeft - nav.offsetLeft;
  const w = btn.offsetWidth;

  if (!animate || prefersReducedMotion) {
    navThread.style.transition = "none";
    navThread.style.transform = `translateX(${x}px)`;
    navThread.style.width = `${w}px`;
    void navThread.offsetWidth; // Reflow erzwingen, bevor die Transition zurückkommt
    navThread.style.transition = "";
    return;
  }

  navThread.classList.remove("traveling");
  void navThread.offsetWidth; // Glow-Animation neu starten können
  navThread.style.transform = `translateX(${x}px)`;
  navThread.style.width = `${w}px`;
  navThread.classList.add("traveling");
}

// Traumtakt (Prinzip 3, "Tiefe statt Richtung"): Richtung Atlas taucht die
// Ansicht ein (dunkler, tiefer), zurück zum Tagebuch taucht sie auf. Nur
// main (view-transition-name: main-content, siehe CSS) bewegt sich, Header/
// Nav bleiben ruhig stehen.
const TAB_DEPTH = { journal: 0, stats: 1, learn: 1, atlas: 2 };
let currentTabName = document.querySelector(".tab-btn.active")?.dataset.tab || "journal";

document.querySelectorAll(".tab-btn").forEach((btn) => {
  btn.addEventListener("click", () => {
    const applyTabSwitch = () => {
      document.querySelectorAll(".tab-btn").forEach((b) => b.classList.remove("active"));
      document.querySelectorAll(".tab").forEach((t) => t.classList.remove("active"));
      btn.classList.add("active");
      document.getElementById(`tab-${btn.dataset.tab}`).classList.add("active");
      moveTraumfaden(btn);
      if (btn.dataset.tab === "stats") stats.load();
      if (btn.dataset.tab === "journal") journal.load();
      if (btn.dataset.tab === "atlas") {
        const view = localStorage.getItem("atlas-view") || "net";
        if (view === "map") worldmap.load();
        else if (view === "innenwelt") innenwelt.load();
        else atlas.load();
      }
    };

    const fromDepth = TAB_DEPTH[currentTabName] ?? 0;
    const toDepth = TAB_DEPTH[btn.dataset.tab] ?? 0;
    document.documentElement.dataset.transitionDirection =
      toDepth > fromDepth ? "dive" : toDepth < fromDepth ? "surface" : "flat";
    currentTabName = btn.dataset.tab;

    if (prefersReducedMotion || !document.startViewTransition) {
      applyTabSwitch();
    } else {
      document.startViewTransition(applyTabSwitch);
    }
  });
});

// Initiale Position ohne Animation setzen (nichts soll beim Laden "anreisen")
moveTraumfaden(document.querySelector(".tab-btn.active"), { animate: false });
// Bei Größenänderung (z. B. Rotation) Position ohne Animation nachziehen
window.addEventListener("resize", () => {
  moveTraumfaden(document.querySelector(".tab-btn.active"), { animate: false });
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
lesezimmer.init();

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
      ritualFocus.innerHTML = `<p class="hint">${t("app.ritualFocusSign", { name: escapeHtml(data.focus_sign.name), count: data.focus_sign.count })}</p>`;
    } else {
      ritualFocus.innerHTML = "";
    }
  } catch { ritualFocus.innerHTML = ""; }

  // Ort der Woche (B.6): kartierten Ort als Inkubations-Ziel vorschlagen
  renderPlaceSuggestion();

  // Offene Bucket-List-Ziele laden
  try {
    const goals = await api.listGoals();
    const open = goals.filter((g) => !g.done).slice(0, 3);
    const goalsEl = document.getElementById("ritual-goals");
    if (open.length) {
      goalsEl.innerHTML = `<p class="hint">${t("app.ritualGoalsHint")}</p>
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

let placeSuggestionOverride = null;

async function renderPlaceSuggestion() {
  const el = document.getElementById("ritual-place-suggestion");
  placeSuggestionOverride = null;
  el.innerHTML = "";
  if (localStorage.getItem("ritual-hide-place-suggestion") === "true") return;

  let map;
  try {
    map = await api.getMap();
  } catch { return; }
  const places = [...map.placed].sort((a, b) => a.name.localeCompare(b.name));
  if (places.length < 3) return;

  const iso = getISOWeek(new Date());
  const place = places[iso % places.length];
  renderPlaceSuggestionCard(place, places);
}

function renderPlaceSuggestionCard(place, places) {
  const el = document.getElementById("ritual-place-suggestion");
  el.innerHTML = `<div class="ritual-place-card">
    <p>${t("app.ritualPlaceVisit", { name: escapeHtml(place.name) })}</p>
    <div class="chip-row">
      <button class="chip primary" id="ritual-place-adopt">${t("app.ritualPlaceAdopt")}</button>
      <button class="chip" id="ritual-place-other">${t("app.ritualPlaceOther")}</button>
      <button class="hint" id="ritual-place-hide">${t("app.ritualPlaceHide")}</button>
    </div>
  </div>`;
  document.getElementById("ritual-place-adopt").addEventListener("click", () => {
    ritualText.value = t("app.ritualPlaceIntentionTemplate", { name: place.name });
  });
  document.getElementById("ritual-place-other").addEventListener("click", () => {
    const idx = places.findIndex((p) => p.tag_id === place.tag_id);
    const next = places[(idx + 1) % places.length];
    renderPlaceSuggestionCard(next, places);
  });
  document.getElementById("ritual-place-hide").addEventListener("click", () => {
    localStorage.setItem("ritual-hide-place-suggestion", "true");
    el.innerHTML = "";
  });
}

function getISOWeek(date) {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  return Math.ceil(((d - yearStart) / 86400000 + 1) / 7);
}

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

// Klickbare Hilfe (H.2) an feste Überschriften anhängen
hilfe.attach(document.querySelector("#atlas-net-view h2"), "atlas-netz");
hilfe.attach(document.querySelector("#atlas-map-view h2"), "atlas-karte");
hilfe.attach(document.getElementById("compass-heading"), "kompass");
hilfe.attach(document.querySelector("#mandala-card h2"), "mandala");
hilfe.attach(document.getElementById("atlas-timelapse-date").parentElement, "zeitraffer");

// Service Worker (funktioniert nur über HTTPS oder localhost)
if ("serviceWorker" in navigator) {
  navigator.serviceWorker.register("/sw.js").catch(() => {
    /* z. B. über http://<LAN-IP> nicht verfügbar – App läuft trotzdem */
  });
}

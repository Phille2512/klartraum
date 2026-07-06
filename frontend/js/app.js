// Navigation + Initialisierung
document.querySelectorAll(".tab-btn").forEach((btn) => {
  btn.addEventListener("click", () => {
    document.querySelectorAll(".tab-btn").forEach((b) => b.classList.remove("active"));
    document.querySelectorAll(".tab").forEach((t) => t.classList.remove("active"));
    btn.classList.add("active");
    document.getElementById(`tab-${btn.dataset.tab}`).classList.add("active");
    if (btn.dataset.tab === "stats") stats.load();
    if (btn.dataset.tab === "journal") journal.load();
  });
});

auth.init();
journal.init();
learn.init();
offline.init();

document.getElementById("export-json").addEventListener("click", () => stats.downloadExport("json"));
document.getElementById("export-csv").addEventListener("click", () => stats.downloadExport("csv"));

// Service Worker (funktioniert nur über HTTPS oder localhost)
if ("serviceWorker" in navigator) {
  navigator.serviceWorker.register("/sw.js").catch(() => {
    /* z. B. über http://<LAN-IP> nicht verfügbar – App läuft trotzdem */
  });
}

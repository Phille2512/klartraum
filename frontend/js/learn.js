const JUNG_GUIDES = [
  { id: "jung-psyche", title: t("jung.psyche.title"), body: t("jung.psyche.body") },
  { id: "jung-symbole", title: t("jung.symbole.title"), body: t("jung.symbole.body") },
  { id: "jung-kompensation", title: t("jung.kompensation.title"), body: t("jung.kompensation.body") },
  { id: "jung-persona", title: t("jung.persona.title"), body: t("jung.persona.body") },
  { id: "jung-schatten", title: t("jung.schatten.title"), body: t("jung.schatten.body") },
  { id: "jung-anima", title: t("jung.anima.title"), body: t("jung.anima.body") },
  { id: "jung-selbst", title: t("jung.selbst.title"), body: t("jung.selbst.body") },
  { id: "jung-grosse-traeume", title: t("jung.grosseTraeume.title"), body: t("jung.grosseTraeume.body") },
  { id: "jung-einordnung", title: t("jung.einordnung.title"), body: t("jung.einordnung.body") },
];

// Archetypen-Lexikon (H.3): nachlesen und aufs Eigene beziehen
const ARCHETYPE_LEXICON = [
  { key: "schatten", icon: "🌑", title: t("lexicon.schatten.title"),
    kern: t("lexicon.schatten.kern"),
    im_traum: t("lexicon.schatten.imTraum"),
    frage: t("lexicon.schatten.frage") },
  { key: "anima_animus", icon: "🌗", title: t("lexicon.animaAnimus.title"),
    kern: t("lexicon.animaAnimus.kern"),
    im_traum: t("lexicon.animaAnimus.imTraum"),
    frage: t("lexicon.animaAnimus.frage") },
  { key: "weiser", icon: "🧙", title: t("lexicon.weiser.title"),
    kern: t("lexicon.weiser.kern"),
    im_traum: t("lexicon.weiser.imTraum"),
    frage: t("lexicon.weiser.frage") },
  { key: "kind", icon: "🧒", title: t("lexicon.kind.title"),
    kern: t("lexicon.kind.kern"),
    im_traum: t("lexicon.kind.imTraum"),
    frage: t("lexicon.kind.frage") },
  { key: "trickster", icon: "🃏", title: t("lexicon.trickster.title"),
    kern: t("lexicon.trickster.kern"),
    im_traum: t("lexicon.trickster.imTraum"),
    frage: t("lexicon.trickster.frage") },
  { key: "held", icon: "⚔️", title: t("lexicon.held.title"),
    kern: t("lexicon.held.kern"),
    im_traum: t("lexicon.held.imTraum"),
    frage: t("lexicon.held.frage") },
  { key: "grosse_mutter", icon: "🌳", title: t("lexicon.grosseMutter.title"),
    kern: t("lexicon.grosseMutter.kern"),
    im_traum: t("lexicon.grosseMutter.imTraum"),
    frage: t("lexicon.grosseMutter.frage") },
  { key: "persona", icon: "🎭", title: t("lexicon.persona.title"),
    kern: t("lexicon.persona.kern"),
    im_traum: t("lexicon.persona.imTraum"),
    frage: t("lexicon.persona.frage") },
];

// Springt vom Archetyp-Picker (Atlas/Innenwelt) oder von Wissens-Momenten ins Lexikon (H.3)
function openArchetypeLexikon(anchorKey) {
  document.querySelector('[data-tab="learn"]').click();
  setTimeout(() => {
    const target = anchorKey ? document.getElementById(`arch-${anchorKey}`) : document.getElementById("archetypen-lexikon");
    if (target) {
      if (target.tagName === "DETAILS") target.open = true;
      target.scrollIntoView({ behavior: "smooth" });
    }
  }, 200);
}

// Prozess-Intro „Der Traumfaden" (H.4) — EINE Konstante für Knopf-Label,
// Overlay-Titel und Lernen-Karte, damit eine Umbenennung ein Ein-Zeilen-Fix bleibt.
const TRAUMFADEN = {
  title: t("traumfaden.title"),
  shortTitle: t("traumfaden.shortTitle"),
  buttonLabel: t("traumfaden.buttonLabel"),
  tooltip: t("traumfaden.tooltip"),
  body: t("traumfaden.body"),
  short: t("traumfaden.short"),
};

// Lernbereich: Guides + Reality-Check-Erinnerung
const learn = {
  timer: null,

  guides: [
    { title: t("learn.guide.realityChecks.title"), body: t("learn.guide.realityChecks.body") },
    { title: t("learn.guide.mild.title"), body: t("learn.guide.mild.body") },
    { title: t("learn.guide.wbtb.title"), body: t("learn.guide.wbtb.body") },
    { title: t("learn.guide.diary.title"), body: t("learn.guide.diary.body") },
    { title: t("learn.guide.stabilize.title"), body: t("learn.guide.stabilize.body") },
  ],

  init() {
    const pathRead = localStorage.getItem("hint-traumfaden") === "1";
    if (!pathRead) localStorage.setItem("hint-traumfaden", "1");
    const pathIntroHtml = `<details class="guide" id="traumfaden-lernkarte" ${pathRead ? "" : "open"}>
      <summary>${TRAUMFADEN.shortTitle}</summary>
      <div class="guide-body">${TRAUMFADEN.body}</div>
    </details>`;

    document.getElementById("guides").innerHTML = pathIntroHtml + this.guides
      .map(
        (g) => `<details class="guide">
          <summary>${g.title}</summary>
          <div class="guide-body">${g.body}</div>
        </details>`
      )
      .join("")
      + `<div class="card jung-kompendium">
          <h2>🌗 ${t("learn.jungCompendiumTitle")} <small><em>${t("stats.afterJung")}</em></small></h2>
          <p class="hint">${t("learn.jungCompendiumHint")}</p>
          ${JUNG_GUIDES.map((g) => `<details class="guide" id="${g.id}">
            <summary>${g.title}</summary>
            <div class="guide-body">${g.body}</div>
          </details>`).join("")}
        </div>
        <div class="card jung-kompendium" id="archetypen-lexikon">
          <h2>🌗 ${t("learn.archetypeLexiconTitle")} <small><em>${t("learn.archetypeLexiconSubtitle")}</em></small></h2>
          <p class="hint">${t("learn.archetypeLexiconHint")}</p>
          ${ARCHETYPE_LEXICON.map((a) => `<details class="guide" id="arch-${a.key}">
            <summary>${a.icon} ${a.title}</summary>
            <div class="guide-body">
              <p>${a.kern}</p>
              <p><strong>${t("learn.inTheDream")}</strong> ${a.im_traum}</p>
              <p><strong>${t("learn.questionForYou")}</strong> <em>${a.frage}</em></p>
              <p class="hint">${t("learn.archetypeLensDisclaimer")}</p>
            </div>
          </details>`).join("")}
        </div>`;

    this.loadDataInfo();
    this.showFirstRunHint();
    this.loadGoals();
    document.getElementById("goal-add-btn").addEventListener("click", () => this.addGoal());
    document.getElementById("goal-input").addEventListener("keydown", (e) => {
      if (e.key === "Enter") this.addGoal();
    });

    const flowToggle = document.getElementById("morning-flow-toggle");
    flowToggle.checked = localStorage.getItem("morning-flow") === "on";
    flowToggle.addEventListener("change", () => {
      localStorage.setItem("morning-flow", flowToggle.checked ? "on" : "off");
    });

    const select = document.getElementById("reminder-interval");
    select.value = localStorage.getItem("rc-interval") || "0";
    select.addEventListener("change", () => this.applyReminder(select.value, true));
    this.applyReminder(select.value, false);

    const bedtime = document.getElementById("wbtb-bedtime");
    bedtime.value = localStorage.getItem("wbtb-bedtime") || "";
    bedtime.addEventListener("change", () => this.renderWbtb());
    this.renderWbtb();
  },

  renderWbtb() {
    const value = document.getElementById("wbtb-bedtime").value;
    const el = document.getElementById("wbtb-result");
    localStorage.setItem("wbtb-bedtime", value);
    if (!value) {
      el.innerHTML = "";
      return;
    }
    const [h, m] = value.split(":").map(Number);
    const base = new Date(2000, 0, 1, h, m);
    const at = (minutes) =>
      new Date(base.getTime() + minutes * 60000).toTimeString().slice(0, 5);
    // Schlafzyklen dauern ~90 min; nach 4–5 Zyklen dominieren lange REM-Phasen
    el.innerHTML = `<div class="mission-card">
      <p>${t("learn.wbtbAlarm", { time: at(6 * 60) })}</p>
      <p>${t("learn.wbtbAlternatives", { t1: at(4.5 * 60), t2: at(7.5 * 60) })}</p>
      <p>${t("learn.wbtbTip")}</p>
    </div>`;
  },

  async applyReminder(minutes, userTriggered) {
    localStorage.setItem("rc-interval", minutes);
    clearInterval(this.timer);
    const status = document.getElementById("reminder-status");
    minutes = Number(minutes);

    if (!minutes) {
      status.textContent = t("learn.reminderOff");
      return;
    }

    // Browser-Notification nur mit Erlaubnis; sonst In-App-Toast als Fallback
    let useNotification = false;
    if ("Notification" in window) {
      if (Notification.permission === "default" && userTriggered) {
        await Notification.requestPermission();
      }
      useNotification = Notification.permission === "granted";
    }

    this.timer = setInterval(() => {
      const message = t("learn.realityCheckNotif");
      if (useNotification && document.hidden) {
        new Notification("Traumader", { body: message, icon: "/icons/icon-192.png" });
      } else {
        showToast(message);
      }
    }, minutes * 60 * 1000);

    status.textContent = useNotification
      ? t("learn.reminderActiveNotif", { minutes })
      : t("learn.reminderActiveToast", { minutes });
  },

  async loadGoals() {
    const list = document.getElementById("goal-list");
    try {
      const goals = await api.listGoals();
      this._goals = goals;
      if (!goals.length) {
        list.innerHTML = `<p class="hint">${t("learn.goalsEmpty")}</p>`;
        return;
      }
      list.innerHTML = goals.map((g) => `
        <div class="goal-item ${g.done ? "goal-done" : ""}">
          <label class="checkbox-label">
            <input type="checkbox" ${g.done ? "checked" : ""} onchange="learn.toggleGoal(${g.id}, this.checked)">
            <span class="goal-text">${escapeHtml(g.text)}</span>
            ${g.done && g.done_at ? `<small class="hint">${formatDate(g.done_at.slice(0, 10))}</small>` : ""}
          </label>
          <button class="danger goal-delete" onclick="learn.removeGoal(${g.id})">✕</button>
        </div>`).join("");
    } catch {
      list.innerHTML = `<p class="hint">${t("learn.goalsLoadError")}</p>`;
    }
  },

  async addGoal() {
    const input = document.getElementById("goal-input");
    const text = input.value.trim();
    if (!text) return;
    try {
      await api.createGoal(text);
      input.value = "";
      this.loadGoals();
    } catch (err) {
      showToast(err.message);
    }
  },

  async toggleGoal(id, done) {
    try {
      await api.toggleGoal(id, done);
      this.loadGoals();
      showToast(done ? t("learn.goalDone") : t("learn.goalReopened"));
    } catch (err) {
      showToast(err.message);
    }
  },

  async removeGoal(id) {
    if (!confirm(t("learn.goalDeleteConfirm"))) return;
    try {
      await api.deleteGoal(id);
      this.loadGoals();
    } catch (err) {
      showToast(err.message);
    }
  },

  async loadDataInfo() {
    const container = document.getElementById("guides");
    if (!container) return;
    try {
      const info = await api.dataInfo();
      const sizeMB = (info.db_size_bytes / 1024 / 1024).toFixed(1);
      const folderName = info.data_dir.replace(/^.*[/\\]/, "");

      // S.1: Status der automatischen Backups
      let backupLine;
      let backupWarning = "";
      if (!info.last_backup) {
        backupLine = t("learn.noBackupYet");
        backupWarning = t("learn.noBackupWarning");
      } else {
        const lastDate = new Date(info.last_backup + "T00:00:00");
        const daysAgo = Math.floor((Date.now() - lastDate.getTime()) / 86400000);
        const when = daysAgo <= 0 ? t("learn.backupToday") : daysAgo === 1 ? t("learn.backupYesterday") : t("learn.backupDaysAgo", { days: daysAgo });
        backupLine = t("learn.lastBackupLine", { when, count: info.backup_count });
        if (daysAgo > 3) {
          backupWarning = t("learn.backupOldWarning", { days: daysAgo });
        }
      }

      const card = document.createElement("div");
      card.className = "card";
      card.innerHTML = `
        <h2>${t("learn.dataTitle")}</h2>
        <p>${t("learn.dataDreamsText", { count: info.dream_count, size: sizeMB, folder: escapeHtml(folderName) })}</p>
        <p class="text-dim" style="font-size:0.9em">${escapeHtml(backupLine)}</p>
        ${backupWarning ? `<p style="color:var(--lucid,#f5c66a);font-size:0.9em">${escapeHtml(backupWarning)}</p>` : ""}
        <div class="data-info-text">
          <p>${t("learn.dataOwnText", { folder: escapeHtml(folderName) })}</p>
          <p>${t("learn.dataBackupText")}</p>
        </div>
        <div style="display:flex;gap:0.5rem;flex-wrap:wrap;margin-top:0.75rem">
          <button class="primary" id="data-export-btn">${t("learn.exportBtn")}</button>
          <button id="data-path-copy-btn">${t("learn.copyPathBtn")}</button>
        </div>`;
      container.appendChild(card);

      document.getElementById("data-export-btn").addEventListener("click", () => {
        window.open("/api/export?format=json", "_blank");
      });
      document.getElementById("data-path-copy-btn").addEventListener("click", () => {
        navigator.clipboard.writeText(info.data_dir).then(() => showToast(t("learn.pathCopied")));
      });
    } catch { /* Server unterstützt Endpunkt noch nicht */ }
  },

  showFirstRunHint() {
    if (localStorage.getItem("hint-daten")) return;
    const overlay = document.createElement("div");
    overlay.className = "modal-overlay";
    overlay.innerHTML = `
      <div class="modal">
        <h2>${t("learn.firstRunTitle")}</h2>
        <p>${t("learn.firstRunP1")}</p>
        <p>${t("learn.firstRunP2")}</p>
        <p>${t("learn.firstRunP3")}</p>
        <button class="primary" id="hint-daten-ok" style="margin-top:0.75rem">${t("learn.firstRunOk")}</button>
      </div>`;
    document.body.appendChild(overlay);
    document.getElementById("hint-daten-ok").addEventListener("click", () => {
      localStorage.setItem("hint-daten", "1");
      overlay.remove();
    });
  },
};

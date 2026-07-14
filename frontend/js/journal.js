// label ist ein Getter statt eines festen Strings: so bleiben alle bestehenden
// Zugriffe (e.label, s.label, ...) in journal.js/stats.js/lesezimmer.js
// unverändert lauffähig, liefern aber automatisch den übersetzten Text.
const EMOTIONS = {
  angst:     { icon: "😰", get label() { return t("emotion.angst"); },      color: "#8b5e5e" },
  freude:    { icon: "😊", get label() { return t("emotion.freude"); },      color: "#f5c66a" },
  staunen:   { icon: "🤩", get label() { return t("emotion.staunen"); },     color: "#a78bfa" },
  trauer:    { icon: "😢", get label() { return t("emotion.trauer"); },      color: "#6b8dad" },
  wut:       { icon: "😤", get label() { return t("emotion.wut"); },         color: "#e06c75" },
  liebe:     { icon: "💗", get label() { return t("emotion.liebe"); },       color: "#f0a0b0" },
  neugier:   { icon: "🔍", get label() { return t("emotion.neugier"); },     color: "#8fd49a" },
  verwirrung:{ icon: "😵‍💫", get label() { return t("emotion.verwirrung"); }, color: "#c9a060" },
  frieden:   { icon: "🕊️", get label() { return t("emotion.frieden"); },     color: "#a0c4e8" },
  ekel:      { icon: "🤢", get label() { return t("emotion.ekel"); },        color: "#7a9a6a" },
  sehnsucht: { icon: "🌅", get label() { return t("emotion.sehnsucht"); },   color: "#d4a070" },
  scham:     { icon: "😳", get label() { return t("emotion.scham"); },       color: "#c97a8a" },
};

// Phänomen-Tracking: Feld-Id ↔ Checkbox-Id ↔ Badge-Icon/Label
const PHENOMENA = [
  { field: "falsches_erwachen", inputId: "dream-falsches-erwachen", icon: "🔁", get label() { return t("phenomenon.falschesErwachen"); } },
  { field: "schlafparalyse", inputId: "dream-schlafparalyse", icon: "🧊", get label() { return t("phenomenon.schlafparalyse"); } },
  { field: "traum_im_traum", inputId: "dream-traum-im-traum", icon: "🪆", get label() { return t("phenomenon.traumImTraum"); } },
  { field: "wiederkehrend", inputId: "dream-wiederkehrend", icon: "♻️", get label() { return t("phenomenon.wiederkehrend"); } },
  { field: "albtraum", inputId: "dream-albtraum", icon: "😱", get label() { return t("phenomenon.albtraum"); } },
];

// Substanzen vor dem Schlafen: Preset-Key ↔ Checkbox-Id ↔ Badge-Icon/Label
const SUBSTANCES = [
  { key: "beifuss", inputId: "dream-substance-beifuss", icon: "🌿", get label() { return t("substance.beifuss"); } },
  { key: "melatonin", inputId: "dream-substance-melatonin", icon: "💊", get label() { return t("substance.melatonin"); } },
  { key: "alkohol", inputId: "dream-substance-alkohol", icon: "🍷", get label() { return t("substance.alkohol"); } },
  { key: "weed", inputId: "dream-substance-weed", icon: "🌱", get label() { return t("substance.weed"); } },
];

// N.1: Bucket-Mitten in Minuten — muss mit backend/routers/nights.py::BUCKET_MINUTES übereinstimmen.
const NIGHT_BUCKETS = { unter6: 330, "6bis7": 390, "7bis8": 450, ueber8: 510 };

// Tagebuch: Erfassen, Liste, Suche, Bearbeiten, Löschen
const journal = {
  dreams: [],
  pending: [],
  serverOffline: false,

  selectedEmotions: [],

  // Filter-Chips (Tagebuch-Suche): unabhängig von selectedEmotions (Formular)
  filters: { tag: "", emotion: "", bigDream: false },

  init() {
    this.form = document.getElementById("dream-form");
    this.list = document.getElementById("dream-list");
    this.search = document.getElementById("search-input");

    document.getElementById("new-dream-btn").addEventListener("click", () => this.startNewDream());
    document.getElementById("cancel-btn").addEventListener("click", () => this.closeForm());
    this.form.addEventListener("submit", (e) => this.save(e));

    this.initFilterBar();

    // Emotion Picker rendern
    const picker = document.getElementById("emotion-picker");
    picker.innerHTML = Object.entries(EMOTIONS).map(([key, e]) =>
      `<button type="button" class="emotion-chip" data-emotion="${key}" style="--emo-color:${e.color}">
        ${e.icon} ${e.label}
      </button>`
    ).join("");
    picker.querySelectorAll(".emotion-chip").forEach((chip) => {
      chip.addEventListener("click", () => {
        const emo = chip.dataset.emotion;
        if (this.selectedEmotions.includes(emo)) {
          this.selectedEmotions = this.selectedEmotions.filter((e) => e !== emo);
          chip.classList.remove("selected");
        } else {
          this.selectedEmotions.push(emo);
          chip.classList.add("selected");
        }
      });
    });

    // Wissens-Momente
    const bigDreamLabel = document.getElementById("dream-bigdream")?.closest("label");
    if (bigDreamLabel) wissen.attach(bigDreamLabel, "grosser-traum");

    // Traumtakt-Microinteraction: der Stern funkelt einmal kurz beim Setzen
    document.getElementById("dream-bigdream")?.addEventListener("change", (e) => {
      if (!e.target.checked) return;
      const star = document.getElementById("bigdream-star");
      if (!star) return;
      star.classList.remove("sparkle");
      void star.offsetWidth; // Animation neu starten können
      star.classList.add("sparkle");
    });

    // Traum-Echos: Debounced bei Texteingabe
    let echoDebounce;
    document.getElementById("dream-content").addEventListener("input", (e) => {
      clearTimeout(echoDebounce);
      echoDebounce = setTimeout(() => this.loadEchoes(e.target.value), 1500);
    });

    // N.2: Schlafzeit-Erfassung hängt am Traum-Datum, nicht am Traum selbst —
    // bei Datumswechsel im Formular neu laden.
    document.getElementById("dream-date").addEventListener("change", (e) => {
      this.loadNightSection(e.target.value);
    });

    let debounce;
    this.search.addEventListener("input", () => {
      clearTimeout(debounce);
      debounce = setTimeout(() => this.load(), 300);
    });

    this.refreshDatalists(); // u. a. fuer die Filterleiste (Tag-Liste)
    this.load();
  },

  // ---- Filter-Chips: Tags, Emotionen, ⭐ (zusätzlich zur Textsuche) ----
  initFilterBar() {
    const bar = document.getElementById("journal-filter-bar");
    const toggleBtn = document.getElementById("journal-filter-toggle");
    toggleBtn.addEventListener("click", () => {
      bar.classList.toggle("hidden");
      toggleBtn.classList.toggle("active", !bar.classList.contains("hidden"));
    });

    const emotionEl = document.getElementById("filter-emotion-chips");
    emotionEl.innerHTML = Object.entries(EMOTIONS).map(([key, e]) =>
      `<button type="button" class="chip filter-emotion-chip" data-emotion="${key}">${e.icon} ${e.label}</button>`
    ).join("");
    emotionEl.querySelectorAll(".filter-emotion-chip").forEach((chip) => {
      chip.addEventListener("click", () => {
        const wasActive = this.filters.emotion === chip.dataset.emotion;
        this.filters.emotion = wasActive ? "" : chip.dataset.emotion;
        emotionEl.querySelectorAll(".filter-emotion-chip").forEach((c) => c.classList.remove("active"));
        if (!wasActive) chip.classList.add("active");
        this.load();
      });
    });

    document.getElementById("filter-bigdream-chip").addEventListener("click", (e) => {
      this.filters.bigDream = !this.filters.bigDream;
      e.currentTarget.classList.toggle("active", this.filters.bigDream);
      this.load();
    });

    let tagDebounce;
    document.getElementById("filter-tag-input").addEventListener("input", (e) => {
      clearTimeout(tagDebounce);
      tagDebounce = setTimeout(() => {
        this.filters.tag = e.target.value.trim();
        this.load();
      }, 300);
    });

    document.getElementById("filter-reset-btn").addEventListener("click", () => {
      this.filters = { tag: "", emotion: "", bigDream: false };
      document.getElementById("filter-tag-input").value = "";
      document.getElementById("filter-bigdream-chip").classList.remove("active");
      emotionEl.querySelectorAll(".filter-emotion-chip").forEach((c) => c.classList.remove("active"));
      this.load();
    });
  },

  hasActiveFilters() {
    return !!(this.filters.tag || this.filters.emotion || this.filters.bigDream);
  },

  async load() {
    try {
      this.dreams = await api.listDreams({
        search: this.search.value.trim(),
        tag: this.filters.tag,
        emotion: this.filters.emotion,
        big_dream: this.filters.bigDream ? "true" : undefined,
      });
      this.serverOffline = false;
    } catch (err) {
      if (err.isNetworkError) {
        this.dreams = [];
        this.serverOffline = true;
      } else {
        showToast(err.message);
      }
    }
    this.pending = await offline.list().catch(() => []);
    this.render();
  },

  async refreshDatalists() {
    const tags = await api.listTags().catch(() => []);
    const fill = (id, kind) => {
      document.getElementById(id).innerHTML = tags
        .filter((t) => t.kind === kind)
        .map((t) => `<option value="${escapeHtml(t.name)}">`)
        .join("");
    };
    fill("tags-list", "tag");
    fill("signs-list", "dream_sign");
    fill("places-list", "place");
    fill("persons-list", "person");
    // Filter-Leiste: alle Arten in einer Liste (Tags/Zeichen/Orte/Personen)
    const filterList = document.getElementById("filter-tag-list");
    if (filterList) {
      filterList.innerHTML = tags.map((t) => `<option value="${escapeHtml(t.name)}">`).join("");
    }
  },

  async openForm(dream = null) {
    this.form.classList.remove("hidden");
    document.getElementById("form-title").textContent = dream ? t("journal.formTitleEdit") : t("journal.formTitleNew");
    document.getElementById("dream-id").value = dream ? dream.id : "";
    document.getElementById("dream-date").value = dream ? dream.date : todayISO();
    this.loadNightSection(document.getElementById("dream-date").value);
    document.getElementById("dream-title").value = dream ? dream.title : "";
    document.getElementById("dream-content").value = dream ? dream.content : "";
    document.getElementById("dream-lucidity").value = dream ? dream.lucidity : "2";
    document.getElementById("dream-sleep").value = dream?.sleep_quality ?? "";
    SUBSTANCES.forEach((s) => {
      document.getElementById(s.inputId).checked = dream ? dream.substances.includes(s.key) : false;
    });
    document.getElementById("dream-substance-other").value = dream?.substance_other ?? "";
    document.getElementById("dream-bigdream").checked = dream ? dream.big_dream : false;
    PHENOMENA.forEach((p) => {
      document.getElementById(p.inputId).checked = dream ? dream[p.field] : false;
    });
    document.getElementById("dream-tags").value = dream ? dream.tags.join(", ") : "";
    document.getElementById("dream-signs").value = dream ? dream.dream_signs.join(", ") : "";
    document.getElementById("dream-places").value = dream ? dream.places.join(", ") : "";
    document.getElementById("dream-persons").value = dream ? dream.persons.join(", ") : "";
    document.getElementById("dream-notes").value = dream?.notes_analysis ?? "";
    this.selectedEmotions = dream ? [...dream.emotions] : [];
    document.querySelectorAll(".emotion-chip").forEach((chip) => {
      chip.classList.toggle("selected", this.selectedEmotions.includes(chip.dataset.emotion));
    });
    document.getElementById("dream-echoes").classList.add("hidden");
    this.refreshDatalists();

    // Morgen-Rückfrage: offene Intention zeigen
    const prompt = document.getElementById("intention-prompt");
    prompt.classList.add("hidden");
    if (!dream) {
      try {
        const intention = await api.currentIntention();
        if (intention) {
          prompt.classList.remove("hidden");
          prompt.innerHTML = `
            <p>${t("journal.intentionPrompt", { text: `<strong>${escapeHtml(intention.text)}</strong>` })}</p>
            <div class="form-actions">
              <button type="button" class="primary" data-answer="yes">${t("common.yes")}</button>
              <button type="button" data-answer="no">${t("common.no")}</button>
              <button type="button" data-answer="later">${t("common.later")}</button>
            </div>`;
          prompt.querySelector('[data-answer="yes"]').addEventListener("click", async () => {
            await api.fulfillIntention(intention.id, true);
            prompt.classList.add("hidden");
            showToast(t("journal.toastIntentionYes"));
          });
          prompt.querySelector('[data-answer="no"]').addEventListener("click", async () => {
            await api.fulfillIntention(intention.id, false);
            prompt.classList.add("hidden");
            showToast(t("journal.toastIntentionNo"));
          });
          prompt.querySelector('[data-answer="later"]').addEventListener("click", () => {
            prompt.classList.add("hidden");
          });
        }
      } catch { /* offline oder Fehler — Rückfrage weglassen */ }
    }

    const scrollTarget = prompt.classList.contains("hidden") ? this.form : prompt;
    scrollTarget.scrollIntoView({ behavior: "smooth" });
    document.getElementById("dream-content").focus();
  },

  closeForm() {
    this.form.classList.add("hidden");
    this.form.reset();
  },

  // ---- N.2: Schlafzeit-Erfassung — eigene Entität, unabhängig vom Traum ----

  async loadNightSection(date) {
    const el = document.getElementById("night-section");
    if (!el || !date) return;
    this.nightDate = date;
    try {
      const night = await api.getNight(date);
      if (this.nightDate === date) this.renderNightSummary(el, night);
    } catch (err) {
      if (this.nightDate !== date) return; // Datum wurde inzwischen weitergeklickt
      if (err.status === 404) {
        this.renderNightPicker(el);
      } else {
        el.innerHTML = ""; // still ausblenden statt das restliche Formular zu blockieren
      }
    }
  },

  // Lokalisierte Dezimalstunden ("7,5" statt "7.5" im Deutschen; "8" statt "8,0").
  formatSleepHours(minutes) {
    return (minutes / 60).toLocaleString(localeForLang(), { maximumFractionDigits: 1 });
  },

  renderNightSummary(el, night) {
    let text;
    if (night.confidence === "exact") {
      const h = this.formatSleepHours(night.sleep_minutes);
      text = t("night.summaryTimes", { bed: night.bed_time, wake: night.wake_time, h });
    } else if (night.confidence === "rough") {
      const bucketKey = Object.entries(NIGHT_BUCKETS).find(([, m]) => m === night.sleep_minutes)?.[0];
      text = t("night.summaryRough", { bucket: bucketKey ? t(`night.b.${bucketKey}`) : "" });
    } else {
      text = t("night.summary.unknown");
    }
    el.innerHTML = `<p class="hint night-summary">😴 ${text} ·
      <button type="button" class="hint night-change-link" id="night-change-btn">${t("night.change")}</button></p>`;
    document.getElementById("night-change-btn").addEventListener("click", () => this.renderNightPicker(el, night));
  },

  renderNightPicker(el, existingNight = null) {
    el.innerHTML = `
      <label>${t("night.title")}</label>
      <div class="chip-row">
        <button type="button" class="chip" data-night-mode="times">${t("night.times")}</button>
        <button type="button" class="chip" data-night-mode="rough">${t("night.rough")}</button>
        <button type="button" class="chip" data-night-mode="unknown">${t("night.unknown")}</button>
      </div>
      <div id="night-mode-body"></div>`;
    el.querySelector('[data-night-mode="times"]').addEventListener("click", () => this.renderNightTimes(el, existingNight));
    el.querySelector('[data-night-mode="rough"]').addEventListener("click", () => this.renderNightRough(el));
    el.querySelector('[data-night-mode="unknown"]').addEventListener("click", () => this.saveNight(el, { unknown: true }));
  },

  async renderNightTimes(el, existingNight) {
    const body = el.querySelector("#night-mode-body");
    let bed = existingNight?.bed_time || "";
    let wake = existingNight?.wake_time || "";
    if (!bed && !wake) {
      try {
        const latest = await api.latestExactNight();
        if (latest) { bed = latest.bed_time; wake = latest.wake_time; }
      } catch { /* offline oder keine vorherige exakte Nacht — Felder bleiben leer */ }
    }
    body.innerHTML = `
      <div class="form-row">
        <label><span>${t("night.bed")}</span><input type="time" step="900" id="night-bed-input" value="${bed}"></label>
        <label><span>${t("night.wake")}</span><input type="time" step="900" id="night-wake-input" value="${wake}"></label>
      </div>
      <p class="hint" id="night-duration-hint"></p>
      <button type="button" class="primary" id="night-apply-btn" disabled>${t("night.apply")}</button>`;
    const bedInput = document.getElementById("night-bed-input");
    const wakeInput = document.getElementById("night-wake-input");
    const durationHint = document.getElementById("night-duration-hint");
    const applyBtn = document.getElementById("night-apply-btn");
    const updateDuration = () => {
      applyBtn.disabled = !bedInput.value || !wakeInput.value;
      if (bedInput.value && wakeInput.value) {
        const minutes = this.computeSleepMinutes(bedInput.value, wakeInput.value);
        durationHint.textContent = t("night.duration", { h: this.formatSleepHours(minutes) });
      } else {
        durationHint.textContent = "";
      }
    };
    bedInput.addEventListener("input", updateDuration);
    wakeInput.addEventListener("input", updateDuration);
    updateDuration();
    applyBtn.addEventListener("click", () => this.saveNight(el, { bed_time: bedInput.value, wake_time: wakeInput.value }));
  },

  computeSleepMinutes(bedTime, wakeTime) {
    const [bh, bm] = bedTime.split(":").map(Number);
    const [wh, wm] = wakeTime.split(":").map(Number);
    return (((wh * 60 + wm) - (bh * 60 + bm)) % 1440 + 1440) % 1440;
  },

  renderNightRough(el) {
    const body = el.querySelector("#night-mode-body");
    body.innerHTML = `<div class="chip-row">
      ${Object.keys(NIGHT_BUCKETS).map((b) => `<button type="button" class="chip" data-bucket="${b}">${t(`night.b.${b}`)}</button>`).join("")}
    </div>`;
    body.querySelectorAll("[data-bucket]").forEach((btn) => {
      btn.addEventListener("click", () => this.saveNight(el, { bucket: btn.dataset.bucket }));
    });
  },

  async saveNight(el, payload) {
    try {
      const night = await api.putNight(this.nightDate, payload);
      this.renderNightSummary(el, night);
    } catch (err) {
      showToast(err.isNetworkError ? t("night.offline") : err.message);
    }
  },

  async save(event) {
    event.preventDefault();
    const id = document.getElementById("dream-id").value;
    const sleep = document.getElementById("dream-sleep").value;
    const payload = {
      date: document.getElementById("dream-date").value,
      title: document.getElementById("dream-title").value.trim(),
      content: document.getElementById("dream-content").value.trim(),
      lucidity: Number(document.getElementById("dream-lucidity").value),
      sleep_quality: sleep ? Number(sleep) : null,
      substances: SUBSTANCES.filter((s) => document.getElementById(s.inputId).checked).map((s) => s.key),
      substance_other: document.getElementById("dream-substance-other").value.trim() || null,
      big_dream: document.getElementById("dream-bigdream").checked,
      ...Object.fromEntries(PHENOMENA.map((p) => [p.field, document.getElementById(p.inputId).checked])),
      emotions: this.selectedEmotions,
      notes_analysis: document.getElementById("dream-notes").value.trim() || null,
      tags: splitList(document.getElementById("dream-tags").value),
      dream_signs: splitList(document.getElementById("dream-signs").value),
      places: splitList(document.getElementById("dream-places").value),
      persons: splitList(document.getElementById("dream-persons").value),
    };
    try {
      let savedDream;
      if (id) {
        savedDream = await api.updateDream(id, payload);
        showToast(t("journal.toastUpdated"));
      } else {
        savedDream = await api.createDream(payload);
        showToast(t("journal.toastSaved"));
      }
      this.closeForm();
      await this.load();
      // Traumtakt-Microinteraction: der Eintrag "legt sich" sanft in die Liste
      document.getElementById(`dream-${savedDream.id}`)?.classList.add("settle-in");
      if (!id) this.showReflection(savedDream);
    } catch (err) {
      if (!id && err.isNetworkError) {
        // Server nicht erreichbar: Traum in die Offline-Warteschlange legen
        await offline.enqueue(payload);
        showToast(t("journal.toastSavedOffline"));
        this.closeForm();
        this.load();
      } else if (err.isNetworkError) {
        showToast(t("journal.toastEditNeedsServer"));
      } else {
        showToast(err.message);
      }
    }
  },

  async remove(id) {
    if (!confirm(t("journal.confirmDelete"))) return;
    try {
      await api.deleteDream(id);
      showToast(t("journal.toastDeleted"));
      this.load();
    } catch (err) {
      showToast(err.message);
    }
  },

  render() {
    const offlineHint = this.serverOffline
      ? `<div class="card offline-hint">${t("journal.offlineHint")}</div>`
      : "";

    const pendingHtml = this.pending
      .map(
        (p) => `<article class="card dream-entry pending-entry">
          <div class="entry-head">
            <h3>${escapeHtml(p.payload.title)}</h3>
            <span class="entry-date">${formatDate(p.payload.date)}</span>
          </div>
          ${p.payload.content ? `<p>${escapeHtml(p.payload.content)}</p>` : ""}
          <div><span class="badge pending">${t("journal.pendingBadge")}</span></div>
          <div class="entry-actions">
            <button class="danger" onclick="journal.removePending(${p.queueId})">${t("journal.discard")}</button>
          </div>
        </article>`
      )
      .join("");

    if (!this.dreams.length && !this.pending.length) {
      if (this.search.value || this.hasActiveFilters()) {
        this.list.innerHTML = offlineHint + `<div class="empty-state">${t("journal.emptyResults")}</div>`;
        this.updateTraumfadenButton();
        return;
      }
      // H.4: Erster App-Start (noch nie ein Traum) — Prozess-Intro statt leerer Zeile,
      // der Sternenknopf bleibt dabei versteckt (kein doppeltes Angebot).
      this.list.innerHTML = offlineHint + `<div class="card path-welcome">
        <h2>${TRAUMFADEN.title}</h2>
        ${TRAUMFADEN.short}
        <button class="primary" id="path-welcome-btn">${t("journal.firstDreamBtn")}</button>
      </div>`;
      document.getElementById("path-welcome-btn")?.addEventListener("click", () => this.startNewDream());
      document.getElementById("traumfaden-btn")?.classList.add("hidden");
      return;
    }
    const lucidityLabels = [0, 1, 2, 3, 4].map((i) => t(`journal.lucidityBadge.${i}`));
    this.list.innerHTML = offlineHint + this.renderStreakNachtrag() + pendingHtml + this.dreams
      .map(
        (d) => `<article class="card dream-entry" id="dream-${d.id}">
          <div class="entry-head">
            <h3>${d.big_dream ? "⭐ " : ""}${escapeHtml(d.title)}</h3>
            <span class="entry-date">${formatDate(d.date)}</span>
          </div>
          ${d.content ? `<p>${escapeHtml(d.content)}</p>` : ""}
          <div>
            <span class="badge ${d.lucidity >= 3 ? "lucid" : ""}">${lucidityLabels[d.lucidity]}</span>
            ${d.dream_signs.map((s) => `<span class="badge sign">🔮 ${escapeHtml(s)}</span>`).join("")}
            ${d.places.map((p) => `<span class="badge place">📍 ${escapeHtml(p)}</span>`).join("")}
            ${d.persons.map((p) => `<span class="badge person">👤 ${escapeHtml(p)}</span>`).join("")}
            ${d.tags.map((tag) => `<span class="badge">${escapeHtml(tag)}</span>`).join("")}
            ${(d.emotions || []).map((e) => EMOTIONS[e] ? `<span class="badge emotion-badge" style="--emo-color:${EMOTIONS[e].color}">${EMOTIONS[e].icon} ${EMOTIONS[e].label}</span>` : "").join("")}
            ${SUBSTANCES.filter((s) => d.substances.includes(s.key)).map((s) => `<span class="badge herb">${s.icon} ${s.label}</span>`).join("")}
            ${d.substance_other ? `<span class="badge herb">🧪 ${escapeHtml(d.substance_other)}</span>` : ""}
            ${PHENOMENA.filter((p) => d[p.field]).map((p) => `<span class="badge phenomenon">${p.icon} ${p.label}</span>`).join("")}
          </div>
          ${d.notes_analysis ? `<p class="hint">📝 ${escapeHtml(d.notes_analysis)}</p>` : ""}
          <div class="entry-expand">
            <div class="expand-refs" id="refs-${d.id}"></div>
            <div class="expand-imgs" id="imgs-${d.id}"></div>
            <div class="expand-sync" id="sync-${d.id}"></div>
            <div class="expand-analysis" id="analysis-${d.id}"></div>
          </div>
          <div class="entry-actions">
            <button onclick="journal.edit(${d.id})">${t("common.edit")}</button>
            <button onclick="journal.showReflection(journal.dreams.find(x=>x.id===${d.id}))">${t("journal.actionReflection")}</button>
            <button onclick="journal.openImagination(${d.id})">${t("journal.actionImagination")}</button>
            <button onclick="journal.openSyncForm(${d.id})">${t("journal.actionSync")}</button>
            <button onclick="journal.openAnalysis(${d.id})">${t("journal.actionAnalysis")}</button>
            <button class="danger" onclick="journal.remove(${d.id})">${t("common.delete")}</button>
          </div>
        </article>`
      )
      .join("");
    this.dreams.forEach((d) => {
      this.loadReflections(d.id);
      this.loadImaginations(d.id);
      this.loadSyncEvents(d.id);
      this.loadAnalysis(d.id);
    });
    this.updateTraumfadenButton();
    this.bindStreakNachtrag();
  },

  // ---- Streak-Nachtrag: sanfter Hinweis, wenn gestern kein Eintrag existiert ----
  renderStreakNachtrag() {
    if (this.search.value.trim() || this.hasActiveFilters()) return ""; // nur in der unbefilterten Ansicht sinnvoll
    const yesterday = yesterdayISO();
    if (localStorage.getItem("streak-nachtrag-dismissed") === todayISO()) return "";
    const hasYesterday = this.dreams.some((d) => d.date === yesterday);
    if (hasYesterday) return "";
    return `<div class="card streak-nachtrag">
      <p>${t("journal.streakMissing", { date: formatDate(yesterday) })}</p>
      <div class="chip-row">
        <button class="chip primary" id="streak-add-btn">${t("journal.streakAdd")}</button>
        <button class="chip" id="streak-no-memory-btn">${t("journal.streakNoMemory")}</button>
        <button class="hint" id="streak-dismiss-btn">${t("journal.streakDismiss")}</button>
      </div>
    </div>`;
  },

  bindStreakNachtrag() {
    document.getElementById("streak-add-btn")?.addEventListener("click", () => {
      this.startNewDream();
      document.getElementById("dream-date").value = yesterdayISO();
    });
    document.getElementById("streak-no-memory-btn")?.addEventListener("click", async () => {
      try {
        await api.createDream({
          date: yesterdayISO(),
          title: t("journal.noMemoryTitle"),
          content: "",
          lucidity: 0,
          sleep_quality: null,
          substances: [],
          substance_other: null,
          big_dream: false,
          emotions: [],
          notes_analysis: null,
          tags: [], dream_signs: [], places: [], persons: [],
        });
        showToast(t("journal.toastStreakAdded"));
        this.load();
      } catch (err) {
        showToast(err.message);
      }
    });
    document.getElementById("streak-dismiss-btn")?.addEventListener("click", () => {
      localStorage.setItem("streak-nachtrag-dismissed", todayISO());
      this.render();
    });
  },

  // ---- H.4: Der Traumfaden — Sternenknopf mit Lebenszyklus ----
  bindTraumfaden() {
    if (this._traumfadenBound) return;
    this._traumfadenBound = true;
    const btn = document.getElementById("traumfaden-btn");
    const overlay = document.getElementById("traumfaden-overlay");
    if (!btn || !overlay) return;
    btn.title = TRAUMFADEN.tooltip;
    btn.querySelector(".traumfaden-label").textContent = TRAUMFADEN.buttonLabel;
    btn.addEventListener("click", () => this.openTraumfaden());
    document.getElementById("traumfaden-close").addEventListener("click", () => overlay.classList.add("hidden"));
    overlay.addEventListener("click", (e) => { if (e.target === overlay) overlay.classList.add("hidden"); });
  },

  openTraumfaden() {
    document.getElementById("traumfaden-overlay-body").innerHTML = `<h2>${TRAUMFADEN.title}</h2>${TRAUMFADEN.body}`;
    document.getElementById("traumfaden-overlay").classList.remove("hidden");
  },

  async updateTraumfadenButton() {
    this.bindTraumfaden();
    const btn = document.getElementById("traumfaden-btn");
    if (!btn) return;
    // Nie automatisch öffnen — nur Sichtbarkeit/Erscheinungsbild anpassen.
    if (!this.dreams.length && !this.pending.length && !this.search.value && !this.hasActiveFilters()) {
      btn.classList.add("hidden");
      return;
    }
    btn.classList.remove("hidden");
    let count = 0;
    try { count = (await api.dataInfo()).dream_count; } catch { /* Knopf bleibt in aktuellem Zustand */ }
    btn.classList.toggle("traumfaden-pulse", count < 10);
    btn.classList.toggle("traumfaden-subtle", count >= 10);
  },

  startNewDream() {
    if (localStorage.getItem("morning-flow") !== "on") {
      this.openForm();
      return;
    }
    const overlay = document.getElementById("morning-flow");
    const seconds = document.getElementById("flow-seconds");
    const progress = document.getElementById("flow-progress");
    const skipBtn = document.getElementById("flow-skip");
    const circumference = 2 * Math.PI * 54;
    let remaining = 60;

    overlay.classList.remove("hidden");
    seconds.textContent = remaining;
    progress.style.strokeDashoffset = "0";

    const finish = () => {
      clearInterval(tick);
      overlay.classList.add("hidden");
      skipBtn.replaceWith(skipBtn.cloneNode(true));
      this.openForm();
    };

    const tick = setInterval(() => {
      remaining--;
      seconds.textContent = remaining;
      progress.style.strokeDashoffset = ((60 - remaining) / 60 * circumference).toString();
      if (remaining <= 0) finish();
    }, 1000);

    skipBtn.addEventListener("click", finish, { once: true });
  },

  edit(id) {
    const dream = this.dreams.find((d) => d.id === id);
    if (dream) this.openForm(dream);
  },

  async loadEchoes(text) {
    const el = document.getElementById("dream-echoes");
    if (!text || text.trim().length < 20) {
      el.classList.add("hidden");
      return;
    }
    try {
      const id = document.getElementById("dream-id").value;
      const echoes = await api.dreamEchoes(text.trim(), id || undefined);
      if (!echoes.length) {
        el.classList.add("hidden");
        return;
      }
      el.classList.remove("hidden");
      el.innerHTML = `<p class="hint">${t("journal.echoesHeading")}</p>
        ${echoes.map((e) => `<div class="echo-entry">
          <span>${escapeHtml(e.title)}</span>
          <span class="hint">${formatDate(e.date)}${e.lucidity >= 3 ? " ✨" : ""}</span>
        </div>`).join("")}`;
    } catch { el.classList.add("hidden"); }
  },

  reflectionQuestions: [
    t("journal.reflectQ1"),
    t("journal.reflectQ2"),
    t("journal.reflectQ3"),
    t("journal.reflectQ4"),
    t("journal.reflectQ5"),
    t("journal.reflectQ6"),
    t("journal.reflectQ7"),
    t("journal.reflectQ8"),
    t("journal.reflectQ9"),
    t("journal.reflectQ10"),
    t("journal.reflectQ11"),
    t("journal.reflectQ12"),
  ],

  showReflection(dream) {
    const overlay = document.getElementById("reflection-overlay");
    const question = this.reflectionQuestions[Math.floor(Math.random() * this.reflectionQuestions.length)];
    document.getElementById("reflection-question").textContent = question;
    document.getElementById("reflection-answer").value = "";
    overlay.classList.remove("hidden");

    const close = () => overlay.classList.add("hidden");

    document.getElementById("reflection-skip").onclick = close;
    overlay.onclick = (e) => { if (e.target === overlay) close(); };

    const qEl = document.getElementById("reflection-question");
    if (question.includes("Gegengewicht") || question.includes("Schatten")) {
      wissen.attach(qEl.parentElement, "kompensation");
    }

    document.getElementById("reflection-save").onclick = async () => {
      const answer = document.getElementById("reflection-answer").value.trim();
      if (!answer) { close(); return; }
      try {
        await api.createReflection(dream.id, question, answer);
        showToast(t("journal.toastReflectionSaved"));
        this.load();
      } catch (err) { showToast(err.message); }
      close();
    };
  },

  async loadReflections(dreamId) {
    const el = document.getElementById(`refs-${dreamId}`);
    if (el.dataset.loaded) return;
    el.dataset.loaded = "1";
    try {
      const refs = await api.listReflections(dreamId);
      if (!refs.length) return;
      el.innerHTML = `<details class="expand-detail"><summary>🪞 ${refs.length} ${refs.length > 1 ? t("journal.reflectionMany") : t("journal.reflectionOne")}</summary>
        ${refs.map((r) => `<div class="ref-entry">
          <p class="ref-q">${escapeHtml(r.question)}</p>
          <p>${escapeHtml(r.answer)}</p>
          <button class="ref-del hint" onclick="journal.deleteReflection(${r.id},${dreamId})">✕</button>
        </div>`).join("")}
      </details>`;
    } catch {}
  },

  async deleteReflection(refId, dreamId) {
    await api.deleteReflection(refId).catch(() => {});
    const el = document.getElementById(`refs-${dreamId}`);
    if (el) { el.dataset.loaded = ""; el.innerHTML = ""; }
    this.loadReflections(dreamId);
  },

  async loadImaginations(dreamId) {
    const el = document.getElementById(`imgs-${dreamId}`);
    if (el.dataset.loaded) return;
    el.dataset.loaded = "1";
    try {
      const imgs = await api.listImaginations(dreamId);
      if (!imgs.length) return;
      el.innerHTML = `<details class="expand-detail"><summary>🔮 ${imgs.length} ${imgs.length > 1 ? t("journal.imaginationMany") : t("journal.imaginationOne")}</summary>
        ${imgs.map((i) => `<div class="ref-entry">
          <p>${escapeHtml(i.text)}</p>
          <span class="hint">${new Date(i.created_at).toLocaleDateString(localeForLang())}</span>
          <button class="ref-del hint" onclick="journal.deleteImagination(${i.id},${dreamId})">✕</button>
        </div>`).join("")}
      </details>`;
    } catch {}
  },

  async deleteImagination(imgId, dreamId) {
    await api.deleteImagination(imgId).catch(() => {});
    const el = document.getElementById(`imgs-${dreamId}`);
    if (el) { el.dataset.loaded = ""; el.innerHTML = ""; }
    this.loadImaginations(dreamId);
  },

  openImagination(dreamId) {
    const overlay = document.getElementById("imagination-overlay");
    overlay.classList.remove("hidden");

    const steps = overlay.querySelectorAll(".imag-step");
    let current = 0;
    const show = (i) => steps.forEach((s, idx) => s.classList.toggle("hidden", idx !== i));
    show(0);

    // Step 1: Ankommen (30s ring)
    const ring = document.getElementById("imag-progress");
    const secs = document.getElementById("imag-seconds");
    const circumference = 2 * Math.PI * 54;
    let remaining = 30;
    secs.textContent = remaining;
    ring.style.strokeDashoffset = "0";

    const nextStep = () => { current++; show(current); };
    const close = () => { clearInterval(tick); overlay.classList.add("hidden"); };

    const tick = setInterval(() => {
      remaining--;
      secs.textContent = remaining;
      ring.style.strokeDashoffset = ((30 - remaining) / 30 * circumference).toString();
      if (remaining <= 0) { clearInterval(tick); nextStep(); }
    }, 1000);

    document.getElementById("imag-skip-1").onclick = () => { clearInterval(tick); nextStep(); };
    document.getElementById("imag-next-2").onclick = nextStep;
    overlay.querySelector(".imag-close").onclick = close;
    overlay.onclick = (e) => { if (e.target === overlay) close(); };

    document.getElementById("imag-save").onclick = async () => {
      const text = document.getElementById("imag-text").value.trim();
      if (!text) { close(); return; }
      try {
        await api.createImagination(dreamId, text);
        showToast(t("journal.toastImaginationSaved"));
        const el = document.getElementById(`imgs-${dreamId}`);
        if (el) { el.dataset.loaded = ""; el.innerHTML = ""; }
        this.loadImaginations(dreamId);
      } catch (err) { showToast(err.message); }
      close();
    };
  },

  openSyncForm(dreamId) {
    const el = document.getElementById(`sync-${dreamId}`);
    if (!el) return;
    const today = todayISO();
    el.innerHTML = `<div class="sync-form card" style="margin-top:0.5rem">
      <h4>${t("journal.syncFormTitle")}</h4>
      <p class="hint">${t("journal.syncFormHint")}</p>
      <label>${t("journal.dateLabel")} <input type="date" class="sync-date" value="${today}"></label>
      <label>${t("journal.syncTextLabel")} <textarea class="sync-text" rows="2" placeholder="${t("journal.syncTextPlaceholder")}"></textarea></label>
      <div class="form-actions">
        <button class="primary sync-save-btn">${t("common.save")}</button>
        <button class="sync-cancel-btn">${t("common.cancel")}</button>
      </div>
    </div>`;

    const wh = el.querySelector("h4");
    if (wh) wissen.attach(wh, "synchronizitaet");

    el.querySelector(".sync-save-btn").addEventListener("click", async () => {
      const date = el.querySelector(".sync-date").value;
      const text = el.querySelector(".sync-text").value.trim();
      if (!text) return;
      try {
        await api.createSyncEvent(dreamId, date, text);
        showToast(t("journal.toastSyncSaved"));
        el.innerHTML = "";
        el.dataset.loaded = "";
        this.loadSyncEvents(dreamId);
      } catch (err) { showToast(err.message); }
    });
    el.querySelector(".sync-cancel-btn").addEventListener("click", () => { el.innerHTML = ""; });
  },

  async loadSyncEvents(dreamId) {
    const el = document.getElementById(`sync-${dreamId}`);
    if (!el || el.dataset.loaded || el.querySelector(".sync-form")) return;
    el.dataset.loaded = "1";
    try {
      const events = await api.listSyncEvents();
      const dreamEvents = events.filter((e) => e.dream_id === dreamId);
      if (!dreamEvents.length) return;
      el.innerHTML = `<details class="expand-detail"><summary>🔗 ${dreamEvents.length} ${dreamEvents.length > 1 ? t("journal.syncMany") : t("journal.syncOne")}</summary>
        ${dreamEvents.map((e) => {
          const dreamDate = this.dreams.find((d) => d.id === dreamId)?.date;
          const daysDiff = dreamDate ? Math.round((new Date(e.date) - new Date(dreamDate)) / 86400000) : null;
          const timeHint = daysDiff !== null && daysDiff > 0 ? `${daysDiff} ${daysDiff > 1 ? t("journal.daysLater") : t("journal.dayLater")}` : formatDate(e.date);
          return `<div class="ref-entry">
            <p>🔗 ${timeHint}: ${escapeHtml(e.text)}</p>
            <button class="ref-del hint" onclick="journal.deleteSyncEvent(${e.id},${dreamId})">&#x2715;</button>
          </div>`;
        }).join("")}
      </details>`;
    } catch {}
  },

  async deleteSyncEvent(eventId, dreamId) {
    await api.deleteSyncEvent(eventId).catch(() => {});
    const el = document.getElementById(`sync-${dreamId}`);
    if (el) { el.dataset.loaded = ""; el.innerHTML = ""; }
    this.loadSyncEvents(dreamId);
  },

  async removePending(queueId) {
    if (!confirm(t("journal.confirmDiscardPending"))) return;
    await offline.remove(queueId);
    showToast(t("journal.toastPendingDiscarded"));
    this.load();
  },

  ANALYSIS_STATIONS: [
    { key: "persona", icon: "🎭", title: t("journal.station.persona.title"),
      q: t("journal.station.persona.q") },
    { key: "schatten", icon: "🌑", title: t("journal.station.schatten.title"),
      q: t("journal.station.schatten.q") },
    { key: "gegenstimme", icon: "🌗", title: t("journal.station.gegenstimme.title"),
      q: t("journal.station.gegenstimme.q") },
    { key: "kompensation", icon: "⚖️", title: t("journal.station.kompensation.title"),
      q: t("journal.station.kompensation.q") },
    { key: "symbole", icon: "🔣", title: t("journal.station.symbole.title"),
      q: t("journal.station.symbole.q") },
    { key: "ganzheit", icon: "🔵", title: t("journal.station.ganzheit.title"),
      q: t("journal.station.ganzheit.q") },
  ],

  openAnalysis(dreamId) {
    const dream = this.dreams.find((d) => d.id === dreamId);
    if (!dream) return;
    const overlay = document.createElement("div");
    overlay.className = "overlay analysis-overlay";
    overlay.innerHTML = `<div class="overlay-content analysis-content">
      <h3>${t("journal.analysisTitle", { title: escapeHtml(dream.title) })}</h3>
      <p class="hint">${t("journal.analysisHint")}</p>
      <div class="analysis-stations"></div>
      <div class="analysis-step"></div>
      <div class="form-actions" style="margin-top:1rem">
        <button class="analysis-close">${t("common.close")}</button>
      </div>
    </div>`;
    document.body.appendChild(overlay);

    const stationsEl = overlay.querySelector(".analysis-stations");
    const stepEl = overlay.querySelector(".analysis-step");
    let currentIdx = 0;

    const renderDots = () => {
      stationsEl.innerHTML = this.ANALYSIS_STATIONS.map((s, i) =>
        `<span class="analysis-dot${i === currentIdx ? ' active' : ''}${i < currentIdx ? ' done' : ''}" title="${s.title}">${s.icon}</span>`
      ).join("");
    };

    const renderStep = async () => {
      renderDots();
      if (currentIdx >= this.ANALYSIS_STATIONS.length) {
        stepEl.innerHTML = `<p style="text-align:center;padding:1rem">${t("journal.analysisAllDone")}</p>`;
        setTimeout(() => { overlay.remove(); this.load(); }, 1200);
        return;
      }
      const station = this.ANALYSIS_STATIONS[currentIdx];
      let existing = "";
      try {
        const entries = await api.listDreamAnalysis(dreamId);
        const found = entries.find((e) => e.station === station.key);
        if (found) existing = found.answer;
      } catch {}
      stepEl.innerHTML = `<div class="analysis-step-inner">
        <h4>${station.icon} ${station.title}</h4>
        <p class="analysis-question">${station.q}</p>
        <textarea class="analysis-answer" rows="4" placeholder="${t("journal.thoughtsPlaceholder")}">${escapeHtml(existing)}</textarea>
        <div class="form-actions">
          ${currentIdx > 0 ? `<button class="analysis-prev">${t("journal.back")}</button>` : ''}
          <button class="primary analysis-save">${t("journal.saveAndNext")}</button>
          <button class="analysis-skip hint">${t("journal.skip")}</button>
        </div>
      </div>`;

      stepEl.querySelector(".analysis-save").addEventListener("click", async () => {
        const answer = stepEl.querySelector(".analysis-answer").value.trim();
        if (!answer) { currentIdx++; renderStep(); return; }
        try {
          await api.createDreamAnalysis(dreamId, station.key, answer);
          showToast(t("journal.toastStationSaved", { station: station.title }));
        } catch (err) { showToast(err.message); return; }
        currentIdx++;
        renderStep();
      });

      stepEl.querySelector(".analysis-skip")?.addEventListener("click", () => {
        currentIdx++;
        renderStep();
      });

      stepEl.querySelector(".analysis-prev")?.addEventListener("click", () => {
        currentIdx--;
        renderStep();
      });
    };

    overlay.querySelector(".analysis-close").addEventListener("click", () => {
      overlay.remove();
      const el = document.getElementById("analysis-" + dreamId);
      if (el) { el.dataset.loaded = ""; el.innerHTML = ""; }
      this.loadAnalysis(dreamId);
    });
    overlay.addEventListener("click", (e) => {
      if (e.target === overlay) {
        overlay.remove();
        const el = document.getElementById("analysis-" + dreamId);
        if (el) { el.dataset.loaded = ""; el.innerHTML = ""; }
        this.loadAnalysis(dreamId);
      }
    });

    renderStep();
  },

  async loadAnalysis(dreamId) {
    const el = document.getElementById("analysis-" + dreamId);
    if (!el || el.dataset.loaded) return;
    el.dataset.loaded = "1";
    try {
      const entries = await api.listDreamAnalysis(dreamId);
      if (!entries.length) return;
      const stationMap = {};
      this.ANALYSIS_STATIONS.forEach((s) => stationMap[s.key] = s);
      el.innerHTML = `<details class="expand-detail"><summary>${t("journal.jungAnalysisSummary", { done: entries.length })}</summary>
        ${entries.map((e) => {
          const s = stationMap[e.station] || { icon: "?", title: e.station };
          return `<div class="ref-entry analysis-entry">
            <p class="ref-q">${s.icon} ${s.title}</p>
            <p>${escapeHtml(e.answer)}</p>
            <button class="ref-del hint" onclick="journal.deleteAnalysis(${e.id},${dreamId})">&#x2715;</button>
          </div>`;
        }).join("")}
      </details>`;
    } catch {}
  },

  async deleteAnalysis(entryId, dreamId) {
    await api.deleteDreamAnalysis(entryId).catch(() => {});
    const el = document.getElementById("analysis-" + dreamId);
    if (el) { el.dataset.loaded = ""; el.innerHTML = ""; }
    this.loadAnalysis(dreamId);
  },
};

function splitList(value) {
  return value.split(",").map((s) => s.trim()).filter(Boolean);
}

function todayISO() {
  const now = new Date();
  now.setMinutes(now.getMinutes() - now.getTimezoneOffset());
  return now.toISOString().slice(0, 10);
}

function yesterdayISO() {
  const now = new Date();
  now.setMinutes(now.getMinutes() - now.getTimezoneOffset());
  now.setDate(now.getDate() - 1);
  return now.toISOString().slice(0, 10);
}

function formatDate(iso) {
  return new Date(iso + "T00:00:00").toLocaleDateString(localeForLang(), {
    weekday: "short", day: "2-digit", month: "2-digit", year: "numeric",
  });
}

function escapeHtml(str) {
  const div = document.createElement("div");
  div.textContent = str;
  return div.innerHTML;
}

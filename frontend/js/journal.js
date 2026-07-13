const EMOTIONS = {
  angst:     { icon: "😰", label: "Angst",      color: "#8b5e5e" },
  freude:    { icon: "😊", label: "Freude",      color: "#f5c66a" },
  staunen:   { icon: "🤩", label: "Staunen",     color: "#a78bfa" },
  trauer:    { icon: "😢", label: "Trauer",      color: "#6b8dad" },
  wut:       { icon: "😤", label: "Wut",         color: "#e06c75" },
  liebe:     { icon: "💗", label: "Liebe",       color: "#f0a0b0" },
  neugier:   { icon: "🔍", label: "Neugier",     color: "#8fd49a" },
  verwirrung:{ icon: "😵‍💫", label: "Verwirrung", color: "#c9a060" },
  frieden:   { icon: "🕊️", label: "Frieden",     color: "#a0c4e8" },
  ekel:      { icon: "🤢", label: "Ekel",        color: "#7a9a6a" },
  sehnsucht: { icon: "🌅", label: "Sehnsucht",   color: "#d4a070" },
  scham:     { icon: "😳", label: "Scham",        color: "#c97a8a" },
};

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
    document.getElementById("form-title").textContent = dream ? "Traum bearbeiten" : "Neuer Traum";
    document.getElementById("dream-id").value = dream ? dream.id : "";
    document.getElementById("dream-date").value = dream ? dream.date : todayISO();
    document.getElementById("dream-title").value = dream ? dream.title : "";
    document.getElementById("dream-content").value = dream ? dream.content : "";
    document.getElementById("dream-lucidity").value = dream ? dream.lucidity : "2";
    document.getElementById("dream-sleep").value = dream?.sleep_quality ?? "";
    document.getElementById("dream-beifuss").checked = dream ? dream.beifuss : false;
    document.getElementById("dream-bigdream").checked = dream ? dream.big_dream : false;
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
            <p>🎯 Deine Absicht war: "<strong>${escapeHtml(intention.text)}</strong>" — hat es geklappt?</p>
            <div class="form-actions">
              <button type="button" class="primary" data-answer="yes">Ja ✓</button>
              <button type="button" data-answer="no">Nein ✗</button>
              <button type="button" data-answer="later">Später</button>
            </div>`;
          prompt.querySelector('[data-answer="yes"]').addEventListener("click", async () => {
            await api.fulfillIntention(intention.id, true);
            prompt.classList.add("hidden");
            showToast("Glückwunsch! Absicht erfüllt ✨");
          });
          prompt.querySelector('[data-answer="no"]').addEventListener("click", async () => {
            await api.fulfillIntention(intention.id, false);
            prompt.classList.add("hidden");
            showToast("Nächstes Mal klappt's 💪");
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
      beifuss: document.getElementById("dream-beifuss").checked,
      big_dream: document.getElementById("dream-bigdream").checked,
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
        showToast("Traum aktualisiert");
      } else {
        savedDream = await api.createDream(payload);
        showToast("Traum gespeichert 🌙");
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
        showToast("Offline gespeichert – wird übertragen, sobald der Server erreichbar ist 📥");
        this.closeForm();
        this.load();
      } else if (err.isNetworkError) {
        showToast("Bearbeiten geht nur mit Verbindung zum Server");
      } else {
        showToast(err.message);
      }
    }
  },

  async remove(id) {
    if (!confirm("Diesen Traum wirklich löschen?")) return;
    try {
      await api.deleteDream(id);
      showToast("Traum gelöscht");
      this.load();
    } catch (err) {
      showToast(err.message);
    }
  },

  render() {
    const offlineHint = this.serverOffline
      ? `<div class="card offline-hint">📡 Server nicht erreichbar – neue Träume werden auf diesem Gerät
         zwischengespeichert und automatisch übertragen.</div>`
      : "";

    const pendingHtml = this.pending
      .map(
        (p) => `<article class="card dream-entry pending-entry">
          <div class="entry-head">
            <h3>${escapeHtml(p.payload.title)}</h3>
            <span class="entry-date">${formatDate(p.payload.date)}</span>
          </div>
          ${p.payload.content ? `<p>${escapeHtml(p.payload.content)}</p>` : ""}
          <div><span class="badge pending">⏳ wartet auf Übertragung</span></div>
          <div class="entry-actions">
            <button class="danger" onclick="journal.removePending(${p.queueId})">Verwerfen</button>
          </div>
        </article>`
      )
      .join("");

    if (!this.dreams.length && !this.pending.length) {
      if (this.search.value || this.hasActiveFilters()) {
        this.list.innerHTML = offlineHint + `<div class="empty-state">Keine Träume gefunden.</div>`;
        this.updateTraumfadenButton();
        return;
      }
      // H.4: Erster App-Start (noch nie ein Traum) — Prozess-Intro statt leerer Zeile,
      // der Sternenknopf bleibt dabei versteckt (kein doppeltes Angebot).
      this.list.innerHTML = offlineHint + `<div class="card path-welcome">
        <h2>${TRAUMFADEN.title}</h2>
        ${TRAUMFADEN.short}
        <button class="primary" id="path-welcome-btn">Ersten Traum festhalten</button>
      </div>`;
      document.getElementById("path-welcome-btn")?.addEventListener("click", () => this.startNewDream());
      document.getElementById("traumfaden-btn")?.classList.add("hidden");
      return;
    }
    const lucidityLabels = ["keine Erinnerung", "Fragment", "Traum", "kurz luzide", "voll luzide ✨"];
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
            ${d.tags.map((t) => `<span class="badge">${escapeHtml(t)}</span>`).join("")}
            ${(d.emotions || []).map((e) => EMOTIONS[e] ? `<span class="badge emotion-badge" style="--emo-color:${EMOTIONS[e].color}">${EMOTIONS[e].icon} ${EMOTIONS[e].label}</span>` : "").join("")}
            ${d.beifuss ? `<span class="badge herb">🌿 Beifuß</span>` : ""}
          </div>
          ${d.notes_analysis ? `<p class="hint">📝 ${escapeHtml(d.notes_analysis)}</p>` : ""}
          <div class="entry-expand">
            <div class="expand-refs" id="refs-${d.id}"></div>
            <div class="expand-imgs" id="imgs-${d.id}"></div>
            <div class="expand-sync" id="sync-${d.id}"></div>
            <div class="expand-analysis" id="analysis-${d.id}"></div>
          </div>
          <div class="entry-actions">
            <button onclick="journal.edit(${d.id})">Bearbeiten</button>
            <button onclick="journal.showReflection(journal.dreams.find(x=>x.id===${d.id}))">🪞 Reflexion</button>
            <button onclick="journal.openImagination(${d.id})">🔮 Weiterträumen</button>
            <button onclick="journal.openSyncForm(${d.id})">🔗 Synchronizität</button>
            <button onclick="journal.openAnalysis(${d.id})">🧭 Jung-Analyse</button>
            <button class="danger" onclick="journal.remove(${d.id})">Löschen</button>
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
      <p>🕯️ Für gestern (${formatDate(yesterday)}) fehlt noch ein Eintrag. Auch
      „keine Erinnerung" zählt.</p>
      <div class="chip-row">
        <button class="chip primary" id="streak-add-btn">Traum eintragen</button>
        <button class="chip" id="streak-no-memory-btn">Weiß ich nicht mehr</button>
        <button class="hint" id="streak-dismiss-btn">nicht mehr erinnern</button>
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
          title: "Keine Erinnerung",
          content: "",
          lucidity: 0,
          sleep_quality: null,
          beifuss: false,
          big_dream: false,
          emotions: [],
          notes_analysis: null,
          tags: [], dream_signs: [], places: [], persons: [],
        });
        showToast("Nachgetragen — auch das zählt 🕯️");
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
      const lucidityLabels = ["", "Fragment", "Traum", "kurz luzide", "voll luzide ✨"];
      el.classList.remove("hidden");
      el.innerHTML = `<p class="hint">🔁 <strong>Traum-Echos</strong> — erinnert an:</p>
        ${echoes.map((e) => `<div class="echo-entry">
          <span>${escapeHtml(e.title)}</span>
          <span class="hint">${formatDate(e.date)}${e.lucidity >= 3 ? " ✨" : ""}</span>
        </div>`).join("")}`;
    } catch { el.classList.add("hidden"); }
  },

  reflectionQuestions: [
    "Wenn du ein Element dieses Traums wärst — welches? Was würde es dir sagen?",
    "Welches Gefühl war am stärksten? Wo in deinem Wachleben taucht es auch auf?",
    "Gab es eine Figur, die dich überrascht hat? Was könnte sie über dich verraten?",
    "Was hat im Traum gefehlt, das du dir gewünscht hättest?",
    "Welcher Teil des Traums fühlt sich an wie ein Schatten — etwas, das du nicht gern anschaust?",
    "Wenn der Traum eine Botschaft hätte — in einem Satz, welche wäre es?",
    "Welche Rolle hattest du im Traum? Wärst du im Wachleben gern anders aufgetreten?",
    "Gibt es einen Ort im Traum, an den du zurückkehren möchtest? Warum?",
    "Was würdest du die wichtigste Person im Traum fragen, wenn du könntest?",
    "Stell dir vor, der Traum ist ein Spiegel. Was siehst du, wenn du hineinschaust?",
    "Welches Symbol oder Bild bleibt am stärksten hängen? Was bedeutet es für dich — nicht allgemein, sondern persönlich?",
    "Wenn du den Traum als Kapitel deines Lebens betitelst — wie heißt es?",
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
        showToast("Reflexion gespeichert 🪞");
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
      el.innerHTML = `<details class="expand-detail"><summary>🪞 ${refs.length} Reflexion${refs.length > 1 ? "en" : ""}</summary>
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
      el.innerHTML = `<details class="expand-detail"><summary>🔮 ${imgs.length} Aktive Imagination${imgs.length > 1 ? "en" : ""}</summary>
        ${imgs.map((i) => `<div class="ref-entry">
          <p>${escapeHtml(i.text)}</p>
          <span class="hint">${new Date(i.created_at).toLocaleDateString("de-DE")}</span>
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
        showToast("Imagination gespeichert 🔮");
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
      <h4>🔗 Ist etwas dazu passiert?</h4>
      <p class="hint">Bedeutsame Koinzidenz zwischen Traum und Wachleben.</p>
      <label>Datum <input type="date" class="sync-date" value="${today}"></label>
      <label>Was geschah? <textarea class="sync-text" rows="2" placeholder="Was im Wachleben passiert ist ..."></textarea></label>
      <div class="form-actions">
        <button class="primary sync-save-btn">Speichern</button>
        <button class="sync-cancel-btn">Abbrechen</button>
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
        showToast("Synchronizität gespeichert 🔗");
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
      el.innerHTML = `<details class="expand-detail"><summary>🔗 ${dreamEvents.length} Synchronizität${dreamEvents.length > 1 ? "en" : ""}</summary>
        ${dreamEvents.map((e) => {
          const dreamDate = this.dreams.find((d) => d.id === dreamId)?.date;
          const daysDiff = dreamDate ? Math.round((new Date(e.date) - new Date(dreamDate)) / 86400000) : null;
          const timeHint = daysDiff !== null && daysDiff > 0 ? `${daysDiff} Tag${daysDiff > 1 ? "e" : ""} später` : formatDate(e.date);
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
    if (!confirm("Diesen noch nicht übertragenen Traum verwerfen?")) return;
    await offline.remove(queueId);
    showToast("Offline-Eintrag verworfen");
    this.load();
  },

  ANALYSIS_STATIONS: [
    { key: "persona", icon: "🎭", title: "Persona",
      q: 'Welche Rolle oder Maske trugst du im Traum? Wie unterscheidet sie sich von deinem Wach-Ich?' },
    { key: "schatten", icon: "🌑", title: "Schatten",
      q: 'Was hat dich im Traum abgestoßen, geängstigt oder wütend gemacht? Was könnte das ueber verdrängte Seiten von dir verraten?' },
    { key: "gegenstimme", icon: "🌗", title: "Gegenstimme",
      q: 'Gab es eine faszinierende oder irritierende Figur? Was verkörpert sie, das in deinem Alltag zu kurz kommt?' },
    { key: "kompensation", icon: "⚖️", title: "Kompensation",
      q: 'Was gleicht dieser Traum in deinem aktuellen Leben aus? Was ergänzt er?' },
    { key: "symbole", icon: "🔣", title: "Symbole",
      q: 'Welches Bild oder Symbol bleibt am stärksten hängen? Was bedeutet es für dich persönlich?' },
    { key: "ganzheit", icon: "🔵", title: "Ganzheit",
      q: 'Wenn der Traum eine Botschaft deiner ganzen Psyche wäre — welcher eine Satz fasst sie zusammen?' },
  ],

  openAnalysis(dreamId) {
    const dream = this.dreams.find((d) => d.id === dreamId);
    if (!dream) return;
    const overlay = document.createElement("div");
    overlay.className = "overlay analysis-overlay";
    overlay.innerHTML = `<div class="overlay-content analysis-content">
      <h3>🧭 Jung-Analyse: ${escapeHtml(dream.title)}</h3>
      <p class="hint">Sechs Perspektiven auf deinen Traum. Du kannst jederzeit abbrechen — bereits Gespeichertes bleibt erhalten.</p>
      <div class="analysis-stations"></div>
      <div class="analysis-step"></div>
      <div class="form-actions" style="margin-top:1rem">
        <button class="analysis-close">Schließen</button>
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
        stepEl.innerHTML = '<p style="text-align:center;padding:1rem">✅ Alle Stationen beantwortet!</p>';
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
        <textarea class="analysis-answer" rows="4" placeholder="Deine Gedanken ...">${escapeHtml(existing)}</textarea>
        <div class="form-actions">
          ${currentIdx > 0 ? '<button class="analysis-prev">Zurück</button>' : ''}
          <button class="primary analysis-save">Speichern & weiter</button>
          <button class="analysis-skip hint">Überspringen</button>
        </div>
      </div>`;

      stepEl.querySelector(".analysis-save").addEventListener("click", async () => {
        const answer = stepEl.querySelector(".analysis-answer").value.trim();
        if (!answer) { currentIdx++; renderStep(); return; }
        try {
          await api.createDreamAnalysis(dreamId, station.key, answer);
          showToast(station.title + " gespeichert");
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
      el.innerHTML = `<details class="expand-detail"><summary>🧭 Jung-Analyse (${entries.length}/6)</summary>
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
  return new Date(iso + "T00:00:00").toLocaleDateString("de-DE", {
    weekday: "short", day: "2-digit", month: "2-digit", year: "numeric",
  });
}

function escapeHtml(str) {
  const div = document.createElement("div");
  div.textContent = str;
  return div.innerHTML;
}

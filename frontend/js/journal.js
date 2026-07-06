// Tagebuch: Erfassen, Liste, Suche, Bearbeiten, Löschen
const journal = {
  dreams: [],

  init() {
    this.form = document.getElementById("dream-form");
    this.list = document.getElementById("dream-list");
    this.search = document.getElementById("search-input");

    document.getElementById("new-dream-btn").addEventListener("click", () => this.openForm());
    document.getElementById("cancel-btn").addEventListener("click", () => this.closeForm());
    this.form.addEventListener("submit", (e) => this.save(e));

    let debounce;
    this.search.addEventListener("input", () => {
      clearTimeout(debounce);
      debounce = setTimeout(() => this.load(), 300);
    });

    this.load();
  },

  async load() {
    try {
      this.dreams = await api.listDreams({ search: this.search.value.trim() });
      this.render();
    } catch (err) {
      showToast(err.message);
    }
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
  },

  openForm(dream = null) {
    this.form.classList.remove("hidden");
    document.getElementById("form-title").textContent = dream ? "Traum bearbeiten" : "Neuer Traum";
    document.getElementById("dream-id").value = dream ? dream.id : "";
    document.getElementById("dream-date").value = dream ? dream.date : todayISO();
    document.getElementById("dream-title").value = dream ? dream.title : "";
    document.getElementById("dream-content").value = dream ? dream.content : "";
    document.getElementById("dream-lucidity").value = dream ? dream.lucidity : "2";
    document.getElementById("dream-sleep").value = dream?.sleep_quality ?? "";
    document.getElementById("dream-tags").value = dream ? dream.tags.join(", ") : "";
    document.getElementById("dream-signs").value = dream ? dream.dream_signs.join(", ") : "";
    document.getElementById("dream-notes").value = dream?.notes_analysis ?? "";
    this.refreshDatalists();
    this.form.scrollIntoView({ behavior: "smooth" });
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
      notes_analysis: document.getElementById("dream-notes").value.trim() || null,
      tags: splitList(document.getElementById("dream-tags").value),
      dream_signs: splitList(document.getElementById("dream-signs").value),
    };
    try {
      if (id) {
        await api.updateDream(id, payload);
        showToast("Traum aktualisiert");
      } else {
        await api.createDream(payload);
        showToast("Traum gespeichert 🌙");
      }
      this.closeForm();
      this.load();
    } catch (err) {
      showToast(err.message);
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
    if (!this.dreams.length) {
      this.list.innerHTML = `<div class="empty-state">
        ${this.search.value ? "Keine Träume gefunden." : "Noch keine Träume. Leg direkt nach dem Aufwachen los – auch Fragmente zählen!"}
      </div>`;
      return;
    }
    const lucidityLabels = ["keine Erinnerung", "Fragment", "Traum", "kurz luzide", "voll luzide ✨"];
    this.list.innerHTML = this.dreams
      .map(
        (d) => `<article class="card dream-entry">
          <div class="entry-head">
            <h3>${escapeHtml(d.title)}</h3>
            <span class="entry-date">${formatDate(d.date)}</span>
          </div>
          ${d.content ? `<p>${escapeHtml(d.content)}</p>` : ""}
          <div>
            <span class="badge ${d.lucidity >= 3 ? "lucid" : ""}">${lucidityLabels[d.lucidity]}</span>
            ${d.dream_signs.map((s) => `<span class="badge sign">🔮 ${escapeHtml(s)}</span>`).join("")}
            ${d.tags.map((t) => `<span class="badge">${escapeHtml(t)}</span>`).join("")}
          </div>
          ${d.notes_analysis ? `<p class="hint">📝 ${escapeHtml(d.notes_analysis)}</p>` : ""}
          <div class="entry-actions">
            <button onclick="journal.edit(${d.id})">Bearbeiten</button>
            <button class="danger" onclick="journal.remove(${d.id})">Löschen</button>
          </div>
        </article>`
      )
      .join("");
  },

  edit(id) {
    const dream = this.dreams.find((d) => d.id === id);
    if (dream) this.openForm(dream);
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

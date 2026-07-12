const WISSEN = {
  archetypen: {
    text: "Archetypen sind nach C. G. Jung wiederkehrende Grundmuster im kollektiven Unbewussten — innere Figuren, die in allen Kulturen auftauchen. Sie sind keine Schubladen, sondern Reflexions-Linsen.",
    link: "archetypen-lexikon",
  },
  schatten: {
    text: "Der Schatten ist alles, was nicht ins Selbstbild passt und verdrängt wird. Im Traum begegnet er oft als bedrohliche oder abstoßende Figur. Ihn zu kennen setzt gebundene Energie frei.",
    link: "arch-schatten",
  },
  amplifikation: {
    text: "Amplifikation nach Jung: Ein Symbol nicht nachschlagen, sondern mit eigenen Erinnerungen, Gefühlen und Einfällen anreichern. Dein Meer ist nicht mein Meer.",
    link: "jung-symbole",
  },
  kompensation: {
    text: "Jung sah Träume als Gegengewicht zum Tag: Wer sich nur stark zeigt, träumt Schwäche. Frage: Was ergänzt dieser Traum in meinem Leben gerade?",
    link: "jung-kompensation",
  },
  "grosser-traum": {
    text: "Große Träume (Jung) sind bildstark, aufwühlend, unvergesslich — Marksteine der inneren Entwicklung. Wenn ein Traum dich nicht loslässt, verdient er einen Stern.",
    link: "jung-grosse-traeume",
  },
  imagination: {
    text: "Aktive Imagination (Jung): Den Traum im Wachzustand bewusst weiterführen und die inneren Figuren befragen. Nicht erfinden — zuhören.",
    link: "jung-anima",
  },
  mandala: {
    text: "Jung malte fast täglich Mandalas als Momentaufnahme seiner Psyche. Der Kreis mit Mitte symbolisiert Ganzheit — das Selbst.",
    link: "jung-selbst",
  },
  synchronizitaet: {
    text: "Synchronizität (Jung): bedeutsame Koinzidenzen zwischen Traum und Wachleben. Ob Zufall oder nicht — das Bemerken selbst ist die Übung.",
    link: "jung-grosse-traeume",
  },
};

const wissen = {
  attach(el, key) {
    const data = WISSEN[key];
    if (!data) return;
    const storageKey = "hint-" + key;
    const btn = document.createElement("button");
    btn.className = "wissen-btn";
    btn.textContent = "\u{1F4A1}";
    btn.title = "Wissens-Moment";
    btn.addEventListener("click", () => this.show(el, key));
    el.appendChild(btn);

    if (!localStorage.getItem(storageKey)) {
      localStorage.setItem(storageKey, "1");
      setTimeout(() => this.show(el, key), 600);
    }
  },

  show(anchor, key) {
    const data = WISSEN[key];
    if (!data) return;
    document.querySelectorAll(".wissen-card").forEach((c) => c.remove());
    const card = document.createElement("div");
    card.className = "wissen-card";
    card.innerHTML = `<p>${data.text}</p>
      <a href="#" class="wissen-link" data-link="${data.link}">Mehr im Kompendium →</a>
      <button class="wissen-close">✕</button>`;
    card.querySelector(".wissen-close").addEventListener("click", () => card.remove());
    card.querySelector(".wissen-link").addEventListener("click", (e) => {
      e.preventDefault();
      card.remove();
      document.querySelector('[data-tab="learn"]').click();
      setTimeout(() => {
        const target = document.getElementById(data.link);
        if (target) {
          target.open = true;
          target.scrollIntoView({ behavior: "smooth" });
        }
      }, 200);
    });
    anchor.style.position = "relative";
    anchor.appendChild(card);
  },
};

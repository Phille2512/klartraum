// Klickbare Hilfe für Bedienung (H.2) — im Unterschied zu den 💡-Wissens-Momenten
// (wissen.js, Konzepte) geht es hier ausschließlich um: Was ist das? Wie
// benutze ich es? Wozu? Nie automatisch, immer nur auf Abruf.
const HILFE = {
  "atlas-netz": {
    title: "🕸️ Traumatlas – Netz",
    was: "Alle Elemente deiner Träume (📍 Orte, 👤 Personen, 🔮 Traumzeichen) als Netz. Verbunden ist, was im selben Traum vorkam; je öfter geträumt, desto größer der Knoten.",
    wie: "Element antippen → alle Träume damit („Traumserie“). „🎯 Fokussieren“ zeigt nur ein Element und seine direkten Nachbarn. Oben kannst du nach Art, Häufigkeit und Zeitraum filtern; der Schieberegler unten ist eine Zeitreise durch deine Traumwelt.",
    wozu: "Wiederkehrendes erkennen — deine besten Kandidaten für Reality Checks.",
  },
  "atlas-karte": {
    title: "🗺️ Traumweltkarte",
    was: "Deine Traumorte als selbst gelegte Landkarte. Nebel liegt über Unerforschtem.",
    wie: "Werkzeug wählen: ✋ Bewegen · 📍 Platzieren · 🚶 Weg · 🗑️ Entfernen. Die Hinweiszeile unter der Werkzeugleiste sagt dir jeweils, was gerade zu tun ist. Unkartierte Orte warten in der Ablage darunter.",
    wozu: "Eine mentale Karte deiner Traumwelt aufbauen — Orte, die man „kennt“, erkennt man im Traum wieder, und Wiedererkennen macht luzide.",
  },
  "atlas-innenwelt": {
    title: "🌗 Innenwelt-Bühne",
    was: "Die Menschen deiner Träume als Bühne um dein „Selbst“ in der Mitte. Die Felder entsprechen Rollen nach C. G. Jung (Archetypen).",
    wie: "Figur antippen → ihre Geschichte, Gefühle und Gespräche. Figuren ohne Rolle stehen außen — antippen und einsortieren.",
    wozu: "Sehen, wer dein Innenleben bevölkert und welche Rollen dominieren; über „Gespräch fortsetzen“ mit einer Figur in Dialog gehen (Aktive Imagination).",
    extraLink: { label: "Was sind Archetypen? →", anchor: "archetypen-lexikon" },
  },
  kompass: {
    title: "🧭 Traumkompass",
    was: "Deine Traumzeichen, einsortiert in vier Kategorien nach Stephen LaBerge: Inneres Erleben, Handlung, Form, Kontext.",
    wie: "Ein Traumzeichen antippen und die passende Kategorie wählen. Die App leitet daraus deine persönliche Reality-Check-Mission ab.",
    wozu: "Wissen, worauf du im Alltag achten solltest, um im Traum aufzuwachen.",
  },
  mandala: {
    title: "🌗 Traum-Mandala",
    was: "Deine Traumdaten als Momentaufnahme-Bild nach C. G. Jung — der Kreis mit Mitte symbolisiert Ganzheit (das Selbst).",
    wie: "Zeitraum wählen, das Bild betrachten, bei Bedarf als Bild sichern.",
    wozu: "Eine symbolische Übersicht über eine Traumphase — gleiche Daten ergeben immer dasselbe Bild.",
  },
  "innenwelt-dossier": {
    title: "👤 Figuren-Dossier",
    was: "Die Akte einer einzelnen Traumfigur: alle gemeinsamen Träume, häufigste Gefühle, Archetyp-Rolle.",
    wie: "Rolle zuweisen, Assoziationen sammeln, über „Gespräch fortsetzen“ Aktive Imagination betreiben.",
    wozu: "Eine Figur über die Zeit verstehen lernen, statt sie nur einmal zu sehen.",
  },
  "analyse-aufriss": {
    title: "🔬 Aufreißen nach …",
    was: "Eine Vergleichs-Steuerung: teilt deine Träume in zwei Gruppen (z. B. mit/ohne Beifuß).",
    wie: "Kategorie wählen — alle Diagramme dieser Sektion zeigen daraufhin zwei Serien im Vergleich statt einer.",
    wozu: "Herausfinden, ob ein Faktor tatsächlich einen Unterschied macht, statt zu raten.",
  },
  zeitraffer: {
    title: "🕰️ Zeitraffer",
    was: "Der Schieberegler unter dem Atlas-Netz zeigt, wie deine Traumwelt zu einem früheren Zeitpunkt aussah.",
    wie: "Ziehen oder ▶ drücken für eine automatische Zeitreise bis heute.",
    wozu: "Sehen, wie deine Traumwelt gewachsen ist — welche Orte und Personen zuerst da waren.",
  },
};

const hilfe = {
  attach(headerEl, key) {
    if (!HILFE[key] || !headerEl || headerEl.querySelector(".hilfe-btn")) return;
    const btn = document.createElement("button");
    btn.className = "hilfe-btn";
    btn.setAttribute("aria-label", "Hilfe");
    btn.textContent = "ⓘ";
    btn.addEventListener("click", (e) => {
      e.stopPropagation();
      this.show(key);
    });
    headerEl.appendChild(btn);
  },

  show(key) {
    const data = HILFE[key];
    if (!data) return;
    document.querySelectorAll(".hilfe-overlay").forEach((o) => o.remove());
    const overlay = document.createElement("div");
    overlay.className = "hilfe-overlay";
    overlay.innerHTML = `<div class="card hilfe-card">
      <h2>${data.title}</h2>
      <h3>Was ist das?</h3>
      <p>${data.was}</p>
      <h3>Wie benutze ich es?</h3>
      <p>${data.wie}</p>
      <h3>Wozu?</h3>
      <p>${data.wozu}</p>
      ${data.extraLink ? `<a href="#" class="hilfe-extra-link">${data.extraLink.label}</a>` : ""}
      <button class="hilfe-close ritual-close-btn">✕</button>
    </div>`;
    overlay.addEventListener("click", (e) => {
      if (e.target === overlay) overlay.remove();
    });
    overlay.querySelector(".hilfe-close").addEventListener("click", () => overlay.remove());
    overlay.querySelector(".hilfe-extra-link")?.addEventListener("click", (e) => {
      e.preventDefault();
      overlay.remove();
      document.querySelector('[data-tab="learn"]').click();
      setTimeout(() => {
        const target = document.getElementById(data.extraLink.anchor);
        if (target) {
          if (target.tagName === "DETAILS") target.open = true;
          target.scrollIntoView({ behavior: "smooth" });
        }
      }, 200);
    });
    document.body.appendChild(overlay);
  },
};

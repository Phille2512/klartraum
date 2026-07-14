// Klickbare Hilfe für Bedienung (H.2) — im Unterschied zu den 💡-Wissens-Momenten
// (wissen.js, Konzepte) geht es hier ausschließlich um: Was ist das? Wie
// benutze ich es? Wozu? Nie automatisch, immer nur auf Abruf.
const HILFE = {
  "atlas-netz": {
    title: t("hilfe.atlasNetz.title"),
    was: t("hilfe.atlasNetz.was"),
    wie: t("hilfe.atlasNetz.wie"),
    wozu: t("hilfe.atlasNetz.wozu"),
  },
  "atlas-karte": {
    title: t("hilfe.atlasKarte.title"),
    was: t("hilfe.atlasKarte.was"),
    wie: t("hilfe.atlasKarte.wie"),
    wozu: t("hilfe.atlasKarte.wozu"),
  },
  "atlas-innenwelt": {
    title: t("hilfe.atlasInnenwelt.title"),
    was: t("hilfe.atlasInnenwelt.was"),
    wie: t("hilfe.atlasInnenwelt.wie"),
    wozu: t("hilfe.atlasInnenwelt.wozu"),
    extraLink: { label: t("hilfe.atlasInnenwelt.extraLink"), anchor: "archetypen-lexikon" },
  },
  kompass: {
    title: t("hilfe.kompass.title"),
    was: t("hilfe.kompass.was"),
    wie: t("hilfe.kompass.wie"),
    wozu: t("hilfe.kompass.wozu"),
  },
  mandala: {
    title: t("hilfe.mandala.title"),
    was: t("hilfe.mandala.was"),
    wie: t("hilfe.mandala.wie"),
    wozu: t("hilfe.mandala.wozu"),
  },
  "innenwelt-dossier": {
    title: t("hilfe.innenweltDossier.title"),
    was: t("hilfe.innenweltDossier.was"),
    wie: t("hilfe.innenweltDossier.wie"),
    wozu: t("hilfe.innenweltDossier.wozu"),
  },
  "analyse-aufriss": {
    title: t("hilfe.analyseAufriss.title"),
    was: t("hilfe.analyseAufriss.was"),
    wie: t("hilfe.analyseAufriss.wie"),
    wozu: t("hilfe.analyseAufriss.wozu"),
  },
  zeitraffer: {
    title: t("hilfe.zeitraffer.title"),
    was: t("hilfe.zeitraffer.was"),
    wie: t("hilfe.zeitraffer.wie"),
    wozu: t("hilfe.zeitraffer.wozu"),
  },
  "schlaf-analyse": {
    title: t("hilfe.schlafAnalyse.title"),
    was: t("hilfe.schlafAnalyse.was"),
    wie: t("hilfe.schlafAnalyse.wie"),
    wozu: t("hilfe.schlafAnalyse.wozu"),
    extraLink: { label: t("hilfe.schlafAnalyse.extraLink"), anchor: "guide-schlaf" },
  },
};

const hilfe = {
  attach(headerEl, key) {
    if (!HILFE[key] || !headerEl || headerEl.querySelector(".hilfe-btn")) return;
    const btn = document.createElement("button");
    btn.className = "hilfe-btn";
    btn.setAttribute("aria-label", t("hilfe.ariaLabel"));
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
      <h3>${t("hilfe.whatIsIt")}</h3>
      <p>${data.was}</p>
      <h3>${t("hilfe.howToUse")}</h3>
      <p>${data.wie}</p>
      <h3>${t("hilfe.whatFor")}</h3>
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

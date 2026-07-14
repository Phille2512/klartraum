const WISSEN = {
  archetypen: { text: t("wissen.archetypen"), link: "archetypen-lexikon" },
  schatten: { text: t("wissen.schatten"), link: "arch-schatten" },
  amplifikation: { text: t("wissen.amplifikation"), link: "jung-symbole" },
  kompensation: { text: t("wissen.kompensation"), link: "jung-kompensation" },
  "grosser-traum": { text: t("wissen.grosserTraum"), link: "jung-grosse-traeume" },
  imagination: { text: t("wissen.imagination"), link: "jung-anima" },
  mandala: { text: t("wissen.mandala"), link: "jung-selbst" },
  synchronizitaet: { text: t("wissen.synchronizitaet"), link: "jung-grosse-traeume" },
  schlafzeit: { text: t("wissen.schlafzeit"), link: "guide-schlaf" },
};

const wissen = {
  attach(el, key) {
    const data = WISSEN[key];
    if (!data) return;
    const storageKey = "hint-" + key;
    const btn = document.createElement("button");
    btn.className = "wissen-btn";
    btn.textContent = "\u{1F4A1}";
    btn.title = t("wissen.momentTitle");
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
      <a href="#" class="wissen-link" data-link="${data.link}">${t("wissen.moreLink")}</a>
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

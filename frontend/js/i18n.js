// i18n: Deutsch ⇄ Englisch. Lädt VOR allen anderen Skripten, da t() global
// genutzt wird (kein Build-Schritt/Module in dieser App, siehe UMSETZUNGSPLAN.md
// Teil A Konvention 4). Nutzerdaten (Traumtexte, Tags, Orte, Personen, Notizen)
// werden NIEMALS übersetzt — nur UI-Text läuft über dieses Modul.
//
// Stufe I.1 (Infrastruktur): das Wörterbuch wächst modulweise in I.2/I.3.
// Fehlender Schlüssel fällt sichtbar auf Deutsch zurück, nie auf einen leeren
// String — so bleibt ein vergessener Eintrag beim Testen auffindbar.
const I18N = {
  de: {
    "nav.journal": "Tagebuch",
    "nav.stats": "Analyse",
    "nav.atlas": "Atlas",
    "nav.learn": "Lernen",
    "header.rotlicht": "Rotlicht-Modus",
    "header.lesezimmer": "Lesezimmer",
    "header.ritual": "Abendritual",
    "header.lang": "Switch to English",
  },
  en: {
    "nav.journal": "Diary",
    "nav.stats": "Analysis",
    "nav.atlas": "Atlas",
    "nav.learn": "Learn",
    "header.rotlicht": "Red light mode",
    "header.lesezimmer": "Reading Room",
    "header.ritual": "Evening Ritual",
    "header.lang": "Auf Deutsch wechseln",
  },
};

function detectLang() {
  const stored = localStorage.getItem("lang");
  if (stored === "de" || stored === "en") return stored;
  return navigator.language?.startsWith("de") ? "de" : "en";
}

const lang = detectLang();
document.documentElement.lang = lang;

function t(key, vars = {}) {
  let s = I18N[lang]?.[key] ?? I18N.de[key] ?? key;
  for (const [k, v] of Object.entries(vars)) s = s.replaceAll(`{${k}}`, v);
  return s;
}

// Datums-/Wochen-Formatierung: eigener kleiner Helfer statt Duplikation in
// jedem Modul, das Datumsangaben oder Bucket-Labels ("2026-KW03") anzeigt.
function localeForLang() {
  return lang === "de" ? "de-DE" : "en-US";
}

function formatBucketLabel(bucket) {
  return lang === "de" ? bucket : bucket.replace("-KW", "-W");
}

// Statisches HTML: data-i18n (Textinhalt), data-i18n-placeholder,
// data-i18n-title, data-i18n-aria. Dynamisch generiertes HTML (Templates in
// den Modulen) ruft t() direkt beim Rendern auf, applyI18n() betrifft nur
// Elemente, die dauerhaft im DOM stehen.
function applyI18n(root = document) {
  root.querySelectorAll("[data-i18n]").forEach((el) => {
    el.textContent = t(el.dataset.i18n);
  });
  root.querySelectorAll("[data-i18n-placeholder]").forEach((el) => {
    el.placeholder = t(el.dataset.i18nPlaceholder);
  });
  root.querySelectorAll("[data-i18n-title]").forEach((el) => {
    el.title = t(el.dataset.i18nTitle);
  });
  root.querySelectorAll("[data-i18n-aria]").forEach((el) => {
    el.setAttribute("aria-label", t(el.dataset.i18nAria));
  });
}

applyI18n();

function initLangSwitcher() {
  const btn = document.getElementById("lang-btn");
  if (!btn) return;
  btn.title = t("header.lang");
  btn.addEventListener("click", () => {
    localStorage.setItem("lang", lang === "de" ? "en" : "de");
    location.reload();
  });
}

initLangSwitcher();

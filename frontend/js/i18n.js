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

    "common.save": "Speichern",
    "common.cancel": "Abbrechen",
    "common.edit": "Bearbeiten",
    "common.delete": "Löschen",
    "common.yes": "Ja ✓",
    "common.no": "Nein ✗",
    "common.later": "Später",
    "common.close": "Schließen",

    "emotion.angst": "Angst",
    "emotion.freude": "Freude",
    "emotion.staunen": "Staunen",
    "emotion.trauer": "Trauer",
    "emotion.wut": "Wut",
    "emotion.liebe": "Liebe",
    "emotion.neugier": "Neugier",
    "emotion.verwirrung": "Verwirrung",
    "emotion.frieden": "Frieden",
    "emotion.ekel": "Ekel",
    "emotion.sehnsucht": "Sehnsucht",
    "emotion.scham": "Scham",

    "phenomenon.falschesErwachen": "Falsches Erwachen",
    "phenomenon.schlafparalyse": "Schlafparalyse",
    "phenomenon.traumImTraum": "Traum-im-Traum",
    "phenomenon.wiederkehrend": "Wiederkehrender Traum",
    "phenomenon.albtraum": "Albtraum",

    "substance.beifuss": "Beifuß",
    "substance.melatonin": "Melatonin",
    "substance.alkohol": "Alkohol",
    "substance.weed": "Weed",

    "journal.searchPlaceholder": "Träume durchsuchen …",
    "journal.newDream": "+ Neuer Traum",
    "journal.filterToggle": "🔎 Filter",
    "journal.filterBigDreams": "⭐ Große Träume",
    "journal.filterTagPlaceholder": "Nach Tag/Zeichen/Ort/Person filtern …",
    "journal.filterReset": "Filter zurücksetzen",
    "journal.formTitleNew": "Neuer Traum",
    "journal.formTitleEdit": "Traum bearbeiten",
    "journal.contentLabel": "Was hast du geträumt?",
    "journal.contentPlaceholder": "Schreibe alles auf, woran du dich erinnerst – auch Fragmente.",
    "journal.titleLabel": "Titel",
    "journal.titlePlaceholder": "Kurzer Titel",
    "journal.dateLabel": "Datum",
    "journal.lucidityLabel": "Erinnerung / Luzidität",
    "journal.lucidityOption.0": "0 – keine Erinnerung",
    "journal.lucidityOption.1": "1 – Fragment",
    "journal.lucidityOption.2": "2 – normaler Traum",
    "journal.lucidityOption.3": "3 – kurz luzide",
    "journal.lucidityOption.4": "4 – voll luzide",
    "journal.lucidityBadge.0": "keine Erinnerung",
    "journal.lucidityBadge.1": "Fragment",
    "journal.lucidityBadge.2": "Traum",
    "journal.lucidityBadge.3": "kurz luzide",
    "journal.lucidityBadge.4": "voll luzide ✨",
    "journal.sleepLabel": "Schlafqualität",
    "journal.sleep.1": "1 – sehr schlecht",
    "journal.sleep.5": "5 – sehr gut",
    "journal.substancesLabel": "Substanzen vor dem Schlafen",
    "journal.optionalHint": "(falls zutreffend)",
    "journal.otherLabel": "Sonstiges",
    "journal.otherHint": "(z. B. anderes Schlafmittel, kurz)",
    "journal.otherPlaceholder": "z. B. Baldrian, CBD-Öl",
    "journal.bigDreamLabel": "Großer Traum",
    "journal.bigDreamHint": "(numinos, aufwühlend, bleibt im Gedächtnis — nach C. G. Jung)",
    "journal.phenomenaLabel": "Phänomene",
    "journal.emotionsLabel": "Emotionen",
    "journal.emotionsHint": "(was hast du im Traum gefühlt?)",
    "journal.signsLabel": "Traumzeichen",
    "journal.signsHint": "(wiederkehrende Muster, kommagetrennt)",
    "journal.signsPlaceholder": "z. B. fliegen, verstorbene Person, Zähne",
    "journal.placesLabel": "📍 Orte",
    "journal.commaHint": "(kommagetrennt)",
    "journal.placesPlaceholder": "z. B. alte schule, meer",
    "journal.personsLabel": "👤 Personen",
    "journal.personsPlaceholder": "z. B. papa, freundin",
    "journal.tagsLabel": "Tags",
    "journal.tagsPlaceholder": "z. B. albtraum, arbeit",
    "journal.notesLabel": "Eigene Analyse / Notizen",
    "journal.notesPlaceholder": "Deutung, Auffälligkeiten … (optional)",

    "journal.emptyResults": "Keine Träume gefunden.",
    "journal.firstDreamBtn": "Ersten Traum festhalten",
    "journal.offlineHint": "📡 Server nicht erreichbar – neue Träume werden auf diesem Gerät zwischengespeichert und automatisch übertragen.",
    "journal.pendingBadge": "⏳ wartet auf Übertragung",
    "journal.discard": "Verwerfen",

    "journal.confirmDelete": "Diesen Traum wirklich löschen?",
    "journal.confirmDiscardPending": "Diesen noch nicht übertragenen Traum verwerfen?",

    "journal.echoesHeading": "🔁 <strong>Traum-Echos</strong> — erinnert an:",

    "journal.intentionPrompt": '🎯 Deine Absicht war: "{text}" — hat es geklappt?',

    "journal.streakMissing": '🕯️ Für gestern ({date}) fehlt noch ein Eintrag. Auch „keine Erinnerung" zählt.',
    "journal.streakAdd": "Traum eintragen",
    "journal.streakNoMemory": "Weiß ich nicht mehr",
    "journal.streakDismiss": "nicht mehr erinnern",
    "journal.noMemoryTitle": "Keine Erinnerung",

    "journal.toastUpdated": "Traum aktualisiert",
    "journal.toastSaved": "Traum gespeichert 🌙",
    "journal.toastSavedOffline": "Offline gespeichert – wird übertragen, sobald der Server erreichbar ist 📥",
    "journal.toastEditNeedsServer": "Bearbeiten geht nur mit Verbindung zum Server",
    "journal.toastDeleted": "Traum gelöscht",
    "journal.toastStreakAdded": "Nachgetragen — auch das zählt 🕯️",
    "journal.toastPendingDiscarded": "Offline-Eintrag verworfen",
    "journal.toastIntentionYes": "Glückwunsch! Absicht erfüllt ✨",
    "journal.toastIntentionNo": "Nächstes Mal klappt's 💪",
    "journal.toastReflectionSaved": "Reflexion gespeichert 🪞",
    "journal.toastImaginationSaved": "Imagination gespeichert 🔮",
    "journal.toastSyncSaved": "Synchronizität gespeichert 🔗",
    "journal.toastStationSaved": "{station} gespeichert",

    "journal.actionReflection": "🪞 Reflexion",
    "journal.actionImagination": "🔮 Weiterträumen",
    "journal.actionSync": "🔗 Synchronizität",
    "journal.actionAnalysis": "🧭 Jung-Analyse",

    "journal.reflectionOne": "Reflexion",
    "journal.reflectionMany": "Reflexionen",
    "journal.imaginationOne": "Aktive Imagination",
    "journal.imaginationMany": "Aktive Imaginationen",
    "journal.syncOne": "Synchronizität",
    "journal.syncMany": "Synchronizitäten",
    "journal.dayLater": "Tag später",
    "journal.daysLater": "Tage später",
    "journal.jungAnalysisSummary": "🧭 Jung-Analyse ({done}/6)",
    "journal.analysisTitle": "🧭 Jung-Analyse: {title}",
    "journal.analysisHint": "Sechs Perspektiven auf deinen Traum. Du kannst jederzeit abbrechen — bereits Gespeichertes bleibt erhalten.",
    "journal.analysisAllDone": "✅ Alle Stationen beantwortet!",
    "journal.thoughtsPlaceholder": "Deine Gedanken ...",
    "journal.back": "Zurück",
    "journal.saveAndNext": "Speichern & weiter",
    "journal.skip": "Überspringen",

    "journal.syncFormTitle": "🔗 Ist etwas dazu passiert?",
    "journal.syncFormHint": "Bedeutsame Koinzidenz zwischen Traum und Wachleben.",
    "journal.syncTextLabel": "Was geschah?",
    "journal.syncTextPlaceholder": "Was im Wachleben passiert ist ...",

    "lesezimmer.closeAria": "Lesezimmer schließen",
    "lesezimmer.sourceNight": "🌙 In dieser Nacht",
    "lesezimmer.sourceRandom": "🎲 Zufall",
    "lesezimmer.sourceBig": "⭐ Große Träume",
    "lesezimmer.sourceStale": "🕰️ Lange nicht gelesen",
    "lesezimmer.empty": "Noch keine passenden Träume zum Wiederlesen da.",
    "lesezimmer.noContent": "(kein Text festgehalten)",
    "lesezimmer.echoesHeading": "Ähnliche Träume:",
    "lesezimmer.prev": "← Zurück",
    "lesezimmer.reveal": "Details",
    "lesezimmer.next": "Weiter →",
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

    "common.save": "Save",
    "common.cancel": "Cancel",
    "common.edit": "Edit",
    "common.delete": "Delete",
    "common.yes": "Yes ✓",
    "common.no": "No ✗",
    "common.later": "Later",
    "common.close": "Close",

    "emotion.angst": "Fear",
    "emotion.freude": "Joy",
    "emotion.staunen": "Awe",
    "emotion.trauer": "Sadness",
    "emotion.wut": "Anger",
    "emotion.liebe": "Love",
    "emotion.neugier": "Curiosity",
    "emotion.verwirrung": "Confusion",
    "emotion.frieden": "Peace",
    "emotion.ekel": "Disgust",
    "emotion.sehnsucht": "Longing",
    "emotion.scham": "Shame",

    "phenomenon.falschesErwachen": "False awakening",
    "phenomenon.schlafparalyse": "Sleep paralysis",
    "phenomenon.traumImTraum": "Dream within a dream",
    "phenomenon.wiederkehrend": "Recurring dream",
    "phenomenon.albtraum": "Nightmare",

    "substance.beifuss": "Mugwort",
    "substance.melatonin": "Melatonin",
    "substance.alkohol": "Alcohol",
    "substance.weed": "Weed",

    "journal.searchPlaceholder": "Search dreams …",
    "journal.newDream": "+ New dream",
    "journal.filterToggle": "🔎 Filter",
    "journal.filterBigDreams": "⭐ Big dreams",
    "journal.filterTagPlaceholder": "Filter by tag/dreamsign/place/person …",
    "journal.filterReset": "Reset filters",
    "journal.formTitleNew": "New dream",
    "journal.formTitleEdit": "Edit dream",
    "journal.contentLabel": "What did you dream?",
    "journal.contentPlaceholder": "Write down everything you remember – fragments count too.",
    "journal.titleLabel": "Title",
    "journal.titlePlaceholder": "Short title",
    "journal.dateLabel": "Date",
    "journal.lucidityLabel": "Recall / Lucidity",
    "journal.lucidityOption.0": "0 – no memory",
    "journal.lucidityOption.1": "1 – fragment",
    "journal.lucidityOption.2": "2 – normal dream",
    "journal.lucidityOption.3": "3 – briefly lucid",
    "journal.lucidityOption.4": "4 – fully lucid",
    "journal.lucidityBadge.0": "no memory",
    "journal.lucidityBadge.1": "fragment",
    "journal.lucidityBadge.2": "dream",
    "journal.lucidityBadge.3": "briefly lucid",
    "journal.lucidityBadge.4": "fully lucid ✨",
    "journal.sleepLabel": "Sleep quality",
    "journal.sleep.1": "1 – very poor",
    "journal.sleep.5": "5 – very good",
    "journal.substancesLabel": "Substances before sleep",
    "journal.optionalHint": "(if applicable)",
    "journal.otherLabel": "Other",
    "journal.otherHint": "(e.g. another sleep aid, brief)",
    "journal.otherPlaceholder": "e.g. valerian, CBD oil",
    "journal.bigDreamLabel": "Big dream",
    "journal.bigDreamHint": "(numinous, stirring, stays with you — after C. G. Jung)",
    "journal.phenomenaLabel": "Phenomena",
    "journal.emotionsLabel": "Emotions",
    "journal.emotionsHint": "(what did you feel in the dream?)",
    "journal.signsLabel": "Dreamsigns",
    "journal.signsHint": "(recurring patterns, comma-separated)",
    "journal.signsPlaceholder": "e.g. flying, a deceased person, teeth",
    "journal.placesLabel": "📍 Places",
    "journal.commaHint": "(comma-separated)",
    "journal.placesPlaceholder": "e.g. old school, the sea",
    "journal.personsLabel": "👤 People",
    "journal.personsPlaceholder": "e.g. dad, girlfriend",
    "journal.tagsLabel": "Tags",
    "journal.tagsPlaceholder": "e.g. nightmare, work",
    "journal.notesLabel": "Your own analysis / notes",
    "journal.notesPlaceholder": "Interpretation, things you noticed … (optional)",

    "journal.emptyResults": "No dreams found.",
    "journal.firstDreamBtn": "Record your first dream",
    "journal.offlineHint": "📡 Server unreachable – new dreams are cached on this device and synced automatically once it's back.",
    "journal.pendingBadge": "⏳ waiting to sync",
    "journal.discard": "Discard",

    "journal.confirmDelete": "Really delete this dream?",
    "journal.confirmDiscardPending": "Discard this not-yet-synced dream?",

    "journal.echoesHeading": "🔁 <strong>Dream echoes</strong> — reminds you of:",

    "journal.intentionPrompt": '🎯 Your intention was: "{text}" — did it work out?',

    "journal.streakMissing": '🕯️ Yesterday ({date}) is still missing an entry. "No memory" counts too.',
    "journal.streakAdd": "Log a dream",
    "journal.streakNoMemory": "Don't remember",
    "journal.streakDismiss": "stop reminding me",
    "journal.noMemoryTitle": "No memory",

    "journal.toastUpdated": "Dream updated",
    "journal.toastSaved": "Dream saved 🌙",
    "journal.toastSavedOffline": "Saved offline – will sync once the server is reachable 📥",
    "journal.toastEditNeedsServer": "Editing requires a connection to the server",
    "journal.toastDeleted": "Dream deleted",
    "journal.toastStreakAdded": "Logged — that counts too 🕯️",
    "journal.toastPendingDiscarded": "Offline entry discarded",
    "journal.toastIntentionYes": "Congratulations! Intention fulfilled ✨",
    "journal.toastIntentionNo": "Next time will work out 💪",
    "journal.toastReflectionSaved": "Reflection saved 🪞",
    "journal.toastImaginationSaved": "Imagination saved 🔮",
    "journal.toastSyncSaved": "Synchronicity saved 🔗",
    "journal.toastStationSaved": "{station} saved",

    "journal.actionReflection": "🪞 Reflection",
    "journal.actionImagination": "🔮 Continue dreaming",
    "journal.actionSync": "🔗 Synchronicity",
    "journal.actionAnalysis": "🧭 Jung analysis",

    "journal.reflectionOne": "Reflection",
    "journal.reflectionMany": "Reflections",
    "journal.imaginationOne": "Active Imagination",
    "journal.imaginationMany": "Active Imaginations",
    "journal.syncOne": "Synchronicity",
    "journal.syncMany": "Synchronicities",
    "journal.dayLater": "day later",
    "journal.daysLater": "days later",
    "journal.analysisTitle": "🧭 Jung analysis: {title}",
    "journal.analysisHint": "Six perspectives on your dream. You can cancel any time — anything already saved stays.",
    "journal.analysisAllDone": "✅ All stations answered!",
    "journal.thoughtsPlaceholder": "Your thoughts ...",
    "journal.back": "Back",
    "journal.saveAndNext": "Save & next",
    "journal.skip": "Skip",
    "journal.jungAnalysisSummary": "🧭 Jung analysis ({done}/6)",

    "journal.syncFormTitle": "🔗 Did anything happen related to this?",
    "journal.syncFormHint": "A meaningful coincidence between the dream and waking life.",
    "journal.syncTextLabel": "What happened?",
    "journal.syncTextPlaceholder": "What happened in waking life ...",

    "lesezimmer.closeAria": "Close reading room",
    "lesezimmer.sourceNight": "🌙 On this night",
    "lesezimmer.sourceRandom": "🎲 Random",
    "lesezimmer.sourceBig": "⭐ Big dreams",
    "lesezimmer.sourceStale": "🕰️ Not read in a while",
    "lesezimmer.empty": "No matching dreams to revisit yet.",
    "lesezimmer.noContent": "(no text recorded)",
    "lesezimmer.echoesHeading": "Similar dreams:",
    "lesezimmer.prev": "← Back",
    "lesezimmer.reveal": "Details",
    "lesezimmer.next": "Next →",
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

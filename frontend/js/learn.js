const JUNG_GUIDES = [
  {
    id: "jung-psyche",
    title: "🗺️ Die Landkarte der Psyche",
    body: `<p>Jung stellte sich das Bewusstsein wie eine <strong>Insel</strong> vor: klein, hell, vertraut.
      Darunter liegt das <em>persönliche Unbewusste</em> — Vergessenes, Verdrängtes, nie Beachtetes.</p>
      <p>Und darunter, so seine kühnste These, das <em>kollektive Unbewusste</em>: Muster, die alle
      Menschen teilen, weil sie zur menschlichen Grundausstattung gehören — die <strong>Archetypen</strong>.</p>
      <p>Träume sind in diesem Bild <strong>Nachrichten von unterhalb der Wasserlinie</strong>.
      Dein Tagebuch ist der Briefkasten.</p>`,
  },
  {
    id: "jung-symbole",
    title: "🔣 Symbole sprechen anders",
    body: `<p>Ein <em>Zeichen</em> steht für etwas Bekanntes (🚻 heißt Toilette). Ein <em>Symbol</em>
      zeigt auf etwas, das sich (noch) nicht besser sagen lässt.</p>
      <p>Deshalb hielt Jung nichts von Traum-Wörterbüchern: <strong>Dein Meer ist nicht mein Meer.</strong></p>
      <p>Seine Methode der <strong>Amplifikation</strong>: das Symbol anreichern mit allem, was <em>dir</em>
      dazu einfällt — Erinnerungen, Redewendungen, Gefühle. Genau das tut dein Symbol-Lexikon im Atlas.</p>`,
  },
  {
    id: "jung-kompensation",
    title: "⚖️ Kompensation: Träume als Gegengewicht",
    body: `<p>Jungs praktischste Idee: Träume gleichen die <strong>Einseitigkeit des Tages</strong> aus.
      Wer sich nur stark zeigt, träumt Schwäche; wer allen gefällt, träumt Konflikt.</p>
      <p>Die fruchtbarste Frage an einen Traum ist darum nicht "Was bedeutet das?", sondern:</p>
      <p><strong>"Was ergänzt dieser Traum in meinem Leben gerade?"</strong></p>`,
  },
  {
    id: "jung-persona",
    title: "🎭 Die Persona: deine Maske",
    body: `<p>Die Persona ist das Gesicht, das du der Welt zeigst — Beruf, Rolle, Höflichkeit.
      Sie ist gesund und nötig. Eng wird es, wenn man sie <strong>nicht mehr absetzen kann</strong>.</p>
      <p>In Träumen zeigt sich Persona-Spannung oft als: falsche Kleidung, Bühnen, Prüfungen, nackt sein.</p>`,
  },
  {
    id: "jung-schatten",
    title: "🌑 Der Schatten: was du nicht sein willst",
    body: `<p>Alles, was nicht zu deinem Selbstbild passt, verschwindet nicht — es sammelt sich im <strong>Schatten</strong>.</p>
      <p>In Träumen begegnet er dir als Figuren, die dich abstoßen, ängstigen oder wütend machen.</p>
      <p>Jungs unbequeme Pointe: <em>Was dich an anderen am meisten stört, kennt dich.</em></p>
      <p>Schattenarbeit heißt nicht, das Dunkle auszuleben, sondern es zu <strong>kennen</strong> —
      dort liegt eingesperrte Lebensenergie.</p>`,
  },
  {
    id: "jung-anima",
    title: "🌗 Anima & Animus: die innere Gegenstimme",
    body: `<p>Jung meinte: In jedem lebt eine gegengeschlechtliche Innenfigur als Brücke zum Unbewussten.</p>
      <p>Heute liest man das weiter: die Stimme in dir, die <strong>anders ist als dein Alltags-Ich</strong> —
      das Unvertraute, Faszinierende, manchmal Irritierende.</p>
      <p>Traumfiguren, die dich rätselhaft anziehen oder führen, sind Kandidaten für diese Linse.</p>`,
  },
  {
    id: "jung-selbst",
    title: "⭕ Das Selbst & die Individuation",
    body: `<p>Ziel der Psyche ist für Jung nicht Perfektion, sondern <strong>Ganzheit</strong>:
      die Teile — Persona, Schatten, Innenfiguren — kennen und zusammenführen.</p>
      <p>Diesen lebenslangen Prozess nannte er <em>Individuation</em>: werden, wer man ist.</p>
      <p>Sein Symbol dafür: das <strong>Mandala</strong>, der Kreis mit Mitte. Jung malte selbst
      fast täglich eines, als Momentaufnahme seiner Innenwelt.</p>`,
  },
  {
    id: "jung-grosse-traeume",
    title: "⭐ Große Träume & Synchronizität",
    body: `<p>Manche Träume sind anders: bildstark, aufwühlend, unvergesslich. Jung nannte sie
      <em>große Träume</em> — Marksteine der Individuation (dafür ist dein ⭐).</p>
      <p>Und manchmal scheint die Außenwelt zu antworten: Du träumst vom Zug, am nächsten Tag …
      Jung nannte bedeutsame Koinzidenzen <em>Synchronizität</em>.</p>
      <p>Ob da "etwas dran" ist, ist offen — als Aufmerksamkeitsübung ist das Notieren trotzdem wertvoll.</p>`,
  },
  {
    id: "jung-einordnung",
    title: "🔍 Ehrliche Einordnung",
    body: `<p>Jung ist einer der einflussreichsten Psychologen des 20. Jahrhunderts — und vieles an
      seiner Lehre ist <strong>empirisch schwer prüfbar oder umstritten</strong> (kollektives Unbewusstes,
      Synchronizität; die historische Anima/Animus-Fassung gilt als zeitgebunden).</p>
      <p>Diese App benutzt Jung als das, was zuverlässig funktioniert: einen reichen
      <strong>Frage- und Reflexionsrahmen</strong>.</p>
      <p>Die Autorität über die Bedeutung deiner Träume hast <strong>du</strong>.</p>`,
  },
];

// Archetypen-Lexikon (H.3): nachlesen und aufs Eigene beziehen
const ARCHETYPE_LEXICON = [
  {
    key: "schatten", icon: "🌑", title: "Der Schatten",
    kern: "Alles, was du nicht sein willst, verschwindet nicht — es wird zu deinem Schatten. Er ist kein „Böses“, sondern ungelebtes Leben: verdrängte Wut, verbotene Wünsche, ungenutzte Stärke.",
    im_traum: "Verfolger, Einbrecher, abstoßende oder beschämende Figuren; oft gleichgeschlechtlich.",
    frage: "Was an dieser Figur kenne ich — und will es nicht wahrhaben?",
  },
  {
    key: "anima_animus", icon: "🌗", title: "Anima / Animus",
    kern: "Jungs Name für die innere Gegenstimme — das Unvertraute in dir, klassisch gegengeschlechtlich gedacht, heute weiter gelesen. Sie ist Brücke zum Unbewussten: was dich rätselhaft anzieht, will dir etwas zeigen.",
    im_traum: "faszinierende Unbekannte, Führerinnen/Führer, unerreichbare Geliebte.",
    frage: "Welche Seite von mir spricht hier, die im Alltag keinen Platz hat?",
  },
  {
    key: "weiser", icon: "🧙", title: "Der/die Weise",
    kern: "Die Stimme des gesammelten Wissens — der innere Mentor, der auftaucht, wenn du weiter bist, als du glaubst.",
    im_traum: "alte Frau/alter Mann, Lehrer, sprechende Tiere mit Rat, Stimmen, die einfach wissen.",
    frage: "Welchen Rat habe ich gehört — und traue ich ihm?",
  },
  {
    key: "kind", icon: "🧒", title: "Das Kind",
    kern: "Anfang und Möglichkeit: das Verspielte, Verletzliche, Neue. Oft kündigt es Entwicklung an — etwas in dir ist gerade jung.",
    im_traum: "Babys, Kinder (auch du als Kind), Neugeborenes, das beschützt werden muss.",
    frage: "Was in meinem Leben ist gerade klein und braucht Schutz — oder will endlich wachsen?",
  },
  {
    key: "trickster", icon: "🃏", title: "Der Trickster",
    kern: "Der Regelbrecher: stört Pläne, blamiert, dreht Situationen ins Absurde. Er ist lästig — und heilsam, weil er festgefahrene Ordnung aufbricht.",
    im_traum: "Clowns, Diebe, Gestaltwandler, Figuren, die dich narren; auch absurde Pannen.",
    frage: "Welche Ordnung in meinem Leben nimmt sich zu ernst?",
  },
  {
    key: "held", icon: "⚔️", title: "Held/in",
    kern: "Der Teil, der sich stellt: aufbricht, kämpft, über sich hinauswächst. Sein Schatten: Größenwahn und das Nicht-um-Hilfe-bitten-Können.",
    im_traum: "Prüfungen, Kämpfe, Rettungen, gefährliche Reisen.",
    frage: "Wofür lohnt sich gerade mein Mut — und wo spiele ich nur den Starken?",
  },
  {
    key: "grosse_mutter", icon: "🌳", title: "Große Mutter",
    kern: "Das Nährende und Haltende — und seine Kehrseite: das Umklammernde, Verschlingende. Beides gehört zu dieser Urfigur.",
    im_traum: "mütterliche Gestalten, Häuser der Kindheit, Höhlen, Meer und Erde; auch Hexen.",
    frage: "Wo werde ich gehalten — und wo festgehalten?",
  },
  {
    key: "persona", icon: "🎭", title: "Persona",
    kern: "Deine Maske für die Welt: Rolle, Beruf, Höflichkeit. Gesund, solange du sie absetzen kannst; eng, wenn du sie für dein Gesicht hältst.",
    im_traum: "falsche/fehlende Kleidung, Bühnen, Prüfungen, nackt unter Menschen.",
    frage: "Wen spiele ich gerade — und für wen?",
  },
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
  title: "🧵 Der Traumfaden — so ist Klartraum gedacht",
  shortTitle: "🧵 Der Traumfaden",
  buttonLabel: "Der Faden",
  tooltip: "Nimm den Faden auf",
  body: `
    <p><strong>1. Festhalten</strong> <small>(direkt nach dem Aufwachen · 1 Minute)</small><br>
    Schreib auf, was da ist — egal wo: Zettel, Handy-Notiz, Sprachnachricht an dich selbst. Ein paar Wörter reichen.
    Nur eines ist Pflicht: <strong>das Datum</strong>. Fällt dir tagsüber mehr ein, häng es einfach an.</p>
    <p><strong>2. Einpflegen</strong> <small>(wenn Zeit ist · 5 Minuten)</small><br>
    Bring den Text in die App — unverändert und unperfekt. Wenn es leicht von der Hand geht, vergib schon ein paar
    Merkmale: Traumzeichen, Orte, Personen, Gefühle. Wenn nicht: auch gut. <strong>Alles lässt sich später ergänzen.</strong></p>
    <p><strong>3. Anreichern</strong> <small>(irgendwann · nebenbei)</small><br>
    Bei Lust und Laune: Beschreibungen vervollständigen, Elemente nachtragen, Traumzeichen einsortieren, Orte auf die
    Karte legen. Jeder Handgriff füttert deine Traumlandschaft.</p>
    <p><strong>4. Verwerten</strong> <small>(wenn Neugier kommt)</small><br>
    Schau in die Analyse, den Atlas, die Innenwelt. Geh die Individuationsreise, stell einer Traumfigur eine Frage,
    folge einer Traumserie. Hier zahlt sich das Füttern aus.</p>
    <p><strong>Warum das funktioniert:</strong> Klartraum ist eine <strong>persönliche Traumlandschaft, die sich mit
    jedem Eintrag weiter ausbreitet</strong> — und dich dir selbst zeigt: wie du dich in diesen absurden Momenten
    verhältst, was wiederkehrt, was sich verändert. Du beobachtest dich in Situationen, die kein Wachleben dir bietet
    — und lernst dich genau dort kennen.<br>
    <strong>Füttere sie beiläufig. Ernte, wann du willst.</strong></p>`,
  short: `
    <p><strong>1. Festhalten</strong> — direkt nach dem Aufwachen, egal wo, nur das Datum ist Pflicht.</p>
    <p><strong>2. Einpflegen</strong> — wenn Zeit ist, unverändert und unperfekt. Alles lässt sich später ergänzen.</p>
    <p><strong>3. Anreichern</strong> — irgendwann, nebenbei, bei Lust und Laune.</p>
    <p><strong>4. Verwerten</strong> — wenn Neugier kommt: Analyse, Atlas, Innenwelt.</p>
    <p>Füttere sie beiläufig. Ernte, wann du willst. 🌙</p>`,
};

// Lernbereich: Guides + Reality-Check-Erinnerung
const learn = {
  timer: null,

  guides: [
    {
      title: "🔍 Reality Checks – die Grundlage",
      body: `<p>Ein Reality Check ist ein kurzer Test, ob du wach bist oder träumst. Machst du ihn
        tagsüber zur Gewohnheit, machst du ihn irgendwann auch <strong>im Traum</strong> – und wirst luzide.</p>
        <ul>
          <li><strong>Hände ansehen:</strong> Im Traum haben Hände oft zu viele oder verformte Finger.</li>
          <li><strong>Nase zuhalten:</strong> Halte dir die Nase zu und versuche zu atmen. Geht es trotzdem? Dann träumst du.</li>
          <li><strong>Text zweimal lesen:</strong> Text verändert sich im Traum beim zweiten Hinsehen.</li>
        </ul>
        <p>Wichtig: Frag dich dabei ernsthaft "Träume ich gerade?" – nicht mechanisch abhaken.
        Am wirksamsten sind Checks bei deinen persönlichen <strong>Traumzeichen</strong> (siehe Analyse-Tab).</p>`,
    },
    {
      title: "🛌 MILD – Mnemonic Induction of Lucid Dreams",
      body: `<p>Eine der am besten belegten Techniken (LaBerge). Direkt vor dem Einschlafen:</p>
        <ol>
          <li>Rufe dir einen kürzlichen Traum ins Gedächtnis.</li>
          <li>Suche darin ein Traumzeichen und stelle dir vor, wie du daran erkennst: "Das ist ein Traum!"</li>
          <li>Wiederhole dabei innerlich: <em>"Wenn ich das nächste Mal träume, erkenne ich, dass ich träume."</em></li>
        </ol>
        <p>Die Absicht muss das Letzte sein, woran du vor dem Einschlafen denkst. Am stärksten in Kombination mit WBTB.</p>`,
    },
    {
      title: "⏰ WBTB – Wake Back To Bed",
      body: `<p>Nutzt aus, dass REM-Phasen (Traumphasen) gegen Morgen länger werden:</p>
        <ol>
          <li>Stelle den Wecker auf ca. 5–6 Stunden nach dem Einschlafen.</li>
          <li>Bleib 15–30 Minuten wach – ruhig, gedimmtes Licht. Lies z. B. deine Traumeinträge.</li>
          <li>Geh mit MILD-Absicht wieder schlafen.</li>
        </ol>
        <p>Die Wahrscheinlichkeit, direkt in einen REM-Traum zu fallen und luzide zu werden, ist so am höchsten.
        Tipp: nur an Tagen ohne Verpflichtungen, sonst leidet der Schlaf.</p>`,
    },
    {
      title: "📓 Traumtagebuch richtig führen",
      body: `<p>Der wichtigste Einzelfaktor: Wer sich an Träume erinnert, kann in ihnen luzide werden.</p>
        <ul>
          <li><strong>Sofort nach dem Aufwachen</strong> aufschreiben – nicht erst nach dem Aufstehen. Auch Fragmente!</li>
          <li>Vor dem Aufstehen still liegen bleiben und den Traum rückwärts rekonstruieren.</li>
          <li>Markiere <strong>Traumzeichen</strong>: Personen, Orte oder Absurditäten, die immer wiederkehren.</li>
          <li>Lies regelmäßig alte Einträge – so lernt dein Gehirn, Traummuster zu erkennen.</li>
        </ul>
        <p>Genau dafür ist der Tagebuch-Tab da: Traumzeichen taggen und im Analyse-Tab die Muster finden.</p>`,
    },
    {
      title: "✨ Im Klartraum: stabilisieren",
      body: `<p>Luzide geworden? Die ersten Sekunden entscheiden, ob der Traum hält:</p>
        <ul>
          <li><strong>Ruhig bleiben</strong> – starke Aufregung führt zum Aufwachen.</li>
          <li><strong>Hände reiben</strong> oder etwas berühren – Sinneseindrücke stabilisieren den Traum.</li>
          <li>Laut sagen: "Mehr Klarheit!" – klingt seltsam, funktioniert erstaunlich oft.</li>
          <li>Wird das Bild dunkel: im Traum um die eigene Achse drehen.</li>
        </ul>`,
    },
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
          <h2>🌗 Die Innenwelt verstehen <small><em>nach C. G. Jung</em></small></h2>
          <p class="hint">Kompakte Wissenskapitel zu Jungs Traumpsychologie — als Reflexionsrahmen, nicht als Wahrheit.</p>
          ${JUNG_GUIDES.map((g) => `<details class="guide" id="${g.id}">
            <summary>${g.title}</summary>
            <div class="guide-body">${g.body}</div>
          </details>`).join("")}
        </div>
        <div class="card jung-kompendium" id="archetypen-lexikon">
          <h2>🌗 Die acht Rollen <small><em>Archetypen-Lexikon</em></small></h2>
          <p class="hint">Wer „Trickster“ noch nie gehört hat, kann es hier in 60 Sekunden verstehen.</p>
          ${ARCHETYPE_LEXICON.map((a) => `<details class="guide" id="arch-${a.key}">
            <summary>${a.icon} ${a.title}</summary>
            <div class="guide-body">
              <p>${a.kern}</p>
              <p><strong>Im Traum:</strong> ${a.im_traum}</p>
              <p><strong>Frage an dich:</strong> <em>${a.frage}</em></p>
              <p class="hint">Reflexions-Linse nach C. G. Jung, keine Diagnose. Die Figur deines Traums ist immer mehr als die Rolle.</p>
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
      <p>⏰ <strong>Wecker auf ${at(6 * 60)} Uhr</strong> stellen (nach 4 Schlafzyklen à 90 Minuten).</p>
      <p>Alternativen: ${at(4.5 * 60)} Uhr (3 Zyklen, kürzere Nacht) oder ${at(7.5 * 60)} Uhr (5 Zyklen, sanfter).</p>
      <p>Dann 15–30 Minuten ruhig wach bleiben – am besten alte Traumeinträge lesen – und
      mit MILD-Absicht wieder einschlafen. 🌙</p>
    </div>`;
  },

  async applyReminder(minutes, userTriggered) {
    localStorage.setItem("rc-interval", minutes);
    clearInterval(this.timer);
    const status = document.getElementById("reminder-status");
    minutes = Number(minutes);

    if (!minutes) {
      status.textContent = "Erinnerung ist aus.";
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
      const message = "Reality Check! Träumst du gerade? 🔍";
      if (useNotification && document.hidden) {
        new Notification("Klartraum", { body: message, icon: "/icons/icon-192.png" });
      } else {
        showToast(message);
      }
    }, minutes * 60 * 1000);

    status.textContent = useNotification
      ? `Aktiv – alle ${minutes} Minuten (auch als Benachrichtigung, solange die App offen ist).`
      : `Aktiv – alle ${minutes} Minuten als Hinweis in der App.`;
  },

  async loadGoals() {
    const list = document.getElementById("goal-list");
    try {
      const goals = await api.listGoals();
      this._goals = goals;
      if (!goals.length) {
        list.innerHTML = '<p class="hint">Noch keine Ziele. Was willst du im Klartraum erleben?</p>';
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
      list.innerHTML = '<p class="hint">Ziele konnten nicht geladen werden.</p>';
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
      showToast(done ? "Geschafft! ✨" : "Wieder offen");
    } catch (err) {
      showToast(err.message);
    }
  },

  async removeGoal(id) {
    if (!confirm("Dieses Ziel wirklich löschen?")) return;
    try {
      await api.deleteGoal(id);
      this.loadGoals();
    } catch (err) {
      showToast(err.message);
    }
  },

  JOURNEY_STATIONS: [
    {
      key: "landkarte",
      title: "Ankommen",
      icon: "🗺️",
      desc: "Kompendium-Kapitel 1+2 lesen. Einem beliebigen Symbol im Lexikon die erste Assoziation schenken.",
      kompendium: "jung-psyche",
    },
    {
      key: "persona",
      title: "Deine Maske",
      icon: "🎭",
      desc: "Kapitel 4 lesen. Reflexion an einem Traum: \"Wo hast du in diesem Traum eine Rolle gespielt — und für wen?\"",
      kompendium: "jung-persona",
    },
    {
      key: "schatten",
      title: "Dem Schatten begegnen",
      icon: "🌑",
      desc: "Kapitel 5 lesen. Einer Traumfigur die Schatten-Linse geben UND 2 Assoziationen notieren.",
      kompendium: "jung-schatten",
    },
    {
      key: "anima",
      title: "Die Gegenstimme",
      icon: "🌗",
      desc: "Kapitel 6 lesen. Eine Aktive Imagination mit einer rätselhaften Figur führen.",
      kompendium: "jung-anima",
    },
    {
      key: "symbole",
      title: "Die Sprache der Tiefe",
      icon: "⚖️",
      desc: "Kapitel 3+8 lesen. Einen grossen Traum markieren und die Kompensationsfrage beantworten.",
      kompendium: "jung-kompensation",
    },
    {
      key: "selbst",
      title: "Ganz werden",
      icon: "⭕",
      desc: "Kapitel 7+9 lesen. Dein Traum-Mandala über den größten Zeitraum ansehen und eine Abschluss-Notiz schreiben.",
      kompendium: "jung-selbst",
    },
  ],

  async loadJourney() {
    const pathEl = document.getElementById("journey-path");
    const contentEl = document.getElementById("journey-content");
    if (!pathEl || !contentEl) return;

    let steps;
    try {
      steps = await api.getJourney();
    } catch {
      pathEl.innerHTML = '<p class="hint">Reise konnte nicht geladen werden.</p>';
      return;
    }

    const stepMap = {};
    steps.forEach((s) => stepMap[s.station] = s);

    const completedCount = steps.filter((s) => s.completed).length;
    const nextIdx = this.JOURNEY_STATIONS.findIndex((s) => !stepMap[s.key]?.completed);

    pathEl.innerHTML = `<div class="journey-progress">
      ${this.JOURNEY_STATIONS.map((s, i) => {
        const done = !!stepMap[s.key]?.completed;
        const isNext = i === nextIdx;
        return `<div class="journey-dot ${done ? "done" : ""} ${isNext ? "next" : ""}" data-idx="${i}" title="${s.title}">
          <span class="journey-dot-icon">${done ? "&#x2714;" : s.icon}</span>
          <span class="journey-dot-label">${s.title}</span>
        </div>${i < this.JOURNEY_STATIONS.length - 1 ? '<div class="journey-line ' + (done ? "done" : "") + '"></div>' : ""}`;
      }).join("")}
    </div>`;

    if (completedCount === this.JOURNEY_STATIONS.length) {
      contentEl.innerHTML = `<div class="mission-card" style="margin-top:0.75rem">
        <p>Die Reise beginnt jetzt von vorn — Individuation ist kein Ziel, sondern eine Richtung. ⭕</p>
      </div>`;
      return;
    }

    const showStation = (idx) => {
      const s = this.JOURNEY_STATIONS[idx];
      const step = stepMap[s.key];
      const done = !!step?.completed;
      contentEl.innerHTML = `<div class="journey-station" style="margin-top:0.75rem">
        <h3>${s.icon} Station ${idx + 1}: ${s.title}</h3>
        <p>${s.desc}</p>
        <p><a href="#" class="journey-kompendium-link" data-link="${s.kompendium}">Zum Kompendium-Kapitel &rarr;</a></p>
        ${done
          ? `<p class="hint">&#x2714; Abgeschlossen${step.note ? ": " + escapeHtml(step.note) : ""}</p>`
          : `<div class="journey-complete-form">
              <textarea id="journey-note" rows="2" placeholder="Was habe ich bemerkt? (optional)"></textarea>
              <button class="primary journey-complete-btn" data-station="${s.key}">Station abschließen</button>
            </div>`}
      </div>`;

      contentEl.querySelector(".journey-kompendium-link")?.addEventListener("click", (e) => {
        e.preventDefault();
        document.getElementById(s.kompendium)?.scrollIntoView({ behavior: "smooth" });
        const details = document.getElementById(s.kompendium);
        if (details) details.open = true;
      });

      contentEl.querySelector(".journey-complete-btn")?.addEventListener("click", async () => {
        const note = document.getElementById("journey-note")?.value.trim() || null;
        try {
          await api.completeJourneyStation(s.key, note);
          showToast("Station abgeschlossen ✨");
          this.loadJourney();
        } catch (err) { showToast(err.message); }
      });
    };

    pathEl.querySelectorAll(".journey-dot").forEach((dot) => {
      dot.addEventListener("click", () => showStation(Number(dot.dataset.idx)));
    });

    showStation(nextIdx >= 0 ? nextIdx : 0);
  },

  async loadDataInfo() {
    const container = document.getElementById("guides");
    if (!container) return;
    try {
      const info = await api.dataInfo();
      const sizeMB = (info.db_size_bytes / 1024 / 1024).toFixed(1);
      const card = document.createElement("div");
      card.className = "card";
      card.innerHTML = `
        <h2>🔐 Deine Daten</h2>
        <p>Deine <strong>${info.dream_count} Träume</strong>: ${sizeMB} MB in
          <code>${info.db_file.replace(/^.*[/\\]/, "~/Klartraum/")}</code></p>
        <div class="data-info-text">
          <p><strong>Deine Träume gehören dir — wörtlich.</strong> Alles, was du hier einträgst,
          liegt ausschließlich in einer Datei auf DIESEM Gerät
          (<code>~/Klartraum/dreams.db</code>). Keine Cloud, kein Konto, niemand liest mit.</p>
          <p>Die Kehrseite dieser Freiheit: <strong>Geht das Gerät verloren oder kaputt, sind
          die Träume weg — es sei denn, du hast ein Backup.</strong> Ein Backup ist eine
          Kopie dieser einen Datei oder ein Export (Analyse → Datenexport). Mach das
          regelmäßig — dein zukünftiges Ich dankt dir.</p>
        </div>
        <div style="display:flex;gap:0.5rem;flex-wrap:wrap;margin-top:0.75rem">
          <button class="primary" id="data-export-btn">📤 Backup jetzt (JSON)</button>
          <button id="data-path-copy-btn">Ordner-Pfad kopieren</button>
        </div>`;
      container.appendChild(card);

      document.getElementById("data-export-btn").addEventListener("click", () => {
        window.open("/api/export?format=json", "_blank");
      });
      document.getElementById("data-path-copy-btn").addEventListener("click", () => {
        navigator.clipboard.writeText(info.data_dir).then(() => showToast("Pfad kopiert!"));
      });
    } catch { /* Server unterstützt Endpunkt noch nicht */ }
  },

  showFirstRunHint() {
    if (localStorage.getItem("hint-daten")) return;
    const overlay = document.createElement("div");
    overlay.className = "modal-overlay";
    overlay.innerHTML = `
      <div class="modal">
        <h2>🔐 Wo liegen deine Daten?</h2>
        <p><strong>Deine Träume gehören dir — wörtlich.</strong> Alles, was du hier einträgst,
        liegt ausschließlich in einer Datei auf DIESEM Gerät
        (<code>~/Klartraum/dreams.db</code>). Keine Cloud, kein Konto, niemand liest mit.</p>
        <p>Die Kehrseite dieser Freiheit: <strong>Geht das Gerät verloren oder kaputt, sind
        die Träume weg — es sei denn, du hast ein Backup.</strong></p>
        <p>Du findest Backup-Optionen jederzeit unten im Lernen-Tab.</p>
        <button class="primary" id="hint-daten-ok" style="margin-top:0.75rem">Verstanden 🌙</button>
      </div>`;
    document.body.appendChild(overlay);
    document.getElementById("hint-daten-ok").addEventListener("click", () => {
      localStorage.setItem("hint-daten", "1");
      overlay.remove();
    });
  },
};

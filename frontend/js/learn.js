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
        <p>Wichtig: Frag dich dabei ernsthaft „Träume ich gerade?“ – nicht mechanisch abhaken.
        Am wirksamsten sind Checks bei deinen persönlichen <strong>Traumzeichen</strong> (siehe Analyse-Tab).</p>`,
    },
    {
      title: "🛌 MILD – Mnemonic Induction of Lucid Dreams",
      body: `<p>Eine der am besten belegten Techniken (LaBerge). Direkt vor dem Einschlafen:</p>
        <ol>
          <li>Rufe dir einen kürzlichen Traum ins Gedächtnis.</li>
          <li>Suche darin ein Traumzeichen und stelle dir vor, wie du daran erkennst: „Das ist ein Traum!“</li>
          <li>Wiederhole dabei innerlich: <em>„Wenn ich das nächste Mal träume, erkenne ich, dass ich träume.“</em></li>
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
          <li>Laut sagen: „Mehr Klarheit!“ – klingt seltsam, funktioniert erstaunlich oft.</li>
          <li>Wird das Bild dunkel: im Traum um die eigene Achse drehen.</li>
        </ul>`,
    },
  ],

  init() {
    document.getElementById("guides").innerHTML = this.guides
      .map(
        (g) => `<details class="guide">
          <summary>${g.title}</summary>
          <div class="guide-body">${g.body}</div>
        </details>`
      )
      .join("");

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
};

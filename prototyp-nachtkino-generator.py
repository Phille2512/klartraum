#!/usr/bin/env python3
"""Generiert frontend/nachtkino.html aus dem Mi-Fitness-Export (eine Nacht)."""
import csv, json, datetime as dt
from pathlib import Path
from string import Template

ROOT = Path("/Users/phille/Desktop/Application Klarträumen")
EXPORT = ROOT / "20260719_8304574355_MiFitness_ams1_data_copy"
OUT = ROOT / "frontend" / "nachtkino.html"
TZ = dt.timezone(dt.timedelta(hours=2))

def local(ts):
    return dt.datetime.fromtimestamp(ts, TZ)

def hhmm(ts):
    return local(ts).strftime("%H:%M")

def dur(mins):
    h, m = divmod(int(mins), 60)
    return f"{h} h {m:02d}" if h else f"{m} min"

rows = list(csv.DictReader(open(EXPORT / "20260719_8304574355_MiFitness_hlth_center_fitness_data.csv")))
sleep = json.loads([r for r in rows if r["Key"] == "sleep"][0]["Value"])
agg = None
for r in csv.DictReader(open(EXPORT / "20260719_8304574355_MiFitness_hlth_center_aggregated_fitness_data.csv")):
    if r["Key"] == "sleep":
        agg = json.loads(r["Value"])
score = agg.get("sleep_score") if agg else None

bed, wake = sleep["bedtime"], sleep["wake_up_time"]
segs = [{"s": it["start_time"], "e": it["end_time"], "st": it["state"]} for it in sleep["items"]]
segs.sort(key=lambda x: x["s"])

hr = []
for r in rows:
    if r["Key"] in ("heart_rate", "single_heart_rate"):
        t = int(r["Time"])
        if bed - 300 <= t <= wake + 300:
            v = json.loads(r["Value"])
            bpm = v.get("bpm")
            if bpm:
                hr.append((t, bpm))
hr.sort()
# ausduennen auf ~160 Punkte
step = max(1, len(hr) // 160)
hr_thin = hr[::step]

rem = [s for s in segs if s["st"] == 4]
wakes = [s for s in segs if s["st"] == 5]
longest_rem = max(rem, key=lambda s: s["e"] - s["s"])
rem_total = sleep["sleep_rem_duration"]
asleep = sleep["duration"]
rem_share = round(rem_total / asleep * 100)
mid = bed + (wake - bed) // 2
rem_late = sum(s["e"] - s["s"] for s in rem if s["s"] >= mid) // 60
rem_early = rem_total - rem_late
first_deep = next(s for s in segs if s["st"] == 2)
min_hr_t, min_hr_v = min(hr, key=lambda x: x[1]) if hr else (None, sleep["min_hr"])
last_wake = max(wakes, key=lambda s: s["s"]) if wakes else None
rem_after_lastwake = 0
if last_wake:
    rem_after_lastwake = sum(s["e"] - s["s"] for s in rem if s["s"] >= last_wake["e"]) // 60
# WBTB-Fenster: ca. 2h vor dem groessten Morgen-REM-Block
wbtb_ts = longest_rem["s"] - 20 * 60

data = {
    "bed": bed, "wake": wake,
    "segs": segs,
    "hr": [[t, v] for t, v in hr_thin],
    "longestRem": {"s": longest_rem["s"], "e": longest_rem["e"]},
}

V = {
    "DATA": json.dumps(data),
    "DATUM": "18./19. Juli 2026",
    "BETT": hhmm(bed), "WACH": hhmm(wake),
    "IM_BETT": dur((wake - bed) / 60), "GESCHLAFEN": dur(asleep),
    "TIEF": dur(sleep["sleep_deep_duration"]), "REM": dur(rem_total),
    "WACHZEIT": dur(sleep["sleep_awake_duration"]), "WACH_N": str(sleep["awake_count"]),
    "SCORE": str(score) if score else "–",
    "EFF": str(sleep.get("sleep_efficiency", "–")),
    "AVG_HR": str(sleep["avg_hr"]), "MIN_HR": str(sleep["min_hr"]), "MAX_HR": str(sleep["max_hr"]),
    "MIN_HR_T": hhmm(min_hr_t) if min_hr_t else "–",
    "REM_SHARE": str(rem_share),
    "REM_N": str(len(rem)),
    "REM_LATE": dur(rem_late), "REM_EARLY": dur(rem_early),
    "LREM_VON": hhmm(longest_rem["s"]), "LREM_BIS": hhmm(longest_rem["e"]),
    "LREM_DAUER": dur((longest_rem["e"] - longest_rem["s"]) / 60),
    "DEEP1_VON": hhmm(first_deep["s"]), "DEEP1_DAUER": dur((first_deep["e"] - first_deep["s"]) / 60),
    "EINSCHLAF_MIN": str((first_deep["s"] - bed) // 60),
    "LASTWAKE": hhmm(last_wake["s"]) if last_wake else "–",
    "REM_NACH_WAKE": dur(rem_after_lastwake),
    "WBTB": hhmm(wbtb_ts),
}

TPL = Template(r"""<!DOCTYPE html>
<html lang="de">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>🎬 Nachtkino — Prototyp</title>
<style>
:root { --bg:#0f0d1a; --card:#1a1730; --card2:#221e3d; --text:#e8e5f5; --muted:#9a94b8;
  --accent:#8b7ff5; --gold:#f5c66a; --deep:#4a5fd0; --light:#6f66a8; --wake:#e0704f; --hr:#d4537e; }
* { box-sizing:border-box; margin:0; }
body { background:var(--bg); color:var(--text); font-family:-apple-system,'Segoe UI',Roboto,sans-serif;
  line-height:1.6; padding:1rem; }
main { max-width:780px; margin:0 auto; }
h1 { font-size:1.5rem; margin:.3rem 0 .2rem; }
h2 { font-size:1.1rem; margin:0 0 .6rem; }
.sub { color:var(--muted); font-size:.85rem; }
.badge { display:inline-block; background:var(--card2); color:var(--gold); font-size:.7rem;
  padding:.15rem .6rem; border-radius:999px; letter-spacing:.05em; margin-bottom:.4rem; }
.card { background:var(--card); border-radius:14px; padding:1rem 1.1rem; margin:1rem 0; }
.tiles { display:grid; grid-template-columns:repeat(auto-fit,minmax(105px,1fr)); gap:8px; margin:1rem 0; }
.tile { background:var(--card); border-radius:12px; padding:.6rem .7rem; }
.tile b { display:block; font-size:1.15rem; font-weight:600; }
.tile span { font-size:.72rem; color:var(--muted); }
.tile.gold b { color:var(--gold); }
svg { width:100%; height:auto; display:block; }
.controls { display:flex; gap:8px; flex-wrap:wrap; margin:.6rem 0; }
button { background:var(--card2); color:var(--text); border:1px solid #38325c; border-radius:999px;
  padding:.4rem .9rem; font-size:.85rem; cursor:pointer; }
button.active { background:var(--accent); border-color:var(--accent); color:#0f0d1a; font-weight:600; }
#tooltip { position:fixed; background:#2a2550; border:1px solid var(--accent); border-radius:10px;
  padding:.5rem .7rem; font-size:.8rem; pointer-events:none; opacity:0; transition:opacity .15s;
  max-width:240px; z-index:9; }
#tooltip b { color:var(--gold); }
.tour-text { min-height:5.5rem; background:var(--card2); border-radius:10px; padding:.7rem .9rem;
  font-size:.9rem; margin-top:.6rem; }
.tour-nav { display:flex; align-items:center; gap:10px; margin-top:.5rem; }
.tour-nav span { color:var(--muted); font-size:.8rem; }
.remwin { display:flex; align-items:center; gap:10px; padding:.45rem .6rem; border-radius:10px; margin:.3rem 0; }
.remwin.top { background:rgba(245,198,106,.12); border:1px solid rgba(245,198,106,.4); }
.remwin .bar { height:8px; background:var(--gold); border-radius:4px; opacity:.85; }
.remwin small { color:var(--muted); }
.bridge { border-left:3px solid var(--gold); padding-left:.9rem; margin:.8rem 0; }
.bridge h3 { font-size:.95rem; color:var(--gold); margin-bottom:.2rem; }
.bridge p { font-size:.88rem; }
.foot { color:var(--muted); font-size:.78rem; margin:1.2rem 0 2rem; }
.legend { display:flex; gap:14px; flex-wrap:wrap; font-size:.75rem; color:var(--muted); margin-top:.4rem; }
.legend i { display:inline-block; width:10px; height:10px; border-radius:3px; margin-right:4px; }
</style>
</head>
<body>
<main>
<span class="badge">PROTOTYP · LOKAL · SCHÄTZUNG DES TRACKERS</span>
<h1>🎬 Nachtkino</h1>
<p class="sub">Deine Nacht vom $DATUM — gemessen vom Smart Band, erzählt von deiner Traum-App.</p>

<div class="tiles">
  <div class="tile"><b>$GESCHLAFEN</b><span>geschlafen ($BETT–$WACH)</span></div>
  <div class="tile"><b>$TIEF</b><span>💤 Tiefschlaf</span></div>
  <div class="tile gold"><b>$REM</b><span>✨ Traumzeit (REM)</span></div>
  <div class="tile"><b>$WACHZEIT</b><span>wach ($WACH_N×, normal!)</span></div>
  <div class="tile"><b>$SCORE</b><span>Tracker-Score</span></div>
  <div class="tile"><b>$MIN_HR</b><span>❤️ tiefster Puls ($MIN_HR_T)</span></div>
</div>

<div class="card">
  <h2>Der Film der Nacht</h2>
  <p class="sub">Tippe auf die Blöcke — jede Phase erklärt sich selbst.</p>
  <div class="controls">
    <button id="btn-rem">✨ Traumfenster hervorheben</button>
    <button id="btn-hr">❤️ Puls einblenden</button>
  </div>
  <svg id="hypno" viewBox="0 0 920 330" role="img" aria-label="Hypnogramm der Nacht"></svg>
  <div class="legend">
    <span><i style="background:var(--wake)"></i>Wach</span>
    <span><i style="background:var(--gold)"></i>REM — hier träumst du</span>
    <span><i style="background:var(--light)"></i>Leichtschlaf</span>
    <span><i style="background:var(--deep)"></i>Tiefschlaf</span>
    <span><i style="background:var(--hr);border-radius:50%"></i>Puls</span>
  </div>
</div>

<div class="card">
  <h2>🧭 Reise durch deine Nacht</h2>
  <div class="tour-text" id="tour-text"></div>
  <div class="tour-nav">
    <button id="tour-prev">←</button>
    <span id="tour-pos"></span>
    <button id="tour-next" class="active">Weiter →</button>
  </div>
</div>

<div class="card">
  <h2>✨ Deine Traumfenster</h2>
  <p class="sub" style="margin-bottom:.5rem">$REM_N REM-Phasen, zusammen $REM — das sind $REM_SHARE % deines Schlafs. In diesen Minuten hat dein Gehirn heute Nacht am lebhaftesten geträumt. Auch ohne Erinnerung gilt: geträumt hast du.</p>
  <div id="remlist"></div>
  <p class="sub" style="margin-top:.6rem">📓 Zu dieser Nacht steht kein Traum im Tagebuch. Dein größtes Fenster lag um $LREM_VON — die Erinnerung daran verblasst in Minuten. Morgen früh: liegen bleiben, Augen zu, zurückspulen, dann erst aufstehen.</p>
</div>

<div class="card">
  <h2>🌉 Die Brücke zum Klartraum</h2>
  <div class="bridge">
    <h3>Dein Training zielt auf diese $REM pro Nacht</h3>
    <p>Traumzeichen erkennen (dein 🧭 Kompass) funktioniert nur im REM — alles, was du tagsüber übst, entscheidet sich in diesen gold markierten Blöcken. Je später die Nacht, desto größer die Bühne: $REM_LATE deiner Traumzeit lag in der zweiten Nachthälfte (erste Hälfte: $REM_EARLY).</p>
  </div>
  <div class="bridge">
    <h3>Du machst nachts schon „WBTB light" — ohne es zu merken</h3>
    <p>Um $LASTWAKE warst du kurz wach; danach kamen noch $REM_NACH_WAKE REM. Genau diesen Mechanismus nutzt die WBTB-Technik bewusst: kurz wach werden, die Absicht setzen („Beim nächsten Traum erkenne ich, dass ich träume"), zurück in den traumreichen Morgenschlaf. In dieser Nacht wäre dein idealer Moment gegen $WBTB gewesen — kurz vor deinem längsten Traumfenster ($LREM_VON–$LREM_BIS).</p>
  </div>
  <div class="bridge">
    <h3>Der Traum ist körperlich real</h3>
    <p>Im Tiefschlaf sank dein Puls auf $MIN_HR — im REM sprang er auf bis zu $MAX_HR, fast Tagesniveau, während dein Körper bewegungslos lag. Dein Herz erlebt den Traum mit. Deshalb fühlen sich Klarträume so echt an — und deshalb lohnt es sich, dorthin wach zu werden.</p>
  </div>
</div>

<p class="foot">Ehrlichkeit: Schlafphasen sind eine Tracker-Schätzung aus Bewegung und Puls — die Dauer ist verlässlich, die Phasengrenzen sind es nur ungefähr. Eine einzelne Nacht ist eine Anekdote; Muster entstehen ab ~2 Wochen. Dieser Prototyp ist eine lokale, git-ignorierte Datei — seine Ideen fließen in die Schlafschule (Plan SS.2/SS.3) ein.</p>
</main>

<div id="tooltip"></div>
<script>
var D = $DATA;
var X0 = 70, X1 = 900, Y = {5: 40, 4: 100, 3: 160, 2: 220}, H = 30, YB = 285;
var COL = {2: "#4a5fd0", 3: "#6f66a8", 4: "#f5c66a", 5: "#e0704f"};
var NAME = {2: "Tiefschlaf", 3: "Leichtschlaf", 4: "REM — Traumphase", 5: "Wach"};
var INFO = {
  2: "Körper-Werkstatt: Reparatur, Immunsystem, Wachstumshormon. Sehr schwer aufzuwecken, kaum Träume.",
  3: "Übergangs- und Verarbeitungsschlaf — mehr als die Hälfte jeder Nacht. Von hier aus geht es hoch ins REM oder runter in die Tiefe.",
  4: "Hier entsteht dein Traum-Kino: Augen rasen, Puls steigt, Muskeln sind gelähmt. Das Ziel jedes Klartraum-Trainings.",
  5: "Kurzes Aufwachen — völlig normal, meist sofort vergessen. Direkt danach beginnt oft eine neue Traumphase."
};
function x(t) { return X0 + (t - D.bed) / (D.wake - D.bed) * (X1 - X0); }
var svg = document.getElementById("hypno");
var NS = "http://www.w3.org/2000/svg";
function el(tag, at) { var e = document.createElementNS(NS, tag); for (var k in at) e.setAttribute(k, at[k]); return e; }
var t0 = new Date(D.bed * 1000);
var firstHour = new Date(t0); firstHour.setMinutes(0,0,0); firstHour = firstHour.getTime()/1000 + 3600;
for (var t = firstHour; t < D.wake; t += 3600) {
  svg.appendChild(el("line", {x1:x(t), y1:28, x2:x(t), y2:YB-20, stroke:"#2b2650", "stroke-width":1}));
  var lb = el("text", {x:x(t), y:YB-6, fill:"#9a94b8", "font-size":11, "text-anchor":"middle"});
  lb.textContent = new Date(t*1000).toLocaleTimeString("de-DE",{hour:"2-digit",minute:"2-digit"});
  svg.appendChild(lb);
}
["Wach","REM ✨","Leicht","Tief"].forEach(function(n,i){
  var ty = [40,100,160,220][i] + H/2 + 4;
  var lb = el("text", {x:4, y:ty, fill:"#9a94b8", "font-size":11});
  lb.textContent = n; svg.appendChild(lb);
});
var segRects = [];
D.segs.forEach(function(s, i) {
  if (i > 0) {
    var p = D.segs[i-1];
    var ya = Y[p.st] + H/2, yb2 = Y[s.st] + H/2;
    svg.appendChild(el("line", {x1:x(s.s), y1:Math.min(ya,yb2), x2:x(s.s), y2:Math.max(ya,yb2), stroke:"#3a3468", "stroke-width":1.5}));
  }
  var r = el("rect", {x:x(s.s), y:Y[s.st], width:Math.max(2, x(s.e)-x(s.s)), height:H, rx:4, fill:COL[s.st]});
  r.style.cursor = "pointer";
  r._seg = s; segRects.push(r); svg.appendChild(r);
});
var tip = document.getElementById("tooltip");
function fmt(ts) { return new Date(ts*1000).toLocaleTimeString("de-DE",{hour:"2-digit",minute:"2-digit"}); }
function showTip(ev, s) {
  var mins = Math.round((s.e - s.s)/60);
  tip.innerHTML = "<b>" + NAME[s.st] + "</b><br>" + fmt(s.s) + "–" + fmt(s.e) + " · " + mins + " min<br><span style='color:#c9c3e6'>" + INFO[s.st] + "</span>";
  tip.style.opacity = 1;
  var px = Math.min(ev.clientX + 12, window.innerWidth - 260);
  tip.style.left = px + "px"; tip.style.top = (ev.clientY + 14) + "px";
}
segRects.forEach(function(r) {
  r.addEventListener("mousemove", function(ev){ showTip(ev, r._seg); });
  r.addEventListener("mouseleave", function(){ tip.style.opacity = 0; });
  r.addEventListener("click", function(ev){ showTip(ev, r._seg); ev.stopPropagation(); });
});
document.body.addEventListener("click", function(){ tip.style.opacity = 0; });
var remOn = false;
document.getElementById("btn-rem").addEventListener("click", function() {
  remOn = !remOn; this.classList.toggle("active", remOn);
  segRects.forEach(function(r){ r.style.opacity = (!remOn || r._seg.st === 4) ? 1 : 0.22; });
});
var hrOn = false, hrPath = null;
document.getElementById("btn-hr").addEventListener("click", function() {
  hrOn = !hrOn; this.classList.toggle("active", hrOn);
  if (!hrPath) {
    var lo = 35, hi = 90;
    var pts = D.hr.map(function(p) {
      var yy = YB - 25 - (p[1] - lo) / (hi - lo) * 200;
      return x(p[0]).toFixed(1) + "," + yy.toFixed(1);
    }).join(" ");
    hrPath = el("polyline", {points: pts, fill:"none", stroke:"#d4537e", "stroke-width":1.6, "stroke-opacity":.9});
    svg.appendChild(hrPath);
  }
  hrPath.style.display = hrOn ? "" : "none";
});
var remBox = document.getElementById("remlist");
var rems = D.segs.filter(function(s){ return s.st === 4; });
var maxRem = Math.max.apply(null, rems.map(function(s){ return s.e - s.s; }));
rems.forEach(function(s) {
  var mins = Math.round((s.e - s.s)/60);
  var div = document.createElement("div");
  div.className = "remwin" + ((s.e - s.s) === maxRem ? " top" : "");
  div.innerHTML = "<span style='min-width:92px'>" + fmt(s.s) + "–" + fmt(s.e) + "</span>" +
    "<span class='bar' style='width:" + Math.round((s.e-s.s)/maxRem*130) + "px'></span>" +
    "<small>" + mins + " min" + ((s.e-s.s)===maxRem ? " · dein größtes Fenster" : "") + "</small>";
  remBox.appendChild(div);
});
var TOUR = [
  ["🌙 <b>$BETT — Licht aus.</b> Nach nur $EINSCHLAF_MIN Minuten Leichtschlaf zog dich dein Gehirn in die Tiefe — ein Zeichen für echten Schlafdruck.", null],
  ["💤 <b>$DEEP1_VON — ab in die Werkstatt.</b> Dein erster Tiefschlafblock ($DEEP1_DAUER am Stück). Hier wird repariert und aufgeräumt — um $MIN_HR_T erreichte dein Puls seinen Nacht-Tiefpunkt von $MIN_HR Schlägen. Träume sind hier selten.", 2],
  ["🌊 <b>Die 90-Minuten-Wellen.</b> Schau auf das Muster: runter, hoch, runter — dein Schlaf läuft in Zyklen von grob 90 Minuten. Mit jeder Welle wird der Tiefschlaf kürzer und das REM länger.", null],
  ["✨ <b>Die Traumfenster öffnen sich.</b> $REM_N REM-Phasen, das goldene Band. $REM_LATE deiner Traumzeit lag in der zweiten Nachthälfte — der Morgenschlaf ist dein Traum-Hauptprogramm.", 4],
  ["👁️ <b>$LASTWAKE — kurz wach, na und?</b> $WACH_N kurze Wachmomente hatte die Nacht, zusammen $WACHZEIT. Das ist normale Schlafarchitektur — und nachts der Moment, in dem Klarträumer ihre Absicht setzen (WBTB).", 5],
  ["🌅 <b>$WACH — Abspann.</b> Du bist direkt aus traumnahem Schlaf aufgetaucht: dein größtes Traumfenster endete $LREM_BIS. Die ersten 2 Minuten nach dem Aufwachen sind deine beste Erinnerungs-Chance — erst zurückspulen, dann aufstehen.", null]
];
var ti = 0;
var tourText = document.getElementById("tour-text");
function tour() {
  tourText.innerHTML = TOUR[ti][0];
  document.getElementById("tour-pos").textContent = (ti+1) + " / " + TOUR.length;
  var hl = TOUR[ti][1];
  segRects.forEach(function(r){ r.style.opacity = (hl === null || r._seg.st === hl) ? 1 : 0.22; });
  document.getElementById("tour-prev").style.visibility = ti === 0 ? "hidden" : "visible";
  document.getElementById("tour-next").textContent = ti === TOUR.length-1 ? "Von vorn" : "Weiter →";
}
document.getElementById("tour-next").addEventListener("click", function(){ ti = (ti+1) % TOUR.length; tour(); });
document.getElementById("tour-prev").addEventListener("click", function(){ ti = Math.max(0, ti-1); tour(); });
tour();
</script>
</body>
</html>
""")

OUT.write_text(TPL.substitute(V), encoding="utf-8")
print("geschrieben:", OUT, OUT.stat().st_size, "bytes")
print("Nacht:", hhmm(bed), "->", hhmm(wake), "| REM-Fenster:", [(hhmm(s['s']), hhmm(s['e'])) for s in rem])

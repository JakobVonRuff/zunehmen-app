// Zunehmen-Widget für Scriptable (mittlere Größe = breit)
// Zeigt die nächste Mahlzeit groß und die zwei danach klein.
// Plan kommt von der App, ohne Internet aus dem Speicher.

const PLAN_URL = "https://jakobvonruff.github.io/zunehmen-app/plan.json";
const fm = FileManager.local();
const cachePath = fm.joinPath(fm.documentsDirectory(), "zunehmen-plan.json");

async function loadPlan() {
  try {
    const req = new Request(PLAN_URL + "?t=" + Date.now());
    req.timeoutInterval = 8;
    const plan = await req.loadJSON();
    fm.writeString(cachePath, JSON.stringify(plan));
    return plan;
  } catch (e) {
    if (fm.fileExists(cachePath)) return JSON.parse(fm.readString(cachePath));
    return null;
  }
}

function at(t, dayOffset) {
  const [h, m] = t.split(":").map(Number);
  const d = new Date();
  d.setDate(d.getDate() + (dayOffset || 0));
  d.setHours(h, m, 0, 0);
  return d;
}

function untilText(date) {
  const min = Math.round((date - new Date()) / 60000);
  if (min <= 0) return "jetzt";
  const h = Math.floor(min / 60), m = min % 60;
  return "in " + (h ? h + " Std " : "") + m + " Min";
}

const plan = await loadPlan();
const w = new ListWidget();
const g = new LinearGradient();
g.colors = [new Color("#2B1240"), new Color("#140A1F"), new Color("#07070A")];
g.locations = [0, 0.55, 1];
g.startPoint = new Point(0, 0);
g.endPoint = new Point(1, 1);
w.backgroundGradient = g;
w.setPadding(14, 16, 14, 16);

const orange = new Color("#FF8A1F");
const pink = new Color("#FF2D6F");
const white = Color.white();
const grey = new Color("#EBEBF5", 0.62);
const dim = new Color("#EBEBF5", 0.38);

if (!plan) {
  const t = w.addText("Plan lädt beim nächsten Mal mit Internet.");
  t.textColor = white;
  t.font = Font.mediumRoundedSystemFont(14);
} else {
  w.url = plan.app;
  const meals = plan.meals;
  const now = new Date();
  // aktuelle Mahlzeit bleibt 45 Minuten "jetzt", danach kommt die nächste
  let idx = meals.findIndex(m => at(m.t).getTime() + 45 * 60000 > now.getTime());
  let tomorrow = false;
  if (idx < 0) { idx = 0; tomorrow = true; }

  const row = w.addStack();
  row.layoutHorizontally();

  // links: nächste Mahlzeit groß
  const left = row.addStack();
  left.layoutVertically();
  const lab = left.addText(tomorrow ? "MORGEN" : "ALS NÄCHSTES");
  lab.font = Font.heavyRoundedSystemFont(11);
  lab.textColor = orange;
  left.addSpacer(2);
  const m0 = meals[idx];
  const time = left.addText(m0.t);
  time.font = Font.heavyRoundedSystemFont(30);
  time.textColor = white;
  const name = left.addText(m0.n);
  name.font = Font.boldRoundedSystemFont(16);
  name.textColor = white;
  name.lineLimit = 1;
  name.minimumScaleFactor = 0.7;
  left.addSpacer(2);
  const det = left.addText(m0.d);
  det.font = Font.regularSystemFont(11);
  det.textColor = grey;
  det.lineLimit = 2;
  left.addSpacer(4);
  const when = left.addText(tomorrow ? "Heute alles geschafft" : untilText(at(m0.t)) + " · " + m0.k + " kcal");
  when.font = Font.semiboldRoundedSystemFont(11);
  when.textColor = pink;

  row.addSpacer(12);

  // rechts: die zwei danach
  const right = row.addStack();
  right.layoutVertically();
  right.size = new Size(118, 0);
  const lab2 = right.addText("DANACH");
  lab2.font = Font.heavyRoundedSystemFont(11);
  lab2.textColor = dim;
  right.addSpacer(6);
  for (let k = 1; k <= 3; k++) {
    const m = meals[(idx + k) % meals.length];
    if (!tomorrow && idx + k >= meals.length) break;
    const r = right.addStack();
    r.layoutHorizontally();
    r.centerAlignContent();
    const tt = r.addText(m.t);
    tt.font = Font.boldRoundedSystemFont(12);
    tt.textColor = orange;
    r.addSpacer(6);
    const nn = r.addText(m.n);
    nn.font = Font.mediumRoundedSystemFont(12);
    nn.textColor = white;
    nn.lineLimit = 1;
    nn.minimumScaleFactor = 0.75;
    right.addSpacer(7);
  }
  right.addSpacer();

  // Widget aktualisiert sich zur nächsten Mahlzeit neu
  const nextChange = tomorrow ? at(meals[0].t, 1) : new Date(at(m0.t).getTime() + 45 * 60000);
  w.refreshAfterDate = new Date(Math.min(nextChange.getTime(), Date.now() + 15 * 60000));
}

if (config.runsInWidget) {
  Script.setWidget(w);
} else {
  await w.presentMedium();
}
Script.complete();

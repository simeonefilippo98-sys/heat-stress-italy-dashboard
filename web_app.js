const PERIODS = [
  ["P1_BASELINE_2006_2025", "P1 · Baseline 2006–2025"],
  ["P2_NEAR_2026_2050", "P2 · Near term 2026–2050"],
  ["P3_MID_2051_2075", "P3 · Mid century 2051–2075"],
  ["P4_COMMON_2076_2099", "P4 · Far future 2076–2099"],
];

const EXP_LABELS = {
  0: "Indoor / shade",
  0.25: "Mostly indoor / limited outdoor",
  0.5: "Mixed indoor–outdoor",
  0.75: "Mostly outdoor",
  1: "Outdoor / direct-sun",
};

let micro = [], geo = null, adaptProv = [], adaptNat = [], adaptInt = [];

const $ = id => document.getElementById(id);
const num = x => Number(x || 0);
const fmt = (x, d = 0) => num(x).toLocaleString("en-US", {maximumFractionDigits: d, minimumFractionDigits: d});
const moneyBn = x => "€" + fmt(x / 1e9, 2) + " bn";
const pct = x => fmt(x, 2) + "%";
const clamp0 = x => Math.abs(num(x)) < 1e-7 ? 0 : Math.max(0, num(x));

async function ungzipText(url) {
  const r = await fetch(url);
  if (!r.ok) throw new Error(`${url}: ${r.status}`);
  const ds = new DecompressionStream("gzip");
  return new Response(r.body.pipeThrough(ds)).text();
}
async function text(url) {
  const r = await fetch(url);
  if (!r.ok) throw new Error(`${url}: ${r.status}`);
  return r.text();
}
async function json(url) {
  const r = await fetch(url);
  if (!r.ok) throw new Error(`${url}: ${r.status}`);
  return r.json();
}
function parseCsvString(s) {
  return Papa.parse(s, {header: true, dynamicTyping: true, skipEmptyLines: true}).data;
}

function compactRow(x) {
  return {
    r: String(x.REF_AREA),
    pn: x.province_name,
    s: String(x.sector_code).padStart(5, "0"),
    sd: x.sector_description,
    b: String(x.VA_BRANCH_11),
    bd: x.VA_BRANCH_11_DESC,
    wi: x.work_intensity,
    o: num(x.outdoor_share_main),
    p: x.period_id,
    pl: x.period_label,
    va: num(x.VA_allocated_EUR),
    n: num(x.addetti),
    lo: num(x.loss_outdoor_only),
    l0: num(x.VA_loss_EUR_mixed_main),
    w0: num(x.workers_lost_mixed_main),
    l50: num(x.VA_loss_EUR_combined_adapt_50),
    w50: num(x.workers_lost_combined_adapt_50),
    a50: num(x.VA_avoided_EUR_combined_adapt_50),
    l75: num(x.VA_loss_EUR_combined_adapt_75),
    w75: num(x.workers_lost_combined_adapt_75),
    a75: num(x.VA_avoided_EUR_combined_adapt_75),
    level: "ATECO5",
  };
}

function synthesizeAgriculture(nonAgRows) {
  // Module 48E intentionally exports only ATECO5 rows. Agriculture is a separate
  // VA-branch-A unit in the core model. We recover its exact province-period
  // contribution as the reconciled residual between the whole-economy Module 43E
  // province totals and the sum of the non-agricultural ATECO5 rows.
  const g = new Map();
  for (const x of nonAgRows) {
    const key = `${x.p}|||${x.r}`;
    if (!g.has(key)) {
      g.set(key, {p:x.p, pl:x.pl, r:x.r, pn:x.pn, w0:0,l0:0,w50:0,l50:0,w75:0,l75:0,los:0,lon:0});
    }
    const y = g.get(key);
    y.w0 += x.w0; y.l0 += x.l0;
    y.w50 += x.w50; y.l50 += x.l50;
    y.w75 += x.w75; y.l75 += x.l75;
    if (x.wi === "heavy_physical" && Number.isFinite(x.lo)) { y.los += x.lo; y.lon += 1; }
  }

  const total50 = new Map();
  const total75 = new Map();
  for (const x of adaptProv) {
    if (x.measure !== "combined") continue;
    const u = num(x.uptake);
    const key = `${x.period_id}|||${String(x.REF_AREA)}`;
    if (Math.abs(u - 0.5) < 1e-9) total50.set(key, x);
    if (Math.abs(u - 0.75) < 1e-9) total75.set(key, x);
  }

  const agRows = [];
  for (const [key, y] of g.entries()) {
    const t50 = total50.get(key), t75 = total75.get(key);
    if (!t50 || !t75 || !y.lon) continue;
    const lossOutdoorHeavy = y.los / y.lon;
    if (!(lossOutdoorHeavy > 0)) continue;

    const agW0 = clamp0(num(t50.noadapt_workers_lost_mean) - y.w0);
    const agL0 = clamp0(num(t50.noadapt_VA_loss_EUR_mean) - y.l0);
    const agW50 = clamp0(num(t50.adapted_workers_lost_mean) - y.w50);
    const agL50 = clamp0(num(t50.adapted_VA_loss_EUR_mean) - y.l50);
    const agW75 = clamp0(num(t75.adapted_workers_lost_mean) - y.w75);
    const agL75 = clamp0(num(t75.adapted_VA_loss_EUR_mean) - y.l75);

    const agN = agW0 / lossOutdoorHeavy;
    const agVA = agL0 / lossOutdoorHeavy;

    agRows.push({
      r: y.r,
      pn: y.pn,
      s: "A-AGG",
      sd: "Agriculture, forestry and fishing [aggregate branch A]",
      b: "A",
      bd: "Agriculture, forestry and fishing",
      wi: "heavy_physical",
      o: 1,
      p: y.p,
      pl: y.pl,
      va: agVA,
      n: agN,
      lo: lossOutdoorHeavy,
      l0: agL0,
      w0: agW0,
      l50: agL50,
      w50: agW50,
      a50: clamp0(agL0 - agL50),
      l75: agL75,
      w75: agW75,
      a75: clamp0(agL0 - agL75),
      level: "VA_BRANCH",
    });
  }
  return agRows;
}

async function loadAll() {
  const [p1, p2, g, ap, an, ai] = await Promise.all([
    ungzipText('/ATECO5_province_P1_P4_micro_results_part1.csv.gz'),
    ungzipText('/ATECO5_province_P1_P4_micro_results_part2.csv.gz'),
    json('/economic_geography_103_simplified.geojson'),
    text('/ensemble_province_adaptation_losses.csv'),
    text('/ensemble_national_adaptation_losses.csv'),
    text('/ensemble_national_intensity_adaptation.csv'),
  ]);

  const nonAg = parseCsvString(p1).concat(parseCsvString(p2)).map(compactRow);
  geo = g;
  adaptProv = parseCsvString(ap);
  adaptNat = parseCsvString(an);
  adaptInt = parseCsvString(ai);
  const agriculture = synthesizeAgriculture(nonAg);
  micro = nonAg.concat(agriculture);

  const p4 = micro.filter(x => x.p === "P4_COMMON_2076_2099");
  console.info("Dashboard coverage", {
    ATECO5_unique: new Set(nonAg.map(x=>x.s)).size,
    agriculture_rows: agriculture.length,
    provinces: new Set(p4.map(x=>x.r)).size,
    P4_workers_lost: p4.reduce((s,x)=>s+x.w0,0),
    P4_VA_loss_EUR: p4.reduce((s,x)=>s+x.l0,0),
  });
}

function initOptions() {
  for (const [id, label] of PERIODS) ["period", "a-period"].forEach(k => $(k).add(new Option(label, id)));
  $("period").value = PERIODS[3][0];
  $("a-period").value = PERIODS[3][0];

  const branches = [...new Map(micro.map(x => [x.b, [x.b, x.bd]])).values()]
    .sort((a,b) => String(a[0]).localeCompare(String(b[0])));
  branches.forEach(([v,l]) => $("branch").add(new Option(`${v} · ${l}`, v)));

  [["clerical","Clerical / cognitive"],["light_physical","Light physical"],["moderate_physical","Moderate physical"],["heavy_physical","Heavy physical"]]
    .forEach(x => $("intensity").add(new Option(x[1], x[0])));
  Object.entries(EXP_LABELS).forEach(([v,l]) => $("exposure").add(new Option(l, v)));
  rebuildAteco();
  rebuildUptake();
}

function selectedRows(periodOverride = null) {
  const p = periodOverride || $("period").value;
  const b = $("branch").value, wi = $("intensity").value, ex = $("exposure").value, s = $("ateco").value;
  return micro.filter(x => x.p === p && (!b || x.b === b) && (!wi || x.wi === wi) && (!ex || String(x.o) === ex) && (!s || x.s === s));
}

function rebuildAteco() {
  const current = $("ateco").value;
  const p = $("period").value, b = $("branch").value, wi = $("intensity").value, ex = $("exposure").value;
  const rows = micro.filter(x => x.p === p && (!b || x.b === b) && (!wi || x.wi === wi) && (!ex || String(x.o) === ex));
  const vals = [...new Map(rows.map(x => [x.s, [x.sd, x.level]])).entries()].sort((a,b) => a[0].localeCompare(b[0]));
  $("ateco").innerHTML = '<option value="">All activities</option>';
  vals.forEach(([v,[label,level]]) => {
    const suffix = level === "VA_BRANCH" ? " · aggregate branch" : "";
    $("ateco").add(new Option(`${v} · ${label}${suffix}`, v));
  });
  if (vals.some(x => x[0] === current)) $("ateco").value = current;
}

function cols() {
  const s = $("scenario").value;
  if (s === "50") return {l:"l50", w:"w50", a:"a50"};
  if (s === "75") return {l:"l75", w:"w75", a:"a75"};
  return {l:"l0", w:"w0", a:null};
}

function aggregate(rows) {
  const c = cols(), m = new Map();
  for (const x of rows) {
    if (!m.has(x.r)) m.set(x.r, {r:x.r,pn:x.pn,va:0,n:0,l:0,w:0,a:0,l0:0});
    const y = m.get(x.r);
    y.va += x.va; y.n += x.n; y.l += x[c.l]; y.w += x[c.w]; y.l0 += x.l0;
    if (c.a) y.a += x[c.a];
  }
  return [...m.values()].map(y => ({...y, va_m:y.l/1e6, va_p:y.va ? 100*y.l/y.va : 0, w_p:y.n ? 100*y.w/y.n : 0, av_p:y.l0 ? 100*y.a/y.l0 : 0}));
}

function renderMicro() {
  const rows = selectedRows();
  if (!rows.length) return;
  const prov = aggregate(rows);
  const TL = prov.reduce((a,x)=>a+x.l,0), TV = prov.reduce((a,x)=>a+x.va,0), TW = prov.reduce((a,x)=>a+x.w,0), TN = prov.reduce((a,x)=>a+x.n,0);
  $("kpi-va").textContent = moneyBn(TL);
  $("kpi-vap").textContent = pct(100*TL/TV);
  $("kpi-w").textContent = fmt(TW);
  $("kpi-wp").textContent = pct(100*TW/TN);

  const metric = $("metric").value;
  let key, title, colors;
  if (metric === "va_eur") {key="va_m"; title="€ million"; colors="Reds";}
  else if (metric === "va_pct") {key="va_p"; title="%"; colors="OrRd";}
  else if (metric === "workers") {key="w"; title="workers"; colors="YlOrRd";}
  else {key="w_p"; title="%"; colors="OrRd";}

  Plotly.react("map", [{
    type:"choropleth", geojson:geo, locations:prov.map(x=>x.r), z:prov.map(x=>x[key]), featureidkey:"properties.REF_AREA",
    text:prov.map(x=>x.pn), colorscale:colors, colorbar:{title}, marker:{line:{color:"#fff",width:.5}},
    customdata:prov.map(x=>[x.va_m,x.va_p,x.w,x.w_p]),
    hovertemplate:"<b>%{text}</b><br>VA loss: €%{customdata[0]:,.1f}m<br>VA loss: %{customdata[1]:.2f}%<br>Workers lost: %{customdata[2]:,.0f}<br>Worker loss: %{customdata[3]:.2f}%<extra></extra>"
  }], {geo:{fitbounds:"locations",visible:false},margin:{l:0,r:0,t:10,b:0}}, {responsive:true,displaylogo:false});

  const rank = [...prov].sort((a,b)=>b[key]-a[key]).slice(0,15).reverse();
  Plotly.react("rank", [{type:"bar",orientation:"h",x:rank.map(x=>x[key]),y:rank.map(x=>x.pn),marker:{color:"#b42318"}}],
    {title:{text:"Top provinces",font:{size:16}},margin:{l:120,r:20,t:50,b:45},xaxis:{title},plot_bgcolor:"#fff"},{responsive:true,displaylogo:false});

  const trend = PERIODS.map(([pid,label]) => {
    const a = aggregate(selectedRows(pid)), l = a.reduce((s,x)=>s+x.l,0), v = a.reduce((s,x)=>s+x.va,0);
    return {label, v:v ? 100*l/v : 0};
  });
  Plotly.react("trend", [{type:"scatter",mode:"lines+markers",x:trend.map(x=>x.label),y:trend.map(x=>x.v),line:{color:"#172033",width:3},marker:{size:8}}],
    {title:{text:"P1–P4 trajectory",font:{size:16}},margin:{l:55,r:20,t:50,b:90},yaxis:{title:"VA loss intensity (%)"},plot_bgcolor:"#fff"},{responsive:true,displaylogo:false});

  const sorted = [...prov].sort((a,b)=>b.va_p-a.va_p);
  $("province-table").innerHTML = '<thead><tr><th>Province</th><th>VA loss (€m)</th><th>VA loss (%)</th><th>Workers lost</th><th>Worker loss (%)</th></tr></thead><tbody>' +
    sorted.map(x=>`<tr><td>${x.pn}</td><td>${fmt(x.va_m,1)}</td><td>${fmt(x.va_p,2)}</td><td>${fmt(x.w,0)}</td><td>${fmt(x.w_p,2)}</td></tr>`).join('') + '</tbody>';
}

function rebuildUptake() {
  const p = $("a-period").value, m = $("a-measure").value;
  const vals = [...new Set(adaptProv.filter(x=>x.period_id===p&&x.measure===m).map(x=>num(x.uptake)))].sort((a,b)=>a-b);
  $("a-uptake").innerHTML = "";
  vals.forEach(v => $("a-uptake").add(new Option(`${Math.round(v*100)}%`,v)));
  if (vals.includes(.5)) $("a-uptake").value = .5;
}

function renderAdapt() {
  const p = $("a-period").value, m = $("a-measure").value, u = num($("a-uptake").value);
  const rows = adaptProv.filter(x=>x.period_id===p&&x.measure===m&&Math.abs(num(x.uptake)-u)<1e-9);
  const nat = adaptNat.find(x=>x.period_id===p&&x.measure===m&&Math.abs(num(x.uptake)-u)<1e-9);
  if (nat) {
    $("a-va").textContent = moneyBn(num(nat.avoided_VA_loss_EUR_mean));
    $("a-vap").textContent = pct(num(nat.avoided_VA_percent_mean));
    $("a-w").textContent = fmt(num(nat.avoided_workers_lost_mean));
    $("a-wp").textContent = pct(num(nat.avoided_workers_percent_mean));
  }
  Plotly.react("amap", [{type:"choropleth",geojson:geo,locations:rows.map(x=>String(x.REF_AREA)),z:rows.map(x=>num(x.avoided_VA_percent_mean)),featureidkey:"properties.REF_AREA",text:rows.map(x=>x.province_name),colorscale:"Greens",colorbar:{title:"Avoided VA (%)"},marker:{line:{color:"#fff",width:.5}},hovertemplate:"<b>%{text}</b><br>Avoided VA: %{z:.1f}%<extra></extra>"}],
    {geo:{fitbounds:"locations",visible:false},margin:{l:0,r:0,t:10,b:0}},{responsive:true,displaylogo:false});
  const ir = adaptInt.filter(x=>x.period_id===p&&x.measure===m&&Math.abs(num(x.uptake)-u)<1e-9);
  Plotly.react("aint", [{type:"bar",x:ir.map(x=>x.work_intensity),y:ir.map(x=>num(x.avoided_VA_percent_mean)),marker:{color:"#2e8b57"}}],
    {title:{text:"Effectiveness by work intensity",font:{size:16}},yaxis:{title:"Avoided VA (%)"},margin:{l:60,r:20,t:50,b:80},plot_bgcolor:"#fff"},{responsive:true,displaylogo:false});
}

function bind() {
  document.querySelectorAll(".tab").forEach(btn => btn.addEventListener("click", () => {
    document.querySelectorAll(".tab").forEach(x=>x.classList.remove("active"));
    btn.classList.add("active");
    document.querySelectorAll(".view").forEach(x=>x.classList.add("hidden"));
    $(btn.dataset.view).classList.remove("hidden");
    if (btn.dataset.view === "micro") renderMicro();
    if (btn.dataset.view === "adapt") renderAdapt();
  }));
  ["period","branch","intensity","exposure"].forEach(id => $(id).addEventListener("change", () => {rebuildAteco(); renderMicro();}));
  ["scenario","metric","ateco"].forEach(id => $(id).addEventListener("change", renderMicro));
  ["a-period","a-measure"].forEach(id => $(id).addEventListener("change", () => {rebuildUptake(); renderAdapt();}));
  $("a-uptake").addEventListener("change", renderAdapt);
}

(async () => {
  try {
    await loadAll();
    initOptions();
    bind();
    $("loading").classList.add("hidden");
    $("micro").classList.remove("hidden");
    renderMicro();
  } catch (e) {
    $("loading").classList.add("hidden");
    $("error").classList.remove("hidden");
    $("error").textContent = "Failed to load dashboard: " + e.message;
    console.error(e);
  }
})();

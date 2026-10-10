const PERIODS = [
  ["P1_BASELINE_2006_2025", "P1 · Climate reference 2006–2025"],
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

const BRANCH_LABELS = {
  A: "Agriculture, forestry & fishing",
  BDE: "Extractives, energy, water & waste",
  C: "Manufacturing",
  F: "Construction",
  GTI: "Trade, transport, accommodation & food",
  J: "Information & communication",
  K: "Financial & insurance",
  L: "Real estate",
  M_N: "Professional, scientific, technical & admin",
  OTQ: "Public admin, education, health & social",
  RTU: "Arts, other services, households & organisations",
};

const ROBUST_LABELS = {
  MAIN_ISO_MAIN_EXPOSURE: "ISO · main exposure",
  SENSITIVITY_ISO_HIGH_OUTDOOR_SHARE: "ISO · high outdoor share",
  SENSITIVITY_NIOSH_MAIN_EXPOSURE: "NIOSH · main exposure",
  SENSITIVITY_ISO_LOW_OUTDOOR_SHARE: "ISO · low outdoor share",
  SENSITIVITY_HOTHAPS_MAIN_EXPOSURE: "Hothaps · main exposure",
};

let micro = [], geo = null, adaptProv = [], adaptNat = [], adaptInt = [], robustness = [];
let excludedProvinces = new Set();

const $ = id => document.getElementById(id);
const num = x => Number(x || 0);
const fmt = (x, d = 0) => num(x).toLocaleString("en-US", {maximumFractionDigits:d, minimumFractionDigits:d});
const moneyBn = x => "€" + fmt(x / 1e9, 2) + " bn";
const pct = x => fmt(x, 2) + "%";
const clamp0 = x => Math.abs(num(x)) < 1e-7 ? 0 : Math.max(0, num(x));
const provinceName = x => ({
  "LAquila":"L'Aquila",
  "Reggio nellEmilia":"Reggio nell'Emilia",
  "Forli Cesena":"Forlì-Cesena",
  "Valle dAosta Vallee dAoste":"Valle d'Aosta / Vallée d'Aoste",
  "Verbano Cusio Ossola":"Verbano-Cusio-Ossola",
  "Massa Carrara":"Massa-Carrara"
}[String(x)] || String(x));

const wait = ms => new Promise(resolve => setTimeout(resolve, ms));
async function fetchResource(url, options={}) {
  let lastError;
  for (let attempt=1;attempt<=3;attempt++) {
    const controller=new AbortController();
    const timeout=setTimeout(()=>controller.abort(),60000);
    try {
      const response=await fetch(url,{cache:"force-cache",...options,signal:controller.signal});
      if (!response.ok) throw new Error(`${url}: HTTP ${response.status}`);
      return response;
    } catch (error) {
      lastError=error;
      if (attempt<3) await wait(350*Math.pow(2,attempt-1));
    } finally {
      clearTimeout(timeout);
    }
  }
  throw new Error(`${url} could not be loaded after three attempts: ${lastError?.message||lastError}`);
}
async function ungzipJson(url) {
  if (typeof DecompressionStream!=="function") {
    throw new Error("This browser does not support gzip decompression. Please use a current version of Chrome, Edge, Firefox or Safari.");
  }
  const response=await fetchResource(url);
  if (!response.body) throw new Error(`${url}: empty response body`);
  const stream=response.body.pipeThrough(new DecompressionStream("gzip"));
  return JSON.parse(await new Response(stream).text());
}
async function text(url) {
  const r = await fetchResource(url);
  return r.text();
}
async function json(url) {
  const r = await fetchResource(url);
  return r.json();
}
function parseCsvString(s) {
  return Papa.parse(s, {header:true, dynamicTyping:true, skipEmptyLines:true}).data;
}
function percentile(values, q) {
  const a = values.filter(Number.isFinite).sort((x,y)=>x-y);
  if (!a.length) return 0;
  const pos = (a.length - 1) * q;
  const lo = Math.floor(pos), hi = Math.ceil(pos);
  if (lo === hi) return a[lo];
  return a[lo] + (a[hi] - a[lo]) * (pos - lo);
}
function safeBounds(lo, hi) {
  if (!Number.isFinite(lo) || !Number.isFinite(hi)) return [0,1];
  if (hi <= lo) {
    const pad = Math.abs(lo) * 0.05 || 1;
    return [Math.max(0, lo-pad), hi+pad];
  }
  return [lo,hi];
}
function compactRow(x) {
  return {
    r:String(x.REF_AREA),
    pn:provinceName(x.province_name),
    s:String(x.sector_code).padStart(5,"0"),
    sd:x.sector_description,
    b:String(x.VA_BRANCH_11),
    bd:x.VA_BRANCH_11_DESC,
    wi:x.work_intensity,
    o:num(x.outdoor_share_main),
    p:x.period_id,
    pl:x.period_label,
    va:num(x.VA_allocated_EUR),
    n:num(x.addetti),
    lo:num(x.loss_outdoor_only),
    l0:num(x.VA_loss_EUR_mixed_main),
    w0:num(x.workers_lost_mixed_main),
    l50:num(x.VA_loss_EUR_combined_adapt_50),
    w50:num(x.workers_lost_combined_adapt_50),
    a50:num(x.VA_avoided_EUR_combined_adapt_50),
    l75:num(x.VA_loss_EUR_combined_adapt_75),
    w75:num(x.workers_lost_combined_adapt_75),
    a75:num(x.VA_avoided_EUR_combined_adapt_75),
    level:"ATECO5",
  };
}

function decodeCompactPayload(payload) {
  if (!payload || payload.version!==1 || !Array.isArray(payload.rows)) {
    throw new Error("The compact microdata payload has an unsupported schema.");
  }
  const books=payload.codebooks||{};
  const periods=books.periods||[],provinces=books.provinces||[],activities=books.activities||[],branches=books.branches||[],intensities=books.work_intensities||[];
  return payload.rows.map(row=>{
    const period=periods[row[0]],province=provinces[row[1]],activity=activities[row[2]],branch=branches[row[3]];
    if (!period||!province||!activity||!branch) throw new Error("The compact microdata payload contains an invalid codebook reference.");
    return {
      r:String(province[0]),pn:provinceName(province[1]),s:String(activity[0]),sd:activity[1],b:String(branch[0]),bd:branch[1],
      wi:intensities[row[4]],o:num(row[5]),p:period[0],pl:period[1],va:num(row[6]),n:num(row[7]),lo:num(row[8]),
      l0:num(row[9]),w0:num(row[10]),l50:num(row[11]),w50:num(row[12]),a50:num(row[13]),
      l75:num(row[14]),w75:num(row[15]),a75:num(row[16]),level:"ATECO5",
    };
  });
}

function synthesizeAgriculture(nonAgRows) {
  const g = new Map();
  for (const x of nonAgRows) {
    const key = `${x.p}|||${x.r}`;
    if (!g.has(key)) g.set(key,{p:x.p,pl:x.pl,r:x.r,pn:x.pn,w0:0,l0:0,w50:0,l50:0,w75:0,l75:0,los:0,lon:0});
    const y = g.get(key);
    y.w0 += x.w0; y.l0 += x.l0;
    y.w50 += x.w50; y.l50 += x.l50;
    y.w75 += x.w75; y.l75 += x.l75;
    if (x.wi === "heavy_physical" && Number.isFinite(x.lo)) {y.los += x.lo; y.lon += 1;}
  }

  const total50 = new Map(), total75 = new Map();
  for (const x of adaptProv) {
    if (x.measure !== "combined") continue;
    const key = `${x.period_id}|||${String(x.REF_AREA)}`, u = num(x.uptake);
    if (Math.abs(u-.5)<1e-9) total50.set(key,x);
    if (Math.abs(u-.75)<1e-9) total75.set(key,x);
  }

  const ag = [];
  for (const [key,y] of g.entries()) {
    const t50=total50.get(key), t75=total75.get(key);
    if (!t50 || !t75 || !y.lon) continue;
    const lossOutdoorHeavy=y.los/y.lon;
    if (!(lossOutdoorHeavy>0)) continue;
    const w0=clamp0(num(t50.noadapt_workers_lost_mean)-y.w0);
    const l0=clamp0(num(t50.noadapt_VA_loss_EUR_mean)-y.l0);
    const w50=clamp0(num(t50.adapted_workers_lost_mean)-y.w50);
    const l50=clamp0(num(t50.adapted_VA_loss_EUR_mean)-y.l50);
    const w75=clamp0(num(t75.adapted_workers_lost_mean)-y.w75);
    const l75=clamp0(num(t75.adapted_VA_loss_EUR_mean)-y.l75);
    ag.push({
      r:y.r,pn:y.pn,s:"A-AGG",sd:"Agriculture, forestry and fishing",b:"A",bd:"Agriculture, forestry and fishing",
      wi:"heavy_physical",o:1,p:y.p,pl:y.pl,va:l0/lossOutdoorHeavy,n:w0/lossOutdoorHeavy,lo:lossOutdoorHeavy,
      l0,w0,l50,w50,a50:clamp0(l0-l50),l75,w75,a75:clamp0(l0-l75),level:"VA_BRANCH",
    });
  }
  return ag;
}

async function loadAll() {
  if ($("loading")) $("loading").textContent="Loading and validating dashboard data…";
  const [payload,g,ap,an,ai,rob] = await Promise.all([
    ungzipJson("/micro_compact_v1.json.gz"),
    json("/economic_geography_103_simplified.geojson"),
    text("/ensemble_province_adaptation_losses.csv"),
    text("/ensemble_national_adaptation_losses.csv"),
    text("/ensemble_national_intensity_adaptation.csv"),
    json("/robustness.json"),
  ]);
  const nonAg = decodeCompactPayload(payload);
  geo=g; adaptProv=parseCsvString(ap); adaptNat=parseCsvString(an); adaptInt=parseCsvString(ai); robustness=rob;
  micro=nonAg.concat(synthesizeAgriculture(nonAg));

  const p4=micro.filter(x=>x.p==="P4_COMMON_2076_2099");
  console.info("Dashboard coverage",{
    ATECO5_unique:new Set(nonAg.map(x=>x.s)).size,
    agriculture_rows:micro.filter(x=>x.level==="VA_BRANCH").length,
    provinces:new Set(p4.map(x=>x.r)).size,
    P4_workers_lost:p4.reduce((s,x)=>s+x.w0,0),
    P4_VA_loss_EUR:p4.reduce((s,x)=>s+x.l0,0),
  });
}

function addPeriods(ids) {
  for (const id of ids) {
    for (const [v,l] of PERIODS) $(id).add(new Option(l,v));
  }
}
function initOptions() {
  addPeriods(["period","s-period","a-period","u-period"]);
  $("period").value=PERIODS[3][0];
  $("s-period").value=PERIODS[3][0];
  $("a-period").value=PERIODS[3][0];
  $("u-period").value=PERIODS[3][0];

  const branches=[...new Map(micro.map(x=>[x.b,[x.b,BRANCH_LABELS[x.b]||x.bd]])).values()]
    .sort((a,b)=>String(a[0]).localeCompare(String(b[0])));
  branches.forEach(([v,l])=>$("branch").add(new Option(`${v} · ${l}`,v)));

  [["clerical","Clerical / cognitive"],["light_physical","Light physical"],["moderate_physical","Moderate physical"],["heavy_physical","Heavy physical"]]
    .forEach(x=>$("intensity").add(new Option(x[1],x[0])));
  Object.entries(EXP_LABELS).forEach(([v,l])=>$("exposure").add(new Option(l,v)));

  const provinces=[...new Map(micro.map(x=>[x.r,x.pn])).entries()].sort((a,b)=>a[1].localeCompare(b[1]));
  provinces.forEach(([r,n])=>$("province-picker").add(new Option(n,r)));

  rebuildAteco();
  rebuildUptake();
  renderExclusionChips();
}
function selectedRows(periodOverride=null) {
  const p=periodOverride||$("period").value,b=$("branch").value,wi=$("intensity").value,ex=$("exposure").value,s=$("ateco").value;
  return micro.filter(x=>x.p===p&&(!b||x.b===b)&&(!wi||x.wi===wi)&&(!ex||String(x.o)===ex)&&(!s||x.s===s));
}
function rebuildAteco() {
  const current=$("ateco").value,p=$("period").value,b=$("branch").value,wi=$("intensity").value,ex=$("exposure").value;
  const rows=micro.filter(x=>x.p===p&&(!b||x.b===b)&&(!wi||x.wi===wi)&&(!ex||String(x.o)===ex));
  const vals=[...new Map(rows.map(x=>[x.s,[x.sd,x.level]])).entries()].sort((a,b)=>a[0].localeCompare(b[0]));
  $("ateco").innerHTML='<option value="">All activities</option>';
  vals.forEach(([v,[label,level]])=>$("ateco").add(new Option(`${v} · ${label}${level==="VA_BRANCH"?" · aggregate branch":""}`,v)));
  if (vals.some(x=>x[0]===current)) $("ateco").value=current;
}
function scenarioCols(value) {
  if (String(value)==="50") return {l:"l50",w:"w50",a:"a50"};
  if (String(value)==="75") return {l:"l75",w:"w75",a:"a75"};
  return {l:"l0",w:"w0",a:null};
}
function aggregateProvince(rows, scenarioValue=$("scenario").value) {
  const c=scenarioCols(scenarioValue),m=new Map();
  for (const x of rows) {
    if (!m.has(x.r)) m.set(x.r,{r:x.r,pn:x.pn,va:0,n:0,l:0,w:0,a:0,l0:0});
    const y=m.get(x.r);
    y.va+=x.va;y.n+=x.n;y.l+=x[c.l];y.w+=x[c.w];y.l0+=x.l0;if(c.a)y.a+=x[c.a];
  }
  return [...m.values()].map(y=>({...y,va_m:y.l/1e6,va_p:y.va?100*y.l/y.va:0,w_p:y.n?100*y.w/y.n:0,av_p:y.l0?100*y.a/y.l0:0}));
}
function metricSpec() {
  const m=$("metric").value;
  if (m==="va_eur") return {key:"va_m",title:"€ million",colors:"YlOrRd"};
  if (m==="va_pct") return {key:"va_p",title:"%",colors:"OrRd"};
  if (m==="workers") return {key:"w",title:"workers",colors:"YlOrRd"};
  return {key:"w_p",title:"%",colors:"OrRd"};
}
function fixedMetricValues() {
  const spec=metricSpec(),vals=[];
  for (const [pid] of PERIODS) aggregateProvince(selectedRows(pid)).forEach(x=>vals.push(x[spec.key]));
  return vals.filter(Number.isFinite);
}
function colorBounds(values, mode, fixedValues=null) {
  const vals=values.filter(Number.isFinite);
  if (!vals.length) return [0,1];
  if (mode==="adaptive") return safeBounds(percentile(vals,.05),percentile(vals,.95));
  if (mode==="fixed" && fixedValues?.length) return safeBounds(Math.min(...fixedValues),Math.max(...fixedValues));
  return safeBounds(Math.min(...vals),Math.max(...vals));
}
function renderExclusionChips() {
  const names=new Map(micro.map(x=>[x.r,x.pn]));
  $("excluded-chips").innerHTML=[...excludedProvinces].map(r=>`<button class="chip" data-r="${r}" title="Show ${names.get(r)} again">${names.get(r)} ×</button>`).join("");
  document.querySelectorAll(".chip").forEach(btn=>btn.addEventListener("click",()=>{
    excludedProvinces.delete(btn.dataset.r);renderExclusionChips();renderMicro();renderAdapt();
  }));
}
function excludeSelectedProvince() {
  const r=$("province-picker").value;
  if (!r) return;
  excludedProvinces.add(r);$("province-picker").value="";renderExclusionChips();renderMicro();renderAdapt();
}
function clearExclusions() {
  excludedProvinces.clear();renderExclusionChips();renderMicro();renderAdapt();
}

function renderMicro() {
  const rows=selectedRows();
  if (!rows.length) return;
  const allProv=aggregateProvince(rows),visible=allProv.filter(x=>!excludedProvinces.has(x.r));
  const TL=allProv.reduce((a,x)=>a+x.l,0),TV=allProv.reduce((a,x)=>a+x.va,0),TW=allProv.reduce((a,x)=>a+x.w,0),TN=allProv.reduce((a,x)=>a+x.n,0);
  $("kpi-va").textContent=moneyBn(TL);$("kpi-vap").textContent=pct(100*TL/TV);$("kpi-w").textContent=fmt(TW);$("kpi-wp").textContent=pct(100*TW/TN);

  const {key,title,colors}=metricSpec(),mode=$("color-mode").value;
  const fixed=mode==="fixed"?fixedMetricValues():null;
  const [zmin,zmax]=colorBounds(visible.map(x=>x[key]),mode,fixed);
  const scaleText=mode==="adaptive"
    ? `Adaptive colours: 5th–95th percentile of ${visible.length} visible provinces`
    : mode==="fixed"
      ? "Fixed colours: common P1–P4 range under current filters"
      : `Visible colours: min–max of ${visible.length} visible provinces`;
  $("scale-note").textContent=scaleText;
  $("visible-note").textContent=`${visible.length} of ${allProv.length} provinces visible · ${excludedProvinces.size} excluded`;

  Plotly.react("map",[{
    type:"choropleth",geojson:geo,locations:visible.map(x=>x.r),z:visible.map(x=>x[key]),zmin,zmax,zauto:false,
    featureidkey:"properties.REF_AREA",text:visible.map(x=>x.pn),colorscale:colors,colorbar:{title},
    marker:{line:{color:"#fff",width:.7}},customdata:visible.map(x=>[x.va_m,x.va_p,x.w,x.w_p]),
    hovertemplate:"<b>%{text}</b><br>VA loss: €%{customdata[0]:,.1f}m<br>VA loss: %{customdata[1]:.2f}%<br>Workers lost: %{customdata[2]:,.0f}<br>Worker loss: %{customdata[3]:.2f}%<extra></extra>"
  }],{geo:{fitbounds:"locations",visible:false,landcolor:"#f1f3f5",showland:true},margin:{l:0,r:0,t:10,b:0}},{responsive:true,displaylogo:false});

  const rank=[...visible].sort((a,b)=>b[key]-a[key]).slice(0,15).reverse();
  Plotly.react("rank",[{type:"bar",orientation:"h",x:rank.map(x=>x[key]),y:rank.map(x=>x.pn),marker:{color:"#b42318"}}],
    {title:{text:"Top visible provinces",font:{size:16}},margin:{l:120,r:20,t:50,b:45},xaxis:{title},plot_bgcolor:"#fff"},{responsive:true,displaylogo:false});

  const trend=PERIODS.map(([pid,label])=>{
    const a=aggregateProvince(selectedRows(pid)),l=a.reduce((s,x)=>s+x.l,0),v=a.reduce((s,x)=>s+x.va,0);
    return {label,v:v?100*l/v:0};
  });
  Plotly.react("trend",[{type:"scatter",mode:"lines+markers",x:trend.map(x=>x.label),y:trend.map(x=>x.v),line:{color:"#172033",width:3},marker:{size:8}}],
    {title:{text:"P1–P4 trajectory · full filtered sample",font:{size:16}},margin:{l:55,r:20,t:50,b:90},yaxis:{title:"VA loss intensity (%)"},plot_bgcolor:"#fff"},{responsive:true,displaylogo:false});

  const sorted=[...visible].sort((a,b)=>b.va_p-a.va_p);
  $("province-table").innerHTML='<thead><tr><th>Province</th><th>VA loss (€m)</th><th>VA loss (%)</th><th>Workers lost</th><th>Worker loss (%)</th></tr></thead><tbody>'+sorted.map(x=>`<tr><td>${x.pn}</td><td>${fmt(x.va_m,1)}</td><td>${fmt(x.va_p,2)}</td><td>${fmt(x.w,0)}</td><td>${fmt(x.w_p,2)}</td></tr>`).join("")+"</tbody>";
}
function downloadProvinceCsv() {
  const prov=aggregateProvince(selectedRows()).filter(x=>!excludedProvinces.has(x.r)).sort((a,b)=>a.pn.localeCompare(b.pn));
  const lines=[["REF_AREA","province_name","VA_loss_EUR","VA_loss_percent","workers_lost","worker_loss_percent"].join(",")];
  for (const x of prov) lines.push([x.r,JSON.stringify(x.pn),x.l,x.va_p,x.w,x.w_p].join(","));
  const blob=new Blob([lines.join("\n")],{type:"text/csv;charset=utf-8"});
  const a=document.createElement("a");a.href=URL.createObjectURL(blob);
  a.download=`heat_stress_provinces_${$("period").value}_scenario_${$("scenario").value}.csv`;
  document.body.appendChild(a);a.click();a.remove();URL.revokeObjectURL(a.href);
}

function aggregateBranches(period,scenario) {
  const c=scenarioCols(scenario),m=new Map();
  for (const x of micro.filter(x=>x.p===period)) {
    if (!m.has(x.b)) m.set(x.b,{b:x.b,label:BRANCH_LABELS[x.b]||x.bd,va:0,n:0,l:0,w:0});
    const y=m.get(x.b);y.va+=x.va;y.n+=x.n;y.l+=x[c.l];y.w+=x[c.w];
  }
  const out=[...m.values()],total=out.reduce((s,x)=>s+x.l,0);
  return out.map(x=>({...x,intensity:x.va?100*x.l/x.va:0,contribution:total?100*x.l/total:0,workersIntensity:x.n?100*x.w/x.n:0})).sort((a,b)=>b.contribution-a.contribution);
}
function renderSector() {
  const rows=aggregateBranches($("s-period").value,$("s-scenario").value);
  const byIntensity=[...rows].sort((a,b)=>a.intensity-b.intensity);
  const byContribution=[...rows].sort((a,b)=>a.contribution-b.contribution);
  Plotly.react("sector-intensity",[{type:"bar",orientation:"h",x:byIntensity.map(x=>x.intensity),y:byIntensity.map(x=>`${x.b} · ${x.label}`),marker:{color:"#d95f0e"}}],
    {title:{text:"Branch-specific VA loss intensity",font:{size:16}},xaxis:{title:"VA loss intensity (%)"},margin:{l:245,r:20,t:50,b:45},plot_bgcolor:"#fff"},{responsive:true,displaylogo:false});
  Plotly.react("sector-contribution",[{type:"bar",orientation:"h",x:byContribution.map(x=>x.contribution),y:byContribution.map(x=>`${x.b} · ${x.label}`),marker:{color:"#2c7fb8"}}],
    {title:{text:"Contribution to national VA loss",font:{size:16}},xaxis:{title:"Contribution (%)"},margin:{l:245,r:20,t:50,b:45},plot_bgcolor:"#fff"},{responsive:true,displaylogo:false});
  $("sector-table").innerHTML='<thead><tr><th>Branch</th><th>VA loss (€bn)</th><th>VA loss intensity (%)</th><th>National contribution (%)</th><th>Worker loss intensity (%)</th></tr></thead><tbody>'+rows.map(x=>`<tr><td>${x.b} · ${x.label}</td><td>${fmt(x.l/1e9,3)}</td><td>${fmt(x.intensity,2)}</td><td>${fmt(x.contribution,2)}</td><td>${fmt(x.workersIntensity,2)}</td></tr>`).join("")+"</tbody>";
}

function rebuildUptake() {
  const p=$("a-period").value,m=$("a-measure").value;
  const vals=[...new Set(adaptProv.filter(x=>x.period_id===p&&x.measure===m).map(x=>num(x.uptake)))].sort((a,b)=>a-b);
  $("a-uptake").innerHTML="";
  vals.forEach(v=>$("a-uptake").add(new Option(`${Math.round(v*100)}%`,v)));
  if (vals.includes(.5)) $("a-uptake").value=.5;
}
function syncAdaptationCatalogue() {
  const selected=$("a-measure").value;
  document.querySelectorAll("[data-adaptation-measure]").forEach(card=>{
    const active=card.dataset.adaptationMeasure===selected;
    card.setAttribute("aria-pressed",String(active));
  });
}
function renderAdapt() {
  const p=$("a-period").value,m=$("a-measure").value,u=num($("a-uptake").value);
  syncAdaptationCatalogue();
  const rowsAll=adaptProv.filter(x=>x.period_id===p&&x.measure===m&&Math.abs(num(x.uptake)-u)<1e-9);
  const rows=rowsAll.filter(x=>!excludedProvinces.has(String(x.REF_AREA)));
  const nat=adaptNat.find(x=>x.period_id===p&&x.measure===m&&Math.abs(num(x.uptake)-u)<1e-9);
  if (nat) {
    $("a-va").textContent=moneyBn(num(nat.avoided_VA_loss_EUR_mean));$("a-vap").textContent=pct(num(nat.avoided_VA_percent_mean));
    $("a-w").textContent=fmt(num(nat.avoided_workers_lost_mean));$("a-wp").textContent=pct(num(nat.avoided_workers_percent_mean));
  }
  const vals=rows.map(x=>num(x.avoided_VA_percent_mean)),[zmin,zmax]=colorBounds(vals,$("a-color-mode").value);
  Plotly.react("amap",[{type:"choropleth",geojson:geo,locations:rows.map(x=>String(x.REF_AREA)),z:vals,zmin,zmax,zauto:false,
    featureidkey:"properties.REF_AREA",text:rows.map(x=>x.province_name),colorscale:"Greens",colorbar:{title:"Avoided VA (%)"},
    marker:{line:{color:"#fff",width:.7}},hovertemplate:"<b>%{text}</b><br>Avoided VA: %{z:.1f}%<extra></extra>"}],
    {geo:{fitbounds:"locations",visible:false,landcolor:"#f1f3f5",showland:true},margin:{l:0,r:0,t:10,b:0}},{responsive:true,displaylogo:false});

  const ir=adaptInt.filter(x=>x.period_id===p&&x.measure===m&&Math.abs(num(x.uptake)-u)<1e-9);
  Plotly.react("aint",[{type:"bar",x:ir.map(x=>x.work_intensity),y:ir.map(x=>num(x.avoided_VA_percent_mean)),marker:{color:"#2e8b57"}}],
    {title:{text:"Effectiveness by work intensity",font:{size:16}},yaxis:{title:"Avoided VA (%)"},margin:{l:60,r:20,t:50,b:80},plot_bgcolor:"#fff"},{responsive:true,displaylogo:false});

  renderBestAdaptation(p,u);
}
function renderBestAdaptation(p,u) {
  const indiv=adaptProv.filter(x=>x.period_id===p&&["shade","space_cooling","exoskeleton"].includes(x.measure)&&Math.abs(num(x.uptake)-u)<1e-9&&!excludedProvinces.has(String(x.REF_AREA)));
  const best=new Map();
  for (const x of indiv) {
    const r=String(x.REF_AREA),v=num(x.avoided_VA_percent_mean);
    if (!best.has(r)||v>best.get(r).v) best.set(r,{r,pn:x.province_name,measure:x.measure,v});
  }
  const labels={shade:"Shade",space_cooling:"Space cooling",exoskeleton:"Exoskeleton"};
  const colors={shade:"#2e8b57",space_cooling:"#377eb8",exoskeleton:"#e69f00"};
  const traces=[];
  for (const m of ["shade","space_cooling","exoskeleton"]) {
    const a=[...best.values()].filter(x=>x.measure===m);
    if (!a.length) continue;
    traces.push({type:"choropleth",geojson:geo,locations:a.map(x=>x.r),z:a.map(()=>1),zmin:0,zmax:1,featureidkey:"properties.REF_AREA",
      text:a.map(x=>x.pn),customdata:a.map(x=>[x.v]),colorscale:[[0,colors[m]],[1,colors[m]]],showscale:false,name:labels[m],showlegend:true,
      marker:{line:{color:"#fff",width:.7}},hovertemplate:`<b>%{text}</b><br>${labels[m]}<br>Avoided VA: %{customdata[0]:.1f}%<extra></extra>`});
  }
  Plotly.react("best-adaptation",traces,{title:{text:"Most effective stand-alone measure by province",font:{size:16}},
    geo:{fitbounds:"locations",visible:false,landcolor:"#f1f3f5",showland:true},legend:{orientation:"h",y:-.05},margin:{l:0,r:0,t:50,b:40}},{responsive:true,displaylogo:false});
}

function renderUncertainty() {
  const outcome=$("u-outcome").value,period=$("u-period").value;
  const main=PERIODS.map(([pid,label])=>{
    const r=robustness.find(x=>x.period_id===pid&&x.scenario_id==="MAIN_ISO_MAIN_EXPOSURE");
    return {label,r};
  }).filter(x=>x.r);
  const isVA=outcome==="va",div=isVA?1e9:1;
  const meanKey=isVA?"VA_loss_EUR_mean":"workers_lost_mean",p05Key=isVA?"VA_loss_EUR_p05":"workers_lost_p05",p95Key=isVA?"VA_loss_EUR_p95":"workers_lost_p95";
  const unit=isVA?"€ billion":"equivalent workers";
  Plotly.react("uncertainty-main",[{
    type:"scatter",mode:"lines+markers",x:main.map(x=>x.label),y:main.map(x=>num(x.r[meanKey])/div),
    error_y:{type:"data",symmetric:false,array:main.map(x=>(num(x.r[p95Key])-num(x.r[meanKey]))/div),arrayminus:main.map(x=>(num(x.r[meanKey])-num(x.r[p05Key]))/div),thickness:1.5,width:5},
    line:{color:"#172033",width:3},marker:{size:9},name:"Mean with P05–P95"
  }],{title:{text:"Climate-model dispersion · main ISO specification",font:{size:16}},yaxis:{title:unit},margin:{l:70,r:20,t:55,b:90},plot_bgcolor:"#fff"},{responsive:true,displaylogo:false});

  const order=["MAIN_ISO_MAIN_EXPOSURE","SENSITIVITY_ISO_HIGH_OUTDOOR_SHARE","SENSITIVITY_NIOSH_MAIN_EXPOSURE","SENSITIVITY_ISO_LOW_OUTDOOR_SHARE","SENSITIVITY_HOTHAPS_MAIN_EXPOSURE"];
  const rr=order.map(s=>robustness.find(x=>x.period_id===period&&x.scenario_id===s)).filter(Boolean);
  Plotly.react("robustness-bar",[{
    type:"bar",x:rr.map(x=>ROBUST_LABELS[x.scenario_id]||x.scenario_id),y:rr.map(x=>num(x[meanKey])/div),
    error_y:{type:"data",symmetric:false,array:rr.map(x=>(num(x[p95Key])-num(x[meanKey]))/div),arrayminus:rr.map(x=>(num(x[meanKey])-num(x[p05Key]))/div),thickness:1.3,width:4},
    marker:{color:rr.map(x=>x.scenario_id==="MAIN_ISO_MAIN_EXPOSURE"?"#172033":"#8ea3b7")}
  }],{title:{text:"Methodological robustness · mean and P05–P95",font:{size:16}},yaxis:{title:unit},xaxis:{tickangle:-25},margin:{l:70,r:20,t:55,b:130},plot_bgcolor:"#fff"},{responsive:true,displaylogo:false});
}

function bind() {
  document.querySelectorAll(".tab").forEach(btn=>btn.addEventListener("click",()=>{
    const target = $(btn.dataset.view);
    if (!target) return;
    document.querySelectorAll(".tab").forEach(x=>x.classList.remove("active"));btn.classList.add("active");
    document.querySelectorAll(".view").forEach(x=>x.classList.add("hidden"));target.classList.remove("hidden");
    if (btn.dataset.view==="micro") renderMicro();
    if (btn.dataset.view==="sector") renderSector();
    if (btn.dataset.view==="adapt") renderAdapt();
    if (btn.dataset.view==="uncertainty") renderUncertainty();
  }));

  ["period","branch","intensity","exposure"].forEach(id=>$(id).addEventListener("change",()=>{rebuildAteco();renderMicro();}));
  ["scenario","metric","ateco","color-mode"].forEach(id=>$(id).addEventListener("change",renderMicro));
  $("exclude-province").addEventListener("click",excludeSelectedProvince);
  $("clear-exclusions").addEventListener("click",clearExclusions);
  $("download-csv").addEventListener("click",downloadProvinceCsv);

  ["s-period","s-scenario"].forEach(id=>$(id).addEventListener("change",renderSector));
  ["a-period","a-measure"].forEach(id=>$(id).addEventListener("change",()=>{rebuildUptake();renderAdapt();}));
  ["a-uptake","a-color-mode"].forEach(id=>$(id).addEventListener("change",renderAdapt));
  document.querySelectorAll("[data-adaptation-measure]").forEach(card=>card.addEventListener("click",()=>{
    $("a-measure").value=card.dataset.adaptationMeasure;rebuildUptake();renderAdapt();
  }));
  ["u-outcome","u-period"].forEach(id=>$(id).addEventListener("change",renderUncertainty));
}

(async()=>{
  try {
    await loadAll();initOptions();bind();
    const requestedView=new URLSearchParams(location.search).get("view");
    const initialView=requestedView&&$(requestedView)&&document.querySelector(`.tab[data-view="${CSS.escape(requestedView)}"]`)?requestedView:"overview";
    document.querySelectorAll(".view").forEach(view=>view.classList.add("hidden"));
    $(initialView).classList.remove("hidden");
    $("loading").classList.add("hidden");
    renderMicro();
    document.dispatchEvent(new CustomEvent("dashboard:data-ready"));
  } catch(e) {
    $("loading").classList.add("hidden");
    const errorBox=$("error");errorBox.classList.remove("hidden");errorBox.replaceChildren();
    const message=document.createElement("p");message.textContent="The dashboard data could not be loaded. "+e.message;
    const retry=document.createElement("button");retry.type="button";retry.className="btn";retry.textContent="Retry loading";retry.onclick=()=>location.reload();
    errorBox.append(message,retry);console.error(e);
  }
})();

(() => {
  const DATA_URL = "/workforce_composition_web.json.gz.b64";
  const GEO_URL = "/economic_geography_103_simplified.geojson";

  const ORDER = ["clerical", "light_physical", "moderate_physical", "heavy_physical"];
  const LABEL = {
    clerical: "Clerical / cognitive",
    light_physical: "Light physical",
    moderate_physical: "Moderate physical",
    heavy_physical: "Heavy physical",
  };
  const COLOR = {
    clerical: "#4C78A8",
    light_physical: "#72B7B2",
    moderate_physical: "#F2CF5B",
    heavy_physical: "#E45756",
  };
  const MAP_SCALE = {
    clerical: [[0,"#eff3ff"],[0.25,"#bdd7e7"],[0.5,"#6baed6"],[0.75,"#3182bd"],[1,"#08519c"]],
    light_physical: [[0,"#f0fdfa"],[0.25,"#b2e2e2"],[0.5,"#66c2a4"],[0.75,"#2ca25f"],[1,"#006d2c"]],
    moderate_physical: [[0,"#ffffe5"],[0.25,"#fff7bc"],[0.5,"#fec44f"],[0.75,"#d95f0e"],[1,"#993404"]],
    heavy_physical: [[0,"#fff5f0"],[0.25,"#fcbba1"],[0.5,"#fb6a4a"],[0.75,"#de2d26"],[1,"#a50f15"]],
  };

  let payload = null;
  let records = [];
  let wfGeo = null;

  const el = id => document.getElementById(id);
  const n = x => Number(x || 0);
  const f = (x, d=1) => n(x).toLocaleString("en-US", {minimumFractionDigits:d, maximumFractionDigits:d});

  async function fetchOptional(url) {
    const r = await fetch(url, {cache:"no-store"});
    if (r.status === 404) return null;
    if (!r.ok) throw new Error(`${url}: ${r.status}`);
    return r.json();
  }

  async function fetchCompressedJsonBase64(url) {
    const r = await fetch(url, {cache:"no-store"});
    if (r.status === 404) return null;
    if (!r.ok) throw new Error(`${url}: ${r.status}`);
    const b64 = (await r.text()).replace(/\s+/g, "");
    if (!b64 || b64.length % 4 !== 0) throw new Error("Workforce payload is incomplete.");
    const bin = atob(b64);
    const bytes = Uint8Array.from(bin, ch => ch.charCodeAt(0));
    const ds = new DecompressionStream("gzip");
    const jsonText = await new Response(new Blob([bytes]).stream().pipeThrough(ds)).text();
    return JSON.parse(jsonText);
  }

  function roleForYear(year) {
    return Number(year) === 2035 ? "CEDEFOP_2035_composition_only" : "observed";
  }

  function addUi() {
    if (document.querySelector('[data-view="workforce"]')) return;
    const nav = document.querySelector("nav.tabs");
    if (!nav) return;

    const btn = document.createElement("button");
    btn.className = "tab";
    btn.dataset.view = "workforce";
    btn.textContent = "Workforce composition";
    const notesBtn = nav.querySelector('[data-view="notes"]');
    nav.insertBefore(btn, notesBtn || null);

    const section = document.createElement("section");
    section.id = "workforce";
    section.className = "view hidden";
    section.innerHTML = `
      <div class="filters card">
        <label>Employment scope<select id="wf-scope">
          <option value="whole_project">Whole project denominator</option>
          <option value="non_ag_ASIA">Non-agriculture ASIA only</option>
        </select></label>
        <label>Composition chart<select id="wf-location"></select></label>
        <label>Map year<select id="wf-year"></select></label>
        <label>Map work intensity<select id="wf-intensity"></select></label>
      </div>
      <div class="card prose compact">
        <p><strong>Observed vs scenario.</strong> 2018–2023 use observed project employment. The 2035 point is a CEDEFOP-based composition-only scenario: sector growth changes the weights of the 2023 project economy, while total project employment is held fixed. It is not a direct forecast of the four work-intensity classes.</p>
        <p id="wf-caveat" class="hint"></p>
      </div>
      <div class="grid2">
        <div class="card"><div id="wf-stack" class="plot small"></div></div>
        <div class="card"><div id="wf-compare" class="plot small"></div></div>
      </div>
      <div class="card">
        <div class="card-head"><h3>Provincial workforce composition</h3><span id="wf-map-note" class="hint"></span></div>
        <div id="wf-map" class="plot"></div>
      </div>
      <div class="card table-card">
        <h3>Work-intensity shares · selected geography</h3>
        <div class="table-wrap"><table id="wf-table"></table></div>
      </div>`;

    const notes = document.getElementById("notes");
    if (notes?.parentNode) notes.parentNode.insertBefore(section, notes);
    else document.querySelector("main.shell")?.appendChild(section);

    btn.addEventListener("click", () => {
      document.querySelectorAll(".tab").forEach(x => x.classList.remove("active"));
      btn.classList.add("active");
      document.querySelectorAll(".view").forEach(x => x.classList.add("hidden"));
      section.classList.remove("hidden");
      renderAll();
    });
  }

  function initControls() {
    const provinces = [...new Map(
      records.filter(x => x.geography_level === "province")
        .map(x => [String(x.REF_AREA), x.province_name])
    ).entries()].sort((a,b) => String(a[1]).localeCompare(String(b[1])));

    el("wf-location").innerHTML = '<option value="ITALY">Italy</option>' +
      provinces.map(([r,name]) => `<option value="${r}">${name}</option>`).join("");

    const years = [...new Set(records.map(x => Number(x.year)))].sort((a,b)=>a-b);
    el("wf-year").innerHTML = years.map(y =>
      `<option value="${y}">${y}${y===2035 ? " · CEDEFOP scenario" : " · observed"}</option>`
    ).join("");
    el("wf-year").value = years.includes(2023) ? "2023" : String(years[years.length-1]);

    el("wf-intensity").innerHTML = ORDER.map(k => `<option value="${k}">${LABEL[k]}</option>`).join("");
    el("wf-intensity").value = "heavy_physical";

    ["wf-scope","wf-location","wf-year","wf-intensity"].forEach(id =>
      el(id).addEventListener("change", renderAll)
    );
  }

  function rowsFor(scope, geography, year=null) {
    const level = geography === "ITALY" ? "national" : "province";
    return records.filter(x =>
      x.scope === scope &&
      x.geography_level === level &&
      String(x.REF_AREA) === geography &&
      (year == null || Number(x.year) === Number(year)) &&
      x.data_role === roleForYear(x.year)
    );
  }

  function byIntensity(rows) {
    const m = new Map(rows.map(x => [x.work_intensity, x]));
    return ORDER.map(k => m.get(k) || {work_intensity:k, workers:0, employment_share_pct:0, employment_total:0});
  }

  function renderStack(scope, geography) {
    const all = rowsFor(scope, geography);
    const years = [...new Set(all.map(x => Number(x.year)))].sort((a,b)=>a-b);
    const traces = ORDER.map(k => ({
      type:"bar",
      name:LABEL[k],
      x:years.map(y => y===2035 ? "2035*" : String(y)),
      y:years.map(y => n(all.find(x => Number(x.year)===y && x.work_intensity===k)?.employment_share_pct)),
      marker:{color:COLOR[k]},
      hovertemplate:`${LABEL[k]}<br>%{x}: %{y:.2f}%<extra></extra>`,
    }));
    Plotly.react("wf-stack", traces, {
      barmode:"stack",
      title:{text:`Workforce composition · ${geography === "ITALY" ? "Italy" : rowsFor(scope, geography, 2023)[0]?.province_name || geography}`,font:{size:16}},
      yaxis:{title:"Employment share (%)",range:[0,100]},
      xaxis:{title:"Observed 2018–2023 · 2035* CEDEFOP composition scenario"},
      margin:{l:60,r:20,t:55,b:70},
      legend:{orientation:"h",y:-0.25},
      plot_bgcolor:"#fff",
    }, {responsive:true,displaylogo:false});
  }

  function renderCompare(scope, geography) {
    const r23 = byIntensity(rowsFor(scope, geography, 2023));
    const r35 = byIntensity(rowsFor(scope, geography, 2035));
    Plotly.react("wf-compare", [
      {type:"bar",name:"2023 observed",x:ORDER.map(k=>LABEL[k]),y:r23.map(x=>n(x.employment_share_pct)),marker:{color:"#8ea3b7"}},
      {type:"bar",name:"2035 CEDEFOP scenario",x:ORDER.map(k=>LABEL[k]),y:r35.map(x=>n(x.employment_share_pct)),marker:{color:"#172033"}},
    ], {
      barmode:"group",
      title:{text:"Latest observed vs medium-term structural scenario",font:{size:16}},
      yaxis:{title:"Employment share (%)"},
      xaxis:{tickangle:-15},
      margin:{l:60,r:20,t:55,b:90},
      legend:{orientation:"h",y:-0.27},
      plot_bgcolor:"#fff",
    }, {responsive:true,displaylogo:false});
  }

  function renderMap(scope, year, intensity) {
    const role = roleForYear(year);
    const rows = records.filter(x =>
      x.scope===scope && x.geography_level==="province" && Number(x.year)===Number(year) &&
      x.data_role===role && x.work_intensity===intensity
    );
    if (!rows.length) return;
    const vals = rows.map(x=>n(x.employment_share_pct)).filter(Number.isFinite).sort((a,b)=>a-b);
    const q = p => {
      if (!vals.length) return 0;
      const pos=(vals.length-1)*p,lo=Math.floor(pos),hi=Math.ceil(pos);
      return lo===hi?vals[lo]:vals[lo]+(vals[hi]-vals[lo])*(pos-lo);
    };
    let zmin=q(.05), zmax=q(.95);
    if (!(zmax>zmin)) {zmin=Math.min(...vals);zmax=Math.max(...vals)||1;}
    el("wf-map-note").textContent = `${year===2035 ? "CEDEFOP composition scenario" : "Observed"} · adaptive 5th–95th percentile colours`;

    Plotly.react("wf-map", [{
      type:"choropleth",
      geojson:wfGeo,
      locations:rows.map(x=>String(x.REF_AREA)),
      z:rows.map(x=>n(x.employment_share_pct)),
      zmin,zmax,zauto:false,
      featureidkey:"properties.REF_AREA",
      text:rows.map(x=>x.province_name),
      colorscale:MAP_SCALE[intensity],
      colorbar:{title:"Employment share (%)"},
      marker:{line:{color:"#fff",width:.7}},
      customdata:rows.map(x=>[n(x.workers),n(x.employment_total)]),
      hovertemplate:`<b>%{text}</b><br>${LABEL[intensity]}: %{z:.2f}%<br>Workers: %{customdata[0]:,.0f}<br>Total: %{customdata[1]:,.0f}<extra></extra>`,
    }], {
      geo:{fitbounds:"locations",visible:false,landcolor:"#f1f3f5",showland:true},
      margin:{l:0,r:0,t:10,b:0},
    }, {responsive:true,displaylogo:false});
  }

  function renderTable(scope, geography) {
    const years = [2018,2023,2035];
    const r = Object.fromEntries(years.map(y => [y, new Map(byIntensity(rowsFor(scope, geography, y)).map(x=>[x.work_intensity,x]))]));
    const name = geography === "ITALY" ? "Italy" : rowsFor(scope, geography, 2023)[0]?.province_name || geography;
    const body = ORDER.map(k => {
      const a=n(r[2018].get(k)?.employment_share_pct), b=n(r[2023].get(k)?.employment_share_pct), c=n(r[2035].get(k)?.employment_share_pct);
      return `<tr><td>${LABEL[k]}</td><td>${f(a,2)}</td><td>${f(b,2)}</td><td>${f(b-a,2)}</td><td>${f(c,2)}</td><td>${f(c-b,2)}</td></tr>`;
    }).join("");
    el("wf-table").innerHTML = `<thead><tr><th>${name}</th><th>2018 observed (%)</th><th>2023 observed (%)</th><th>2018→2023 (pp)</th><th>2035 scenario (%)</th><th>2023→2035 (pp)</th></tr></thead><tbody>${body}</tbody>`;
  }

  function renderCaveat(scope) {
    el("wf-caveat").textContent = scope === "whole_project"
      ? "Whole-project view includes agriculture from the separate ISTAT territorial employment module. This is consistent with the paper's full employment denominator, but the agriculture employment concept is not identical to the non-agriculture ASIA addetti concept. Use the non-agriculture ASIA view for a source-homogeneous empirical series."
      : "Non-agriculture ASIA view uses one source-homogeneous ATECO5 employment layer. Agriculture is excluded from this scope.";
  }

  function renderAll() {
    if (!payload || !document.getElementById("workforce")) return;
    const scope=el("wf-scope").value, geography=el("wf-location").value;
    const year=Number(el("wf-year").value), intensity=el("wf-intensity").value;
    renderCaveat(scope);
    renderStack(scope, geography);
    renderCompare(scope, geography);
    renderMap(scope, year, intensity);
    renderTable(scope, geography);
  }

  async function init() {
    try {
      const data = await fetchCompressedJsonBase64(DATA_URL);
      if (!data) return;
      const g = await fetchOptional(GEO_URL);
      if (!g) throw new Error("Workforce map geography is missing.");
      payload=data; records=Array.isArray(data.records)?data.records:[]; wfGeo=g;
      if (!records.length) throw new Error("Workforce composition dataset has no records.");
      addUi();
      initControls();
      renderAll();
      console.info("Workforce composition module loaded", data.metadata || {});
    } catch (err) {
      console.error("Workforce composition module not loaded:", err);
    }
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init, {once:true});
  else init();
})();

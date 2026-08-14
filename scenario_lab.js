(() => {
  let attempts = 0;
  const METHODS = [
    ["MAIN_ISO_MAIN_EXPOSURE", "ISO · main exposure"],
    ["SENSITIVITY_ISO_HIGH_OUTDOOR_SHARE", "ISO · high outdoor share"],
    ["SENSITIVITY_NIOSH_MAIN_EXPOSURE", "NIOSH · main exposure"],
    ["SENSITIVITY_ISO_LOW_OUTDOOR_SHARE", "ISO · low outdoor share"],
    ["SENSITIVITY_HOTHAPS_MAIN_EXPOSURE", "Hothaps · main exposure"],
  ];
  const MAIN = "MAIN_ISO_MAIN_EXPOSURE";
  const ADAPT = [["0","No adaptation"],["50","Combined · 50%"],["75","Combined · 75%"]];
  const METRICS = [
    ["va_pct","VA loss intensity (%)"],
    ["va_eur","VA loss"],
    ["workers_pct","Worker loss intensity (%)"],
    ["workers","Equivalent workers lost"],
  ];
  const $ = id => document.getElementById(id);
  const n = x => Number(x || 0);
  const esc = s => String(s).replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;","'":"&#39;"}[c]));
  const pshort = p => (PERIODS.find(x=>x[0]===p)?.[1] || p).split(" · ")[0];
  const methodLabel = id => METHODS.find(x=>x[0]===id)?.[1] || id;
  const adaptLabel = v => ADAPT.find(x=>x[0]===String(v))?.[1] || v;

  function ready(){
    return window.Plotly && typeof micro !== "undefined" && Array.isArray(micro) && micro.length &&
      typeof robustness !== "undefined" && Array.isArray(robustness) && robustness.length &&
      typeof adaptNat !== "undefined" && Array.isArray(adaptNat) && adaptNat.length &&
      typeof adaptProv !== "undefined" && Array.isArray(adaptProv) && adaptProv.length &&
      typeof PERIODS !== "undefined" && Array.isArray(PERIODS) && document.querySelector("nav.tabs");
  }

  function addStyles(){
    if($("sl-style")) return;
    const s=document.createElement("style");s.id="sl-style";
    s.textContent=`
      .sl-hero{display:grid;grid-template-columns:1.35fr .65fr;gap:16px}.sl-toolbar{display:grid;grid-template-columns:1fr 1.3fr 1fr auto;gap:12px;align-items:end}
      .sl-toolbar label,.sl-card label{font-size:13px;color:var(--muted);display:flex;flex-direction:column;gap:6px}.sl-toolbar select,.sl-toolbar input,.sl-card select{width:100%;padding:10px;border:1px solid var(--line);border-radius:9px;background:#fff;color:var(--ink)}
      .sl-presets{display:flex;gap:8px;flex-wrap:wrap}.sl-presets button,.sl-btn{border:1px solid var(--line);background:#fff;padding:8px 11px;border-radius:9px;cursor:pointer;font-weight:600}.sl-presets button:hover,.sl-btn:hover{background:#f7f9fc}
      .sl-scenarios{display:grid;grid-template-columns:1fr 1fr;gap:16px}.sl-card{border:1px solid var(--line);background:#fff;border-radius:13px;padding:16px}.sl-card h3{margin:0 0 12px}.sl-controls{display:grid;grid-template-columns:1fr 1fr 1fr;gap:10px}
      .sl-valid{margin-top:10px;font-size:12px;color:var(--muted);line-height:1.45}.sl-valid strong{color:var(--ink)}.sl-kpis{display:grid;grid-template-columns:repeat(5,1fr);gap:12px;margin:16px 0}.sl-kpi{background:#fff;border:1px solid var(--line);border-radius:12px;padding:14px}.sl-kpi span{display:block;color:var(--muted);font-size:11px;margin-bottom:5px}.sl-kpi strong{font-size:20px}.sl-kpi small{display:block;color:var(--muted);margin-top:4px}
      .sl-grid{display:grid;grid-template-columns:1fr 1fr;gap:16px}.sl-plot{height:440px}.sl-note{line-height:1.55}.sl-badge{display:inline-flex;padding:4px 8px;border-radius:999px;font-size:11px;font-weight:700;background:#eef2f6;color:#344054;margin-right:6px}.sl-search.hidden{display:none}.sl-actions{display:flex;gap:8px;flex-wrap:wrap;margin-top:12px}
      @media(max-width:1000px){.sl-hero,.sl-grid,.sl-scenarios{grid-template-columns:1fr}.sl-toolbar{grid-template-columns:1fr 1fr}.sl-kpis{grid-template-columns:1fr 1fr}.sl-controls{grid-template-columns:1fr 1fr}}
      @media(max-width:650px){.sl-toolbar,.sl-controls,.sl-kpis{grid-template-columns:1fr}}
    `;document.head.appendChild(s);
  }

  function entityOptions(type, query=""){
    if(type==="italy") return [["ITALY","Italy"]];
    if(type==="province") return [...new Map(micro.map(x=>[String(x.r),x.pn])).entries()].sort((a,b)=>a[1].localeCompare(b[1]));
    if(type==="branch") return [...new Map(micro.map(x=>[String(x.b),`${x.b} · ${(typeof BRANCH_LABELS!=="undefined"&&BRANCH_LABELS[x.b])||x.bd}`])).entries()].sort((a,b)=>a[0].localeCompare(b[0]));
    query=query.trim().toLowerCase();
    const vals=[...new Map(micro.filter(x=>x.level==="ATECO5").map(x=>[String(x.s),`${x.s} · ${x.sd}`])).entries()].sort((a,b)=>a[0].localeCompare(b[0]));
    return query?vals.filter(([v,l])=>v.toLowerCase().includes(query)||l.toLowerCase().includes(query)):vals;
  }

  function rows(type,id,period){
    const p=micro.filter(x=>x.p===period);
    if(type==="italy") return p;
    if(type==="province") return p.filter(x=>String(x.r)===String(id));
    if(type==="branch") return p.filter(x=>String(x.b)===String(id));
    return p.filter(x=>x.level==="ATECO5"&&String(x.s)===String(id));
  }

  function meanAggregate(type,id,period,adapt){
    const c=String(adapt)==="50"?["l50","w50"]:String(adapt)==="75"?["l75","w75"]:["l0","w0"];
    const rr=rows(type,id,period),a={va:0,n:0,l:0,w:0};
    rr.forEach(x=>{a.va+=n(x.va);a.n+=n(x.n);a.l+=n(x[c[0]]);a.w+=n(x[c[1]]);});
    a.va_pct=a.va?100*a.l/a.va:0;a.workers_pct=a.n?100*a.w/a.n:0;return a;
  }

  function addIntervals(a, l05, l95, w05, w95){
    a.l05=n(l05);a.l95=n(l95);a.w05=n(w05);a.w95=n(w95);
    a.va_pct05=a.va?100*a.l05/a.va:null;a.va_pct95=a.va?100*a.l95/a.va:null;
    a.workers_pct05=a.n?100*a.w05/a.n:null;a.workers_pct95=a.n?100*a.w95/a.n:null;
    return a;
  }

  function nationalMain(period,adapt){
    const a=meanAggregate("italy","ITALY",period,adapt);
    let r=null;
    if(String(adapt)==="0") r=adaptNat.find(x=>x.period_id===period&&String(x.scenario_id)==="NO_ADAPTATION");
    else r=adaptNat.find(x=>x.period_id===period&&x.measure==="combined"&&Math.abs(n(x.uptake)-n(adapt)/100)<1e-9);
    if(!r) return a;
    if(String(adapt)==="0") return addIntervals(a,r.noadapt_VA_loss_EUR_p05,r.noadapt_VA_loss_EUR_p95,r.noadapt_workers_lost_p05,r.noadapt_workers_lost_p95);
    return addIntervals(a,r.adapted_VA_loss_EUR_p05,r.adapted_VA_loss_EUR_p95,r.adapted_workers_lost_p05,r.adapted_workers_lost_p95);
  }

  function provinceMain(id,period,adapt){
    const a=meanAggregate("province",id,period,adapt);
    let r=null;
    if(String(adapt)==="0") r=adaptProv.find(x=>x.period_id===period&&String(x.REF_AREA)===String(id)&&x.measure==="combined"&&Math.abs(n(x.uptake)-.5)<1e-9);
    else r=adaptProv.find(x=>x.period_id===period&&String(x.REF_AREA)===String(id)&&x.measure==="combined"&&Math.abs(n(x.uptake)-n(adapt)/100)<1e-9);
    if(!r) return a;
    if(String(adapt)==="0") return addIntervals(a,r.noadapt_VA_loss_EUR_p05,r.noadapt_VA_loss_EUR_p95,r.noadapt_workers_lost_p05,r.noadapt_workers_lost_p95);
    return addIntervals(a,r.adapted_VA_loss_EUR_p05,r.adapted_VA_loss_EUR_p95,r.adapted_workers_lost_p05,r.adapted_workers_lost_p95);
  }

  function nationalRobust(period,method){
    const base=meanAggregate("italy","ITALY",period,"0"),r=robustness.find(x=>x.period_id===period&&x.scenario_id===method);
    if(!r) return base;
    base.l=n(r.VA_loss_EUR_mean);base.w=n(r.workers_lost_mean);base.va_pct=100*n(r.VA_loss_share_mean);base.workers_pct=100*n(r.workers_loss_share_mean);
    return addIntervals(base,r.VA_loss_EUR_p05,r.VA_loss_EUR_p95,r.workers_lost_p05,r.workers_lost_p95);
  }

  function result(side, periodOverride=null){
    const type=$("sl-type").value,id=$("sl-entity").value;
    const period=periodOverride||$(`sl-${side}-period`).value,adapt=$(`sl-${side}-adapt`).value,method=$(`sl-${side}-method`).value;
    if(type==="italy"&&method!==MAIN) return nationalRobust(period,method);
    if(type==="italy") return nationalMain(period,adapt);
    if(type==="province") return provinceMain(id,period,adapt);
    return meanAggregate(type,id,period,adapt);
  }

  function metricVal(a,k){return k==="va_eur"?a.l:k==="workers"?a.w:k==="workers_pct"?a.workers_pct:a.va_pct;}
  function metricInterval(a,k){
    if(k==="va_eur") return [a.l05,a.l95];if(k==="workers") return [a.w05,a.w95];if(k==="workers_pct") return [a.workers_pct05,a.workers_pct95];return [a.va_pct05,a.va_pct95];
  }
  function metricSpec(){
    const k=$("sl-metric").value,type=$("sl-type").value;
    if(k==="va_eur") return {k,scale:type==="italy"?1e9:1e6,title:type==="italy"?"VA loss (€ billion)":"VA loss (€ million)"};
    if(k==="workers") return {k,scale:1,title:"Equivalent workers lost"};
    if(k==="workers_pct") return {k,scale:1,title:"Worker loss intensity (%)"};
    return {k,scale:1,title:"VA loss intensity (%)"};
  }
  function fmtValue(v,s){
    if(!Number.isFinite(v)) return "—";
    if(s.k==="va_eur") return $("sl-type").value==="italy"?`€${(v/1e9).toLocaleString("en-US",{minimumFractionDigits:2,maximumFractionDigits:2})}bn`:`€${(v/1e6).toLocaleString("en-US",{minimumFractionDigits:1,maximumFractionDigits:1})}m`;
    if(s.k.includes("pct")) return `${v.toLocaleString("en-US",{minimumFractionDigits:2,maximumFractionDigits:2})}%`;
    return v.toLocaleString("en-US",{maximumFractionDigits:0});
  }
  function fmtDelta(v,s){if(!Number.isFinite(v))return"—";const sign=v>0?"+":"";if(s.k==="va_eur")return sign+fmtValue(v,s);if(s.k.includes("pct"))return `${sign}${v.toFixed(2)} pp`;return `${sign}${v.toLocaleString("en-US",{maximumFractionDigits:0})}`;}

  function constrainSide(side){
    const type=$("sl-type").value,method=$(`sl-${side}-method`),adapt=$(`sl-${side}-adapt`);
    if(type!=="italy") {method.value=MAIN;method.disabled=true;} else method.disabled=false;
    if(method.value!==MAIN){adapt.value="0";adapt.disabled=true;} else adapt.disabled=false;
    const note=$(`sl-${side}-valid`);
    note.innerHTML=method.value!==MAIN?`<strong>National robustness output.</strong> Alternative methodologies are archived at Italy level without adaptation.`:`<strong>Validated main model.</strong> ${type==="italy"||type==="province"?"Ensemble P05–P95 is available for this selection.":"Branch/activity values are ensemble means; no separate P05–P95 micro-distribution is stored."}`;
  }

  function populateEntity(keep=true){
    const type=$("sl-type").value,sel=$("sl-entity"),old=keep?sel.value:"",q=$("sl-search")?.value||"";
    const vals=entityOptions(type,q);sel.innerHTML="";vals.forEach(([v,l])=>sel.add(new Option(l,v)));
    if(vals.some(x=>x[0]===old)) sel.value=old;
    if(!sel.value&&vals.length) sel.value=vals[0][0];
    sel.disabled=type==="italy";
    $("sl-search-wrap").classList.toggle("hidden",type!=="activity");
    constrainSide("a");constrainSide("b");
  }

  function scenarioText(side){return `${pshort($(`sl-${side}-period`).value)} · ${adaptLabel($(`sl-${side}-adapt`).value)} · ${methodLabel($(`sl-${side}-method`).value)}`;}

  function decomposition(){
    const type=$("sl-type").value,id=$("sl-entity").value,ma=$(`sl-a-method`).value,mb=$(`sl-b-method`).value;
    if(ma!==MAIN||mb!==MAIN){$("sl-driver-note").textContent="Driver decomposition is unavailable for alternative methodological sensitivities because those archived outputs are national aggregates.";Plotly.purge("sl-drivers");return;}
    const pa=$("sl-a-period").value,pb=$("sl-b-period").value,aa=$("sl-a-adapt").value,ab=$("sl-b-adapt").value,s=metricSpec();
    let key,label,ra,rb;
    if(type==="italy"||type==="province"){key=x=>String(x.b);label=x=>`${x.b} · ${(typeof BRANCH_LABELS!=="undefined"&&BRANCH_LABELS[x.b])||x.bd}`;ra=rows(type,id,pa);rb=rows(type,id,pb);}
    else if(type==="branch"){key=x=>String(x.s);label=x=>`${x.s} · ${x.sd}`;ra=rows(type,id,pa).filter(x=>x.level==="ATECO5");rb=rows(type,id,pb).filter(x=>x.level==="ATECO5");}
    else {key=x=>String(x.r);label=x=>x.pn;ra=rows(type,id,pa);rb=rows(type,id,pb);}
    const group=(rr,adapt)=>{const m=new Map();rr.forEach(x=>{const k=key(x);if(!m.has(k))m.set(k,{label:label(x),rows:[]});m.get(k).rows.push(x);});return new Map([...m.entries()].map(([k,v])=>[k,{label:v.label,a:(()=>{const c=String(adapt)==="50"?["l50","w50"]:String(adapt)==="75"?["l75","w75"]:["l0","w0"],z={va:0,n:0,l:0,w:0};v.rows.forEach(x=>{z.va+=n(x.va);z.n+=n(x.n);z.l+=n(x[c[0]]);z.w+=n(x[c[1]]);});z.va_pct=z.va?100*z.l/z.va:0;z.workers_pct=z.n?100*z.w/z.n:0;return z;})()}]));};
    const ga=group(ra,aa),gb=group(rb,ab),keys=new Set([...ga.keys(),...gb.keys()]),out=[];
    keys.forEach(k=>{const A=ga.get(k),B=gb.get(k),av=A?metricVal(A.a,s.k):0,bv=B?metricVal(B.a,s.k):0;out.push({label:B?.label||A?.label||k,d:(bv-av)/s.scale});});
    out.sort((a,b)=>Math.abs(b.d)-Math.abs(a.d));const top=out.slice(0,15).sort((a,b)=>a.d-b.d);
    $("sl-driver-note").textContent=type==="italy"||type==="province"?"Largest branch contributions to the B−A change.":type==="branch"?"Largest ATECO5 contributions to the B−A change. Agriculture is not artificially disaggregated.":"Provinces contributing most to the B−A change for this activity.";
    Plotly.react("sl-drivers",[{type:"bar",orientation:"h",x:top.map(x=>x.d),y:top.map(x=>x.label),marker:{color:top.map(x=>x.d>=0?"#b42318":"#067647")},hovertemplate:"<b>%{y}</b><br>B − A: %{x:+.2f}<extra></extra>"}],{title:{text:"What drives the B − A difference?",font:{size:16}},xaxis:{title:`Change in ${s.title}`},margin:{l:230,r:25,t:55,b:50},plot_bgcolor:"#fff"},{responsive:true,displaylogo:false});
  }

  function render(){
    constrainSide("a");constrainSide("b");const s=metricSpec(),A=result("a"),B=result("b"),av=metricVal(A,s.k),bv=metricVal(B,s.k),d=bv-av,rel=av?100*d/Math.abs(av):null;
    $("sl-a-value").textContent=fmtValue(av,s);$("sl-b-value").textContent=fmtValue(bv,s);$("sl-delta").textContent=fmtDelta(d,s);$("sl-rel").textContent=Number.isFinite(rel)?`${rel>=0?"+":""}${rel.toFixed(1)}%`:"—";
    const ai=metricInterval(A,s.k),bi=metricInterval(B,s.k);$("sl-a-range").textContent=Number.isFinite(ai[0])&&Number.isFinite(ai[1])?`P05–P95 ${fmtValue(ai[0],s)} – ${fmtValue(ai[1],s)}`:"No separate micro P05–P95";$("sl-b-range").textContent=Number.isFinite(bi[0])&&Number.isFinite(bi[1])?`P05–P95 ${fmtValue(bi[0],s)} – ${fmtValue(bi[1],s)}`:"No separate micro P05–P95";
    $("sl-a-desc").textContent=scenarioText("a");$("sl-b-desc").textContent=scenarioText("b");
    Plotly.react("sl-ab",[{type:"bar",x:["Scenario A","Scenario B"],y:[av/s.scale,bv/s.scale],marker:{color:["#667085","#172033"]},customdata:[[scenarioText("a")],[scenarioText("b")]],hovertemplate:"<b>%{x}</b><br>%{customdata[0]}<br>Value: %{y:,.2f}<extra></extra>"}],{title:{text:"Scenario A vs B",font:{size:16}},yaxis:{title:s.title,rangemode:"tozero"},margin:{l:70,r:20,t:55,b:55},plot_bgcolor:"#fff"},{responsive:true,displaylogo:false});
    const ta=PERIODS.map(([p])=>metricVal(result("a",p),s.k)/s.scale),tb=PERIODS.map(([p])=>metricVal(result("b",p),s.k)/s.scale);
    Plotly.react("sl-trend",[{type:"scatter",mode:"lines+markers",name:"Scenario A definition",x:PERIODS.map(x=>pshort(x[0])),y:ta,line:{width:3},marker:{size:8}},{type:"scatter",mode:"lines+markers",name:"Scenario B definition",x:PERIODS.map(x=>pshort(x[0])),y:tb,line:{width:3},marker:{size:8}}],{title:{text:"P1–P4 under each scenario definition",font:{size:16}},yaxis:{title:s.title,rangemode:"tozero"},xaxis:{title:"Climate period"},legend:{orientation:"h",y:-.22},margin:{l:70,r:20,t:55,b:85},plot_bgcolor:"#fff"},{responsive:true,displaylogo:false});
    decomposition();updateURL(false);
  }

  function preset(name){
    $("sl-type").value="italy";populateEntity(false);$("sl-a-method").value=MAIN;$("sl-b-method").value=MAIN;$("sl-a-adapt").value="0";$("sl-b-adapt").value="0";
    if(name==="climate"){$("sl-a-period").value=PERIODS[0][0];$("sl-b-period").value=PERIODS[3][0];}
    if(name==="adapt50"){$("sl-a-period").value=PERIODS[3][0];$("sl-b-period").value=PERIODS[3][0];$("sl-b-adapt").value="50";}
    if(name==="adapt75"){$("sl-a-period").value=PERIODS[3][0];$("sl-b-period").value=PERIODS[3][0];$("sl-b-adapt").value="75";}
    if(name==="niosh"){$("sl-a-period").value=PERIODS[3][0];$("sl-b-period").value=PERIODS[3][0];$("sl-b-method").value="SENSITIVITY_NIOSH_MAIN_EXPOSURE";}
    render();
  }

  function updateURL(copy){
    const u=new URL(location.href);const ids=["type","entity","metric","a-period","a-adapt","a-method","b-period","b-adapt","b-method"];
    ids.forEach(id=>u.searchParams.set(`sl_${id.replaceAll("-","_")}`,$(`sl-${id}`).value));
    if(copy){navigator.clipboard?.writeText(u.toString());const b=$("sl-copy");const old=b.textContent;b.textContent="Link copied";setTimeout(()=>b.textContent=old,1400);}else history.replaceState(null,"",u);
  }
  function restore(){
    const u=new URL(location.href),get=id=>u.searchParams.get(`sl_${id.replaceAll("-","_")}`);
    const type=get("type");if(type&&["italy","province","branch","activity"].includes(type))$("sl-type").value=type;populateEntity(false);const ent=get("entity");if(ent&&[...$("sl-entity").options].some(o=>o.value===ent))$("sl-entity").value=ent;
    ["metric","a-period","a-adapt","a-method","b-period","b-adapt","b-method"].forEach(id=>{const v=get(id),e=$(`sl-${id}`);if(v&&e&&[...e.options].some(o=>o.value===v))e.value=v;});
  }

  function activate(){document.querySelectorAll(".tab").forEach(x=>x.classList.toggle("active",x.dataset.view==="scenario-lab"));document.querySelectorAll(".view").forEach(x=>x.classList.add("hidden"));$("scenario-lab").classList.remove("hidden");render();window.scrollTo({top:0,behavior:"smooth"});}

  function inject(){
    if($("scenario-lab")) return;addStyles();const nav=document.querySelector("nav.tabs"),anchor=document.querySelector('.tab[data-view="methods-citations"]')||document.querySelector('.tab[data-view="notes"]'),btn=document.createElement("button");btn.className="tab";btn.dataset.view="scenario-lab";btn.textContent="Scenario Lab";nav.insertBefore(btn,anchor||null);
    const sec=document.createElement("section");sec.id="scenario-lab";sec.className="view hidden";sec.innerHTML=`
      <div class="sl-hero"><div class="card prose"><h2>Scenario Lab</h2><p>Compare two validated model states side by side. Main ISO results can be explored for Italy, provinces, economic branches and observed ATECO5 activities with no adaptation, Combined 50% or Combined 75%. Alternative NIOSH/Hothaps/outdoor-share sensitivities are available only at national level and without adaptation because that is the resolution at which those robustness outputs are archived.</p></div><div class="card prose compact"><p><span class="sl-badge">No interpolation</span><span class="sl-badge">Validated outputs only</span></p><p>The lab never combines model dimensions for which no analytical output exists. A change in two controls at once is a scenario comparison, not a causal decomposition.</p></div></div>
      <div class="card sl-toolbar"><label>Entity type<select id="sl-type"><option value="italy">Italy</option><option value="province">Province</option><option value="branch">Economic branch</option><option value="activity">Activity (ATECO5 only)</option></select></label><label>Entity<select id="sl-entity"></select></label><label id="sl-search-wrap" class="sl-search hidden">Search activity<input id="sl-search" type="search" placeholder="Code or description…"></label><label>Outcome<select id="sl-metric">${METRICS.map(x=>`<option value="${x[0]}">${x[1]}</option>`).join("")}</select></label></div>
      <div class="card"><div class="sl-presets"><strong>Quick comparisons:</strong><button data-sl-preset="climate">Climate change · P1 → P4</button><button data-sl-preset="adapt50">P4 · no adaptation → Combined 50%</button><button data-sl-preset="adapt75">P4 · no adaptation → Combined 75%</button><button data-sl-preset="niosh">National P4 · ISO → NIOSH</button></div></div>
      <div class="sl-scenarios"><div class="sl-card"><h3>Scenario A</h3><div class="sl-controls"><label>Climate period<select id="sl-a-period"></select></label><label>Adaptation<select id="sl-a-adapt"></select></label><label>Methodology<select id="sl-a-method"></select></label></div><div id="sl-a-valid" class="sl-valid"></div></div><div class="sl-card"><h3>Scenario B</h3><div class="sl-controls"><label>Climate period<select id="sl-b-period"></select></label><label>Adaptation<select id="sl-b-adapt"></select></label><label>Methodology<select id="sl-b-method"></select></label></div><div id="sl-b-valid" class="sl-valid"></div></div></div>
      <div class="sl-kpis"><div class="sl-kpi"><span>Scenario A</span><strong id="sl-a-value">—</strong><small id="sl-a-range"></small></div><div class="sl-kpi"><span>Scenario B</span><strong id="sl-b-value">—</strong><small id="sl-b-range"></small></div><div class="sl-kpi"><span>B − A</span><strong id="sl-delta">—</strong><small>Absolute modelled change</small></div><div class="sl-kpi"><span>Relative B − A</span><strong id="sl-rel">—</strong><small>Relative to |A|</small></div><div class="sl-kpi"><span>Selection</span><strong style="font-size:14px" id="sl-a-desc">—</strong><small id="sl-b-desc">—</small></div></div>
      <div class="sl-grid"><div class="card"><div id="sl-ab" class="sl-plot"></div></div><div class="card"><div id="sl-trend" class="sl-plot"></div></div></div>
      <div class="card"><p id="sl-driver-note" class="hint"></p><div id="sl-drivers" class="sl-plot"></div></div>
      <div class="card prose compact sl-note"><p><strong>Interpretation.</strong> A positive B−A means larger modelled loss in Scenario B; a negative value means lower modelled loss. Equivalent workers are annual-equivalent productive capacity, not layoffs. Value-added losses are first-order accounting exposure, not causal GDP forecasts. P05–P95, where available, is dispersion across climate-model chains rather than a statistical confidence interval.</p><div class="sl-actions"><button id="sl-copy" class="sl-btn">Copy Scenario Lab link</button><button id="sl-methods" class="sl-btn">Methods & citations</button></div></div>`;
    const notes=$("notes");notes?.parentElement?.insertBefore(sec,notes);btn.onclick=activate;
    for(const side of ["a","b"]){PERIODS.forEach(([v,l])=>$(`sl-${side}-period`).add(new Option(l,v)));ADAPT.forEach(([v,l])=>$(`sl-${side}-adapt`).add(new Option(l,v)));METHODS.forEach(([v,l])=>$(`sl-${side}-method`).add(new Option(l,v)));}
    $("sl-a-period").value=PERIODS[0][0];$("sl-b-period").value=PERIODS[3][0];populateEntity(false);restore();
    ["sl-type","sl-entity","sl-metric","sl-a-period","sl-a-adapt","sl-a-method","sl-b-period","sl-b-adapt","sl-b-method"].forEach(id=>$(id).addEventListener("change",()=>{if(id==="sl-type")populateEntity(false);render();}));
    $("sl-search").addEventListener("input",()=>{populateEntity(true);render();});document.querySelectorAll("[data-sl-preset]").forEach(b=>b.onclick=()=>preset(b.dataset.slPreset));$("sl-copy").onclick=()=>updateURL(true);$("sl-methods").onclick=()=>document.querySelector('.tab[data-view="methods-citations"]')?.click();
    window.SL={activate,openProvince:r=>{$("sl-type").value="province";populateEntity(false);if([...$("sl-entity").options].some(o=>o.value===String(r)))$("sl-entity").value=String(r);$("sl-a-period").value=PERIODS[3][0];$("sl-b-period").value=PERIODS[3][0];$("sl-a-adapt").value="0";$("sl-b-adapt").value="50";activate();}};
    const hook=setInterval(()=>{const xp=$("xp-copy-link");if(!xp||$("xp-open-scenario"))return;const b=document.createElement("button");b.id="xp-open-scenario";b.className="btn";b.textContent="Open in Scenario Lab";b.onclick=()=>window.SL.openProvince($("xp-province")?.value);xp.parentElement?.appendChild(b);clearInterval(hook);},400);setTimeout(()=>clearInterval(hook),20000);
    render();console.info("Scenario Lab enabled",{validated_combinations_only:true,agriculture_activity_split:false,national_method_sensitivities:true,entity_adaptation_comparison:true});
  }
  const timer=setInterval(()=>{if(ready()){clearInterval(timer);inject();}else if(++attempts>180){clearInterval(timer);console.warn("Scenario Lab timed out");}},250);
})();
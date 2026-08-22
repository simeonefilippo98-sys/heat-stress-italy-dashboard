(() => {
  "use strict";

  const VERSION = "1.1.1";
  const UPDATED = "22 August 2026";
  const PAPER_TITLE = "From climate hazard to economic exposure: occupational heat, productivity losses and adaptation across 103 harmonised Italian territorial units and 821 observed ATECO5 activities";
  const PERIOD_SHORT = ["P1", "P2", "P3", "P4"];
  const PERIOD_DATES = ["2006–2025", "2026–2050", "2051–2075", "2076–2099"];
  const MAP_SCALE = [[0,"#fff7ec"],[.2,"#fee8c8"],[.4,"#fdbb84"],[.6,"#fc8d59"],[.8,"#e34a33"],[1,"#b30000"]];
  const CONFIG = {responsive:true, displaylogo:false, displayModeBar:true, modeBarButtonsToRemove:["select2d","lasso2d"]};

  let language = localStorage.getItem("heat-dashboard-language") === "it" ? "it" : "en";
  let overviewPeriod = 3;
  let mutationTimer = 0;

  const copy = {
    en: {
      overview:"At a glance",
      heroTitle:"How occupational heat becomes economic exposure",
      heroText:"A high-resolution research companion linking climate projections, workability, 103 harmonised Italian territorial units and 821 observed ATECO5 activities. Start with the national picture, then open the full analytical views.",
      explore:"Open sector explorer", methods:"View methods", mapTitle:"Territorial exposure", mapNote:"Value-added loss intensity · no adaptation · click a unit for its research profile",
      trendTitle:"National trajectory", trendNote:"Annual-equivalent value-added exposure under the fixed 2018–2023 economic structure",
      vaLoss:"Value-added exposure", vaIntensity:"VA-loss intensity", workers:"Worker-equivalents", workerIntensity:"Worker-loss intensity",
      baseline:"Fixed economic baseline: mean 2018–2023", climate:"Ten EURO-CORDEX chains · RCP8.5 stress test", noAdapt:"No-adaptation specification", units:"103 harmonised territorial units",
      takeaways:"Three results to retain", t1:"Physical and monetary exposure differ", t1p:"Agriculture and construction have the highest proportional P4 losses; the much larger trade–transport–hospitality branch contributes most to the national monetary total.",
      t2:"€28.65 bn in the P4 stress test", t2p:"The ensemble mean equals 1.75% of baseline value added and 407,877 annual-equivalent workers. This is modelled productive-capacity exposure, not realised GDP loss.",
      t3:"Adaptation is material, not complete", t3p:"Combined uptake reduces P4 value-added exposure by 28.3% at 50% uptake and 41.5% at 75%, without eliminating the climate-driven increase.",
      pipeline:"From climate to economic exposure", pipelineNote:"The dashboard follows the same auditable sequence used by the manuscript and Supplementary Information.",
      cautionTitle:"Interpretation:", caution:"modelled annual-equivalent productive-capacity exposure under a fixed 2018–2023 economic structure. It is not a causal estimate of realised GDP loss or layoffs.",
      summaryLanguage:"Sintesi italiana", copyLink:"Copy current view", copied:"Link copied", expand:"Expand map", close:"Close map", loading:"Preparing the national overview…",
      version:"Dashboard version", updated:"Last updated", dataset:"Analytical coverage", reproducibility:"Reproducibility", repo:"GitHub source", archive:"Zenodo archive planned",
      catalogKicker:"Adaptation measure catalogue", catalogTitle:"What the dashboard models — and what remains a candidate option", catalogText:"Select a modelled measure to update the results below. Candidate measures are shown for policy completeness but do not have a separate effect estimate in the current outputs.",
      statusModelled:"Modelled in the dashboard", statusCandidate:"Candidate · not separately modelled", modelledShort:"Modelled", candidateShort:"Candidate",
      shadeTitle:"Shade and solar protection", shadeText:"Covered work areas and solar shielding reduce direct radiant-heat exposure for outdoor activities.",
      coolingTitle:"Space cooling", coolingText:"Air conditioning or cooled indoor environments lower thermal exposure for eligible indoor work.",
      exoTitle:"Assistive exoskeleton", exoText:"Assistive technology is represented as a reduction in the effective metabolic load of eligible physical tasks.",
      combinedTitle:"Combined package", combinedText:"Shade, space cooling and reduced metabolic load are applied jointly; the package is scenario-specific and non-additive.",
      garmentsTitle:"Ventilated or cooling garments", garmentsText:"Personal cooling through ventilated jackets, phase-change garments or cooling vests is relevant, but not separately parameterised here.",
      organisationTitle:"Work–rest and hydration protocols", organisationText:"Scheduling, recovery breaks, hydration and heat-alert procedures are important organisational measures not separately estimated in the current outputs."
    },
    it: {
      overview:"In sintesi",
      heroTitle:"Come il caldo occupazionale diventa esposizione economica",
      heroText:"Un companion di ricerca ad alta risoluzione che collega proiezioni climatiche, lavorabilità, 103 unità territoriali italiane armonizzate e 821 attività ATECO5 osservate. Parti dal quadro nazionale e approfondisci nelle viste analitiche.",
      explore:"Apri l’esploratore settoriale", methods:"Consulta i metodi", mapTitle:"Esposizione territoriale", mapNote:"Intensità della perdita di valore aggiunto · senza adattamento · clicca un’unità per la scheda di ricerca",
      trendTitle:"Traiettoria nazionale", trendNote:"Esposizione annuale equivalente del valore aggiunto con struttura economica 2018–2023 fissa",
      vaLoss:"Valore aggiunto esposto", vaIntensity:"Intensità perdita VA", workers:"Lavoratori-equivalenti", workerIntensity:"Intensità perdita lavoro",
      baseline:"Baseline economica fissa: media 2018–2023", climate:"Dieci catene EURO-CORDEX · stress test RCP8.5", noAdapt:"Specificazione senza adattamento", units:"103 unità territoriali armonizzate",
      takeaways:"Tre risultati da ricordare", t1:"Esposizione fisica e monetaria non coincidono", t1p:"Agricoltura e costruzioni hanno le perdite proporzionali P4 più elevate; la branca commercio–trasporti–ospitalità, molto più ampia, contribuisce maggiormente al totale monetario nazionale.",
      t2:"28,65 mld € nello stress test P4", t2p:"La media di ensemble equivale all’1,75% del valore aggiunto di baseline e a 407.877 lavoratori-equivalenti. È esposizione modellata della capacità produttiva, non perdita di PIL realizzata.",
      t3:"L’adattamento conta, ma non basta", t3p:"L’adozione combinata riduce l’esposizione P4 del valore aggiunto del 28,3% al 50% di uptake e del 41,5% al 75%, senza annullare l’incremento climatico.",
      pipeline:"Dal clima all’esposizione economica", pipelineNote:"Il dashboard segue la stessa sequenza verificabile utilizzata nel manoscritto e nel Supplementary Information.",
      cautionTitle:"Interpretazione:", caution:"esposizione modellata e annuale-equivalente della capacità produttiva con struttura economica 2018–2023 fissa. Non è una stima causale della perdita di PIL realizzata né dei licenziamenti.",
      summaryLanguage:"English summary", copyLink:"Copia vista corrente", copied:"Link copiato", expand:"Ingrandisci mappa", close:"Chiudi mappa", loading:"Preparazione della panoramica nazionale…",
      version:"Versione dashboard", updated:"Ultimo aggiornamento", dataset:"Copertura analitica", reproducibility:"Riproducibilità", repo:"Codice GitHub", archive:"Archivio Zenodo previsto",
      catalogKicker:"Catalogo delle misure di adattamento", catalogTitle:"Cosa simula il dashboard — e cosa resta un’opzione candidata", catalogText:"Seleziona una misura simulata per aggiornare i risultati sottostanti. Le opzioni candidate sono mostrate per completezza di policy, ma non dispongono di una stima d’effetto separata negli output attuali.",
      statusModelled:"Simulato nel dashboard", statusCandidate:"Opzione candidata · non simulata separatamente", modelledShort:"Simulato", candidateShort:"Candidato",
      shadeTitle:"Ombreggiamento e protezione solare", shadeText:"Aree di lavoro coperte e schermature solari riducono l’esposizione diretta al calore radiante nelle attività all’aperto.",
      coolingTitle:"Raffrescamento degli ambienti", coolingText:"Climatizzazione o ambienti interni raffrescati riducono l’esposizione termica per il lavoro indoor eleggibile.",
      exoTitle:"Esoscheletro assistivo", exoText:"La tecnologia assistiva è rappresentata come riduzione del carico metabolico effettivo nelle mansioni fisiche eleggibili.",
      combinedTitle:"Pacchetto combinato", combinedText:"Ombreggiamento, raffrescamento e riduzione del carico metabolico sono applicati congiuntamente; il risultato è specifico dello scenario e non additivo.",
      garmentsTitle:"Giacche ventilate o indumenti refrigeranti", garmentsText:"Il raffrescamento personale tramite giacche ventilate, materiali a cambiamento di fase o gilet refrigeranti è rilevante, ma non è parametrizzato separatamente negli output attuali.",
      organisationTitle:"Protocolli lavoro–riposo e idratazione", organisationText:"Programmazione, pause di recupero, idratazione e procedure di allerta caldo sono importanti misure organizzative non stimate separatamente negli output attuali."
    }
  };

  const navTranslations = {
    "At a glance":"In sintesi", "Sector / ATECO5 explorer":"Settori / ATECO5", "National sector profile":"Profilo settoriale nazionale",
    "Adaptation explorer":"Esplora adattamento", "Uncertainty & robustness":"Incertezza e robustezza", "Scenario Lab":"Laboratorio scenari",
    "Methods & citations":"Metodi e citazioni", "Climate hazard":"Pericolo climatico", "Workforce composition":"Composizione occupazionale",
    "Explore & compare":"Esplora e confronta", "Data notes":"Note sui dati"
  };
  const labelTranslations = {
    "Climate period":"Periodo climatico", "Adaptation state":"Stato di adattamento", "Map outcome":"Risultato in mappa",
    "Economic branch":"Branca economica", "Work intensity":"Intensità del lavoro", "Exposure class":"Classe di esposizione",
    "Activity (ATECO5 only)":"Attività (solo ATECO5)", "Province to exclude":"Provincia da escludere", "Colour scaling":"Scala cromatica",
    "Adaptation measure":"Misura di adattamento", "Uptake":"Adozione", "Outcome":"Risultato", "Robustness period":"Periodo di robustezza",
    "Employment scope":"Perimetro occupazionale", "Composition chart":"Grafico di composizione", "Map year":"Anno della mappa",
    "Map work intensity":"Intensità lavorativa in mappa", "Province profile":"Profilo provinciale", "Exposure context":"Contesto di esposizione",
    "WBGT threshold":"Soglia WBGT", "Compare":"Confronta", "Search activities":"Cerca attività", "Select up to six":"Seleziona fino a sei"
  };

  const t = key => copy[language][key];
  const euroBn = value => new Intl.NumberFormat(language === "it" ? "it-IT" : "en-US", {style:"currency",currency:"EUR",maximumFractionDigits:2}).format(value / 1e9) + (language === "it" ? " mld" : " bn");
  const number = (value, digits=0) => new Intl.NumberFormat(language === "it" ? "it-IT" : "en-US", {minimumFractionDigits:digits,maximumFractionDigits:digits}).format(value);

  function isReady() {
    try { return typeof micro !== "undefined" && Array.isArray(micro) && micro.length > 0 && typeof geo !== "undefined" && geo; }
    catch (_) { return false; }
  }

  function aggregate(period, scenario="0") {
    const rows = micro.filter(x => x.p === PERIODS[period][0]);
    const provinces = aggregateProvince(rows, scenario);
    return {
      provinces,
      va:provinces.reduce((s,x)=>s+x.va,0),
      employment:provinces.reduce((s,x)=>s+x.n,0),
      loss:provinces.reduce((s,x)=>s+x.l,0),
      workers:provinces.reduce((s,x)=>s+x.w,0)
    };
  }

  function activateView(id) {
    document.querySelectorAll(".tab").forEach(button => {
      const active = button.dataset.view === id;
      button.classList.toggle("active", active);
      if (active) button.setAttribute("aria-current", "page"); else button.removeAttribute("aria-current");
    });
    document.querySelectorAll(".view").forEach(view => view.classList.add("hidden"));
    document.getElementById(id)?.classList.remove("hidden");
    if (id === "overview") requestAnimationFrame(()=>{
      const map=document.getElementById("overview-map"),trend=document.getElementById("overview-trend");
      if(map?.data)Plotly.purge(map);if(trend?.data)Plotly.purge(trend);renderOverview();
    });
    updateUrl(id);
    window.scrollTo({top:0,behavior:"smooth"});
  }

  function overviewMarkup() {
    return `
      <div class="card overview-hero">
        <h2 id="ov-hero-title"></h2><p id="ov-hero-text"></p>
        <div class="overview-actions"><button class="btn" id="ov-open-explorer"></button><button class="btn secondary" id="ov-open-methods"></button></div>
      </div>
      <div class="overview-kpis">
        <div class="overview-kpi" style="--kpi-accent:#b42318"><span id="ov-kpi-va-label"></span><strong id="ov-kpi-va">—</strong><small id="ov-kpi-va-note"></small></div>
        <div class="overview-kpi" style="--kpi-accent:#c2410c"><span id="ov-kpi-vap-label"></span><strong id="ov-kpi-vap">—</strong><small id="ov-kpi-vap-note"></small></div>
        <div class="overview-kpi" style="--kpi-accent:#245b8a"><span id="ov-kpi-workers-label"></span><strong id="ov-kpi-workers">—</strong><small id="ov-kpi-workers-note"></small></div>
        <div class="overview-kpi" style="--kpi-accent:#287271"><span id="ov-kpi-wp-label"></span><strong id="ov-kpi-wp">—</strong><small id="ov-kpi-wp-note"></small></div>
      </div>
      <div class="card">
        <div class="overview-card-title"><div><h3 id="ov-map-title"></h3><p class="hint" id="ov-map-note"></p></div><div class="map-action-group"><div class="period-pills" id="ov-period-pills"></div></div></div>
        <div id="overview-map" class="overview-map"></div>
      </div>
      <div class="overview-grid equal">
        <div class="card"><div class="overview-card-title"><div><h3 id="ov-trend-title"></h3><p class="hint" id="ov-trend-note"></p></div></div><div id="overview-trend" class="overview-trend"></div></div>
        <div class="card"><h3 id="ov-takeaways-title"></h3><div class="takeaways"><div class="takeaway"><strong id="ov-t1"></strong><p id="ov-t1p"></p></div><div class="takeaway"><strong id="ov-t2"></strong><p id="ov-t2p"></p></div><div class="takeaway"><strong id="ov-t3"></strong><p id="ov-t3p"></p></div></div></div>
      </div>
      <div class="card"><div class="overview-card-title"><div><h3 id="ov-pipeline-title"></h3><p class="hint" id="ov-pipeline-note"></p></div></div>
        <div class="method-pipeline">
          <div class="pipeline-step"><div class="pipeline-icon">1</div><b>Climate</b><span>EURO-CORDEX · daily grid</span></div>
          <div class="pipeline-step"><div class="pipeline-icon">2</div><b>WBGT</b><span>Shade and direct-sun proxies</span></div>
          <div class="pipeline-step"><div class="pipeline-icon">3</div><b>Workability</b><span>Clerical, light, moderate, heavy</span></div>
          <div class="pipeline-step"><div class="pipeline-icon">4</div><b>Exposure</b><span>Indoor/outdoor shares · 821 activities</span></div>
          <div class="pipeline-step"><div class="pipeline-icon">5</div><b>Economic incidence</b><span>Workers and value added</span></div>
          <div class="pipeline-step"><div class="pipeline-icon">6</div><b>Adaptation</b><span>Shade, cooling, metabolic load</span></div>
        </div>
      </div>`;
  }

  function addOverview() {
    if (document.getElementById("overview")) return;
    const nav = document.querySelector("nav.tabs");
    const button = document.createElement("button");
    button.type = "button"; button.className = "tab"; button.dataset.view = "overview"; button.textContent = "At a glance";
    nav?.insertBefore(button, nav.firstChild);
    const section = document.createElement("section");
    section.id = "overview"; section.className = "view hidden"; section.innerHTML = overviewMarkup();
    document.getElementById("micro")?.parentElement?.insertBefore(section, document.getElementById("micro"));
    button.addEventListener("click", () => activateView("overview"));
    document.getElementById("ov-open-explorer")?.addEventListener("click", () => activateView("micro"));
    document.getElementById("ov-open-methods")?.addEventListener("click", () => activateView("methods-citations"));
  }

  function renderNarrative() {
    document.documentElement.lang = language;
    const values = {
      "ov-hero-title":t("heroTitle"),"ov-hero-text":t("heroText"),"ov-open-explorer":t("explore"),"ov-open-methods":t("methods"),
      "ov-map-title":t("mapTitle"),"ov-map-note":t("mapNote"),"ov-trend-title":t("trendTitle"),"ov-trend-note":t("trendNote"),
      "ov-kpi-va-label":t("vaLoss"),"ov-kpi-vap-label":t("vaIntensity"),"ov-kpi-workers-label":t("workers"),"ov-kpi-wp-label":t("workerIntensity"),
      "ov-kpi-va-note":t("baseline"),"ov-kpi-vap-note":t("climate"),"ov-kpi-workers-note":t("noAdapt"),"ov-kpi-wp-note":t("units"),
      "ov-takeaways-title":t("takeaways"),"ov-t1":t("t1"),"ov-t1p":t("t1p"),"ov-t2":t("t2"),"ov-t2p":t("t2p"),"ov-t3":t("t3"),"ov-t3p":t("t3p"),
      "ov-pipeline-title":t("pipeline"),"ov-pipeline-note":t("pipelineNote"),
      "adapt-catalog-kicker":t("catalogKicker"),"adapt-catalog-title":t("catalogTitle"),"adapt-catalog-text":t("catalogText")
    };
    Object.entries(values).forEach(([id,value]) => { const el=document.getElementById(id); if(el) el.textContent=value; });
    document.querySelectorAll("[data-dashboard-copy]").forEach(el=>{const value=t(el.dataset.dashboardCopy);if(value&&el.textContent!==value)el.textContent=value;});
    const strip = document.getElementById("interpretation-strip");
    if (strip) strip.innerHTML = `<strong>${t("cautionTitle")}</strong><span>${t("caution")}</span>`;
    const lang = document.getElementById("language-toggle"); if(lang) lang.textContent=t("summaryLanguage");
    const copyButton = document.getElementById("copy-view-link"); if(copyButton) copyButton.textContent=t("copyLink");
    translateChrome();
  }

  function renderOverview() {
    if (!isReady() || !document.getElementById("overview-map")) return;
    renderNarrative();
    const data = aggregate(overviewPeriod, "0");
    const vaPct = data.va ? 100 * data.loss / data.va : 0;
    const workerPct = data.employment ? 100 * data.workers / data.employment : 0;
    document.getElementById("ov-kpi-va").textContent = euroBn(data.loss);
    document.getElementById("ov-kpi-vap").textContent = number(vaPct,2) + "%";
    document.getElementById("ov-kpi-workers").textContent = number(data.workers,0);
    document.getElementById("ov-kpi-wp").textContent = number(workerPct,2) + "%";
    document.getElementById("ov-period-pills").innerHTML = PERIOD_SHORT.map((p,i)=>`<button class="period-pill ${i===overviewPeriod?"active":""}" data-period="${i}" aria-pressed="${i===overviewPeriod}">${p} · ${PERIOD_DATES[i]}</button>`).join("");
    document.querySelectorAll("#ov-period-pills .period-pill").forEach(button => button.onclick=()=>{overviewPeriod=Number(button.dataset.period);renderOverview();updateUrl("overview");});

    const values = data.provinces.map(x=>x.va_p);
    const zmin = percentile(values,.05), zmax = percentile(values,.95);
    Plotly.react("overview-map", [{type:"choropleth",geojson:geo,featureidkey:"properties.REF_AREA",locations:data.provinces.map(x=>x.r),z:values,zmin,zmax,zauto:false,text:data.provinces.map(x=>x.pn),colorscale:MAP_SCALE,marker:{line:{color:"#fff",width:.75}},customdata:data.provinces.map(x=>[x.va_m,x.w,x.w_p]),hovertemplate:"<b>%{text}</b><br>VA loss: %{z:.2f}%<br>VA loss: €%{customdata[0]:,.1f}m<br>Worker-equivalents: %{customdata[1]:,.0f}<br>Worker loss: %{customdata[2]:.2f}%<extra></extra>",colorbar:{title:"VA loss (%)",thickness:14}}],{geo:{fitbounds:"locations",visible:false,landcolor:"#f1f3f5",showland:true},margin:{l:0,r:0,t:10,b:0},paper_bgcolor:"#fff"},CONFIG).then(wireOverviewMap);

    const trajectory = PERIODS.map((_,i)=>aggregate(i,"0"));
    Plotly.react("overview-trend", [{type:"scatter",mode:"lines+markers",x:PERIOD_SHORT,y:trajectory.map(x=>x.loss/1e9),line:{color:"#b42318",width:4},marker:{size:10,color:["#fdbb84","#fc8d59","#e34a33","#b30000"]},customdata:trajectory.map(x=>[x.workers,x.va?100*x.loss/x.va:0]),hovertemplate:"<b>%{x}</b><br>VA exposure: €%{y:.2f} bn<br>VA intensity: %{customdata[1]:.2f}%<br>Worker-equivalents: %{customdata[0]:,.0f}<extra></extra>"}],{xaxis:{title:"Climate period"},yaxis:{title:"Value-added exposure (€ bn)",rangemode:"tozero"},margin:{l:65,r:20,t:20,b:55},plot_bgcolor:"#fff",paper_bgcolor:"#fff"},CONFIG);
    installExpandButtons();
  }

  function wireOverviewMap() {
    const map = document.getElementById("overview-map");
    if (!map || typeof map.on !== "function" || map.dataset.profileWired) return;
    map.dataset.profileWired = "1";
    map.on("plotly_click", event => {
      const id = event?.points?.[0]?.location;
      if (!id) return;
      const open = () => {
        if (!window.XP?.activate || !document.getElementById("xp-province")) return false;
        document.getElementById("xp-province").value=String(id); window.XP.activate("explore-compare"); window.XP.renderProfile?.(); return true;
      };
      if (!open()) { let tries=0; const timer=setInterval(()=>{if(open()||++tries>30)clearInterval(timer);},100); }
    });
  }

  function addGlobalTools() {
    const header = document.querySelector("main.shell > header");
    if (header && !document.getElementById("site-tools")) {
      const tools = document.createElement("div"); tools.id="site-tools"; tools.className="site-tools";
      tools.innerHTML=`<button id="language-toggle" class="tool-btn" type="button"></button><button id="copy-view-link" class="tool-btn" type="button"></button>`;
      header.appendChild(tools);
      document.getElementById("language-toggle").onclick=()=>{language=language==="en"?"it":"en";localStorage.setItem("heat-dashboard-language",language);document.querySelector(".version-grid")?.remove();renderOverview();renderNarrative();enhanceFooter();};
      document.getElementById("copy-view-link").onclick=async event=>{updateUrl(activeView());try{await navigator.clipboard.writeText(location.href);event.currentTarget.textContent=t("copied");setTimeout(()=>event.currentTarget.textContent=t("copyLink"),1200);}catch(error){console.warn("Current-view link could not be copied",error);}};
    }
    const nav=document.querySelector("nav.tabs");
    if(nav&&!document.getElementById("interpretation-strip")){const strip=document.createElement("div");strip.id="interpretation-strip";strip.className="interpretation-strip";nav.insertAdjacentElement("afterend",strip);}
  }

  function activeView() { return document.querySelector(".tab.active")?.dataset.view || "overview"; }
  function updateUrl(view=activeView()) {
    const url=new URL(location.href); url.searchParams.set("view",view);
    if(view==="overview")url.searchParams.set("period",PERIOD_SHORT[overviewPeriod].toLowerCase());
    if(view==="micro"){
      [["period","period"],["scenario","scenario"],["metric","metric"],["branch","branch"],["intensity","intensity"],["exposure","exposure"]].forEach(([id,key])=>{const element=document.getElementById(id);if(element?.value)url.searchParams.set(key,element.value);else url.searchParams.delete(key);});
    }
    history.replaceState({},"",url);
  }

  function applyUrlState() {
    const q=new URLSearchParams(location.search), view=q.get("view");
    const ov=(q.get("period")||"").toUpperCase(); if(PERIOD_SHORT.includes(ov))overviewPeriod=PERIOD_SHORT.indexOf(ov);
    if(view==="micro"){
      [["period","period"],["scenario","scenario"],["metric","metric"],["branch","branch"],["intensity","intensity"],["exposure","exposure"]].forEach(([id,key])=>{const element=document.getElementById(id),value=q.get(key);if(element&&value&&[...element.options].some(o=>o.value===value))element.value=value;});
      try{renderMicro();}catch(_){/* data modules may still be settling */}
    }
    if(view&&document.querySelector(`.tab[data-view="${CSS.escape(view)}"]`)&&document.getElementById(view))activateView(view);
    else if(view!=="explore")activateView("overview");
    document.querySelectorAll("select").forEach(select=>{if(select.dataset.urlWired)return;select.dataset.urlWired="1";select.addEventListener("change",()=>updateUrl(activeView()));});
    document.querySelectorAll(".tab").forEach(button=>{if(button.dataset.urlWired)return;button.dataset.urlWired="1";button.addEventListener("click",()=>setTimeout(()=>updateUrl(button.dataset.view),0));});
  }

  function installExpandButtons() {
    ["overview-map","map","amap","best-adaptation","hz-map","wf-map"].forEach(id=>{
      const plot=document.getElementById(id); if(!plot||plot.dataset.expandReady)return;
      const card=plot.closest(".card"); if(!card)return; plot.dataset.expandReady="1";
      let head=card.querySelector(":scope > .card-head, :scope > .overview-card-title");
      if(!head){head=document.createElement("div");head.className="card-head";card.insertBefore(head,card.firstChild);}
      let actions=head.querySelector(".map-action-group"); if(!actions){actions=document.createElement("div");actions.className="map-action-group";head.appendChild(actions);}
      const button=document.createElement("button");button.type="button";button.className="expand-map-btn";button.textContent=t("expand");button.setAttribute("aria-expanded","false");actions.appendChild(button);
      button.onclick=()=>{const expanded=card.classList.toggle("map-expanded");document.body.classList.toggle("has-expanded-map",expanded);button.setAttribute("aria-expanded",String(expanded));button.textContent=expanded?t("close"):t("expand");setTimeout(()=>{try{Plotly.Plots.resize(plot);}catch(_){}},80);};
    });
  }

  function translateChrome() {
    const setText=(element,value)=>{if(element&&element.textContent!==value)element.textContent=value;};
    document.querySelectorAll(".tab").forEach(button=>{
      if(!button.dataset.enLabel)button.dataset.enLabel=button.textContent.trim();
      const en=button.dataset.enLabel;setText(button,language==="it"?(navTranslations[en]||en):en);
    });
    document.querySelectorAll("label").forEach(label=>{
      const node=[...label.childNodes].find(n=>n.nodeType===Node.TEXT_NODE&&n.textContent.trim());if(!node)return;
      if(!label.dataset.enLabel)label.dataset.enLabel=node.textContent.trim();
      const en=label.dataset.enLabel,next=language==="it"?(labelTranslations[en]||en):en;if(node.textContent.trim()!==next)node.textContent=next;
    });
    document.querySelectorAll(".expand-map-btn").forEach(button=>setText(button,button.getAttribute("aria-expanded")==="true"?t("close"):t("expand")));
    const header=document.querySelector("main.shell > header");
    if(header){const h1=header.querySelector("h1"),p=header.querySelector("p");if(language==="it"){setText(h1,"Caldo occupazionale ed esposizione economica in Italia");setText(p,"Companion interattivo di “From climate hazard to economic exposure” · 103 unità territoriali italiane armonizzate · 821 attività ATECO5 osservate + agricoltura aggregata · P1–P4 · adattamento e incertezza");}else{setText(h1,"Occupational Heat & Economic Exposure in Italy");setText(p,"Interactive companion to “From climate hazard to economic exposure” · 103 harmonised Italian territorial units · 821 observed ATECO5 activities + agriculture aggregate · P1–P4 · adaptation & uncertainty");}}
  }

  function enhanceFooter() {
    const footer=document.getElementById("site-footer");if(!footer||footer.querySelector(".version-grid"))return;
    const grid=document.createElement("div");grid.className="version-grid";grid.innerHTML=`<div class="version-item"><span>${t("version")}</span><strong>${VERSION}</strong></div><div class="version-item"><span>${t("updated")}</span><strong>${UPDATED}</strong></div><div class="version-item"><span>${t("dataset")}</span><strong>P1–P4 · 103 units · 821 ATECO5</strong></div><div class="version-item"><span>${t("reproducibility")}</span><strong><a href="https://github.com/simeonefilippo98-sys/heat-stress-italy-dashboard" target="_blank" rel="noopener">${t("repo")}</a> · ${t("archive")}</strong></div>`;footer.appendChild(grid);
  }

  function observeDynamicModules() {
    const observer=new MutationObserver(()=>{clearTimeout(mutationTimer);mutationTimer=setTimeout(()=>{translateChrome();installExpandButtons();enhanceFooter();},80);});
    observer.observe(document.body,{childList:true,subtree:true});
  }

  function init() {
    addOverview();addGlobalTools();renderNarrative();observeDynamicModules();
    let attempts=0;
    const timer=setInterval(()=>{
      addGlobalTools();installExpandButtons();enhanceFooter();translateChrome();
      if(isReady()){
        clearInterval(timer);setTimeout(applyUrlState,450);console.info("Dashboard 1.1 enhancements loaded",{version:VERSION,language,paper:PAPER_TITLE});
      } else if(++attempts>240){clearInterval(timer);const section=document.getElementById("overview");if(section)section.innerHTML=`<div class="card overview-error">The national overview could not initialise. The analytical views remain available.</div>`;}
    },100);
  }

  if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",init,{once:true});else init();
})();

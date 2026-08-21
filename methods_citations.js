(() => {
  const PAPER_TITLE = "From climate hazard to economic exposure: occupational heat, productivity losses and adaptation across 103 harmonised Italian territorial units and 821 activities";
  const AUTHOR = "Filippo Simeone";
  const YEAR = "2026";

  function addStyles() {
    if (document.getElementById("methods-citations-style")) return;
    const style = document.createElement("style");
    style.id = "methods-citations-style";
    style.textContent = `
      .research-meta{display:flex;gap:8px;flex-wrap:wrap;align-items:center;margin:-8px 0 18px;color:var(--muted);font-size:13px}
      .research-meta a,.methods-view a,.site-footer a{color:#245b8a;text-decoration:none}
      .research-meta a:hover,.methods-view a:hover,.site-footer a:hover{text-decoration:underline}
      .meta-pill{display:inline-flex;align-items:center;padding:5px 9px;border:1px solid var(--line);background:#fff;border-radius:999px;color:#475467}
      .methods-view{line-height:1.55}.methods-hero{display:grid;grid-template-columns:1.35fr .65fr;gap:16px}.methods-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:16px}
      .method-card h3{margin:0 0 8px;font-size:17px}.method-card p{margin:7px 0}
      .formula{background:#f8fafc;border:1px solid #e3e8ef;border-radius:10px;padding:10px 12px;margin:9px 0;font-family:"Cambria Math","STIX Two Math",Georgia,serif;overflow-x:auto;font-size:15px}.formula.small{font-size:14px}
      .source-tag{display:inline-flex;border-radius:999px;padding:3px 8px;font-size:11px;font-weight:700;margin-right:6px;vertical-align:middle}.tag-lit{background:#e8f1fb;color:#174a78}.tag-informed{background:#f1ecfb;color:#5b3a91}.tag-study{background:#fff2dc;color:#8a4f08}
      .method-note{font-size:12px;color:var(--muted)}.source-list{padding-left:20px}.source-list li{margin:7px 0}
      .clerical-table{width:100%;font-size:13px;border-collapse:collapse;margin:8px 0}.clerical-table th,.clerical-table td{padding:7px 9px;border-bottom:1px solid var(--line);text-align:left}
      .citation-box{background:#f8fafc;border-left:4px solid #172033;padding:13px 15px;border-radius:8px}.site-footer{margin:28px 0 4px;padding:18px 4px 4px;border-top:1px solid var(--line);color:var(--muted);font-size:12px;line-height:1.55}
      @media(max-width:900px){.methods-hero,.methods-grid{grid-template-columns:1fr}}
    `;
    document.head.appendChild(style);
  }

  function addHeaderAttribution() {
    const header = document.querySelector("main.shell > header");
    if (!header || document.getElementById("research-meta")) return;
    const meta = document.createElement("div");
    meta.id = "research-meta";
    meta.className = "research-meta";
    meta.innerHTML = `
      <span class="meta-pill"><strong>Created by ${AUTHOR}</strong></span>
      <span class="meta-pill">Interactive companion to the ${YEAR} working paper</span>
      <a class="meta-pill" href="#paper-citation" id="paper-citation-link">How to cite</a>
      <a class="meta-pill" href="#methods-citations" id="methods-link">Methods & literature</a>
    `;
    header.appendChild(meta);

    ["paper-citation-link","methods-link"].forEach(id => {
      document.getElementById(id)?.addEventListener("click", (e) => {
        e.preventDefault();
        activateMethods();
        const target = id === "paper-citation-link" ? document.getElementById("paper-citation") : document.getElementById("methods-citations");
        setTimeout(() => target?.scrollIntoView({behavior:"smooth", block:"start"}), 50);
      });
    });
  }

  function addMethodsView() {
    if (document.getElementById("methods-citations")) return;

    const nav = document.querySelector(".tabs");
    const notesTab = document.querySelector('.tab[data-view="notes"]');
    const btn = document.createElement("button");
    btn.className = "tab";
    btn.dataset.view = "methods-citations";
    btn.textContent = "Methods & citations";
    if (nav) {
      if (notesTab) nav.insertBefore(btn, notesTab);
      else nav.appendChild(btn);
    }

    const notes = document.getElementById("notes");
    const section = document.createElement("section");
    section.id = "methods-citations";
    section.className = "view hidden methods-view";
    section.innerHTML = `
      <div class="methods-hero">
        <div class="card">
          <h2>Methods, formulas & scientific provenance</h2>
          <p>This dashboard is the interactive companion to <em>${PAPER_TITLE}</em>, a ${YEAR} working paper by <strong>${AUTHOR}</strong>. The dashboard was created by ${AUTHOR} and exposes the same validated analytical outputs used in the manuscript.</p>
          <p>The formulas below are shown so that users can distinguish established relationships from study-specific modelling and accounting choices. The interface does <strong>not</strong> generate additional model estimates beyond the documented pipeline.</p>
        </div>
        <div class="card">
          <h3>How to read the labels</h3>
          <p><span class="source-tag tag-lit">Literature-derived</span> equation or relationship taken directly from a published or institutional source.</p>
          <p><span class="source-tag tag-informed">Literature-informed</span> implementation follows established occupational-heat practice but includes modelling choices.</p>
          <p><span class="source-tag tag-study">Study-specific</span> transparent scenario, exposure, aggregation or accounting definition used in this paper.</p>
        </div>
      </div>

      <div class="methods-grid">
        <div class="card method-card"><h3>1. From climate variables to wet-bulb temperature</h3><p><span class="source-tag tag-lit">Literature-derived</span> Vapour pressure and relative humidity are reconstructed from specific humidity, pressure and temperature; wet-bulb temperature uses the Stull approximation.</p><div class="formula small">e = q·p / (0.622 + 0.378q)</div><div class="formula small">e<sub>s</sub> = 6.11 · exp[17.67T<sub>a</sub> / (T<sub>a</sub> + 243.5)] &nbsp;&nbsp; ; &nbsp;&nbsp; RH = 100·e/e<sub>s</sub></div><div class="formula">T<sub>w</sub> = Stull(T<sub>a</sub>, RH)</div><p class="method-note">Wet-bulb approximation: Stull (2011), <em>Journal of Applied Meteorology and Climatology</em>, 50(11), 2267–2269.</p></div>
        <div class="card method-card"><h3>2. WBGT proxies used in the project</h3><p><span class="source-tag tag-informed">Literature-informed</span> The shade/indoor proxy combines wet-bulb and air temperature.</p><div class="formula">WBGT<sup>shade</sup> = 0.7T<sub>w</sub> + 0.3T<sub>a</sub></div><p><span class="source-tag tag-study">Study-specific</span> Direct-sun exposure is represented by the deliberately simplified project proxy:</p><div class="formula">WBGT<sup>sun</sup> = WBGT<sup>shade</sup> + 3°C</div><p class="method-note">The +3°C term is a modelling simplification, not a reconstruction of instrument-measured outdoor WBGT. The paper treats this explicitly as a limitation.</p></div>
        <div class="card method-card"><h3>3. Clerical / cognitive heat-performance loss</h3><p><span class="source-tag tag-lit">Literature-derived</span> The implemented step function is based on the temperature-performance meta-analysis of Pilcher, Nadler & Busch (2002).</p><table class="clerical-table"><thead><tr><th>WBGT range</th><th>Modelled loss</th></tr></thead><tbody><tr><td>&lt; 21.11°C</td><td>0%</td></tr><tr><td>21.11–26.66°C</td><td>0.8%</td></tr><tr><td>26.67–32.21°C</td><td>7.5%</td></tr><tr><td>≥ 32.22°C</td><td>14.88%</td></tr></tbody></table><p class="method-note">This is the exact step function implemented in the analytical pipeline.</p></div>
        <div class="card method-card"><h3>4. Physical-work workability: main ISO-style model</h3><p><span class="source-tag tag-informed">Literature-informed</span> Light, moderate and heavy work use 200, 300 and 400 W metabolic rates; rest uses 117 W.</p><div class="formula">WBGT<sub>lim</sub>(M) = 34.9 − M/46</div><div class="formula small">A(W,M) = clip[(WBGT<sub>lim</sub>(117) − W) / (WBGT<sub>lim</sub>(117) − WBGT<sub>lim</sub>(M)), 0, 1]</div><div class="formula">loss = 1 − A(W,M)</div><p class="method-note">Main specification follows ISO-style work/rest logic as used in European occupational heat-productivity applications, including Szewczyk, Mongelli & Ciscar (2021).</p></div>
        <div class="card method-card"><h3>5. Functional-form sensitivities</h3><p><span class="source-tag tag-lit">Literature-derived</span> NIOSH-style heat threshold:</p><div class="formula">WBGT<sub>lim,NIOSH</sub>(M) = 56.7 − 11.5·log<sub>10</sub>(M)</div><p><span class="source-tag tag-informed">Literature-informed</span> Hothaps-style smooth workability sensitivity:</p><div class="formula small">A<sub>H</sub>(W) = 0.1 + 0.9 / [1 + (W/α<sub>1</sub>)<sup>α₂</sup>]</div><p class="method-note">Parameters: light (34.64, 22.72), moderate (32.93, 17.81), heavy (30.94, 16.64). These alternatives test sensitivity to the onset and curvature of physical-work heat loss.</p></div>
        <div class="card method-card"><h3>6. Mixed indoor / outdoor exposure</h3><p><span class="source-tag tag-study">Study-specific</span> Each activity has an outdoor share <em>o</em><sub>s</sub>. The model evaluates heat-loss functions separately before combining exposure:</p><div class="formula">ℓ<sub>sgtd</sub> = (1 − o<sub>s</sub>) f<sub>s</sub>(WBGT<sup>shade</sup><sub>gtd</sub>) + o<sub>s</sub> f<sub>s</sub>(WBGT<sup>sun</sup><sub>gtd</sub>)</div><p class="method-note">The model does not average shade and sun WBGT first. This preserves non-linearity in the heat-productivity relationship.</p></div>
        <div class="card method-card"><h3>7. Non-linear spatial aggregation</h3><p><span class="source-tag tag-study">Study-specific architecture</span> Heat loss is evaluated at grid-cell/day level and only then area-weighted to provinces.</p><div class="formula">ℓ<sub>pstd</sub> = Σ<sub>g∈p</sub> w<sub>pg</sub> · ℓ<sub>gstd</sub></div><p class="method-note">This is intentionally different from applying a non-linear loss function to province-average WBGT. Valid-cell weights are renormalised within the province-day calculation.</p></div>
        <div class="card method-card"><h3>8. Economic accounting</h3><p><span class="source-tag tag-study">Study-specific accounting</span> Proportional heat loss is translated into annual-equivalent productive capacity and value-added exposure:</p><div class="formula">Equivalent workers lost = N<sub>ps</sub> · ℓ<sub>pst</sub></div><div class="formula">Value-added loss = VA<sub>ps</sub> · ℓ<sub>pst</sub></div><p class="method-note">Equivalent workers are full-time-equivalent productive capacity, not layoffs. Value-added loss is a first-order accounting exposure, not a causal or general-equilibrium GDP forecast.</p></div>
        <div class="card method-card"><h3>9. Adaptation scenarios</h3><p><span class="source-tag tag-informed">Literature-informed</span> The three mechanisms follow the occupational-heat adaptation literature and the European JRC framework.</p><p><strong>Shade:</strong> protected outdoor exposure is reassigned from the direct-sun loss curve to the shade loss curve.</p><p><strong>Space cooling:</strong> the protected share of originally indoor clerical/light work is assigned zero modelled heat loss as a stylised upper-bound sensitivity.</p><p><strong>Exoskeleton:</strong> the protected share of heavy physical work is evaluated using the moderate-work loss curve.</p><p><span class="source-tag tag-study">Study-specific</span> Uptake rates of 25%, 50% and 75% are stylised sensitivities, not forecasts; costs are not included.</p></div>
        <div class="card method-card"><h3>10. Climate uncertainty</h3><p><span class="source-tag tag-study">Study-specific ensemble reporting</span> P1–P4 use the same ten EURO-CORDEX model chains. Ensemble mean, median, P05 and P95 describe dispersion across climate-model chains.</p><p class="method-note">P05–P95 are not statistical confidence intervals. Main P4 is 2076–2099 because that horizon is common to all ten chains; 2076–2100 is retained only as a separate nine-run sensitivity.</p></div>
      </div>

      <div class="card"><h2>Key methodological references</h2><ul class="source-list"><li><strong>Stull, R. (2011).</strong> “Wet-Bulb Temperature from Relative Humidity and Air Temperature.” <em>Journal of Applied Meteorology and Climatology</em> 50(11): 2267–2269. <a href="https://doi.org/10.1175/JAMC-D-11-0143.1" target="_blank" rel="noopener">doi:10.1175/JAMC-D-11-0143.1</a>.</li><li><strong>Pilcher, J.J., Nadler, E. & Busch, C. (2002).</strong> “Effects of hot and cold temperature exposure on performance: a meta-analytic review.” <em>Ergonomics</em> 45(10): 682–698. <a href="https://doi.org/10.1080/00140130210158419" target="_blank" rel="noopener">doi:10.1080/00140130210158419</a>.</li><li><strong>NIOSH (2016).</strong> <em>Criteria for a Recommended Standard: Occupational Exposure to Heat and Hot Environments</em>. DHHS (NIOSH) Publication 2016-106. <a href="https://www.cdc.gov/niosh/docs/2016-106/" target="_blank" rel="noopener">NIOSH publication</a>.</li><li><strong>ISO 7243:2017.</strong> <em>Ergonomics of the thermal environment — Assessment of heat stress using the WBGT index</em>. Used as the occupational-heat standard underlying the main ISO-style work/rest interpretation.</li><li><strong>Szewczyk, W., Mongelli, I. & Ciscar, J.-C. (2021).</strong> “Heat stress, labour productivity and adaptation in Europe—a regional and occupational analysis.” <em>Environmental Research Letters</em> 16: 105002. <a href="https://doi.org/10.1088/1748-9326/ac24cf" target="_blank" rel="noopener">doi:10.1088/1748-9326/ac24cf</a>.</li></ul><p class="method-note">The full manuscript and Supplementary Information contain the complete bibliography and additional sources for climate scenarios, adaptation, occupational-health convergence and robustness analyses.</p></div>

      <div class="card" id="paper-citation"><h2>Paper & dashboard citation</h2><div class="citation-box"><strong>Working paper</strong><br>Simeone, F. (${YEAR}). <em>${PAPER_TITLE}</em>. Working manuscript, August ${YEAR}.</div><p><strong>Dashboard authorship:</strong> designed, created and maintained by <strong>${AUTHOR}</strong> as the interactive companion to the study.</p><div class="citation-box"><strong>Planned archived dashboard citation</strong><br>Simeone, F. (${YEAR}). <em>Interactive companion dashboard for Heat stress, labour productivity and value-added losses across Italian provinces</em>. Version 1.0. Zenodo. DOI to be assigned when the frozen release is archived.</div><p class="method-note">Until the paper and dashboard archive receive persistent identifiers, please cite the working manuscript and report the live dashboard URL. The DOI field should not be populated before the archive actually exists.</p></div>
    `;

    if (notes?.parentElement) notes.parentElement.insertBefore(section, notes);
    else document.querySelector("main.shell")?.appendChild(section);

    btn.addEventListener("click", activateMethods);
  }

  function activateMethods() {
    document.querySelectorAll(".tab").forEach(t => t.classList.toggle("active", t.dataset.view === "methods-citations"));
    document.querySelectorAll(".view").forEach(v => v.classList.add("hidden"));
    document.getElementById("methods-citations")?.classList.remove("hidden");
    window.scrollTo({top:0, behavior:"smooth"});
  }

  function addFooter() {
    if (document.getElementById("site-footer")) return;
    const main = document.querySelector("main.shell");
    if (!main) return;
    const footer = document.createElement("footer");
    footer.id = "site-footer";
    footer.className = "site-footer";
    footer.innerHTML = `<strong>${PAPER_TITLE}</strong><br>Interactive companion dashboard created by <strong>${AUTHOR}</strong> · ${YEAR} working paper · <a href="#" id="footer-methods">Methods & citations</a> · <a href="https://github.com/simeonefilippo98-sys/heat-stress-italy-dashboard" target="_blank" rel="noopener">Source repository</a>`;
    main.appendChild(footer);
    document.getElementById("footer-methods")?.addEventListener("click", e => {e.preventDefault();activateMethods();});
  }

  function init() {addStyles();addHeaderAttribution();addMethodsView();addFooter();}
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init); else init();
})();
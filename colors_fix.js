(() => {
  if (!window.Plotly || !Plotly.react) return;

  const IMPACT_SCALE = [
    [0.00, "#ffffcc"],
    [0.18, "#ffeda0"],
    [0.36, "#fed976"],
    [0.54, "#feb24c"],
    [0.72, "#fd8d3c"],
    [0.86, "#f03b20"],
    [1.00, "#bd0026"]
  ];

  const BENEFIT_SCALE = [
    [0.00, "#edf8e9"],
    [0.20, "#c7e9c0"],
    [0.40, "#a1d99b"],
    [0.60, "#74c476"],
    [0.80, "#31a354"],
    [1.00, "#006d2c"]
  ];

  const originalReact = Plotly.react.bind(Plotly);

  Plotly.react = function(gd, data, layout, config) {
    const id = typeof gd === "string" ? gd : (gd && gd.id ? gd.id : "");
    if (Array.isArray(data)) {
      data.forEach(trace => {
        if (!trace || trace.type !== "choropleth") return;
        if (id === "map") {
          trace.colorscale = IMPACT_SCALE;
          trace.reversescale = false;
        } else if (id === "amap") {
          trace.colorscale = BENEFIT_SCALE;
          trace.reversescale = false;
        }
      });
    }
    return originalReact(gd, data, layout, config);
  };
})();

// Optional workforce-composition module. It stays invisible until the compact
// workforce dataset is present in the repository.
(() => {
  const script = document.createElement("script");
  script.src = "/workforce.js";
  script.async = true;
  document.head.appendChild(script);
})();

// Climate-hazard explorer. The loader inflates the compact module and the module
// itself validates the 103-province / 3,296-record payload before rendering.
(() => {
  const script = document.createElement("script");
  script.src = "/climate_hazard_loader.js";
  script.async = true;
  document.head.appendChild(script);
})();

// Multi-select economic filters. This augments the existing branch/activity
// selectors after the main microdata have loaded, without changing national totals.
(() => {
  const script = document.createElement("script");
  script.src = "/multiselect.js";
  script.async = true;
  document.head.appendChild(script);
})();

// Scientific provenance, paper citation and dashboard authorship. This module is
// presentation-only: it documents the exact formulas and references used by the
// study and does not alter any analytical output.
(() => {
  const script = document.createElement("script");
  script.src = "/methods_citations.js";
  script.async = true;
  document.head.appendChild(script);
})();

// Semantic fix for the detailed-activity layer: A-AGG is an agriculture branch
// aggregate used for full-economy reconciliation, not an ATECO5 activity. The
// helper keeps it in branch A and national totals while removing it from every
// selector or chart explicitly labelled as an activity view.
(() => {
  const script = document.createElement("script");
  script.src = "/activity_semantics_fix.js";
  script.async = true;
  document.head.appendChild(script);
})();

// Linked scientific chart interactions. Existing validated outputs are reused:
// period points become navigation controls, the uncertainty plot exposes an
// interactive P05–P95 band, and robustness bars open a methodological inspector.
// No new model estimates are introduced.
(() => {
  const script = document.createElement("script");
  script.src = "/linked_chart_interactions.js";
  script.async = true;
  document.head.appendChild(script);
})();

// Scenario Lab: A/B comparisons across validated combinations only. The detailed
// entity layer uses the main ISO outputs and archived adaptation states; alternative
// methodological sensitivities remain national and no-adaptation, matching the
// resolution of the robustness archive.
(() => {
  const script = document.createElement("script");
  script.src = "/scenario_lab.js";
  script.async = true;
  document.head.appendChild(script);
})();

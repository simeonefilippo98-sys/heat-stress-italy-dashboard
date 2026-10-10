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


// Load enhancement modules in a deterministic order. Their former independent
// async loaders could initialise the navigation and research metadata in a
// different order on slower connections.
(() => {
  const modules = [
    "/climate_hazard.js",
    "/multiselect.js",
    "/methods_citations.js",
    "/paper1_rebrand.js",
    "/activity_semantics_fix.js",
    "/linked_chart_interactions.js",
    "/scenario_lab_launcher.js",
  ];
  const load = src => new Promise((resolve, reject) => {
    const script = document.createElement("script");
    script.src = `${src}?v=1.3.0`;
    script.onload = resolve;
    script.onerror = () => reject(new Error(`Dashboard module failed to load: ${src}`));
    document.head.appendChild(script);
  });
  (async () => {
    for (const src of modules) await load(src);
  })().catch(error => console.error("Dashboard enhancement loading failed", error));
})();

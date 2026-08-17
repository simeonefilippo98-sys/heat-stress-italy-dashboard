(() => {
  const OLD_PAPER = "Heat stress, labour productivity and value-added losses across Italian provinces: climate uncertainty, occupational heterogeneity and adaptation";
  const NEW_PAPER = "Occupational heat stress and economic production in Italy: climate projections across provinces and five-digit economic activities";
  const DASHBOARD = "Occupational Heat Stress & Economic Production in Italy";
  const SUBTITLE = "Official interactive research companion to Paper 1 · 103 harmonised economic provinces · 821 observed ATECO5 activities + agriculture aggregate · P1–P4";

  function replaceText(root) {
    if (!root) return;
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
    const nodes = [];
    while (walker.nextNode()) nodes.push(walker.currentNode);
    for (const node of nodes) {
      let s = node.nodeValue || "";
      let out = s
        .replaceAll(OLD_PAPER, NEW_PAPER)
        .replaceAll("Interactive companion to the 2026 working paper", "Official interactive research companion to Paper 1")
        .replaceAll("Interactive companion dashboard for Heat stress, labour productivity and value-added losses across Italian provinces", "Occupational Heat Stress & Economic Production in Italy: interactive research companion to Paper 1")
        .replaceAll("Interactive companion dashboard", "Interactive research companion");
      if (out !== s) node.nodeValue = out;
    }
  }

  function applyBranding() {
    document.title = DASHBOARD;
    const header = document.querySelector("main.shell > header");
    if (header) {
      const h1 = header.querySelector("h1");
      const p = header.querySelector("p");
      if (h1) h1.textContent = DASHBOARD;
      if (p) p.textContent = SUBTITLE;
    }

    const meta = document.getElementById("research-meta");
    if (meta) {
      const pills = meta.querySelectorAll(".meta-pill");
      pills.forEach(el => {
        if ((el.textContent || "").includes("Interactive companion")) {
          el.textContent = "Official interactive research companion to Paper 1";
        }
      });
    }

    [document.getElementById("methods-citations"), document.getElementById("paper-citation"), document.querySelector(".site-footer")]
      .filter(Boolean)
      .forEach(replaceText);
  }

  function init() {
    applyBranding();
    let timer = null;
    const observer = new MutationObserver(() => {
      clearTimeout(timer);
      timer = setTimeout(applyBranding, 80);
    });
    observer.observe(document.body, {childList:true, subtree:true});
    setTimeout(() => { applyBranding(); observer.disconnect(); }, 12000);
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init, {once:true});
  else init();
})();

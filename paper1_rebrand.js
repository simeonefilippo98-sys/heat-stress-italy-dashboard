(() => {
  const DASHBOARD_TITLE = "Occupational Heat & Economic Exposure in Italy";
  const PAPER_TITLE = "Occupational heat stress and economic production in Italy: climate projections across provinces and five-digit economic activities";
  const AUTHOR = "Filippo Simeone";
  const YEAR = "2026";

  function applyBrand() {
    document.title = `${DASHBOARD_TITLE} | Interactive Research Companion`;

    const header = document.querySelector("main.shell > header");
    if (header) {
      const h1 = header.querySelector("h1");
      const subtitle = header.querySelector("p");
      if (h1) h1.textContent = DASHBOARD_TITLE;
      if (subtitle) subtitle.textContent = "Primary interactive research companion to Paper 1 · climate projections · 103 harmonised economic provinces · 821 observed ATECO5 activities + agriculture aggregate · P1–P4 · adaptation & uncertainty";
    }

    const meta = document.getElementById("research-meta");
    if (meta) {
      const pills = meta.querySelectorAll(".meta-pill");
      if (pills[1]) pills[1].textContent = "Primary interactive companion to Paper 1 (2026)";
    }

    const paperCitation = document.getElementById("paper-citation");
    if (paperCitation) {
      const box = paperCitation.querySelector(".citation-box") || paperCitation;
      box.innerHTML = `<strong>Working-paper citation</strong><br>${AUTHOR} (${YEAR}). <em>${PAPER_TITLE}</em>. Working manuscript, August 2026.`;
    }

    const methods = document.getElementById("methods-citations");
    if (methods) {
      const hero = methods.querySelector(".methods-hero .card p");
      if (hero) hero.innerHTML = `This dashboard is the <strong>primary interactive research companion to Paper 1</strong>, <em>${PAPER_TITLE}</em>, a ${YEAR} working paper by <strong>${AUTHOR}</strong>. It exposes the same validated analytical outputs used in the manuscript and its Supplementary Information.`;
    }

    document.querySelectorAll(".site-footer").forEach(footer => {
      footer.innerHTML = footer.innerHTML
        .replace(/Interactive companion dashboard for <em>.*?<\/em>/i, `Interactive research companion for Paper 1, <em>${PAPER_TITLE}</em>`)
        .replace(/Heat stress, labour productivity and value-added losses across Italian provinces: climate uncertainty, occupational heterogeneity and adaptation/gi, PAPER_TITLE);
    });
  }

  applyBrand();
  let runs = 0;
  const timer = setInterval(() => {
    applyBrand();
    runs += 1;
    if (runs >= 40) clearInterval(timer);
  }, 250);

  document.addEventListener("click", () => setTimeout(applyBrand, 0), true);
})();

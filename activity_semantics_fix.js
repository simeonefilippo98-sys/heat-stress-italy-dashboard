(() => {
  const AGRICULTURE_AGGREGATE = "A-AGG";

  function cleanMainActivitySelect() {
    const select = document.getElementById("ateco");
    if (!select) return false;

    [...select.options]
      .filter(o => String(o.value) === AGRICULTURE_AGGREGATE)
      .forEach(o => o.remove());

    const label = select.closest("label");
    if (label && !label.dataset.atecoSemanticsFixed) {
      for (const node of label.childNodes) {
        if (node.nodeType === Node.TEXT_NODE && node.textContent.trim()) {
          node.textContent = "Activity (ATECO5 only)";
          break;
        }
      }
      const note = document.createElement("span");
      note.className = "hint";
      note.textContent = "821 five-digit ATECO activities observed in the ASIA-based non-agricultural panel. Agriculture remains available as branch A and is not represented as a five-digit activity in this dataset.";
      label.appendChild(note);
      label.dataset.atecoSemanticsFixed = "1";
    }

    if (!select.dataset.atecoAggregateObserver) {
      const observer = new MutationObserver(() => {
        [...select.options]
          .filter(o => String(o.value) === AGRICULTURE_AGGREGATE)
          .forEach(o => o.remove());
      });
      observer.observe(select, {childList:true});
      select.dataset.atecoAggregateObserver = "1";
    }
    return true;
  }

  function patchExploreCompare() {
    const X = window.XP;
    if (!X || X.__atecoActivitySemanticsFixed || typeof X.activities !== "function") return false;

    X.activities = (q="") => {
      q = q.trim().toLowerCase();
      const rows = micro.filter(x => x.level === "ATECO5");
      const activities = [...new Map(
        rows.map(x => [String(x.s), `${x.s} · ${x.sd}`])
      ).entries()].sort((a,b) => a[0].localeCompare(b[0]));
      return q
        ? activities.filter(([v,l]) => v.toLowerCase().includes(q) || l.toLowerCase().includes(q))
        : activities;
    };

    X.topAct = () => {
      const m = new Map();
      micro
        .filter(x => x.p === PERIODS[3][0] && x.level === "ATECO5")
        .forEach(x => m.set(x.s, (m.get(x.s) || 0) + num(x.l0)));
      return [...m.entries()]
        .sort((a,b) => b[1] - a[1])
        .slice(0,3)
        .map(x => String(x[0]));
    };

    const originalRowsEntity = X.rowsEntity;
    X.rowsEntity = (type,id,period) => type === "activity"
      ? micro.filter(x => x.level === "ATECO5" && String(x.s) === String(id) && x.p === period)
      : originalRowsEntity(type,id,period);

    const originalGroup = X.group;
    X.group = (rows,key,scenario) => {
      let useRows = rows;
      try {
        const sample = rows.find(Boolean);
        const sampleKey = sample ? String(key(sample)) : "";
        if (sampleKey.includes("|||")) useRows = rows.filter(x => x.level === "ATECO5");
      } catch (_) {}
      return originalGroup(useRows,key,scenario);
    };

    const activityOption = [...document.querySelectorAll("#xp-type option")]
      .find(o => o.value === "activity");
    if (activityOption) activityOption.textContent = "Activities (ATECO5)";

    const selectedType = document.getElementById("xp-type")?.value;
    if (selectedType === "activity" && typeof X.entityOptions === "function") {
      const retained = (typeof X.selected === "function" ? X.selected() : [])
        .filter(x => x.id !== AGRICULTURE_AGGREGATE)
        .map(x => x.id);
      X.entityOptions("activity", retained);
    }

    X.__atecoActivitySemanticsFixed = true;
    console.info("ATECO activity semantics fixed", {
      activity_codes: new Set(micro.filter(x => x.level === "ATECO5").map(x => x.s)).size,
      agriculture_aggregate_in_activity_lists: false,
      agriculture_available_as_branch_A: true
    });
    return true;
  }

  function addTransparencyNote() {
    if (document.getElementById("ateco-coverage-transparency-note")) return true;

    const notes = document.querySelector("#notes .prose");
    if (!notes) return false;

    const p = document.createElement("p");
    p.id = "ateco-coverage-transparency-note";
    p.innerHTML = '<strong>ATECO coverage and agriculture.</strong> The detailed activity layer contains 821 five-digit ATECO activities actually observed in the ASIA-based non-agricultural economic panel; it is not intended to reproduce the full universe of five-digit ATECO categories. Agriculture is modelled separately as branch A because the project does not have a province-by-ATECO5 agricultural employment and value-added source that is conceptually comparable to the non-agricultural ASIA panel. The study therefore uses the conservative architecture <strong>821 observed ATECO5 activities + an aggregated agriculture branch</strong>, rather than creating unsupported agricultural ATECO5 splits through arbitrary allocation rules.';
    notes.appendChild(p);

    const methodsCards = document.querySelectorAll("#methods-citations .card");
    const target = methodsCards.length ? methodsCards[methodsCards.length - 1] : null;
    if (target) {
      const m = document.createElement("p");
      m.className = "method-note";
      m.innerHTML = '<strong>Coverage note:</strong> the 821 ATECO5 activities are those observed in the ASIA-based non-agricultural panel. Agriculture is retained as a separate aggregate branch rather than artificially decomposed into five-digit activities without a consistent province-level employment and value-added source.';
      target.appendChild(m);
    }
    return true;
  }

  function boot() {
    cleanMainActivitySelect();
    patchExploreCompare();
    addTransparencyNote();

    let attempts = 0;
    const timer = setInterval(() => {
      const mainReady = cleanMainActivitySelect();
      const exploreReady = patchExploreCompare() || Boolean(window.XP?.__atecoActivitySemanticsFixed);
      const noteReady = addTransparencyNote();
      if ((mainReady && exploreReady && noteReady) || ++attempts > 120) clearInterval(timer);
    }, 250);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot, {once:true});
  } else {
    boot();
  }
})();

(() => {
  const wait = setInterval(() => {
    try {
      if (typeof micro === "undefined" || !Array.isArray(micro) || !micro.length) return;
      if (typeof selectedRows !== "function" || typeof rebuildAteco !== "function" || typeof renderMicro !== "function") return;
      const branch = document.getElementById("branch");
      const ateco = document.getElementById("ateco");
      if (!branch || !ateco || branch.options.length < 2 || ateco.options.length < 2) return;
      clearInterval(wait);
      install(branch, ateco);
    } catch (e) {
      console.error("Multi-select installer failed", e);
      clearInterval(wait);
    }
  }, 250);

  function install(branch, ateco) {
    const oldRebuildAteco = rebuildAteco;

    function vals(select) {
      return [...select.selectedOptions].map(o => String(o.value)).filter(Boolean);
    }

    function ensureAllState(select) {
      const real = vals(select);
      const all = [...select.options].find(o => o.value === "");
      if (all) all.selected = real.length === 0;
    }

    function enhance(select, rows, label) {
      select.multiple = true;
      select.size = rows;
      select.classList.add("multi-native");
      select.setAttribute("aria-label", `${label}; click items to combine selections`);

      const hint = document.createElement("span");
      hint.className = "hint multi-hint";
      hint.textContent = "Click items to combine selections · click All to reset";
      select.parentElement?.appendChild(hint);

      select.addEventListener("mousedown", ev => {
        const opt = ev.target?.closest?.("option");
        if (!opt) return;
        ev.preventDefault();
        select.focus();

        if (opt.value === "") {
          [...select.options].forEach(o => { o.selected = false; });
          opt.selected = true;
        } else {
          const was = opt.selected;
          const all = [...select.options].find(o => o.value === "");
          if (all) all.selected = false;
          opt.selected = !was;
          ensureAllState(select);
        }
        select.dispatchEvent(new Event("change", {bubbles:true}));
      });
      ensureAllState(select);
    }

    // Replace the core filtering rule with union semantics for selected branches/activities.
    selectedRows = function(periodOverride=null) {
      const p = periodOverride || document.getElementById("period").value;
      const bs = vals(document.getElementById("branch"));
      const wi = document.getElementById("intensity").value;
      const ex = document.getElementById("exposure").value;
      const ss = vals(document.getElementById("ateco"));
      return micro.filter(x =>
        x.p === p &&
        (!bs.length || bs.includes(String(x.b))) &&
        (!wi || x.wi === wi) &&
        (!ex || String(x.o) === ex) &&
        (!ss.length || ss.includes(String(x.s)))
      );
    };

    // Rebuild Activity from the UNION of all selected branches, not only the first branch.
    rebuildAteco = function() {
      const current = new Set(vals(ateco));
      const p = document.getElementById("period").value;
      const bs = vals(branch);
      const wi = document.getElementById("intensity").value;
      const ex = document.getElementById("exposure").value;
      const rows = micro.filter(x =>
        x.p === p &&
        (!bs.length || bs.includes(String(x.b))) &&
        (!wi || x.wi === wi) &&
        (!ex || String(x.o) === ex)
      );
      const options = [...new Map(rows.map(x => [String(x.s), [x.sd, x.level]])).entries()]
        .sort((a,b) => a[0].localeCompare(b[0]));

      ateco.innerHTML = '<option value="">All activities</option>';
      for (const [v,[desc,level]] of options) {
        ateco.add(new Option(`${v} · ${desc}${level === "VA_BRANCH" ? " · aggregate branch" : ""}`, v));
      }
      let restored = 0;
      [...ateco.options].forEach(o => {
        if (o.value && current.has(o.value)) { o.selected = true; restored += 1; }
      });
      if (!restored) ateco.options[0].selected = true;
      ensureAllState(ateco);
    };

    enhance(branch, 5, "Economic branch");
    enhance(ateco, 7, "Activity");

    // Original listeners may render once; these listeners run after them and enforce the multi-state.
    branch.addEventListener("change", () => {
      ensureAllState(branch);
      rebuildAteco();
      renderMicro();
    });
    ateco.addEventListener("change", () => {
      ensureAllState(ateco);
      renderMicro();
    });

    // Intensity/exposure/period changes must preserve the multi-branch union while refreshing activities.
    ["period","intensity","exposure"].forEach(id => {
      document.getElementById(id)?.addEventListener("change", () => {
        setTimeout(() => { rebuildAteco(); renderMicro(); }, 0);
      });
    });

    rebuildAteco();
    renderMicro();
    console.info("Multi-select filters enabled", {
      branches: vals(branch), activities: vals(ateco),
      aggregation: "sum VA/workers/losses first, then recompute intensity"
    });
  }
})();

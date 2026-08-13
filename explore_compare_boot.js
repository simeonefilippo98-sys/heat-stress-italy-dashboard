(()=>{
const X=window.XP;
X.copyLink=async()=>{
 const u=new URL(location.href);
 u.searchParams.set("view","explore");u.searchParams.set("province",X.$("xp-province").value);u.searchParams.set("period",X.$("xp-period").value);u.searchParams.set("scenario",X.$("xp-scenario").value);u.searchParams.set("compare",X.$("xp-type").value);u.searchParams.set("entities",X.selected().map(x=>x.id).join(","));
 try{await navigator.clipboard.writeText(u.toString());X.$("xp-copy-link").textContent="Copied";setTimeout(()=>X.$("xp-copy-link").textContent="Copy profile link",1200)}catch(e){console.warn("Copy link unavailable",e);}
};
X.install=()=>{
 X.inject();
 X.provinces().forEach(([v,l])=>X.$("xp-province").add(new Option(l,v)));PERIODS.forEach(([v,l])=>X.$("xp-period").add(new Option(l,v)));
 const top=X.topProv();X.$("xp-province").value=top[0];X.$("xp-period").value=PERIODS[3][0];X.entityOptions("province",top);
 ["xp-province","xp-period","xp-scenario"].forEach(id=>X.$(id).onchange=X.renderProfile);
 X.$("xp-type").onchange=e=>{const t=e.target.value;X.$("xp-search-wrap").classList.toggle("hidden",t!=="activity");X.entityOptions(t,[]);X.renderCompare();X.renderDelta();};
 ["xp-compare-scenario","xp-compare-metric"].forEach(id=>X.$(id).onchange=X.renderCompare);
 X.$("xp-entities").onchange=()=>{const a=[...X.$("xp-entities").selectedOptions];a.slice(X.MAX).forEach(o=>o.selected=false);X.renderChips();X.renderCompare();X.renderDelta();};
 X.$("xp-search").oninput=()=>X.entityOptions("activity",X.selected().map(x=>x.id));
 ["xp-delta-preset","xp-delta-metric","xp-delta-display"].forEach(id=>X.$(id).onchange=X.renderDelta);X.$("xp-copy-link").onclick=X.copyLink;
 const q=new URLSearchParams(location.search);
 if(q.get("province")&&X.provinces().some(x=>x[0]===q.get("province")))X.$("xp-province").value=q.get("province");
 if(q.get("period")&&PERIODS.some(x=>x[0]===q.get("period")))X.$("xp-period").value=q.get("period");
 if(["0","50","75"].includes(q.get("scenario")))X.$("xp-scenario").value=q.get("scenario");
 if(["province","branch","activity"].includes(q.get("compare"))){X.$("xp-type").value=q.get("compare");X.$("xp-search-wrap").classList.toggle("hidden",q.get("compare")!=="activity");X.entityOptions(q.get("compare"),(q.get("entities")||"").split(",").filter(Boolean));}
 const wire=()=>{const g=X.$("map");if(!g||typeof g.on!=="function"||g.dataset.xpWired)return false;g.dataset.xpWired="1";g.on("plotly_click",e=>{const r=e?.points?.[0]?.location;if(r){X.$("xp-province").value=String(r);X.activate("explore-compare");X.renderProfile();}});return true;};
 if(!wire()){let n=0,t=setInterval(()=>{if(wire()||++n>40)clearInterval(t)},250);}
 const p=document.querySelector("#notes .prose");if(p){const z=document.createElement("p");z.innerHTML="<strong>Explore & Compare.</strong> Province profiles, entity comparisons, scenario deltas and accounting decompositions use the same validated microdata; deterministic summaries are descriptive, not causal.";p.appendChild(z);}
 X.renderAll();if(q.get("view")==="explore")X.activate("explore-compare");
};
const w=setInterval(()=>{try{if(typeof micro==="undefined"||!micro.length||typeof Plotly==="undefined")return;clearInterval(w);X.install();}catch(e){console.error("Explore & Compare failed",e);clearInterval(w)}},250);
})();
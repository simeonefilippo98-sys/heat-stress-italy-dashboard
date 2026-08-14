(() => {
  let tries = 0;
  let selectedMethod = "MAIN_ISO_MAIN_EXPOSURE";

  const methodInfo = {
    MAIN_ISO_MAIN_EXPOSURE:["ISO · main exposure","Primary specification: ISO-style physical-work workability with the study's main activity-specific outdoor exposure shares."],
    SENSITIVITY_ISO_HIGH_OUTDOOR_SHARE:["ISO · high outdoor share","Exposure sensitivity: ISO-style workability with the high activity-specific outdoor exposure mapping."],
    SENSITIVITY_NIOSH_MAIN_EXPOSURE:["NIOSH · main exposure","Functional-form sensitivity: main exposure mapping with the NIOSH-style physical-work threshold."],
    SENSITIVITY_ISO_LOW_OUTDOOR_SHARE:["ISO · low outdoor share","Exposure sensitivity: ISO-style workability with the low activity-specific outdoor exposure mapping."],
    SENSITIVITY_HOTHAPS_MAIN_EXPOSURE:["Hothaps · main exposure","Functional-form sensitivity: main exposure mapping with the smooth Hothaps-style workability response."]
  };

  const short = s => String(s||"").split(" · ")[0];
  const f = (x,d=2) => Number(x||0).toLocaleString("en-US",{minimumFractionDigits:d,maximumFractionDigits:d});

  function ready(){
    return window.Plotly && typeof renderMicro === "function" && typeof renderUncertainty === "function" &&
      typeof selectedRows === "function" && typeof aggregateProvince === "function" &&
      Array.isArray(PERIODS) && Array.isArray(robustness) && robustness.length &&
      document.getElementById("trend") && document.getElementById("uncertainty-main") && document.getElementById("robustness-bar");
  }

  function styles(){
    if(document.getElementById("linked-science-style")) return;
    const s=document.createElement("style"); s.id="linked-science-style";
    s.textContent=`.linked-note{display:flex;gap:8px;align-items:center;flex-wrap:wrap;margin:7px 0 0;color:var(--muted);font-size:12px}.linked-note i{width:8px;height:8px;border-radius:99px;background:#172033;display:inline-block}.robust-inspector{margin-top:16px;padding:18px;border:1px solid var(--line);border-radius:12px;background:#fff}.robust-grid{display:grid;grid-template-columns:1.4fr repeat(4,minmax(105px,.65fr));gap:14px}.robust-copy h3{margin:0 0 6px}.robust-copy p{margin:0;color:var(--muted);line-height:1.5}.robust-stat span{display:block;color:var(--muted);font-size:11px;margin-bottom:4px}.robust-stat strong{font-size:18px}.robust-actions{display:flex;gap:8px;flex-wrap:wrap;margin-top:14px}.robust-actions button{border:1px solid var(--line);background:#fff;border-radius:9px;padding:8px 11px;cursor:pointer;font-weight:600}@media(max-width:900px){.robust-grid{grid-template-columns:1fr 1fr}.robust-copy{grid-column:1/-1}}`;
    document.head.appendChild(s);
  }

  function noteTrend(){
    const p=document.getElementById("trend"), card=p?.parentElement;
    if(!card || card.querySelector(".linked-note")) return;
    const n=document.createElement("div"); n.className="linked-note";
    n.innerHTML="<i></i><span>Hover for exact values and period-to-period change · click P1–P4 to update the map and filtered province results.</span>";
    card.appendChild(n);
  }

  function inspector(){
    if(document.getElementById("robust-inspector")) return;
    const v=document.getElementById("uncertainty"); if(!v) return;
    const d=document.createElement("div"); d.id="robust-inspector"; d.className="robust-inspector";
    d.innerHTML=`<div class="robust-grid"><div class="robust-copy"><h3 id="ri-title">Robustness inspector</h3><p id="ri-text">Click a methodological bar to inspect its ensemble range and difference from the main ISO specification.</p></div><div class="robust-stat"><span>Mean</span><strong id="ri-mean">—</strong></div><div class="robust-stat"><span>P05</span><strong id="ri-p05">—</strong></div><div class="robust-stat"><span>P95</span><strong id="ri-p95">—</strong></div><div class="robust-stat"><span>vs main ISO</span><strong id="ri-diff">—</strong></div></div><div class="robust-actions"><button id="ri-map">Open selected period in province explorer</button><button id="ri-methods">Open methods & citations</button></div>`;
    v.appendChild(d);
    document.getElementById("ri-map").onclick=()=>{const up=document.getElementById("u-period")?.value,p=document.getElementById("period");if(p&&up){p.value=up;p.dispatchEvent(new Event("change",{bubbles:true}));}document.querySelector('.tab[data-view="micro"]')?.click();};
    document.getElementById("ri-methods").onclick=()=>document.querySelector('.tab[data-view="methods-citations"]')?.click();
  }

  function enhanceTrend(){
    noteTrend();
    const plot=document.getElementById("trend"); if(!plot) return;
    const vals=PERIODS.map(([pid,label],i)=>{const a=aggregateProvince(selectedRows(pid)),l=a.reduce((s,x)=>s+Number(x.l||0),0),v=a.reduce((s,x)=>s+Number(x.va||0),0);return{pid,label,y:v?100*l/v:0,i};});
    const cd=vals.map((x,i)=>[x.label,x.pid,i?x.y-vals[i-1].y:null,i&&vals[i-1].y?100*(x.y/vals[i-1].y-1):null]);
    Plotly.react("trend",[{type:"scatter",mode:"lines+markers",x:vals.map(x=>short(x.label)),y:vals.map(x=>x.y),customdata:cd,line:{color:"#172033",width:3},marker:{size:10,color:"#172033"},hovertemplate:"<b>%{customdata[0]}</b><br>VA loss intensity: %{y:.2f}%<br>Change vs previous: %{customdata[2]:+.2f} pp<br>Relative change: %{customdata[3]:+.1f}%<extra>Click to open period</extra>"}],{title:{text:"P1–P4 trajectory · click a period to update the explorer",font:{size:16}},margin:{l:55,r:20,t:50,b:55},xaxis:{title:"Climate period"},yaxis:{title:"VA loss intensity (%)",rangemode:"tozero"},hovermode:"closest",plot_bgcolor:"#fff",uirevision:"linked-trend"},{responsive:true,displaylogo:false,scrollZoom:true});
    if(!plot.dataset.linked){plot.on("plotly_click",e=>{const i=e?.points?.[0]?.pointIndex,p=document.getElementById("period"),pid=PERIODS?.[i]?.[0];if(p&&pid){p.value=pid;p.dispatchEvent(new Event("change",{bubbles:true}));}});plot.dataset.linked="1";}
  }

  function spec(){const va=document.getElementById("u-outcome")?.value==="va";return{va,div:va?1e9:1,mean:va?"VA_loss_EUR_mean":"workers_lost_mean",p05:va?"VA_loss_EUR_p05":"workers_lost_p05",p95:va?"VA_loss_EUR_p95":"workers_lost_p95",unit:va?"€ billion":"equivalent workers"};}
  function out(v,s){return s.va?`€${f(v/s.div,2)}bn`:f(v/s.div,0);}

  function renderLinkedUncertainty(){
    inspector(); const s=spec(),period=document.getElementById("u-period")?.value;
    const main=PERIODS.map(([pid,label])=>{const r=robustness.find(x=>x.period_id===pid&&x.scenario_id==="MAIN_ISO_MAIN_EXPOSURE");return r?{pid,label,r}:null;}).filter(Boolean);
    const lo=main.map(x=>Number(x.r[s.p05])/s.div),me=main.map(x=>Number(x.r[s.mean])/s.div),hi=main.map(x=>Number(x.r[s.p95])/s.div);
    const cd=main.map((x,i)=>[x.label,x.pid,lo[i],hi[i],i?me[i]-me[i-1]:null,i&&me[i-1]?100*(me[i]/me[i-1]-1):null]);
    Plotly.react("uncertainty-main",[{type:"scatter",mode:"lines",x:main.map(x=>short(x.label)),y:lo,line:{width:0},hoverinfo:"skip",showlegend:false},{type:"scatter",mode:"lines",x:main.map(x=>short(x.label)),y:hi,fill:"tonexty",fillcolor:"rgba(23,32,51,.12)",line:{width:0},hoverinfo:"skip",name:"P05–P95 ensemble range"},{type:"scatter",mode:"lines+markers",x:main.map(x=>short(x.label)),y:me,customdata:cd,line:{color:"#172033",width:3},marker:{size:10,color:main.map(x=>x.pid===period?"#172033":"#667085")},name:"Ensemble mean",hovertemplate:`<b>%{customdata[0]}</b><br>Mean: %{y:${s.va?".2f":",.0f"}} ${s.unit}<br>P05: %{customdata[2]:${s.va?".2f":",.0f"}} ${s.unit}<br>P95: %{customdata[3]:${s.va?".2f":",.0f"}} ${s.unit}<br>Δ mean vs previous: %{customdata[4]:+${s.va?".2f":",.0f"}}<br>Relative change: %{customdata[5]:+.1f}%<extra>Click to inspect period</extra>`}],{title:{text:"Climate-model dispersion · click a period to inspect robustness",font:{size:16}},yaxis:{title:s.unit,rangemode:"tozero"},xaxis:{title:"Climate period"},legend:{orientation:"h",y:-.22},margin:{l:70,r:20,t:55,b:90},plot_bgcolor:"#fff",uirevision:"linked-u"},{responsive:true,displaylogo:false,scrollZoom:true});

    const order=["MAIN_ISO_MAIN_EXPOSURE","SENSITIVITY_ISO_HIGH_OUTDOOR_SHARE","SENSITIVITY_NIOSH_MAIN_EXPOSURE","SENSITIVITY_ISO_LOW_OUTDOOR_SHARE","SENSITIVITY_HOTHAPS_MAIN_EXPOSURE"];
    const rr=order.map(id=>robustness.find(x=>x.period_id===period&&x.scenario_id===id)).filter(Boolean),base=rr.find(x=>x.scenario_id==="MAIN_ISO_MAIN_EXPOSURE"),bm=base?Number(base[s.mean]):0;
    const c=rr.map(x=>[x.scenario_id,Number(x[s.p05])/s.div,Number(x[s.p95])/s.div,bm?100*(Number(x[s.mean])/bm-1):0,(Number(x[s.mean])-bm)/s.div]);
    Plotly.react("robustness-bar",[{type:"bar",x:rr.map(x=>ROBUST_LABELS[x.scenario_id]||x.scenario_id),y:rr.map(x=>Number(x[s.mean])/s.div),customdata:c,error_y:{type:"data",symmetric:false,array:rr.map(x=>(Number(x[s.p95])-Number(x[s.mean]))/s.div),arrayminus:rr.map(x=>(Number(x[s.mean])-Number(x[s.p05]))/s.div),thickness:1.3,width:4},marker:{color:rr.map(x=>x.scenario_id===selectedMethod?"#172033":x.scenario_id==="MAIN_ISO_MAIN_EXPOSURE"?"#475467":"#9aa9b7"),opacity:rr.map(x=>x.scenario_id===selectedMethod?1:.78)},hovertemplate:`<b>%{x}</b><br>Mean: %{y:${s.va?".2f":",.0f"}} ${s.unit}<br>P05: %{customdata[1]:${s.va?".2f":",.0f"}} ${s.unit}<br>P95: %{customdata[2]:${s.va?".2f":",.0f"}} ${s.unit}<br>Difference vs main ISO: %{customdata[3]:+.1f}%<extra>Click for details</extra>`}],{title:{text:"Methodological robustness · click a bar for details",font:{size:16}},yaxis:{title:s.unit,rangemode:"tozero"},xaxis:{tickangle:-20},margin:{l:70,r:20,t:55,b:125},plot_bgcolor:"#fff",uirevision:"linked-r"},{responsive:true,displaylogo:false,scrollZoom:true});

    const mp=document.getElementById("uncertainty-main"),rp=document.getElementById("robustness-bar");
    if(!mp.dataset.linked){mp.on("plotly_click",e=>{const i=e?.points?.[0]?.pointIndex,p=document.getElementById("u-period"),pid=PERIODS?.[i]?.[0];if(p&&pid){p.value=pid;selectedMethod="MAIN_ISO_MAIN_EXPOSURE";p.dispatchEvent(new Event("change",{bubbles:true}));}});mp.dataset.linked="1";}
    if(!rp.dataset.linked){rp.on("plotly_click",e=>{const id=e?.points?.[0]?.customdata?.[0];if(id){selectedMethod=id;renderLinkedUncertainty();}});rp.dataset.linked="1";}
    updateInspector(rr,s);
  }

  function updateInspector(rr,s){
    const r=rr.find(x=>x.scenario_id===selectedMethod)||rr[0],base=rr.find(x=>x.scenario_id==="MAIN_ISO_MAIN_EXPOSURE"); if(!r)return;
    const info=methodInfo[r.scenario_id]||[r.scenario_id,"Methodological sensitivity."],m=Number(r[s.mean]),b=base?Number(base[s.mean]):m,d=b?100*(m/b-1):0;
    document.getElementById("ri-title").textContent=info[0]; document.getElementById("ri-text").textContent=info[1]+" P05–P95 is climate-model-chain dispersion, not a confidence interval.";
    document.getElementById("ri-mean").textContent=out(m,s); document.getElementById("ri-p05").textContent=out(Number(r[s.p05]),s); document.getElementById("ri-p95").textContent=out(Number(r[s.p95]),s); document.getElementById("ri-diff").textContent=`${d>=0?"+":""}${f(d,1)}%`;
  }

  function install(){
    if(window.__linkedScience) return; window.__linkedScience=true; styles(); inspector();
    const m=window.renderMicro,u=window.renderUncertainty;
    window.renderMicro=function(...a){const r=m.apply(this,a);setTimeout(enhanceTrend,0);return r;};
    window.renderUncertainty=function(...a){u.apply(this,a);setTimeout(renderLinkedUncertainty,0);};
    enhanceTrend(); renderLinkedUncertainty();
    console.info("Linked scientific charts enabled",{new_model_estimates:false,trajectory_to_map:true,period_to_robustness:true,robustness_inspector:true});
  }

  const timer=setInterval(()=>{if(ready()){clearInterval(timer);install();}else if(++tries>160){clearInterval(timer);console.warn("Linked chart module timed out");}},250);
})();

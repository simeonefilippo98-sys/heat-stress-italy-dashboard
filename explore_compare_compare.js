(()=>{
const X=window.XP;
X.renderCompare=()=>{
 const t=X.$("xp-type").value,s=X.$("xp-compare-scenario").value,k=X.$("xp-compare-metric").value,e=X.selected().slice(0,X.MAX);
 if(!e.length)return;
 const traces=e.map(q=>({type:"scatter",mode:"lines+markers",name:q.label,x:PERIODS.map(x=>x[1]),y:PERIODS.map(([p])=>X.metric(X.agg(X.rowsEntity(t,q.id,p),s),k))}));
 Plotly.react("xp-compare-trend",traces,{title:{text:`P1–P4 comparison · ${X.metricTitle(k)}`,font:{size:16}},yaxis:{title:X.metricTitle(k)},margin:{l:70,r:20,t:55,b:95},plot_bgcolor:"#fff",legend:{orientation:"h",y:-.28}},X.CONFIG);
 const p=X.$("xp-period").value,v=e.map(q=>({q,y:X.metric(X.agg(X.rowsEntity(t,q.id,p),s),k)}));
 Plotly.react("xp-compare-current",[{type:"bar",x:v.map(x=>x.q.label),y:v.map(x=>x.y)}],{title:{text:`Selected entities · ${X.periodShort(p)}`,font:{size:16}},yaxis:{title:X.metricTitle(k)},xaxis:{tickangle:-25},margin:{l:70,r:20,t:55,b:160},plot_bgcolor:"#fff"},X.CONFIG);
};
X.deltaSpec=()=>{
 const v=X.$("xp-delta-preset").value;
 if(v==="p4_50")return{aP:PERIODS[3][0],aS:"0",bP:PERIODS[3][0],bS:"50",l:"Combined 50% minus no adaptation"};
 if(v==="p4_75")return{aP:PERIODS[3][0],aS:"0",bP:PERIODS[3][0],bS:"75",l:"Combined 75% minus no adaptation"};
 if(v==="75_50")return{aP:PERIODS[3][0],aS:"50",bP:PERIODS[3][0],bS:"75",l:"Combined 75% minus Combined 50%"};
 if(v==="p3_p2")return{aP:PERIODS[1][0],aS:"0",bP:PERIODS[2][0],bS:"0",l:"P3 minus P2 · no adaptation"};
 return{aP:PERIODS[0][0],aS:"0",bP:PERIODS[3][0],bS:"0",l:"P4 minus P1 · no adaptation"};
};
X.renderDelta=()=>{
 const k=X.$("xp-delta-metric").value,s=X.deltaSpec(),d=X.$("xp-delta-display").value,sel=X.$("xp-type").value==="province"?X.selected().map(x=>x.id):[];
 let ids=d==="selected"&&sel.length?sel:X.provinces().map(x=>x[0]);
 let r=ids.map(id=>{const A=X.agg(X.rowsProvince(id,s.aP),s.aS),B=X.agg(X.rowsProvince(id,s.bP),s.bS);return{id,pn:X.provinces().find(x=>x[0]===id)?.[1]||id,v:X.metric(B,k)-X.metric(A,k)}});
 if(d==="top"||!sel.length)r=r.sort((a,b)=>Math.abs(b.v)-Math.abs(a.v)).slice(0,15);
 r.sort((a,b)=>a.v-b.v);
 const title=k==="va_eur"?"Change in VA loss (€ million)":k==="workers"?"Change in equivalent workers lost":k==="workers_pct"?"Change in worker-loss intensity (pp)":"Change in VA-loss intensity (pp)";
 Plotly.react("xp-delta-chart",[{type:"bar",orientation:"h",x:r.map(x=>x.v),y:r.map(x=>x.pn)}],{title:{text:`Scenario delta · ${s.l}`,font:{size:16}},xaxis:{title,zeroline:true},margin:{l:130,r:20,t:55,b:60},plot_bgcolor:"#fff"},X.CONFIG);
 X.$("xp-delta-note").textContent=`${s.l}. B − A is shown. Negative values in adaptation comparisons indicate lower modelled loss; intensity changes are percentage points.`;
};
X.renderAll=()=>{X.renderProfile?.();X.renderCompare();X.renderDelta();};
})();
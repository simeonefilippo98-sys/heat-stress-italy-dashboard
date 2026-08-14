(() => {
  let tries = 0;
  function apply(){
    const type=document.getElementById("sl-type")?.value;
    if(!type) return false;
    for(const side of ["a","b"]){
      const method=document.getElementById(`sl-${side}-method`)?.value;
      const adapt=document.getElementById(`sl-${side}-adapt`)?.value;
      const range=document.getElementById(`sl-${side}-range`);
      const note=document.getElementById(`sl-${side}-valid`);
      if(!range||!note) continue;
      if(type==="italy" && method==="MAIN_ISO_MAIN_EXPOSURE"){
        range.textContent="National model-chain P05–P95: see Uncertainty & robustness";
        note.innerHTML="<strong>Validated main model.</strong> The Scenario Lab displays the national ensemble mean here; the authoritative national model-chain P05–P95 is kept in the Uncertainty & robustness view rather than reconstructed from aggregated adaptation percentiles.";
      } else if(type!=="italy" && type!=="province"){
        range.textContent="No separate micro P05–P95";
      }
      if(type==="italy" && method!=="MAIN_ISO_MAIN_EXPOSURE"){
        note.innerHTML="<strong>National robustness output.</strong> Alternative methodologies are archived at Italy level without adaptation. P05–P95 is the climate-model-chain dispersion stored in the robustness archive.";
      }
    }
    return true;
  }
  const timer=setInterval(()=>{
    if(apply()){
      ["sl-type","sl-a-method","sl-b-method","sl-a-adapt","sl-b-adapt","sl-a-period","sl-b-period","sl-metric"].forEach(id=>document.getElementById(id)?.addEventListener("change",()=>setTimeout(apply,0)));
      const lab=document.getElementById("scenario-lab");
      if(lab){new MutationObserver(()=>apply()).observe(lab,{subtree:true,childList:true,characterData:true});}
      clearInterval(timer);
      console.info("Scenario Lab uncertainty provenance clarified",{national_adaptation_ranges_not_reconstructed:true});
    } else if(++tries>180) clearInterval(timer);
  },250);
})();
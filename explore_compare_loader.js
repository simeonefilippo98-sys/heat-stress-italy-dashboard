(()=>{
 const files=["/explore_compare_core.js","/explore_compare_profile.js","/province_profile_loader.js","/explore_compare_compare.js","/explore_compare_boot.js"];
 const load=src=>new Promise((resolve,reject)=>{const s=document.createElement("script");s.src=src;s.onload=resolve;s.onerror=()=>reject(new Error(`Explore & Compare module failed: ${src}`));document.head.appendChild(s);});
 (async()=>{
  for(const src of files){
   await load(src);
   if(src==="/province_profile_loader.js"&&window.__provinceProfileReady)await window.__provinceProfileReady;
  }
 })().catch(e=>console.error("Explore & Compare loader failed",e));
})();

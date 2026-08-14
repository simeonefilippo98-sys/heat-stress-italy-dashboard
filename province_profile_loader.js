(() => {
  if (window.__provinceProfileReady) return;
  window.__provinceProfileReady = (async () => {
    const parts = ["/province_profile_code_01.b64", "/province_profile_code_02.b64"];
    const texts = await Promise.all(parts.map(async url => {
      const r = await fetch(url, {cache:"force-cache"});
      if (!r.ok) throw new Error(`${url}: ${r.status}`);
      return (await r.text()).replace(/\s+/g, "");
    }));
    const bin = atob(texts.join(""));
    const bytes = new Uint8Array(bin.length);
    for (let i=0;i<bin.length;i++) bytes[i]=bin.charCodeAt(i);
    const ds = new DecompressionStream("gzip");
    const code = await new Response(new Blob([bytes]).stream().pipeThrough(ds)).text();
    const s = document.createElement("script");
    s.textContent = code;
    document.head.appendChild(s);
    return true;
  })().catch(err => {
    console.error("Province Research Profile loader failed", err);
    return false;
  });
})();

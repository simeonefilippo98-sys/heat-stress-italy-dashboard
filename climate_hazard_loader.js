(async () => {
  try {
    const r = await fetch("/climate_hazard_code.b64", {cache:"no-store"});
    if (!r.ok) throw new Error(`climate_hazard_code.b64: ${r.status}`);
    const raw = (await r.text()).trim();
    let bytes;
    if (/^(?:\d{1,3}\s+)*\d{1,3}$/.test(raw)) {
      const values = raw.split(/\s+/).map(Number);
      if (values.some(x => x < 0 || x > 255)) throw new Error("Invalid decimal byte payload.");
      bytes = Uint8Array.from(values);
    } else {
      const b64 = raw.replace(/\s+/g, "");
      if (!b64 || b64.length % 4 !== 0) throw new Error("Incomplete Base64 payload.");
      const bin = atob(b64);
      bytes = Uint8Array.from(bin, ch => ch.charCodeAt(0));
    }
    const ds = new DecompressionStream("gzip");
    const code = await new Response(new Blob([bytes]).stream().pipeThrough(ds)).text();
    const s = document.createElement("script");
    s.textContent = code;
    document.head.appendChild(s);
  } catch (e) {
    console.error("Climate hazard loader failed", e);
  }
})();

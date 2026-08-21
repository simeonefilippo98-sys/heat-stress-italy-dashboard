(() => {
  if (window.__scenarioLabLauncher) return;
  window.__scenarioLabLauncher = true;

  const STATE = { loading: false, loaded: false, pending: null };
  const TAB_ID = 'scenario-lab-light-tab';

  function activatePlaceholder() {
    document.querySelectorAll('.tab').forEach(x => x.classList.toggle('active', x.id === TAB_ID));
    document.querySelectorAll('.view').forEach(x => x.classList.add('hidden'));
    let sec = document.getElementById('scenario-lab-light-loading');
    if (!sec) {
      sec = document.createElement('section');
      sec.id = 'scenario-lab-light-loading';
      sec.className = 'view';
      sec.innerHTML = '<div class="card prose"><h2>Scenario Lab</h2><p>Loading the lightweight Scenario Lab…</p></div>';
      const notes = document.getElementById('notes');
      notes?.parentElement?.insertBefore(sec, notes);
    }
    sec.classList.remove('hidden');
  }

  function loadModule(openState=null) {
    if (STATE.loaded && window.SLLight) {
      window.SLLight.activate(openState);
      return;
    }
    if (STATE.loading) {
      STATE.pending = openState || STATE.pending;
      activatePlaceholder();
      return;
    }
    STATE.loading = true;
    STATE.pending = openState;
    activatePlaceholder();
    const s = document.createElement('script');
    s.src = '/scenario_lab_light.js';
    s.async = true;
    s.onload = () => {
      STATE.loading = false;
      STATE.loaded = true;
      const stillActive = document.getElementById(TAB_ID)?.classList.contains("active");
      if (window.SLLight && stillActive) window.SLLight.activate(STATE.pending);
      STATE.pending = null;
    };
    s.onerror = () => {
      STATE.loading = false;
      const sec = document.getElementById('scenario-lab-light-loading');
      if (sec) sec.innerHTML = '<div class="card prose"><h2>Scenario Lab</h2><p>The lightweight module could not be loaded. Reload the page and try again.</p></div>';
    };
    document.head.appendChild(s);
  }

  function injectTab() {
    if (document.getElementById(TAB_ID)) return;
    const nav = document.querySelector('nav.tabs') || document.querySelector('.tabs');
    if (!nav) return;
    const btn = document.createElement('button');
    btn.id = TAB_ID;
    btn.className = 'tab';
    btn.dataset.view = 'scenario-lab-light';
    btn.textContent = 'Scenario Lab';
    const anchor = document.querySelector('.tab[data-view="methods-citations"]') || document.querySelector('.tab[data-view="notes"]');
    nav.insertBefore(btn, anchor || null);
    btn.addEventListener('click', () => loadModule());
  }

  window.SLLauncher = {
    open: (state=null) => loadModule(state),
    openProvince: (provinceId) => loadModule({type:'province', id:String(provinceId), preset:'adapt50'})
  };

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', injectTab, {once:true});
  else injectTab();
})();

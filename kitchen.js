(() => {
  'use strict';

  // =====================================================================
  //  Экран кухни (повар или владелец): все заказы, которые ещё не поданы, —
  //  по порядку, сколько ждут, пожелания гостя. Без «принять / готово»:
  //  официант нажимает «Подано», и заказ уходит с экрана.
  // =====================================================================

  const S = window.Staff;
  const { $, esc, icon, tr } = S;
  const t = (...a) => S.t(...a);

  let api = null;
  let orders = [];
  let state = 'loading';     // loading | ready | error | stale
  let live = false;
  let seen = null;
  let stop = null;
  let timer = null;
  let tab = 'kitchen';
  const ACTIVE = ['new', 'accepted', 'cooking', 'ready'];
  // на кухне — только свежие неподанные заказы: забытый вчерашний не висит в очереди
  const cookable = (o) => ACTIVE.includes(o.status) && !o.paid_at && Date.now() - new Date(o.created_at).getTime() < 12 * 60 * 60 * 1000;
  let edits = new Map();   // id → edited_at, чтобы звенеть, когда владелец поменял заказ

  const hhmm = (iso) => new Date(iso).toLocaleTimeString(S.locale(), { hour: '2-digit', minute: '2-digit' });
  const mins = (iso) => Math.max(0, Math.floor((Date.now() - new Date(iso).getTime()) / 60000));
  const dayStart = () => { const d = new Date(); d.setHours(0, 0, 0, 0); return d; };
  const optNames = (i) => (i.opts || []).map((o) => tr(o.name)).filter(Boolean);

  // ---------- звук ----------
  let audio = null;
  let soundOn = (() => { try { return localStorage.getItem('kitchen:sound') !== '0'; } catch { return true; } })();
  function unlockAudio() {
    try {
      if (!audio) audio = new (window.AudioContext || window.webkitAudioContext)();
      if (audio.state === 'suspended') audio.resume();
    } catch { /* без звука */ }
    renderBanner();
  }
  ['pointerdown', 'keydown'].forEach((ev) => document.addEventListener(ev, unlockAudio, { capture: true }));
  function ding() {
    if (!soundOn || !audio || audio.state !== 'running') return;
    const t0 = audio.currentTime;
    [0, 0.25].forEach((dt) => {
      const o = audio.createOscillator();
      const g = audio.createGain();
      o.type = 'triangle';
      o.frequency.value = 660;
      g.gain.setValueAtTime(0.0001, t0 + dt);
      g.gain.exponentialRampToValueAtTime(0.5, t0 + dt + 0.02);
      g.gain.exponentialRampToValueAtTime(0.0001, t0 + dt + 0.22);
      o.connect(g).connect(audio.destination);
      o.start(t0 + dt);
      o.stop(t0 + dt + 0.24);
    });
  }
  let bannerMsg = '';
  function renderBanner() {
    const el = $('#a-banner');
    if (!el || !api) return;
    const parts = [];
    if (bannerMsg) parts.push(`<button type="button" class="banner-new" data-banner="x">${icon('bell')}<span>${esc(bannerMsg)}</span></button>`);
    if (soundOn && (!audio || audio.state !== 'running')) parts.push(`<button type="button" class="banner-sound" data-banner="sound">${icon('bell')}<span>${esc(t('sound_banner'))}</span></button>`);
    el.hidden = !parts.length;
    el.innerHTML = parts.join('');
  }

  // ---------- заказы ----------
  async function load() {
    try {
      const rows = await api.orders(dayStart().toISOString());
      const queue = rows.filter(cookable);
      const fresh = seen ? queue.filter((o) => !seen.has(o.id)) : [];
      seen = new Set([...(seen || []), ...queue.map((o) => o.id)]);
      const changed = queue.filter((o) => o.edited_at && edits.has(o.id) && edits.get(o.id) !== o.edited_at);
      edits = new Map(queue.map((o) => [o.id, o.edited_at || null]));
      orders = rows;
      state = 'ready';
      if (changed.length && !fresh.length) {
        bannerMsg = t('k_b_edit', changed[0].no, changed[0].table_label);
        renderBanner();
        ding();
        try { navigator.vibrate?.([200, 100, 200]); } catch { /* нет вибрации */ }
      }
      if (fresh.length) {
        bannerMsg = fresh.length > 1 ? t('k_b_many', fresh.length) : t('k_b_one', fresh[0].no, fresh[0].table_label);
        renderBanner();
        ding();
        try { navigator.vibrate?.([200, 100, 200]); } catch { /* нет вибрации */ }
      }
    } catch {
      state = state === 'ready' || state === 'stale' ? 'stale' : 'error';
    }
    const n = orders.filter(cookable).length;
    const el = $('#tab-count');
    if (el) { el.hidden = !n; el.textContent = n; }
    document.title = n ? `(${n}) ${t('k_title')}` : t('k_title');
  }

  function card(o) {
    const wait = mins(o.created_at);
    const late = wait >= 25 ? ' is-late' : wait >= 15 ? ' is-slow' : '';
    return `<article class="k-card${late}">
      <div class="k-head"><b>${esc(t('table'))} ${esc(o.table_label)}</b><span>№${esc(o.no)}</span></div>
      <div class="k-time">${esc(t('k_in', hhmm(o.created_at), wait))}</div>
      ${o.edited_at ? `<div class="k-edited">${icon('refresh', 'sm')}${esc(t('k_edited', hhmm(o.edited_at)))}</div>` : ''}
      <ul class="k-items">${(o.items || []).map((i) => `<li><b>${esc(i.qty)}×</b><span>${esc(tr(i.name) || i.id)}${optNames(i).length ? `<em>${esc(optNames(i).join(', '))}</em>` : ''}${window.Floor.noteHtml(i)}</span></li>`).join('')}</ul>
      ${o.note ? `<div class="k-note">${icon('alert', 'sm')}${esc(window.Floor.trNote(o.note))}</div>` : ''}
      <div class="k-actions">
        <button type="button" class="btn ghost small" data-print="${esc(o.id)}">${icon('printer', 'sm')}${esc(t('k_print'))}</button>
      </div>
    </article>`;
  }

  function render() {
    document.querySelectorAll('.a-tab').forEach((a) => a.setAttribute('aria-current', a.dataset.tab === tab ? 'page' : 'false'));
    const main = $('#a-main');
    if (tab === 'settings') {
      main.innerHTML = '<div id="st-box"></div>';
      window.StaffTools.settings(api, $('#st-box'), 'cook');
      return;
    }
    if (state === 'loading') { main.innerHTML = `<p class="a-empty">${esc(t('loading'))}</p>`; return; }
    if (state === 'error') {
      main.innerHTML = `<div class="a-card">${icon('alert', 'lg')}<h2>${esc(t('no_server'))}</h2><p>${esc(t('check_internet'))}</p><button type="button" class="btn block" data-retry>${icon('refresh', 'sm')}${esc(t('retry'))}</button></div>`;
      return;
    }
    const queue = orders.filter(cookable).sort((a, b) => new Date(a.created_at) - new Date(b.created_at));
    main.innerHTML = `
      <div class="toolbar">
        <span class="live-dot${live && state !== 'stale' ? '' : ' off'}">${esc(state === 'stale' ? t('live_stale') : live ? t('live_on') : t('live_poll'))}</span>
        <span class="grow"></span>
        <button type="button" class="btn small ghost" data-sound>${icon('bell', 'sm')}${esc(soundOn ? t('sound_on') : t('sound_off'))}</button>
      </div>
      <h2 class="o-section-title">${esc(t('k_queue'))} <span class="o-count${queue.length ? ' hot' : ''}">${queue.length}</span></h2>
      ${queue.length ? `<div class="k-grid">${queue.map(card).join('')}</div>` : `<p class="a-empty">${esc(t('k_e_queue'))}</p>`}`;
  }

  window.addEventListener('hashchange', () => { if (api) { tab = location.hash === '#settings' ? 'settings' : 'kitchen'; render(); } });
  document.addEventListener('click', (e) => {
    const p = e.target.closest('[data-print]');
    if (p) { const o = orders.find((x) => x.id === p.dataset.print); if (o) window.Floor.printTicket(o); return; }
    if (e.target.closest('[data-retry]')) { state = 'loading'; render(); load().then(render); return; }
    if (e.target.closest('[data-sound]')) {
      soundOn = !soundOn;
      try { localStorage.setItem('kitchen:sound', soundOn ? '1' : '0'); } catch { /* ok */ }
      if (soundOn) { unlockAudio(); ding(); }
      renderBanner();
      render();
      return;
    }
    const bn = e.target.closest('[data-banner]');
    if (bn) { if (bn.dataset.banner === 'sound') { unlockAudio(); ding(); } else { bannerMsg = ''; renderBanner(); location.hash = '#kitchen'; } }
  });
  setInterval(() => { if (api && tab === 'kitchen' && state !== 'loading' && !document.hidden) render(); }, 30000); // «ждёт N мин»

  S.start({
    need: 'kitchen',
    rerender() { renderBanner(); render(); },
    async onReady(ctx) {
      api = ctx.api;
      tab = location.hash === '#settings' ? 'settings' : 'kitchen';
      const st = S.settings;
      if (st) {
        $('#a-sub').textContent = st.name;
        if (st.logo_url) $('#a-logo').innerHTML = `<img src="${esc(st.logo_url)}" alt="">`;
      }
      await load();
      render();
      renderBanner();
      stop?.();
      stop = api.subscribe(['orders'], async () => { await load(); if (tab === 'kitchen') render(); }, (ok) => { live = ok; if (tab === 'kitchen') render(); });
      clearInterval(timer);
      timer = setInterval(async () => { if (document.hidden && live) return; await load(); if (tab === 'kitchen') render(); }, 10000);
    },
    onLogout() { stop?.(); stop = null; clearInterval(timer); bannerMsg = ''; renderBanner(); },
  });
})();

(() => {
  'use strict';

  // =====================================================================
  //  Экран кухни (повар или владелец): все заказы, которые ещё не поданы, —
  //  по порядку, сколько ждут, пожелания гостя. Без «принять / готово»:
  //  официант нажимает «Подано», и заказ уходит с экрана.
  //  Переключатель «Кухня · Бар · Всё» (по цеху категории блюда), стоп-лист
  //  (вкладка «Стоп-лист», модуль stop-list.js) и смена в шапке.
  //  Доставка: «Доставка №N» вместо стола и кнопка «Готово — отдать курьеру»;
  //  с экрана уходит, когда курьер забрал (в пути), доставил или заказ отменили.
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
  let cats = [];
  let dishes = [];
  let shift = null;      // StaffShift
  let stopCtl = null;    // StopList на вкладке «Стоп-лист»
  // цех: kitchen | bar | all — у каждого экрана свой, запоминаем на этом устройстве
  let station = (() => { try { return localStorage.getItem('kitchen:station') || ''; } catch { return ''; } })();
  const hasBar = () => cats.some((c) => c.station === 'bar');
  // пока ни одна категория не отмечена как бар — всегда «Всё»
  const mode = () => (hasBar() && ['kitchen', 'bar', 'all'].includes(station) ? station : 'all');
  // где готовят блюдо: категория блюда → её цех (неизвестное блюдо — на кухню)
  const stationOf = (i) => {
    const d = dishes.find((x) => x.id === i.id);
    const c = d && cats.find((x) => x.id === d.category_id);
    return c?.station === 'bar' ? 'bar' : 'kitchen';
  };
  const itemsFor = (o) => (mode() === 'all' ? o.items || [] : (o.items || []).filter((i) => stationOf(i) === mode()));
  // заказ для этого экрана: только позиции своего цеха; без них заказа здесь нет
  const forMe = (o) => itemsFor(o).length > 0;
  // confirm (доставка ждёт звонка ресторана) сюда не входит: на кухню она попадёт только после «Принять заказ»
  const ACTIVE = ['new', 'accepted', 'cooking', 'ready'];
  // на кухне — только свежие неподанные заказы: забытый вчерашний не висит в очереди
  const cookable = (o) => ACTIVE.includes(o.status) && !o.paid_at && Date.now() - new Date(o.created_at).getTime() < 12 * 60 * 60 * 1000;
  let edits = new Map();   // id → edited_at, чтобы звенеть, когда владелец поменял заказ
  const isDeliv = (o) => window.Floor.isDeliv(o);
  const busy = new Set();  // доставка: «готово» уже отправляется

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
  // новый заказ и «заказ изменили» звучат по-разному (звуки — в floor.js)
  function ding(kind = 'kitchen') {
    if (!soundOn) return;
    window.Floor.chime(audio, kind);
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

  // ---------- меню: нужно, чтобы знать цех каждого блюда ----------
  async function loadMenu() {
    try { [cats, dishes] = await Promise.all([api.categories(), api.dishes()]); } catch { /* цех не знаем — всё на кухню */ }
  }

  // ---------- заказы ----------
  async function load() {
    try {
      const rows = await api.orders(dayStart().toISOString());
      const queue = rows.filter(cookable);
      // звеним только о заказах, где есть что готовить этому цеху
      const fresh = seen ? queue.filter((o) => !seen.has(o.id) && forMe(o)) : [];
      seen = new Set([...(seen || []), ...queue.map((o) => o.id)]);
      const changed = queue.filter((o) => o.edited_at && edits.has(o.id) && edits.get(o.id) !== o.edited_at && forMe(o));
      edits = new Map(queue.map((o) => [o.id, o.edited_at || null]));
      orders = rows;
      state = 'ready';
      if (changed.length && !fresh.length) {
        bannerMsg = t('k_b_edit', changed[0].no, changed[0].table_label);
        renderBanner();
        ding('edit');
        try { navigator.vibrate?.([200, 100, 200]); } catch { /* нет вибрации */ }
      }
      if (fresh.length) {
        const bar = mode() === 'bar';
        bannerMsg = fresh.length > 1 ? t(bar ? 'k_b_bar_many' : 'k_b_many', fresh.length)
          : isDeliv(fresh[0]) ? t('k_b_deliv', fresh[0].no) : t(bar ? 'k_b_bar_one' : 'k_b_one', fresh[0].no, fresh[0].table_label);
        renderBanner();
        ding();
        try { navigator.vibrate?.([200, 100, 200]); } catch { /* нет вибрации */ }
      }
    } catch {
      state = state === 'ready' || state === 'stale' ? 'stale' : 'error';
    }
    updateCount();
  }
  function updateCount() {
    const n = orders.filter((o) => cookable(o) && forMe(o)).length;
    const el = $('#tab-count');
    if (el) { el.hidden = !n; el.textContent = n; }
    document.title = n ? `(${n}) ${t('k_title')}` : t('k_title');
  }

  function card(o) {
    const items = itemsFor(o);
    const wait = mins(o.created_at);
    const late = wait >= 25 ? ' is-late' : wait >= 15 ? ' is-slow' : '';
    return `<article class="k-card${late}">
      <div class="k-head">${isDeliv(o) ? `<b class="k-deliv">${icon('bike')}${esc(t('delivery'))}</b>` : `<b>${esc(t('table'))} ${esc(o.table_label)}</b>`}<span>№${esc(o.no)}</span></div>
      <div class="k-time">${esc(t('k_in', hhmm(o.created_at), wait))}</div>
      ${o.edited_at ? `<div class="k-edited">${icon('refresh', 'sm')}${esc(t('k_edited', hhmm(o.edited_at)))}</div>` : ''}
      <ul class="k-items">${items.map((i) => `<li><b>${esc(i.qty)}×</b><span>${esc(tr(i.name) || i.id)}${optNames(i).length ? `<em>${esc(optNames(i).join(', '))}</em>` : ''}${window.Floor.noteHtml(i)}</span></li>`).join('')}</ul>
      ${items.length < (o.items || []).length ? `<div class="k-other">${esc(t('k_other_st', (o.items || []).length - items.length, mode() === 'bar' ? t('st_kitchen') : t('st_bar')))}</div>` : ''}
      ${o.note ? `<div class="k-note">${icon('alert', 'sm')}${esc(window.Floor.trNote(o.note))}</div>` : ''}
      ${isDeliv(o) ? (o.status === 'ready' ? `<div class="k-dstate is-ready">${icon('check', 'sm')}${esc(t('k_deliv_wait'))}</div>`
        : o.status === 'new' ? `<div class="k-dstate">${esc(t('k_deliv_new'))}</div>` : '') : ''}
      <div class="k-actions">
        ${isDeliv(o) && ['accepted', 'cooking'].includes(o.status) ? `<button type="button" class="btn" data-k-ready="${esc(o.id)}"${busy.has(o.id) ? ' disabled' : ''}>${icon('check', 'sm')}${esc(t('k_deliv_ready'))}</button>` : ''}
        <button type="button" class="btn ghost small" data-print="${esc(o.id)}">${icon('printer', 'sm')}${esc(t('k_print'))}</button>
      </div>
    </article>`;
  }

  function render() {
    document.querySelectorAll('.a-tab').forEach((a) => a.setAttribute('aria-current', a.dataset.tab === tab ? 'page' : 'false'));
    const main = $('#a-main');
    if (tab !== 'stop' && stopCtl) { stopCtl.close(); stopCtl = null; }
    if (tab === 'settings') {
      main.innerHTML = '<div id="st-box"></div>';
      window.StaffTools.settings(api, $('#st-box'), 'cook');
      return;
    }
    if (tab === 'stop') {
      if (stopCtl && stopCtl.host.isConnected) { stopCtl.render(); return; }
      main.innerHTML = '<div id="sl-box"></div>';
      stopCtl = window.StopList.open($('#sl-box'), { api });
      return;
    }
    if (state === 'loading') { main.innerHTML = `<p class="a-empty">${esc(t('loading'))}</p>`; return; }
    if (state === 'error') {
      main.innerHTML = `<div class="a-card">${icon('alert', 'lg')}<h2>${esc(t('no_server'))}</h2><p>${esc(t('check_internet'))}</p><button type="button" class="btn block" data-retry>${icon('refresh', 'sm')}${esc(t('retry'))}</button></div>`;
      return;
    }
    const queue = orders.filter((o) => cookable(o) && forMe(o)).sort((a, b) => new Date(a.created_at) - new Date(b.created_at));
    const m = mode();
    main.innerHTML = `
      <div class="toolbar k-top">
        <div class="chips k-station" role="group" aria-label="${esc(t('st_label'))}">
          ${['kitchen', 'bar', 'all'].map((k) => `<button type="button" class="chip${m === k ? ' active' : ''}" data-station="${k}"${k !== 'all' && !hasBar() ? ' disabled' : ''}>${esc(t(`st_${k}`))}</button>`).join('')}
        </div>
        <span class="grow"></span>
        ${shift ? shift.html(true) : ''}
      </div>
      ${hasBar() ? '' : `<p class="help">${esc(t('st_no_bar'))}</p>`}
      <div class="toolbar">
        <span class="live-dot${live && state !== 'stale' ? '' : ' off'}">${esc(state === 'stale' ? t('live_stale') : live ? t('live_on') : t('live_poll'))}</span>
        <span class="grow"></span>
        <button type="button" class="btn small ghost" data-sound>${icon('bell', 'sm')}${esc(soundOn ? t('sound_on') : t('sound_off'))}</button>
      </div>
      <h2 class="o-section-title">${esc(m === 'bar' ? t('k_queue_bar') : t('k_queue'))} <span class="o-count${queue.length ? ' hot' : ''}">${queue.length}</span></h2>
      ${queue.length ? `<div class="k-grid">${queue.map(card).join('')}</div>` : `<p class="a-empty">${esc(t('k_e_queue'))}</p>`}`;
  }

  // доставка готова — курьер видит «Готова, ждёт курьера»
  async function deliveryReady(id) {
    if (busy.has(id)) return;
    busy.add(id);
    render();
    try { await api.kitchenSet(id, 'ready'); await load(); } catch (ex) { S.toast(S.errText(ex), true); }
    busy.delete(id);
    render();
  }

  const tabOf = () => (location.hash === '#settings' ? 'settings' : location.hash === '#stop' ? 'stop' : 'kitchen');
  window.addEventListener('hashchange', () => { if (api) { tab = tabOf(); render(); } });
  document.addEventListener('click', (e) => {
    if (shift?.handleClick(e)) return;
    const stn = e.target.closest('[data-station]');
    if (stn) {
      station = stn.dataset.station;
      try { localStorage.setItem('kitchen:station', station); } catch { /* ok */ }
      updateCount();
      render();
      return;
    }
    const kr = e.target.closest('[data-k-ready]');
    if (kr) { deliveryReady(kr.dataset.kReady); return; }
    const p = e.target.closest('[data-print]');
    if (p) {
      const o = orders.find((x) => x.id === p.dataset.print);
      // на бумажке — только блюда своего цеха
      if (o) window.Floor.printTicket({ ...o, items: itemsFor(o) }, mode() === 'bar' ? t('p_bar') : t('p_kitchen'));
      return;
    }
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
      tab = tabOf();
      shift = window.StaffShift.create(api, ctx.me, () => { if (tab === 'kitchen') render(); });
      const st = S.settings;
      if (st) {
        $('#a-sub').textContent = st.name;
        if (st.logo_url) $('#a-logo').innerHTML = `<img src="${esc(st.logo_url)}" alt="">`;
      }
      await Promise.all([loadMenu(), shift.load()]);
      await load();
      render();
      renderBanner();
      stop?.();
      stop = api.subscribe(['orders', 'dishes', 'categories'], async (table) => {
        if (table === 'orders') { await load(); if (tab === 'kitchen') render(); return; }
        // меню поменяли (стоп-лист на другом устройстве, цех категории) — обновить
        await loadMenu();
        updateCount();
        if (tab === 'kitchen') render();
        else if (tab === 'stop') stopCtl?.reload();
      }, (ok) => { live = ok; if (tab === 'kitchen') render(); });
      clearInterval(timer);
      timer = setInterval(async () => { if (document.hidden && live) return; await load(); if (tab === 'kitchen') render(); }, 10000);
    },
    onLogout() { stop?.(); stop = null; clearInterval(timer); bannerMsg = ''; renderBanner(); },
  });
})();

(() => {
  'use strict';

  // =====================================================================
  //  Страница курьера: доставки, которые ждут курьера, «мои в пути»
  //  (адрес, звонок гостю, маршрут в Google Maps / Waze), «Забрал заказ»
  //  и «Доставил» с выбором оплаты (наличными / картой), итоги дня —
  //  сколько наличных сдать в кассу. Смена, язык, Telegram — как у официанта.
  //  Права проверяет база: курьер видит только доставку (orders_staff_read),
  //  забирает и закрывает её через courier_take / courier_done.
  // =====================================================================

  const S = window.Staff;
  const { $, esc, icon, tr, money } = S;
  const t = (...a) => S.t(...a);
  const F = window.Floor;

  let api = null;
  let me = null;
  let tab = 'orders';
  let orders = [];
  let state = 'loading';   // loading | ready | error | stale
  let live = false;
  let seen = null;         // какие доставки уже показывали — звеним только на новые
  let stop = null;
  let timer = null;
  let shift = null;        // StaffShift: «Начать смену» / «Закончить смену»
  const busy = new Set();

  // ждут курьера: от «новой» до «готова»; «в пути» — у курьера; «served» у доставки = доставлен
  // confirm (ждёт звонка ресторана) курьер не видит и не забирает — база тоже его не отдаёт
  const WAIT = ['new', 'accepted', 'cooking', 'ready'];
  const hhmm = (iso) => new Date(iso).toLocaleTimeString(S.locale(), { hour: '2-digit', minute: '2-digit' });
  const ago = (iso) => { const m = Math.max(0, Math.floor((Date.now() - new Date(iso).getTime()) / 60000)); return (window.STAFF_T.ago[S.lang] || window.STAFF_T.ago.en)(m); };
  const dayStart = () => { const d = new Date(); d.setHours(0, 0, 0, 0); return d; };
  // деньги — в сенах (целых), как в базе
  const sen = (x) => Math.round((Number(x) || 0) * 100);
  const round5 = (s) => Math.round(s / 5) * 5;
  const roundingOn = () => S.settings?.cash_rounding !== false;
  // сколько взять с гостя: наличные округляются до 5 сен (как courier_done), карта — точно
  const dueSen = (o, m) => (m === 'cash' && roundingOn() ? round5(sen(o.total)) : sen(o.total));
  const optNames = (i) => F.optNames(i);
  const modalOpen = () => !!document.querySelector('.modal');
  // забытая вчерашняя доставка не висит в «ждут курьера»
  const recent = (o) => Date.now() - new Date(o.created_at).getTime() < 12 * 3600e3;

  // ---------- чем заплатил гость: запоминаем на этом телефоне ----------
  // Курьер не читает счета (это право зала), поэтому способ оплаты для итогов дня берём отсюда,
  // а если «Доставил» нажимали на другом телефоне — тот, что гость выбрал при заказе.
  const PAID_KEY = 'courier:paid';
  function readPaid() {
    try { return JSON.parse(localStorage.getItem(PAID_KEY) || '{}') || {}; } catch { return {}; }
  }
  function rememberPaid(id, m) {
    const all = readPaid();
    const week = Date.now() - 7 * 864e5;
    for (const [k, v] of Object.entries(all)) if (!v || v.at < week) delete all[k];
    all[id] = { m, at: Date.now() };
    try { localStorage.setItem(PAID_KEY, JSON.stringify(all)); } catch { /* не сохранится — возьмём способ гостя */ }
  }
  const methodOf = (o) => readPaid()[o.id]?.m || o.pay_method || 'cash';

  // ---------- списки ----------
  const deliv = () => orders.filter(F.isDeliv);
  const byTime = (k) => (a, b) => new Date(a[k] || a.created_at) - new Date(b[k] || b.created_at);
  const waiting = () => deliv().filter((o) => WAIT.includes(o.status) && !o.paid_at && recent(o)).sort(byTime('created_at'));   // новые — внизу
  const mine = () => deliv().filter((o) => o.status === 'on_the_way' && o.courier_id === me?.id).sort(byTime('picked_at'));
  const others = () => deliv().filter((o) => o.status === 'on_the_way' && o.courier_id !== me?.id).sort(byTime('picked_at'));
  const doneToday = () => deliv().filter((o) => o.status === 'served' && o.paid_at && new Date(o.paid_at) >= dayStart() && o.courier_id === me?.id)
    .sort((a, b) => new Date(b.paid_at) - new Date(a.paid_at));

  // ---------- звук и баннер ----------
  let audio = null;
  let soundOn = (() => { try { return localStorage.getItem('courier:sound') !== '0'; } catch { return true; } })();
  let bannerMsg = '';
  function unlockAudio() {
    try {
      if (!audio) audio = new (window.AudioContext || window.webkitAudioContext)();
      if (audio.state === 'suspended') audio.resume();
    } catch { /* без звука */ }
    renderBanner();
  }
  ['pointerdown', 'keydown'].forEach((ev) => document.addEventListener(ev, unlockAudio, { capture: true }));
  // свой звук «новая доставка» (floor.js); если его нет — короткий двойной сигнал
  function ding() {
    if (!soundOn || !audio || audio.state !== 'running') return;
    if (F?.chime) { F.chime(audio, 'delivery'); return; }
    const t0 = audio.currentTime;
    [[0, 660], [0.18, 880]].forEach(([dt, f]) => {
      const o = audio.createOscillator();
      const g = audio.createGain();
      o.frequency.value = f;
      g.gain.setValueAtTime(0.0001, t0 + dt);
      g.gain.exponentialRampToValueAtTime(0.3, t0 + dt + 0.02);
      g.gain.exponentialRampToValueAtTime(0.0001, t0 + dt + 0.15);
      o.connect(g).connect(audio.destination);
      o.start(t0 + dt);
      o.stop(t0 + dt + 0.17);
    });
  }
  function renderBanner() {
    const el = $('#a-banner');
    if (!el || !api) return;
    const parts = [];
    if (bannerMsg) parts.push(`<button type="button" class="banner-new" data-banner="go">${icon('bell')}<span>${esc(bannerMsg)}</span></button>`);
    if (soundOn && (!audio || audio.state !== 'running')) parts.push(`<button type="button" class="banner-sound" data-banner="sound">${icon('bell')}<span>${esc(t('sound_banner'))}</span></button>`);
    el.hidden = !parts.length;
    el.innerHTML = parts.join('');
  }
  function announce(fresh) {
    const o = fresh[fresh.length - 1];
    bannerMsg = fresh.length > 1 ? t('c_b_many', fresh.length) : t('c_b_one', o.no, F.kmText(o.distance_km));
    renderBanner();
    ding();
    try { navigator.vibrate?.([200, 100, 200]); } catch { /* нет вибрации */ }
    try {
      if ('Notification' in window && Notification.permission === 'granted' && document.hidden) new Notification(bannerMsg, { body: o.address || '', tag: 'delivery-' + o.id, icon: 'icon.svg' });
    } catch { /* без системных уведомлений */ }
  }
  function updateCount() {
    const n = waiting().length;
    const el = $('#tab-count');
    if (el) { el.hidden = !n; el.textContent = n; }
    document.title = n ? `${t('c_title_new', n)} — ${t('c_title')}` : t('c_title');
    if (!n && bannerMsg) { bannerMsg = ''; renderBanner(); }
  }

  // ---------- загрузка ----------
  async function load() {
    try {
      // владелец и менеджер получают и заказы зала — здесь только доставка
      const rows = (await api.orders(dayStart().toISOString())).filter(F.isDeliv);
      const fresh = seen ? rows.filter((o) => WAIT.includes(o.status) && !o.paid_at && recent(o) && !seen.has(o.id)) : [];
      seen = new Set([...(seen || []), ...rows.map((o) => o.id)]);
      orders = rows;
      state = 'ready';
      if (fresh.length) announce(fresh);
    } catch {
      state = state === 'ready' || state === 'stale' ? 'stale' : 'error';
    }
    updateCount();
  }

  // ---------- карточка доставки ----------
  // kind: wait — ждёт курьера, mine — везу я, other — везёт другой (только посмотреть)
  function card(o, kind) {
    const dis = busy.has(o.id) ? ' disabled' : '';
    const cooking = ['new', 'accepted', 'cooking'].includes(o.status);
    return `<article class="o-card cr-card is-deliv${kind === 'wait' && o.status === 'ready' ? ' is-ready' : ''}">
      <div class="o-head"><b class="o-table">${icon('bike', 'sm')}${esc(t('deliv_no', o.no))}</b>
        <span class="st st-${esc(o.status)}">${esc(F.delivSt(o.status))}</span></div>
      <div class="o-meta">${esc(hhmm(o.created_at))} · ${esc(ago(o.created_at))}${o.distance_km != null ? ` · ${esc(F.kmText(o.distance_km))}` : ''}</div>
      ${F.delivInfoHtml(o, { maps: kind !== 'other' })}
      <ul class="o-items">${(o.items || []).map((i) => `<li><span><b>${esc(i.qty)}×</b> ${esc(tr(i.name) || i.id)}${optNames(i).length ? `<em class="o-opt">${esc(optNames(i).join(', '))}</em>` : ''}${F.noteHtml(i)}</span><span>${money(i.price * i.qty)}</span></li>`).join('')}</ul>
      ${o.note ? `<div class="o-note"><b>${esc(t('comment'))}:</b> ${esc(F.trNote(o.note))}</div>` : ''}
      ${kind === 'wait' ? `${cooking ? `<p class="cr-hint">${esc(t('c_not_ready'))}</p>` : ''}
        <button type="button" class="btn block cr-take" data-c-take="${esc(o.id)}"${dis}>${icon('bike', 'sm')}${esc(t('c_take'))}</button>` : ''}
      ${kind === 'mine' ? `<button type="button" class="btn block serve-btn cr-done" data-c-done="${esc(o.id)}"${dis}>${icon('check', 'sm')}${esc(t('c_done'))}</button>` : ''}
    </article>`;
  }
  function section(title, list, kind, empty) {
    return `<section class="o-section">
      <h2 class="o-section-title">${esc(title)} <span class="o-count${kind === 'wait' && list.length ? ' hot' : ''}">${list.length}</span></h2>
      ${list.length ? `<div class="o-grid">${list.map((o) => card(o, kind)).join('')}</div>` : `<p class="a-empty">${esc(empty)}</p>`}
    </section>`;
  }

  function renderOrders() {
    const main = $('#a-main');
    if (state === 'loading') { main.innerHTML = `<p class="a-empty" role="status">${esc(t('loading'))}</p>`; return; }
    if (state === 'error') {
      main.innerHTML = `<div class="a-card">${icon('alert', 'lg')}<h2>${esc(t('no_server'))}</h2>
        <p>${esc(t('check_internet'))}</p><button type="button" class="btn block" data-retry>${icon('refresh', 'sm')}${esc(t('retry'))}</button></div>`;
      return;
    }
    const my = mine();
    const other = others();
    const canNotify = 'Notification' in window && Notification.permission === 'default';
    main.innerHTML = `
      <div class="toolbar">
        <span class="live-dot${live && state !== 'stale' ? '' : ' off'}">${esc(state === 'stale' ? t('live_stale') : live ? t('live_on') : t('c_live_poll'))}</span>
        <span class="grow"></span>
        ${shift ? shift.html(true) : ''}
        <button type="button" class="btn small ghost" data-sound>${icon('bell', 'sm')}${esc(soundOn ? t('sound_on') : t('sound_off'))}</button>
        ${canNotify ? `<button type="button" class="btn small ghost" data-notify>${icon('bell', 'sm')}${esc(t('notifications'))}</button>` : ''}
      </div>
      ${my.length ? section(t('c_sec_mine'), my, 'mine', t('c_e_mine')) : ''}
      ${section(t('c_sec_wait'), waiting(), 'wait', t('c_e_wait'))}
      ${other.length ? section(t('c_sec_others'), other, 'other', '') : ''}`;
  }

  // ---------- «Сегодня»: что доставил и сколько наличных сдать ----------
  function renderToday() {
    const list = doneToday();
    let cash = 0;
    let card = 0;
    let fees = 0;
    for (const o of list) {
      const m = methodOf(o);
      if (m === 'cash') cash += dueSen(o, 'cash'); else card += sen(o.total);
      fees += sen(o.delivery_fee);
    }
    $('#a-main').innerHTML = `
      <div id="shift-slot">${shift ? shift.html() : ''}</div>
      ${shift && !shift.shift ? `<p class="help" style="margin-top:-6px">${esc(t('c_shift_hint'))}</p>` : ''}
      <h2 class="o-section-title">${esc(t('c_today_t'))}</h2>
      <div class="a-stats">
        <div class="a-stat"><b>${list.length}</b><span>${esc(t('c_s_count'))}</span></div>
        <div class="a-stat${cash ? ' hot' : ''}"><b>${money(cash / 100)}</b><span>${esc(t('c_s_cash'))}</span></div>
        <div class="a-stat"><b>${money(card / 100)}</b><span>${esc(t('c_s_card'))}</span></div>
        <div class="a-stat"><b>${money(fees / 100)}</b><span>${esc(t('c_s_fees'))}</span></div>
      </div>
      <section class="panel"><div class="panel-head"><h3>${esc(t('tab_today'))}<small>${list.length}</small></h3></div><div class="panel-body">
        ${list.length ? `<ul class="cr-list">${list.map((o) => {
          const m = methodOf(o);
          return `<li><span><b>${esc(t('deliv_no', o.no))}</b> · ${esc(t('c_delivered_at', hhmm(o.paid_at)))}<small>${esc([o.customer_name, o.address].filter(Boolean).join(' · '))}</small></span>
            <b>${money(dueSen(o, m) / 100)}<small>${esc(t('pay')[m] || m)}</small></b></li>`;
        }).join('')}</ul>` : `<p class="a-empty" style="padding:10px 0">${esc(t('c_s_none'))}</p>`}
        <p class="help">${esc(t('c_s_hint'))}</p>
      </div></section>`;
  }

  function renderSettings() {
    $('#a-main').innerHTML = '<div id="st-box"></div>';
    window.StaffTools.settings(api, $('#st-box'), 'courier');
  }

  // ---------- действия ----------
  function errOf(ex) {
    const m = String(ex?.message || ex || '');
    if (/\btaken\b/.test(m)) return t('c_e_taken');
    if (/bad_status/.test(m)) return t('c_e_status');
    if (/not_found/.test(m)) return t('c_e_gone');
    if (/\bcancelled\b/.test(m)) return t('c_e_cancelled');
    return S.errText(ex);
  }
  const patch = (row) => { if (row?.id) orders = orders.map((x) => (x.id === row.id ? { ...x, ...row } : x)); };

  async function take(id) {
    const o = orders.find((x) => x.id === id);
    if (!o || busy.has(id)) return;
    if (!await S.ask(t('c_ask_take', o.no), { ok: t('c_take') })) return;
    busy.add(id);
    render();
    try {
      patch(await api.courierTake(id));
      S.toast(t('c_t_taken', o.no));
    } catch (ex) { S.toast(errOf(ex), true); }
    busy.delete(id);
    await load();
    render();
  }

  async function done(id) {
    const o = orders.find((x) => x.id === id);
    if (!o || busy.has(id)) return;
    const pre = o.pay_method === 'card' ? 'card' : 'cash';
    const m = await S.ask(t('c_ask_done', o.no, money(dueSen(o, pre) / 100)), {
      ok: t('c_done'),
      choices: [['cash', t('c_pay_cash', money(dueSen(o, 'cash') / 100))], ['card', t('c_pay_card', money(dueSen(o, 'card') / 100))]],
      choice: pre,
    });
    if (!m) return;
    busy.add(id);
    render();
    try {
      patch(await api.courierDone(id, m));
      rememberPaid(id, m);
      S.toast(t('c_t_done', o.no));
    } catch (ex) { S.toast(errOf(ex), true); }
    busy.delete(id);
    await load();
    render();
  }

  // ---------- разделы ----------
  function setTab(next) {
    tab = ['today', 'settings'].includes(next) ? next : 'orders';
    document.querySelectorAll('.a-tab').forEach((a) => a.setAttribute('aria-current', a.dataset.tab === tab ? 'page' : 'false'));
    render();
  }
  function render() {
    if (tab === 'today') renderToday();
    else if (tab === 'settings') renderSettings();
    else renderOrders();
  }
  window.addEventListener('hashchange', () => { if (api) setTab(location.hash.slice(1)); });
  // «ждёт N мин» обновляется само
  setInterval(() => { if (api && tab === 'orders' && state !== 'loading' && !document.hidden && !modalOpen()) renderOrders(); }, 30000);

  document.addEventListener('click', (e) => {
    if (shift?.handleClick(e)) return;
    const tk = e.target.closest('[data-c-take]');
    if (tk) { take(tk.dataset.cTake); return; }
    const dn = e.target.closest('[data-c-done]');
    if (dn) { done(dn.dataset.cDone); return; }
    if (e.target.closest('[data-retry]')) { state = 'loading'; render(); load().then(render); return; }
    if (e.target.closest('[data-sound]')) {
      soundOn = !soundOn;
      try { localStorage.setItem('courier:sound', soundOn ? '1' : '0'); } catch { /* ok */ }
      if (soundOn) { unlockAudio(); ding(); }
      renderBanner();
      render();
      return;
    }
    if (e.target.closest('[data-notify]')) { Notification.requestPermission().then(() => render()); return; }
    const bn = e.target.closest('[data-banner]');
    if (bn) {
      if (bn.dataset.banner === 'sound') { unlockAudio(); ding(); return; }
      bannerMsg = '';
      renderBanner();
      if (location.hash === '#orders') setTab('orders'); else location.hash = '#orders';
    }
  });

  function paintBrand() {
    const st = S.settings;
    if (!st) return;
    $('#a-sub').textContent = st.name;
    const words = String(st.name || '').split(/\s+/).filter((w) => /\p{L}/u.test(w));
    $('#a-logo').innerHTML = st.logo_url ? `<img src="${esc(st.logo_url)}" alt="">` : esc((words.slice(0, 2).map((w) => w.match(/\p{L}/u)[0]).join('') || 'R').toUpperCase());
  }

  S.start({
    need: 'courier',
    rerender() { updateCount(); renderBanner(); if (!modalOpen()) render(); },
    async onReady(ctx) {
      api = ctx.api;
      me = ctx.me;
      paintBrand();
      shift = window.StaffShift.create(api, me, () => {
        if (modalOpen()) return;
        if (tab === 'today') { const box = $('#shift-slot'); if (box) box.innerHTML = shift.html(); else render(); } else if (tab === 'orders') renderOrders();
      });
      setTab(location.hash.slice(1) || 'orders');
      await Promise.all([load(), shift.load()]);
      render();
      renderBanner();
      stop?.();
      stop = api.subscribe(['orders', 'settings'], async (table) => {
        if (table === 'settings') { try { S.settings = await api.settings(); paintBrand(); } catch { /* позже */ } return; }
        await load();
        if (!modalOpen() && tab !== 'settings') render();
      }, (ok) => { live = ok; if (tab === 'orders') renderOrders(); });
      clearInterval(timer);
      timer = setInterval(async () => {
        if (document.hidden && live) return;
        await load();
        if (!modalOpen() && tab !== 'settings') render();
      }, 15000);
    },
    onLogout() { stop?.(); stop = null; clearInterval(timer); bannerMsg = ''; renderBanner(); },
  });
})();

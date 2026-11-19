(() => {
  'use strict';

  // =====================================================================
  //  Страница официанта: зал (столы, вызовы, мои столы, счёт, чаевые,
  //  раздельная оплата), заказы (новые → готово → подано), заказ за гостя,
  //  меню (только просмотр), смена (итоги, язык, экран, Telegram).
  //  Права проверяет база: официант принимает, пробивает и подаёт заказы,
  //  закрывает вызовы и счета; меню, цены, столы и состав заказа не меняет.
  // =====================================================================

  const S = window.Staff;
  const { $, esc, icon, tr, money } = S;
  const t = (...a) => S.t(...a);

  let api = null;
  let me = null;
  let floor = null;
  let tab = 'orders';
  let cats = [];
  let dishes = [];
  let q = '';
  let filter = 'all';
  let cat = '';
  let stop = null;
  let timer = null;
  let lastStatus = new Map();    // id → статус: чтобы сказать «заказ готов», когда кухня отметит

  let orders = [];
  let ordersState = 'loading';   // loading | ready | error | stale
  let live = false;
  let seen = null;               // какие заказы уже показывали — звеним только на новые
  const busy = new Set();
  const mineOnly = () => { try { return localStorage.getItem('floor:mine') === '1'; } catch { return false; } };

  const norm = (s) => String(s || '').toLowerCase().replace(/ё/g, 'е');
  const amount = (d) => (d.weight ? `${d.weight} ${S.unitLabel[d.unit] || ''}` : '');
  const hhmm = (iso) => new Date(iso).toLocaleTimeString(S.locale(), { hour: '2-digit', minute: '2-digit' });
  const ago = (iso) => { const m = Math.max(0, Math.floor((Date.now() - new Date(iso).getTime()) / 60000)); return (window.STAFF_T.ago[S.lang] || window.STAFF_T.ago.en)(m); };
  const dayStart = () => { const d = new Date(); d.setHours(0, 0, 0, 0); return d; };
  const r2 = (x) => Math.round(x * 100) / 100;
  const optNames = (i) => window.Floor.optNames(i);
  const visibleOrder = (o) => !mineOnly() || !floor || floor.myTables().some((x) => x.id === o.table_id);

  // ---------- звук и баннер ----------
  let audio = null;
  let soundOn = (() => { try { return localStorage.getItem('waiter:sound') !== '0'; } catch { return true; } })();
  let bannerMsg = '';
  let bannerTo = 'orders';
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
    [0, 0.22, 0.44].forEach((dt, i) => {
      const o = audio.createOscillator();
      const g = audio.createGain();
      o.type = 'sine';
      o.frequency.value = i === 2 ? 1175 : 880;
      g.gain.setValueAtTime(0.0001, t0 + dt);
      g.gain.exponentialRampToValueAtTime(0.45, t0 + dt + 0.02);
      g.gain.exponentialRampToValueAtTime(0.0001, t0 + dt + 0.2);
      o.connect(g).connect(audio.destination);
      o.start(t0 + dt);
      o.stop(t0 + dt + 0.22);
    });
  }
  function buzz(title, tag) {
    ding();
    try { navigator.vibrate?.([200, 100, 200]); } catch { /* нет вибрации */ }
    try {
      if ('Notification' in window && Notification.permission === 'granted' && document.hidden) new Notification(title, { tag, icon: 'icon.svg' });
    } catch { /* без системных уведомлений */ }
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
  function announceCalls(fresh) {
    const c = fresh[fresh.length - 1];
    bannerMsg = fresh.length > 1 ? t('b_call_many', fresh.length) : `${t('b_call_one', c.table_label, c.kind === 'bill')}${c.reason ? ` — ${t('reasons')[c.reason] || c.reason}` : ''}`;
    bannerTo = 'floor';
    renderBanner();
    buzz(bannerMsg, 'call-' + c.id);
    updateCount();
    if (tab === 'floor' && !document.querySelector('.modal')) renderFloor();
  }
  function announce(fresh) {
    const o = fresh[fresh.length - 1];
    bannerMsg = fresh.length > 1 ? t('b_new_many', fresh.length) : t('b_new_one', o.no, o.table_label);
    bannerTo = 'orders';
    renderBanner();
    buzz(bannerMsg, 'order-' + o.id);
  }
  setInterval(() => {
    if (!api) return;
    if (orders.some((o) => o.status === 'new' && floor?.isMineOrFree(o.table_id)) || floor?.openCalls().some((c) => c.kind === 'bill' || floor.isMineOrFree(c.table_id))) ding();
  }, 30000);

  function updateCount() {
    const n = orders.filter((o) => o.status === 'new' && visibleOrder(o)).length;
    const el = $('#tab-count');
    if (el) { el.hidden = !n; el.textContent = n; }
    const c = floor ? floor.openCalls().length : 0;
    const ce = $('#calls-count');
    if (ce) { ce.hidden = !c; ce.textContent = c; }
    document.title = n ? `${t('title_new', n)} — ${t('w_title')}` : c ? `${t('title_call', c)} — ${t('w_title')}` : t('w_title');
    if (!n && !c && bannerMsg) { bannerMsg = ''; renderBanner(); }
  }

  // ---------- заказы ----------
  async function loadOrders() {
    try {
      const rows = await api.orders(dayStart().toISOString());
      const fresh = seen ? rows.filter((o) => o.status === 'new' && !seen.has(o.id) && (!floor || floor.isMineOrFree(o.table_id))) : [];
      seen = new Set([...(seen || []), ...rows.map((o) => o.id)]);
      const ready = rows.filter((o) => o.status === 'ready' && lastStatus.has(o.id) && lastStatus.get(o.id) !== 'ready' && (!floor || floor.isMineOrFree(o.table_id)));
      lastStatus = new Map(rows.map((o) => [o.id, o.status]));
      orders = rows;
      ordersState = 'ready';
      if (fresh.length) announce(fresh);
      else if (ready.length) { buzz(t('t_ready', ready[0].no, ready[0].table_label), 'ready-' + ready[0].id); S.toast(ready.length > 1 ? t('t_ready_many', ready.length) : t('t_ready', ready[0].no, ready[0].table_label)); }
    } catch {
      ordersState = ordersState === 'ready' || ordersState === 'stale' ? 'stale' : 'error';
    }
    updateCount();
  }

  function orderCard(o) {
    const isNew = o.status === 'new';
    const b = busy.has(o.id);
    const canServe = ['accepted', 'cooking', 'ready'].includes(o.status);
    return `<article class="o-card${isNew ? ' is-new' : ''}${o.status === 'ready' ? ' is-ready' : ''}">
      <div class="o-head"><b class="o-table">${esc(t('table'))} ${esc(o.table_label)}</b>
        <span class="st st-${esc(o.status)}">${!['new', 'cancelled'].includes(o.status) ? icon('check', 'sm') : ''}${esc(t('st')[o.status] || o.status)}</span></div>
      <div class="o-meta">${esc(t('order_no', o.no))} · ${esc(hhmm(o.created_at))} · ${esc(ago(o.created_at))}</div>
      <ul class="o-items">${(o.items || []).map((i) => `<li><span><b>${esc(i.qty)}×</b> ${esc(tr(i.name) || i.id)}${optNames(i).length ? `<em class="o-opt">${esc(optNames(i).join(', '))}</em>` : ''}${window.Floor.noteHtml(i)}</span><span>${money(i.price * i.qty)}</span></li>`).join('')}</ul>
      ${o.note ? `<div class="o-note"><b>${esc(t('comment'))}:</b> ${esc(o.note)}</div>` : ''}
      ${o.edited_at ? `<div class="o-meta">${esc(t('edited_at', hhmm(o.edited_at)))}</div>` : ''}
      <div class="o-total"><span>${esc(t('total'))}${o.paid_at ? ` · <span class="state-badge ok">${esc(t('paid_tag'))}</span>` : ''}</span><b>${money(o.total)}</b></div>
      ${isNew ? `<button type="button" class="btn block accept-btn" data-accept="${esc(o.id)}"${b ? ' disabled' : ''}>
          ${b ? `<span class="spinner" aria-hidden="true"></span>${esc(t('accepting'))}` : `${icon('check')}${esc(t('accept'))}`}</button>`
        : o.status === 'cancelled' ? `<div class="o-meta">${esc(t('order_cancelled'))}</div>`
          : `<div class="o-meta">${o.source === 'staff' && o.created_by_name ? esc(t('entered_by', o.created_by_name)) : esc(t('accepted_by', o.accepted_by_name, o.accepted_at ? hhmm(o.accepted_at) : ''))}</div>`}
      ${canServe ? `<button type="button" class="btn block serve-btn${o.status === 'ready' ? '' : ' soft'}" data-fl-serve="${esc(o.id)}">${icon('check')}${esc(t('serve'))}</button>` : ''}
      ${o.status !== 'cancelled' ? `<div class="o-actions">
        <button type="button" class="btn small ghost" data-fl-ticket="${esc(o.id)}">${icon('printer', 'sm')}${esc(t('print_kitchen'))}</button>
        ${o.table_id && !o.paid_at && !isNew ? `<button type="button" class="btn small ghost" data-fl-table="${esc(o.table_id)}">${esc(t('table_bill'))}</button>` : ''}
      </div>` : ''}
    </article>`;
  }

  function section(title, list, empty, hot, cls = '') {
    return `<section class="o-section ${cls}">
      <h2 class="o-section-title">${esc(title)} <span class="o-count${hot && list.length ? ' hot' : ''}">${list.length}</span></h2>
      ${list.length ? `<div class="o-grid">${list.map(orderCard).join('')}</div>` : `<p class="a-empty">${esc(empty)}</p>`}
    </section>`;
  }

  function renderOrders() {
    const main = $('#a-main');
    if (ordersState === 'loading') { main.innerHTML = `<p class="a-empty" role="status">${esc(t('loading'))}</p>`; return; }
    if (ordersState === 'error') {
      main.innerHTML = `<div class="a-card">${icon('alert', 'lg')}<h2>${esc(t('no_server'))}</h2>
        <p>${esc(t('check_internet'))}</p><button type="button" class="btn block" data-retry>${icon('refresh', 'sm')}${esc(t('retry'))}</button></div>`;
      return;
    }
    const mine = mineOnly();
    const vis = orders.filter(visibleOrder);
    const by = (st) => vis.filter((o) => st.includes(o.status)).sort((a, b) => new Date(a.created_at) - new Date(b.created_at));
    const today = dayStart().getTime();
    const served = vis.filter((o) => o.status === 'served' && new Date(o.created_at).getTime() >= today)
      .sort((a, b) => new Date(b.served_at || b.updated_at) - new Date(a.served_at || a.updated_at));
    const canNotify = 'Notification' in window && Notification.permission === 'default';
    main.innerHTML = `
      <div class="toolbar">
        <div class="chips" style="margin:0">
          <button type="button" class="chip${mine ? '' : ' active'}" data-fl-mine="0">${esc(t('f_all_tables'))}</button>
          <button type="button" class="chip${mine ? ' active' : ''}" data-fl-mine="1">${esc(t('f_my_tables'))}<b>${floor ? floor.myTables().length : 0}</b></button>
        </div>
        <span class="grow"></span>
        <button type="button" class="btn small" data-fl-compose="">${icon('plus', 'sm')}${esc(t('new_order'))}</button>
      </div>
      <div class="toolbar">
        <span class="live-dot${live && ordersState !== 'stale' ? '' : ' off'}">${esc(ordersState === 'stale' ? t('live_stale') : live ? t('live_on') : t('live_poll'))}</span>
        <span class="grow"></span>
        <button type="button" class="btn small ghost" data-sound>${icon('bell', 'sm')}${esc(soundOn ? t('sound_on') : t('sound_off'))}</button>
        ${canNotify ? `<button type="button" class="btn small ghost" data-notify>${icon('bell', 'sm')}${esc(t('notifications'))}</button>` : ''}
      </div>
      ${mine && floor && !floor.myTables().length ? `<p class="notice info">${icon('table')}<span>${esc(t('no_my_tables'))}</span></p>` : ''}
      ${section(t('sec_new'), by(['new']), t('e_new'), true)}
      ${section(t('sec_ready'), by(['ready']), t('e_ready'), true, 'is-ready-sec')}
      ${section(t('sec_cooking'), by(['accepted', 'cooking']), t('e_cooking'), false)}
      ${section(t('sec_served'), served.slice(0, 40), t('e_served'), false)}`;
  }

  async function accept(id) {
    const o = orders.find((x) => x.id === id);
    if (!o || busy.has(id)) return;
    busy.add(id);
    renderOrders();
    try {
      const r = await api.acceptOrder(id);
      orders = orders.map((x) => (x.id === id ? { ...x, status: r.status, accepted_at: r.accepted_at, accepted_by_name: r.accepted_by_name, accepted_by: r.changed ? me?.id : x.accepted_by } : x));
      if (r.changed) S.toast(t('t_accepted', o.no));
      else S.toast(r.status === 'cancelled' ? t('t_was_cancelled', o.no) : t('t_taken', o.no, r.accepted_by_name), true);
    } catch (ex) {
      S.toast(S.errText(ex), true);
    } finally {
      busy.delete(id);
      updateCount();
      if (tab === 'orders') renderOrders();
    }
  }

  // ---------- меню (только просмотр) ----------
  function photo(d) {
    return `<div class="photo${d.photo_url ? ' has-img' : ''}">${d.photo_url ? `<img src="${esc(d.photo_url)}" alt="" loading="lazy" decoding="async">` : icon('dish')}</div>`;
  }
  function visible() {
    const shownCats = cats.filter((c) => !c.hidden);
    const ids = new Set(shownCats.map((c) => c.id));
    return { shownCats, list: dishes.filter((d) => !d.hidden && ids.has(d.category_id)) };
  }
  function renderMenu() {
    const main = $('#a-main');
    const { shownCats, list } = visible();
    const words = norm(q).split(/\s+/).filter(Boolean);
    const hit = (d) => !words.length || words.every((w) => norm(`${Object.values(d.name || {}).join(' ')} ${Object.values(d.desc || {}).join(' ')}`).includes(w));
    const base = list.filter(hit).filter((d) => !cat || d.category_id === cat);
    const yes = base.filter((d) => d.available).length;
    const shown = base.filter((d) => (filter === 'yes' ? d.available : filter === 'no' ? !d.available : true));
    const keepFocus = document.activeElement?.id === 'w-search';
    const meat = t('meat');
    main.innerHTML = `
      <div class="toolbar"><label class="search">${icon('search')}
        <input id="w-search" type="search" placeholder="${esc(t('search_dish'))}" value="${esc(q)}" autocomplete="off"></label></div>
      <div class="chips" role="group">
        <button type="button" class="chip${filter === 'all' ? ' active' : ''}" data-f="all">${esc(t('all'))}<b>${base.length}</b></button>
        <button type="button" class="chip${filter === 'yes' ? ' active' : ''}" data-f="yes">${esc(t('in_stock'))}<b>${yes}</b></button>
        <button type="button" class="chip${filter === 'no' ? ' active' : ''}" data-f="no">${esc(t('out_stock'))}<b>${base.length - yes}</b></button>
      </div>
      <div class="chips" role="group">
        <button type="button" class="chip${!cat ? ' active' : ''}" data-c="">${esc(t('all_cats'))}</button>
        ${shownCats.map((c) => `<button type="button" class="chip${cat === c.id ? ' active' : ''}" data-c="${esc(c.id)}">${esc(tr(c.name))}</button>`).join('')}
      </div>
      ${shown.length ? shownCats.map((c) => {
        const items = shown.filter((d) => d.category_id === c.id);
        if (!items.length) return '';
        return `<section class="panel"><div class="panel-head"><h3>${esc(tr(c.name))}<small>${items.length}</small>${c.avail_from ? `<span class="state-badge muted">${icon('clock', 'sm')}${esc(c.avail_from)}–${esc(c.avail_to)}</span>` : ''}</h3></div>
          <ul class="rows">${items.map((d) => `
            <li class="${d.available ? '' : 'is-off'}" data-dish="${esc(d.id)}" role="button" tabindex="0" style="cursor:pointer">
              ${photo(d)}
              <div class="grow"><b>${esc(tr(d.name))}</b><small>${esc([(d.meat || []).map((m) => meat[m]).join(', '), amount(d)].filter(Boolean).join(' · '))}</small></div>
              <span class="price">${money(d.price)}</span>
              <span class="state-badge ${d.available ? 'ok' : 'no'}">${esc(d.available ? t('in_stock') : t('out_stock'))}</span>
            </li>`).join('')}</ul></section>`;
      }).join('') : `<div class="a-empty">${esc(list.length ? t('nothing_found') : t('menu_empty'))}</div>`}`;
    if (keepFocus) { const inp = $('#w-search'); inp.focus(); inp.setSelectionRange(inp.value.length, inp.value.length); }
  }
  function showDish(id) {
    const d = dishes.find((x) => x.id === id);
    if (!d) return;
    const LN = { ru: 'RU', uz: 'UZ', en: 'EN', ar: 'AR', ms: 'MS' };
    const names = Object.entries(d.name || {}).filter(([, v]) => v).map(([k, v]) => `<li><b>${LN[k] || k}</b> ${esc(v)}</li>`).join('');
    const meat = (d.meat || []).map((m) => t('meat')[m]).join(', ');
    const al = t('allergens');
    const tags = t('tags');
    S.modal(`
      <div class="photo" style="width:100%;height:auto;aspect-ratio:4/3;border-radius:16px;margin-bottom:14px">${d.photo_url ? `<img src="${esc(d.photo_url)}" alt="">` : icon('dish')}</div>
      <h2 id="modal-title">${esc(tr(d.name))}</h2>
      <p style="margin:6px 0 0"><span class="state-badge ${d.available ? 'ok' : 'no'}">${esc(d.available ? t('in_stock') : t('out_stock'))}</span>
        ${(d.tags || []).map((x) => `<span class="state-badge muted">${esc(tags[x] || x)}</span>`).join(' ')}</p>
      <p style="font-size:22px;font-weight:800;margin:12px 0 0">${money(d.price)} <small style="font-size:14px;color:var(--muted);font-weight:600">${esc([amount(d), d.kcal ? `${d.kcal} ${t('kcal')}` : ''].filter(Boolean).join(' · '))}</small></p>
      <p class="section-label">${esc(t('d_meat'))}</p><p style="margin:0;color:var(--muted)">${esc(meat || t('not_given'))}</p>
      <p class="section-label">${esc(t('d_compo'))}</p><p style="margin:0;color:var(--muted)">${esc(tr(d.ingredients) || t('not_given'))}</p>
      ${tr(d.desc) ? `<p class="section-label">${esc(t('d_desc'))}</p><p style="margin:0;color:var(--muted)">${esc(tr(d.desc))}</p>` : ''}
      ${d.options?.length ? `<p class="section-label">${esc(t('d_options'))}</p><ul style="margin:4px 0 0;padding-inline-start:18px;color:var(--muted)">${d.options.map((g) => `<li><b>${esc(tr(g.name))}</b>: ${esc((g.choices || []).map((c) => `${tr(c.name)}${Number(c.price) ? ` (${Number(c.price) > 0 ? '+' : '−'}${money(Math.abs(c.price))})` : ''}`).join(', '))}</li>`).join('')}</ul>` : ''}
      ${d.allergens?.length ? `<p class="section-label">${esc(t('d_allergens'))}</p><p style="margin:0;color:var(--muted)">${esc(d.allergens.map((a) => al[a] || a).join(', '))}</p>` : ''}
      ${names ? `<p class="section-label">${esc(t('d_names'))}</p><ul style="margin:4px 0 0;padding-inline-start:18px;color:var(--muted)">${names}</ul>` : ''}
      <div class="modal-foot"><button type="button" class="btn ghost" data-modal-close>${esc(t('close'))}</button></div>`);
  }
  async function loadMenu() {
    [cats, dishes, S.settings] = await Promise.all([api.categories(), api.dishes(), api.settings()]);
    paintBrand();
  }
  function paintBrand() {
    const st = S.settings;
    if (!st) return;
    $('#a-sub').textContent = st.name;
    const words = String(st.name || '').split(/\s+/).filter((w) => /\p{L}/u.test(w));
    $('#a-logo').innerHTML = st.logo_url ? `<img src="${esc(st.logo_url)}" alt="">` : esc((words.slice(0, 2).map((w) => w.match(/\p{L}/u)[0]).join('') || 'R').toUpperCase());
  }

  // ---------- смена ----------
  function renderShift() {
    const main = $('#a-main');
    const mineId = me?.id;
    const myAccepted = orders.filter((o) => o.accepted_by === mineId && o.status !== 'cancelled');
    const myEntered = myAccepted.filter((o) => o.source === 'staff');
    const myServed = orders.filter((o) => o.status === 'served' && (o.accepted_by === mineId || floor?.myTables().some((x) => x.id === o.table_id)));
    const myBills = (floor?.bills || []).filter((b) => b.paid_by === mineId);
    const sum = r2(myBills.reduce((x, b) => x + Number(b.total), 0));
    const tips = r2(myBills.reduce((x, b) => x + Number(b.tip || 0), 0));
    const methods = {};
    for (const b of myBills) for (const p of (b.payments?.length ? b.payments : [{ method: b.method, amount: Number(b.total) + Number(b.tip || 0) }])) methods[p.method] = r2((methods[p.method] || 0) + Number(p.amount));
    main.innerHTML = `
      <h2 class="o-section-title">${esc(t('shift_t'))}</h2>
      <div class="a-stats">
        <div class="a-stat"><b>${myAccepted.length}</b><span>${esc(t('s_accepted'))} · ${esc(t('s_entered'))} ${myEntered.length}</span></div>
        <div class="a-stat"><b>${myServed.length}</b><span>${esc(t('s_served'))}</span></div>
        <div class="a-stat"><b>${myBills.length} · ${money(sum)}</b><span>${esc(t('s_bills'))}</span></div>
        <div class="a-stat${tips ? ' hot' : ''}"><b>${money(tips)}</b><span>${esc(t('s_tips'))}</span></div>
      </div>
      ${Object.keys(methods).length ? `<section class="panel"><div class="panel-head"><h3>${esc(t('s_by_method'))}</h3></div><div class="panel-body">
        <ul class="fl-bills">${Object.entries(methods).map(([m, v]) => `<li><span>${esc(t('pay')[m] || m)}</span><b>${money(v)}</b></li>`).join('')}</ul></div></section>` : ''}
      <section class="panel"><div class="panel-head"><h3>${esc(t('s_my_bills'))}<small>${myBills.length}</small></h3></div><div class="panel-body">
        ${myBills.length ? `<ul class="fl-bills">${myBills.map((b) => `<li><span><b>${esc(t('p_receipt', b.no))}</b> · ${esc(t('table'))} ${esc(b.table_label)} · ${esc(hhmm(b.paid_at))} · ${esc(t('pay')[b.method] || b.method)}</span>
          <span>${money(b.total)}${Number(b.tip) ? ` + ${money(b.tip)}` : ''} <button type="button" class="link-btn" data-fl-reprint="${esc(b.id)}">${icon('printer', 'sm')}${esc(t('receipt'))}</button></span></li>`).join('')}</ul>`
          : `<p class="a-empty" style="padding:10px 0">${esc(t('s_none'))}</p>`}
      </div></section>
      <div id="st-box"></div>`;
    window.StaffTools.settings(api, $('#st-box'), 'waiter');
  }

  // ---------- разделы ----------
  function renderFloor() {
    if (!floor) { $('#a-main').innerHTML = `<p class="a-empty">${esc(t('loading'))}</p>`; return; }
    floor.render($('#a-main'));
  }
  function setTab(next) {
    tab = ['menu', 'floor', 'shift'].includes(next) ? next : 'orders';
    document.querySelectorAll('.a-tab').forEach((a) => a.setAttribute('aria-current', a.dataset.tab === tab ? 'page' : 'false'));
    render();
  }
  function render() {
    if (tab === 'orders') renderOrders();
    else if (tab === 'floor') renderFloor();
    else if (tab === 'shift') renderShift();
    else renderMenu();
  }
  window.addEventListener('hashchange', () => { if (api) setTab(location.hash.slice(1)); });

  // ---------- события ----------
  document.addEventListener('input', (e) => { if (e.target.id === 'w-search') { q = e.target.value; renderMenu(); } });
  document.addEventListener('click', (e) => {
    if (floor?.handleClick(e)) return;
    const ac = e.target.closest('[data-accept]');
    if (ac) { accept(ac.dataset.accept); return; }
    if (e.target.closest('[data-retry]')) { ordersState = 'loading'; renderOrders(); loadOrders().then(render); return; }
    if (e.target.closest('[data-sound]')) {
      soundOn = !soundOn;
      try { localStorage.setItem('waiter:sound', soundOn ? '1' : '0'); } catch { /* ok */ }
      if (soundOn) { unlockAudio(); ding(); }
      renderBanner();
      renderOrders();
      return;
    }
    if (e.target.closest('[data-notify]')) { Notification.requestPermission().then(() => renderOrders()); return; }
    const bn = e.target.closest('[data-banner]');
    if (bn) {
      if (bn.dataset.banner === 'sound') { unlockAudio(); ding(); } else { bannerMsg = ''; renderBanner(); location.hash = `#${bannerTo}`; setTab(bannerTo); }
      return;
    }
    const f = e.target.closest('[data-f]');
    if (f) { filter = f.dataset.f; renderMenu(); return; }
    const c = e.target.closest('[data-c]');
    if (c) { cat = c.dataset.c; renderMenu(); return; }
    const d = e.target.closest('[data-dish]');
    if (d) showDish(d.dataset.dish);
  });
  document.addEventListener('keydown', (e) => {
    if ((e.key === 'Enter' || e.key === ' ') && e.target.matches?.('[data-dish]')) { e.preventDefault(); showDish(e.target.dataset.dish); }
  });

  S.start({
    need: 'waiter',
    rerender() { updateCount(); renderBanner(); if (!document.querySelector('.modal')) render(); },
    async onReady(ctx) {
      api = ctx.api;
      me = ctx.me;
      paintBrand();
      floor = window.Floor.create({
        api, isOwner: me?.role === 'owner', me,
        getOrders: () => orders, getDishes: () => dishes, getCats: () => cats,
        reloadOrders: loadOrders, onCalls: announceCalls,
        rerender: () => { updateCount(); if (document.querySelector('.modal')) return; render(); },
      });
      setTab(location.hash.slice(1) || 'orders');
      await Promise.all([loadMenu().catch((ex) => S.toast(S.errText(ex), true)), floor.load().catch(() => {})]);
      await loadOrders();
      updateCount();
      render();
      renderBanner();
      stop?.();
      stop = api.subscribe(['orders', 'dishes', 'categories', 'settings', 'calls', 'bills', 'table_waiters'], async (table) => {
        if (['calls', 'bills', 'table_waiters'].includes(table)) { try { await floor.load(); updateCount(); if (tab !== 'menu' && !document.querySelector('.modal')) render(); } catch { /* позже */ } return; }
        if (table === 'orders') { await loadOrders(); if (!document.querySelector('.modal') && tab !== 'menu') render(); return; }
        if (document.querySelector('.modal')) return;
        try { await loadMenu(); if (tab === 'menu') renderMenu(); } catch { /* позже */ }
      }, (ok) => { live = ok; if (tab === 'orders') renderOrders(); });
      clearInterval(timer);
      timer = setInterval(async () => {
        if (document.hidden && live) return;
        await Promise.all([loadOrders(), floor.load().catch(() => {})]);
        updateCount();
        if (document.querySelector('.modal')) return;
        if (tab !== 'menu' && tab !== 'shift') render();
      }, 10000);
    },
    onLogout() { stop?.(); stop = null; clearInterval(timer); bannerMsg = ''; renderBanner(); },
  });
})();

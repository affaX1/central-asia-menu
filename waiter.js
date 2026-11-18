(() => {
  'use strict';

  // =====================================================================
  //  Страница официанта: новые заказы (принять), принятые сегодня,
  //  меню с ценами и наличием (только просмотр).
  //  Права проверяет база: официант может только принять новый заказ.
  // =====================================================================

  const S = window.Staff;
  const { $, esc, icon, tr, money } = S;

  const ALLERGENS = { gluten: 'глютен', milk: 'молоко', eggs: 'яйца', fish: 'рыба', shellfish: 'морепродукты', nuts: 'орехи', soy: 'соя', sesame: 'кунжут' };
  const TAGS = { hit: 'Хит', new: 'Новинка', spicy: 'Острое', veg: 'Без мяса' };
  const MEAT = { beef: 'Говядина', lamb: 'Баранина', horse: 'Конина', chicken: 'Курица', fish: 'Рыба', seafood: 'Морепродукты' };
  const LANG_NAMES = { ru: 'RU', uz: 'UZ', en: 'EN', ar: 'AR', ms: 'MS' };
  const ST = { new: 'Новый', accepted: 'Принят', cooking: 'Готовится', ready: 'Готов', cancelled: 'Отменён' };

  let api = null;
  let tab = 'orders';
  let cats = [];
  let dishes = [];
  let q = '';
  let filter = 'all';
  let cat = '';
  let stop = null;
  let timer = null;

  let orders = [];
  let ordersState = 'loading';   // loading | ready | error
  let live = false;
  let seen = null;               // какие заказы уже показывали — звеним только на новые
  const busy = new Set();

  const norm = (s) => String(s || '').toLowerCase().replace(/ё/g, 'е');
  const amount = (d) => (d.weight ? `${d.weight} ${S.unitLabel[d.unit] || ''}` : '');
  const hhmm = (iso) => new Date(iso).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' });
  const ago = (iso) => {
    const m = Math.max(0, Math.floor((Date.now() - new Date(iso).getTime()) / 60000));
    if (m < 1) return 'только что';
    if (m < 60) return `${m} мин назад`;
    return `${Math.floor(m / 60)} ч ${m % 60} мин назад`;
  };
  const dayStart = () => { const d = new Date(); d.setHours(0, 0, 0, 0); return d; };

  // ---------- звук и баннер нового заказа ----------
  let audio = null;
  let soundOn = (() => { try { return localStorage.getItem('waiter:sound') !== '0'; } catch { return true; } })();
  let bannerMsg = '';
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
  function renderBanner() {
    const el = $('#a-banner');
    if (!el || !api) return;
    const parts = [];
    if (bannerMsg) parts.push(`<button type="button" class="banner-new" data-banner="orders">${icon('bell')}<span>${esc(bannerMsg)}</span></button>`);
    if (soundOn && (!audio || audio.state !== 'running')) parts.push(`<button type="button" class="banner-sound" data-banner="sound">${icon('bell')}<span>Нажмите здесь, чтобы включить звук новых заказов</span></button>`);
    el.hidden = !parts.length;
    el.innerHTML = parts.join('');
  }
  function announce(fresh) {
    const o = fresh[fresh.length - 1];
    bannerMsg = fresh.length > 1 ? `Новых заказов: ${fresh.length}` : `Новый заказ №${o.no} — стол ${o.table_label}`;
    renderBanner();
    ding();
    try { navigator.vibrate?.([200, 100, 200]); } catch { /* нет вибрации */ }
    try {
      if ('Notification' in window && Notification.permission === 'granted' && document.hidden) {
        new Notification(bannerMsg, { body: `${money(o.total)}`, tag: 'order-' + o.id, icon: 'icon.svg' });
      }
    } catch { /* без системных уведомлений */ }
  }
  setInterval(() => { if (api && orders.some((o) => o.status === 'new')) ding(); }, 30000);

  function updateCount() {
    const n = orders.filter((o) => o.status === 'new').length;
    const el = $('#tab-count');
    if (el) { el.hidden = !n; el.textContent = n; }
    document.title = n ? `(${n}) Новый заказ — официант` : 'Официант';
    if (!n && bannerMsg) { bannerMsg = ''; renderBanner(); }
  }

  // ---------- заказы ----------
  async function loadOrders() {
    try {
      const rows = await api.orders(dayStart().toISOString());
      const fresh = seen ? rows.filter((o) => o.status === 'new' && !seen.has(o.id)) : [];
      seen = new Set([...(seen || []), ...rows.map((o) => o.id)]);
      orders = rows;
      ordersState = 'ready';
      if (fresh.length) announce(fresh);
    } catch {
      if (ordersState !== 'ready') ordersState = 'error';
      else ordersState = 'stale';
    }
    updateCount();
  }

  function orderCard(o) {
    const isNew = o.status === 'new';
    const b = busy.has(o.id);
    return `<article class="o-card${isNew ? ' is-new' : ''}">
      <div class="o-head"><b class="o-table">Стол ${esc(o.table_label)}</b>
        <span class="st st-${esc(o.status)}">${o.status !== 'new' && o.status !== 'cancelled' ? icon('check', 'sm') : ''}${esc(ST[o.status] || o.status)}</span></div>
      <div class="o-meta">Заказ №${esc(o.no)} · ${esc(hhmm(o.created_at))} · ${esc(ago(o.created_at))}</div>
      <ul class="o-items">${(o.items || []).map((i) => `<li><span><b>${esc(i.qty)}×</b> ${esc(tr(i.name) || i.id)}</span><span>${money(i.price * i.qty)}</span></li>`).join('')}</ul>
      ${o.note ? `<div class="o-note"><b>Комментарий:</b> ${esc(o.note)}</div>` : ''}
      <div class="o-total"><span>Итого</span><b>${money(o.total)}</b></div>
      ${isNew ? `<button type="button" class="btn block accept-btn" data-accept="${esc(o.id)}"${b ? ' disabled' : ''}>
          ${b ? '<span class="spinner" aria-hidden="true"></span>Принимаем…' : `${icon('check')}Принять заказ`}</button>`
        : `<div class="o-meta">${o.status === 'cancelled' ? 'Заказ отменён' : `Принял${o.accepted_by_name ? `: ${esc(o.accepted_by_name)}` : ''}${o.accepted_at ? ` в ${esc(hhmm(o.accepted_at))}` : ''}`}</div>`}
    </article>`;
  }

  function renderOrders() {
    const main = $('#a-main');
    if (ordersState === 'loading') { main.innerHTML = '<p class="a-empty" role="status">Загружаем заказы…</p>'; return; }
    if (ordersState === 'error') {
      main.innerHTML = `<div class="a-card">${icon('alert', 'lg')}<h2>Нет связи с сервером</h2>
        <p>Не получилось загрузить заказы. Проверьте интернет.</p><button type="button" class="btn block" data-retry>${icon('refresh', 'sm')}Повторить</button></div>`;
      return;
    }
    const fresh = orders.filter((o) => o.status === 'new').sort((a, b) => new Date(a.created_at) - new Date(b.created_at));
    const today = dayStart().getTime();
    const done = orders.filter((o) => o.status !== 'new' && new Date(o.created_at).getTime() >= today)
      .sort((a, b) => new Date(b.accepted_at || b.updated_at || b.created_at) - new Date(a.accepted_at || a.updated_at || a.created_at));
    const canNotify = 'Notification' in window && Notification.permission === 'default';
    main.innerHTML = `
      <div class="toolbar">
        <span class="live-dot${live && ordersState !== 'stale' ? '' : ' off'}">${ordersState === 'stale' ? 'Нет связи — показаны последние данные' : live ? 'Заказы приходят сразу' : 'Проверка каждые 10 секунд'}</span>
        <span class="grow"></span>
        <button type="button" class="btn small ghost" data-sound>${icon('bell', 'sm')}${soundOn ? 'Звук включён' : 'Звук выключен'}</button>
        ${canNotify ? `<button type="button" class="btn small ghost" data-notify>${icon('bell', 'sm')}Уведомления</button>` : ''}
      </div>
      <section class="o-section">
        <h2 class="o-section-title">Новые <span class="o-count${fresh.length ? ' hot' : ''}">${fresh.length}</span></h2>
        ${fresh.length ? `<div class="o-grid">${fresh.map(orderCard).join('')}</div>`
          : '<p class="a-empty">Новых заказов нет. Когда гость отправит заказ, он появится здесь со звуком.</p>'}
      </section>
      <section class="o-section">
        <h2 class="o-section-title">Принятые сегодня <span class="o-count">${done.length}</span></h2>
        ${done.length ? `<div class="o-grid">${done.slice(0, 60).map(orderCard).join('')}</div>` : '<p class="a-empty">Пока нет.</p>'}
      </section>`;
  }

  async function accept(id) {
    const o = orders.find((x) => x.id === id);
    if (!o || busy.has(id)) return;
    busy.add(id);
    renderOrders();
    try {
      const r = await api.acceptOrder(id);
      orders = orders.map((x) => (x.id === id ? { ...x, status: r.status, accepted_at: r.accepted_at, accepted_by_name: r.accepted_by_name } : x));
      if (r.changed) S.toast(`Заказ №${o.no} принят — гость видит подтверждение`);
      else S.toast(r.status === 'cancelled' ? `Заказ №${o.no} уже отменён` : `Заказ №${o.no} уже принял${r.accepted_by_name ? ` ${r.accepted_by_name}` : ' другой сотрудник'}`, true);
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
    main.innerHTML = `
      <div class="toolbar"><label class="search">${icon('search')}
        <input id="w-search" type="search" placeholder="Найти блюдо (на любом языке)" value="${esc(q)}" autocomplete="off"></label></div>
      <div class="chips" role="group" aria-label="Наличие">
        <button type="button" class="chip${filter === 'all' ? ' active' : ''}" data-f="all">Все<b>${base.length}</b></button>
        <button type="button" class="chip${filter === 'yes' ? ' active' : ''}" data-f="yes">В наличии<b>${yes}</b></button>
        <button type="button" class="chip${filter === 'no' ? ' active' : ''}" data-f="no">Нет в наличии<b>${base.length - yes}</b></button>
      </div>
      <div class="chips" role="group" aria-label="Категории">
        <button type="button" class="chip${!cat ? ' active' : ''}" data-c="">Все категории</button>
        ${shownCats.map((c) => `<button type="button" class="chip${cat === c.id ? ' active' : ''}" data-c="${esc(c.id)}">${esc(tr(c.name))}</button>`).join('')}
      </div>
      ${shown.length ? shownCats.map((c) => {
        const items = shown.filter((d) => d.category_id === c.id);
        if (!items.length) return '';
        return `<section class="panel"><div class="panel-head"><h3>${esc(tr(c.name))}<small>${items.length}</small></h3></div>
          <ul class="rows">${items.map((d) => `
            <li class="${d.available ? '' : 'is-off'}" data-dish="${esc(d.id)}" role="button" tabindex="0" style="cursor:pointer">
              ${photo(d)}
              <div class="grow"><b>${esc(tr(d.name))}</b><small>${esc([(d.meat || []).map((m) => MEAT[m]).join(', '), d.name?.en && d.name.en !== tr(d.name) ? d.name.en : '', amount(d)].filter(Boolean).join(' · '))}</small></div>
              <span class="price">${money(d.price)}</span>
              <span class="state-badge ${d.available ? 'ok' : 'no'}">${d.available ? 'В наличии' : 'Нет в наличии'}</span>
            </li>`).join('')}</ul></section>`;
      }).join('') : `<div class="a-empty">${list.length ? 'Ничего не нашлось. Попробуйте другое слово или фильтр.' : 'В меню пока нет блюд.'}</div>`}`;
    if (keepFocus) { const inp = $('#w-search'); inp.focus(); inp.setSelectionRange(inp.value.length, inp.value.length); }
  }
  function showDish(id) {
    const d = dishes.find((x) => x.id === id);
    if (!d) return;
    const names = Object.entries(d.name || {}).filter(([, v]) => v).map(([k, v]) => `<li><b>${LANG_NAMES[k] || k}</b> ${esc(v)}</li>`).join('');
    const meat = (d.meat || []).map((m) => MEAT[m]).join(', ');
    S.modal(`
      <div class="photo" style="width:100%;height:auto;aspect-ratio:4/3;border-radius:16px;margin-bottom:14px">${d.photo_url ? `<img src="${esc(d.photo_url)}" alt="">` : icon('dish')}</div>
      <h2 id="modal-title">${esc(tr(d.name))}</h2>
      <p style="margin:6px 0 0"><span class="state-badge ${d.available ? 'ok' : 'no'}">${d.available ? 'В наличии' : 'Нет в наличии'}</span>
        ${(d.tags || []).map((t) => `<span class="state-badge muted">${esc(TAGS[t] || t)}</span>`).join(' ')}</p>
      <p style="font-size:22px;font-weight:800;margin:12px 0 0">${money(d.price)} <small style="font-size:14px;color:var(--muted);font-weight:600">${esc([amount(d), d.kcal ? `${d.kcal} ккал` : ''].filter(Boolean).join(' · '))}</small></p>
      <p class="section-label">Мясо</p><p style="margin:0;color:var(--muted)">${meat ? esc(meat) : 'не указано рестораном'}</p>
      <p class="section-label">Состав</p><p style="margin:0;color:var(--muted)">${tr(d.ingredients) ? esc(tr(d.ingredients)) : 'не указан рестораном'}</p>
      ${tr(d.desc) ? `<p class="section-label">Описание</p><p style="margin:0;color:var(--muted)">${esc(tr(d.desc))}</p>` : ''}
      ${d.allergens?.length ? `<p class="section-label">Аллергены</p><p style="margin:0;color:var(--muted)">${esc(d.allergens.map((a) => ALLERGENS[a] || a).join(', '))}</p>` : ''}
      ${names ? `<p class="section-label">Название на языках гостей</p><ul style="margin:4px 0 0;padding-inline-start:18px;color:var(--muted)">${names}</ul>` : ''}
      <div class="modal-foot"><button type="button" class="btn ghost" data-modal-close>Закрыть</button></div>`);
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

  // ---------- разделы ----------
  function setTab(next) {
    tab = next === 'menu' ? 'menu' : 'orders';
    document.querySelectorAll('.a-tab').forEach((a) => a.setAttribute('aria-current', a.dataset.tab === tab ? 'page' : 'false'));
    render();
  }
  function render() { if (tab === 'orders') renderOrders(); else renderMenu(); }
  window.addEventListener('hashchange', () => { if (api) setTab(location.hash.slice(1)); });

  // ---------- события ----------
  document.addEventListener('input', (e) => { if (e.target.id === 'w-search') { q = e.target.value; renderMenu(); } });
  document.addEventListener('click', (e) => {
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
      if (bn.dataset.banner === 'sound') { unlockAudio(); ding(); } else { bannerMsg = ''; renderBanner(); location.hash = '#orders'; setTab('orders'); }
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
    async onReady(ctx) {
      api = ctx.api;
      paintBrand();
      setTab(location.hash.slice(1) || 'orders');
      await Promise.all([loadOrders(), loadMenu().catch((ex) => S.toast(S.errText(ex), true))]);
      render();
      renderBanner();
      stop?.();
      stop = api.subscribe(['orders', 'dishes', 'categories', 'settings'], async (table) => {
        if (table === 'orders') { await loadOrders(); if (tab === 'orders') renderOrders(); return; }
        if (document.querySelector('.modal')) return;
        try { await loadMenu(); if (tab === 'menu') renderMenu(); } catch { /* позже */ }
      }, (ok) => { live = ok; if (tab === 'orders') renderOrders(); });
      clearInterval(timer);
      timer = setInterval(async () => {
        if (document.hidden && live) return;
        await loadOrders();
        if (tab === 'orders' && !document.querySelector('.modal')) renderOrders();
      }, 10000);
    },
    onLogout() { stop?.(); stop = null; clearInterval(timer); bannerMsg = ''; renderBanner(); },
  });
})();

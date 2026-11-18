(() => {
  'use strict';

  // =====================================================================
  //  Экран кухни (повар или владелец): принятые заказы → «Готовлю» → «Готово».
  //  Официант узнаёт о готовом заказе сразу. Права проверяет база:
  //  повар меняет только статусы «готовится» и «готово», цен и сумм не видит.
  // =====================================================================

  const S = window.Staff;
  const { $, esc, icon, tr } = S;

  let api = null;
  let orders = [];
  let state = 'loading';     // loading | ready | error | stale
  let live = false;
  let seen = null;
  let stop = null;
  let timer = null;
  const busy = new Set();

  const hhmm = (iso) => new Date(iso).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' });
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
    if (soundOn && (!audio || audio.state !== 'running')) parts.push(`<button type="button" class="banner-sound" data-banner="sound">${icon('bell')}<span>Нажмите здесь, чтобы включить звук новых заказов</span></button>`);
    el.hidden = !parts.length;
    el.innerHTML = parts.join('');
  }

  // ---------- заказы ----------
  async function load() {
    try {
      const rows = await api.orders(dayStart().toISOString());
      const queue = rows.filter((o) => o.status === 'accepted');
      const fresh = seen ? queue.filter((o) => !seen.has(o.id)) : [];
      seen = new Set([...(seen || []), ...queue.map((o) => o.id)]);
      orders = rows;
      state = 'ready';
      if (fresh.length) {
        bannerMsg = fresh.length > 1 ? `На кухню: ${fresh.length} новых заказа` : `На кухню: заказ №${fresh[0].no}, стол ${fresh[0].table_label}`;
        renderBanner();
        ding();
      }
    } catch {
      state = state === 'ready' || state === 'stale' ? 'stale' : 'error';
    }
    const n = orders.filter((o) => o.status === 'accepted').length;
    const el = $('#tab-count');
    if (el) { el.hidden = !n; el.textContent = n; }
    document.title = n ? `(${n}) Кухня` : 'Кухня';
  }

  function card(o) {
    const wait = mins(o.accepted_at || o.created_at);
    const b = busy.has(o.id);
    const late = o.status !== 'ready' && wait >= 20 ? ' is-late' : wait >= 12 && o.status !== 'ready' ? ' is-slow' : '';
    return `<article class="k-card ks-${esc(o.status)}${late}">
      <div class="k-head"><b>Стол ${esc(o.table_label)}</b><span>№${esc(o.no)}</span></div>
      <div class="k-time">${o.status === 'ready' ? `Готово в ${esc(hhmm(o.ready_at || o.updated_at))}` : `Принят в ${esc(hhmm(o.accepted_at || o.created_at))} · ждёт ${wait} мин`}</div>
      <ul class="k-items">${(o.items || []).map((i) => `<li><b>${esc(i.qty)}×</b><span>${esc(tr(i.name) || i.id)}${optNames(i).length ? `<em>${esc(optNames(i).join(', '))}</em>` : ''}</span></li>`).join('')}</ul>
      ${o.note ? `<div class="k-note">${icon('alert', 'sm')}${esc(o.note)}</div>` : ''}
      <div class="k-actions">
        ${o.status === 'accepted' ? `<button type="button" class="btn soft" data-k="${esc(o.id)}" data-to="cooking"${b ? ' disabled' : ''}>${icon('flame', 'sm')}Готовлю</button>` : ''}
        ${o.status !== 'ready' ? `<button type="button" class="btn" data-k="${esc(o.id)}" data-to="ready"${b ? ' disabled' : ''}>${icon('check', 'sm')}Готово</button>` : ''}
        <button type="button" class="btn ghost small" data-print="${esc(o.id)}" aria-label="Печать бумажки">${icon('printer', 'sm')}</button>
      </div>
    </article>`;
  }

  function render() {
    const main = $('#a-main');
    if (state === 'loading') { main.innerHTML = '<p class="a-empty">Загружаем заказы…</p>'; return; }
    if (state === 'error') {
      main.innerHTML = `<div class="a-card">${icon('alert', 'lg')}<h2>Нет связи с сервером</h2><p>Проверьте интернет.</p><button type="button" class="btn block" data-retry>${icon('refresh', 'sm')}Повторить</button></div>`;
      return;
    }
    const by = (s) => orders.filter((o) => o.status === s).sort((a, b) => new Date(a.accepted_at || a.created_at) - new Date(b.accepted_at || b.created_at));
    const queue = by('accepted');
    const cooking = by('cooking');
    const ready = by('ready').reverse().slice(0, 12);
    const waiting = orders.filter((o) => o.status === 'new').length;
    main.innerHTML = `
      <div class="toolbar">
        <span class="live-dot${live && state !== 'stale' ? '' : ' off'}">${state === 'stale' ? 'Нет связи — показаны последние данные' : live ? 'Заказы приходят сразу' : 'Проверка каждые 10 секунд'}</span>
        ${waiting ? `<span class="help" style="margin:0">Ещё ${waiting} заказ(а) ждут, пока официант примет.</span>` : ''}
        <span class="grow"></span>
        <button type="button" class="btn small ghost" data-sound>${icon('bell', 'sm')}${soundOn ? 'Звук включён' : 'Звук выключен'}</button>
      </div>
      <div class="k-cols">
        <section><h2 class="o-section-title">Новые <span class="o-count${queue.length ? ' hot' : ''}">${queue.length}</span></h2>
          ${queue.length ? queue.map(card).join('') : '<p class="a-empty">Нет новых. Принятый официантом заказ появится здесь со звуком.</p>'}</section>
        <section><h2 class="o-section-title">Готовятся <span class="o-count">${cooking.length}</span></h2>
          ${cooking.length ? cooking.map(card).join('') : '<p class="a-empty">Пусто.</p>'}</section>
        <section><h2 class="o-section-title">Готово <span class="o-count">${by('ready').length}</span></h2>
          ${ready.length ? ready.map(card).join('') : '<p class="a-empty">Пока ничего.</p>'}</section>
      </div>`;
  }

  async function setStatus(id, to) {
    const o = orders.find((x) => x.id === id);
    if (!o || busy.has(id)) return;
    busy.add(id);
    render();
    try {
      const r = await api.kitchenSet(id, to);
      orders = orders.map((x) => (x.id === id ? { ...x, ...r } : x));
      if (r.status !== to) S.toast(`Заказ №${o.no} уже ${r.status === 'cancelled' ? 'отменён' : 'в другом статусе'}`, true);
      else S.toast(to === 'ready' ? `Заказ №${o.no} готов — официант видит` : `Заказ №${o.no}: готовим`);
    } catch (ex) { S.toast(S.errText(ex), true); }
    busy.delete(id);
    if (to === 'ready' && bannerMsg) { bannerMsg = ''; renderBanner(); }
    render();
  }

  document.addEventListener('click', (e) => {
    const k = e.target.closest('[data-k]');
    if (k) { setStatus(k.dataset.k, k.dataset.to); return; }
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
    if (bn) { if (bn.dataset.banner === 'sound') { unlockAudio(); ding(); } else { bannerMsg = ''; renderBanner(); } }
  });
  setInterval(() => { if (api && orders.some((o) => o.status === 'accepted')) ding(); }, 60000);
  setInterval(() => { if (api && state !== 'loading' && !document.hidden) render(); }, 30000); // «ждёт N мин»

  S.start({
    need: 'kitchen',
    async onReady(ctx) {
      api = ctx.api;
      const st = S.settings;
      if (st) {
        $('#a-sub').textContent = st.name;
        if (st.logo_url) $('#a-logo').innerHTML = `<img src="${esc(st.logo_url)}" alt="">`;
      }
      await load();
      render();
      renderBanner();
      stop?.();
      stop = api.subscribe(['orders'], async () => { await load(); render(); }, (ok) => { live = ok; render(); });
      clearInterval(timer);
      timer = setInterval(async () => { if (document.hidden && live) return; await load(); render(); }, 10000);
    },
    onLogout() { stop?.(); stop = null; clearInterval(timer); bannerMsg = ''; renderBanner(); },
  });
})();

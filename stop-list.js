(() => {
  'use strict';

  // =====================================================================
  //  Стоп-лист: все блюда по категориям, поиск, «Есть / Закончилось»
  //  и «Осталось» (порций; пусто — не считаем). Заказ сам уменьшает остаток,
  //  отмена возвращает; на нуле блюдо закрывается для гостей.
  //  Менять могут владелец, менеджер и повар — проверяет база.
  //
  //  Подключение: <script src="stop-list.js"> после staff-core.js, затем
  //    const ctl = StopList.open(document.querySelector('#box'), { api });
  //    ctl.reload()  — заново взять блюда (например, по живому обновлению 'dishes' / 'categories');
  //    ctl.render()  — перерисовать (смена языка);  ctl.close() — снять обработчики.
  // =====================================================================

  const S = window.Staff;
  const { esc, icon, tr } = S;
  const t = (...a) => S.t(...a);
  const norm = (s) => String(s || '').toLowerCase().replace(/ё/g, 'е');
  const isOut = (d) => !d.available || d.stock === 0;

  function open(host, { api, onChange } = {}) {
    let cats = [];
    let dishes = [];
    let state = 'loading';   // loading | ready | error
    let q = '';
    let filter = 'all';      // all | out
    let pending = false;     // пришли новые данные, пока повар вводит число, — перерисуем после
    const busy = new Set();

    async function reload() {
      try {
        [cats, dishes] = await Promise.all([api.categories(), api.dishes()]);
        state = 'ready';
      } catch {
        if (state !== 'ready') state = 'error';
      }
      render();
    }

    function row(d) {
      const out = isOut(d);
      const dis = busy.has(d.id) ? ' disabled' : '';
      return `<li class="sl-row${out ? ' is-out' : ''}" data-sl-row="${esc(d.id)}">
        <div class="sl-name"><b>${esc(tr(d.name) || d.id)}</b>
          ${out ? `<span class="state-badge no">${esc(t('sl_out'))}</span>` : d.stock != null ? `<span class="state-badge muted">${esc(t('sl_left_n', d.stock))}</span>` : ''}</div>
        <label class="sl-stock"><span>${esc(t('sl_left'))}</span>
          <input type="number" min="0" max="100000" step="1" inputmode="numeric" data-sl-stock="${esc(d.id)}" value="${d.stock ?? ''}" placeholder="${esc(t('sl_left_ph'))}"${dis}></label>
        <label class="switch sl-switch"><input type="checkbox" data-sl-on="${esc(d.id)}"${d.available && d.stock !== 0 ? ' checked' : ''}${dis}><span class="track"></span><span class="sl-sw-t">${esc(out ? t('sl_out') : t('sl_in'))}</span></label>
      </li>`;
    }

    function render() {
      if (!host.isConnected) return;
      // не сбиваем ввод числа: перерисуем, когда повар закончит
      if (host.contains(document.activeElement) && document.activeElement.matches('[data-sl-stock]')) { pending = true; return; }
      pending = false;
      if (state === 'loading') { host.innerHTML = `<p class="a-empty">${esc(t('loading'))}</p>`; return; }
      if (state === 'error') {
        host.innerHTML = `<div class="a-card">${icon('alert', 'lg')}<h2>${esc(t('no_server'))}</h2><p>${esc(t('check_internet'))}</p><button type="button" class="btn block" data-sl-retry>${icon('refresh', 'sm')}${esc(t('retry'))}</button></div>`;
        return;
      }
      const keepQ = document.activeElement?.id === 'sl-q';
      const pos = keepQ ? document.activeElement.selectionStart : null;
      const all = dishes.filter((d) => !d.hidden);
      const words = norm(q).split(/\s+/).filter(Boolean);
      const hit = (d) => !words.length || words.every((w) => norm(Object.values(d.name || {}).join(' ')).includes(w));
      const found = all.filter(hit);
      const outN = found.filter(isOut).length;
      const shown = filter === 'out' ? found.filter(isOut) : found;
      const groups = [...cats].sort((a, b) => (a.sort ?? 0) - (b.sort ?? 0)).map((c) => ({ c, list: shown.filter((d) => d.category_id === c.id) })).filter((g) => g.list.length);
      host.innerHTML = `
        <h2 class="o-section-title">${esc(t('sl_title'))} <span class="o-count${all.filter(isOut).length ? ' hot' : ''}">${all.filter(isOut).length}</span></h2>
        <p class="help">${esc(t('sl_help'))}</p>
        <div class="toolbar"><label class="search">${icon('search')}
          <input id="sl-q" type="search" placeholder="${esc(t('sl_search'))}" value="${esc(q)}" autocomplete="off"></label></div>
        <div class="chips" role="group">
          <button type="button" class="chip${filter === 'all' ? ' active' : ''}" data-sl-f="all">${esc(t('all'))}<b>${found.length}</b></button>
          <button type="button" class="chip${filter === 'out' ? ' active' : ''}" data-sl-f="out">${esc(t('sl_out'))}<b>${outN}</b></button>
        </div>
        ${groups.length ? groups.map(({ c, list }) => `<section class="panel sl-panel">
          <div class="panel-head"><h3>${esc(tr(c.name))}<small>${list.length}</small></h3>${c.station === 'bar' ? `<span class="state-badge muted">${esc(t('st_bar'))}</span>` : ''}</div>
          <ul class="sl-list">${list.map(row).join('')}</ul></section>`).join('')
          : `<div class="a-empty">${esc(filter === 'out' && !words.length ? t('sl_none_out') : t('nothing_found'))}</div>`}`;
      if (keepQ) { const i = host.querySelector('#sl-q'); i.focus(); try { i.setSelectionRange(pos, pos); } catch { /* ok */ } }
    }

    const put = (nd) => { if (nd?.id) dishes = dishes.map((x) => (x.id === nd.id ? { ...x, ...nd } : x)); };

    async function setOn(id, on) {
      const d = dishes.find((x) => x.id === id);
      if (!d || busy.has(id)) return;
      const before = { ...d };
      busy.add(id);
      put({ id, available: on, stock: on && d.stock === 0 ? null : d.stock });   // сразу видно, сервер подтвердит
      render();
      try {
        put(await api.setDishAvailable(id, on));
        S.toast(t(on ? 'sl_t_on' : 'sl_t_off', tr(d.name)));
        onChange?.();
      } catch (ex) { put(before); S.toast(S.errText(ex), true); }
      busy.delete(id);
      render();
    }

    async function setStock(id, raw) {
      const d = dishes.find((x) => x.id === id);
      if (!d || busy.has(id)) return;
      const txt = String(raw ?? '').trim();
      const n = txt === '' ? null : Number(txt);
      if (n !== null && (!Number.isInteger(n) || n < 0 || n > 100000)) { S.toast(t('sl_bad_num'), true); render(); return; }
      if (n === (d.stock ?? null)) { render(); return; }
      busy.add(id);
      try {
        put((await api.setDishStock(id, n)) || { id, stock: n });
        S.toast(n === null ? t('sl_t_nostock', tr(d.name)) : t('sl_t_stock', tr(d.name), n));
        onChange?.();
      } catch (ex) { S.toast(S.errText(ex), true); }
      busy.delete(id);
      render();
    }

    const onInput = (e) => { if (e.target.id === 'sl-q') { q = e.target.value; render(); } };
    const onChangeEv = (e) => {
      const sw = e.target.closest('[data-sl-on]');
      if (sw) { setOn(sw.dataset.slOn, sw.checked); return; }
      const st = e.target.closest('[data-sl-stock]');
      if (st) { const v = st.value; st.blur(); setStock(st.dataset.slStock, v); }
    };
    const onKey = (e) => { if (e.key === 'Enter' && e.target.matches?.('[data-sl-stock]')) { e.preventDefault(); e.target.blur(); } };
    // ушли из поля, ничего не поменяв, — догоняем отложенную перерисовку
    const onBlur = (e) => { if (e.target.matches?.('[data-sl-stock]') && pending) setTimeout(() => { if (pending) render(); }, 0); };
    const onClick = (e) => {
      const f = e.target.closest('[data-sl-f]');
      if (f) { filter = f.dataset.slF === 'out' ? 'out' : 'all'; render(); return; }
      if (e.target.closest('[data-sl-retry]')) { state = 'loading'; render(); reload(); }
    };
    host.addEventListener('input', onInput);
    host.addEventListener('change', onChangeEv);
    host.addEventListener('keydown', onKey);
    host.addEventListener('focusout', onBlur);
    host.addEventListener('click', onClick);

    render();
    reload();

    return {
      host, reload, render,
      close() {
        host.removeEventListener('input', onInput);
        host.removeEventListener('change', onChangeEv);
        host.removeEventListener('keydown', onKey);
        host.removeEventListener('focusout', onBlur);
        host.removeEventListener('click', onClick);
      },
    };
  }

  window.StopList = { open };
})();

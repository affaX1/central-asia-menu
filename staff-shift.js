(() => {
  'use strict';

  // =====================================================================
  //  Смена сотрудника: «Начать смену» / «Закончить смену» и живой счётчик
  //  «на смене 02:15». Общая для официанта и кухни (и владельца, если нужно):
  //    const sh = StaffShift.create(api, me, () => перерисовать);
  //    await sh.load();  sh.html()  — разметка;  sh.handleClick(e) — true, если нажали кнопку смены.
  //  Права проверяет база (shift_start / shift_end — любой сотрудник, только себе).
  // =====================================================================

  const S = window.Staff;
  const { esc, icon } = S;
  const t = (...a) => S.t(...a);

  // «02:15» — часы и минуты с начала смены
  const hm = (iso) => {
    const m = Math.max(0, Math.floor((Date.now() - new Date(iso).getTime()) / 60000));
    return `${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`;
  };

  // все счётчики на странице обновляются сами, без перерисовки экрана
  function tick() {
    document.querySelectorAll('[data-shift-since]').forEach((el) => {
      const v = hm(el.dataset.shiftSince);
      if (el.textContent !== v) el.textContent = v;
    });
  }
  setInterval(tick, 15000);
  document.addEventListener('visibilitychange', () => { if (!document.hidden) tick(); });

  function create(api, me, onChange) {
    let shift = null;
    let state = 'loading';   // loading | ready | error
    let busy = false;

    async function load() {
      try { shift = await api.myShift(me?.id); state = 'ready'; } catch { state = state === 'ready' ? 'ready' : 'error'; }
    }

    // compact — маленькая плашка для шапки (кухня); иначе — блок для вкладки «Смена»
    function html(compact = false) {
      if (state === 'loading') return compact ? '' : `<p class="a-empty">${esc(t('loading'))}</p>`;
      if (state === 'error' && !shift) return compact ? '' : `<p class="notice bad">${icon('alert')}<span>${esc(t('sh_e_load'))}</span></p>`;
      const dis = busy ? ' disabled' : '';
      if (compact) {
        return shift
          ? `<span class="shf-chip is-on">${icon('clock', 'sm')}<span>${esc(t('sh_on_short'))}</span><b data-shift-since="${esc(shift.started_at)}">${esc(hm(shift.started_at))}</b>
              <button type="button" class="link-btn" data-shift-end${dis}>${esc(t('sh_end'))}</button></span>`
          : `<button type="button" class="btn small soft" data-shift-start${dis}>${icon('clock', 'sm')}${esc(t('sh_start'))}</button>`;
      }
      return `<section class="shf-box${shift ? ' is-on' : ''}">
        <div class="shf-info">${icon('clock', 'lg')}
          <div>${shift
            ? `<b class="shf-timer" data-shift-since="${esc(shift.started_at)}">${esc(hm(shift.started_at))}</b><span>${esc(t('sh_since', new Date(shift.started_at).toLocaleTimeString(S.locale(), { hour: '2-digit', minute: '2-digit' })))}</span>`
            : `<b>${esc(t('sh_none'))}</b><span>${esc(t('sh_none_d'))}</span>`}</div></div>
        ${shift
          ? `<button type="button" class="btn ghost" data-shift-end${dis}>${esc(t('sh_end'))}</button>`
          : `<button type="button" class="btn" data-shift-start${dis}>${icon('clock', 'sm')}${esc(t('sh_start'))}</button>`}
      </section>`;
    }

    async function start() {
      if (busy) return;
      busy = true;
      onChange?.();
      try {
        shift = await api.shiftStart();
        state = 'ready';
        S.toast(t('sh_t_started'));
      } catch (ex) { S.toast(S.errText(ex), true); }
      busy = false;
      onChange?.();
    }
    async function end() {
      if (busy || !shift) return;
      if (!await S.ask(t('sh_ask_end', hm(shift.started_at)), { ok: t('sh_end') })) return;
      busy = true;
      onChange?.();
      try {
        const took = hm(shift.started_at);
        await api.shiftEnd();
        shift = null;
        S.toast(t('sh_t_ended', took));
      } catch (ex) { S.toast(S.errText(ex), true); await load(); }
      busy = false;
      onChange?.();
    }

    function handleClick(e) {
      if (e.target.closest('[data-shift-start]')) { start(); return true; }
      if (e.target.closest('[data-shift-end]')) { end(); return true; }
      return false;
    }

    return { load, html, handleClick, get shift() { return shift; } };
  }

  window.StaffShift = { create };
})();

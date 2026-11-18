(() => {
  'use strict';

  // =====================================================================
  //  Настройки официанта и повара: язык, «не гасить экран», установка на
  //  телефон как приложение, свой Telegram (подключение по кнопке «Start»).
  // =====================================================================

  const S = window.Staff;
  const { esc, icon } = S;
  const t = (...a) => S.t(...a);

  // ---------- экран не гаснет ----------
  let lock = null;
  let wakeWanted = (() => { try { return localStorage.getItem('staff:wake') === '1'; } catch { return false; } })();
  const wakeSupported = () => 'wakeLock' in navigator;
  async function wakeOn() {
    if (!wakeSupported() || document.hidden) return;
    try { lock = await navigator.wakeLock.request('screen'); lock.addEventListener?.('release', () => { lock = null; }); } catch { lock = null; }
  }
  function wakeOff() { try { lock?.release(); } catch { /* уже отпущен */ } lock = null; }
  document.addEventListener('visibilitychange', () => { if (wakeWanted && !document.hidden && !lock) wakeOn(); });
  if (wakeWanted) wakeOn();

  // ---------- установка на телефон ----------
  let installEvt = null;
  addEventListener('beforeinstallprompt', (e) => { e.preventDefault(); installEvt = e; document.querySelectorAll('[data-st-install]').forEach((b) => { b.hidden = false; }); });
  const standalone = () => matchMedia('(display-mode: standalone)').matches || navigator.standalone === true;
  const ios = () => /iphone|ipad|ipod/i.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);

  // ---------- Telegram ----------
  let tgState = null;      // { linked, bot_username, bot_ready } | 'error'
  let tgMsg = '';
  let tgWaiting = false;
  let tgCode = null;
  async function tgLoad(api) {
    try { tgState = await api.myTelegram(); } catch { tgState = 'error'; }
  }
  async function tgConnect(api, box, kind) {
    tgMsg = '';
    try {
      const r = await api.myTelegramStart();
      tgCode = r.code;
      if (r.bot_username) window.open(`https://t.me/${encodeURIComponent(r.bot_username)}?start=${encodeURIComponent(r.code)}`, '_blank', 'noopener');
      tgState = { ...(tgState || {}), bot_username: r.bot_username };
      tgWaiting = true;
      paint(api, box, kind);
      for (let i = 0; i < 30 && tgWaiting; i++) {
        await new Promise((res) => setTimeout(res, 2500));
        const st = await api.myTelegramCheck();
        if (st === 'linked') { tgWaiting = false; tgCode = null; await tgLoad(api); tgMsg = ''; break; }
        if (st === 'expired' || st === 'no_code') { tgWaiting = false; tgMsg = t('tg_expired'); break; }
        if (st === 'no_bot') { tgWaiting = false; tgMsg = t('tg_no_bot'); break; }
        if (st === 'not_found' && i > 10) { tgWaiting = false; tgMsg = t('tg_not_found'); break; }
      }
      if (tgWaiting) { tgWaiting = false; tgMsg = t('tg_not_found'); }
    } catch (ex) {
      tgWaiting = false;
      tgMsg = /no_bot/.test(String(ex?.message)) ? t('tg_no_bot') : S.errText(ex);
    }
    paint(api, box, kind);
  }

  function paint(api, box, kind) {
    if (!box?.isConnected) return;
    const tg = tgState === 'error' || !tgState ? null : tgState;
    box.innerHTML = `
      <section class="panel"><div class="panel-head"><h3>${esc(t('set_t'))}</h3></div><div class="panel-body st-set">
        <div class="st-row"><span>${esc(t('language'))}</span>
          <select data-lang-pick aria-label="${esc(t('language'))}">${(window.STAFF_LANGS || []).map(([c, n]) => `<option value="${c}"${c === S.lang ? ' selected' : ''}>${esc(n)}</option>`).join('')}</select></div>
        <div class="st-row"><label class="switch"><input type="checkbox" data-st-wake${wakeWanted ? ' checked' : ''}${wakeSupported() ? '' : ' disabled'}><span class="track"></span>${esc(t('set_wake'))}</label>
          <small>${esc(wakeSupported() ? t('set_wake_d') : t('set_wake_no'))}</small></div>
      </div></section>
      <section class="panel"><div class="panel-head"><h3>${esc(t('install_t'))}</h3></div><div class="panel-body">
        ${standalone() ? `<p class="notice ok">${icon('check')}<span>${esc(t('installed'))}</span></p>` : `
          <p class="help" style="margin-top:0">${esc(t('install_d'))}</p>
          <button type="button" class="btn" data-st-install${installEvt ? '' : ' hidden'}>${icon('download', 'sm')}${esc(t('install_btn'))}</button>
          <p class="help">${esc(ios() ? t('install_ios') : t('install_android'))}</p>`}
      </div></section>
      <section class="panel"><div class="panel-head"><h3>${esc(t('tg_t'))}</h3></div><div class="panel-body">
        <p class="help" style="margin-top:0">${esc(t(kind === 'cook' ? 'tg_d_k' : 'tg_d_w'))}</p>
        ${!tg ? `<p class="a-empty">${esc(t('loading'))}</p>`
          : tg.linked ? `<p class="notice ok">${icon('check')}<span>${esc(t('tg_linked'))}</span></p><button type="button" class="btn ghost" data-st-tg-off>${esc(t('tg_off'))}</button>`
            : !tg.bot_ready ? `<p class="notice">${icon('alert')}<span>${esc(t('tg_no_bot'))}</span></p>`
              : tgWaiting ? `<p class="notice info">${icon('refresh')}<span>${esc(t('tg_waiting'))}</span></p>
                  <p class="help">${esc(tg.bot_username ? t('tg_step') : t('tg_step_code', tgCode || ''))}</p>
                  ${tg.bot_username ? `<a class="btn ghost" href="https://t.me/${esc(tg.bot_username)}?start=${esc(tgCode || '')}" target="_blank" rel="noopener">${icon('send', 'sm')}${esc(t('tg_open_bot'))}</a>` : ''}`
                : `<button type="button" class="btn" data-st-tg>${icon('send', 'sm')}${esc(t('tg_connect'))}</button>`}
        ${tgMsg && !tgWaiting ? `<p class="notice${/linked|Подключено|Connected|Bersambung|Ulandi/.test(tgMsg) ? ' ok' : ''}">${esc(tgMsg)}</p>` : ''}
      </div></section>`;
  }

  // box — контейнер, kind — 'waiter' | 'cook'
  async function settings(api, box, kind) {
    paint(api, box, kind);
    if (!tgState || tgState === 'error') { await tgLoad(api); paint(api, box, kind); }
    box.onchange = (e) => {
      if (e.target.matches('[data-st-wake]')) {
        wakeWanted = e.target.checked;
        try { localStorage.setItem('staff:wake', wakeWanted ? '1' : '0'); } catch { /* ok */ }
        if (wakeWanted) wakeOn(); else wakeOff();
      }
    };
    box.onclick = async (e) => {
      if (e.target.closest('[data-st-install]') && installEvt) { installEvt.prompt(); try { await installEvt.userChoice; } catch { /* ok */ } installEvt = null; paint(api, box, kind); return; }
      if (e.target.closest('[data-st-tg]')) { tgConnect(api, box, kind); return; }
      if (e.target.closest('[data-st-tg-off]')) {
        try { await api.myTelegramOff(); await tgLoad(api); tgMsg = ''; } catch (ex) { tgMsg = S.errText(ex); }
        paint(api, box, kind);
      }
    };
  }

  window.StaffTools = { settings, wakeOn };
})();

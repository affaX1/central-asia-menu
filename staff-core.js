// =====================================================================
//  Общее для панели официанта и панели владельца:
//  вход, регистрация по приглашению, экраны «нет доступа», шапка, помощники.
//  Это только интерфейс: права на чтение и изменение проверяет база.
// =====================================================================
(() => {
  'use strict';

  const $ = (s) => document.querySelector(s);
  const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
  const icon = (id, cls = '') => `<svg class="ic ${cls}" aria-hidden="true"><use href="icons.svg#i-${id}"/></svg>`;

  // тема как у меню гостя
  try {
    const th = JSON.parse(localStorage.getItem('menu:theme') || 'null');
    document.documentElement.dataset.theme = th === 'dark' ? 'dark' : 'light'; // панели сотрудников светлые, тёмная — только если выбрали сами
  } catch { /* светлая */ }

  // ---------- язык панели ----------
  // владелец — всегда русский; официант и повар выбирают сами (по умолчанию — язык телефона)
  const LANGS = (window.STAFF_LANGS || [['ru', 'Русский']]).map(([c]) => c);
  const fixedLang = document.documentElement.dataset.staffLang;
  let lang = fixedLang || (() => {
    try { const v = localStorage.getItem('staff:lang'); if (LANGS.includes(v)) return v; } catch { /* нет хранилища */ }
    const phone = (navigator.languages || [navigator.language || '']).map((x) => String(x).slice(0, 2).toLowerCase());
    return phone.find((x) => LANGS.includes(x)) || (LANGS.includes('en') ? 'en' : 'ru');
  })();
  document.documentElement.lang = lang;
  const T = window.STAFF_T || {};
  const t = (key, ...args) => {
    const e = T[key];
    if (!e) return key;
    const v = e[lang] ?? e.en ?? e.ru;
    return typeof v === 'function' ? v(...args) : v;
  };
  const locale = () => ({ ru: 'ru-RU', en: 'en-GB', ms: 'ms-MY', uz: 'uz-UZ' })[lang] || 'ru-RU';
  // временно другой язык (чек печатается на языке ресторана, а не сотрудника)
  const withLang = (l, fn) => { const was = lang; if (LANGS.includes(l)) lang = l; try { return fn(); } finally { lang = was; } };
  const tr = (o) => (o == null ? '' : typeof o === 'string' ? o : o[lang] || o.en || o.ru || Object.values(o).find(Boolean) || '');
  // подписи в разметке страницы: <span data-t="tab_orders">
  const paintStatic = () => document.querySelectorAll('[data-t]').forEach((el) => { el.textContent = t(el.dataset.t); });
  let settings = null;
  const money = (n) => {
    const v = Math.round(Number(n || 0) * 100) / 100;
    const num = new Intl.NumberFormat(locale(), { minimumFractionDigits: Number.isInteger(v) ? 0 : 2, maximumFractionDigits: 2 }).format(v);
    const c = settings?.currency || '';
    return settings?.currency_before ? `${c} ${num}` : `${num} ${c}`;
  };
  const unitLabel = new Proxy({}, { get: (_, k) => t(`unit_${k}`) });

  // ---------- всплывашка ----------
  let toastTimer = null;
  function toast(msg, bad) {
    let el = $('#toast');
    if (!el) {
      el = document.createElement('div');
      el.id = 'toast';
      el.setAttribute('role', 'status');
      el.setAttribute('aria-live', 'polite');
      document.body.appendChild(el);
    }
    el.textContent = msg;
    el.className = `toast ${bad ? 'bad' : 'good'} show`;
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => { el.className = el.className.replace(' show', ''); }, 3600);
  }

  // понятные тексты ошибок
  function errText(e) {
    const m = String(e?.message || e || '');
    if (/invalid login|invalid credentials/i.test(m)) return t('err_login');
    if (/email not confirmed/i.test(m)) return t('err_unconfirmed');
    if (/already registered|already exists/i.test(m)) return t('err_registered');
    if (/password/i.test(m) && /(least|short|weak|characters)/i.test(m)) return t('err_weak');
    if (/rate limit|too many/i.test(m)) return t('err_rate');
    if (/last_owner/.test(m)) return 'Нельзя: это единственный владелец.';
    if (/\bself\b/.test(m)) return 'Себя отключить, понизить или удалить нельзя.';
    if (/bad_email/.test(m)) return 'Проверьте email.';
    if (/bad_timezone/.test(m)) return 'Неизвестный часовой пояс.';
    if (/forbidden|row-level security|permission denied/i.test(m)) return t('no_rights');
    if (/foreign key|violates foreign/i.test(m)) return 'Нельзя удалить категорию, пока в ней есть блюда.';
    if (/duplicate key/i.test(m)) return 'Такой код уже занят.';
    if (/check constraint/i.test(m)) return 'Проверьте поля: что-то заполнено неверно.';
    if (/payload too large|exceeded the maximum|too large/i.test(m)) return 'Файл слишком большой.';
    if (/mime|invalid.*type/i.test(m)) return 'Этот формат картинки не подходит: нужен JPG, PNG или WebP.';
    if (/fetch|network|failed to|load failed/i.test(m)) return t('net_err');
    return t('failed', m.slice(0, 140));
  }

  // ---------- вход ----------
  const api = window.makeStaffApi?.() || null;
  let me = null;
  let opts = null;

  function renderUser() {
    const box = $('#a-user');
    if (!box) return;
    box.hidden = !me;
    if (!me) return;
    const role = t(`role_${me.role || 'none'}`);
    box.innerHTML = `<span class="a-who"><b>${esc(me.name || me.email)}</b><small>${esc(role)}</small></span>
      ${fixedLang ? '' : langSelect('lang-pick')}
      <button type="button" class="pill" id="logout-btn">${icon('logout', 'sm')}${esc(t('logout'))}</button>`;
  }

  function langSelect(id) {
    return `<label class="lang-pick"><span class="sr-only">${esc(t('language'))}</span><select id="${id}" data-lang-pick aria-label="${esc(t('language'))}">
      ${(window.STAFF_LANGS || []).map(([c, n]) => `<option value="${c}"${c === lang ? ' selected' : ''}>${esc(n)}</option>`).join('')}</select></label>`;
  }
  function setLang(next) {
    if (!LANGS.includes(next) || fixedLang) return;
    lang = next;
    document.documentElement.lang = lang;
    try { localStorage.setItem('staff:lang', lang); } catch { /* не сохранится */ }
    paintStatic();
    renderUser();
    if (!me || !opts?.rerender) { route(); return; }
    opts.rerender();
  }
  document.addEventListener('change', (e) => { if (e.target.matches?.('[data-lang-pick]')) setLang(e.target.value); });

  function screen(html) {
    $('#a-nav')?.setAttribute('hidden', '');
    document.body.classList.remove('signed');
    $('#a-main').innerHTML = html;
    renderUser();
  }

  function setupScreen() {
    screen(`<div class="a-card">${icon('lock', 'lg')}
      <h2>Сервер ещё не подключён</h2>
      <p>Меню для гостей работает, но панели сотрудников без сервера не открываются: аккаунты и права хранятся на сервере.</p>
      <p>Как подключить — по шагам в файле <b>SETUP.md</b>.</p>
    </div>`);
  }

  function authScreen(mode = 'login', err = '', info = '') {
    const reg = mode === 'register';
    const reset = mode === 'reset';
    screen(`<form class="a-card" id="auth-form" data-mode="${mode}" novalidate>
      ${icon('lock', 'lg')}
      <h2>${esc(t(reg ? 'auth_reg_t' : reset ? 'auth_reset_t' : 'auth_login_t'))}</h2>
      <p>${esc(t(reg ? 'auth_reg_d' : reset ? 'auth_reset_d' : 'auth_login_d'))}</p>
      ${fixedLang ? '' : `<div class="auth-lang">${langSelect('lang-pick-auth')}</div>`}
      ${reg ? `<label class="field"><span>${esc(t('f_name'))}</span><input name="name" type="text" maxlength="60" autocomplete="name" required></label>` : ''}
      <label class="field"><span>${esc(t('f_email'))}</span><input name="email" type="email" autocomplete="username" inputmode="email" required></label>
      ${reset ? '' : `<label class="field"><span>${esc(t('f_pass'))}${reg ? esc(t('f_pass8')) : ''}</span>
        <input name="password" type="password" minlength="${reg ? 8 : 1}" autocomplete="${reg ? 'new-password' : 'current-password'}" required></label>`}
      ${err ? `<p class="notice bad" role="alert">${icon('alert')}<span>${esc(err)}</span></p>` : ''}
      ${info ? `<p class="notice info" role="status">${icon('mail')}<span>${esc(info)}</span></p>` : ''}
      <button class="btn block" type="submit">${esc(t(reg ? 'b_register' : reset ? 'b_send_mail' : 'b_login'))}</button>
      <div class="a-links">
        ${mode !== 'login' ? `<button class="link-btn" type="button" data-auth="login">${esc(t('l_have'))}</button>` : ''}
        ${mode !== 'register' ? `<button class="link-btn" type="button" data-auth="register">${esc(t('l_invited'))}</button>` : ''}
        ${mode === 'login' ? `<button class="link-btn" type="button" data-auth="reset">${esc(t('l_forgot'))}</button>` : ''}
      </div>
    </form>`);
  }

  // своя страница каждой роли: повар — кухня, курьер — доставка, остальные — зал
  const homeOf = (role) => (role === 'cook' ? ['kitchen.html', t('open_kitchen')]
    : role === 'courier' ? ['courier.html', t('open_courier')] : ['waiter.html', t('open_waiter')]);
  function noAccessScreen(kind) {
    // текст под роль, если он есть (курьер на странице зала — «ваша страница — „Курьер“»)
    const text = (window.STAFF_T || {})[`na_${kind}_${me?.role}`] ? t(`na_${kind}_${me.role}`) : t(`na_${kind}`);
    const home = homeOf(me?.role);
    screen(`<div class="a-card">${icon('lock', 'lg')}
      <h2>${esc(text[0])}</h2><p>${esc(me?.email || '')}</p><p>${esc(text[1])}</p>
      ${['owner', 'floor', 'kitchen', 'courier'].includes(kind) ? `<a class="btn block" href="${home[0]}">${esc(home[1])}</a>`
        : `<button class="btn block" type="button" data-auth="recheck">${esc(t('recheck'))}</button>`}
    </div>`);
  }

  async function route() {
    if (!api) { setupScreen(); return; }
    screen(`<p class="a-empty">${esc(t('loading'))}</p>`);
    try {
      const s = await api.session();
      if (!s) { me = null; authScreen(); return; }
      const w = await api.whoami();
      if (!w) { me = null; authScreen(); return; }
      me = { id: w.user_id, email: w.email, name: w.name, role: w.role, active: w.active };
      if (!w.email_confirmed) { noAccessScreen('unconfirmed'); return; }
      if (!w.role) { noAccessScreen('uninvited'); return; }
      if (!w.active) { noAccessScreen('disabled'); return; }
      if (opts.need === 'owner' && !['owner', 'manager'].includes(w.role)) { noAccessScreen('owner'); return; }
      if ((opts.need === 'waiter' || opts.need === 'floor') && !['waiter', 'owner', 'manager'].includes(w.role)) { noAccessScreen('floor'); return; }
      if (opts.need === 'kitchen' && !['cook', 'owner'].includes(w.role)) { noAccessScreen('kitchen'); return; }
      // доставка: курьер, владелец и менеджер (как is_courier() в базе)
      if (opts.need === 'courier' && !['courier', 'owner', 'manager'].includes(w.role)) { noAccessScreen('courier'); return; }
      settings = await api.settings();
      renderUser();
      $('#a-nav')?.removeAttribute('hidden');
      document.body.classList.add('signed'); // левая панель (на телефоне — нижняя)
      $('#a-main').innerHTML = '';
      await opts.onReady({ api, me, settings });
    } catch (e) {
      authScreen('login', errText(e));
    }
  }

  document.addEventListener('submit', async (e) => {
    if (e.target.id !== 'auth-form') return;
    e.preventDefault();
    const f = new FormData(e.target);
    const mode = e.target.dataset.mode;
    const email = String(f.get('email') || '').trim().toLowerCase();
    const password = String(f.get('password') || '');
    const name = String(f.get('name') || '').trim();
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) { authScreen(mode, t('e_email')); return; }
    if (mode === 'register' && name.length < 2) { authScreen(mode, t('e_name')); return; }
    if (mode === 'register' && password.length < 8) { authScreen(mode, t('e_pass8')); return; }
    if (mode === 'login' && !password) { authScreen(mode, t('e_pass')); return; }
    const btn = e.target.querySelector('[type="submit"]');
    btn.disabled = true;
    btn.textContent = t('wait');
    try {
      if (mode === 'reset') {
        await api.resetPassword(email);
        authScreen('login', '', t('i_reset'));
        return;
      }
      if (mode === 'register') {
        const r = await api.signUp(email, password, name);
        if (r.needsEmailConfirm) {
          authScreen('login', '', t('i_mail', email));
          return;
        }
      } else {
        await api.signIn(email, password);
      }
      route();
    } catch (err) {
      authScreen(mode, errText(err));
    }
  });

  document.addEventListener('click', async (e) => {
    const a = e.target.closest('[data-auth]');
    if (a) {
      if (a.dataset.auth === 'recheck') route(); else authScreen(a.dataset.auth);
      return;
    }
    if (e.target.closest('#logout-btn')) {
      opts?.onLogout?.();
      try { await api.signOut(); } catch { /* всё равно выходим */ }
      me = null;
      settings = null;
      authScreen();
    }
  });

  // ---------- всплывающее окно-форма ----------
  let modalClose = null;
  function modal(html, { onClose } = {}) {
    closeModal();
    const back = document.createElement('div');
    back.className = 'modal-back';
    back.innerHTML = `<div class="modal" role="dialog" aria-modal="true" aria-labelledby="modal-title">
      <button type="button" class="sheet-close" data-modal-close aria-label="${esc(t('close'))}">${icon('x')}</button>${html}</div>`;
    document.body.appendChild(back);
    document.body.classList.add('locked');
    const last = document.activeElement;
    back.querySelector('input, select, textarea, button:not([data-modal-close])')?.focus({ preventScroll: true });
    const onKey = (ev) => { if (ev.key === 'Escape') closeModal(); };
    document.addEventListener('keydown', onKey);
    back.addEventListener('click', (ev) => { if (ev.target === back || ev.target.closest('[data-modal-close]')) closeModal(); });
    modalClose = () => {
      document.removeEventListener('keydown', onKey);
      back.remove();
      document.body.classList.remove('locked');
      onClose?.();
      if (last && document.contains(last)) last.focus({ preventScroll: true });
    };
    return back.querySelector('.modal');
  }
  function closeModal() { const f = modalClose; modalClose = null; f?.(); }

  // ---------- своё окно подтверждения вместо серого окна браузера ----------
  // ask('Удалить…?', { ok: 'Удалить' }) → Promise<true|false>
  // ask('Название', { input: 'старое' }) → Promise<строка|null>
  // ask('Чем оплатил?', { choices: [['cash', 'Наличными'], ['card', 'Картой']], choice: 'cash' }) → Promise<'cash'|'card'|null>
  function ask(text, { ok = t('yes'), cancel = t('cancel'), title = '', input = null, max = 200, choices = null, choice = null } = {}) {
    // выбранный вариант: указанный, а если его нет в списке — первый
    const sel = choices ? (choices.some(([x]) => x === choice) ? choice : choices[0][0]) : null;
    return new Promise((resolve) => {
      const back = document.createElement('div');
      back.className = 'ask-back';
      back.innerHTML = `<div class="ask-box" role="alertdialog" aria-modal="true" aria-labelledby="ask-text">
        ${title ? `<h3>${esc(title)}</h3>` : ''}<p id="ask-text">${esc(text)}</p>
        ${input !== null ? `<input class="ask-input" type="text" maxlength="${max}" value="${esc(input)}" autocomplete="off">` : ''}
        ${choices ? `<div class="ask-choices" role="radiogroup">${choices.map(([v, l]) => `<label class="ask-choice"><input type="radio" name="ask-choice" value="${esc(v)}"${v === sel ? ' checked' : ''}><span>${esc(l)}</span></label>`).join('')}</div>` : ''}
        <div class="ask-actions"><button type="button" class="btn ghost" data-ask="0">${esc(cancel)}</button>
        <button type="button" class="btn" data-ask="1">${esc(ok)}</button></div></div>`;
      const last = document.activeElement;
      const done = (v) => {
        const val = back.querySelector('.ask-input')?.value;
        const picked = back.querySelector('input[name="ask-choice"]:checked')?.value ?? null;
        document.removeEventListener('keydown', onKey, true);
        back.remove();
        if (last && document.contains(last)) last.focus({ preventScroll: true });
        resolve(input !== null ? (v ? val : null) : choices ? (v ? picked : null) : v);
      };
      const onKey = (ev) => {
        if (ev.key === 'Escape') { ev.stopImmediatePropagation(); ev.preventDefault(); done(false); }
        else if (ev.key === 'Enter' && ev.target.classList?.contains('ask-input')) { ev.preventDefault(); done(true); }
      };
      document.addEventListener('keydown', onKey, true);
      back.addEventListener('click', (ev) => {
        const b = ev.target.closest('[data-ask]');
        if (b) done(b.dataset.ask === '1'); else if (ev.target === back) done(false);
      });
      document.body.appendChild(back);
      const inp = back.querySelector('.ask-input');
      const radio = back.querySelector('input[name="ask-choice"]:checked');
      if (inp) { inp.focus({ preventScroll: true }); inp.select(); } else if (radio) radio.focus({ preventScroll: true }); else back.querySelector('[data-ask="0"]').focus({ preventScroll: true });
    });
  }

  // ---------- картинки: проверка, обрезка, сжатие ----------
  // Возвращает JPEG ровно w×h (обрезка по центру), до ~3 МБ. Принимает JPG, PNG, WebP.
  async function processImage(file, w, h) {
    if (!file) throw new Error('Файл не выбран.');
    if (!/^image\/(jpeg|png|webp)$/.test(file.type)) throw new Error('Нужен JPG, PNG или WebP. Фото с iPhone в формате HEIC сначала сохраните как JPG.');
    if (file.size > 20 * 1024 * 1024) throw new Error('Файл больше 20 МБ — выберите поменьше.');
    let src;
    try {
      src = await createImageBitmap(file);
    } catch {
      src = await new Promise((res, rej) => {
        const img = new Image();
        img.onload = () => res(img);
        img.onerror = () => rej(new Error('Не получилось открыть картинку — возможно, файл повреждён.'));
        img.src = URL.createObjectURL(file);
      });
    }
    const sw = src.width;
    const sh = src.height;
    if (sw < 300 || sh < 300) throw new Error('Картинка слишком маленькая: нужно хотя бы 300×300 точек.');
    const scale = Math.max(w / sw, h / sh);
    const cw = w / scale;
    const ch = h / scale;
    const canvas = document.createElement('canvas');
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext('2d');
    ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(src, (sw - cw) / 2, (sh - ch) / 2, cw, ch, 0, 0, w, h);
    for (const q of [0.84, 0.74, 0.62]) {
      const blob = await new Promise((res) => canvas.toBlob(res, 'image/jpeg', q));
      if (blob && blob.size <= 2.8 * 1024 * 1024) return blob;
    }
    throw new Error('Не получилось сжать картинку.');
  }

  window.Staff = {
    $, esc, icon, tr, t, money, unitLabel, toast, errText, modal, closeModal, ask, processImage, paintStatic,
    get lang() { return lang; }, locale, setLang, withLang,
    get settings() { return settings; },
    set settings(v) { settings = v; },
    get me() { return me; },
    start(o) { opts = o; paintStatic(); route(); },
  };
})();

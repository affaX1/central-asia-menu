(() => {
  'use strict';

  // =====================================================================
  //  Админка: сотрудники видят заказы со столов вживую и меняют статус.
  //  Названия и цены блюд берутся из data.js — тот же файл, что у гостей.
  // =====================================================================

  const M = window.MENU;
  const B = window.MENU_BACKEND || {};
  const byId = Object.fromEntries(M.dishes.map((d) => [d.id, d]));

  const $ = (s) => document.querySelector(s);
  const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
  const store = {
    get(k, d) { try { const v = localStorage.getItem('admin:' + k); return v == null ? d : JSON.parse(v); } catch { return d; } },
    set(k, v) { try { localStorage.setItem('admin:' + k, JSON.stringify(v)); } catch { /* приватный режим */ } },
  };
  const dishName = (id) => {
    const n = byId[id]?.name;
    return (typeof n === 'string' ? n : n?.ru || n?.en) || `«${id}» (нет в меню)`;
  };
  const money = (n) => {
    const v = Math.round(n * 100) / 100;
    const num = new Intl.NumberFormat('ru-RU', { minimumFractionDigits: Number.isInteger(v) ? 0 : 2, maximumFractionDigits: 2 }).format(v);
    const c = M.restaurant.currency;
    return M.restaurant.currencyBefore ? `${c} ${num}` : `${num} ${c}`;
  };
  const orderTotal = (o) => (o.items || []).reduce((s, i) => s + (byId[i.id]?.price || 0) * i.qty, 0);
  const startOfToday = () => { const d = new Date(); d.setHours(0, 0, 0, 0); return d; };
  const ago = (iso) => {
    const m = Math.max(0, Math.floor((Date.now() - new Date(iso).getTime()) / 60000));
    if (m < 1) return 'только что';
    if (m < 60) return `${m} мин назад`;
    return `${Math.floor(m / 60)} ч ${m % 60} мин назад`;
  };
  const clockOf = (iso) => new Date(iso).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' });

  const STATUS = {
    new: { label: 'Новый', next: 'accepted', action: 'Принять' },
    accepted: { label: 'Принят', next: 'cooking', action: 'Готовится' },
    cooking: { label: 'Готовится', next: 'served', action: 'Подан' },
    served: { label: 'Подан', next: 'paid', action: 'Оплачен' },
    paid: { label: 'Оплачен' },
    cancelled: { label: 'Отменён' },
  };
  const ACTIVE = ['new', 'accepted', 'cooking', 'served'];

  // ---------- Тема как у меню ----------
  try {
    const th = JSON.parse(localStorage.getItem('menu:theme') || 'null');
    document.documentElement.dataset.theme = th || (matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
  } catch { /* по умолчанию светлая */ }

  // ---------- Связь с Supabase ----------
  function supabaseApi() {
    if (!B.url || !B.key || !window.supabase?.createClient) return null;
    const sb = window.supabase.createClient(B.url, B.key, {
      auth: { persistSession: true, autoRefreshToken: true, storageKey: 'menu-admin-auth' },
    });
    return {
      async session() { const { data } = await sb.auth.getSession(); return data.session; },
      async signIn(email, password) {
        const { error } = await sb.auth.signInWithPassword({ email, password });
        if (error) throw error;
      },
      async signOut() { await sb.auth.signOut(); },
      async isStaff() {
        const { data: u } = await sb.auth.getUser();
        if (!u?.user) return false;
        const { data, error } = await sb.from('staff').select('user_id').eq('user_id', u.user.id).maybeSingle();
        if (error) throw error;
        return !!data;
      },
      async load(sinceIso) {
        const { data, error } = await sb.from('orders').select('*')
          .or(`created_at.gte.${sinceIso},status.in.(new,accepted,cooking,served)`)
          .order('created_at', { ascending: true })
          .limit(500);
        if (error) throw error;
        return data || [];
      },
      async setStatus(id, status) {
        const { error } = await sb.from('orders').update({ status }).eq('id', id);
        if (error) throw error;
      },
      subscribe(onRow, onState) {
        const ch = sb.channel('orders-live')
          .on('postgres_changes', { event: '*', schema: 'public', table: 'orders' }, (p) => { if (p.new?.id) onRow(p.new); })
          .subscribe((st) => onState(st === 'SUBSCRIBED'));
        return () => sb.removeChannel(ch);
      },
    };
  }

  const api = window.MENU_TEST_API || supabaseApi();

  // ---------- Звук нового заказа ----------
  let audio = null;
  let soundOn = store.get('sound', true);
  function unlockAudio() {
    try {
      if (!audio) audio = new (window.AudioContext || window.webkitAudioContext)();
      if (audio.state === 'suspended') audio.resume();
    } catch { /* без звука */ }
    renderBanner();
  }
  function ding() {
    if (!soundOn || !audio || audio.state !== 'running') return;
    const t0 = audio.currentTime;
    [0, 0.2, 0.4].forEach((dt, i) => {
      const o = audio.createOscillator();
      const g = audio.createGain();
      o.type = 'sine';
      o.frequency.value = i === 2 ? 1175 : 880;
      g.gain.setValueAtTime(0.0001, t0 + dt);
      g.gain.exponentialRampToValueAtTime(0.4, t0 + dt + 0.02);
      g.gain.exponentialRampToValueAtTime(0.0001, t0 + dt + 0.18);
      o.connect(g).connect(audio.destination);
      o.start(t0 + dt);
      o.stop(t0 + dt + 0.2);
    });
  }
  document.addEventListener('pointerdown', unlockAudio, { capture: true });
  document.addEventListener('keydown', unlockAudio, { capture: true });

  // ---------- Состояние ----------
  const orders = new Map();
  let view = 'active';     // active | closed
  let live = false;
  let screen = 'loading';  // setup | login | notstaff | board | loading
  let loginError = '';
  let busy = new Set();
  let unsubscribe = null;

  function upsert(row) {
    const isNew = !orders.has(row.id);
    orders.set(row.id, row);
    if (isNew && row.status === 'new') ding();
  }

  // ---------- Отрисовка ----------
  function renderBanner() {
    const el = $('#a-banner');
    const needTap = screen === 'board' && soundOn && (!audio || audio.state !== 'running');
    el.hidden = !needTap;
    if (needTap) el.innerHTML = '<button type="button" data-act="unlock">🔔 Нажмите сюда, чтобы включить звук новых заказов</button>';
  }

  function renderTop() {
    const signedIn = screen === 'board' || screen === 'notstaff';
    $('#a-actions').hidden = !signedIn;
    $('#sound-btn').hidden = screen !== 'board';
    $('#sound-btn').textContent = soundOn ? '🔔 Звук' : '🔕 Без звука';
    $('#a-sub').textContent = typeof M.restaurant.name === 'string' ? M.restaurant.name : M.restaurant.name.ru;
    const fresh = [...orders.values()].filter((o) => o.status === 'new').length;
    document.title = fresh ? `(${fresh}) Новый заказ — админка` : 'Заказы — админка';
  }

  function render() {
    renderTop();
    renderBanner();
    const main = $('#a-main');

    if (screen === 'loading') { main.innerHTML = '<p class="a-empty">Загрузка…</p>'; return; }

    if (screen === 'setup') {
      main.innerHTML = `
        <div class="a-card">
          <h2>Сервер заказов ещё не подключён</h2>
          <p>Меню работает, но гости пока не могут отправлять заказы. Чтобы включить:</p>
          <ol>
            <li>Создать бесплатный проект на supabase.com.</li>
            <li>Запустить файл <b>supabase/schema.sql</b> в SQL Editor.</li>
            <li>Вписать адрес и публичный ключ в <b>config.js</b>.</li>
          </ol>
          <p style="margin-top:10px">Подробно по шагам — в файле <b>SETUP.md</b>.</p>
        </div>`;
      return;
    }

    if (screen === 'login') {
      main.innerHTML = `
        <form class="a-card" id="login-form" autocomplete="on">
          <h2>Вход для сотрудников</h2>
          <p>Гости сюда не попадают — им нужен только QR-код на столе.</p>
          <label class="field"><span>Email</span><input name="email" type="email" autocomplete="username" required></label>
          <label class="field"><span>Пароль</span><input name="password" type="password" autocomplete="current-password" required></label>
          ${loginError ? `<p class="send-error" role="alert">${esc(loginError)}</p>` : ''}
          <button class="send-btn" type="submit">Войти</button>
        </form>`;
      return;
    }

    if (screen === 'notstaff') {
      main.innerHTML = `
        <div class="a-card">
          <h2>Нет доступа</h2>
          <p>Этот аккаунт не добавлен в сотрудники. Попросите владельца добавить его (команда есть в SETUP.md) и войдите снова.</p>
        </div>`;
      return;
    }

    // ---------- Доска заказов ----------
    const all = [...orders.values()];
    const today = startOfToday().getTime();
    const todays = all.filter((o) => new Date(o.created_at).getTime() >= today);
    const active = all.filter((o) => ACTIVE.includes(o.status))
      // сначала новые, внутри — кто раньше заказал, тот выше
      .sort((a, b) => ((b.status === 'new') - (a.status === 'new')) || (new Date(a.created_at) - new Date(b.created_at)));
    const closed = todays.filter((o) => !ACTIVE.includes(o.status))
      .sort((a, b) => new Date(b.updated_at || b.created_at) - new Date(a.updated_at || a.created_at));
    const paidToday = todays.filter((o) => o.status === 'paid');
    const count = (st) => all.filter((o) => o.status === st).length;

    const list = view === 'active' ? active : closed;
    main.innerHTML = `
      <div class="a-stats">
        <div class="a-stat${count('new') ? ' hot' : ''}"><b>${count('new')}</b><span>новых</span></div>
        <div class="a-stat"><b>${count('accepted') + count('cooking')}</b><span>в работе</span></div>
        <div class="a-stat"><b>${count('served')}</b><span>ждут оплаты</span></div>
        <div class="a-stat"><b>${money(paidToday.reduce((s, o) => s + orderTotal(o), 0))}</b><span>оплачено сегодня (${paidToday.length})</span></div>
      </div>
      <div class="a-tabs">
        <button type="button" class="chip${view === 'active' ? ' active' : ''}" data-view="active">Активные (${active.length})</button>
        <button type="button" class="chip${view === 'closed' ? ' active' : ''}" data-view="closed">Закрытые сегодня (${closed.length})</button>
        <span class="a-live${live ? '' : ' off'}">${live ? 'Заказы приходят сразу' : 'Нет живой связи — обновляю раз в 20 сек'}</span>
      </div>
      ${list.length ? `<div class="a-grid">${list.map(card).join('')}</div>`
        : `<p class="a-empty">${view === 'active' ? 'Активных заказов нет. Новые появятся тут сами, со звуком.' : 'Сегодня закрытых заказов пока нет.'}</p>`}`;
  }

  function card(o) {
    const st = STATUS[o.status] || { label: o.status };
    const isBusy = busy.has(o.id);
    return `
      <article class="a-order${o.status === 'new' ? ' is-new' : ''}">
        <div class="a-head">
          <span class="a-table">🪑 Стол ${esc(o.table_no)}</span>
          <span class="st st-${esc(o.status)}">${esc(st.label)}</span>
        </div>
        <div class="a-meta">№${esc(o.no)} · ${esc(clockOf(o.created_at))} · ${esc(ago(o.created_at))}${o.lang ? ` · язык гостя: ${esc(String(o.lang).toUpperCase())}` : ''}</div>
        <ul class="a-items">${(o.items || []).map((i) => `
          <li><span><b>${esc(i.qty)}×</b>${esc(dishName(i.id))}</span><span>${byId[i.id] ? money(byId[i.id].price * i.qty) : '—'}</span></li>`).join('')}
        </ul>
        ${o.note ? `<div class="a-note">💬 ${esc(o.note)}</div>` : ''}
        <div class="a-total"><span>Итого</span><strong>${money(orderTotal(o))}</strong></div>
        ${st.next ? `<div class="a-btns">
          <button type="button" class="send-btn" data-set="${esc(st.next)}" data-id="${esc(o.id)}"${isBusy ? ' disabled' : ''}>${esc(st.action)}</button>
          <button type="button" class="ghost" data-set="cancelled" data-id="${esc(o.id)}"${isBusy ? ' disabled' : ''}>Отменить</button>
        </div>` : ''}
      </article>`;
  }

  // ---------- Загрузка и живые обновления ----------
  let pollTimer = null;
  async function reload() {
    try {
      const rows = await api.load(new Date(startOfToday().getTime() - 60 * 1000).toISOString());
      const seen = new Set(rows.map((r) => r.id));
      for (const id of [...orders.keys()]) if (!seen.has(id)) orders.delete(id);
      rows.forEach(upsert);
      render();
    } catch { /* нет сети — следующая попытка через 20 сек */ }
  }

  async function startBoard() {
    screen = 'board';
    orders.clear();
    render();
    // первая загрузка — без звука на старые заказы
    try {
      const rows = await api.load(new Date(startOfToday().getTime() - 60 * 1000).toISOString());
      rows.forEach((r) => orders.set(r.id, r));
    } catch { /* покажем пусто, догрузим опросом */ }
    render();
    unsubscribe?.();
    unsubscribe = api.subscribe((row) => { upsert(row); render(); }, (ok) => { live = ok; render(); });
    clearInterval(pollTimer);
    pollTimer = setInterval(() => { if (!live) reload(); else render(); }, 20000);
  }

  // Пока есть непринятые заказы — напоминаем звуком каждые 30 секунд.
  setInterval(() => {
    if (screen === 'board' && [...orders.values()].some((o) => o.status === 'new')) ding();
  }, 30000);

  async function boot() {
    if (!api) { screen = 'setup'; render(); return; }
    try {
      const s = await api.session();
      if (!s) { screen = 'login'; render(); return; }
      if (!(await api.isStaff())) { screen = 'notstaff'; render(); return; }
      await startBoard();
    } catch {
      screen = 'login';
      loginError = 'Нет связи с сервером. Проверьте интернет.';
      render();
    }
  }

  // ---------- События ----------
  document.addEventListener('submit', async (e) => {
    if (e.target.id !== 'login-form') return;
    e.preventDefault();
    const f = new FormData(e.target);
    const btn = e.target.querySelector('button[type="submit"]');
    btn.disabled = true;
    btn.textContent = 'Входим…';
    try {
      await api.signIn(String(f.get('email')).trim(), String(f.get('password')));
      loginError = '';
      if (!(await api.isStaff())) { screen = 'notstaff'; render(); return; }
      await startBoard();
    } catch (err) {
      const m = String(err?.message || '');
      loginError = /invalid/i.test(m) ? 'Неверный email или пароль.' : 'Не получилось войти. Проверьте интернет и попробуйте ещё раз.';
      render();
    }
  });

  document.addEventListener('click', async (e) => {
    if (e.target.closest('[data-act="unlock"]')) { unlockAudio(); ding(); return; }

    const v = e.target.closest('[data-view]');
    if (v) { view = v.dataset.view; render(); return; }

    const b = e.target.closest('[data-set]');
    if (b) {
      const id = b.dataset.id;
      const next = b.dataset.set;
      const o = orders.get(id);
      if (!o || busy.has(id)) return;
      if (next === 'cancelled' && !confirm(`Отменить заказ №${o.no} (стол ${o.table_no})?`)) return;
      busy.add(id);
      render();
      try {
        await api.setStatus(id, next);
        orders.set(id, { ...o, status: next, updated_at: new Date().toISOString() });
      } catch {
        alert('Не получилось изменить статус. Проверьте интернет и попробуйте ещё раз.');
      } finally {
        busy.delete(id);
        render();
      }
    }
  });

  $('#sound-btn').addEventListener('click', () => {
    soundOn = !soundOn;
    store.set('sound', soundOn);
    if (soundOn) { unlockAudio(); ding(); }
    render();
  });

  $('#logout-btn').addEventListener('click', async () => {
    unsubscribe?.();
    unsubscribe = null;
    clearInterval(pollTimer);
    orders.clear();
    try { await api.signOut(); } catch { /* всё равно выходим */ }
    screen = 'login';
    render();
  });

  boot();
})();

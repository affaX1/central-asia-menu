// =====================================================================
//  ТОЛЬКО ДЛЯ ПРОВЕРКИ ИНТЕРФЕЙСА без настоящего Supabase.
//  Боевые страницы этот файл не подключают. Подключается вручную в тестах
//  после config.js и data.js. Хранит «базу» в localStorage этого браузера.
//  Настоящие права проверяются в supabase/tests/roles.sql.
//  Роль: localStorage 'fake:role' = owner | waiter | uninvited | unconfirmed | disabled | (пусто — не вошёл)
// =====================================================================
(() => {
  'use strict';
  const KEY = 'fake:db';
  const M = window.MENU;

  function seed() {
    const r = M.restaurant;
    return {
      settings: {
        id: 1, name: r.name, tagline: r.tagline, logo_url: null, currency: r.currency, currency_before: r.currencyBefore,
        timezone: r.timezone, schedule: r.schedule, address: {}, map_url: null, phone: '', footer: r.footer,
        default_language: M.defaultLanguage, tables_count: 10, orders_enabled: true, orders_when_closed: true, halal: false, halal_note: {},
        service_pct: 0, tax_pct: 0, tax_name: 'SST', tax_on_service: true,
      },
      tables: [1, 2, 3].map((n) => ({ id: 'tbl-' + n, label: String(n), token: ('a' + n).padEnd(20, '0'), active: true, sort: n })),
      orders: [],
      seq: 0,
      categories: M.categories.map((c, i) => ({ id: c.id, name: c.name, sort: (i + 1) * 10, hidden: false, avail_from: null, avail_to: null })),
      dishes: M.dishes.map((d, i) => ({
        id: d.id, category_id: d.category, name: d.name, desc: d.desc || {}, ingredients: d.ingredients || {},
        price: d.price, weight: d.weight ?? null, unit: d.unit || 'g', kcal: d.kcal ?? null, photo_url: null,
        tags: d.tags || [], allergens: d.allergens || [], meat: d.meat || [], sort: (i + 1) * 10, hidden: false, available: true, options: [], prep_min: null, pairs: [],
      })),
      staff: [
        { user_id: 'u-owner', email: 'owner@example.com', name: 'Владелец', role: 'owner', active: true, created_at: '2026-01-01' },
        { user_id: 'u-waiter', email: 'waiter@example.com', name: 'Азиз', role: 'waiter', active: true, created_at: '2026-01-02' },
        { user_id: 'u-cook', email: 'cook@example.com', name: 'Повар Бахтиёр', role: 'cook', active: true, created_at: '2026-01-03' },
      ],
      invites: [],
      calls: [],
      bills: [],
      audit: [],
      telegram: {},
    };
  }
  const db = () => { try { return JSON.parse(localStorage.getItem(KEY)) || seed(); } catch { return seed(); } };
  const save = (d) => localStorage.setItem(KEY, JSON.stringify(d));
  if (!localStorage.getItem(KEY)) save(seed());
  const role = () => localStorage.getItem('fake:role') || '';
  const delay = () => new Promise((r) => setTimeout(r, Number(localStorage.getItem('fake:delay') || 60)));
  const owner = () => { if (role() !== 'owner') throw new Error('forbidden'); };
  const floor = () => { if (!['owner', 'waiter'].includes(role())) throw new Error('forbidden'); };
  const kitchen = () => { if (!['owner', 'cook'].includes(role())) throw new Error('forbidden'); };
  const staffOk = () => { if (!['owner', 'waiter', 'cook'].includes(role())) throw new Error('permission denied'); };
  const offline = () => { if (localStorage.getItem('fake:offline') === '1') throw new TypeError('Failed to fetch'); };
  const myName = () => ({ owner: 'Владелец', waiter: 'Азиз', cook: 'Повар Бахтиёр' })[role()] || '';
  const r2 = (x) => Math.round(x * 100) / 100;
  // как order_charges в базе
  const chargesOf = (st, sub) => {
    const service = r2(sub * (Number(st.service_pct) || 0) / 100);
    const tax = r2((sub + (st.tax_on_service !== false ? service : 0)) * (Number(st.tax_pct) || 0) / 100);
    return { service, tax, total: r2(sub + service + tax) };
  };
  // как order_line в базе: блюдо, варианты, цена за штуку
  function lineOf(d, it, checkPrice) {
    const shownCats = new Set(d.categories.filter((c) => !c.hidden).map((c) => c.id));
    const dish = d.dishes.find((x) => x.id === it.id && !x.hidden && shownCats.has(x.category_id));
    if (!(it.qty >= 1 && it.qty <= 50)) throw new Error('bad_items');
    if (!dish || !dish.available) throw new Error('unavailable:' + it.id);
    const cat = d.categories.find((c) => c.id === dish.category_id);
    if (cat?.avail_from && cat?.avail_to) {
      const m = window.MenuSchedule.localNow(d.settings.timezone, new Date()).min;
      const f = window.MenuSchedule.mins(cat.avail_from); const t2 = window.MenuSchedule.mins(cat.avail_to);
      if (!(t2 > f ? m >= f && m < t2 : m >= f || m < t2)) throw new Error('not_now:' + it.id);
    }
    const sel = [...(it.opts || [])].sort();
    let unit = Number(dish.price);
    const snap = [];
    for (const g of dish.options || []) {
      let n = 0;
      for (const c of g.choices || []) {
        if (sel.includes(`${g.id}:${c.id}`)) { n += 1; unit += Number(c.price) || 0; snap.push({ g: g.id, c: c.id, group: g.name, name: c.name, price: Number(c.price) || 0 }); }
      }
      if ((g.required && !n) || (!g.multi && n > 1)) throw new Error('options:' + it.id);
    }
    if (snap.length !== sel.length) throw new Error('options:' + it.id);
    unit = Math.max(0, r2(unit));
    if (checkPrice && unit !== Number(it.price)) throw new Error('price_changed:' + it.id);
    return { line: { id: dish.id, qty: it.qty, price: unit, name: dish.name, opts: snap }, key: `${dish.id}|${sel.join(',')}` };
  }
  const newToken = () => Array.from(crypto.getRandomValues(new Uint8Array(10)), (b) => b.toString(16).padStart(2, '0')).join('');
  const uid = () => ({ owner: 'u-owner', waiter: 'u-waiter', cook: 'u-cook' })[role()] || 'u-waiter';

  window.MENU_BACKEND = { url: 'https://fake.supabase.co', key: 'sb_publishable_FAKE' };

  window.STAFF_TEST_API = {
    async session() { await delay(); return role() ? { user: { id: uid() } } : null; },
    async signIn(email) { await delay(); if (email.includes('wrong')) throw new Error('Invalid login credentials'); localStorage.setItem('fake:role', email.startsWith('owner') ? 'owner' : email.startsWith('cook') ? 'cook' : 'waiter'); },
    async signUp() { await delay(); return { needsEmailConfirm: true }; },
    async resetPassword() { await delay(); },
    async signOut() { localStorage.removeItem('fake:role'); },
    async whoami() {
      await delay();
      const r = role();
      if (!r) return null;
      const base = { user_id: uid(), email: `${r === 'owner' || r === 'cook' ? r : 'waiter'}@example.com`, name: myName() || 'Азиз' };
      if (r === 'unconfirmed') return { ...base, role: 'waiter', active: true, email_confirmed: false };
      if (r === 'uninvited') return { ...base, role: null, active: false, email_confirmed: true };
      if (r === 'disabled') return { ...base, role: 'waiter', active: false, email_confirmed: true };
      return { ...base, role: r, active: true, email_confirmed: true };
    },
    async settings() { await delay(); return db().settings; },
    async saveSettings(p) { await delay(); owner(); const d = db(); d.settings = { ...d.settings, ...p }; save(d); return d.settings; },
    async categories() { await delay(); return db().categories.sort((a, b) => a.sort - b.sort); },
    async saveCategory(row) { await delay(); owner(); const d = db(); const i = d.categories.findIndex((c) => c.id === row.id); const v = { ...(d.categories[i] || {}), ...row }; if (i >= 0) d.categories[i] = v; else d.categories.push(v); save(d); return v; },
    async deleteCategory(id) { await delay(); owner(); const d = db(); if (d.dishes.some((x) => x.category_id === id)) throw new Error('violates foreign key'); d.categories = d.categories.filter((c) => c.id !== id); save(d); },
    async dishes() { await delay(); return db().dishes.sort((a, b) => a.sort - b.sort); },
    async saveDish(row) { await delay(); owner(); const d = db(); const i = d.dishes.findIndex((x) => x.id === row.id); const v = { ...(d.dishes[i] || {}), ...row }; if (i >= 0) d.dishes[i] = v; else d.dishes.push(v); save(d); return v; },
    async patchDish(id, p) {
      await delay(); owner(); const d = db(); const i = d.dishes.findIndex((x) => x.id === id);
      const ch = Object.fromEntries(Object.entries(p).filter(([k, v]) => JSON.stringify(d.dishes[i][k]) !== JSON.stringify(v)).map(([k, v]) => [k, [d.dishes[i][k], v]]));
      d.dishes[i] = { ...d.dishes[i], ...p };
      (d.audit = d.audit || []).push({ id: Date.now(), at: new Date().toISOString(), who: myName(), entity: 'dish', entity_id: id, label: d.dishes[i].name.ru, action: 'update', changes: ch });
      save(d); return d.dishes[i];
    },
    async deleteDish(id) { await delay(); owner(); const d = db(); d.dishes = d.dishes.filter((x) => x.id !== id); save(d); },
    async uploadImage(blob) { await delay(); owner(); return new Promise((res) => { const fr = new FileReader(); fr.onload = () => res(fr.result); fr.readAsDataURL(blob); }); },
    async deleteImage() {},
    async orders(from, to) {
      await delay();
      staffOk(); offline();
      const f = new Date(from).getTime();
      const t = to ? new Date(to).getTime() : Infinity;
      return db().orders.filter((o) => {
        const c = new Date(o.created_at).getTime();
        return to ? c >= f && c < t : c >= f || ['new', 'accepted', 'cooking'].includes(o.status);
      });
    },
    async acceptOrder(id) {
      await delay();
      if (!['owner', 'waiter'].includes(role())) throw new Error('forbidden');
      if (localStorage.getItem('fake:offline') === '1') throw new TypeError('Failed to fetch');
      const d = db(); const o = d.orders.find((x) => x.id === id);
      if (!o) throw new Error('not_found');
      let changed = false;
      if (o.status === 'new') {
        Object.assign(o, { status: 'accepted', accepted_at: new Date().toISOString(), accepted_by: uid(), accepted_by_name: myName(), updated_at: new Date().toISOString() });
        changed = true; save(d);
      }
      return { id: o.id, no: o.no, status: o.status, accepted_at: o.accepted_at, accepted_by_name: o.accepted_by_name, changed };
    },
    async setOrderStatus(id, status) {
      await delay(); owner();
      if (localStorage.getItem('fake:offline') === '1') throw new TypeError('Failed to fetch');
      const d = db(); const o = d.orders.find((x) => x.id === id);
      if (!['new', 'accepted', 'cooking', 'ready', 'served', 'cancelled'].includes(status)) throw new Error('violates check constraint');
      const was = o.status;
      o.status = status; o.updated_at = new Date().toISOString();
      if (status === 'cancelled') o.cancelled_at = o.updated_at;
      (d.audit = d.audit || []).push({ id: Date.now(), at: o.updated_at, who: myName(), entity: 'order', entity_id: o.id, label: `№${o.no} · стол ${o.table_label}`, action: 'update', changes: { status: [was, status] } });
      save(d); return o;
    },
    async tables() { await delay(); owner(); return db().tables; },
    async floorTables() {
      await delay(); staffOk(); offline();
      const d = db();
      return d.tables.map(({ id, label, active, sort }) => {
        const w = (d.tableWaiters || {})[id];
        const s = w && d.staff.find((x) => x.user_id === w);
        return { id, label, active, sort, waiter_id: w || null, waiter_name: s ? s.name || s.email : null };
      }).sort((a, b) => a.sort - b.sort);
    },
    async claimTable(tableId, on) {
      await delay(); floor(); const d = db(); d.tableWaiters = d.tableWaiters || {};
      if (on) d.tableWaiters[tableId] = uid(); else if (d.tableWaiters[tableId] === uid() || role() === 'owner') delete d.tableWaiters[tableId];
      save(d);
    },
    async staffPlaceOrder(tableId, items, note, key) {
      await delay(); floor(); offline();
      const d = db();
      const old = d.orders.find((o) => o.client_key === key);
      if (old) return old;
      const tb = d.tables.find((x) => x.id === tableId && x.active);
      if (!tb) throw new Error('bad_table');
      if (!items.length) throw new Error('empty');
      const out = []; const keys = new Set(); let sub = 0;
      for (const it of items) { const r = lineOf(d, it, false); if (keys.has(r.key)) throw new Error('bad_items'); keys.add(r.key); out.push(r.line); sub += r.line.price * r.line.qty; }
      sub = r2(sub);
      d.seq = Math.max(1000, d.seq || 0) + 1;
      const now = new Date().toISOString();
      const o = { id: crypto.randomUUID(), no: d.seq, table_id: tb.id, table_label: tb.label, items: out, subtotal: sub, ...chargesOf(d.settings, sub), note, status: 'accepted', accepted_at: now, accepted_by: uid(), accepted_by_name: myName(), source: 'staff', created_by_name: myName(), client_key: key, guest_token: crypto.randomUUID(), created_at: now, updated_at: now };
      d.orders.push(o); save(d); return o;
    },
    async serveOrder(id) {
      await delay(); floor(); offline();
      const d = db(); const o = d.orders.find((x) => x.id === id);
      if (!o) throw new Error('not_found');
      if (['accepted', 'cooking', 'ready'].includes(o.status)) { o.status = 'served'; o.served_at = new Date().toISOString(); o.updated_at = o.served_at; save(d); }
      return o;
    },
    async myTelegram() { await delay(); staffOk(); const d = db(); return { linked: !!(d.staffTg || {})[uid()], bot_username: d.telegram?.token ? 'central_asia_test_bot' : null, bot_ready: !!d.telegram?.token }; },
    async myTelegramStart() { await delay(); staffOk(); const d = db(); if (!d.telegram?.token) throw new Error('no_bot'); d.tgCode = { user: uid(), code: 'ca' + Math.random().toString(16).slice(2, 12), n: 0 }; save(d); return { code: d.tgCode.code, bot_username: 'central_asia_test_bot' }; },
    async myTelegramCheck() { await delay(); staffOk(); const d = db(); if (!d.tgCode) return 'no_code'; d.tgCode.n += 1; if (d.tgCode.n < 2) { save(d); return 'pending'; } d.staffTg = { ...(d.staffTg || {}), [uid()]: '555' }; d.tgCode = null; save(d); return 'linked'; },
    async myTelegramOff() { await delay(); staffOk(); const d = db(); if (d.staffTg) delete d.staffTg[uid()]; save(d); },
    async calls(from) { await delay(); floor(); offline(); const f = new Date(from).getTime(); return (db().calls || []).filter((c) => !c.done_at || new Date(c.created_at).getTime() >= f); },
    async doneCall(id) { await delay(); floor(); const d = db(); const c = (d.calls || []).find((x) => x.id === id); if (c && !c.done_at) Object.assign(c, { done_at: new Date().toISOString(), done_by_name: myName() }); save(d); },
    async bills(from, to) { await delay(); floor(); const f = new Date(from).getTime(); const t = to ? new Date(to).getTime() : Infinity; return (db().bills || []).filter((b) => { const x = new Date(b.paid_at).getTime(); return x >= f && x < t; }).sort((a, b) => new Date(b.paid_at) - new Date(a.paid_at)); },
    async closeBill(tableId, method, ids, tip = 0, payments = null) {
      await delay(); floor(); offline();
      if (!['cash', 'card', 'qr', 'other', 'mixed'].includes(method)) throw new Error('bad_method');
      if (tip < 0) throw new Error('bad_tip');
      const d = db();
      const list = d.orders.filter((o) => o.table_id === tableId && !o.paid_at && o.status !== 'cancelled' && (!ids || ids.includes(o.id)));
      if (list.some((o) => o.status === 'new')) throw new Error('has_new');
      if (!list.length) throw new Error('nothing_to_pay');
      const sum = (k) => r2(list.reduce((s, o) => s + Number(o[k] ?? (k === 'subtotal' ? o.total : 0)), 0));
      d.billSeq = (d.billSeq || 0) + 1;
      const tb = d.tables.find((t) => t.id === tableId);
      const total = sum('total');
      let pays = payments;
      if (!pays) { if (method === 'mixed') throw new Error('bad_payments'); pays = [{ method, amount: r2(total + tip) }]; }
      if (pays.length < 1 || pays.length > 4 || pays.some((p) => !['cash', 'card', 'qr', 'other'].includes(p.method) || !(p.amount > 0))) throw new Error('bad_payments');
      if (Math.abs(r2(pays.reduce((x, p) => x + p.amount, 0)) - r2(total + tip)) > 0.01) throw new Error('bad_payments');
      const methods = [...new Set(pays.map((p) => p.method))];
      const bill = { id: crypto.randomUUID(), no: d.billSeq, table_id: tableId, table_label: tb?.label || list[0].table_label, order_ids: list.map((o) => o.id), order_nos: list.map((o) => o.no),
        subtotal: sum('subtotal'), service: sum('service'), tax: sum('tax'), total, tip: r2(tip), payments: pays, method: methods.length === 1 ? methods[0] : 'mixed', paid_at: new Date().toISOString(), paid_by: uid(), paid_by_name: myName() };
      list.forEach((o) => { o.paid_at = bill.paid_at; o.bill_id = bill.id; });
      (d.calls || []).forEach((c) => { if (c.table_id === tableId && !c.done_at && c.kind === 'bill') Object.assign(c, { done_at: bill.paid_at, done_by_name: myName() }); });
      d.bills = (d.bills || []).concat(bill);
      (d.audit = d.audit || []).push({ id: Date.now(), at: bill.paid_at, who: myName(), entity: 'bill', entity_id: bill.id, label: `счёт №${bill.no} · стол ${bill.table_label}`, action: 'insert', changes: { total: bill.total, method } });
      save(d); return bill;
    },
    async editOrder(id, items) {
      await delay(); owner(); offline();
      const d = db(); const o = d.orders.find((x) => x.id === id);
      if (!o) throw new Error('not_found');
      if (o.status === 'cancelled') throw new Error('cancelled');
      if (o.paid_at) throw new Error('paid');
      if (!items.length) throw new Error('empty');
      const keyOf = (i) => `${i.id}|${(i.opts || []).map((x) => (typeof x === 'string' ? x : `${x.g}:${x.c}`)).sort().join(',')}`;
      const out = [];
      for (const it of items) {
        const old = o.items.find((x) => keyOf(x) === keyOf(it));
        out.push(old ? { ...old, qty: it.qty } : lineOf(d, it, false).line);
      }
      const sub = r2(out.reduce((s, i) => s + i.price * i.qty, 0));
      Object.assign(o, { items: out, subtotal: sub, ...chargesOf(d.settings, sub), edited_at: new Date().toISOString(), edited_by_name: myName(), updated_at: new Date().toISOString() });
      (d.audit = d.audit || []).push({ id: Date.now(), at: o.edited_at, who: myName(), entity: 'order', entity_id: o.id, label: `№${o.no} · стол ${o.table_label}`, action: 'update', changes: { total: [null, o.total] } });
      save(d); return o;
    },
    async kitchenSet(id, status) {
      await delay(); kitchen(); offline();
      if (!['cooking', 'ready'].includes(status)) throw new Error('bad_status');
      const d = db(); const o = d.orders.find((x) => x.id === id);
      if (!o) throw new Error('not_found');
      if (o.status === 'accepted' || (o.status === 'cooking' && status === 'ready')) {
        o.status = status; o[status === 'cooking' ? 'cooking_at' : 'ready_at'] = new Date().toISOString(); o.updated_at = new Date().toISOString(); save(d);
      }
      return o;
    },
    async audit(from, to) { await delay(); owner(); const f = new Date(from).getTime(); const t = new Date(to).getTime(); return (db().audit || []).filter((a) => { const x = new Date(a.at).getTime(); return x >= f && x < t; }).sort((a, b) => new Date(b.at) - new Date(a.at)); },
    async reviews(from, to) { await delay(); owner(); const f = new Date(from).getTime(); const t2 = new Date(to).getTime(); return (db().reviews || []).filter((r) => { const x = new Date(r.created_at).getTime(); return x >= f && x < t2; }).sort((a, c) => new Date(c.created_at) - new Date(a.created_at)); },
    async setTelegramReviews(on) { await delay(); owner(); const d = db(); d.telegram = { ...(d.telegram || {}), reviews: on }; save(d); },
    async telegramStatus() { await delay(); owner(); const t = db().telegram || {}; return { connected: !!(t.token && t.chats?.length), bot_hint: t.token ? '…' + t.token.slice(-4) : null, chats: (t.chats || []).length, notify_orders: t.orders !== false, notify_calls: t.calls !== false, notify_bills: !!t.bills, net_ok: true, notify_reviews: t.reviews !== false }; },
    async setTelegram(token, chats, orders, calls, bills) {
      await delay(); owner();
      if (token != null && !/^[0-9]{5,15}:[A-Za-z0-9_-]{30,60}$/.test(token.trim())) throw new Error('bad_token');
      if (!Array.isArray(chats) || chats.length > 5 || chats.some((c) => !/^-?[0-9]{3,20}$/.test(c))) throw new Error('bad_chat');
      const d = db(); d.telegram = { ...(d.telegram || {}), token: token != null ? token.trim() : d.telegram?.token, chats, orders, calls, bills }; save(d);
    },
    async clearTelegram() { await delay(); owner(); const d = db(); d.telegram = {}; save(d); },
    async telegramTest() { await delay(); owner(); const t = db().telegram || {}; return t.token ? (t.chats || []).length : 0; },
    async saveTable(row) {
      await delay(); owner(); const d = db();
      if (d.tables.some((t) => t.label.toLowerCase() === row.label.toLowerCase() && t.id !== row.id)) throw new Error('duplicate key value violates unique constraint');
      const i = d.tables.findIndex((t) => t.id === row.id);
      const v = { ...(d.tables[i] || { id: 'tbl-' + Math.random().toString(36).slice(2, 8), token: newToken(), active: true, sort: 0 }), ...row };
      if (i >= 0) d.tables[i] = v; else d.tables.push(v); save(d); return v;
    },
    async deleteTable(id) { await delay(); owner(); const d = db(); d.tables = d.tables.filter((t) => t.id !== id); save(d); },
    async createTables(from, to) {
      await delay(); owner(); const d = db(); let n = 0;
      for (let i = from; i <= to; i++) if (!d.tables.some((t) => t.label === String(i))) { d.tables.push({ id: 'tbl-' + i + '-' + Math.random().toString(36).slice(2, 5), label: String(i), token: newToken(), active: true, sort: i }); n++; }
      save(d); return n;
    },
    async resetTableToken(id) { await delay(); owner(); const d = db(); const t = d.tables.find((x) => x.id === id); t.token = newToken(); save(d); return t.token; },
    async staff() { await delay(); owner(); return db().staff; },
    async invites() { await delay(); owner(); return db().invites; },
    async invite(email, r, name) { await delay(); owner(); const d = db(); d.invites = d.invites.filter((i) => i.email !== email).concat({ email, role: r, name, created_at: new Date().toISOString() }); save(d); return 'invited'; },
    async revokeInvite(email) { await delay(); owner(); const d = db(); d.invites = d.invites.filter((i) => i.email !== email); save(d); },
    async setStaff(id, r, name, active) { await delay(); owner(); if (id === 'u-owner') throw new Error('self'); const d = db(); d.staff = d.staff.map((s) => (s.user_id === id ? { ...s, role: r, name, active } : s)); save(d); },
    async removeStaff(id) { await delay(); owner(); if (id === 'u-owner') throw new Error('self'); const d = db(); d.staff = d.staff.filter((s) => s.user_id !== id); save(d); },
    subscribe(tables, onChange, onState) {
      setTimeout(() => onState?.(true), 30);
      const h = (e) => { if (e.key === KEY) tables.forEach((t) => onChange(t)); };
      addEventListener('storage', h);
      return () => removeEventListener('storage', h);
    },
  };

  // Гостевая страница читает меню обычными REST-запросами — отвечаем как Supabase для гостя (anon):
  // скрытое не отдаём, как правило в базе.
  const realFetch = window.fetch.bind(window);
  window.fetch = async (url, opts) => {
    const u = String(url);
    if (!u.startsWith('https://fake.supabase.co/rest/v1/')) return realFetch(url, opts);
    await delay();
    if (localStorage.getItem('fake:offline') === '1') throw new TypeError('Failed to fetch');
    const d = db();
    const reply = (status, data) => new Response(JSON.stringify(data), { status, headers: { 'Content-Type': 'application/json' } });
    const fail = (message) => reply(400, { message });
    if (u.includes('/rest/v1/rpc/')) {
      const name = u.split('/rpc/')[1];
      const b = JSON.parse(opts.body || '{}');
      window.__rpc = (window.__rpc || []).concat({ name, body: b });
      if (localStorage.getItem('fake:server-error') === '1' && name === 'place_order') return reply(500, { message: 'internal error' });
      if (name === 'table_info') { const t = d.tables.find((x) => x.token === b.p_token && x.active); return reply(200, t ? [{ label: t.label }] : []); }
      if (name === 'get_order') {
        const o = d.orders.find((x) => x.id === b.p_id && x.guest_token === b.p_token);
        return reply(200, o ? [{ id: o.id, no: o.no, status: o.status, total: o.total, table_label: o.table_label, items: o.items, note: o.note, created_at: o.created_at, updated_at: o.updated_at, accepted_at: o.accepted_at || null,
          subtotal: o.subtotal ?? o.total, service: o.service || 0, tax: o.tax || 0, paid_at: o.paid_at || null, edited_at: o.edited_at || null }] : []);
      }
      if (name === 'call_staff') {
        const tb = d.tables.find((x) => x.token === b.p_table && x.active);
        if (!tb) return fail('bad_table');
        if (!['waiter', 'bill'].includes(b.p_kind)) return fail('bad_request');
        if (b.p_reason && (b.p_kind !== 'waiter' || !['water', 'napkins', 'cutlery', 'ice', 'clear'].includes(b.p_reason))) return fail('bad_request');
        d.calls = d.calls || [];
        const open = d.calls.find((c) => c.table_id === tb.id && c.kind === b.p_kind && !c.done_at && (c.reason || '') === (b.p_reason || ''));
        if (open) { if (b.p_method) open.pay_method = b.p_method; save(d); return reply(200, [{ id: open.id, kind: open.kind, created_at: open.created_at }]); }
        if (d.calls.filter((c) => c.table_id === tb.id && Date.now() - new Date(c.created_at) < 600000).length >= 10) return fail('too_many');
        const c = { id: crypto.randomUUID(), table_id: tb.id, table_label: tb.label, kind: b.p_kind, pay_method: b.p_kind === 'bill' ? b.p_method || null : null, reason: b.p_kind === 'waiter' ? b.p_reason || null : null, created_at: new Date().toISOString(), done_at: null };
        d.calls.push(c); save(d);
        return reply(200, [{ id: c.id, kind: c.kind, created_at: c.created_at }]);
      }
      if (name === 'table_calls') {
        const tb = d.tables.find((x) => x.token === b.p_table && x.active);
        return reply(200, tb ? (d.calls || []).filter((c) => c.table_id === tb.id && !c.done_at).map((c) => ({ kind: c.kind, created_at: c.created_at, reason: c.reason || null })) : []);
      }
      if (name === 'table_bill') {
        const tb = d.tables.find((x) => x.token === b.p_table && x.active);
        return reply(200, tb ? d.orders.filter((o) => o.table_id === tb.id && !o.paid_at && o.status !== 'cancelled' && Date.now() - new Date(o.created_at) < 12 * 3600000)
          .sort((a, c) => a.no - c.no).map((o) => ({ no: o.no, status: o.status, items: o.items, subtotal: o.subtotal ?? o.total, service: o.service || 0, tax: o.tax || 0, total: o.total, created_at: o.created_at })) : []);
      }
      if (name === 'menu_stats') {
        const valid = d.orders.filter((o) => o.status !== 'cancelled');
        const cnt = {}; const pr = {};
        for (const o of valid) {
          const ids = [...new Set(o.items.map((i) => i.id))];
          for (const i of o.items) cnt[i.id] = (cnt[i.id] || 0) + i.qty;
          for (const a of ids) for (const c of ids) if (a !== c) { pr[a] = pr[a] || {}; pr[a][c] = (pr[a][c] || 0) + 1; }
        }
        const pairs = Object.fromEntries(Object.entries(pr).map(([a, m]) => [a, Object.entries(m).filter(([, n]) => n >= 2).sort((x, y) => y[1] - x[1]).slice(0, 3).map(([c]) => c)]).filter(([, l]) => l.length));
        return reply(200, { popular: Object.entries(cnt).sort((a, c) => c[1] - a[1]).slice(0, 12).map(([id]) => id), pairs });
      }
      if (name === 'leave_review') {
        const o = d.orders.find((x) => x.id === b.p_order && x.guest_token === b.p_token);
        if (!o) return fail('not_found');
        if (['new', 'cancelled'].includes(o.status)) return fail('too_early');
        if (!(b.p_rating >= 1 && b.p_rating <= 5)) return fail('bad_rating');
        d.reviews = (d.reviews || []).filter((r) => r.order_id !== o.id).concat({ id: crypto.randomUUID(), order_id: o.id, order_no: o.no, table_id: o.table_id, table_label: o.table_label, rating: b.p_rating, comment: b.p_comment, lang: b.p_lang, created_at: new Date().toISOString() });
        save(d); return reply(200, null);
      }
      if (name === 'place_order') {
        if (!b.p_client_key) return fail('bad_request');
        const old = d.orders.find((x) => x.client_key === b.p_client_key);
        const out = (o) => [{ id: o.id, no: o.no, guest_token: o.guest_token, total: o.total, status: o.status, table_label: o.table_label, items: o.items, note: o.note, created_at: o.created_at, subtotal: o.subtotal, service: o.service, tax: o.tax }];
        if (old) return reply(200, out(old));
        const tb = d.tables.find((x) => x.token === b.p_table && x.active);
        if (!tb) return fail('bad_table');
        if (!d.settings.orders_enabled) return fail('orders_off');
        if (!d.settings.orders_when_closed && !window.MenuSchedule.status(d.settings.schedule, d.settings.timezone).open) return fail('closed');
        if (!Array.isArray(b.p_items) || !b.p_items.length) return fail('empty');
        let sub = 0;
        const items = [];
        const keys = new Set();
        for (const it of b.p_items) {
          let r;
          try { r = lineOf(d, it, true); } catch (ex) { return fail(ex.message); }
          if (keys.has(r.key)) return fail('bad_items');
          keys.add(r.key);
          sub += r.line.price * r.line.qty;
          items.push(r.line);
        }
        sub = r2(sub);
        const ch = chargesOf(d.settings, sub);
        if (d.orders.filter((o) => o.table_id === tb.id && Date.now() - new Date(o.created_at) < 300000).length >= 5) return fail('too_many');
        d.seq = Math.max(1000, d.seq || 0) + 1; // как в базе: номера с 1001, не повторяются
        const now = new Date().toISOString();
        const o = { id: crypto.randomUUID(), no: d.seq, table_id: tb.id, table_label: tb.label, items, subtotal: sub, service: ch.service, tax: ch.tax, total: ch.total, note: b.p_note, lang: b.p_lang, status: 'new', client_key: b.p_client_key, guest_token: crypto.randomUUID(), created_at: now, updated_at: now };
        d.orders.push(o); save(d);
        if (localStorage.getItem('fake:drop-reply') === '1') { localStorage.removeItem('fake:drop-reply'); throw new TypeError('Failed to fetch'); } // заказ сохранён, но ответ «потерялся»
        return reply(200, out(o));
      }
      return fail('unknown function');
    }
    const table = u.split('/rest/v1/')[1].split('?')[0];
    const shownCats = new Set(d.categories.filter((c) => !c.hidden).map((c) => c.id));
    const data = table === 'settings' ? [d.settings]
      : table === 'categories' ? d.categories.filter((c) => !c.hidden)
        : table === 'dishes' ? d.dishes.filter((x) => !x.hidden && shownCats.has(x.category_id)) : null;
    return new Response(JSON.stringify(data ?? { message: 'not found' }), { status: data ? 200 : 404, headers: { 'Content-Type': 'application/json' } });
  };
})();

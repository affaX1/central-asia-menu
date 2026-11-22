// =====================================================================
//  ТОЛЬКО ДЛЯ ПРОВЕРКИ ИНТЕРФЕЙСА без настоящего Supabase.
//  Боевые страницы этот файл не подключают. Подключается вручную в тестах
//  после config.js и data.js. Хранит «базу» в localStorage этого браузера.
//  Настоящие права проверяются в supabase/tests/roles.sql.
//  Роль: localStorage 'fake:role' = owner | waiter | cook | manager | courier | uninvited | unconfirmed | disabled | (пусто — не вошёл)
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
        // доставка (как в базе): выключена, пока ресторан не поставит точку и зоны
        delivery_enabled: false, delivery_lat: null, delivery_lng: null, delivery_zones: [], delivery_min: 0,
        // звонок гостю и проверка номера по SMS (как в базе)
        dv_sms: false, dv_trust_after: 3, dv_confirm_over: 150,
        bookings_enabled: false,   // бронь владелец убрал (функции брони гостю закрыты)
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
        { user_id: 'u-manager', email: 'manager@example.com', name: 'Дилшод', role: 'manager', active: true, created_at: '2026-01-04' },
        { user_id: 'u-courier', email: 'courier@example.com', name: 'Курьер Тимур', role: 'courier', active: true, created_at: '2026-01-05' },
      ],
      invites: [],
      calls: [],
      bills: [],
      audit: [],
      telegram: {},
      promos: demoPromos(),
    };
  }
  // ролик для проверки главной (только в этой подделке — никогда в seed.sql и data.js)
  const FAKE_VIDEO = 'https://flutter.github.io/assets-for-api-docs/assets/videos/butterfly.mp4';
  function demoPromos() {
    return [{ id: 'promo-demo', video_url: FAKE_VIDEO, poster_url: null, title: { ru: 'Пробный ролик', en: 'Test clip' }, active: true, sort: 0, duration_s: 7.5, created_at: '2026-11-22T00:00:00Z' }];
  }
  // как promos в базе: https-ссылка до 500 символов, 1–30 секунд
  const httpsOk = (u) => /^https:\/\//.test(u) && u.length <= 500;
  const promoSort = (a, b) => (a.sort - b.sort) || String(b.created_at).localeCompare(String(a.created_at));
  const db = () => { try { return JSON.parse(localStorage.getItem(KEY)) || seed(); } catch { return seed(); } };
  const save = (d) => localStorage.setItem(KEY, JSON.stringify(d));
  if (!localStorage.getItem(KEY)) save(seed());
  const role = () => localStorage.getItem('fake:role') || '';
  const delay = () => new Promise((r) => setTimeout(r, Number(localStorage.getItem('fake:delay') || 60)));
  const owner = () => { if (role() !== 'owner') throw new Error('forbidden'); };
  const floor = () => { if (!['owner', 'waiter', 'manager'].includes(role())) throw new Error('forbidden'); };
  const mgr = () => { if (!['owner', 'manager'].includes(role())) throw new Error('forbidden'); };
  const kitchen = () => { if (!['owner', 'cook'].includes(role())) throw new Error('forbidden'); };
  const staffOk = () => { if (!['owner', 'waiter', 'cook', 'manager', 'courier'].includes(role())) throw new Error('permission denied'); };
  // как is_courier() в базе: курьер, владелец, менеджер
  const courierOk = () => { if (!['courier', 'owner', 'manager'].includes(role())) throw new Error('forbidden'); };
  const offline = () => { if (localStorage.getItem('fake:offline') === '1') throw new TypeError('Failed to fetch'); };
  const myName = () => ({ owner: 'Владелец', waiter: 'Азиз', cook: 'Повар Бахтиёр', manager: 'Дилшод', courier: 'Курьер Тимур' })[role()] || '';
  const r2 = (x) => Math.round(x * 100) / 100;
  // как public.phone_e164: +60… (Малайзия по умолчанию), иначе null
  const e164 = (p) => {
    const d = String(p || '').replace(/\D/g, '');
    const e = (/^\s*\+/.test(String(p || '')) ? `+${d}` : d.startsWith('00') ? `+${d.slice(2)}` : d.startsWith('60') ? `+${d}` : d.startsWith('0') ? `+60${d.slice(1)}` : '')
      .replace(/^\+600/, '+60');   // лишний 0 после +60
    return /^\+[1-9]\d{7,14}$/.test(e) ? e : null;
  };
  // как private.dv_expire: доставка ждёт звонка дольше 30 минут (с последнего изменения) — «не дозвонились»
  const dvExpire = (d) => {
    let n = 0;
    for (const o of d.orders) {
      if (o.status === 'confirm' && Date.now() - new Date(o.updated_at || o.created_at).getTime() > 30 * 60000) {
        Object.assign(o, { status: 'cancelled', cancel_reason: 'no_answer', cancelled_at: new Date().toISOString(), updated_at: new Date().toISOString() }); n += 1;
      }
    }
    return n;
  };
  // доставка «ждёт звонка» порции не держит (как orders_stock в базе)
  const heldItems = (o, status = o.status) => (['cancelled', 'confirm'].includes(status) ? [] : o.items);
  // SMS (Twilio) в подделке: ключи только записываются; код всегда 123456 — и пишется в консоль.
  // localStorage 'fake:sms-fail' = '1' — Twilio «не принял» SMS (ошибка sms_failed)
  const FAKE_CODE = '123456';
  const smsReady = (d) => !!(d.sms?.sid && d.sms?.token && d.sms?.from);
  const smsInfo = (d) => ({ configured: smsReady(d), from: d.sms?.from || null, sid_tail: d.sms?.sid ? '…' + d.sms.sid.slice(-4) : null });
  const dvTrust = (st) => (st.dv_trust_after ?? 3);
  const dvOver = (st) => Number(st.dv_confirm_over ?? 150);
  // как z_open_from / z_totals в базе
  const zFrom = (d) => {
    const z = (d.z || []).map((x) => x.closed_at).sort().pop();
    if (z) return z;
    const t = [...(d.bills || []).map((b) => b.paid_at), ...(d.orders || []).map((o) => o.created_at)].sort()[0];
    return t ? new Date(new Date(t).getTime() - 1).toISOString() : new Date().toISOString();
  };
  const zTotals = (d, from, to) => {
    const f = new Date(from).getTime(); const t = new Date(to).getTime();
    const inP = (x) => { const v = new Date(x).getTime(); return v > f && v <= t; };
    const b = (d.bills || []).filter((x) => inP(x.paid_at)); const ok = b.filter((x) => !x.voided_at);
    const sum = (arr, k) => r2(arr.reduce((s, x) => s + Number(x[k] || 0), 0));
    const by = {}; const cashier = {};
    ok.forEach((x) => {
      (x.payments?.length ? x.payments : [{ method: x.method, amount: Number(x.total) + Number(x.tip || 0) + Number(x.rounding || 0) }]).forEach((p) => { by[p.method] = r2((by[p.method] || 0) + Number(p.amount)); });
      const k = x.paid_by_name || '—'; cashier[k] = r2((cashier[k] || 0) + Number(x.total));
    });
    const o = (d.orders || []).filter((x) => inP(x.created_at));
    const open = (d.orders || []).filter((x) => !x.paid_at && !['cancelled', 'confirm'].includes(x.status) && new Date(x.created_at).getTime() <= t);
    const waitCall = (d.orders || []).filter((x) => !x.paid_at && x.status === 'confirm' && new Date(x.created_at).getTime() <= t);
    // доставка, которую так и не подтвердили звонком, — отдельно («Не подтверждены»)
    const unconf = (x) => x.status === 'cancelled' && x.kind === 'delivery' && x.cancel_reason && !x.confirmed_at;
    const vd = b.filter((x) => x.voided_at); const cn = o.filter((x) => x.status === 'cancelled' && !unconf(x)); const un = o.filter(unconf);
    return { from, to, bills: ok.length, subtotal: sum(ok, 'subtotal'), discount: sum(ok, 'discount'), discount_bills: ok.filter((x) => Number(x.discount) > 0).length,
      service: sum(ok, 'service'), tax: sum(ok, 'tax'), total: sum(ok, 'total'), tip: sum(ok, 'tip'), rounding: sum(ok, 'rounding'), delivery_fee: sum(ok, 'delivery_fee'), by_method: by, cash: by.cash || 0,
      voided: vd.length, voided_sum: sum(vd, 'total'), orders: o.filter((x) => !['cancelled', 'confirm'].includes(x.status)).length, cancelled: cn.length, cancelled_sum: sum(cn, 'total'),
      unconfirmed: un.length, unconfirmed_sum: sum(un, 'total'), confirm_orders: waitCall.length,
      open_orders: open.length, open_sum: sum(open, 'total'), by_cashier: cashier };
  };
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
    if (!dish || !dish.available || dish.stock === 0) throw new Error('unavailable:' + it.id);
    const cat = d.categories.find((c) => c.id === dish.category_id);
    if (cat?.avail_from && cat?.avail_to) {
      const m = window.MenuSchedule.localNow(d.settings.timezone, new Date()).min;
      const f = window.MenuSchedule.mins(cat.avail_from); const t2 = window.MenuSchedule.mins(cat.avail_to);
      if (!(t2 > f ? m >= f && m < t2 : m >= f || m < t2)) throw new Error('not_now:' + it.id);
    }
    const sel = [...(it.opts || [])].sort();
    let unit = dishPrice(d, dish);
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
    const note = String(it.note || '').replace(/\s+/g, ' ').trim().slice(0, 120);
    return { line: { id: dish.id, qty: it.qty, price: unit, name: dish.name, opts: snap, ...(note ? { note } : {}) }, key: `${dish.id}|${sel.join(',')}|${note}` };
  }
  // как dish_price в базе: цена по акции, если акция идёт сейчас
  function dishPrice(d, dish) {
    if (dish.promo_price == null) return Number(dish.price);
    if (dish.promo_from && dish.promo_to) {
      const hm = (x) => { const [h, mm] = String(x).split(':').map(Number); return h * 60 + mm; };
      const now = new Date(); const m = window.MenuSchedule ? window.MenuSchedule.localNow(d.settings.timezone, now).min : now.getHours() * 60 + now.getMinutes();
      const f = hm(dish.promo_from); const t2 = hm(dish.promo_to);
      if (!(t2 > f ? m >= f && m < t2 : m >= f || m < t2)) return Number(dish.price);
    }
    return Number(dish.promo_price);
  }
  // как триггер orders_stock: заказ списывает порции, отмена возвращает
  function applyStock(d, oldItems, newItems) {
    const sum = (items) => (items || []).reduce((m, i) => ({ ...m, [i.id]: (m[i.id] || 0) + Number(i.qty) }), {});
    const a = sum(oldItems); const b = sum(newItems);
    const ids = new Set([...Object.keys(a), ...Object.keys(b)]);
    for (const id of ids) {
      const delta = (b[id] || 0) - (a[id] || 0); const x = d.dishes.find((y) => y.id === id);
      if (!delta || !x || x.stock == null) continue;
      if (x.stock - delta < 0) throw new Error('sold_out:' + id);
    }
    for (const id of ids) { const x = d.dishes.find((y) => y.id === id); if (x && x.stock != null) x.stock -= (b[id] || 0) - (a[id] || 0); }
  }
  const newToken = () => Array.from(crypto.getRandomValues(new Uint8Array(10)), (b) => b.toString(16).padStart(2, '0')).join('');
  const uid = () => ({ owner: 'u-owner', waiter: 'u-waiter', cook: 'u-cook', manager: 'u-manager', courier: 'u-courier' })[role()] || 'u-waiter';

  window.MENU_BACKEND = { url: 'https://fake.supabase.co', key: 'sb_publishable_FAKE' };

  window.STAFF_TEST_API = {
    async session() { await delay(); return role() ? { user: { id: uid() } } : null; },
    async signIn(email) { await delay(); if (email.includes('wrong')) throw new Error('Invalid login credentials'); localStorage.setItem('fake:role', email.startsWith('owner') ? 'owner' : email.startsWith('cook') ? 'cook' : email.startsWith('courier') ? 'courier' : email.startsWith('manager') ? 'manager' : 'waiter'); },
    async signUp() { await delay(); return { needsEmailConfirm: true }; },
    async resetPassword() { await delay(); },
    async signOut() { localStorage.removeItem('fake:role'); },
    async whoami() {
      await delay();
      const r = role();
      if (!r) return null;
      const base = { user_id: uid(), email: `${['owner', 'cook', 'manager', 'courier'].includes(r) ? r : 'waiter'}@example.com`, name: myName() || 'Азиз' };
      if (r === 'unconfirmed') return { ...base, role: 'waiter', active: true, email_confirmed: false };
      if (r === 'uninvited') return { ...base, role: null, active: false, email_confirmed: true };
      if (r === 'disabled') return { ...base, role: 'waiter', active: false, email_confirmed: true };
      return { ...base, role: r, active: true, email_confirmed: true };
    },
    async settings() { await delay(); return db().settings; },
    async saveSettings(p) {
      await delay(); owner(); const d = db();
      // как settings_dv_check: включить проверку по SMS — только когда SMS настроены
      if (p.dv_sms && !d.settings.dv_sms && !smsReady(d)) throw new Error('sms_not_configured');
      if (p.dv_trust_after != null && !(Number.isInteger(p.dv_trust_after) && p.dv_trust_after >= 0 && p.dv_trust_after <= 50)) throw new Error('violates check constraint "settings_dv_trust_check"');
      if (p.dv_confirm_over != null && !(Number(p.dv_confirm_over) >= 0)) throw new Error('violates check constraint "settings_dv_over_check"');
      d.settings = { ...d.settings, ...p }; save(d); return d.settings;
    },
    // ---------- SMS (только владелец; токен наружу не отдаётся) ----------
    async smsStatus() { await delay(); owner(); return smsInfo(db()); },
    async setSms(sid, token, from) {
      await delay(); owner(); offline();
      const d = db();
      const S2 = String(sid || '').trim(); const T2 = String(token || '').trim(); const F2 = String(from || '').trim();
      if (!S2 && !T2 && !F2) { d.sms = {}; d.settings.dv_sms = false; save(d); return smsInfo(d); }
      if (!/^AC[0-9a-fA-F]{32}$/.test(S2)) throw new Error('bad_sid');
      if (T2 && !/^[A-Za-z0-9]{16,64}$/.test(T2)) throw new Error('bad_token');
      if (!F2 || !e164(F2)) throw new Error('bad_from');
      d.sms = { sid: S2, token: T2 || d.sms?.token || null, from: e164(F2) };
      save(d); return smsInfo(d);
    },
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
    // ---------- рекламные ролики (как promos в базе: меняет только владелец) ----------
    async promos() { await delay(); owner(); const d = db(); return [...(d.promos ?? demoPromos())].sort(promoSort); },
    async savePromo(row) {
      await delay(); offline(); owner();
      const d = db();
      d.promos = d.promos ?? demoPromos();
      const old = row.id ? d.promos.find((x) => x.id === row.id) : null;
      if (row.id && !old) throw new Error('not_found');
      const next = { ...(old || { id: crypto.randomUUID(), poster_url: null, title: {}, active: true, sort: 0, duration_s: null, created_at: new Date().toISOString() }), ...row };
      if (!httpsOk(String(next.video_url || ''))) throw new Error('new row violates check constraint "promos_video_url_check"');
      // обложка: https, а в подделке ещё и data:image (настоящего хранилища тут нет)
      if (next.poster_url != null && !httpsOk(next.poster_url) && !/^data:image\//.test(next.poster_url)) throw new Error('new row violates check constraint "promos_poster_url_check"');
      if (next.duration_s != null && !(next.duration_s >= 1 && next.duration_s <= 30)) throw new Error('new row violates check constraint "promos_duration_s_check"');
      if (old) Object.assign(old, next); else d.promos.push(next);
      save(d); return next;
    },
    async deletePromo(id) { await delay(); offline(); owner(); const d = db(); d.promos = (d.promos ?? demoPromos()).filter((x) => x.id !== id); save(d); },
    // файла в подделке нет: ролик = пробное видео (уникальная ссылка), обложка = data:-картинка
    async uploadPromoVideo(file) {
      await delay(); offline(); owner();
      if (file.size > 52428800) throw new Error('The object exceeded the maximum allowed size');
      return `${FAKE_VIDEO}#${crypto.randomUUID()}`;
    },
    async uploadPromoPoster(blob) { await delay(); owner(); return new Promise((res) => { const fr = new FileReader(); fr.onload = () => res(fr.result); fr.readAsDataURL(blob); }); },
    async orders(from, to) {
      await delay();
      staffOk(); offline();
      if (!to) { const d0 = db(); if (dvExpire(d0)) save(d0); }
      const f = new Date(from).getTime();
      const t = to ? new Date(to).getTime() : Infinity;
      return db().orders.filter((o) => {
        // как orders_staff_read: курьер видит только доставку
        if (role() === 'courier' && o.kind !== 'delivery') return false;
        // доставку до звонка видит только зал (не повар и не курьер)
        if (o.status === 'confirm' && ['courier', 'cook'].includes(role())) return false;
        const c = new Date(o.created_at).getTime();
        return to ? c >= f && c < t : c >= f || ['confirm', 'new', 'accepted', 'cooking', 'ready', 'on_the_way'].includes(o.status);
      });
    },
    async acceptOrder(id) {
      await delay();
      if (!['owner', 'waiter', 'manager'].includes(role())) throw new Error('forbidden');   // как is_floor()
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
      await delay(); mgr();
      if (localStorage.getItem('fake:offline') === '1') throw new TypeError('Failed to fetch');
      const d = db(); const o = d.orders.find((x) => x.id === id);
      if (!['confirm', 'new', 'accepted', 'cooking', 'ready', 'on_the_way', 'served', 'cancelled'].includes(status)) throw new Error('violates check constraint');
      const was = o.status;
      if (was !== status && o.paid_at) throw new Error('paid');
      // как orders_on_update: доставка «доставлена» только вместе с оплатой (courier_done)
      if (was !== status && o.kind === 'delivery' && status === 'served' && !o.paid_at) throw new Error('bad_status');
      applyStock(d, heldItems(o, was), heldItems(o, status));
      o.status = status; o.updated_at = new Date().toISOString();
      if (status === 'cancelled') o.cancelled_at = o.updated_at; else if (was !== status) { o.cancelled_at = null; o.cancel_reason = null; }
      if (status === 'confirm' && was !== status) { o.confirmed_at = null; o.confirmed_by_name = null; }   // вернули «ждать звонка» — подтверждать заново
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
      applyStock(d, [], o.items);
      d.orders.push(o); save(d); return o;
    },
    async serveOrder(id) {
      await delay(); floor(); offline();
      const d = db(); const o = d.orders.find((x) => x.id === id);
      if (!o) throw new Error('not_found');
      if (o.kind === 'delivery') throw new Error('bad_status');   // доставку закрывает курьер с оплатой
      if (['new', 'accepted', 'cooking', 'ready'].includes(o.status)) { o.status = 'served'; o.served_at = new Date().toISOString(); o.updated_at = o.served_at; o.served_by = uid(); o.served_by_name = myName(); save(d); }
      return o;
    },
    // ---------- доставка ждёт звонка: как confirm_delivery / reject_delivery в базе ----------
    async confirmDelivery(id) {
      await delay(); floor(); offline();
      const d = db(); const o = d.orders.find((x) => x.id === id);
      if (!o || o.kind !== 'delivery') throw new Error('not_found');
      if (o.status !== 'confirm') {
        if (o.confirmed_at && o.status !== 'cancelled') return o;
        throw new Error('bad_status');
      }
      applyStock(d, [], o.items);   // порции списываются только сейчас (может быть sold_out)
      const now = new Date().toISOString();
      Object.assign(o, { status: 'new', confirmed_at: now, confirmed_by_name: myName(), updated_at: now });
      save(d); return o;
    },
    async rejectDelivery(id, reason) {
      await delay(); floor(); offline();
      if (!['no_answer', 'refused', 'other'].includes(reason)) throw new Error('bad_reason');
      const d = db(); const o = d.orders.find((x) => x.id === id);
      if (!o || o.kind !== 'delivery') throw new Error('not_found');
      if (o.status === 'cancelled') return o;
      if (o.status !== 'confirm') throw new Error('bad_status');
      // порции «ждущая звонка» доставка не держала — возвращать нечего
      const now = new Date().toISOString();
      Object.assign(o, { status: 'cancelled', cancel_reason: reason, cancelled_at: now, updated_at: now });
      save(d); return o;
    },
    // ---------- доставка: как courier_take / courier_done в базе ----------
    async courierTake(id) {
      await delay(); courierOk(); offline();
      const d = db(); const o = d.orders.find((x) => x.id === id);
      if (!o || o.kind !== 'delivery') throw new Error('not_found');
      if (o.status === 'on_the_way' && o.courier_id !== uid()) throw new Error('taken');
      if (!['new', 'accepted', 'cooking', 'ready', 'on_the_way'].includes(o.status)) throw new Error('bad_status');
      const now = new Date().toISOString();
      Object.assign(o, { status: 'on_the_way', courier_id: uid(), courier_name: myName(), picked_at: o.picked_at || now, accepted_at: o.accepted_at || now, updated_at: now });
      save(d); return o;
    },
    async courierDone(id, method) {
      await delay(); courierOk(); offline();
      if (!['cash', 'card'].includes(method)) throw new Error('bad_request');
      const d = db(); const o = d.orders.find((x) => x.id === id);
      if (!o || o.kind !== 'delivery') throw new Error('not_found');
      if (o.paid_at) return o;   // повторное «доставил» — без второго счёта
      if (o.status === 'cancelled') throw new Error('cancelled');
      if (o.status === 'confirm') throw new Error('bad_status');
      if (o.status === 'on_the_way' && o.courier_id !== uid() && !['owner', 'manager'].includes(role())) throw new Error('taken');
      // наличные — до 5 сен, как в кассе; считаем в сенах
      const sen = (x) => Math.round(Number(x || 0) * 100);
      const roundS = method === 'cash' && d.settings.cash_rounding !== false ? Math.round(sen(o.total) / 5) * 5 - sen(o.total) : 0;
      d.billSeq = (d.billSeq || 0) + 1;
      const now = new Date().toISOString();
      const bill = { id: crypto.randomUUID(), no: d.billSeq, table_id: null, table_label: 'Доставка', order_ids: [o.id], order_nos: [o.no],
        subtotal: Number(o.subtotal ?? o.total), service: 0, tax: Number(o.tax || 0), delivery_fee: Number(o.delivery_fee || 0), total: Number(o.total), tip: 0,
        discount: 0, discount_pct: null, discount_reason: null, discount_by_name: null, rounding: roundS / 100,
        payments: [{ method, amount: (sen(o.total) + roundS) / 100 }], method, paid_at: now, paid_by: uid(), paid_by_name: myName() };
      d.bills = (d.bills || []).concat(bill);
      Object.assign(o, { status: 'served', paid_at: now, bill_id: bill.id, served_at: o.served_at || now, served_by: uid(), served_by_name: myName(),
        courier_id: o.courier_id || uid(), courier_name: o.courier_name || myName(), picked_at: o.picked_at || now, updated_at: now });
      (d.audit = d.audit || []).push({ id: Date.now(), at: now, who: myName(), entity: 'bill', entity_id: bill.id, label: `счёт №${bill.no} · доставка №${o.no}`, action: 'insert', changes: { total: bill.total, method } });
      save(d); return o;
    },
    // только для проверки: заказ доставки, как будто гость оформил его в меню (place_delivery)
    _fakeDelivery({ name = 'Алишер', phone = '+60 12-345 6789', address = 'Jalan Test 1, Kuala Lumpur', km = 2.1, fee = 5, pay = 'cash', note = null, status = 'new' } = {}) {
      const d = db();
      const items = d.dishes.slice(0, 2).map((x) => ({ id: x.id, name: x.name, price: Number(x.price), qty: 1 }));
      const sub = r2(items.reduce((s, i) => s + i.price * i.qty, 0));
      const tax = r2(sub * Number(d.settings.tax_pct || 0) / 100);
      d.seq = Math.max(1000, d.seq || 0) + 1;
      const now = new Date().toISOString();
      const o = { id: crypto.randomUUID(), no: d.seq, kind: 'delivery', table_id: null, table_label: 'Доставка', items, subtotal: sub, service: 0, tax, delivery_fee: fee, total: r2(sub + tax + fee),
        note, status, customer_name: name, customer_phone: phone, address, lat: 3.157, lng: 101.6869, distance_km: km, pay_method: pay,
        courier_id: null, courier_name: null, picked_at: null, guest_token: crypto.randomUUID(), client_key: crypto.randomUUID(), created_at: now, updated_at: now };
      d.orders.push(o); save(d); return o;
    },
    async dvExpire() { await delay(); staffOk(); const d = db(); const n = dvExpire(d); save(d); return n; },
    async myTelegram() { await delay(); staffOk(); const d = db(); return { linked: !!(d.staffTg || {})[uid()], bot_username: d.telegram?.token ? 'central_asia_test_bot' : null, bot_ready: !!d.telegram?.token }; },
    async myTelegramStart() { await delay(); staffOk(); const d = db(); if (!d.telegram?.token) throw new Error('no_bot'); d.tgCode = { user: uid(), code: 'ca' + Math.random().toString(16).slice(2, 12), n: 0 }; save(d); return { code: d.tgCode.code, bot_username: 'central_asia_test_bot' }; },
    async myTelegramCheck() { await delay(); staffOk(); const d = db(); if (!d.tgCode) return 'no_code'; d.tgCode.n += 1; if (d.tgCode.n < 2) { save(d); return 'pending'; } d.staffTg = { ...(d.staffTg || {}), [uid()]: '555' }; d.tgCode = null; save(d); return 'linked'; },
    async myTelegramOff() { await delay(); staffOk(); const d = db(); if (d.staffTg) delete d.staffTg[uid()]; save(d); },
    async calls(from) { await delay(); floor(); offline(); const f = new Date(from).getTime(); return (db().calls || []).filter((c) => !c.done_at || new Date(c.created_at).getTime() >= f); },
    async doneCall(id) { await delay(); floor(); const d = db(); const c = (d.calls || []).find((x) => x.id === id); if (c && !c.done_at) Object.assign(c, { done_at: new Date().toISOString(), done_by_name: myName() }); save(d); },
    async bills(from, to) { await delay(); floor(); const f = new Date(from).getTime(); const t = to ? new Date(to).getTime() : Infinity; return (db().bills || []).filter((b) => { const x = new Date(b.paid_at).getTime(); return x >= f && x < t; }).sort((a, b) => new Date(b.paid_at) - new Date(a.paid_at)); },
    async closeBill(tableId, method, ids, tip = 0, payments = null, discount = null) {
      await delay(); floor(); offline();
      if (!['cash', 'card', 'qr', 'other', 'mixed'].includes(method)) throw new Error('bad_method');
      if (tip < 0) throw new Error('bad_tip');
      const d = db();
      const list = d.orders.filter((o) => o.table_id === tableId && !o.paid_at && o.status !== 'cancelled' && (!ids || ids.includes(o.id)));
      if (!list.length) throw new Error('nothing_to_pay');
      const sum = (k) => r2(list.reduce((s, o) => s + Number(o[k] ?? (k === 'subtotal' ? o.total : 0)), 0));
      d.billSeq = (d.billSeq || 0) + 1;
      const tb = d.tables.find((t) => t.id === tableId);
      // как close_bill на сервере: скидка на блюда, сбор/налог пропорционально, наличные — до 5 сен
      const sen = (x) => Math.round(Number(x) * 100);
      let subS = sen(sum('subtotal')); let srvS = sen(sum('service')); let taxS = sen(sum('tax')); let totS = sen(sum('total'));
      let D = 0; let dpct = null; let dreason = null;
      if (discount) {
        if (!(['owner', 'manager'].includes(role()) || d.settings.waiter_discounts)) throw new Error('no_discount_rights');
        dreason = String(discount.reason || '').trim().slice(0, 100);
        if (!dreason) throw new Error('discount_reason');
        const v = Number(discount.value);
        if (discount.kind === 'pct') { if (!(v > 0 && v <= 100)) throw new Error('bad_discount'); dpct = v; D = Math.round(subS * v / 100 + 1e-9); }
        else if (discount.kind === 'amount') { if (!(v > 0) || sen(v) > subS) throw new Error('bad_discount'); D = sen(v); }
        else throw new Error('bad_discount');
        if (subS) { srvS = Math.round(srvS * (subS - D) / subS + 1e-9); taxS = Math.round(taxS * (subS - D) / subS + 1e-9); }
        totS = subS - D + srvS + taxS;
      }
      const total = totS / 100;
      const roundOn = d.settings.cash_rounding !== false;
      const r5 = (x) => Math.round(x / 5) * 5;
      let roundS = 0;
      let pays = payments;
      if (!pays) {
        if (method === 'mixed') throw new Error('bad_payments');
        const due = totS + sen(tip);
        if (method === 'cash' && roundOn) roundS = r5(due) - due;
        pays = [{ method, amount: (due + roundS) / 100 }];
      } else {
        const nonCash = pays.filter((p) => p.method !== 'cash').reduce((x, p) => x + sen(p.amount), 0);
        if (pays.some((p) => p.method === 'cash') && roundOn) { const due = totS + sen(tip) - nonCash; roundS = r5(due) - due; }
      }
      if (pays.length < 1 || pays.length > 4 || pays.some((p) => !['cash', 'card', 'qr', 'other'].includes(p.method) || !(p.amount > 0 || (!payments && p.amount === 0)))) throw new Error('bad_payments');
      if (Math.abs(pays.reduce((x, p) => x + sen(p.amount), 0) - (totS + sen(tip) + roundS)) > 1) throw new Error('bad_payments');
      const methods = [...new Set(pays.map((p) => p.method))];
      const bill = { id: crypto.randomUUID(), no: d.billSeq, table_id: tableId, table_label: tb?.label || list[0].table_label, order_ids: list.map((o) => o.id), order_nos: list.map((o) => o.no),
        subtotal: subS / 100, service: srvS / 100, tax: taxS / 100, total, tip: r2(tip),
        discount: D / 100, discount_pct: dpct, discount_reason: D ? dreason : null, discount_by_name: D ? myName() : null, rounding: roundS / 100, payments: pays, method: methods.length === 1 ? methods[0] : 'mixed', paid_at: new Date().toISOString(), paid_by: uid(), paid_by_name: myName() };
      list.forEach((o) => { o.paid_at = bill.paid_at; o.bill_id = bill.id; if (['new', 'accepted', 'cooking', 'ready'].includes(o.status)) { o.status = 'served'; o.served_at = o.served_at || bill.paid_at; o.served_by_name = o.served_by_name || myName(); } });
      (d.calls || []).forEach((c) => { if (c.table_id === tableId && !c.done_at && c.kind === 'bill') Object.assign(c, { done_at: bill.paid_at, done_by_name: myName() }); });
      d.bills = (d.bills || []).concat(bill);
      (d.audit = d.audit || []).push({ id: Date.now(), at: bill.paid_at, who: myName(), entity: 'bill', entity_id: bill.id, label: `счёт №${bill.no} · стол ${bill.table_label}`, action: 'insert', changes: { total: bill.total, method } });
      save(d); return bill;
    },
    async dump(table) {
      await delay(); owner(); const d = db();
      const map = { settings: [d.settings], categories: d.categories, dishes: d.dishes, tables: d.tables, staff: d.staff, staff_invites: d.invites, orders: d.orders, bills: d.bills || [], z_reports: d.z || [], reviews: d.reviews || [], calls: d.calls || [] };
      return JSON.parse(JSON.stringify(map[table] || []));
    },
    async markBackup() { await delay(); owner(); const d = db(); d.settings.backup_at = new Date().toISOString(); save(d); return d.settings.backup_at; },
    async wifi() { await delay(); owner(); return db().wifi || { name: '', pass: '' }; },
    async saveWifi(name, pass) { await delay(); owner(); const d = db(); d.wifi = { name: String(name || '').slice(0, 64), pass: String(pass || '').slice(0, 64) }; save(d); },
    async voidBill(id, reason) {
      await delay(); mgr(); offline();
      const why = String(reason || '').replace(/\s+/g, ' ').trim().slice(0, 200);
      if (!why) throw new Error('void_reason');
      const d = db(); const b = (d.bills || []).find((x) => x.id === id);
      if (!b) throw new Error('not_found');
      if (b.voided_at) throw new Error('already_voided');
      const lastZ = Math.max(0, ...(d.z || []).map((z) => new Date(z.closed_at).getTime()));
      if (new Date(b.paid_at).getTime() <= lastZ) throw new Error('day_closed');
      Object.assign(b, { voided_at: new Date().toISOString(), voided_by_name: myName(), void_reason: why });
      d.orders.forEach((o) => { if (o.bill_id === id) { o.paid_at = null; o.bill_id = null; } });
      (d.audit = d.audit || []).push({ id: Date.now(), at: b.voided_at, who: myName(), entity: 'bill', entity_id: b.id, label: `счёт №${b.no} · стол ${b.table_label}`, action: 'update', changes: { voided_at: [null, b.voided_at], void_reason: [null, why] } });
      save(d); return b;
    },
    async moveOrders(from, to, ids) {
      await delay(); floor(); offline();
      if (!from || !to || from === to) throw new Error('same_table');
      const d = db(); const tb = d.tables.find((t) => t.id === to && t.active);
      if (!tb) throw new Error('not_found');
      const list = d.orders.filter((o) => o.table_id === from && !o.paid_at && o.status !== 'cancelled' && (!ids || ids.includes(o.id)));
      if (!list.length) throw new Error('nothing_to_move');
      list.forEach((o) => { o.table_id = to; o.table_label = tb.label; });
      d.tableWaiters = d.tableWaiters || {};
      if (d.tableWaiters[from] && !d.tableWaiters[to]) d.tableWaiters[to] = d.tableWaiters[from];
      if (!d.orders.some((o) => o.table_id === from && !o.paid_at && o.status !== 'cancelled')) {
        (d.calls || []).forEach((c) => { if (c.table_id === from && !c.done_at) { c.table_id = to; c.table_label = tb.label; } });
        delete d.tableWaiters[from];
      }
      save(d); return list.length;
    },
    async zPreview() { await delay(); mgr(); offline(); return zTotals(db(), zFrom(db()), new Date().toISOString()); },
    async closeDay(counted, note) {
      await delay(); mgr(); offline();
      if (counted != null && !(counted >= 0)) throw new Error('bad_amount');
      const d = db(); const from = zFrom(d); const to = new Date().toISOString();
      const z = { id: crypto.randomUUID(), no: (d.z || []).length + 1, opened_at: from, closed_at: to, closed_by_name: myName(), totals: zTotals(d, from, to),
        counted_cash: counted == null ? null : r2(counted), note: (note || '').trim().slice(0, 300) || null };
      d.z = (d.z || []).concat(z); save(d); return z;
    },
    async zReports() { await delay(); mgr(); return [...(db().z || [])].reverse(); },
    async editOrder(id, items) {
      await delay(); mgr(); offline();
      const d = db(); const o = d.orders.find((x) => x.id === id);
      if (!o) throw new Error('not_found');
      if (o.status === 'cancelled') throw new Error('cancelled');
      if (o.paid_at) throw new Error('paid');
      if (!items.length) throw new Error('empty');
      const keyOf = (i) => `${i.id}|${(i.opts || []).map((x) => (typeof x === 'string' ? x : `${x.g}:${x.c}`)).sort().join(',')}|${String(i.note || '').replace(/\s+/g, ' ').trim().slice(0, 120)}`;
      const out = [];
      for (const it of items) {
        const old = o.items.find((x) => keyOf(x) === keyOf(it));
        out.push(old ? { ...old, qty: it.qty } : lineOf(d, it, false).line);
      }
      const sub = r2(out.reduce((s, i) => s + i.price * i.qty, 0));
      applyStock(d, o.items, out);
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
    async setDishAvailable(id, on) {
      await delay(); if (!['owner', 'manager', 'cook'].includes(role())) throw new Error('forbidden');
      const d = db(); const x = d.dishes.find((y) => y.id === id); if (!x) throw new Error('not_found');
      x.available = !!on; if (on && x.stock === 0) x.stock = null; save(d); return x;
    },
    async setDishStock(id, stock) {
      await delay(); if (!['owner', 'manager', 'cook'].includes(role())) throw new Error('forbidden');
      const d = db(); const x = d.dishes.find((y) => y.id === id); if (!x) throw new Error('not_found');
      x.stock = stock == null ? null : Number(stock); if (x.stock > 0) x.available = true; save(d); return x;
    },
    async dishCosts() { await delay(); owner(); return Object.entries(db().costs || {}).map(([dish_id, cost]) => ({ dish_id, cost })); },
    async saveDishCost(id, cost) { await delay(); owner(); const d = db(); d.costs = d.costs || {}; if (cost == null) delete d.costs[id]; else d.costs[id] = Number(cost); save(d); },
    async dishVotes(from, to) {
      await delay(); mgr(); const f = new Date(from).getTime(); const t2 = new Date(to).getTime();
      return (db().votes || []).filter((v) => { const x = new Date(v.created_at).getTime(); return x >= f && x < t2; });
    },
    async bookings(from, to) {
      await delay(); floor(); const f = new Date(from).getTime(); const t2 = new Date(to).getTime();
      return (db().bookings || []).filter((b) => { const x = new Date(b.at).getTime(); return x >= f && x < t2; }).sort((a, b) => a.at.localeCompare(b.at));
    },
    async setBooking(id, status, tableId = null) {
      await delay(); floor(); const d = db(); const b = (d.bookings || []).find((x) => x.id === id); if (!b) throw new Error('not_found');
      b.status = status; b.decided_by_name = myName(); b.updated_at = new Date().toISOString();
      if (tableId) { b.table_id = tableId; b.table_label = d.tables.find((t) => t.id === tableId)?.label || null; }
      save(d); return b;
    },
    async shiftStart() {
      await delay(); staffOk(); const d = db(); d.shifts = d.shifts || [];
      let s0 = d.shifts.find((x) => x.user_id === uid() && !x.ended_at);
      if (!s0) { s0 = { id: 'sh-' + Date.now(), user_id: uid(), name: myName(), role: role(), started_at: new Date().toISOString(), ended_at: null }; d.shifts.push(s0); save(d); }
      return s0;
    },
    async shiftEnd() {
      await delay(); staffOk(); const d = db(); const s0 = (d.shifts || []).find((x) => x.user_id === uid() && !x.ended_at);
      if (!s0) return null; s0.ended_at = new Date().toISOString(); save(d); return s0;
    },
    async myShift() { await delay(); staffOk(); return (db().shifts || []).find((x) => x.user_id === uid() && !x.ended_at) || null; },
    async shifts(from, to) {
      await delay(); staffOk(); const f = new Date(from).getTime(); const t2 = new Date(to).getTime();
      return (db().shifts || []).filter((x) => (role() === 'owner' || role() === 'manager' || x.user_id === uid())
        && new Date(x.started_at).getTime() < t2 && (!x.ended_at || new Date(x.ended_at).getTime() >= f));
    },
    async reviews(from, to) { await delay(); mgr(); const f = new Date(from).getTime(); const t2 = new Date(to).getTime(); return (db().reviews || []).filter((r) => { const x = new Date(r.created_at).getTime(); return x >= f && x < t2; }).sort((a, c) => new Date(c.created_at) - new Date(a.created_at)); },
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
      if (name === 'table_info') { const t = d.tables.find((x) => x.token === b.p_token && x.active); const w = d.wifi || {}; return reply(200, t ? [{ label: t.label, wifi_name: w.name || null, wifi_pass: w.pass || null }] : []); }
      if (name === 'guest_receipt') {
        const o = d.orders.find((x) => x.id === b.p_order && x.guest_token === b.p_token);
        const bl = o && o.bill_id && (d.bills || []).find((x) => x.id === o.bill_id && !x.voided_at);
        if (!bl) return reply(200, null);
        const os = d.orders.filter((x) => bl.order_ids.includes(x.id)).sort((x, y) => x.no - y.no);
        return reply(200, { no: bl.no, paid_at: bl.paid_at, table_label: bl.table_label, order_nos: bl.order_nos, subtotal: bl.subtotal, discount: bl.discount || 0, discount_pct: bl.discount_pct, discount_reason: bl.discount_reason,
          service: bl.service, tax: bl.tax, total: bl.total, tip: bl.tip || 0, rounding: bl.rounding || 0, delivery_fee: Number(bl.delivery_fee || 0),
          kind: os.some((x) => x.kind === 'delivery') ? 'delivery' : 'table', payments: bl.payments, method: bl.method, cashier: bl.paid_by_name || null,
          waiters: [...new Set(os.map((x) => x.served_by_name).filter(Boolean))], items: os.flatMap((x) => x.items) });
      }
      if (name === 'get_order') {
        const o = d.orders.find((x) => x.id === b.p_id && x.guest_token === b.p_token);
        return reply(200, o ? [{ id: o.id, no: o.no, status: o.status, total: o.total, table_label: o.table_label, items: o.items, note: o.note, created_at: o.created_at, updated_at: o.updated_at, accepted_at: o.accepted_at || null,
          subtotal: o.subtotal ?? o.total, service: o.service || 0, tax: o.tax || 0, paid_at: o.paid_at || null, edited_at: o.edited_at || null,
          kind: o.kind || 'table', delivery_fee: Number(o.delivery_fee || 0), distance_km: o.distance_km ?? null, address: o.address || null, pay_method: o.pay_method || null,
          courier_name: o.courier_name || null, picked_at: o.picked_at || null, served_at: o.served_at || null, cancel_reason: o.cancel_reason || null }] : []);
      }
      // ---------- гость: код из SMS (как request_phone_code / verify_phone_code). Код в подделке — всегда 123456 ----------
      if (name === 'request_phone_code') {
        const ph = e164(b.p_phone);
        // только малайзийские номера (+60)
        if (!ph || !/^\+60[1-9]\d{7,9}$/.test(ph)) return fail('bad_phone');
        if (!d.settings.dv_sms || !smsReady(d)) return fail('sms_off');
        d.phoneCodes = d.phoneCodes || {};
        const r = d.phoneCodes[ph];
        const now = Date.now();
        if (r && now - r.sent_at < 60000) return fail(`too_soon:${Math.max(1, Math.ceil((r.sent_at + 60000 - now) / 1000))}`);
        if (r && now - r.hour_start < 3600000 && r.sends_hour >= 3) return fail('too_many');
        if (Object.values(d.phoneCodes).reduce((s2, x) => s2 + (now - x.hour_start < 3600000 ? x.sends_hour : 0), 0) >= 30) return fail('too_many');
        if (localStorage.getItem('fake:sms-fail') === '1') return fail('sms_failed');   // Twilio не принял — код не сохраняется
        const inHour = now - (r?.hour_start || 0) < 3600000;
        d.phoneCodes[ph] = { code: FAKE_CODE, sent_at: now, expires_at: now + 600000, attempts: 0, sends_hour: inHour ? r.sends_hour + 1 : 1, hour_start: inHour ? r.hour_start : now };
        save(d);
        console.log(`[fake SMS] ${ph}: ${d.settings.name}: код ${FAKE_CODE}`);
        return reply(200, { ok: true, wait_s: 60, phone: ph });
      }
      if (name === 'verify_phone_code') {
        const ph = e164(b.p_phone);
        if (!ph) return fail('bad_phone');
        const r = (d.phoneCodes || {})[ph];
        if (!r || !r.code || Date.now() > r.expires_at) return fail('expired');
        if (r.attempts >= 5) return fail('too_many_attempts');
        if (String(b.p_code || '').trim() !== r.code) {
          r.attempts += 1; save(d);
          return fail(r.attempts >= 5 ? 'too_many_attempts' : `bad_code:${5 - r.attempts}`);
        }
        r.code = null;
        const tok = crypto.randomUUID();
        d.phoneTokens = { ...(d.phoneTokens || {}), [tok]: { phone: ph, expires_at: Date.now() + 365 * 864e5 } };
        save(d);
        return reply(200, { phone_token: tok, phone: ph });
      }
      // ---------- гость: доставка (как delivery_quote / place_delivery в базе) ----------
      // расстояние по прямой (гаверсинус, км, 2 знака) и зона «до N км — цена»
      const dvQuote = (lat, lng) => {
        const st = d.settings;
        const zones = (Array.isArray(st.delivery_zones) ? st.delivery_zones : []).filter((z) => z && typeof z.km === 'number' && typeof z.fee === 'number').sort((x, y) => x.km - y.km);
        if (!st.delivery_enabled || st.delivery_lat == null || st.delivery_lng == null || !zones.length) return { ok: false, reason: 'off' };
        const la = Number(lat); const ln = Number(lng);
        if (lat == null || lng == null || !Number.isFinite(la) || !Number.isFinite(ln) || la < -90 || la > 90 || ln < -180 || ln > 180) return { ok: false, reason: 'bad_point' };
        const rad = (x) => (x * Math.PI) / 180;
        const a = Math.sin(rad(la - st.delivery_lat) / 2) ** 2 + Math.cos(rad(st.delivery_lat)) * Math.cos(rad(la)) * Math.sin(rad(ln - st.delivery_lng) / 2) ** 2;
        const km = r2(6371 * 2 * Math.asin(Math.sqrt(a)));
        const z = zones.find((x) => x.km >= km);
        if (!z) return { ok: false, reason: 'too_far', km };
        return { ok: true, km, fee: z.fee, zone_km: z.km, min: Number(st.delivery_min) || 0 };
      };
      if (name === 'delivery_quote') return reply(200, dvQuote(b.p_lat, b.p_lng));
      if (name === 'place_delivery') {
        if (!b.p_client_key) return fail('bad_request');
        const out = (o) => [{ id: o.id, no: o.no, guest_token: o.guest_token, total: o.total, status: o.status, items: o.items, created_at: o.created_at, subtotal: o.subtotal, tax: o.tax, delivery_fee: o.delivery_fee, distance_km: o.distance_km }];
        const old = d.orders.find((x) => x.client_key === b.p_client_key);
        if (old) return reply(200, out(old));
        if (!d.settings.orders_enabled) return fail('orders_off');
        if (!d.settings.orders_when_closed && !window.MenuSchedule.status(d.settings.schedule, d.settings.timezone).open) return fail('closed');
        const q = dvQuote(b.p_lat, b.p_lng);
        if (!q.ok) return fail(q.reason === 'off' ? 'delivery_off' : q.reason === 'too_far' ? 'too_far' : 'bad_point');
        const nm = String(b.p_name || '').trim();
        const ph = String(b.p_phone || '').trim().replace(/\s+/g, ' ');
        const addr = String(b.p_address || '').replace(/\s+/g, ' ').trim();
        const email = String(b.p_email || '').trim().toLowerCase() || null;
        if (email && (email.length > 120 || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email))) return fail('bad_request');
        if (nm.length < 1 || nm.length > 60 || ph.length > 20 || !/^\+?[0-9][0-9 ()-]{5,19}$/.test(ph) || addr.length < 5 || addr.length > 300 || !['cash', 'card'].includes(b.p_pay)) return fail('bad_request');
        // проверка номера по SMS: ключ из verify_phone_code на этот же номер
        const phE = e164(ph);
        const tk = b.p_phone_token && (d.phoneTokens || {})[b.p_phone_token];
        const verified = !!(tk && phE && tk.phone === phE && tk.expires_at > Date.now());
        if (d.settings.dv_sms && !verified) return fail('phone_unverified');
        if (!Array.isArray(b.p_items) || !b.p_items.length) return fail('empty');
        if (b.p_items.length > 50) return fail('bad_items');
        let sub = 0; let count = 0;
        const items = [];
        const keys = new Set();
        for (const it of b.p_items) {
          let r;
          try { r = lineOf(d, it, true); } catch (ex) { return fail(ex.message); }
          if (keys.has(r.key)) return fail('bad_items');
          keys.add(r.key);
          sub += r.line.price * r.line.qty; count += r.line.qty;
          items.push(r.line);
        }
        if (count > 100) return fail('bad_items');
        sub = r2(sub);
        if (sub < Number(d.settings.delivery_min || 0)) return fail('below_min');
        // порций хватает? (ждущая звонка доставка их ещё не списывает)
        const need = items.reduce((m, i) => ({ ...m, [i.id]: (m[i.id] || 0) + i.qty }), {});
        const short = Object.keys(need).find((id) => { const x = d.dishes.find((y) => y.id === id); return x && x.stock != null && x.stock < need[id]; });
        if (short) return fail('sold_out:' + short);
        dvExpire(d);
        const digits = (x) => String(x || '').replace(/\D/g, '');
        const same = (x) => (e164(x) || digits(x)) === (phE || digits(ph));
        if (d.orders.filter((o) => o.kind === 'delivery' && !['served', 'cancelled'].includes(o.status) && Date.now() - new Date(o.created_at) < 12 * 3600000 && same(o.customer_phone)).length >= 3
          || d.orders.filter((o) => Date.now() - new Date(o.created_at) < 60000).length >= 60) return fail('too_many');
        // у доставки нет сервисного сбора; налог — как в зале (round(sub * tax_pct / 100, 2))
        const tax = r2(sub * (Number(d.settings.tax_pct) || 0) / 100);
        d.seq = Math.max(1000, d.seq || 0) + 1;
        const now = new Date().toISOString();
        // звонок ресторана: не нужен постоянному гостю (N доставленных и оплаченных), кроме сумм больше порога
        const total = r2(sub + tax + q.fee);
        // постоянный — только если номер подтверждён кодом из SMS
        const trusted = !!d.settings.dv_sms && verified && dvTrust(d.settings) > 0
          && d.orders.filter((o) => o.kind === 'delivery' && o.status === 'served' && o.paid_at && e164(o.customer_phone) === phE).length >= dvTrust(d.settings);
        const o = { id: crypto.randomUUID(), no: d.seq, kind: 'delivery', table_id: null, table_label: 'Доставка', items, subtotal: sub, service: 0, tax, delivery_fee: q.fee, total,
          note: String(b.p_note || '').trim().slice(0, 300) || null, lang: String(b.p_lang || '').trim().slice(0, 5) || null,
          status: trusted && total <= dvOver(d.settings) ? 'new' : 'confirm', client_key: b.p_client_key, guest_token: crypto.randomUUID(),
          customer_name: nm, customer_phone: ph, customer_email: email, address: addr, lat: Number(b.p_lat), lng: Number(b.p_lng), distance_km: q.km, pay_method: b.p_pay,
          courier_id: null, courier_name: null, picked_at: null, created_at: now, updated_at: now };
        // ждущих звонка — не больше 15 на ресторан
        if (o.status === 'confirm' && d.orders.filter((x) => x.status === 'confirm').length >= 15) return fail('too_many');
        try { applyStock(d, [], heldItems(o)); } catch (ex) { return fail(ex.message); }
        d.orders.push(o); save(d);
        if (localStorage.getItem('fake:drop-reply') === '1') { localStorage.removeItem('fake:drop-reply'); throw new TypeError('Failed to fetch'); } // заказ сохранён, но ответ «потерялся»
        return reply(200, out(o));
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
      // ---------- гость: оценки блюд и бронь стола (как vote_dishes / book_table / my_booking / cancel_booking) ----------
      if (name === 'vote_dishes') {
        const o = d.orders.find((x) => x.id === b.p_order && x.guest_token === b.p_token);
        if (!o) return fail('not_found');
        if (['new', 'cancelled'].includes(o.status)) return fail('too_early');
        if (Date.now() - new Date(o.created_at).getTime() > 2 * 86400000) return fail('too_late');
        const votes = b.p_votes;
        if (!votes || typeof votes !== 'object' || Array.isArray(votes)) return fail('bad_request');
        // сервер падает на первой ошибке и откатывает всё — проверяем до записи
        for (const [k, v] of Object.entries(votes)) {
          if (!o.items.some((i) => i.id === k) || ![-1, 0, 1].includes(Number(v))) return fail('bad_request');
        }
        d.votes = d.votes || [];
        let n = 0;
        for (const [k, v] of Object.entries(votes)) {
          d.votes = d.votes.filter((x) => !(x.order_id === o.id && x.dish_id === k));
          if (Number(v) !== 0) { d.votes.push({ order_id: o.id, dish_id: k, vote: Number(v), created_at: new Date().toISOString() }); n += 1; }
        }
        save(d); return reply(200, n);
      }
      // бронь гостю закрыта (revoke execute from anon)
      if (['book_table', 'my_booking', 'cancel_booking'].includes(name)) return reply(401, { code: '42501', message: `permission denied for function ${name}` });
      if (name === 'book_table') {
        d.bookings = d.bookings || [];
        if (!b.p_client_key) return fail('bad_request');
        const outB = (r) => [{ id: r.id, no: r.no, guest_token: r.guest_token, status: r.status, at: r.at, people: r.people }];
        const old = d.bookings.find((x) => x.client_key === b.p_client_key);
        if (old) return reply(200, outB(old));
        if (d.settings.bookings_enabled === false) return fail('bookings_off');
        const at = new Date(b.p_at || '');
        if (Number.isNaN(at.getTime()) || at.getTime() < Date.now() + 30 * 60000 || at.getTime() > Date.now() + 60 * 86400000) return fail('bad_time');
        if (!window.MenuSchedule.status(d.settings.schedule, d.settings.timezone, at).open) return fail('closed_then');
        const nm = String(b.p_name || '').trim();
        const ph = String(b.p_phone || '').trim().replace(/\s+/g, ' ');
        if (nm.length < 1 || nm.length > 60 || !/^\+?[0-9][0-9 ()-]{5,19}$/.test(ph) || !(Number.isInteger(b.p_people) && b.p_people >= 1 && b.p_people <= 50)) return fail('bad_request');
        // защита от спама: с одного номера не больше 3 будущих броней, со всех — 30 в час
        const digits = (x) => String(x).replace(/\D/g, '');
        if (d.bookings.filter((x) => digits(x.phone) === digits(ph) && ['new', 'confirmed'].includes(x.status) && new Date(x.at).getTime() > Date.now()).length >= 3
          || d.bookings.filter((x) => Date.now() - new Date(x.created_at).getTime() < 3600000).length >= 30) return fail('too_many');
        const now = new Date().toISOString();
        const r = {
          id: crypto.randomUUID(), no: Math.max(100, ...d.bookings.map((x) => Number(x.no) || 0)) + 1, name: nm, phone: ph, at: at.toISOString(), people: b.p_people,
          note: String(b.p_note || '').trim().slice(0, 300) || null, lang: String(b.p_lang || '').trim().slice(0, 5) || null, status: 'new', table_id: null, table_label: null,
          client_key: b.p_client_key, guest_token: crypto.randomUUID(), decided_by_name: null, created_at: now, updated_at: now,
        };
        d.bookings.push(r); save(d);
        return reply(200, outB(r));
      }
      if (name === 'my_booking') {
        const r = (d.bookings || []).find((x) => x.id === b.p_id && x.guest_token === b.p_token && new Date(x.at).getTime() > Date.now() - 86400000);
        return reply(200, r ? [{ id: r.id, no: r.no, status: r.status, at: r.at, people: r.people, table_label: r.table_label || null }] : []);
      }
      if (name === 'cancel_booking') {
        const r = (d.bookings || []).find((x) => x.id === b.p_id && x.guest_token === b.p_token && ['new', 'confirmed'].includes(x.status) && new Date(x.at).getTime() > Date.now());
        if (!r) return fail('not_found');
        r.status = 'cancelled'; r.decided_by_name = null; r.updated_at = new Date().toISOString();
        save(d); return reply(200, 'cancelled');
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
        try { applyStock(d, [], o.items); } catch (ex) { return fail(ex.message); }
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
        : table === 'dishes' ? d.dishes.filter((x) => !x.hidden && shownCats.has(x.category_id))
          : table === 'promos' ? (d.promos ?? demoPromos()).filter((x) => x.active).sort(promoSort)
            .map(({ id, video_url, poster_url, title, sort, duration_s }) => ({ id, video_url, poster_url, title, sort, duration_s })) : null;
    return new Response(JSON.stringify(data ?? { message: 'not found' }), { status: data ? 200 : 404, headers: { 'Content-Type': 'application/json' } });
  };
})();

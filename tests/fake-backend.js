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
        default_language: M.defaultLanguage, tables_count: 10,
      },
      categories: M.categories.map((c, i) => ({ id: c.id, name: c.name, sort: (i + 1) * 10, hidden: false })),
      dishes: M.dishes.map((d, i) => ({
        id: d.id, category_id: d.category, name: d.name, desc: d.desc || {}, ingredients: d.ingredients || {},
        price: d.price, weight: d.weight ?? null, unit: d.unit || 'g', kcal: d.kcal ?? null, photo_url: null,
        tags: d.tags || [], allergens: d.allergens || [], sort: (i + 1) * 10, hidden: false, available: true,
      })),
      staff: [
        { user_id: 'u-owner', email: 'owner@example.com', name: 'Владелец', role: 'owner', active: true, created_at: '2026-01-01' },
        { user_id: 'u-waiter', email: 'waiter@example.com', name: 'Азиз', role: 'waiter', active: true, created_at: '2026-01-02' },
      ],
      invites: [],
    };
  }
  const db = () => { try { return JSON.parse(localStorage.getItem(KEY)) || seed(); } catch { return seed(); } };
  const save = (d) => localStorage.setItem(KEY, JSON.stringify(d));
  if (!localStorage.getItem(KEY)) save(seed());
  const role = () => localStorage.getItem('fake:role') || '';
  const delay = () => new Promise((r) => setTimeout(r, Number(localStorage.getItem('fake:delay') || 60)));
  const owner = () => { if (role() !== 'owner') throw new Error('permission denied'); };
  const uid = () => (role() === 'owner' ? 'u-owner' : 'u-waiter');

  window.MENU_BACKEND = { url: 'https://fake.supabase.co', key: 'sb_publishable_FAKE' };

  window.STAFF_TEST_API = {
    async session() { await delay(); return role() ? { user: { id: uid() } } : null; },
    async signIn(email) { await delay(); if (email.includes('wrong')) throw new Error('Invalid login credentials'); localStorage.setItem('fake:role', email.startsWith('owner') ? 'owner' : 'waiter'); },
    async signUp() { await delay(); return { needsEmailConfirm: true }; },
    async resetPassword() { await delay(); },
    async signOut() { localStorage.removeItem('fake:role'); },
    async whoami() {
      await delay();
      const r = role();
      if (!r) return null;
      const base = { user_id: uid(), email: r === 'owner' ? 'owner@example.com' : 'waiter@example.com', name: r === 'owner' ? 'Владелец' : 'Азиз' };
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
    async patchDish(id, p) { await delay(); owner(); const d = db(); const i = d.dishes.findIndex((x) => x.id === id); d.dishes[i] = { ...d.dishes[i], ...p }; save(d); return d.dishes[i]; },
    async deleteDish(id) { await delay(); owner(); const d = db(); d.dishes = d.dishes.filter((x) => x.id !== id); save(d); },
    async uploadImage(blob) { await delay(); owner(); return new Promise((res) => { const fr = new FileReader(); fr.onload = () => res(fr.result); fr.readAsDataURL(blob); }); },
    async deleteImage() {},
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
    const table = u.split('/rest/v1/')[1].split('?')[0];
    const shownCats = new Set(d.categories.filter((c) => !c.hidden).map((c) => c.id));
    const data = table === 'settings' ? [d.settings]
      : table === 'categories' ? d.categories.filter((c) => !c.hidden)
        : table === 'dishes' ? d.dishes.filter((x) => !x.hidden && shownCats.has(x.category_id)) : null;
    return new Response(JSON.stringify(data ?? { message: 'not found' }), { status: data ? 200 : 404, headers: { 'Content-Type': 'application/json' } });
  };
})();

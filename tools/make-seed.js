// Делает supabase/seed.sql из data.js: стартовое меню и настройки для базы.
// Запуск: node tools/make-seed.js
// Повторный запуск seed.sql в Supabase ничего не перезапишет: блюда, которые уже есть, остаются как есть.
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const root = path.join(__dirname, '..');
const ctx = { window: {} };
vm.runInNewContext(fs.readFileSync(path.join(root, 'data.js'), 'utf8'), ctx);
const M = ctx.window.MENU;
const R = M.restaurant;

const q = (s) => (s == null ? 'null' : `'${String(s).replace(/'/g, "''")}'`);
const j = (o) => `${q(JSON.stringify(o ?? {}))}::jsonb`;
const arr = (a) => `array[${(a || []).map(q).join(', ')}]::text[]`;
const tr = (o) => (typeof o === 'string' ? { ru: o, uz: o, en: o, ar: o, ms: o, zh: o } : o || {});

const out = [];
out.push('-- Сгенерировано tools/make-seed.js из data.js. Стартовое меню и настройки.');
out.push('-- Запускать после schema.sql. Повторный запуск ничего не перезапишет.');
out.push('-- ВНИМАНИЕ: цены, вес, калории и описания — примерные; вид мяса и состав не заполнены. Владелец меняет их в своей панели.');
out.push('');
out.push(`update public.settings set
  name = ${q(typeof R.name === 'string' ? R.name : R.name.en)},
  tagline = ${j(tr(R.tagline))},
  currency = ${q(R.currency)},
  currency_before = ${R.currencyBefore ? 'true' : 'false'},
  timezone = ${q(R.timezone || 'Asia/Kuala_Lumpur')},
  halal = ${R.halal ? 'true' : 'false'},
  schedule = ${j(R.schedule)},
  address = ${j(R.address || {})},
  phone = ${q(R.phone || '')},
  footer = ${j(tr(R.footer))},
  default_language = ${q(M.defaultLanguage || 'en')}
where id = 1 and name = 'Restaurant';  -- только если настройки ещё не трогали`);
out.push('');

M.categories.forEach((c, i) => {
  out.push(`insert into public.categories (id, name, sort) values (${q(c.id)}, ${j(c.name)}, ${(i + 1) * 10}) on conflict (id) do nothing;`);
});
out.push('');

const sortIn = {};
M.dishes.forEach((d) => {
  sortIn[d.category] = (sortIn[d.category] || 0) + 10;
  out.push(`insert into public.dishes (id, category_id, name, "desc", ingredients, price, weight, unit, kcal, tags, allergens, meat, sort, hidden)
values (${q(d.id)}, ${q(d.category)}, ${j(d.name)}, ${j(d.desc)}, ${j(d.ingredients)}, ${Number(d.price)}, ${d.weight ?? 'null'}, ${q(d.unit || 'g')}, ${d.kcal ?? 'null'}, ${arr(d.tags)}, ${arr(d.allergens)}, ${arr(d.meat)}, ${sortIn[d.category]}, ${d.hidden ? 'true' : 'false'})
on conflict (id) do nothing;`);
});
out.push('');

fs.writeFileSync(path.join(root, 'supabase', 'seed.sql'), out.join('\n'));
console.log(`seed.sql: ${M.categories.length} categories, ${M.dishes.length} dishes`);

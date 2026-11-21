// Проверки интерфейса без браузера: нет эмодзи, переводы полные, нет секретов.
const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const root = path.join(__dirname, '..');
const UI_FILES = ['index.html', 'admin.html', 'waiter.html', 'owner.html', 'print.html', 'icons.svg', 'icon.svg',
  'app.js', 'data.js', 'schedule.js', 'staff-core.js', 'staff-api.js', 'waiter.js', 'owner.js',
  'kitchen.html', 'kitchen.js', 'floor.js', 'owner-reports.js', 'staff-i18n.js', 'staff-tools.js', 'stop-list.js', 'staff-shift.js',
  'styles.css', 'staff.css', 'supabase/seed.sql'];

test('в интерфейсе нет эмодзи', () => {
  const emoji = /[\p{Extended_Pictographic}\u{1F1E6}-\u{1F1FF}\u{FE0F}]/u;
  for (const f of UI_FILES) {
    const lines = fs.readFileSync(path.join(root, f), 'utf8').split('\n');
    lines.forEach((line, i) => {
      // © и ™ в коде нет; «→» и «×» не эмодзи
      assert.ok(!emoji.test(line), `${f}:${i + 1} содержит эмодзи: ${line.trim().slice(0, 80)}`);
    });
  }
});

test('у всех 6 языков одинаковый набор текстов', () => {
  const src = fs.readFileSync(path.join(root, 'app.js'), 'utf8');
  const block = src.slice(src.indexOf('const T = {'), src.indexOf('// ---------- Источники данных'));
  const T = vm.runInNewContext(`(${block.replace('const T = ', '').replace(/;\s*$/, '')})`);
  const langs = Object.keys(T);
  assert.deepStrictEqual(langs.sort(), ['ar', 'en', 'ms', 'ru', 'uz', 'zh']);
  const keys = (o) => Object.keys(o).sort();
  for (const l of langs) {
    assert.deepStrictEqual(keys(T[l]), keys(T.ru), `язык ${l}: не хватает или лишние ключи`);
    assert.deepStrictEqual(keys(T[l].tags), keys(T.ru.tags), `язык ${l}: метки`);
    assert.deepStrictEqual(keys(T[l].allergenNames), keys(T.ru.allergenNames), `язык ${l}: аллергены`);
    assert.strictEqual(T[l].days.length, 7, `язык ${l}: дни недели`);
    for (const d of [0, 6]) assert.ok(T[l].opensOn(d, '10:00').includes('10:00'));
  }
});

test('все блюда и категории data.js переведены на 6 языков', () => {
  const ctx = { window: {} };
  vm.runInNewContext(fs.readFileSync(path.join(root, 'data.js'), 'utf8'), ctx);
  const M = ctx.window.MENU;
  for (const item of [...M.categories, ...M.dishes]) {
    for (const l of M.languages) assert.ok(item.name[l], `${item.id}: нет названия (${l})`);
  }
  assert.strictEqual(M.restaurant.phone, '', 'выдуманный телефон не должен попадать на сайт');
  assert.strictEqual(M.restaurant.address, null, 'выдуманный адрес не должен попадать на сайт');
});

test('в репозитории нет секретных ключей', () => {
  const files = fs.readdirSync(root).filter((f) => /\.(js|html|md|sql)$/.test(f))
    .concat(fs.readdirSync(path.join(root, 'supabase')).filter((f) => f.endsWith('.sql')).map((f) => `supabase/${f}`));
  for (const f of files) {
    const s = fs.readFileSync(path.join(root, f), 'utf8');
    assert.ok(!/sb_secret_[A-Za-z0-9]/.test(s), `${f}: secret key`);
    assert.ok(!/service_role"\s*:\s*"eyJ|SUPABASE_SERVICE_ROLE_KEY\s*=\s*eyJ/.test(s), `${f}: service_role key`);
  }
});

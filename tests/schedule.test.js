// Проверка «Открыто / Закрыто»: часовые пояса, выходные, работа после полуночи.
const test = require('node:test');
const assert = require('node:assert');
const S = require('../schedule.js');

const day = (open, close, closed = false) => ({ closed, open, close });
const daily = (o, c) => Array.from({ length: 7 }, () => day(o, c));
// 2026-11-16 — понедельник
const at = (iso) => new Date(iso);

test('обычный день 10:00–22:00 (Куала-Лумпур, UTC+8)', () => {
  const s = daily('10:00', '22:00');
  const tz = 'Asia/Kuala_Lumpur';
  assert.deepStrictEqual(S.status(s, tz, at('2026-11-16T01:59:00Z')), { open: false, opensIn: 0, opensDay: 0, opensAt: '10:00' }); // 09:59
  assert.deepStrictEqual(S.status(s, tz, at('2026-11-16T02:00:00Z')), { open: true, closesAt: '22:00' });                        // 10:00
  assert.deepStrictEqual(S.status(s, tz, at('2026-11-16T13:59:00Z')), { open: true, closesAt: '22:00' });                        // 21:59
  assert.deepStrictEqual(S.status(s, tz, at('2026-11-16T14:00:00Z')), { open: false, opensIn: 1, opensDay: 1, opensAt: '10:00' }); // 22:00 → завтра
});

test('время считается по ресторану, а не по телефону', () => {
  const s = daily('10:00', '22:00');
  const now = at('2026-11-16T03:00:00Z'); // 11:00 в КЛ, 08:00 в Ташкенте, 06:00 в Москве
  assert.strictEqual(S.status(s, 'Asia/Kuala_Lumpur', now).open, true);
  assert.strictEqual(S.status(s, 'Asia/Tashkent', now).open, false);
  assert.strictEqual(S.status(s, 'Europe/Moscow', now).open, false);
});

test('работа после полуночи 18:00–02:00', () => {
  const s = daily('18:00', '02:00');
  const tz = 'UTC';
  assert.deepStrictEqual(S.status(s, tz, at('2026-11-16T17:00:00Z')), { open: false, opensIn: 0, opensDay: 0, opensAt: '18:00' });
  assert.deepStrictEqual(S.status(s, tz, at('2026-11-16T23:30:00Z')), { open: true, closesAt: '02:00' });
  assert.deepStrictEqual(S.status(s, tz, at('2026-11-17T01:59:00Z')), { open: true, closesAt: '02:00' }); // вт 01:59 — ещё смена пн
  assert.deepStrictEqual(S.status(s, tz, at('2026-11-17T02:00:00Z')), { open: false, opensIn: 0, opensDay: 1, opensAt: '18:00' });
});

test('ночная смена накануне выходного: хвост остаётся открытым', () => {
  const s = daily('18:00', '02:00');
  s[1] = day('10:00', '22:00', true); // вторник — выходной
  assert.deepStrictEqual(S.status(s, 'UTC', at('2026-11-17T01:00:00Z')), { open: true, closesAt: '02:00' });
  assert.deepStrictEqual(S.status(s, 'UTC', at('2026-11-17T12:00:00Z')), { open: false, opensIn: 1, opensDay: 2, opensAt: '18:00' });
});

test('выходные: следующий рабочий день через несколько дней', () => {
  const s = daily('10:00', '22:00');
  s[5] = day('10:00', '22:00', true); // сб
  s[6] = day('10:00', '22:00', true); // вс
  // пятница 23:00 → откроемся в понедельник (через 3 дня)
  assert.deepStrictEqual(S.status(s, 'UTC', at('2026-11-20T23:00:00Z')), { open: false, opensIn: 3, opensDay: 0, opensAt: '10:00' });
});

test('все дни выходные и кривые данные', () => {
  const s = Array.from({ length: 7 }, () => day('10:00', '22:00', true));
  assert.deepStrictEqual(S.status(s, 'UTC', at('2026-11-16T12:00:00Z')), { open: false, never: true });
  assert.deepStrictEqual(S.status(null, 'UTC'), { open: false, never: true });
  assert.strictEqual(S.status(daily('10:00', '22:00'), 'Not/AZone', at('2026-11-16T12:00:00Z')).open !== undefined, true);
});

test('группировка дней с одинаковыми часами', () => {
  const s = daily('10:00', '22:00');
  s[5] = day('11:00', '23:00');
  s[6] = day('10:00', '22:00', true);
  const g = S.groups(s).map(({ from, to, closed, open, close }) => [from, to, closed, open, close]);
  assert.deepStrictEqual(g, [[0, 4, false, '10:00', '22:00'], [5, 5, false, '11:00', '23:00'], [6, 6, true, '10:00', '22:00']]);
});

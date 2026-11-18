// =====================================================================
//  Открыто или закрыто — по расписанию и часовому поясу ресторана.
//  Расписание: 7 дней с понедельника, { closed, open: 'HH:MM', close: 'HH:MM' }.
//  close меньше open — работа после полуночи (18:00–02:00 закрывается уже в следующий день).
//  Работает и в браузере (window.MenuSchedule), и в Node (для тестов).
// =====================================================================
(function (root) {
  'use strict';

  const WEEKDAYS = { Mon: 0, Tue: 1, Wed: 2, Thu: 3, Fri: 4, Sat: 5, Sun: 6 };
  const mins = (hhmm) => {
    const [h, m] = String(hhmm || '').split(':').map(Number);
    return (h || 0) * 60 + (m || 0);
  };
  const valid = (s) => Array.isArray(s) && s.length === 7;

  // день недели (0 = пн) и минуты от полуночи — по часам ресторана
  function localNow(timezone, now) {
    try {
      const parts = new Intl.DateTimeFormat('en-US', {
        timeZone: timezone || undefined, weekday: 'short', hour: '2-digit', minute: '2-digit', hourCycle: 'h23',
      }).formatToParts(now);
      const get = (t) => parts.find((p) => p.type === t).value;
      return { day: WEEKDAYS[get('weekday')], min: Number(get('hour')) % 24 * 60 + Number(get('minute')) };
    } catch {
      return { day: (now.getDay() + 6) % 7, min: now.getHours() * 60 + now.getMinutes() };
    }
  }

  /**
   * Статус прямо сейчас.
   * open: true  → { open, closesAt: 'HH:MM' }
   * open: false → { open, opensIn: 0 (сегодня) | 1 (завтра) | n дней, opensDay: 0..6, opensAt: 'HH:MM' }
   *               или { open: false, never: true }, если все дни выходные
   */
  function status(schedule, timezone, now = new Date()) {
    if (!valid(schedule)) return { open: false, never: true };
    const { day, min } = localNow(timezone, now);
    const today = schedule[day];
    const prev = schedule[(day + 6) % 7];

    // хвост вчерашней ночной смены (например, вчера 18:00–02:00, сейчас 01:00)
    if (prev && !prev.closed && mins(prev.close) < mins(prev.open) && min < mins(prev.close)) {
      return { open: true, closesAt: prev.close };
    }
    if (today && !today.closed) {
      const o = mins(today.open);
      const c = mins(today.close);
      if (c > o ? min >= o && min < c : min >= o) return { open: true, closesAt: today.close };
      if (min < o) return { open: false, opensIn: 0, opensDay: day, opensAt: today.open };
    }
    for (let k = 1; k <= 7; k++) {
      const d = (day + k) % 7;
      if (!schedule[d].closed) return { open: false, opensIn: k, opensDay: d, opensAt: schedule[d].open };
    }
    return { open: false, never: true };
  }

  // Дни с одинаковыми часами — вместе: [{ from: 0, to: 4, closed, open, close }, ...]
  function groups(schedule) {
    if (!valid(schedule)) return [];
    const key = (d) => (d.closed ? 'closed' : `${d.open}-${d.close}`);
    const out = [];
    schedule.forEach((d, i) => {
      const last = out[out.length - 1];
      if (last && last.key === key(d) && last.to === i - 1) last.to = i;
      else out.push({ key: key(d), from: i, to: i, closed: !!d.closed, open: d.open, close: d.close });
    });
    return out;
  }

  const api = { status, groups, localNow, mins };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.MenuSchedule = api;
})(typeof window !== 'undefined' ? window : globalThis);

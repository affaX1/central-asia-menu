(() => {
  'use strict';

  // =====================================================================
  //  Панель владельца: «Отчёты» (выручка, топ блюд, оплата, часы, столы,
  //  официанты, выгрузка в Excel) и «Журнал» (кто, когда и что поменял).
  //  Данные читает база с правами владельца.
  // =====================================================================

  const S = window.Staff;
  const { esc, icon, tr, money } = S;
  const PAY = { cash: 'Наличные', card: 'Карта', qr: 'QR', other: 'Другое', mixed: 'Раздельно' };
  const r2 = (x) => Math.round(x * 100) / 100;
  const pad = (n) => String(n).padStart(2, '0');
  const ymd = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  const startOf = (d) => { const x = new Date(d); x.setHours(0, 0, 0, 0); return x; };
  const addDays = (d, n) => { const x = new Date(d); x.setDate(x.getDate() + n); return x; };
  const dm = (d) => d.toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' });
  const optNames = (i) => (i.opts || []).map((o) => tr(o.name)).filter(Boolean);

  function periodRange(p, from, to) {
    const today = startOf(new Date());
    if (p === 'today') return [today, addDays(today, 1)];
    if (p === 'yesterday') return [addDays(today, -1), today];
    if (p === '7') return [addDays(today, -6), addDays(today, 1)];
    if (p === '30') return [addDays(today, -29), addDays(today, 1)];
    if (p === 'month') return [new Date(today.getFullYear(), today.getMonth(), 1), addDays(today, 1)];
    if (p === 'prev') return [new Date(today.getFullYear(), today.getMonth() - 1, 1), new Date(today.getFullYear(), today.getMonth(), 1)];
    const f = from ? startOf(new Date(`${from}T00:00:00`)) : today;
    const t = to ? addDays(startOf(new Date(`${to}T00:00:00`)), 1) : addDays(f, 1);
    return [f, t > f ? t : addDays(f, 1)];
  }

  // столбики одного цвета: подпись и значение при наведении/касании, таблица — ниже.
  // r.v — число (для денег — в сенах), r.tip — готовая подпись; anim — столбики «вырастают» (только при первом показе отчёта)
  function bars(rows, fmt, { compact = false, anim = false } = {}) {
    const max = Math.max(0, ...rows.map((r) => r.v));
    if (!max) return '<p class="a-empty" style="padding:14px 0">Нет данных за этот период.</p>';
    const tipOf = (r) => r.tip || `${r.k}: ${fmt(r.v)}`;
    return `<div class="rp-bars${compact ? ' compact' : ''}${anim ? ' rp-grow' : ''}" role="img" aria-label="${esc(rows.map(tipOf).join('; '))}">
      ${rows.map((r, i) => `<div class="rp-bar" tabindex="0" data-tip="${esc(tipOf(r))}"><span class="rp-col" style="height:${Math.max(r.v ? 3 : 0, Math.round((r.v / max) * 100))}%;--i:${Math.min(i, 30)}"></span><span class="rp-x">${esc(r.short ?? r.k)}</span></div>`).join('')}
    </div>`;
  }
  function hbars(rows, fmt, sub) {
    const max = Math.max(0, ...rows.map((r) => r.v));
    if (!max) return '<p class="a-empty" style="padding:14px 0">Нет данных за этот период.</p>';
    return `<ul class="rp-h">${rows.map((r) => `<li><span class="rp-h-name">${esc(r.k)}${sub ? `<small>${esc(sub(r))}</small>` : ''}</span>
      <span class="rp-h-track"><span style="width:${Math.max(2, Math.round((r.v / max) * 100))}%"></span></span><b>${esc(fmt(r.v))}</b></li>`).join('')}</ul>`;
  }

  function csv(name, head, rows) {
    const cell = (v) => { const s = String(v ?? ''); return /[";\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s; };
    const text = '﻿' + [head, ...rows].map((r) => r.map(cell).join(';')).join('\r\n');
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([text], { type: 'text/csv;charset=utf-8' }));
    a.download = name;
    document.body.appendChild(a);
    a.click();
    setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 1000);
  }
  const num = (x) => String(r2(Number(x) || 0)).replace('.', ',');

  // ---------------- ОТЧЁТЫ ----------------
  const R = { period: '7', from: '', to: '', orders: [], bills: [], reviews: [], loaded: '', loading: false, error: '',
    prevBills: null, votes: null, shifts: null, costs: null, animKey: '' };
  const sen = (x) => Math.round((Number(x) || 0) * 100);   // деньги считаем в сенах (целых), чтобы не копились ошибки округления
  const fromSen = (n) => n / 100;
  const pct = (a, b) => (b ? Math.round((a / b) * 100) : 0);

  // прошлый такой же период для сравнения. Текущий берём только до «сейчас», прошлый — той же длины,
  // иначе «сегодня до обеда» сравнивалось бы с целым вчерашним днём.
  function prevRange(p, f, t) {
    const now = new Date();
    const end = t > now ? now : t;
    const span = Math.max(0, end - f);
    const n = Math.max(1, Math.round((t - f) / 864e5));
    let pf;
    let pt;
    let label;
    if (p === 'month') { pf = new Date(f.getFullYear(), f.getMonth() - 1, 1); pt = new Date(Math.min(pf.getTime() + span, f.getTime())); label = 'к тем же дням прошлого месяца'; }
    else if (p === 'prev') { pf = new Date(f.getFullYear(), f.getMonth() - 1, 1); pt = f; label = 'к позапрошлому месяцу'; }
    else {
      pf = addDays(f, -n); pt = new Date(Math.min(pf.getTime() + span, f.getTime()));
      label = p === 'today' ? 'ко вчера на это же время' : p === 'yesterday' ? 'к позавчера' : p === '7' ? 'к прошлой неделе'
        : p === '30' ? 'к прошлым 30 дням' : n === 1 ? 'к предыдущему дню' : `к предыдущим ${n} дн.`;
    }
    return { pf, pt, end, label };
  }

  async function loadReports(ctx) {
    const api = ctx.api;
    const [f, t] = periodRange(R.period, R.from, R.to);
    const key = `${f.toISOString()}|${t.toISOString()}`;
    if (R.loaded === key || R.loading) return;
    R.loading = true;
    R.error = '';
    const { pf, pt } = prevRange(R.period, f, t);
    const fi = f.toISOString();
    const ti = t.toISOString();
    // дополнительные части отчёта не должны ломать основной: если не загрузились — пишем это в своей панели
    const soft = (fn) => (fn ? fn().catch(() => null) : Promise.resolve(null));
    try {
      const [o, b, rv, pb, votes, shifts, costs] = await Promise.all([api.orders(fi, ti), api.bills(fi, ti),
        api.reviews ? api.reviews(fi, ti).catch(() => []) : [],
        pt > pf ? soft(() => api.bills(pf.toISOString(), pt.toISOString())) : Promise.resolve([]),
        soft(api.dishVotes && (() => api.dishVotes(fi, ti))),
        soft(api.shifts && (() => api.shifts(fi, ti))),
        // себестоимость видит только владелец (менеджеру база всё равно вернёт пусто)
        ctx.role === 'owner' ? soft(api.dishCosts && (() => api.dishCosts())) : Promise.resolve(null)]);
      R.orders = o;
      // отменённые оплаты не считаются в деньгах — показываем их отдельным списком
      R.bills = b.filter((x) => !x.voided_at);
      R.voided = b.filter((x) => x.voided_at);
      R.reviews = rv;
      R.prevBills = pb ? pb.filter((x) => !x.voided_at && new Date(x.paid_at) < pt) : null;
      R.votes = votes;
      R.shifts = shifts;
      R.costs = costs;
      R.loaded = key;
    } catch (ex) { R.error = S.errText(ex); }
    R.loading = false;
  }

  // ---------- Доставка своим курьером ----------
  // Доставленные (served) заказы с kind = 'delivery' за период: сколько, выручка (с платой за доставку),
  // сколько взяли за доставку, среднее расстояние; кто сколько отвёз. Деньги — в сенах.
  // В «Столы», «Скорость подачи» и «Подали заказов» доставка не попадает — она здесь.
  const isDeliv = (o) => o.kind === 'delivery';
  function deliveryHtml() {
    const all = R.orders.filter(isDeliv);
    if (!all.length) return '';
    const done = all.filter((o) => o.status === 'served');
    const cancelled = all.filter((o) => o.status === 'cancelled').length;
    const noAnswer = all.filter((o) => o.status === 'cancelled' && o.cancel_reason === 'no_answer').length;   // «не дозвонились»
    const toCall = all.filter((o) => o.status === 'confirm').length;                                         // ещё ждут звонка
    const open = all.length - done.length - cancelled - toCall;
    const rev = done.reduce((s2, o) => s2 + sen(o.total), 0);
    const fees = done.reduce((s2, o) => s2 + sen(o.delivery_fee), 0);
    const kms = done.map((o) => Number(o.distance_km)).filter((x) => Number.isFinite(x));
    const avgKm = kms.length ? Math.round((kms.reduce((a, b) => a + b, 0) / kms.length) * 10) / 10 : null;
    const byCourier = new Map();
    for (const o of done) {
      const k = o.courier_name || '—';
      const r = byCourier.get(k) || { k, v: 0, n: 0 };
      r.v += 1;
      r.n += sen(o.total);
      byCourier.set(k, r);
    }
    return `<section class="panel"><div class="panel-head"><h3>Доставка<small>${done.length}</small></h3></div><div class="panel-body">
      <div class="a-stats" style="margin-bottom:10px">
        <div class="a-stat"><b>${done.length}</b><span>доставлено${open ? ` · ещё в работе ${open}` : ''}${toCall ? ` · ждут звонка ${toCall}` : ''}${cancelled ? ` · отменено ${cancelled}${noAnswer ? ` (не дозвонились ${noAnswer})` : ''}` : ''}</span></div>
        <div class="a-stat"><b>${money(fromSen(rev))}</b><span>выручка доставки</span></div>
        <div class="a-stat"><b>${money(fromSen(fees))}</b><span>из них плата за доставку</span></div>
        <div class="a-stat"><b>${avgKm === null ? '—' : `${String(avgKm).replace('.', ',')} км`}</b><span>среднее расстояние</span></div>
      </div>
      ${byCourier.size ? `<p class="section-label" style="margin-top:0">Курьеры: доставок</p>${hbars([...byCourier.values()].sort((a, b) => b.v - a.v), (v) => `${v}`, (r) => money(fromSen(r.n)))}` : ''}
      <p class="help" style="margin:10px 0 0">Выручка — сумма доставленных заказов вместе с платой за доставку (она же входит в «Оплачено»). Расстояние — по прямой от ресторана.</p>
    </div></section>`;
  }

  // ---------- Скорость подачи: от заказа до «Подано» ----------
  // Не считаем заказы, отмеченные «подано» только при оплате (у них нет настоящего времени подачи),
  // и явные забытые (больше 4 часов).
  function speedHtml(valid) {
    const served = valid.filter((o) => o.status === 'served' && o.served_at);
    const auto = served.filter((o) => o.paid_at && Math.abs(new Date(o.served_at) - new Date(o.paid_at)) < 5000);
    const rows = served.filter((o) => !auto.includes(o)).map((o) => ({ o, m: (new Date(o.served_at) - new Date(o.created_at)) / 60000 })).filter((x) => x.m >= 0 && x.m <= 240);
    const head = '<section class="panel"><div class="panel-head"><h3>Скорость подачи</h3></div><div class="panel-body">';
    if (rows.length < 3) {
      return `${head}<p class="a-empty" style="padding:8px 0">Мало данных: нужно хотя бы 3 заказа, где официант нажал «Подано».${auto.length ? ` Ещё ${auto.length} отмечены поданными только при оплате — их время не настоящее.` : ''}</p></div></section>`;
    }
    const ms = rows.map((x) => x.m).sort((a, b) => a - b);
    const q = (p) => ms[Math.min(ms.length - 1, Math.floor(p * ms.length))];
    const avg = ms.reduce((a, b) => a + b, 0) / ms.length;
    const fmt = (m) => `${Math.round(m)} мин`;
    const groupAvg = (keyf) => {
      const m = new Map();
      for (const x of rows) { for (const k of [].concat(keyf(x.o)).filter(Boolean)) { const r = m.get(k) || { k, sum: 0, n: 0 }; r.sum += x.m; r.n += 1; m.set(k, r); } }
      return [...m.values()].map((r) => ({ k: r.k, v: Math.round(r.sum / r.n), n: r.n }));
    };
    const byWaiter = groupAvg((o) => o.served_by_name).sort((a, b) => b.v - a.v);
    const byHour = groupAvg((o) => `${pad(new Date(o.created_at).getHours())}:00`).sort((a, b) => a.k.localeCompare(b.k));
    const slowDish = groupAvg((o) => [...new Set((o.items || []).map((i) => tr(i.name) || i.id))]).filter((r) => r.n >= 3).sort((a, b) => b.v - a.v).slice(0, 8);
    const late = ms.filter((m) => m > 30).length;
    return `${head}
      <div class="a-stats" style="margin-top:0">
        <div class="a-stat"><b>${fmt(avg)}</b><span>в среднем от заказа до подачи</span></div>
        <div class="a-stat"><b>${fmt(q(0.5))}</b><span>половина заказов — быстрее</span></div>
        <div class="a-stat"><b>${fmt(q(0.9))}</b><span>9 из 10 заказов — быстрее</span></div>
        <div class="a-stat${late ? ' hot' : ''}"><b>${late}</b><span>заказов дольше 30 мин</span></div>
      </div>
      <div class="rp-two">
        <div><p class="section-label">Официанты (в среднем)</p>${hbars(byWaiter, fmt, (r) => `заказов: ${r.n}`)}</div>
        <div><p class="section-label">По часам (в среднем)</p>${hbars(byHour, fmt, (r) => `заказов: ${r.n}`)}</div>
      </div>
      ${slowDish.length ? `<p class="section-label">Самые долгие блюда (заказы с этим блюдом)</p>${hbars(slowDish, fmt, (r) => `заказов: ${r.n}`)}` : ''}
      <p class="help">Учтено заказов: ${rows.length}.${auto.length ? ` Не учтено ${auto.length}: «Подано» не нажали, заказ отметился сам при оплате.` : ''} Чтобы цифры были точными, официанты должны нажимать «Подано», когда приносят заказ.</p>
    </div></section>`;
  }

  function reports(main, ctx) {
    const [f, t] = periodRange(R.period, R.from, R.to);
    const key = `${f.toISOString()}|${t.toISOString()}`;
    if (R.loaded !== key) {
      main.innerHTML = `${toolbar()}<p class="a-empty">${R.error ? esc(R.error) : 'Считаем…'}</p>`;
      if (!R.error) loadReports(ctx).then(() => { if (location.hash === '#reports') reports(main, ctx); });
      return;
    }
    // доставка, которая ждёт звонка, — ещё не заказ: не выручка и не «не оплачено»
    const valid = R.orders.filter((o) => o.status !== 'cancelled' && o.status !== 'confirm');
    const cancelled = R.orders.filter((o) => o.status === 'cancelled');
    const sales = r2(valid.reduce((s, o) => s + Number(o.total), 0));
    const paid = r2(R.bills.reduce((s, b) => s + Number(b.total), 0));
    const unpaid = r2(valid.filter((o) => !o.paid_at).reduce((s, o) => s + Number(o.total), 0));
    const avg = R.bills.length ? r2(paid / R.bills.length) : (valid.length ? r2(sales / valid.length) : 0);
    const service = r2(valid.reduce((s, o) => s + Number(o.service || 0), 0));
    const tax = r2(valid.reduce((s, o) => s + Number(o.tax || 0), 0));

    // выручка (оплаченные счета, без отменённых оплат) по дням — в сенах; в таблице рядом продажи по заказам
    const days = [];
    for (let d = new Date(f); d < t; d = addDays(d, 1)) days.push(new Date(d));
    const dayRev = new Map();
    for (const b of R.bills) { const k = ymd(new Date(b.paid_at)); const r = dayRev.get(k) || { v: 0, n: 0 }; r.v += sen(b.total); r.n += 1; dayRev.set(k, r); }
    const daySales = new Map();
    for (const o of valid) { const k = ymd(new Date(o.created_at)); daySales.set(k, (daySales.get(k) || 0) + sen(o.total)); }
    const byDay = days.map((d) => {
      const k = ymd(d);
      const r = dayRev.get(k) || { v: 0, n: 0 };
      const name = d.toLocaleDateString('ru-RU', { weekday: 'short', day: 'numeric', month: 'short' });
      return { k: name, short: days.length > 16 ? String(d.getDate()) : dm(d), v: r.v, n: r.n, sales: daySales.get(k) || 0, date: k,
        tip: `${name}: ${money(fromSen(r.v))}${r.n ? ` · счетов ${r.n}` : ''}` };
    });
    // выручка по часам дня (когда платят) и сколько заказов сделали в этот час
    const hourRev = Array.from({ length: 24 }, () => ({ v: 0, n: 0, orders: 0 }));
    for (const b of R.bills) { const h = hourRev[new Date(b.paid_at).getHours()]; h.v += sen(b.total); h.n += 1; }
    for (const o of valid) hourRev[new Date(o.created_at).getHours()].orders += 1;
    const firstH = hourRev.findIndex((x) => x.v || x.orders);
    const lastH = 23 - [...hourRev].reverse().findIndex((x) => x.v || x.orders);
    const byHour = firstH < 0 ? [] : hourRev.slice(firstH, lastH + 1).map((x, i) => {
      const h = firstH + i;
      return { k: `${pad(h)}:00–${pad(h)}:59`, short: String(h), v: x.v,
        tip: `${pad(h)}:00–${pad(h)}:59: ${money(fromSen(x.v))}${x.n ? ` · счетов ${x.n}` : ''}${x.orders ? ` · заказов ${x.orders}` : ''}` };
    });
    // сравнение с прошлым таким же периодом
    const cmp = prevRange(R.period, f, t);
    const curRev = R.bills.filter((b) => new Date(b.paid_at) < cmp.end).reduce((s, b) => s + sen(b.total), 0);
    const prevRev = R.prevBills ? R.prevBills.reduce((s, b) => s + sen(b.total), 0) : null;
    let cmpHtml = '';
    if (prevRev === null) cmpHtml = '<span class="rp-cmp">прошлый период не загрузился</span>';
    else if (prevRev > 0) {
      const d = Math.round(((curRev - prevRev) / prevRev) * 100);
      cmpHtml = `<span class="rp-cmp ${d > 0 ? 'up' : d < 0 ? 'down' : ''}" title="${esc(`${money(fromSen(curRev))} против ${money(fromSen(prevRev))}`)}">${d > 0 ? '+' : d < 0 ? '−' : ''}${Math.abs(d)}% ${esc(cmp.label)}</span>`;
    } else if (curRev > 0) cmpHtml = `<span class="rp-cmp">в прошлом таком же периоде выручки не было</span>`;
    const cmpNote = prevRev !== null && (prevRev > 0 || curRev > 0)
      ? `<p class="help" style="margin:10px 0 0">Сравнение: ${money(fromSen(curRev))} за этот период и ${money(fromSen(prevRev))} за прошлый (${esc(dm(cmp.pf))} — ${esc(dm(new Date(cmp.pt - 1)))}). Текущий период считаем до этой минуты, прошлый — той же длины.</p>` : '';
    // столбики «вырастают» только при первом показе этого отчёта, а не при каждой перерисовке
    const anim = R.animKey !== key;
    R.animKey = key;
    // топ блюд
    const dishMap = new Map();
    for (const o of valid) for (const i of o.items || []) {
      const d = dishMap.get(i.id) || { k: tr(i.name) || i.id, qty: 0, v: 0 };
      d.qty += Number(i.qty);
      d.v = r2(d.v + Number(i.price) * Number(i.qty));
      dishMap.set(i.id, d);
    }
    const top = [...dishMap.values()].sort((a, b) => b.qty - a.qty || b.v - a.v);
    // оплата
    // оплата по способам: раздельные счета делятся на части; суммы — с чаевыми, как пришли деньги
    const parts = R.bills.flatMap((b) => (b.payments?.length ? b.payments : [{ method: b.method, amount: Number(b.total) + Number(b.tip || 0) }]));
    const byPay = ['cash', 'card', 'qr', 'other'].map((m) => ({ k: PAY[m], v: r2(parts.filter((p) => p.method === m).reduce((s, p) => s + Number(p.amount), 0)), n: parts.filter((p) => p.method === m).length })).filter((r) => r.n);
    const tips = r2(R.bills.reduce((s, b) => s + Number(b.tip || 0), 0));
    const discBills = R.bills.filter((b) => Number(b.discount) > 0);
    const discounts = r2(discBills.reduce((s, b) => s + Number(b.discount), 0));
    const received = r2(parts.reduce((s, p) => s + Number(p.amount), 0));
    // столы и официанты
    const group = (list, keyf, valf) => {
      const m = new Map();
      for (const x of list) { const k = keyf(x); if (!k) continue; const r = m.get(k) || { k, v: 0, n: 0 }; r.v = r2(r.v + valf(x)); r.n += 1; m.set(k, r); }
      return [...m.values()].sort((a, b) => b.v - a.v);
    };
    // столы — без доставки (у неё свой раздел «Доставка»)
    const byTable = group(valid.filter((o) => !isDeliv(o)), (o) => `Стол ${o.table_label}`, (o) => Number(o.total));
    const discBy = group(discBills, (b) => b.discount_reason || '—', (b) => Number(b.discount));
    const byWaiter = group(valid.filter((o) => o.status === 'served' && !isDeliv(o)), (o) => o.served_by_name || o.created_by_name || o.accepted_by_name, () => 1);
    const byCashier = group(R.bills, (b) => b.paid_by_name, (b) => Number(b.total));
    const tipsBy = group(R.bills.filter((b) => Number(b.tip) > 0), (b) => b.paid_by_name, (b) => Number(b.tip));

    const speed = speedHtml(valid.filter((o) => !isDeliv(o)));
    main.innerHTML = `
      ${toolbar()}
      <p class="help">${esc(dm(f))} — ${esc(dm(addDays(t, -1)))} · «Продажи» — все не отменённые заказы; «Оплачено» — закрытые счета.</p>
      <div class="a-stats rp-stats">
        <div class="a-stat"><b>${money(sales)}</b><span>продажи · заказов ${valid.length}</span></div>
        <div class="a-stat"><b>${money(paid)}</b><span>оплачено · счетов ${R.bills.length}</span></div>
        <div class="a-stat"><b>${money(avg)}</b><span>средний чек</span></div>
        <div class="a-stat${unpaid ? ' hot' : ''}"><b>${money(unpaid)}</b><span>не оплачено</span></div>
      </div>
      ${service || tax || cancelled.length || tips || discounts ? `<p class="help">${discounts ? `Скидки: −${money(discounts)} (счетов ${discBills.length}). ` : ''}${tips ? `Чаевые: ${money(tips)}. ` : ''}${service ? `Сервисный сбор: ${money(service)}. ` : ''}${tax ? `Налог: ${money(tax)}. ` : ''}${cancelled.length ? `Отменено заказов: ${cancelled.length} на ${money(cancelled.reduce((s, o) => s + Number(o.total), 0))}.` : ''}</p>` : ''}
      <section class="panel"><div class="panel-head"><h3>Выручка по дням</h3>${cmpHtml}</div><div class="panel-body">
        ${bars(byDay, (v) => money(fromSen(v)), { compact: byDay.length > 16, anim })}
        ${cmpNote}
        <details class="rp-table"><summary>Таблицей</summary><table><thead><tr><th>День</th><th>Выручка</th><th>Счетов</th><th>Продажи (заказы)</th></tr></thead><tbody>${byDay.map((r) => `<tr><td>${esc(r.k)}</td><td>${money(fromSen(r.v))}</td><td>${r.n}</td><td>${money(fromSen(r.sales))}</td></tr>`).join('')}</tbody></table></details>
      </div></section>
      <div class="rp-two">
        <section class="panel"><div class="panel-head"><h3>Популярные блюда<small>${top.length}</small></h3></div><div class="panel-body">
          ${hbars(top.slice(0, 12).map((d) => ({ k: d.k, v: d.qty, sum: d.v })), (v) => `${v} шт.`, (r) => money(r.sum))}
          ${top.length > 12 ? `<details class="rp-table"><summary>Все блюда</summary><table><tbody>${top.map((d) => `<tr><td>${esc(d.k)}</td><td>${d.qty} шт.</td><td>${money(d.v)}</td></tr>`).join('')}</tbody></table></details>` : ''}
        </div></section>
        ${(R.voided || []).length ? `<section class="panel"><div class="panel-head"><h3>Отменённые оплаты<small>${R.voided.length}</small></h3></div><div class="panel-body">
          <ul class="z-hist">${R.voided.map((b) => `<li><span><b>Чек №${esc(b.no)}</b> · ${b.table_id || !Number(b.delivery_fee) ? `стол ${esc(b.table_label)}` : 'доставка'} · ${esc(new Date(b.paid_at).toLocaleString('ru-RU', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }))}<br><small>${esc(b.voided_by_name || '')}: ${esc(b.void_reason || '')}</small></span><b>${money(b.total)}</b></li>`).join('')}</ul>
          <p class="help">Эти суммы не входят в «Оплачено». Заказы таких чеков оплачиваются заново или отменяются.</p></div></section>` : ''}
        ${discBy.length ? `<section class="panel"><div class="panel-head"><h3>Скидки по причинам<small>−${money(discounts)}</small></h3></div><div class="panel-body">${hbars(discBy, money, (r) => `счетов: ${r.n}`)}</div></section>` : ''}
        <section class="panel"><div class="panel-head"><h3>Способы оплаты</h3></div><div class="panel-body">
          ${hbars(byPay, money, (r) => `платежей: ${r.n} · ${received ? Math.round((r.v / received) * 100) : 0}%`)}
          ${tips ? `<p class="help">С чаевыми ${money(tips)}: всего получено ${money(received)}.</p>` : ''}
        </div></section>
      </div>
      ${speed}
      ${deliveryHtml()}
      <section class="panel"><div class="panel-head"><h3>Выручка по часам дня</h3></div><div class="panel-body">
        ${bars(byHour, (v) => money(fromSen(v)), { anim })}
        <p class="help" style="margin:10px 0 0">По времени оплаты счёта, за весь выбранный период. Наведите или нажмите на столбик — покажем сумму, счета и заказы этого часа.</p>
      </div></section>
      ${profitHtml(ctx)}
      <div class="rp-two">
        ${votesHtml(ctx)}
        ${shiftsHtml(f, t)}
      </div>
      <div class="rp-two">
        <section class="panel"><div class="panel-head"><h3>Столы</h3></div><div class="panel-body">${hbars(byTable.slice(0, 15), money, (r) => `заказов: ${r.n}`)}</div></section>
        <section class="panel"><div class="panel-head"><h3>Сотрудники</h3></div><div class="panel-body">
          <p class="section-label" style="margin-top:0">Подали заказов</p>${hbars(byWaiter, (v) => `${v}`)}
          <p class="section-label">Закрыли счетов на сумму</p>${hbars(byCashier, money, (r) => `счетов: ${r.n}`)}
          ${tipsBy.length ? `<p class="section-label">Чаевые</p>${hbars(tipsBy, money, (r) => `счетов: ${r.n}`)}` : ''}
        </div></section>
      </div>
      ${reviewsHtml()}
      <div class="btn-row">
        <button type="button" class="btn ghost" data-rp-csv="orders">${icon('download', 'sm')}Заказы в Excel</button>
        <button type="button" class="btn ghost" data-rp-csv="dishes">${icon('download', 'sm')}Блюда в Excel</button>
        <button type="button" class="btn ghost" data-rp-csv="bills">${icon('download', 'sm')}Счета в Excel</button>
      </div>`;
  }

  function reviewsHtml() {
    const list = R.reviews || [];
    if (!list.length) return `<section class="panel"><div class="panel-head"><h3>Отзывы гостей</h3></div><div class="panel-body"><p class="a-empty" style="padding:10px 0">За этот период отзывов нет. Гости оставляют их на экране своего заказа после подачи.</p></div></section>`;
    const avg = Math.round((list.reduce((s, r) => s + r.rating, 0) / list.length) * 10) / 10;
    const by = [5, 4, 3, 2, 1].map((n) => ({ k: `${n} ★`, v: list.filter((r) => r.rating === n).length }));
    const stars = (n) => '★'.repeat(n) + '☆'.repeat(5 - n);
    return `<section class="panel"><div class="panel-head"><h3>Отзывы гостей<small>${list.length}</small></h3></div><div class="panel-body">
      <p class="rv-avg"><b>${String(avg).replace('.', ',')}</b> из 5 · ${list.length} ${list.length % 10 === 1 && list.length % 100 !== 11 ? 'отзыв' : list.length % 10 >= 2 && list.length % 10 <= 4 && (list.length % 100 < 10 || list.length % 100 >= 20) ? 'отзыва' : 'отзывов'}</p>
      ${hbars(by, (v) => String(v))}
      <ul class="rv-list">${list.slice(0, 30).map((r) => `<li><div><span class="rv-stars" aria-label="${r.rating} из 5">${stars(r.rating)}</span>
        <small>${esc(new Date(r.created_at).toLocaleString('ru-RU', { dateStyle: 'short', timeStyle: 'short' }))} · ${r.table_label === 'Доставка' && !r.table_id ? 'доставка' : `стол ${esc(r.table_label || '?')}`} · заказ №${esc(r.order_no || '?')}${r.lang ? ` · ${esc(String(r.lang).toUpperCase())}` : ''}</small></div>
        ${r.comment ? `<p>${esc(r.comment)}</p>` : ''}</li>`).join('')}</ul>
    </div></section>`;
  }

  // ---------- Прибыль по блюдам (только владелец) ----------
  // Выручка — цена позиции × количество в оплаченных, не отменённых заказах (как «Популярные блюда», но только оплаченные).
  // Себестоимость — та, что указана сейчас: старые продажи считаются по сегодняшней себестоимости.
  function profitHtml(ctx) {
    if (ctx.role !== 'owner') return '';
    const head = '<section class="panel"><div class="panel-head"><h3>Прибыль по блюдам</h3></div><div class="panel-body">';
    if (R.costs === null) return `${head}<p class="a-empty" style="padding:8px 0">Себестоимость не загрузилась. Нажмите «Обновить».</p></div></section>`;
    const cost = new Map(R.costs.map((c) => [c.dish_id, sen(c.cost)]));
    const m = new Map();
    for (const o of R.orders) {
      if (o.status === 'cancelled' || !o.paid_at) continue;
      for (const i of o.items || []) {
        const r = m.get(i.id) || { id: i.id, k: tr(i.name) || i.id, qty: 0, rev: 0 };
        const q = Number(i.qty) || 0;
        r.qty += q;
        r.rev += sen(i.price) * q;
        m.set(i.id, r);
      }
    }
    const sold = [...m.values()].filter((r) => r.qty > 0);
    if (!sold.length) return `${head}<p class="a-empty" style="padding:8px 0">За этот период оплаченных заказов нет.</p></div></section>`;
    const rows = sold.filter((r) => cost.has(r.id)).map((r) => {
      const c = cost.get(r.id) * r.qty;
      return { ...r, cost: c, profit: r.rev - c };
    }).sort((a, b) => b.profit - a.profit);
    const missing = sold.filter((r) => !cost.has(r.id)).sort((a, b) => b.rev - a.rev);
    const tot = rows.reduce((s, r) => ({ rev: s.rev + r.rev, cost: s.cost + r.cost, profit: s.profit + r.profit }), { rev: 0, cost: 0, profit: 0 });
    const margin = (r) => (r.rev ? `${Math.round((r.profit / r.rev) * 100)}%` : '—');
    return `${head}
      ${rows.length ? `<div class="a-stats" style="margin-top:0">
        <div class="a-stat"><b>${money(fromSen(tot.rev))}</b><span>выручка этих блюд</span></div>
        <div class="a-stat"><b>${money(fromSen(tot.cost))}</b><span>себестоимость</span></div>
        <div class="a-stat${tot.profit < 0 ? ' hot' : ''}"><b>${money(fromSen(tot.profit))}</b><span>прибыль · маржа ${margin(tot)}</span></div>
      </div>
      <ul class="pf-list">${rows.map((r) => `<li${r.profit < 0 ? ' class="is-loss"' : ''}>
        <span class="pf-name"><b>${esc(r.k)}</b><small>${r.qty} шт. · выручка ${money(fromSen(r.rev))} · себестоимость ${money(fromSen(r.cost))}</small></span>
        <span class="pf-sum"><b>${money(fromSen(r.profit))}</b><small>маржа ${margin(r)}</small></span></li>`).join('')}</ul>` : ''}
      ${missing.length ? `<p class="notice">${icon('alert')}<span>Себестоимость не указана: ${esc(missing.map((r) => r.k).join(', '))}. Эти блюда не входят в прибыль — впишите себестоимость в разделе «Меню» (карточка блюда).</span></p>` : ''}
      <p class="help">Себестоимость берётся текущая — та, что указана в карточке блюда сейчас, а не на день продажи. Выручка — цены блюд в оплаченных заказах, без скидок на счёт, сбора и налога; доплаты за варианты входят в выручку, но не в себестоимость.</p>
    </div></section>`;
  }

  // ---------- Оценки блюд гостями (владелец и менеджер) ----------
  function votesHtml(ctx) {
    const head = '<section class="panel"><div class="panel-head"><h3>Оценки блюд</h3></div><div class="panel-body">';
    if (R.votes === null) return `${head}<p class="a-empty" style="padding:8px 0">Оценки не загрузились. Нажмите «Обновить».</p></div></section>`;
    if (!R.votes.length) return `${head}<p class="a-empty" style="padding:8px 0">За этот период гости не оценивали блюда. Оценить блюдо гость может на экране своего заказа.</p></div></section>`;
    // название: из меню, иначе — из заказов периода
    const names = new Map();
    for (const o of R.orders) for (const i of o.items || []) if (!names.has(i.id)) names.set(i.id, tr(i.name));
    const dishes = typeof ctx.dishes === 'function' ? ctx.dishes() : ctx.dishes || [];
    for (const d of dishes) names.set(d.id, tr(d.name));
    const m = new Map();
    for (const v of R.votes) {
      const r = m.get(v.dish_id) || { id: v.dish_id, up: 0, down: 0 };
      if (Number(v.vote) > 0) r.up += 1; else if (Number(v.vote) < 0) r.down += 1;
      m.set(v.dish_id, r);
    }
    const MIN = 3;   // меньше трёх оценок — слишком случайно, такие блюда идут в конце
    const rows = [...m.values()].map((r) => ({ ...r, n: r.up + r.down, p: pct(r.up, r.up + r.down), k: names.get(r.id) || r.id }))
      .filter((r) => r.n).sort((a, b) => (b.n >= MIN) - (a.n >= MIN) || a.p - b.p || b.down - a.down || a.k.localeCompare(b.k, 'ru'));
    const up = rows.reduce((s, r) => s + r.up, 0);
    const down = rows.reduce((s, r) => s + r.down, 0);
    return `${head}
      <p class="vt-total"><span class="vt-up">${icon('thumb-up', 'sm')}${up}</span><span class="vt-down">${icon('thumb-down', 'sm')}${down}</span><span>нравится ${pct(up, up + down)}%</span></p>
      <ul class="vt-list">${rows.map((r) => `<li${r.n >= MIN && r.p < 60 ? ' class="is-bad"' : ''}>
        <span class="vt-name"><b>${esc(r.k)}</b><small>${r.n < MIN ? 'мало оценок' : `оценок: ${r.n}`}</small></span>
        <span class="vt-track" role="img" aria-label="${esc(`нравится ${r.p}%`)}"><span style="width:${r.p}%"></span></span>
        <span class="vt-nums"><span class="vt-up" aria-label="нравится">${icon('thumb-up', 'sm')}${r.up}</span><span class="vt-down" aria-label="не нравится">${icon('thumb-down', 'sm')}${r.down}</span><b>${r.p}%</b></span></li>`).join('')}</ul>
      <p class="help">Сверху — блюда, которые нравятся меньше всего (из тех, где хотя бы ${MIN} оценки).</p>
    </div></section>`;
  }

  // ---------- Смены: часы по сотрудникам ----------
  const ROLE = { owner: 'владелец', manager: 'менеджер', waiter: 'официант', cook: 'повар' };
  const durText = (min) => { const m = Math.max(0, Math.round(min)); return m < 60 ? `${m} мин` : `${Math.floor(m / 60)} ч ${pad(m % 60)} мин`; };
  function shiftsHtml(f, t) {
    const head = '<section class="panel"><div class="panel-head"><h3>Смены</h3></div><div class="panel-body">';
    if (R.shifts === null) return `${head}<p class="a-empty" style="padding:8px 0">Смены не загрузились. Нажмите «Обновить».</p></div></section>`;
    if (!R.shifts.length) return `${head}<p class="a-empty" style="padding:8px 0">За этот период смен не было. Сотрудник начинает и заканчивает смену кнопкой на своём экране.</p></div></section>`;
    const now = Date.now();
    const fT = f.getTime();
    const tT = Math.min(t.getTime(), now);
    // часы — только внутри выбранного периода; открытая смена считается до этой минуты
    const people = new Map();
    for (const s of R.shifts) {
      const a = new Date(s.started_at).getTime();
      const b = s.ended_at ? new Date(s.ended_at).getTime() : now;
      const min = Math.max(0, Math.min(b, tT) - Math.max(a, fT)) / 60000;
      const p = people.get(s.user_id) || { k: s.name || ROLE[s.role] || 'Сотрудник', role: s.role, v: 0, n: 0, open: false };
      p.v += min; p.n += 1; p.open = p.open || !s.ended_at;
      people.set(s.user_id, p);
    }
    const list = [...people.values()].sort((a, b) => b.v - a.v);
    const total = list.reduce((s, p) => s + p.v, 0);
    const when = (iso) => new Date(iso).toLocaleString('ru-RU', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
    const shifts = [...R.shifts].sort((a, b) => new Date(b.started_at) - new Date(a.started_at));
    return `${head}
      <p class="rv-avg" style="margin-top:0"><b>${esc(durText(total))}</b> всего · смен ${R.shifts.length}</p>
      ${hbars(list, durText, (p) => [ROLE[p.role], `смен: ${p.n}`, p.open ? 'сейчас на смене' : ''].filter(Boolean).join(' · '))}
      <details class="rp-table"><summary>Все смены</summary><ul class="sh-list">${shifts.map((s) => {
        const b = s.ended_at ? new Date(s.ended_at).getTime() : now;
        return `<li><span><b>${esc(s.name || ROLE[s.role] || '')}</b> · ${esc(when(s.started_at))} — ${s.ended_at ? esc(when(s.ended_at)) : '<span class="state-badge ok">на смене</span>'}</span><b>${esc(durText((b - new Date(s.started_at).getTime()) / 60000))}</b></li>`;
      }).join('')}</ul></details>
      <p class="help">Часы считаются только внутри выбранного периода: смена через полночь делится между днями. Открытая смена считается до этой минуты.</p>
    </div></section>`;
  }

  function toolbar() {
    const P = [['today', 'Сегодня'], ['yesterday', 'Вчера'], ['7', '7 дней'], ['30', '30 дней'], ['month', 'Этот месяц'], ['prev', 'Прошлый месяц'], ['custom', 'Даты']];
    return `<div class="toolbar"><div class="chips" style="margin:0">${P.map(([k, n]) => `<button type="button" class="chip${R.period === k ? ' active' : ''}" data-rp="${k}">${n}</button>`).join('')}</div>
      ${R.period === 'custom' ? `<label class="field" style="margin:0"><span class="sr-only">С</span><input type="date" id="rp-from" value="${esc(R.from)}" max="${ymd(new Date())}"></label>
      <label class="field" style="margin:0"><span class="sr-only">По</span><input type="date" id="rp-to" value="${esc(R.to)}" max="${ymd(new Date())}"></label>` : ''}
      <span class="grow"></span><button type="button" class="btn small ghost" data-rp-reload>${icon('refresh', 'sm')}Обновить</button></div>`;
  }

  function exportCsv(kind) {
    const [f, t] = periodRange(R.period, R.from, R.to);
    const tag = `${ymd(f)}_${ymd(addDays(t, -1))}`;
    const dt = (iso) => (iso ? new Date(iso).toLocaleString('ru-RU') : '');
    if (kind === 'orders') {
      const DST = { confirm: 'ждёт звонка', new: 'новая', accepted: 'принята', cooking: 'готовится', ready: 'ждёт курьера', on_the_way: 'в пути', served: 'доставлен', cancelled: 'отменён' };
      csv(`заказы_${tag}.csv`, ['№', 'Дата и время', 'Стол', 'Статус', 'Позиции', 'Блюда', 'Сбор', 'Налог', 'Итого', 'Оплачен', 'Официант', 'Комментарий', 'Доставка', 'Км', 'Курьер'],
        R.orders.map((o) => [o.no, dt(o.created_at), o.table_label, (isDeliv(o) ? DST : { new: 'ждёт подачи', accepted: 'ждёт подачи', cooking: 'ждёт подачи', ready: 'ждёт подачи', served: 'подан', cancelled: 'отменён' })[o.status] || o.status,
          (o.items || []).map((i) => `${i.qty}× ${tr(i.name) || i.id}${optNames(i).length ? ` (${optNames(i).join(', ')})` : ''}${i.note ? ` [${i.note}]` : ''}`).join('; '),
          num(o.subtotal ?? o.total), num(o.service), num(o.tax), num(o.total), dt(o.paid_at), isDeliv(o) ? '' : o.served_by_name || o.created_by_name || o.accepted_by_name || '', o.note || '',
          isDeliv(o) ? num(o.delivery_fee) : '', isDeliv(o) && o.distance_km != null ? num(o.distance_km) : '', o.courier_name || '']));
    } else if (kind === 'bills') {
      csv(`счета_${tag}.csv`, ['Чек №', 'Оплачен', 'Стол', 'Заказы', 'Блюда', 'Сбор', 'Налог', 'Итого', 'Чаевые', 'Оплата', 'Части оплаты', 'Кто закрыл', 'Скидка', 'Причина скидки', 'Кто дал скидку', 'Округление', 'Доставка'],
        R.bills.map((b) => [b.no, dt(b.paid_at), b.table_label, (b.order_nos || []).join(', '), num(b.subtotal), num(b.service), num(b.tax), num(b.total), num(b.tip), PAY[b.method] || b.method,
          (b.payments || []).map((p) => `${PAY[p.method] || p.method} ${num(p.amount)}`).join(' + '), b.paid_by_name || '',
          num(b.discount || 0), b.discount_reason || '', b.discount_by_name || '', num(b.rounding || 0), num(b.delivery_fee || 0)]));
    } else {
      const m = new Map();
      for (const o of R.orders) if (o.status !== 'cancelled' && o.status !== 'confirm') for (const i of o.items || []) {
        const k = `${tr(i.name) || i.id}${optNames(i).length ? ` (${optNames(i).join(', ')})` : ''}`;
        const r = m.get(k) || { qty: 0, sum: 0 };
        r.qty += Number(i.qty); r.sum += Number(i.price) * Number(i.qty);
        m.set(k, r);
      }
      csv(`блюда_${tag}.csv`, ['Блюдо', 'Продано, шт.', 'Сумма'], [...m.entries()].sort((a, b) => b[1].qty - a[1].qty).map(([k, r]) => [k, r.qty, num(r.sum)]));
    }
  }

  // ---------------- ЖУРНАЛ ----------------
  const A = { period: '7', kind: 'all', q: '', rows: [], loaded: '', loading: false, error: '' };
  const KINDS = [['all', 'Всё'], ['menu', 'Меню'], ['orders', 'Заказы и счета'], ['tables', 'Столы'], ['settings', 'Ресторан'], ['staff', 'Сотрудники']];
  const KIND_OF = { dish: 'menu', category: 'menu', order: 'orders', bill: 'orders', table: 'tables', settings: 'settings', staff: 'staff' };
  const ENT = { dish: 'Блюдо', category: 'Категория', order: 'Заказ', bill: 'Счёт', table: 'Стол', settings: 'Ресторан', staff: 'Сотрудник' };
  const FIELD = {
    price: 'цена', available: 'в наличии', hidden: 'скрыто от гостей', name: 'название', desc: 'описание', ingredients: 'состав', photo_url: 'фото',
    category_id: 'категория', tags: 'метки', allergens: 'аллергены', meat: 'мясо', options: 'варианты', sort: 'порядок', weight: 'выход', unit: 'единица', kcal: 'калории',
    tagline: 'описание кухни', logo_url: 'логотип', currency: 'валюта', currency_before: 'валюта перед ценой', timezone: 'часовой пояс', schedule: 'часы работы',
    address: 'адрес', map_url: 'карта', phone: 'телефон', footer: 'подпись', default_language: 'язык по умолчанию', orders_enabled: 'приём заказов',
    orders_when_closed: 'заказы вне часов', halal: 'халяль', halal_note: 'сертификат халяль', service_pct: 'сервисный сбор %', tax_pct: 'налог %', tax_name: 'название налога',
    tax_on_service: 'налог на сбор', label: 'название', active: 'включён', token: 'QR-код', role: 'роль', email: 'email', status: 'статус', items: 'состав заказа',
    total: 'итого', subtotal: 'блюда', service: 'сбор', tax: 'налог', paid_at: 'оплата', bill_id: 'счёт', note: 'комментарий', accepted_by_name: null, served_by_name: 'подал', served_by: null,
    edited_at: 'изменён', edited_by_name: 'кто изменил', accepted_at: null, ready_at: null, cooking_at: null, cancelled_at: 'отменён в',
    accepted_by: null, status_by: null, method: 'оплата', tables_count: null, tip: 'чаевые', payments: 'части оплаты', discount: 'скидка', discount_pct: 'скидка %', discount_reason: 'причина скидки', discount_by_name: 'кто дал скидку', rounding: 'округление', cash_rounding: 'округление наличных', waiter_discounts: 'скидки официантов', receipt_info: 'реквизиты для чека', served_at: 'подан в', source: 'источник', created_by_name: 'пробил',
  };
  const STV = { confirm: 'ждёт звонка', new: 'ждёт подачи', accepted: 'ждёт подачи', cooking: 'ждёт подачи', ready: 'ждёт подачи', served: 'подан', cancelled: 'отменён', waiter: 'официант', owner: 'владелец', cook: 'повар', guest: 'гость', staff: 'официант' };
  function val(k, v) {
    if (v === null || v === undefined || v === '') return '—';
    if (typeof v === 'boolean') return v ? 'да' : 'нет';
    if (['price', 'total', 'subtotal', 'service', 'tax'].includes(k)) return money(v);
    if (k === 'status' || k === 'role') return STV[v] || v;
    if (k === 'method') return PAY[v] || v;
    if (/_at$/.test(k)) return new Date(v).toLocaleString('ru-RU', { dateStyle: 'short', timeStyle: 'short' });
    if (k === 'items' && Array.isArray(v)) return v.map((i) => `${i.qty}× ${tr(i.name) || i.id}`).join(', ');
    if (k === 'schedule') return 'изменены';
    if (k === 'options' && Array.isArray(v)) return v.map((g) => tr(g.name)).join(', ') || 'нет';
    if (Array.isArray(v)) return v.join(', ') || 'пусто';
    if (typeof v === 'object') return tr(v) || '…';
    const s = String(v);
    return s.length > 60 ? `${s.slice(0, 60)}…` : s;
  }
  function describe(r) {
    const ch = r.changes || {};
    const who = r.who || (r.entity === 'order' ? 'система' : 'неизвестно');
    const what = `${ENT[r.entity] || r.entity}${r.label ? ` «${r.label}»` : ''}`;
    if (r.entity === 'bill') return { who, text: `закрыл ${r.label || 'счёт'}: ${money(ch.total)}${ch.method ? `, ${PAY[ch.method] || ch.method}` : ''}${Number(ch.tip) ? `, чаевые ${money(ch.tip)}` : ''}`, list: [] };
    if (r.action === 'insert') return { who, text: `добавил: ${what}`, list: [] };
    if (r.action === 'delete') return { who, text: `удалил: ${what}`, list: [] };
    const list = Object.entries(ch).filter(([k]) => FIELD[k] !== null && !['updated_at'].includes(k))
      .map(([k, pair]) => (Array.isArray(pair) && pair.length === 2 ? `${FIELD[k] || k}: ${val(k, pair[0])} → ${val(k, pair[1])}` : `${FIELD[k] || k}: ${val(k, pair)}`));
    return { who, text: `изменил: ${what}`, list };
  }

  async function loadAudit(api) {
    const today = startOf(new Date());
    const from = A.period === 'today' ? today : addDays(today, A.period === '30' ? -29 : -6);
    const key = `${from.toISOString()}`;
    if (A.loaded === key || A.loading) return;
    A.loading = true;
    A.error = '';
    try { A.rows = await api.audit(from.toISOString(), addDays(today, 1).toISOString()); A.loaded = key; } catch (ex) { A.error = S.errText(ex); }
    A.loading = false;
  }

  function audit(main, ctx) {
    const today = startOf(new Date());
    const key = (A.period === 'today' ? today : addDays(today, A.period === '30' ? -29 : -6)).toISOString();
    const keepFocus = document.activeElement?.id === 'au-q';
    const head = `<div class="toolbar">
        <div class="chips" style="margin:0">${[['today', 'Сегодня'], ['7', '7 дней'], ['30', '30 дней']].map(([k, n]) => `<button type="button" class="chip${A.period === k ? ' active' : ''}" data-au-p="${k}">${n}</button>`).join('')}</div>
        <span class="grow"></span><button type="button" class="btn small ghost" data-au-reload>${icon('refresh', 'sm')}Обновить</button></div>
      <div class="chips">${KINDS.map(([k, n]) => `<button type="button" class="chip${A.kind === k ? ' active' : ''}" data-au-k="${k}">${n}</button>`).join('')}</div>
      <div class="toolbar"><label class="search">${icon('search')}<input id="au-q" type="search" placeholder="Поиск: блюдо, стол, сотрудник" value="${esc(A.q)}" autocomplete="off"></label></div>`;
    if (A.loaded !== key) {
      main.innerHTML = `${head}<p class="a-empty">${A.error ? esc(A.error) : 'Загружаем журнал…'}</p>`;
      if (!A.error) loadAudit(ctx.api).then(() => { if (location.hash === '#audit') audit(main, ctx); });
      return;
    }
    const words = A.q.toLowerCase().split(/\s+/).filter(Boolean);
    const rows = A.rows.filter((r) => A.kind === 'all' || KIND_OF[r.entity] === A.kind).map((r) => ({ r, d: describe(r) }))
      .filter(({ r, d }) => !words.length || words.every((w) => `${d.who} ${d.text} ${d.list.join(' ')} ${r.label || ''}`.toLowerCase().includes(w)));
    let lastDay = '';
    main.innerHTML = `${head}
      <p class="help">Записывается каждое изменение меню, цен, наличия, столов, настроек, сотрудников, статусов заказов и оплат: кто и когда. Хранится год. Секретные коды QR в журнал не попадают.</p>
      ${rows.length ? `<ol class="au-list">${rows.slice(0, 400).map(({ r, d }) => {
        const day = new Date(r.at).toLocaleDateString('ru-RU', { weekday: 'long', day: 'numeric', month: 'long' });
        const sep = day !== lastDay ? `<li class="au-day">${esc(day)}</li>` : '';
        lastDay = day;
        return `${sep}<li class="au-row"><time>${esc(new Date(r.at).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' }))}</time>
          <div><b>${esc(d.who)}</b> ${esc(d.text)}${d.list.length ? `<ul>${d.list.map((x) => `<li>${esc(x)}</li>`).join('')}</ul>` : ''}</div></li>`;
      }).join('')}</ol>` : '<p class="a-empty">Записей нет.</p>'}`;
    if (keepFocus) { const i = document.getElementById('au-q'); i.focus(); i.setSelectionRange(i.value.length, i.value.length); }
  }

  // ---------- события (живут, пока открыт нужный раздел) ----------
  let ctxRef = null;
  const main = () => document.getElementById('a-main');
  document.addEventListener('click', (e) => {
    if (!ctxRef) return;
    const p = e.target.closest('[data-rp]');
    if (p) { R.period = p.dataset.rp; if (R.period === 'custom' && !R.from) { R.from = ymd(addDays(new Date(), -6)); R.to = ymd(new Date()); } R.loaded = ''; reports(main(), ctxRef); return; }
    if (e.target.closest('[data-rp-reload]')) { R.loaded = ''; reports(main(), ctxRef); return; }
    const c = e.target.closest('[data-rp-csv]');
    if (c) { exportCsv(c.dataset.rpCsv); return; }
    const ap = e.target.closest('[data-au-p]');
    if (ap) { A.period = ap.dataset.auP; A.loaded = ''; audit(main(), ctxRef); return; }
    const ak = e.target.closest('[data-au-k]');
    if (ak) { A.kind = ak.dataset.auK; audit(main(), ctxRef); return; }
    if (e.target.closest('[data-au-reload]')) { A.loaded = ''; audit(main(), ctxRef); }
  });
  document.addEventListener('change', (e) => {
    if (!ctxRef) return;
    if (e.target.id === 'rp-from' || e.target.id === 'rp-to') { R[e.target.id === 'rp-from' ? 'from' : 'to'] = e.target.value; R.loaded = ''; reports(main(), ctxRef); }
  });
  document.addEventListener('input', (e) => { if (ctxRef && e.target.id === 'au-q') { A.q = e.target.value; audit(main(), ctxRef); } });
  // подсказка у столбиков (мышь и клавиатура)
  const tip = () => document.getElementById('rp-tip') || Object.assign(document.body.appendChild(document.createElement('div')), { id: 'rp-tip', role: 'tooltip' });
  const showTip = (el) => { const t = tip(); t.textContent = el.dataset.tip; t.hidden = false; const b = el.getBoundingClientRect(); t.style.left = `${Math.max(8, Math.min(innerWidth - t.offsetWidth - 8, b.left + b.width / 2 - t.offsetWidth / 2))}px`; t.style.top = `${Math.max(8, b.top - t.offsetHeight - 8)}px`; };
  const hideTip = () => { const t = document.getElementById('rp-tip'); if (t) t.hidden = true; };
  document.addEventListener('pointerover', (e) => { const b = e.target.closest?.('.rp-bar'); if (b) showTip(b); else hideTip(); });
  document.addEventListener('focusin', (e) => { const b = e.target.closest?.('.rp-bar'); if (b) showTip(b); });
  document.addEventListener('focusout', hideTip);
  addEventListener('scroll', hideTip, { passive: true });

  // =====================================================================
  //  «Закрытие дня» (Z-отчёт): итоги с прошлого закрытия, сверка наличных,
  //  закрыть день навсегда, история закрытий. Считает база (z_preview / close_day).
  // =====================================================================
  const Z = { preview: null, list: [], at: 0, loading: false, error: '', counted: '', note: '', busy: false };
  const dt = (iso) => new Date(iso).toLocaleString('ru-RU', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
  const signedMoney = (x) => `${x > 0 ? '+' : x < 0 ? '−' : ''}${money(Math.abs(x))}`;
  const parseMoney = (v) => { const x = Number(String(v || '').replace(/\s/g, '').replace(',', '.')); return String(v || '').trim() && Number.isFinite(x) && x >= 0 ? r2(x) : null; };

  async function loadDay(api) {
    if (Z.loading) return;
    Z.loading = true;
    try {
      const [p, l] = await Promise.all([api.zPreview(), api.zReports()]);
      Z.preview = p; Z.list = l; Z.error = ''; Z.at = Date.now();
    } catch (ex) { Z.error = S.errText(ex); }
    Z.loading = false;
  }

  function zMoneyRows(z) {
    const n = (k) => Number(z[k]) || 0;
    const row = (k, v, cls = '') => `<li${cls ? ` class="${cls}"` : ''}><span>${esc(k)}</span><b>${esc(v)}</b></li>`;
    return `<ul class="z-kv">
      ${row('Блюда', money(n('subtotal')))}
      ${n('discount') ? row(`Скидки (счетов ${n('discount_bills')})`, `−${money(n('discount'))}`) : ''}
      ${n('service') ? row('Сервисный сбор', money(n('service'))) : ''}
      ${n('tax') ? row('Налог', money(n('tax'))) : ''}
      ${n('delivery_fee') ? row('Доставка (плата гостей)', money(n('delivery_fee'))) : ''}
      ${row('Выручка', money(n('total')), 'big')}
      ${n('tip') ? row('Чаевые', money(n('tip'))) : ''}
      ${n('rounding') ? row('Округление наличных', signedMoney(n('rounding'))) : ''}
    </ul>`;
  }
  function zPayRows(z) {
    const by = z.by_method || {};
    const list = ['cash', 'card', 'qr', 'other'].filter((m) => Number(by[m]));
    const got = r2(list.reduce((s, m) => s + Number(by[m]), 0));
    return `<ul class="z-kv">${list.length ? list.map((m) => `<li><span>${esc(PAY[m])}</span><b>${money(by[m])}</b></li>`).join('') : '<li><span>Оплат не было</span><b>—</b></li>'}
      ${list.length ? `<li class="big"><span>Всего получено</span><b>${money(got)}</b></li>` : ''}</ul>`;
  }
  function zOtherRows(z) {
    const n = (k) => Number(z[k]) || 0;
    const cashiers = Object.entries(z.by_cashier || {}).sort((a, b) => b[1] - a[1]);
    return `<ul class="z-kv">
      <li><span>Счетов</span><b>${n('bills')}</b></li>
      <li><span>Средний чек</span><b>${money(n('bills') ? r2(n('total') / n('bills')) : 0)}</b></li>
      <li><span>Заказов</span><b>${n('orders')}</b></li>
      <li><span>Отменено заказов</span><b>${n('cancelled')}${n('cancelled') ? ` · ${money(n('cancelled_sum'))}` : ''}</b></li>
      ${n('unconfirmed') ? `<li><span>Не подтверждены (доставки без звонка)</span><b>${n('unconfirmed')} · ${money(n('unconfirmed_sum'))}</b></li>` : ''}
      ${n('confirm_orders') ? `<li><span>Доставки ждут звонка (не в выручке)</span><b>${n('confirm_orders')}</b></li>` : ''}
      <li><span>Отменено оплат</span><b>${n('voided')}${n('voided') ? ` · ${money(n('voided_sum'))}` : ''}</b></li>
      ${cashiers.map(([k, v]) => `<li><span>Кассир: ${esc(k)}</span><b>${money(v)}</b></li>`).join('')}
    </ul>`;
  }
  function zDiffHtml() {
    const c = parseMoney(Z.counted);
    if (c === null || !Z.preview) return '<div class="z-diff" id="z-diff">Введите, сколько наличных насчитали в кассе — покажем разницу.</div>';
    const d = r2(c - Number(Z.preview.cash || 0));
    if (Math.abs(d) < 0.005) return `<div class="z-diff ok" id="z-diff">Сходится: ${money(c)}</div>`;
    return `<div class="z-diff bad" id="z-diff">${d < 0 ? `Не хватает ${money(-d)}` : `Лишние ${money(d)}`} (по счетам ${money(Z.preview.cash || 0)}, в кассе ${money(c)})</div>`;
  }

  function day(main, ctx) {
    if (Date.now() - Z.at > 15000 && !Z.loading) {
      if (!Z.preview) main.innerHTML = `<p class="a-empty">${Z.error ? esc(Z.error) : 'Считаем…'}</p>`;
      loadDay(ctx.api).then(() => { if (location.hash === '#day') day(main, ctx); });
      if (!Z.preview) return;
    }
    if (!Z.preview) { main.innerHTML = `<p class="a-empty">${Z.error ? esc(Z.error) : 'Считаем…'}</p>`; return; }
    const z = Z.preview;
    const last = Z.list[0];
    const openN = Number(z.open_orders) || 0;
    main.innerHTML = `
      <div class="toolbar"><p class="help" style="margin:0">${last ? `День открыт с ${esc(dt(last.closed_at))} — после Z-отчёта №${esc(last.no)}.` : 'Это первое закрытие: в отчёт войдёт всё с первого заказа.'}</p>
        <span class="grow"></span><button type="button" class="btn small ghost" data-z-refresh>${icon('refresh', 'sm')}Обновить</button></div>
      <div class="a-stats">
        <div class="a-stat"><b>${money(z.total)}</b><span>выручка · счетов ${esc(z.bills)}</span></div>
        <div class="a-stat"><b>${money(z.cash || 0)}</b><span>наличных должно быть в кассе</span></div>
        <div class="a-stat"><b>${money(Number(z.by_method?.card || 0) + Number(z.by_method?.qr || 0))}</b><span>картой и QR</span></div>
        <div class="a-stat${openN ? ' hot' : ''}"><b>${openN}</b><span>не оплачено заказов</span></div>
      </div>
      ${openN ? `<p class="notice">${icon('alert')}<span>Не оплачено заказов на столах: ${openN} (на ${money(z.open_sum)}). Лучше сначала закрыть их счета — иначе эти деньги попадут в следующий день.</span></p>` : ''}
      <div class="z-grid">
        <section class="panel"><div class="panel-head"><h3>Деньги</h3></div><div class="panel-body">${zMoneyRows(z)}</div></section>
        <section class="panel"><div class="panel-head"><h3>Оплаты</h3></div><div class="panel-body">${zPayRows(z)}</div></section>
        <section class="panel"><div class="panel-head"><h3>Счета и отмены</h3></div><div class="panel-body">${zOtherRows(z)}</div></section>
      </div>
      <section class="panel"><div class="panel-head"><h3>Закрыть день</h3></div><div class="panel-body z-count">
        <label>Сколько наличных в кассе по факту<input id="z-counted" inputmode="decimal" autocomplete="off" placeholder="Например: ${esc(String(Number(z.cash || 0).toFixed(2)))}" value="${esc(Z.counted)}"></label>
        ${zDiffHtml()}
        <label>Заметка (не обязательно)<textarea id="z-note" rows="2" maxlength="300" placeholder="Например: смена Азиза, 20 RM размена оставили в кассе">${esc(Z.note)}</textarea></label>
        <div><button type="button" class="btn" data-z-close${Z.busy ? ' disabled' : ''}>${icon('lock', 'sm')}Закрыть день и напечатать Z-отчёт</button></div>
        <p class="help" style="margin:0">После закрытия итоги сохраняются навсегда, новый день начинается с этой минуты. Оплаты закрытого дня отменить уже нельзя.</p>
      </div></section>
      <section class="panel"><div class="panel-head"><h3>Прошлые закрытия<small>${Z.list.length}</small></h3></div><div class="panel-body">
        ${Z.list.length ? `<ul class="z-hist">${Z.list.map((r) => {
          const d = r.counted_cash != null ? r2(Number(r.counted_cash) - Number(r.totals?.cash || 0)) : null;
          return `<li><span><b>Z-отчёт №${esc(r.no)}</b> · ${esc(dt(r.opened_at))} — ${esc(dt(r.closed_at))}${r.closed_by_name ? ` · ${esc(r.closed_by_name)}` : ''}<br>
            <small>выручка ${money(r.totals?.total || 0)} · наличные ${money(r.totals?.cash || 0)}${d !== null ? (Math.abs(d) < 0.005 ? ' · касса сошлась' : ` · ${d < 0 ? 'не хватало' : 'лишние'} ${money(Math.abs(d))}`) : ''}</small></span>
            <button type="button" class="btn small ghost" data-z-print="${esc(r.id)}">${icon('printer', 'sm')}Печать</button></li>`;
        }).join('')}</ul>` : '<p class="a-empty" style="padding:8px 0">Пока ни разу не закрывали.</p>'}
      </div></section>`;
  }

  function printZ(r) {
    const z = r.totals || {};
    const st = S.settings || {};
    const num = (n) => new Intl.NumberFormat('ru-RU', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(Number(n) || 0);
    const row = (k, v, cls = '') => `<tr${cls ? ` class="${cls}"` : ''}><td>${esc(k)}</td><td class="s">${esc(v)}</td></tr>`;
    const by = z.by_method || {};
    const d = r.counted_cash != null ? r2(Number(r.counted_cash) - Number(z.cash || 0)) : null;
    const full = (iso) => new Date(iso).toLocaleString('ru-RU', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
    window.Floor.printSlip(`Z-отчёт ${r.no}`, `
      <h1>${esc(st.name || '')}</h1>
      ${st.receipt_info ? `<div class="info">${esc(st.receipt_info)}</div>` : ''}
      <hr class="dbl"><div class="doc">Z-ОТЧЁТ № ${esc(r.no)}</div><div class="doc-sub">ЗАКРЫТИЕ ДНЯ</div><hr>
      <table class="kv">${row('С', full(r.opened_at))}${row('По', full(r.closed_at))}${r.closed_by_name ? row('Закрыл', r.closed_by_name) : ''}</table><hr>
      <table class="sums">
        ${row('Счетов', String(z.bills || 0))}${row('Заказов', String(z.orders || 0))}
        ${row('Блюда', num(z.subtotal))}${Number(z.discount) ? row('Скидки', `−${num(z.discount)}`) : ''}
        ${Number(z.service) ? row('Сервисный сбор', num(z.service)) : ''}${Number(z.tax) ? row(st.tax_name || 'Налог', num(z.tax)) : ''}${Number(z.delivery_fee) ? row('Доставка', num(z.delivery_fee)) : ''}
      </table><hr class="dbl">
      <table>${row('ВЫРУЧКА', `${st.currency || ''} ${num(z.total)}`.trim(), 'tot')}</table><hr>
      <table class="sums">
        ${Number(z.tip) ? row('Чаевые', num(z.tip)) : ''}${Number(z.rounding) ? row('Округление', num(z.rounding)) : ''}
        ${['cash', 'card', 'qr', 'other'].filter((m) => Number(by[m])).map((m) => row(PAY[m], num(by[m]))).join('')}
      </table><hr>
      <table class="sums">
        ${row('Наличных по счетам', num(z.cash))}
        ${r.counted_cash != null ? row('В кассе по факту', num(r.counted_cash)) + row(Math.abs(d) < 0.005 ? 'Разница' : d < 0 ? 'Не хватает' : 'Лишние', num(Math.abs(d))) : ''}
      </table><hr>
      <table class="sums">
        ${row('Отменено заказов', `${z.cancelled || 0} · ${num(z.cancelled_sum)}`)}${Number(z.unconfirmed) ? row('Не подтверждены', `${z.unconfirmed} · ${num(z.unconfirmed_sum)}`) : ''}
        ${row('Отменено оплат', `${z.voided || 0} · ${num(z.voided_sum)}`)}
        ${Number(z.open_orders) ? row('Не оплачено заказов', `${z.open_orders} · ${num(z.open_sum)}`) : ''}
      </table>
      ${r.note ? `<hr><div class="small">${esc(r.note)}</div>` : ''}
      <hr><div class="c small muted">Напечатано ${esc(full(new Date().toISOString()))}</div>`);
  }

  async function closeDay(main, ctx) {
    if (Z.busy || !Z.preview) return;
    const raw = String(Z.counted || '').trim();
    const counted = parseMoney(raw);
    if (raw && counted === null) { S.toast('Сумма в кассе — только цифры, например 250.50', true); return; }
    const openN = Number(Z.preview.open_orders) || 0;
    const msg = `Закрыть день? Выручка ${money(Z.preview.total)}, счетов ${Z.preview.bills}.${counted !== null ? ` В кассе ${money(counted)}.` : ' Сумму в кассе не ввели.'}${openN ? ` Внимание: не оплачено заказов на столах — ${openN}.` : ''}`;
    if (!await S.ask(msg, { ok: 'Закрыть день' })) return;
    Z.busy = true; day(main, ctx);
    try {
      const r = await ctx.api.closeDay(counted, Z.note.trim());
      Z.counted = ''; Z.note = ''; Z.at = 0;
      S.toast(`День закрыт: Z-отчёт №${r.no}`);
      printZ(r);
    } catch (ex) { S.toast(/bad_amount/.test(String(ex?.message)) ? 'Проверьте сумму в кассе' : S.errText(ex), true); }
    Z.busy = false;
    Z.at = 0;
    day(main, ctx);
  }

  document.addEventListener('input', (e) => {
    if (e.target.id === 'z-counted') { Z.counted = e.target.value; const d = document.getElementById('z-diff'); if (d) d.outerHTML = zDiffHtml(); }
    else if (e.target.id === 'z-note') Z.note = e.target.value.slice(0, 300);
  });
  document.addEventListener('click', (e) => {
    if (location.hash !== '#day' || !ctxRef) return;
    const main = document.getElementById('a-main');
    if (e.target.closest('[data-z-refresh]')) { Z.at = 0; day(main, ctxRef); }
    else if (e.target.closest('[data-z-close]')) closeDay(main, ctxRef);
    else { const p = e.target.closest('[data-z-print]'); if (p) { const r = Z.list.find((x) => x.id === p.dataset.zPrint); if (r) printZ(r); } }
  });

  window.OwnerReports = {
    day(m, ctx) { ctxRef = ctx; day(m, ctx); },
    reports(m, ctx) { ctxRef = ctx; reports(m, ctx); },
    audit(m, ctx) { ctxRef = ctx; audit(m, ctx); },
  };
})();

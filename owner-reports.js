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

  // столбики одного цвета: подпись и значение при наведении, таблица — ниже
  function bars(rows, fmt, { compact = false } = {}) {
    const max = Math.max(0, ...rows.map((r) => r.v));
    if (!max) return '<p class="a-empty" style="padding:14px 0">Нет данных за этот период.</p>';
    return `<div class="rp-bars${compact ? ' compact' : ''}" role="img" aria-label="${esc(rows.map((r) => `${r.k}: ${fmt(r.v)}`).join('; '))}">
      ${rows.map((r) => `<div class="rp-bar" tabindex="0" data-tip="${esc(`${r.k}: ${fmt(r.v)}`)}"><span class="rp-col" style="height:${Math.max(r.v ? 3 : 0, Math.round((r.v / max) * 100))}%"></span><span class="rp-x">${esc(r.short ?? r.k)}</span></div>`).join('')}
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
  const R = { period: '7', from: '', to: '', orders: [], bills: [], reviews: [], loaded: '', loading: false, error: '' };

  async function loadReports(api) {
    const [f, t] = periodRange(R.period, R.from, R.to);
    const key = `${f.toISOString()}|${t.toISOString()}`;
    if (R.loaded === key || R.loading) return;
    R.loading = true;
    R.error = '';
    try {
      const [o, b, rv] = await Promise.all([api.orders(f.toISOString(), t.toISOString()), api.bills(f.toISOString(), t.toISOString()),
        api.reviews ? api.reviews(f.toISOString(), t.toISOString()).catch(() => []) : []]);
      R.orders = o;
      // отменённые оплаты не считаются в деньгах — показываем их отдельным списком
      R.bills = b.filter((x) => !x.voided_at);
      R.voided = b.filter((x) => x.voided_at);
      R.reviews = rv;
      R.loaded = key;
    } catch (ex) { R.error = S.errText(ex); }
    R.loading = false;
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
      if (!R.error) loadReports(ctx.api).then(() => { if (location.hash === '#reports') reports(main, ctx); });
      return;
    }
    const valid = R.orders.filter((o) => o.status !== 'cancelled');
    const cancelled = R.orders.filter((o) => o.status === 'cancelled');
    const sales = r2(valid.reduce((s, o) => s + Number(o.total), 0));
    const paid = r2(R.bills.reduce((s, b) => s + Number(b.total), 0));
    const unpaid = r2(valid.filter((o) => !o.paid_at).reduce((s, o) => s + Number(o.total), 0));
    const avg = R.bills.length ? r2(paid / R.bills.length) : (valid.length ? r2(sales / valid.length) : 0);
    const service = r2(valid.reduce((s, o) => s + Number(o.service || 0), 0));
    const tax = r2(valid.reduce((s, o) => s + Number(o.tax || 0), 0));

    // по дням
    const days = [];
    for (let d = new Date(f); d < t; d = addDays(d, 1)) days.push(new Date(d));
    const byDay = days.map((d) => {
      const k = ymd(d);
      const v = r2(valid.filter((o) => ymd(new Date(o.created_at)) === k).reduce((s, o) => s + Number(o.total), 0));
      return { k: d.toLocaleDateString('ru-RU', { weekday: 'short', day: 'numeric', month: 'short' }), short: days.length > 16 ? String(d.getDate()) : dm(d), v, date: k };
    });
    // по часам
    const byHour = Array.from({ length: 24 }, (_, h) => ({ k: `${pad(h)}:00–${pad(h)}:59`, short: String(h), v: valid.filter((o) => new Date(o.created_at).getHours() === h).length }))
      .filter((r, i, a) => { const first = a.findIndex((x) => x.v); const last = a.length - 1 - [...a].reverse().findIndex((x) => x.v); return first >= 0 && i >= first && i <= last; });
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
    const byTable = group(valid, (o) => `Стол ${o.table_label}`, (o) => Number(o.total));
    const discBy = group(discBills, (b) => b.discount_reason || '—', (b) => Number(b.discount));
    const byWaiter = group(valid.filter((o) => o.status === 'served'), (o) => o.served_by_name || o.created_by_name || o.accepted_by_name, () => 1);
    const byCashier = group(R.bills, (b) => b.paid_by_name, (b) => Number(b.total));
    const tipsBy = group(R.bills.filter((b) => Number(b.tip) > 0), (b) => b.paid_by_name, (b) => Number(b.tip));

    const speed = speedHtml(valid);
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
      <section class="panel"><div class="panel-head"><h3>Продажи по дням</h3></div><div class="panel-body">
        ${bars(byDay, money, { compact: byDay.length > 16 })}
        <details class="rp-table"><summary>Таблицей</summary><table><tbody>${byDay.map((r) => `<tr><td>${esc(r.k)}</td><td>${money(r.v)}</td></tr>`).join('')}</tbody></table></details>
      </div></section>
      <div class="rp-two">
        <section class="panel"><div class="panel-head"><h3>Популярные блюда<small>${top.length}</small></h3></div><div class="panel-body">
          ${hbars(top.slice(0, 12).map((d) => ({ k: d.k, v: d.qty, sum: d.v })), (v) => `${v} шт.`, (r) => money(r.sum))}
          ${top.length > 12 ? `<details class="rp-table"><summary>Все блюда</summary><table><tbody>${top.map((d) => `<tr><td>${esc(d.k)}</td><td>${d.qty} шт.</td><td>${money(d.v)}</td></tr>`).join('')}</tbody></table></details>` : ''}
        </div></section>
        ${(R.voided || []).length ? `<section class="panel"><div class="panel-head"><h3>Отменённые оплаты<small>${R.voided.length}</small></h3></div><div class="panel-body">
          <ul class="z-hist">${R.voided.map((b) => `<li><span><b>Чек №${esc(b.no)}</b> · стол ${esc(b.table_label)} · ${esc(new Date(b.paid_at).toLocaleString('ru-RU', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }))}<br><small>${esc(b.voided_by_name || '')}: ${esc(b.void_reason || '')}</small></span><b>${money(b.total)}</b></li>`).join('')}</ul>
          <p class="help">Эти суммы не входят в «Оплачено». Заказы таких чеков оплачиваются заново или отменяются.</p></div></section>` : ''}
        ${discBy.length ? `<section class="panel"><div class="panel-head"><h3>Скидки по причинам<small>−${money(discounts)}</small></h3></div><div class="panel-body">${hbars(discBy, money, (r) => `счетов: ${r.n}`)}</div></section>` : ''}
        <section class="panel"><div class="panel-head"><h3>Способы оплаты</h3></div><div class="panel-body">
          ${hbars(byPay, money, (r) => `платежей: ${r.n} · ${received ? Math.round((r.v / received) * 100) : 0}%`)}
          ${tips ? `<p class="help">С чаевыми ${money(tips)}: всего получено ${money(received)}.</p>` : ''}
        </div></section>
      </div>
      ${speed}
      <section class="panel"><div class="panel-head"><h3>Заказы по часам</h3></div><div class="panel-body">
        ${bars(byHour, (v) => `${v} заказ.`)}
      </div></section>
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
        <small>${esc(new Date(r.created_at).toLocaleString('ru-RU', { dateStyle: 'short', timeStyle: 'short' }))} · стол ${esc(r.table_label || '?')} · заказ №${esc(r.order_no || '?')}${r.lang ? ` · ${esc(String(r.lang).toUpperCase())}` : ''}</small></div>
        ${r.comment ? `<p>${esc(r.comment)}</p>` : ''}</li>`).join('')}</ul>
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
      csv(`заказы_${tag}.csv`, ['№', 'Дата и время', 'Стол', 'Статус', 'Позиции', 'Блюда', 'Сбор', 'Налог', 'Итого', 'Оплачен', 'Официант', 'Комментарий'],
        R.orders.map((o) => [o.no, dt(o.created_at), o.table_label, { new: 'ждёт подачи', accepted: 'ждёт подачи', cooking: 'ждёт подачи', ready: 'ждёт подачи', served: 'подан', cancelled: 'отменён' }[o.status] || o.status,
          (o.items || []).map((i) => `${i.qty}× ${tr(i.name) || i.id}${optNames(i).length ? ` (${optNames(i).join(', ')})` : ''}${i.note ? ` [${i.note}]` : ''}`).join('; '),
          num(o.subtotal ?? o.total), num(o.service), num(o.tax), num(o.total), dt(o.paid_at), o.served_by_name || o.created_by_name || o.accepted_by_name || '', o.note || '']));
    } else if (kind === 'bills') {
      csv(`счета_${tag}.csv`, ['Чек №', 'Оплачен', 'Стол', 'Заказы', 'Блюда', 'Сбор', 'Налог', 'Итого', 'Чаевые', 'Оплата', 'Части оплаты', 'Кто закрыл', 'Скидка', 'Причина скидки', 'Кто дал скидку', 'Округление'],
        R.bills.map((b) => [b.no, dt(b.paid_at), b.table_label, (b.order_nos || []).join(', '), num(b.subtotal), num(b.service), num(b.tax), num(b.total), num(b.tip), PAY[b.method] || b.method,
          (b.payments || []).map((p) => `${PAY[p.method] || p.method} ${num(p.amount)}`).join(' + '), b.paid_by_name || '',
          num(b.discount || 0), b.discount_reason || '', b.discount_by_name || '', num(b.rounding || 0)]));
    } else {
      const m = new Map();
      for (const o of R.orders) if (o.status !== 'cancelled') for (const i of o.items || []) {
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
  const STV = { new: 'ждёт подачи', accepted: 'ждёт подачи', cooking: 'ждёт подачи', ready: 'ждёт подачи', served: 'подан', cancelled: 'отменён', waiter: 'официант', owner: 'владелец', cook: 'повар', guest: 'гость', staff: 'официант' };
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
        ${Number(z.service) ? row('Сервисный сбор', num(z.service)) : ''}${Number(z.tax) ? row(st.tax_name || 'Налог', num(z.tax)) : ''}
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
        ${row('Отменено заказов', `${z.cancelled || 0} · ${num(z.cancelled_sum)}`)}
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

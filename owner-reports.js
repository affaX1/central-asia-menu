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
  const R = { period: '7', from: '', to: '', orders: [], bills: [], loaded: '', loading: false, error: '' };

  async function loadReports(api) {
    const [f, t] = periodRange(R.period, R.from, R.to);
    const key = `${f.toISOString()}|${t.toISOString()}`;
    if (R.loaded === key || R.loading) return;
    R.loading = true;
    R.error = '';
    try {
      const [o, b] = await Promise.all([api.orders(f.toISOString(), t.toISOString()), api.bills(f.toISOString(), t.toISOString())]);
      R.orders = o;
      R.bills = b;
      R.loaded = key;
    } catch (ex) { R.error = S.errText(ex); }
    R.loading = false;
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
    const received = r2(parts.reduce((s, p) => s + Number(p.amount), 0));
    // столы и официанты
    const group = (list, keyf, valf) => {
      const m = new Map();
      for (const x of list) { const k = keyf(x); if (!k) continue; const r = m.get(k) || { k, v: 0, n: 0 }; r.v = r2(r.v + valf(x)); r.n += 1; m.set(k, r); }
      return [...m.values()].sort((a, b) => b.v - a.v);
    };
    const byTable = group(valid, (o) => `Стол ${o.table_label}`, (o) => Number(o.total));
    const byWaiter = group(valid, (o) => o.accepted_by_name, () => 1);
    const byCashier = group(R.bills, (b) => b.paid_by_name, (b) => Number(b.total));
    const tipsBy = group(R.bills.filter((b) => Number(b.tip) > 0), (b) => b.paid_by_name, (b) => Number(b.tip));

    main.innerHTML = `
      ${toolbar()}
      <p class="help">${esc(dm(f))} — ${esc(dm(addDays(t, -1)))} · «Продажи» — все не отменённые заказы; «Оплачено» — закрытые счета.</p>
      <div class="a-stats rp-stats">
        <div class="a-stat"><b>${money(sales)}</b><span>продажи · заказов ${valid.length}</span></div>
        <div class="a-stat"><b>${money(paid)}</b><span>оплачено · счетов ${R.bills.length}</span></div>
        <div class="a-stat"><b>${money(avg)}</b><span>средний чек</span></div>
        <div class="a-stat${unpaid ? ' hot' : ''}"><b>${money(unpaid)}</b><span>не оплачено</span></div>
      </div>
      ${service || tax || cancelled.length || tips ? `<p class="help">${tips ? `Чаевые: ${money(tips)}. ` : ''}${service ? `Сервисный сбор: ${money(service)}. ` : ''}${tax ? `Налог: ${money(tax)}. ` : ''}${cancelled.length ? `Отменено заказов: ${cancelled.length} на ${money(cancelled.reduce((s, o) => s + Number(o.total), 0))}.` : ''}</p>` : ''}
      <section class="panel"><div class="panel-head"><h3>Продажи по дням</h3></div><div class="panel-body">
        ${bars(byDay, money, { compact: byDay.length > 16 })}
        <details class="rp-table"><summary>Таблицей</summary><table><tbody>${byDay.map((r) => `<tr><td>${esc(r.k)}</td><td>${money(r.v)}</td></tr>`).join('')}</tbody></table></details>
      </div></section>
      <div class="rp-two">
        <section class="panel"><div class="panel-head"><h3>Популярные блюда<small>${top.length}</small></h3></div><div class="panel-body">
          ${hbars(top.slice(0, 12).map((d) => ({ k: d.k, v: d.qty, sum: d.v })), (v) => `${v} шт.`, (r) => money(r.sum))}
          ${top.length > 12 ? `<details class="rp-table"><summary>Все блюда</summary><table><tbody>${top.map((d) => `<tr><td>${esc(d.k)}</td><td>${d.qty} шт.</td><td>${money(d.v)}</td></tr>`).join('')}</tbody></table></details>` : ''}
        </div></section>
        <section class="panel"><div class="panel-head"><h3>Способы оплаты</h3></div><div class="panel-body">
          ${hbars(byPay, money, (r) => `платежей: ${r.n} · ${received ? Math.round((r.v / received) * 100) : 0}%`)}
          ${tips ? `<p class="help">С чаевыми ${money(tips)}: всего получено ${money(received)}.</p>` : ''}
        </div></section>
      </div>
      <section class="panel"><div class="panel-head"><h3>Заказы по часам</h3></div><div class="panel-body">
        ${bars(byHour, (v) => `${v} заказ.`)}
      </div></section>
      <div class="rp-two">
        <section class="panel"><div class="panel-head"><h3>Столы</h3></div><div class="panel-body">${hbars(byTable.slice(0, 15), money, (r) => `заказов: ${r.n}`)}</div></section>
        <section class="panel"><div class="panel-head"><h3>Сотрудники</h3></div><div class="panel-body">
          <p class="section-label" style="margin-top:0">Приняли заказов</p>${hbars(byWaiter, (v) => `${v}`)}
          <p class="section-label">Закрыли счетов на сумму</p>${hbars(byCashier, money, (r) => `счетов: ${r.n}`)}
          ${tipsBy.length ? `<p class="section-label">Чаевые</p>${hbars(tipsBy, money, (r) => `счетов: ${r.n}`)}` : ''}
        </div></section>
      </div>
      <div class="btn-row">
        <button type="button" class="btn ghost" data-rp-csv="orders">${icon('download', 'sm')}Заказы в Excel</button>
        <button type="button" class="btn ghost" data-rp-csv="dishes">${icon('download', 'sm')}Блюда в Excel</button>
        <button type="button" class="btn ghost" data-rp-csv="bills">${icon('download', 'sm')}Счета в Excel</button>
      </div>`;
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
      csv(`заказы_${tag}.csv`, ['№', 'Дата и время', 'Стол', 'Статус', 'Позиции', 'Блюда', 'Сбор', 'Налог', 'Итого', 'Оплачен', 'Принял', 'Комментарий'],
        R.orders.map((o) => [o.no, dt(o.created_at), o.table_label, { new: 'новый', accepted: 'принят', cooking: 'готовится', ready: 'готов', served: 'подан', cancelled: 'отменён' }[o.status] || o.status,
          (o.items || []).map((i) => `${i.qty}× ${tr(i.name) || i.id}${optNames(i).length ? ` (${optNames(i).join(', ')})` : ''}`).join('; '),
          num(o.subtotal ?? o.total), num(o.service), num(o.tax), num(o.total), dt(o.paid_at), o.accepted_by_name || '', o.note || '']));
    } else if (kind === 'bills') {
      csv(`счета_${tag}.csv`, ['Чек №', 'Оплачен', 'Стол', 'Заказы', 'Блюда', 'Сбор', 'Налог', 'Итого', 'Чаевые', 'Оплата', 'Части оплаты', 'Кто закрыл'],
        R.bills.map((b) => [b.no, dt(b.paid_at), b.table_label, (b.order_nos || []).join(', '), num(b.subtotal), num(b.service), num(b.tax), num(b.total), num(b.tip), PAY[b.method] || b.method,
          (b.payments || []).map((p) => `${PAY[p.method] || p.method} ${num(p.amount)}`).join(' + '), b.paid_by_name || '']));
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
    total: 'итого', subtotal: 'блюда', service: 'сбор', tax: 'налог', paid_at: 'оплата', bill_id: 'счёт', note: 'комментарий', accepted_by_name: 'принял',
    edited_at: 'изменён', edited_by_name: 'кто изменил', accepted_at: 'принят в', ready_at: 'готов в', cooking_at: 'начали готовить', cancelled_at: 'отменён в',
    accepted_by: null, status_by: null, method: 'оплата', tables_count: null, tip: 'чаевые', payments: 'части оплаты', served_at: 'подан в', source: 'источник', created_by_name: 'пробил',
  };
  const STV = { new: 'новый', accepted: 'принят', cooking: 'готовится', ready: 'готов', served: 'подан', cancelled: 'отменён', waiter: 'официант', owner: 'владелец', cook: 'повар', guest: 'гость', staff: 'официант' };
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

  window.OwnerReports = {
    reports(m, ctx) { ctxRef = ctx; reports(m, ctx); },
    audit(m, ctx) { ctxRef = ctx; audit(m, ctx); },
  };
})();

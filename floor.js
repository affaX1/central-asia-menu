(() => {
  'use strict';

  // =====================================================================
  //  «Зал» — общий для официанта и владельца:
  //  схема столов (мои / все), вызовы гостей, заказ от официанта, «подано»,
  //  счёт стола: какие заказы платят, чаевые, раздельная оплата; печать чека и
  //  бумажки на кухню; изменение заказа (только владелец).
  //  Права проверяет база. Тексты — на языке сотрудника (S.t).
  // =====================================================================

  const S = window.Staff;
  const { esc, icon, tr, money } = S;
  const t = (...a) => S.t(...a);

  const hhmm = (iso) => new Date(iso).toLocaleTimeString(S.locale(), { hour: '2-digit', minute: '2-digit' });
  const mins = (iso) => Math.max(0, Math.floor((Date.now() - new Date(iso).getTime()) / 60000));
  const ago = (iso) => window.STAFF_T.ago[S.lang]?.(mins(iso)) ?? window.STAFF_T.ago.en(mins(iso));
  const dur = (iso) => window.STAFF_T.dur[S.lang]?.(mins(iso)) ?? window.STAFF_T.dur.en(mins(iso));
  const dayStart = () => { const d = new Date(); d.setHours(0, 0, 0, 0); return d; };
  const r2 = (x) => Math.round(x * 100) / 100;
  // деньги счёта считаем в сенах (целых), как сервер (close_bill)
  const sen = (x) => Math.round((Number(x) || 0) * 100);
  const round5 = (s) => Math.round(s / 5) * 5;                 // наличные: до 5 сен
  const roundingOn = () => S.settings?.cash_rounding !== false;
  const signed = (x) => `${x > 0 ? '+' : x < 0 ? '−' : ''}${money(Math.abs(x))}`;
  // скидка на блюда: сбор и налог пересчитываются с суммы после скидки
  function billCalc(d, disc) {
    const sub = sen(d.subtotal);
    let D = 0;
    if (disc && Number(disc.value) > 0) {
      D = disc.kind === 'pct' ? Math.round((sub * Math.min(100, Number(disc.value))) / 100 + 1e-9) : Math.min(sub, sen(disc.value));
    }
    const srv = D && sub ? Math.round((sen(d.service) * (sub - D)) / sub + 1e-9) : sen(d.service);
    const tax = D && sub ? Math.round((sen(d.tax) * (sub - D)) / sub + 1e-9) : sen(d.tax);
    const total = D ? sub - D + srv + tax : sen(d.total);
    return { subtotal: sub / 100, discount: D / 100, service: srv / 100, tax: tax / 100, total: total / 100 };
  }
  // сколько добавить/убрать, если эту сумму платят наличными
  const cashAdj = (amount) => (roundingOn() ? (round5(sen(amount)) - sen(amount)) / 100 : 0);
  const optNames = (i) => (i.opts || []).map((o) => tr(o.name)).filter(Boolean);
  // готовые пожелания гостя («Без лука», «Alahan kacang»…) — на языке сотрудника; свой текст гостя — как написал
  const chipIndex = (() => {
    const m = new Map();
    const all = window.NOTE_CHIPS || {};
    for (const c of [...(all.dish || []), ...(all.order || [])]) for (const v of Object.values(c)) m.set(String(v).toLowerCase(), c);
    return m;
  })();
  const trNote = (text) => String(text || '').split(',').map((x) => x.trim()).filter(Boolean)
    .map((tok) => { const c = chipIndex.get(tok.toLowerCase()); return c ? (c[S.lang] || c.en || tok) : tok; }).join(', ');
  // пожелание гостя к блюду: заметно, жёлтым, с «!»
  const noteHtml = (i) => (i.note ? `<span class="i-note"><b aria-hidden="true">!</b>${esc(trNote(i.note))}</span>` : '');
  // в ресторане без «принять / готовится / готово»: заказ либо ждёт подачи, либо подан
  const ACTIVE = ['new', 'accepted', 'cooking', 'ready'];
  const stOf = (s) => (ACTIVE.includes(s) ? 'new' : s);
  const lineTitle = (i) => { const o = optNames(i); return `${tr(i.name) || i.id}${o.length ? ` (${o.join(', ')})` : ''}`; };
  const sub = (o) => Number(o.subtotal ?? o.total);
  const PAY_KEYS = ['cash', 'card', 'qr', 'other'];
  const payName = (m) => t('pay')[m] || m;
  const uuid = () => (crypto.randomUUID ? crypto.randomUUID() : 'xxxxxxxx-xxxx-4xxx-8xxx-xxxxxxxxxxxx'.replace(/x/g, () => (Math.random() * 16 | 0).toString(16)));

  // ---------- печать: чек и бумажка на кухню (лента 80 мм) ----------
  function printSlip(title, bodyHtml) {
    const f = document.createElement('iframe');
    f.setAttribute('aria-hidden', 'true');
    f.style.cssText = 'position:fixed;right:0;bottom:0;width:0;height:0;border:0;visibility:hidden';
    document.body.appendChild(f);
    const doc = f.contentDocument;
    doc.open();
    doc.write(`<!doctype html><html lang="${esc(S.lang)}"><head><meta charset="utf-8"><title>${esc(title)}</title><style>
      @page { size: 80mm auto; margin: 3mm; }
      * { box-sizing: border-box; }
      body { margin: 0; width: 74mm; font: 12px/1.4 Helvetica, Arial, sans-serif; color: #000; font-variant-numeric: tabular-nums; }
      h1 { font-size: 17px; line-height: 1.2; margin: 0 0 3px; text-align: center; text-transform: uppercase; letter-spacing: .04em; }
      .c { text-align: center; } .muted { color: #222; } .small { font-size: 10.5px; } .big { font-size: 22px; font-weight: 800; }
      .info { font-size: 10.5px; text-align: center; white-space: pre-line; line-height: 1.35; }
      .doc { text-align: center; font-size: 15px; font-weight: 800; letter-spacing: .12em; margin: 2px 0; }
      .doc-sub { text-align: center; font-size: 11px; font-weight: 700; }
      hr { border: 0; border-top: 1px dashed #000; margin: 6px 0; }
      hr.dbl { border-top: 3px double #000; }
      table { width: 100%; border-collapse: collapse; } td, th { vertical-align: top; padding: 1px 0; }
      td.n { white-space: nowrap; padding-right: 4px; font-weight: 700; } td.s, th.s { text-align: right; white-space: nowrap; padding-left: 6px; }
      .kv td:first-child { color: #222; width: 40%; } .kv td:last-child { text-align: right; font-weight: 700; }
      .items th { font-size: 10.5px; text-align: left; font-weight: 700; text-transform: uppercase; letter-spacing: .04em; border-bottom: 1px solid #000; padding-bottom: 2px; }
      .items td { padding-top: 4px; } .items .name { font-weight: 700; } .items .unit { font-size: 11px; color: #222; }
      .opt { font-size: 11px; padding-left: 10px; }
      .sums td { padding: 1.5px 0; }
      .tot td { font-weight: 800; font-size: 18px; padding: 2px 0; }
      .pay td { font-size: 12px; }
      .note { border: 2px solid #000; padding: 4px 6px; margin-top: 6px; font-size: 14px; font-weight: 700; }
      .k td { font-size: 16px; font-weight: 700; padding: 2px 0; }
      .inote { display: inline-block; margin: 2px 0 2px 6px; padding: 1px 6px; border: 2px solid #000; font-size: 14px; font-weight: 800; }
      .stamp { border: 1.5px solid #000; text-align: center; font-weight: 800; font-size: 11px; letter-spacing: .06em; padding: 3px; margin: 6px 0 2px; text-transform: uppercase; }
    </style></head><body>${bodyHtml}</body></html>`);
    doc.close();
    const go = () => {
      try { f.contentWindow.focus(); f.contentWindow.print(); } catch { /* браузер не дал печатать */ }
      setTimeout(() => f.remove(), 60000);
    };
    if (doc.readyState === 'complete') setTimeout(go, 50); else f.onload = go;
  }

  // бумажка на кухню: крупно стол, блюда, комментарий — без цен
  function printTicket(o) {
    printSlip(`${t('p_kitchen')} ${o.no}`, `
      <div class="c muted">${esc(t('p_kitchen'))}</div>
      <div class="c big">${esc(t('table'))} ${esc(o.table_label)}</div>
      <div class="c">${esc(t('order_no', o.no))} · ${esc(hhmm(o.created_at))}</div>
      <hr><table class="k">${(o.items || []).map((i) => `<tr><td class="n">${esc(i.qty)} ×</td><td>${esc(tr(i.name) || i.id)}${optNames(i).length ? `<div class="opt">${esc(optNames(i).join(', '))}</div>` : ''}${i.note ? `<div class="inote">&gt;&gt; ${esc(trNote(i.note))}</div>` : ''}</td></tr>`).join('')}</table>
      ${o.note ? `<div class="note">${esc(trNote(o.note))}</div>` : ''}
      <hr><div class="c muted">${o.source === 'staff' && o.created_by_name ? `${esc(t('p_accepted', o.created_by_name))} · ` : ''}${esc(t('p_printed', hhmm(new Date().toISOString())))}</div>`);
  }

  // чек / предварительный счёт стола: шапка с реквизитами, кто/когда, позиции с ценой за штуку,
  // подытог, сервисный сбор и налог с процентом, ИТОГО, чаевые и чем оплатили
  // чек и счёт — на языке, который выбрал владелец («Ресторан» → «Язык чека»), у всех одинаково
  function printReceipt(args) { return S.withLang(S.settings?.receipt_lang || 'en', () => printReceiptIn(args)); }
  function printReceiptIn({ table, orders, bill, draft }) {
    const st = S.settings || {};
    const lines = new Map();
    for (const o of orders) for (const i of o.items || []) {
      const k = `${lineTitle(i)}|${i.price}`;
      const l = lines.get(k) || { title: tr(i.name) || i.id, opts: optNames(i), price: Number(i.price), qty: 0 };
      l.qty += Number(i.qty);
      lines.set(k, l);
    }
    const sum = (f) => r2(orders.reduce((s, o) => s + Number(f(o) || 0), 0));
    const tt = bill || draft || { subtotal: sum(sub), service: sum((o) => o.service), tax: sum((o) => o.tax), total: sum((o) => o.total) };
    // на чеке — суммы с копейками; валюта только у итога и оплаты
    const num = (n) => new Intl.NumberFormat(S.locale(), { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(Number(n) || 0);
    const cur = (n) => (st.currency_before ? `${st.currency || ''} ${num(n)}` : `${num(n)} ${st.currency || ''}`).trim();
    // процент считаем из того, что реально взяли с этих заказов (ставка могла поменяться)
    const pct = (part, base) => { const p = base > 0 ? Math.round((part / base) * 1000) / 10 : 0; return p ? `${String(p).replace(/\.0$/, '')}%` : ''; };
    const subT = Number(tt.subtotal) || 0;
    const servT = Number(tt.service) || 0;
    const taxT = Number(tt.tax) || 0;
    const discT = Number(tt.discount) || 0;
    const roundT = Number(bill?.rounding) || 0;
    const taxBase = subT - discT + (st.tax_on_service === false ? 0 : servT);
    const when = new Date(bill?.paid_at || Date.now());
    const addr = tr(st.address);
    const waiters = [...new Set(orders.map((o) => o.served_by_name || (o.source === 'staff' ? o.created_by_name : null)).filter(Boolean))];
    const pays = bill?.payments?.length ? bill.payments : bill ? [{ method: bill.method, amount: Number(bill.total) + Number(bill.tip || 0) + Number(bill.rounding || 0) }] : [];
    const row = (k, v, cls = '') => `<tr${cls ? ` class="${cls}"` : ''}><td>${esc(k)}</td><td class="s">${esc(v)}</td></tr>`;
    printSlip(bill ? t('p_receipt', bill.no) : t('p_prebill'), `
      <h1>${esc(st.name || '')}</h1>
      ${addr ? `<div class="info">${esc(addr)}</div>` : ''}${st.phone ? `<div class="info">${esc(st.phone)}</div>` : ''}
      ${st.receipt_info ? `<div class="info">${esc(st.receipt_info)}</div>` : ''}
      <hr class="dbl">
      <div class="doc">${esc(bill ? t('p_receipt_h', bill.no) : t('p_bill_h'))}</div>
      ${bill?.voided_at ? `<div class="stamp">${esc(t('p_voided'))}${bill.void_reason ? `<br>${esc(bill.void_reason)}` : ''}</div>` : ''}
      <hr>
      <table class="kv">
        ${row(t('table'), table)}
        ${row(t('p_orders_l'), `№${orders.map((o) => o.no).join(', №')}`)}
        ${row(t('p_date'), when.toLocaleDateString(S.locale(), { day: '2-digit', month: '2-digit', year: 'numeric' }))}
        ${row(t('p_time'), when.toLocaleTimeString(S.locale(), { hour: '2-digit', minute: '2-digit' }))}
        ${waiters.length ? row(t('p_waiter'), waiters.join(', ')) : ''}
        ${bill?.paid_by_name ? row(t('p_cashier'), bill.paid_by_name) : ''}
      </table>
      <hr>
      <table class="items">
        <tr><th>${esc(t('p_item'))}</th><th class="s">${esc(t('p_amount'))}</th></tr>
        ${[...lines.values()].map((l) => `<tr><td><div class="name">${esc(l.title)}</div>${l.opts.length ? `<div class="opt">${esc(l.opts.join(', '))}</div>` : ''}<div class="unit">${l.qty} × ${esc(num(l.price))}</div></td><td class="s"><b>${esc(num(l.price * l.qty))}</b></td></tr>`).join('')}
      </table>
      <hr>
      <table class="sums">
        ${row(t('p_subtotal'), num(subT))}
        ${discT ? row(`${t('disc_line', tt.discount_pct ? `${Number(tt.discount_pct)}%` : '')}${tt.discount_reason ? ` (${tt.discount_reason})` : ''}`, `−${num(discT)}`) : ''}
        ${servT ? row(`${t('sum_service')} ${pct(servT, subT - discT)}`.trim(), num(servT)) : ''}
        ${taxT ? row(`${st.tax_name || t('sum_tax')} ${pct(taxT, taxBase)}`.trim(), num(taxT)) : ''}
      </table>
      <hr class="dbl">
      <table>${row(t('p_total'), cur(tt.total), 'tot')}</table>
      ${roundT ? `<table class="sums">${row(t('rounding'), `${roundT > 0 ? '+' : '−'}${num(Math.abs(roundT))}`)}${row(t('p_to_pay'), cur(Number(tt.total) + roundT))}</table>` : ''}
      <hr class="dbl">
      ${bill ? `<table class="pay">
        ${Number(bill.tip) ? row(t('tip'), num(bill.tip)) : ''}
        ${pays.map((p) => row(`${t('p_paid')}: ${payName(p.method)}`, cur(p.amount))).join('')}
        ${pays.length > 1 || Number(bill.tip) ? row(t('p_paid_total'), cur(Number(bill.total) + Number(bill.tip || 0) + roundT), 'tot') : ''}
      </table><hr>` : `<div class="stamp">${esc(t('p_not_receipt'))}</div>`}
      <div class="c" style="font-weight:700;margin-top:4px">${esc(t('p_thanks'))}</div>
      <div class="c small muted">${esc(t('p_printed', hhmm(new Date().toISOString())))}</div>`);
  }

  // ---------- «Зал» ----------
  function create(host) {
    // host: { api, isOwner, me, getOrders(), getDishes(), getCats(), reloadOrders(), onCalls(fresh), rerender() }
    let tables = [];
    let calls = [];
    let bills = [];
    let seenCalls = null;
    let mineOnly = (() => { try { return localStorage.getItem('floor:mine') === '1'; } catch { return false; } })();
    const busy = new Set();
    let payState = null;   // окно счёта: какие заказы, чаевые, части оплаты

    async function load() {
      const from = dayStart().toISOString();
      const [tb, c, b] = await Promise.all([host.api.floorTables(), host.api.calls(from), host.api.bills(from)]);
      tables = tb;
      bills = b;
      const open = c.filter((x) => !x.done_at);
      const fresh = seenCalls ? open.filter((x) => !seenCalls.has(x.id)) : [];
      seenCalls = new Set([...(seenCalls || []), ...c.map((x) => x.id)]);
      calls = c;
      // «принесите счёт» — всем официантам; остальные вызовы — своим и ничьим столам
      const mineFresh = fresh.filter((x) => x.kind === 'bill' || isMineOrFree(x.table_id));
      if (mineFresh.length) host.onCalls?.(mineFresh);
    }
    const openCalls = () => calls.filter((c) => !c.done_at);
    const okBills = () => bills.filter((b) => !b.voided_at);   // отменённые оплаты не считаются
    const myTables = () => tables.filter((x) => x.waiter_id && x.waiter_id === host.me?.id);
    // сигналы: если у официанта есть свои столы — только по своим и ничьим
    const isMineOrFree = (tableId) => {
      if (!myTables().length) return true;
      const tb = tables.find((x) => x.id === tableId);
      return !tb || !tb.waiter_id || tb.waiter_id === host.me?.id;
    };

    // заказы стола, которые ещё не оплачены
    const unpaid = (tableId) => host.getOrders().filter((o) => o.table_id === tableId && !o.paid_at && o.status !== 'cancelled')
      .sort((a, b) => a.no - b.no);

    function tableState(tb) {
      const os = unpaid(tb.id);
      const cs = openCalls().filter((c) => c.table_id === tb.id);
      const bill = cs.find((c) => c.kind === 'bill');
      const waiter = cs.find((c) => c.kind === 'waiter');
      let state = 'free';
      let text = t('fl_free');
      if (os.some((o) => ACTIVE.includes(o.status))) { state = 'new'; text = t('fl_s_new'); }
      else if (os.length) { state = 'eating'; text = t('fl_s_served'); }
      if (bill) { state = 'bill'; text = t('fl_s_bill', bill.pay_method ? t('pay_guest')[bill.pay_method] : ''); }
      const total = r2(os.reduce((s, o) => s + Number(o.total), 0));
      const first = os[0]?.created_at;
      return { os, bill, waiter, state, text, total, first };
    }

    function callsHtml() {
      const list = openCalls().filter((c) => !mineOnly || c.kind === 'bill' || isMineOrFree(c.table_id))
        .sort((a, b) => (b.kind === 'bill') - (a.kind === 'bill') || new Date(a.created_at) - new Date(b.created_at));
      if (!list.length) return '';
      return `<section class="calls">${list.map((c) => `
        <div class="call ${c.kind === 'bill' ? 'is-bill' : ''}">
          ${icon(c.kind === 'bill' ? 'list' : 'bell')}
          <div class="grow"><b>${esc(t('b_call_one', c.table_label, c.kind === 'bill'))}${c.kind === 'bill' && c.pay_method ? ` (${esc(t('pay_guest')[c.pay_method])})` : ''}${c.reason ? ` — ${esc(t('reasons')[c.reason] || c.reason)}` : ''}</b>
            <small>${esc(ago(c.created_at))}</small></div>
          ${c.kind === 'bill' && c.table_id ? `<button type="button" class="btn small" data-fl-table="${esc(c.table_id)}">${esc(t('open_bill'))}</button>` : ''}
          <button type="button" class="btn small ${c.kind === 'bill' ? 'ghost' : ''}" data-fl-done="${esc(c.id)}"${busy.has(c.id) ? ' disabled' : ''}>${icon('check', 'sm')}${esc(t(c.kind === 'bill' ? 'call_done' : 'call_go'))}</button>
        </div>`).join('')}</section>`;
    }

    function render(main) {
      const active = tables.filter((x) => x.active);
      const shownTables = mineOnly ? active.filter((x) => x.waiter_id === host.me?.id) : active;
      const states = active.map((tb) => ({ tb, ...tableState(tb) }));
      const busyN = states.filter((x) => x.state !== 'free').length;
      const unpaidSum = r2(states.reduce((x, y) => x + y.total, 0));
      const paidSum = r2(okBills().reduce((x, b) => x + Number(b.total), 0));
      main.innerHTML = `
        ${callsHtml()}
        <div class="toolbar">
          <div class="chips" style="margin:0">
            <button type="button" class="chip${mineOnly ? '' : ' active'}" data-fl-mine="0">${esc(t('f_all_tables'))}</button>
            <button type="button" class="chip${mineOnly ? ' active' : ''}" data-fl-mine="1">${esc(t('f_my_tables'))}<b>${myTables().length}</b></button>
          </div>
          <span class="grow"></span>
          <button type="button" class="btn small" data-fl-compose="">${icon('plus', 'sm')}${esc(t('new_order'))}</button>
        </div>
        <div class="a-stats">
          <div class="a-stat"><b>${busyN} ${esc(t('of'))} ${active.length}</b><span>${esc(t('fl_busy'))}</span></div>
          <div class="a-stat${openCalls().length ? ' hot' : ''}"><b>${openCalls().length}</b><span>${esc(t('fl_calls'))}</span></div>
          <div class="a-stat"><b>${money(unpaidSum)}</b><span>${esc(t('fl_unpaid'))}</span></div>
          <div class="a-stat"><b>${money(paidSum)}</b><span>${esc(t('fl_paid', okBills().length))}</span></div>
        </div>
        ${mineOnly && !shownTables.length ? `<p class="notice info">${icon('table')}<span>${esc(t('no_my_tables'))}</span></p>` : ''}
        ${active.length ? `<div class="fl-grid">${states.filter((x) => shownTables.includes(x.tb)).map(({ tb, state, text, total, first, waiter, os }) => `
          <button type="button" class="fl-table is-${state}${tb.waiter_id && tb.waiter_id === host.me?.id ? ' is-mine' : ''}" data-fl-table="${esc(tb.id)}">
            <span class="fl-top"><b>${esc(tb.label)}</b>${waiter ? `<span class="fl-bell" title="${esc(t('b_call_one', tb.label, false))}">${icon('bell', 'sm')}</span>` : ''}</span>
            <span class="fl-state">${esc(text)}</span>
            <span class="fl-meta">${os.length ? `${money(total)} · ${esc(dur(first))}` : '&nbsp;'}</span>
            ${tb.waiter_name ? `<span class="fl-waiter">${icon('users', 'sm')}${esc(tb.waiter_id === host.me?.id ? t('f_my_tables') : tb.waiter_name)}</span>` : ''}
          </button>`).join('')}</div>`
          : `<div class="a-empty">${esc(host.isOwner ? 'Столов ещё нет. Создайте их в разделе «Столы и QR».' : t('fl_no_tables'))}</div>`}
        <p class="help">${esc(t('fl_hint'))}</p>`;
    }

    // ---------- окно стола ----------
    function orderBlock(o, multi) {
      const canServe = ACTIVE.includes(o.status);
      return `<article class="fl-order">
        <div class="o-head">${multi ? `<label class="fl-pick"><input type="checkbox" data-fl-pick="${esc(o.id)}"${payState?.ids.has(o.id) ? ' checked' : ''}>` : '<span>'}<b>№${esc(o.no)} · ${esc(hhmm(o.created_at))}</b>${multi ? '</label>' : '</span>'}<span class="st st-${esc(stOf(o.status))}">${esc(t('st')[stOf(o.status)])}</span></div>
        <ul class="o-items">${(o.items || []).map((i) => `<li><span><b>${esc(i.qty)}×</b> ${esc(tr(i.name) || i.id)}${optNames(i).length ? `<em class="o-opt">${esc(optNames(i).join(', '))}</em>` : ''}${noteHtml(i)}</span><span>${money(i.price * i.qty)}</span></li>`).join('')}</ul>
        ${o.note ? `<div class="o-note"><b>${esc(t('comment'))}:</b> ${esc(trNote(o.note))}</div>` : ''}
        ${o.source === 'staff' && o.created_by_name ? `<div class="o-meta">${esc(t('entered_by', o.created_by_name))}</div>` : ''}
        <div class="fl-order-actions">
          ${canServe ? `<button type="button" class="btn small" data-fl-serve="${esc(o.id)}">${icon('check', 'sm')}${esc(t('serve'))}</button>` : ''}
          <button type="button" class="btn small ghost" data-fl-ticket="${esc(o.id)}">${icon('printer', 'sm')}${esc(t('print_kitchen'))}</button>
          ${host.isOwner ? `<button type="button" class="btn small ghost" data-fl-edit="${esc(o.id)}">${icon('edit', 'sm')}Изменить</button>` : ''}
        </div>
      </article>`;
    }

    // сумма выбранных заказов
    function dueOf(tableId) {
      const os = unpaid(tableId).filter((o) => payState.ids.has(o.id));
      const sum = (f) => r2(os.reduce((x, o) => x + Number(f(o) || 0), 0));
      return { os, subtotal: sum(sub), service: sum((o) => o.service), tax: sum((o) => o.tax), total: sum((o) => o.total) };
    }

    const canDiscount = () => host.isOwner || !!S.settings?.waiter_discounts;
    const calcOf = (tableId) => billCalc(dueOf(tableId), payState?.disc?.value ? payState.disc : null);
    // раздельная оплата: наличная часть округляется до 5 сен, остальное — как есть
    function partsTarget(grand, parts) {
      const nonCash = r2(parts.filter((p) => p.method !== 'cash').reduce((x, p) => x + (Number(p.amount) || 0), 0));
      const hasCash = parts.some((p) => p.method === 'cash' && Number(p.amount) > 0);
      return r2(grand + (hasCash ? cashAdj(r2(grand - nonCash)) : 0));
    }
    function discHtml() {
      if (!canDiscount()) return '';
      const ds = payState.disc;
      if (!payState.discOpen && !ds?.value) return `<button type="button" class="link-btn fl-disc-open" data-fl-disc-open>${icon('plus', 'sm')}${esc(t('disc_btn'))}</button>`;
      const pcts = [5, 10, 15, 20];
      return `<section class="fl-disc">
        <p class="section-label" style="margin-top:0">${esc(t('disc_t'))}</p>
        <div class="fl-tip">${pcts.map((v) => `<button type="button" class="chip${ds?.kind === 'pct' && Number(ds.value) === v ? ' active' : ''}" data-fl-disc-pct="${v}">${v}%</button>`).join('')}
          <button type="button" class="chip${ds?.kind === 'pct' && Number(ds.value) === 100 ? ' active' : ''}" data-fl-disc-pct="100">${esc(t('disc_comp'))}</button>
          <label class="field fl-tip-in"><span class="sr-only">${esc(t('disc_amount'))}</span><input type="number" min="0" step="0.5" inputmode="decimal" data-fl-disc-amt value="${ds?.kind === 'amount' ? esc(ds.value) : ''}" placeholder="${esc(t('disc_amount'))}"></label></div>
        <p class="section-label">${esc(t('disc_why'))}</p>
        <div class="fl-tip">${t('disc_reasons').map((r) => `<button type="button" class="chip${ds?.reason === r ? ' active' : ''}" data-fl-disc-why="${esc(r)}">${esc(r)}</button>`).join('')}</div>
        <label class="field"><span class="sr-only">${esc(t('disc_why'))}</span><input type="text" maxlength="100" data-fl-disc-why-in value="${esc(ds?.reason || '')}" placeholder="${esc(t('disc_why'))}"></label>
        ${ds?.value && !String(ds.reason || '').trim() ? `<p class="notice bad">${icon('alert')}<span>${esc(t('disc_need_why'))}</span></p>` : ''}
        <button type="button" class="link-btn" data-fl-disc-clear>${esc(t('disc_clear'))}</button>
      </section>`;
    }

    function payHtml(tableId) {
      const raw = dueOf(tableId);
      const d = calcOf(tableId);
      const ds = payState.disc;
      const tip = r2(Number(payState.tip) || 0);
      const grand = r2(d.total + tip);
      const parts = payState.parts;
      const partsSum = r2(parts.reduce((x, p) => x + (Number(p.amount) || 0), 0));
      const left = r2(partsTarget(grand, parts) - partsSum);
      const needWhy = !!ds?.value && !String(ds.reason || '').trim();
      const disabled = !raw.os.length || needWhy;
      const cashR = cashAdj(grand);
      const discLabel = ds?.value ? `${ds.kind === 'pct' ? `${Number(ds.value)}%` : ''}${ds.reason ? ` · ${ds.reason}` : ''}`.replace(/^ · /, '') : '';
      return `
        <dl class="fl-sum">
          ${d.service || d.tax || d.discount ? `<div><dt>${esc(t('sum_items'))}</dt><dd>${money(d.subtotal)}</dd></div>` : ''}
          ${d.discount ? `<div class="disc"><dt>${esc(t('disc_line', discLabel))}</dt><dd>−${money(d.discount)}</dd></div>` : ''}
          ${d.service ? `<div><dt>${esc(t('sum_service'))}</dt><dd>${money(d.service)}</dd></div>` : ''}
          ${d.tax ? `<div><dt>${esc(S.settings?.tax_name || t('sum_tax'))}</dt><dd>${money(d.tax)}</dd></div>` : ''}
          <div class="tot"><dt>${esc(t('sum_due'))}</dt><dd>${money(d.total)}</dd></div>
        </dl>
        ${discHtml()}
        <p class="section-label">${esc(t('tip'))}</p>
        <div class="fl-tip">
          <button type="button" class="chip${!tip ? ' active' : ''}" data-fl-tip="0">${esc(t('tip_none'))}</button>
          <button type="button" class="chip" data-fl-tip="5%">5%</button>
          <button type="button" class="chip" data-fl-tip="10%">10%</button>
          <button type="button" class="chip" data-fl-tip="round">${esc(t('tip_round'))}</button>
          <label class="field fl-tip-in"><span class="sr-only">${esc(t('tip'))}</span><input type="number" min="0" step="0.5" inputmode="decimal" data-fl-tip-in value="${tip || ''}" placeholder="0"></label>
        </div>
        ${tip ? `<p class="fl-grand">${esc(t('with_tip'))}: <b>${money(grand)}</b></p>` : ''}
        ${!payState.split && cashR ? `<p class="help fl-round">${esc(t('cash_to_pay', money(r2(grand + cashR)), signed(cashR)))}</p>` : ''}
        <p class="section-label">${esc(t('payment'))}</p>
        ${payState.split ? `
          <ul class="fl-parts">${parts.map((p, i) => `<li>
            <select data-fl-part-m="${i}" aria-label="${esc(t('payment'))}">${PAY_KEYS.map((k) => `<option value="${k}"${p.method === k ? ' selected' : ''}>${esc(payName(k))}</option>`).join('')}</select>
            <input type="number" min="0" step="0.5" inputmode="decimal" data-fl-part-a="${i}" value="${p.amount ?? ''}" aria-label="${esc(t('payment'))}">
            ${parts.length > 1 ? `<button type="button" class="btn small ghost" data-fl-part-del="${i}" aria-label="${esc(t('cancel'))}">${icon('trash', 'sm')}</button>` : ''}
          </li>`).join('')}</ul>
          <p class="fl-left${Math.abs(left) > 0.009 ? ' bad' : ''}">${Math.abs(left) < 0.01 ? '' : left > 0 ? esc(t('left_to_pay', money(left))) : esc(t('over_pay', money(-left)))}</p>
          <div class="btn-row" style="margin-top:6px">
            ${parts.length < 4 ? `<button type="button" class="btn small ghost" data-fl-part-add>${icon('plus', 'sm')}${esc(t('add_part'))}</button>` : ''}
            <button type="button" class="btn small ghost" data-fl-split="0">${esc(t('one_method'))}</button>
          </div>
          <button type="button" class="btn block fl-close" data-fl-pay="split"${disabled || Math.abs(left) > 0.009 ? ' disabled' : ''}>${esc(t('close_bill_btn', money(grand)))}</button>`
        : `<div class="fl-pay">${PAY_KEYS.map((k) => `<button type="button" class="btn${payState.hint === k ? '' : ' soft'}" data-fl-pay="${k}"${disabled ? ' disabled' : ''}>${esc(payName(k))}</button>`).join('')}</div>
          <button type="button" class="link-btn" data-fl-split="1"${disabled ? ' disabled' : ''}>${esc(t('split'))}</button>`}`;
    }

    function openTable(id, keep = false) {
      const tb = tables.find((x) => x.id === id);
      if (!tb) return;
      const { os, bill, waiter } = tableState(tb);
      if (!keep || !payState || payState.table !== id) {
        payState = { table: id, ids: new Set(os.map((o) => o.id)), tip: 0, split: false, parts: [], hint: bill?.pay_method || null };
      }
      const multi = os.length > 1;
      const paid = bills.filter((b) => b.table_id === id);
      const mine = tb.waiter_id && tb.waiter_id === host.me?.id;
      const m = S.modal(`
        <h2 id="modal-title">${esc(t('table'))} ${esc(tb.label)}</h2>
        <div class="fl-head">
          <label class="switch"><input type="checkbox" data-fl-claim="${esc(id)}"${mine ? ' checked' : ''}><span class="track"></span>${esc(t('my_table'))}</label>
          ${tb.waiter_name && !mine ? `<span class="help" style="margin:0">${esc(t('served_by', tb.waiter_name))}</span>` : ''}
          <span class="grow"></span>
          ${os.length ? `<button type="button" class="btn small ghost" data-fl-move="${esc(id)}">${icon('table', 'sm')}${esc(t('mv_btn'))}</button>` : ''}
          <button type="button" class="btn small" data-fl-compose="${esc(id)}">${icon('plus', 'sm')}${esc(t('new_order'))}</button>
        </div>
        ${openCalls().filter((c) => c.table_id === id && c.kind === 'waiter' && c.reason).map((c) => `<p class="notice">${icon('bell')}<span><b>${esc(t('reasons')[c.reason] || c.reason)}</b> · ${esc(ago(c.created_at))} <button type="button" class="link-btn" data-fl-done="${esc(c.id)}">${esc(t('call_done'))}</button></span></p>`).join('')}
        ${waiter && !waiter.reason ? `<p class="notice">${icon('bell')}<span>${esc(t('guest_calls', ago(waiter.created_at)))} <button type="button" class="link-btn" data-fl-done="${esc(waiter.id)}">${esc(t('mark_came'))}</button></span></p>` : ''}
        ${bill ? `<p class="notice">${icon('list')}<span>${esc(t('guest_bill', bill.pay_method ? t('pay_guest')[bill.pay_method] : ''))}</span></p>` : ''}
        ${os.length ? `
          ${multi ? `<p class="section-label">${esc(t('who_pays'))}</p>` : ''}
          ${os.map((o) => orderBlock(o, multi)).join('')}
          <div id="fl-pay-box">${payHtml(id)}</div>
          <div class="modal-foot"><button type="button" class="btn ghost" data-fl-prebill>${icon('printer', 'sm')}${esc(t('print_bill'))}</button><button type="button" class="btn ghost" data-modal-close>${esc(t('close'))}</button></div>`
        : `<p class="a-empty" style="padding:18px 0">${esc(t('no_unpaid'))}</p><div class="modal-foot"><button type="button" class="btn ghost" data-modal-close>${esc(t('close'))}</button></div>`}
        ${paid.length ? `<p class="section-label">${esc(t('paid_today'))}</p><ul class="fl-bills">${paid.map((b) => `
          <li${b.voided_at ? ' class="is-void"' : ''}><span><b>${esc(t('p_receipt', b.no))}</b> · ${esc(hhmm(b.paid_at))} · ${esc(payName(b.method))}${Number(b.tip) ? ` · ${esc(t('tip'))} ${money(b.tip)}` : ''}${b.paid_by_name ? ` · ${esc(b.paid_by_name)}` : ''}
            ${b.voided_at ? `<em class="void-note">${esc(t('void_done_by', b.voided_by_name || ''))}${b.void_reason ? `: ${esc(b.void_reason)}` : ''}</em>` : ''}</span>
          <span><span class="b-sum">${money(b.total)}</span> <button type="button" class="link-btn" data-fl-reprint="${esc(b.id)}">${icon('printer', 'sm')}${esc(t('receipt'))}</button>
            ${host.isOwner && !b.voided_at ? `<button type="button" class="link-btn danger" data-fl-void="${esc(b.id)}">${esc(t('void_btn'))}</button>` : ''}</span></li>`).join('')}</ul>` : ''}`);
      m.dataset.table = id;
      m.addEventListener('input', (e) => {
        if (e.target.matches('[data-fl-tip-in]')) { payState.tip = Math.max(0, Number(e.target.value) || 0); syncParts(); repaintPay(true); }
        else if (e.target.matches('[data-fl-disc-amt]')) { const v = Math.max(0, Number(e.target.value) || 0); payState.disc = { ...(payState.disc || {}), kind: v ? 'amount' : (payState.disc?.kind || 'pct'), value: v }; syncParts(); repaintPay(true); }
        else if (e.target.matches('[data-fl-disc-why-in]')) { payState.disc = { ...(payState.disc || { kind: 'pct', value: 0 }), reason: e.target.value.slice(0, 100) }; repaintPay(true); }
        else if (e.target.matches('[data-fl-part-a]')) {
          const i = Number(e.target.dataset.flPartA);
          payState.parts[i].amount = e.target.value;
          if (i < payState.parts.length - 1) syncParts();   // последняя часть добирает остаток
          repaintPay(true);
        }
      });
      m.addEventListener('change', (e) => {
        if (e.target.matches('[data-fl-pick]')) { if (e.target.checked) payState.ids.add(e.target.dataset.flPick); else payState.ids.delete(e.target.dataset.flPick); syncParts(); repaintPay(); }
        else if (e.target.matches('[data-fl-part-m]')) { payState.parts[e.target.dataset.flPartM].method = e.target.value; syncParts(); repaintPay(); }
      });
    }
    // перерисовать только блок оплаты (не сбивая ввод)
    function repaintPay(keepFocus) {
      const box = document.getElementById('fl-pay-box');
      if (!box || !payState) return;
      const active = keepFocus ? document.activeElement : null;
      const sel = active && (active.dataset.flTipIn !== undefined ? '[data-fl-tip-in]' : active.dataset.flDiscAmt !== undefined ? '[data-fl-disc-amt]' : active.dataset.flDiscWhyIn !== undefined ? '[data-fl-disc-why-in]' : active.dataset.flPartA !== undefined ? `[data-fl-part-a="${active.dataset.flPartA}"]` : null);
      const pos = active?.selectionStart;
      box.innerHTML = payHtml(payState.table);
      if (sel) { const el = box.querySelector(sel); if (el) { el.focus(); try { el.setSelectionRange(pos, pos); } catch { /* number input */ } } }
    }
    // при раздельной оплате последняя часть добирает остаток
    function syncParts() {
      if (!payState.split || !payState.parts.length) return;
      const grand = r2(calcOf(payState.table).total + (Number(payState.tip) || 0));
      const others = payState.parts.slice(0, -1);
      const last = payState.parts[payState.parts.length - 1];
      const othersSum = r2(others.reduce((x, p) => x + (Number(p.amount) || 0), 0));
      if (last.method === 'cash') {
        // наличная часть — остаток после карт/QR, округлённый до 5 сен
        const nonCash = r2(others.filter((p) => p.method !== 'cash').reduce((x, p) => x + (Number(p.amount) || 0), 0));
        const cashOthers = r2(othersSum - nonCash);
        const cashDue = r2(grand - nonCash);
        last.amount = Math.max(0, r2(cashDue + cashAdj(cashDue) - cashOthers));
      } else {
        last.amount = Math.max(0, r2(grand - othersSum));
      }
    }

    async function pay(tableId, how) {
      const tb = tables.find((x) => x.id === tableId);
      const d = dueOf(tableId);
      if (!tb || !d.os.length) return;
      const c = calcOf(tableId);
      const disc = payState.disc?.value ? { kind: payState.disc.kind, value: Number(payState.disc.value), reason: String(payState.disc.reason || '').trim() } : null;
      if (disc && !disc.reason) { S.toast(t('disc_need_why'), true); return; }
      const tip = r2(Number(payState.tip) || 0);
      let grand = r2(c.total + tip);
      let method = how;
      let payments = null;
      if (how === 'split') {
        payments = payState.parts.map((p) => ({ method: p.method, amount: r2(Number(p.amount) || 0) })).filter((p) => p.amount > 0);
        const methods = [...new Set(payments.map((p) => p.method))];
        method = methods.length === 1 ? methods[0] : 'mixed';
      }
      if (!payments && method === 'cash') grand = r2(grand + cashAdj(grand));
      if (payments) grand = r2(payments.reduce((x, p) => x + p.amount, 0));
      const label = payments ? payments.map((p) => `${payName(p.method)} ${money(p.amount)}`).join(' + ') : payName(method);
      if (!await S.ask(t('ask_close', tb.label, money(grand), label), { ok: t('ok_paid') })) return;
      document.querySelectorAll('[data-fl-pay]').forEach((b) => { b.disabled = true; });
      try {
        const b = await host.api.closeBill(tableId, method, d.os.map((o) => o.id), tip, payments, disc);
        bills = [b, ...bills];
        await host.reloadOrders();
        calls = calls.map((c) => (c.table_id === tableId && c.kind === 'bill' && !c.done_at ? { ...c, done_at: b.paid_at } : c));
        payState = null;
        S.closeModal();
        host.rerender();
        const again = await S.ask(t('ask_print', tb.label, money(Number(b.total) + Number(b.tip || 0) + Number(b.rounding || 0)), label), { ok: t('print_receipt'), cancel: t('no_need') });
        if (again) printReceipt({ table: tb.label, orders: d.os, bill: b });
      } catch (ex) {
        const m = String(ex?.message || '');
        S.toast(/no_discount_rights/.test(m) ? t('e_disc_rights') : /bad_discount|discount_reason/.test(m) ? t('e_disc') : /has_new/.test(m) ? t('e_has_new') : /nothing_to_pay/.test(m) ? t('e_nothing') : /bad_payments/.test(m) ? t('e_payments') : /bad_tip/.test(m) ? t('e_tip') : S.errText(ex), true);
        await host.reloadOrders().catch(() => {});
        S.closeModal();
        host.rerender();
      }
    }

    async function done(id) {
      if (busy.has(id)) return;
      busy.add(id);
      host.rerender();
      try {
        await host.api.doneCall(id);
        calls = calls.map((c) => (c.id === id ? { ...c, done_at: new Date().toISOString() } : c));
        S.toast(t('t_call_done'));
      } catch (ex) { S.toast(S.errText(ex), true); }
      busy.delete(id);
      const open = document.querySelector('.modal')?.dataset.table;
      host.rerender();
      if (open) openTable(open, true);
    }

    async function serve(id) {
      const o = host.getOrders().find((x) => x.id === id);
      if (!o || busy.has(id)) return;
      busy.add(id);
      try {
        await host.api.serveOrder(id);
        await host.reloadOrders();
        S.toast(t('t_served', o.no));
      } catch (ex) { S.toast(S.errText(ex), true); }
      busy.delete(id);
      const open = document.querySelector('.modal')?.dataset.table;
      host.rerender();
      if (open) openTable(open, true);
    }

    async function claim(tableId, on) {
      try {
        await host.api.claimTable(tableId, on);
        await load();
      } catch (ex) { S.toast(S.errText(ex), true); }
      host.rerender();
      if (document.querySelector('.modal')?.dataset.table === tableId) openTable(tableId, true);
    }

    // ---------- пересадить гостей / объединить столы ----------
    function moveDialog(fromId) {
      const from = tables.find((x) => x.id === fromId);
      if (!from) return;
      const os = unpaid(fromId);
      if (!os.length) return;
      // если в счёте отмечены не все заказы — пересаживаем только отмеченные
      const picked = payState?.table === fromId ? os.filter((o) => payState.ids.has(o.id)) : os;
      const some = picked.length && picked.length < os.length ? picked : null;
      const others = tables.filter((x) => x.active && x.id !== fromId).map((tb) => ({ tb, ...tableState(tb) }));
      S.modal(`
        <h2 id="modal-title">${esc(t('mv_title', from.label))}</h2>
        <p class="help" style="margin-top:0">${esc(some ? t('mv_some', some.length, os.length) : t('mv_all', os.length))}</p>
        <div class="fl-move-grid">${others.map(({ tb, state, os: tos }) => `
          <button type="button" class="fl-move-to is-${state === 'free' ? 'free' : 'busy'}" data-fl-move-to="${esc(tb.id)}" data-from="${esc(fromId)}">
            <b>${esc(tb.label)}</b><small>${esc(tos.length ? t('mv_join') : t('fl_free'))}</small>
          </button>`).join('') || `<p class="a-empty">${esc(t('fl_no_tables'))}</p>`}</div>
        <div class="modal-foot"><button type="button" class="btn ghost" data-fl-table="${esc(fromId)}">${esc(t('back'))}</button></div>`);
      document.querySelector('.modal').dataset.moveIds = some ? some.map((o) => o.id).join(',') : '';
    }

    async function moveTo(fromId, toId, ids) {
      const from = tables.find((x) => x.id === fromId);
      const to = tables.find((x) => x.id === toId);
      if (!from || !to || busy.has('move')) return;
      const join = unpaid(toId).length > 0;
      const n = ids ? ids.length : unpaid(fromId).length;
      if (!await S.ask(t(join ? 'mv_ask_join' : 'mv_ask', from.label, to.label, n), { ok: t(join ? 'mv_ok_join' : 'mv_ok') })) return;
      busy.add('move');
      try {
        await host.api.moveOrders(fromId, toId, ids);
        await Promise.all([host.reloadOrders(), load()]);
        payState = null;
        S.toast(t('mv_done', to.label));
        host.rerender();
        openTable(toId);
      } catch (ex) {
        const m = String(ex?.message || '');
        S.toast(/nothing_to_move/.test(m) ? t('e_nothing') : /not_found/.test(m) ? t('mv_e_table') : S.errText(ex), true);
        await Promise.all([host.reloadOrders(), load()]).catch(() => {});
        host.rerender();
        openTable(fromId);
      }
      busy.delete('move');
    }

    // ---------- владелец: отменить оплату ----------
    async function voidBill(id) {
      const b = bills.find((x) => x.id === id);
      if (!b || b.voided_at || busy.has(id)) return;
      const why = await S.ask(t('void_ask', b.no, money(b.total)), { ok: t('void_ok'), title: t('void_title'), input: '' });
      if (why === null) return;
      if (!why.trim()) { S.toast(t('void_need_why'), true); return; }
      busy.add(id);
      const open = document.querySelector('.modal')?.dataset.table;
      try {
        const nb = await host.api.voidBill(id, why.trim());
        bills = bills.map((x) => (x.id === id ? { ...x, ...nb } : x));
        await host.reloadOrders();
        S.toast(t('void_toast', b.no));
      } catch (ex) {
        const m = String(ex?.message || '');
        S.toast(/day_closed/.test(m) ? t('void_e_closed') : /already_voided/.test(m) ? t('void_e_again') : /void_reason/.test(m) ? t('void_need_why') : S.errText(ex), true);
        await load().catch(() => {});
      }
      busy.delete(id);
      host.rerender();
      if (open) openTable(open);
    }

    // ---------- заказ от официанта ----------
    function compose(tableId) {
      const active = tables.filter((x) => x.active);
      const cart = new Map();   // key → { id, qty, opts, unit, name, optNames }
      let cat = '';
      let q = '';
      let openDish = null;
      let table = tableId || (myTables().length === 1 ? myTables()[0].id : '');
      const cats = host.getCats().filter((c) => !c.hidden);
      const catIds = new Set(cats.map((c) => c.id));
      const dishes = host.getDishes().filter((d) => !d.hidden && catIds.has(d.category_id));
      const norm = (x) => String(x || '').toLowerCase().replace(/ё/g, 'е');
      const key = (id, opts) => `${id}|${[...opts].sort().join(',')}`;
      const unitOf = (d, opts) => {
        let u = Number(d.price);
        const names = [];
        for (const g of d.options || []) for (const c of g.choices || []) if (opts.includes(`${g.id}:${c.id}`)) { u += Number(c.price) || 0; names.push(tr(c.name)); }
        return { unit: Math.max(0, r2(u)), names };
      };
      const valid = (d, opts) => (d.options || []).every((g) => {
        const n = (g.choices || []).filter((c) => opts.includes(`${g.id}:${c.id}`)).length;
        return (!g.required || n > 0) && (g.multi || n <= 1);
      });
      const m = S.modal('<div id="cp"></div>');
      m.classList.add('modal-wide');
      const paint = () => {
        const tb = active.find((x) => x.id === table);
        const words = norm(q).split(/\s+/).filter(Boolean);
        const list = dishes.filter((d) => (!cat || d.category_id === cat) && (!words.length || words.every((w) => norm(Object.values(d.name || {}).join(' ')).includes(w))));
        const count = [...cart.values()].reduce((x, l) => x + l.qty, 0);
        const sum = r2([...cart.values()].reduce((x, l) => x + l.unit * l.qty, 0));
        const keepQ = document.activeElement?.id === 'cp-q';
        m.querySelector('#cp').innerHTML = `
          <h2 id="modal-title">${esc(tb ? t('comp_t', tb.label) : t('new_order'))}</h2>
          ${tableId ? '' : `<label class="field"><span>${esc(t('comp_choose'))}</span><select id="cp-table"><option value="">—</option>
            ${active.map((x) => `<option value="${esc(x.id)}"${x.id === table ? ' selected' : ''}>${esc(t('table'))} ${esc(x.label)}${x.waiter_id === host.me?.id ? ' ★' : ''}</option>`).join('')}</select></label>`}
          <div class="toolbar" style="margin-top:10px"><label class="search">${icon('search')}<input id="cp-q" type="search" placeholder="${esc(t('comp_search'))}" value="${esc(q)}" autocomplete="off"></label></div>
          <div class="chips"><button type="button" class="chip${!cat ? ' active' : ''}" data-cp-cat="">${esc(t('all'))}</button>
            ${cats.map((c) => `<button type="button" class="chip${cat === c.id ? ' active' : ''}" data-cp-cat="${esc(c.id)}">${esc(tr(c.name))}</button>`).join('')}</div>
          <ul class="cp-list">${list.map((d) => {
            const inCart = [...cart.values()].filter((l) => l.id === d.id).reduce((x, l) => x + l.qty, 0);
            const isOpen = openDish === d.id;
            return `<li class="${d.available ? '' : 'is-off'}">
              <div class="cp-row"><div class="grow"><b>${esc(tr(d.name))}</b><small>${money(d.price)}${d.available ? '' : ` · ${esc(t('out_stock'))}`}</small></div>
                ${inCart ? `<span class="cp-n">${inCart}</span>` : ''}
                ${d.available ? `<button type="button" class="btn small soft" data-cp-add="${esc(d.id)}" aria-label="${esc(t('comp_add'))}">${icon('plus', 'sm')}</button>` : ''}</div>
              ${isOpen ? `<div class="cp-opts">${(d.options || []).map((g) => `<fieldset class="ed-group"><legend>${esc(tr(g.name))}${g.required ? ` (${esc(t('required'))})` : ''}</legend>
                ${(g.choices || []).map((c, ci) => `<label class="check"><input type="${g.multi ? 'checkbox' : 'radio'}" name="cpg-${esc(g.id)}" value="${esc(g.id)}:${esc(c.id)}"${!g.multi && g.required && ci === 0 ? ' checked' : ''}>${esc(tr(c.name))}${Number(c.price) ? ` (${Number(c.price) > 0 ? '+' : '−'}${esc(money(Math.abs(c.price)))})` : ''}</label>`).join('')}</fieldset>`).join('')}
                <button type="button" class="btn small" data-cp-confirm="${esc(d.id)}">${icon('plus', 'sm')}${esc(t('comp_add'))}</button></div>` : ''}
            </li>`;
          }).join('') || `<li class="a-empty">${esc(t('nothing_found'))}</li>`}</ul>
          ${cart.size ? `<p class="section-label">${esc(t('comp_in_order'))}</p><ul class="rows cp-cart">${[...cart.entries()].map(([k, l]) => `<li><div class="grow"><b>${esc(tr(l.name))}</b>${l.optNames.length ? `<small>${esc(l.optNames.join(', '))}</small>` : ''}<small>${money(l.unit)}</small></div>
            <div class="stepper"><button type="button" data-cp-dec="${esc(k)}" aria-label="−">${icon('minus', 'sm')}</button><span>${l.qty}</span><button type="button" data-cp-inc="${esc(k)}" aria-label="+">${icon('plus', 'sm')}</button></div></li>`).join('')}</ul>` : ''}
          <label class="field"><span>${esc(t('comp_note'))}</span><input id="cp-note" type="text" maxlength="300" value="${esc(m.dataset.note || '')}"></label>
          <p class="notice bad" id="cp-err" hidden></p>
          <div class="modal-foot"><button type="button" class="btn" id="cp-send"${!count || !table ? ' disabled' : ''}>${icon('check', 'sm')}${esc(count ? t('comp_send', count, money(sum)) : t('comp_empty'))}</button>
            <button type="button" class="btn ghost" data-modal-close>${esc(t('cancel'))}</button></div>`;
        if (keepQ) { const i = m.querySelector('#cp-q'); i.focus(); i.setSelectionRange(i.value.length, i.value.length); }
      };
      const put = (d, opts) => {
        const k = key(d.id, opts);
        const { unit, names } = unitOf(d, opts);
        const l = cart.get(k) || { id: d.id, qty: 0, opts, unit, name: d.name, optNames: names };
        l.qty = Math.min(50, l.qty + 1);
        cart.set(k, l);
      };
      paint();
      m.addEventListener('input', (e) => {
        if (e.target.id === 'cp-q') { q = e.target.value; paint(); }
        else if (e.target.id === 'cp-note') m.dataset.note = e.target.value;
      });
      m.addEventListener('change', (e) => { if (e.target.id === 'cp-table') { table = e.target.value; paint(); } });
      m.addEventListener('click', async (e) => {
        const c = e.target.closest('[data-cp-cat]');
        if (c) { cat = c.dataset.cpCat; paint(); return; }
        const add = e.target.closest('[data-cp-add]');
        if (add) {
          const d = dishes.find((x) => x.id === add.dataset.cpAdd);
          if (d.options?.length) { openDish = openDish === d.id ? null : d.id; paint(); return; }
          put(d, []);
          paint();
          return;
        }
        const conf = e.target.closest('[data-cp-confirm]');
        if (conf) {
          const d = dishes.find((x) => x.id === conf.dataset.cpConfirm);
          const opts = [...m.querySelectorAll('.cp-opts input:checked')].map((x) => x.value);
          if (!valid(d, opts)) { S.toast(t('e_options'), true); return; }
          put(d, opts);
          openDish = null;
          paint();
          return;
        }
        const inc = e.target.closest('[data-cp-inc]');
        if (inc) { const l = cart.get(inc.dataset.cpInc); l.qty = Math.min(50, l.qty + 1); paint(); return; }
        const dec = e.target.closest('[data-cp-dec]');
        if (dec) { const l = cart.get(dec.dataset.cpDec); l.qty -= 1; if (l.qty < 1) cart.delete(dec.dataset.cpDec); paint(); return; }
        const send = e.target.closest('#cp-send');
        if (send) {
          send.disabled = true;
          m.dataset.key = m.dataset.key || uuid();   // повторное нажатие не создаст второй заказ
          try {
            const o = await host.api.staffPlaceOrder(table, [...cart.values()].map((l) => ({ id: l.id, qty: l.qty, opts: l.opts })), (m.dataset.note || '').trim() || null, m.dataset.key);
            await host.reloadOrders();
            S.closeModal();
            S.toast(t('comp_sent', o.no));
            host.rerender();
          } catch (ex) {
            const msg = String(ex?.message || '');
            const err = m.querySelector('#cp-err');
            err.hidden = false;
            err.textContent = /unavailable/.test(msg) ? t('e_unavailable') : /options/.test(msg) ? t('e_options') : /bad_table/.test(msg) ? t('e_table') : S.errText(ex);
            send.disabled = false;
          }
        }
      });
    }

    // ---------- владелец: изменить заказ ----------
    function editOrder(o) {
      let items = (o.items || []).map((i) => ({ ...i }));
      const dishes = host.getDishes().filter((d) => d.available && !d.hidden);
      const key = (i) => `${i.id}|${(i.opts || []).map((x) => `${x.g}:${x.c}`).sort().join(',')}|${i.note || ''}`;
      const m = S.modal(`<h2 id="modal-title">Изменить заказ №${esc(o.no)} · стол ${esc(o.table_label)}</h2>
        <p class="help">Уберите блюдо или поменяйте количество. Позиции, которые уже были, сохраняют свою цену; новые — по текущему меню. Гость увидит изменённый заказ.</p>
        <ul class="rows" id="ed-lines"></ul>
        <p class="section-label">Добавить блюдо</p>
        <div class="form-grid"><label class="field full"><span class="sr-only">Блюдо</span><select id="ed-dish"><option value="">Выберите блюдо…</option>
          ${dishes.map((d) => `<option value="${esc(d.id)}">${esc(tr(d.name))} — ${esc(money(d.price))}</option>`).join('')}</select></label></div>
        <div id="ed-opts"></div>
        <button type="button" class="btn small soft" id="ed-add" style="margin-top:10px">${icon('plus', 'sm')}Добавить</button>
        <p class="notice bad" id="ed-err" hidden></p>
        <div class="modal-foot"><button type="button" class="btn" id="ed-save">${icon('check', 'sm')}Сохранить</button><button type="button" class="btn ghost" data-modal-close>Отмена</button></div>`);
      const paint = () => {
        m.querySelector('#ed-lines').innerHTML = items.map((i, n) => `<li><div class="grow"><b>${esc(tr(i.name) || i.id)}</b>${optNames(i).length ? `<small>${esc(optNames(i).join(', '))}</small>` : ''}${noteHtml(i)}<small>${money(i.price)} за шт.</small></div>
          <div class="stepper"><button type="button" data-ed-dec="${n}" aria-label="Меньше">${icon('minus', 'sm')}</button><span>${i.qty}</span><button type="button" data-ed-inc="${n}" aria-label="Больше">${icon('plus', 'sm')}</button></div>
          <button type="button" class="btn small danger" data-ed-del="${n}">Убрать</button></li>`).join('') || '<li class="a-empty">Пусто. Чтобы убрать всё, отмените заказ.</li>';
      };
      const paintOpts = () => {
        const d = dishes.find((x) => x.id === m.querySelector('#ed-dish').value);
        m.querySelector('#ed-opts').innerHTML = d && d.options?.length ? d.options.map((g) => `<fieldset class="ed-group"><legend>${esc(tr(g.name))}${g.required ? ' (обязательно)' : ''}</legend>
          ${(g.choices || []).map((c, ci) => `<label class="check"><input type="${g.multi ? 'checkbox' : 'radio'}" name="edg-${esc(g.id)}" value="${esc(g.id)}:${esc(c.id)}"${!g.multi && g.required && ci === 0 ? ' checked' : ''}>${esc(tr(c.name))}${Number(c.price) ? ` (${Number(c.price) > 0 ? '+' : '−'}${esc(money(Math.abs(c.price)))})` : ''}</label>`).join('')}</fieldset>`).join('') : '';
      };
      paint();
      m.querySelector('#ed-dish').addEventListener('change', paintOpts);
      m.addEventListener('click', async (e) => {
        const inc = e.target.closest('[data-ed-inc]'); const dec = e.target.closest('[data-ed-dec]'); const del = e.target.closest('[data-ed-del]');
        if (inc) { const i = items[inc.dataset.edInc]; i.qty = Math.min(50, i.qty + 1); paint(); return; }
        if (dec) { const i = items[dec.dataset.edDec]; i.qty = Math.max(1, i.qty - 1); paint(); return; }
        if (del) { items.splice(Number(del.dataset.edDel), 1); paint(); return; }
        if (e.target.closest('#ed-add')) {
          const d = dishes.find((x) => x.id === m.querySelector('#ed-dish').value);
          if (!d) return;
          const sel = [...m.querySelectorAll('#ed-opts input:checked')].map((x) => x.value).sort();
          const opts = sel.map((v) => { const [g, c] = v.split(':'); const gg = d.options.find((x) => x.id === g); const cc = gg?.choices.find((x) => x.id === c); return { g, c, group: gg?.name, name: cc?.name, price: Number(cc?.price) || 0 }; });
          const line = { id: d.id, qty: 1, price: r2(Number(d.price) + opts.reduce((s, x) => s + x.price, 0)), name: d.name, opts, isNew: true };
          const same = items.find((x) => key(x) === key(line));
          if (same) same.qty = Math.min(50, same.qty + 1); else items.push(line);
          m.querySelector('#ed-dish').value = '';
          paintOpts();
          paint();
          return;
        }
        if (e.target.closest('#ed-save')) {
          const err = m.querySelector('#ed-err');
          if (!items.length) { err.hidden = false; err.textContent = 'Заказ не может быть пустым. Чтобы убрать всё, отмените заказ.'; return; }
          const btn = e.target.closest('#ed-save');
          btn.disabled = true;
          try {
            await host.api.editOrder(o.id, items.map((i) => ({ id: i.id, qty: i.qty, opts: (i.opts || []).map((x) => `${x.g}:${x.c}`), ...(i.note ? { note: i.note } : {}) })));
            await host.reloadOrders();
            S.closeModal();
            S.toast(`Заказ №${o.no} изменён — гость видит новый состав`);
            host.rerender();
          } catch (ex) {
            const msg = String(ex?.message || '');
            err.hidden = false;
            err.textContent = /paid/.test(msg) ? 'Заказ уже оплачен — менять нельзя.' : /cancelled/.test(msg) ? 'Заказ отменён.' : /unavailable/.test(msg) ? 'Одного из блюд нет в наличии.' : /options/.test(msg) ? 'Выберите обязательный вариант блюда.' : S.errText(ex);
            btn.disabled = false;
          }
        }
      });
    }

    // клики внутри «Зала» и окна стола; true — обработано
    function handleClick(e) {
      const tbl = e.target.closest('[data-fl-table]');
      if (tbl) { openTable(tbl.dataset.flTable); return true; }
      const d = e.target.closest('[data-fl-done]');
      if (d) { done(d.dataset.flDone); return true; }
      const mine = e.target.closest('[data-fl-mine]');
      if (mine) { mineOnly = mine.dataset.flMine === '1'; try { localStorage.setItem('floor:mine', mineOnly ? '1' : '0'); } catch { /* ok */ } host.rerender(); return true; }
      const cp = e.target.closest('[data-fl-compose]');
      if (cp) { compose(cp.dataset.flCompose || ''); return true; }
      const mv = e.target.closest('[data-fl-move]');
      if (mv) { moveDialog(mv.dataset.flMove); return true; }
      const mt = e.target.closest('[data-fl-move-to]');
      if (mt) { const ids = document.querySelector('.modal')?.dataset.moveIds; moveTo(mt.dataset.from, mt.dataset.flMoveTo, ids ? ids.split(',') : null); return true; }
      const vd = e.target.closest('[data-fl-void]');
      if (vd) { voidBill(vd.dataset.flVoid); return true; }
      const sv = e.target.closest('[data-fl-serve]');
      if (sv) { serve(sv.dataset.flServe); return true; }
      if (e.target.closest('[data-fl-disc-open]') && payState) { payState.discOpen = true; repaintPay(); return true; }
      if (e.target.closest('[data-fl-disc-clear]') && payState) { payState.disc = null; payState.discOpen = false; syncParts(); repaintPay(); return true; }
      const dp = e.target.closest('[data-fl-disc-pct]');
      if (dp && payState) { payState.disc = { ...(payState.disc || {}), kind: 'pct', value: Number(dp.dataset.flDiscPct) }; syncParts(); repaintPay(); return true; }
      const dw = e.target.closest('[data-fl-disc-why]');
      if (dw && payState) { payState.disc = { ...(payState.disc || { kind: 'pct', value: 0 }), reason: dw.dataset.flDiscWhy }; repaintPay(); return true; }
      const tip = e.target.closest('[data-fl-tip]');
      if (tip && payState) {
        const due = calcOf(payState.table).total;
        const v = tip.dataset.flTip;
        payState.tip = v === '0' ? 0 : v === 'round' ? r2(Math.ceil(due / 10) * 10 - due) || 10 : r2(due * parseFloat(v) / 100);
        syncParts();
        repaintPay();
        return true;
      }
      const sp = e.target.closest('[data-fl-split]');
      if (sp && payState) {
        payState.split = sp.dataset.flSplit === '1';
        const grand = r2(calcOf(payState.table).total + (Number(payState.tip) || 0));
        payState.parts = payState.split ? [{ method: 'cash', amount: '' }, { method: 'card', amount: grand }] : [];
        repaintPay();
        return true;
      }
      if (e.target.closest('[data-fl-part-add]') && payState) {
        payState.parts.splice(payState.parts.length - 1, 0, { method: 'qr', amount: '' });
        syncParts();
        repaintPay();
        return true;
      }
      const pd = e.target.closest('[data-fl-part-del]');
      if (pd && payState) { payState.parts.splice(Number(pd.dataset.flPartDel), 1); syncParts(); repaintPay(); return true; }
      const p = e.target.closest('[data-fl-pay]');
      if (p) { pay(document.querySelector('.modal')?.dataset.table, p.dataset.flPay); return true; }
      if (e.target.closest('[data-fl-prebill]')) {
        const id = document.querySelector('.modal')?.dataset.table;
        const tb = tables.find((x) => x.id === id);
        if (tb) {
          const mine = payState?.table === id;
          const ds = mine && payState.disc?.value ? payState.disc : null;
          printReceipt({ table: tb.label, orders: mine ? dueOf(id).os : unpaid(id), draft: ds ? { ...calcOf(id), discount_pct: ds.kind === 'pct' ? Number(ds.value) : null, discount_reason: ds.reason || '' } : null });
        }
        return true;
      }
      const rp = e.target.closest('[data-fl-reprint]');
      if (rp) {
        const b = bills.find((x) => x.id === rp.dataset.flReprint);
        if (b) printReceipt({ table: b.table_label, orders: host.getOrders().filter((o) => b.order_ids.includes(o.id)), bill: b });
        return true;
      }
      const tk = e.target.closest('[data-fl-ticket]');
      if (tk) { const o = host.getOrders().find((x) => x.id === tk.dataset.flTicket); if (o) printTicket(o); return true; }
      const ed = e.target.closest('[data-fl-edit]');
      if (ed) { const o = host.getOrders().find((x) => x.id === ed.dataset.flEdit); if (o) editOrder(o); return true; }
      return false;
    }
    document.addEventListener('change', (e) => {
      const c = e.target.closest?.('[data-fl-claim]');
      if (c) claim(c.dataset.flClaim, c.checked);
    });

    return {
      load, render, handleClick, openTable, editOrder, compose, serve,
      openCalls, isMineOrFree, myTables, get bills() { return okBills(); }, get tables() { return tables; },
    };
  }

  window.Floor = { create, printSlip, printTicket, printReceipt, optNames, lineTitle, noteHtml, trNote, ACTIVE, stOf };
})();

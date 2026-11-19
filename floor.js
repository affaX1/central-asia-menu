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
  const optNames = (i) => (i.opts || []).map((o) => tr(o.name)).filter(Boolean);
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
      body { margin: 0; width: 74mm; font: 12px/1.35 Helvetica, Arial, sans-serif; color: #000; }
      h1 { font-size: 15px; margin: 0 0 2px; text-align: center; }
      .c { text-align: center; } .muted { color: #333; } .big { font-size: 22px; font-weight: 800; }
      hr { border: 0; border-top: 1px dashed #000; margin: 6px 0; }
      table { width: 100%; border-collapse: collapse; } td { vertical-align: top; padding: 1px 0; }
      td.n { white-space: nowrap; padding-right: 4px; font-weight: 700; } td.s { text-align: right; white-space: nowrap; padding-left: 6px; }
      .opt { font-size: 11px; padding-left: 10px; }
      .tot td { font-weight: 800; font-size: 15px; padding-top: 3px; }
      .note { border: 2px solid #000; padding: 4px 6px; margin-top: 6px; font-size: 14px; font-weight: 700; }
      .k td { font-size: 16px; font-weight: 700; padding: 2px 0; }
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
      <hr><table class="k">${(o.items || []).map((i) => `<tr><td class="n">${esc(i.qty)} ×</td><td>${esc(tr(i.name) || i.id)}${optNames(i).length ? `<div class="opt">${esc(optNames(i).join(', '))}</div>` : ''}</td></tr>`).join('')}</table>
      ${o.note ? `<div class="note">${esc(o.note)}</div>` : ''}
      <hr><div class="c muted">${o.accepted_by_name ? `${esc(t('p_accepted', o.accepted_by_name))} · ` : ''}${esc(t('p_printed', hhmm(new Date().toISOString())))}</div>`);
  }

  // чек / предварительный счёт стола: позиции всех заказов, сбор, налог, чаевые, оплата
  function printReceipt({ table, orders, bill }) {
    const st = S.settings || {};
    const lines = new Map();
    for (const o of orders) for (const i of o.items || []) {
      const k = `${lineTitle(i)}|${i.price}`;
      const l = lines.get(k) || { title: lineTitle(i), price: Number(i.price), qty: 0 };
      l.qty += Number(i.qty);
      lines.set(k, l);
    }
    const sum = (f) => r2(orders.reduce((s, o) => s + Number(f(o) || 0), 0));
    const tt = bill || { subtotal: sum(sub), service: sum((o) => o.service), tax: sum((o) => o.tax), total: sum((o) => o.total) };
    const addr = tr(st.address);
    const pays = bill?.payments?.length ? bill.payments : bill ? [{ method: bill.method, amount: Number(bill.total) + Number(bill.tip || 0) }] : [];
    printSlip(bill ? t('p_receipt', bill.no) : t('p_prebill'), `
      <h1>${esc(st.name || '')}</h1>
      ${addr ? `<div class="c muted">${esc(addr)}</div>` : ''}${st.phone ? `<div class="c muted">${esc(st.phone)}</div>` : ''}
      <hr><div>${esc(bill ? t('p_receipt', bill.no) : t('p_prebill'))} · ${esc(t('table'))} ${esc(table)}</div>
      <div class="muted">${esc(new Date(bill?.paid_at || Date.now()).toLocaleString(S.locale(), { dateStyle: 'short', timeStyle: 'short' }))} · ${esc(t('p_orders'))} №${esc(orders.map((o) => o.no).join(', №'))}</div>
      <hr><table>${[...lines.values()].map((l) => `<tr><td class="n">${l.qty}×</td><td>${esc(l.title)}</td><td class="s">${esc(money(l.price * l.qty))}</td></tr>`).join('')}</table>
      <hr><table>
        ${Number(tt.service) || Number(tt.tax) ? `<tr><td>${esc(t('sum_items'))}</td><td class="s">${esc(money(tt.subtotal))}</td></tr>` : ''}
        ${Number(tt.service) ? `<tr><td>${esc(t('sum_service'))}${st.service_pct ? ` ${Number(st.service_pct)}%` : ''}</td><td class="s">${esc(money(tt.service))}</td></tr>` : ''}
        ${Number(tt.tax) ? `<tr><td>${esc(st.tax_name || t('sum_tax'))}${st.tax_pct ? ` ${Number(st.tax_pct)}%` : ''}</td><td class="s">${esc(money(tt.tax))}</td></tr>` : ''}
        <tr class="tot"><td>${esc(t('p_total'))}</td><td class="s">${esc(money(tt.total))}</td></tr>
        ${bill && Number(bill.tip) ? `<tr><td>${esc(t('tip'))}</td><td class="s">${esc(money(bill.tip))}</td></tr>` : ''}
      </table>
      ${bill ? `<div>${esc(t('payment'))}: ${pays.map((p) => `${esc(payName(p.method))} ${esc(money(p.amount))}`).join(', ')}${bill.paid_by_name ? ` · ${esc(bill.paid_by_name)}` : ''}</div>` : `<div class="muted">${esc(t('p_not_receipt'))}</div>`}
      <hr><div class="c">${esc(t('p_thanks'))}</div>`);
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
      const mineFresh = fresh.filter((x) => isMineOrFree(x.table_id));
      if (mineFresh.length) host.onCalls?.(mineFresh);
    }
    const openCalls = () => calls.filter((c) => !c.done_at);
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
      if (os.some((o) => o.status === 'new')) { state = 'new'; text = t('fl_s_new'); }
      else if (os.some((o) => o.status === 'ready')) { state = 'ready'; text = t('fl_s_ready'); }
      else if (os.some((o) => o.status === 'accepted' || o.status === 'cooking')) { state = 'cooking'; text = t('fl_s_cooking'); }
      else if (os.length) { state = 'eating'; text = t('fl_s_served'); }
      if (bill) { state = 'bill'; text = t('fl_s_bill', bill.pay_method ? t('pay_guest')[bill.pay_method] : ''); }
      const total = r2(os.reduce((s, o) => s + Number(o.total), 0));
      const first = os[0]?.created_at;
      return { os, bill, waiter, state, text, total, first };
    }

    function callsHtml() {
      const list = openCalls().filter((c) => !mineOnly || isMineOrFree(c.table_id)).sort((a, b) => new Date(a.created_at) - new Date(b.created_at));
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
      const paidSum = r2(bills.reduce((x, b) => x + Number(b.total), 0));
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
          <div class="a-stat"><b>${money(paidSum)}</b><span>${esc(t('fl_paid', bills.length))}</span></div>
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
      const canServe = ['accepted', 'cooking', 'ready'].includes(o.status);
      return `<article class="fl-order">
        <div class="o-head">${multi ? `<label class="fl-pick"><input type="checkbox" data-fl-pick="${esc(o.id)}"${payState?.ids.has(o.id) ? ' checked' : ''}${o.status === 'new' ? ' disabled' : ''}>` : '<span>'}<b>№${esc(o.no)} · ${esc(hhmm(o.created_at))}</b>${multi ? '</label>' : '</span>'}<span class="st st-${esc(o.status)}">${esc(t('st')[o.status])}</span></div>
        <ul class="o-items">${(o.items || []).map((i) => `<li><span><b>${esc(i.qty)}×</b> ${esc(tr(i.name) || i.id)}${optNames(i).length ? `<em class="o-opt">${esc(optNames(i).join(', '))}</em>` : ''}</span><span>${money(i.price * i.qty)}</span></li>`).join('')}</ul>
        ${o.note ? `<div class="o-note"><b>${esc(t('comment'))}:</b> ${esc(o.note)}</div>` : ''}
        ${o.source === 'staff' && o.created_by_name ? `<div class="o-meta">${esc(t('entered_by', o.created_by_name))}</div>` : ''}
        <div class="fl-order-actions">
          ${canServe ? `<button type="button" class="btn small${o.status === 'ready' ? '' : ' soft'}" data-fl-serve="${esc(o.id)}">${icon('check', 'sm')}${esc(t('serve'))}</button>` : ''}
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

    function payHtml(tableId) {
      const d = dueOf(tableId);
      const tip = r2(Number(payState.tip) || 0);
      const grand = r2(d.total + tip);
      const hasNew = unpaid(tableId).some((o) => o.status === 'new');
      const parts = payState.parts;
      const partsSum = r2(parts.reduce((x, p) => x + (Number(p.amount) || 0), 0));
      const left = r2(grand - partsSum);
      const disabled = hasNew || !d.os.length;
      return `
        <dl class="fl-sum">
          ${d.service || d.tax ? `<div><dt>${esc(t('sum_items'))}</dt><dd>${money(d.subtotal)}</dd></div>` : ''}
          ${d.service ? `<div><dt>${esc(t('sum_service'))}</dt><dd>${money(d.service)}</dd></div>` : ''}
          ${d.tax ? `<div><dt>${esc(S.settings?.tax_name || t('sum_tax'))}</dt><dd>${money(d.tax)}</dd></div>` : ''}
          <div class="tot"><dt>${esc(t('sum_due'))}</dt><dd>${money(d.total)}</dd></div>
        </dl>
        ${hasNew ? `<p class="notice bad">${icon('alert')}<span>${esc(t('has_new'))}</span></p>` : ''}
        <p class="section-label">${esc(t('tip'))}</p>
        <div class="fl-tip">
          <button type="button" class="chip${!tip ? ' active' : ''}" data-fl-tip="0">${esc(t('tip_none'))}</button>
          <button type="button" class="chip" data-fl-tip="5%">5%</button>
          <button type="button" class="chip" data-fl-tip="10%">10%</button>
          <button type="button" class="chip" data-fl-tip="round">${esc(t('tip_round'))}</button>
          <label class="field fl-tip-in"><span class="sr-only">${esc(t('tip'))}</span><input type="number" min="0" step="0.5" inputmode="decimal" data-fl-tip-in value="${tip || ''}" placeholder="0"></label>
        </div>
        ${tip ? `<p class="fl-grand">${esc(t('with_tip'))}: <b>${money(grand)}</b></p>` : ''}
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
        payState = { table: id, ids: new Set(os.filter((o) => o.status !== 'new').map((o) => o.id)), tip: 0, split: false, parts: [], hint: bill?.pay_method || null };
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
          <li><span><b>${esc(t('p_receipt', b.no))}</b> · ${esc(hhmm(b.paid_at))} · ${esc(payName(b.method))}${Number(b.tip) ? ` · ${esc(t('tip'))} ${money(b.tip)}` : ''}${b.paid_by_name ? ` · ${esc(b.paid_by_name)}` : ''}</span>
          <span>${money(b.total)} <button type="button" class="link-btn" data-fl-reprint="${esc(b.id)}">${icon('printer', 'sm')}${esc(t('receipt'))}</button></span></li>`).join('')}</ul>` : ''}`);
      m.dataset.table = id;
      m.addEventListener('input', (e) => {
        if (e.target.matches('[data-fl-tip-in]')) { payState.tip = Math.max(0, Number(e.target.value) || 0); syncParts(); repaintPay(true); }
        else if (e.target.matches('[data-fl-part-a]')) {
          const i = Number(e.target.dataset.flPartA);
          payState.parts[i].amount = e.target.value;
          if (i < payState.parts.length - 1) syncParts();   // последняя часть добирает остаток
          repaintPay(true);
        }
      });
      m.addEventListener('change', (e) => {
        if (e.target.matches('[data-fl-pick]')) { if (e.target.checked) payState.ids.add(e.target.dataset.flPick); else payState.ids.delete(e.target.dataset.flPick); syncParts(); repaintPay(); }
        else if (e.target.matches('[data-fl-part-m]')) payState.parts[e.target.dataset.flPartM].method = e.target.value;
      });
    }
    // перерисовать только блок оплаты (не сбивая ввод)
    function repaintPay(keepFocus) {
      const box = document.getElementById('fl-pay-box');
      if (!box || !payState) return;
      const active = keepFocus ? document.activeElement : null;
      const sel = active && (active.dataset.flTipIn !== undefined ? '[data-fl-tip-in]' : active.dataset.flPartA !== undefined ? `[data-fl-part-a="${active.dataset.flPartA}"]` : null);
      const pos = active?.selectionStart;
      box.innerHTML = payHtml(payState.table);
      if (sel) { const el = box.querySelector(sel); if (el) { el.focus(); try { el.setSelectionRange(pos, pos); } catch { /* number input */ } } }
    }
    // при раздельной оплате последняя часть добирает остаток
    function syncParts() {
      if (!payState.split || !payState.parts.length) return;
      const grand = r2(dueOf(payState.table).total + (Number(payState.tip) || 0));
      const others = r2(payState.parts.slice(0, -1).reduce((x, p) => x + (Number(p.amount) || 0), 0));
      payState.parts[payState.parts.length - 1].amount = Math.max(0, r2(grand - others));
    }

    async function pay(tableId, how) {
      const tb = tables.find((x) => x.id === tableId);
      const d = dueOf(tableId);
      if (!tb || !d.os.length) return;
      const tip = r2(Number(payState.tip) || 0);
      const grand = r2(d.total + tip);
      let method = how;
      let payments = null;
      if (how === 'split') {
        payments = payState.parts.map((p) => ({ method: p.method, amount: r2(Number(p.amount) || 0) })).filter((p) => p.amount > 0);
        const methods = [...new Set(payments.map((p) => p.method))];
        method = methods.length === 1 ? methods[0] : 'mixed';
      }
      const label = payments ? payments.map((p) => `${payName(p.method)} ${money(p.amount)}`).join(' + ') : payName(method);
      if (!await S.ask(t('ask_close', tb.label, money(grand), label), { ok: t('ok_paid') })) return;
      document.querySelectorAll('[data-fl-pay]').forEach((b) => { b.disabled = true; });
      try {
        const b = await host.api.closeBill(tableId, method, d.os.map((o) => o.id), tip, payments);
        bills = [b, ...bills];
        await host.reloadOrders();
        calls = calls.map((c) => (c.table_id === tableId && c.kind === 'bill' && !c.done_at ? { ...c, done_at: b.paid_at } : c));
        payState = null;
        S.closeModal();
        host.rerender();
        const again = await S.ask(t('ask_print', tb.label, money(Number(b.total) + Number(b.tip || 0)), label), { ok: t('print_receipt'), cancel: t('no_need') });
        if (again) printReceipt({ table: tb.label, orders: d.os, bill: b });
      } catch (ex) {
        const m = String(ex?.message || '');
        S.toast(/has_new/.test(m) ? t('e_has_new') : /nothing_to_pay/.test(m) ? t('e_nothing') : /bad_payments/.test(m) ? t('e_payments') : /bad_tip/.test(m) ? t('e_tip') : S.errText(ex), true);
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
      const key = (i) => `${i.id}|${(i.opts || []).map((x) => `${x.g}:${x.c}`).sort().join(',')}`;
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
        m.querySelector('#ed-lines').innerHTML = items.map((i, n) => `<li><div class="grow"><b>${esc(tr(i.name) || i.id)}</b>${optNames(i).length ? `<small>${esc(optNames(i).join(', '))}</small>` : ''}<small>${money(i.price)} за шт.</small></div>
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
            await host.api.editOrder(o.id, items.map((i) => ({ id: i.id, qty: i.qty, opts: (i.opts || []).map((x) => `${x.g}:${x.c}`) })));
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
      const sv = e.target.closest('[data-fl-serve]');
      if (sv) { serve(sv.dataset.flServe); return true; }
      const tip = e.target.closest('[data-fl-tip]');
      if (tip && payState) {
        const due = dueOf(payState.table).total;
        const v = tip.dataset.flTip;
        payState.tip = v === '0' ? 0 : v === 'round' ? r2(Math.ceil(due / 10) * 10 - due) || 10 : r2(due * parseFloat(v) / 100);
        syncParts();
        repaintPay();
        return true;
      }
      const sp = e.target.closest('[data-fl-split]');
      if (sp && payState) {
        payState.split = sp.dataset.flSplit === '1';
        const grand = r2(dueOf(payState.table).total + (Number(payState.tip) || 0));
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
        if (tb) printReceipt({ table: tb.label, orders: payState?.table === id ? dueOf(id).os : unpaid(id) });
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
      openCalls, isMineOrFree, myTables, get bills() { return bills; }, get tables() { return tables; },
    };
  }

  window.Floor = { create, printTicket, printReceipt, optNames, lineTitle };
})();

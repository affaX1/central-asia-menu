(() => {
  'use strict';

  // =====================================================================
  //  «Зал» — общий для официанта и владельца:
  //  схема столов, вызовы гостей, счёт стола и оплата, печать чека и
  //  бумажки на кухню, изменение заказа (только владелец).
  //  Права проверяет база: закрыть счёт может официант или владелец,
  //  изменить состав заказа — только владелец.
  // =====================================================================

  const S = window.Staff;
  const { esc, icon, tr, money } = S;

  const ST = { new: 'Новый', accepted: 'Принят', cooking: 'Готовится', ready: 'Готов', cancelled: 'Отменён' };
  const PAY = { cash: 'Наличные', card: 'Карта', qr: 'QR', other: 'Другое' };
  const PAY_GUEST = { cash: 'наличными', card: 'картой', qr: 'по QR' };
  const hhmm = (iso) => new Date(iso).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' });
  const mins = (iso) => Math.max(0, Math.floor((Date.now() - new Date(iso).getTime()) / 60000));
  const since = (iso) => { const m = mins(iso); return m < 1 ? 'только что' : m < 60 ? `${m} мин` : `${Math.floor(m / 60)} ч ${m % 60} мин`; };
  const dayStart = () => { const d = new Date(); d.setHours(0, 0, 0, 0); return d; };
  const r2 = (x) => Math.round(x * 100) / 100;
  const optNames = (i) => (i.opts || []).map((o) => tr(o.name)).filter(Boolean);
  const lineTitle = (i) => { const o = optNames(i); return `${tr(i.name) || i.id}${o.length ? ` (${o.join(', ')})` : ''}`; };
  const sub = (o) => Number(o.subtotal ?? o.total);

  // ---------- печать: чек и бумажка на кухню (лента 80 мм) ----------
  function printSlip(title, bodyHtml) {
    const f = document.createElement('iframe');
    f.setAttribute('aria-hidden', 'true');
    f.style.cssText = 'position:fixed;right:0;bottom:0;width:0;height:0;border:0;visibility:hidden';
    document.body.appendChild(f);
    const doc = f.contentDocument;
    doc.open();
    doc.write(`<!doctype html><html lang="ru"><head><meta charset="utf-8"><title>${esc(title)}</title><style>
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
    printSlip(`Кухня — заказ ${o.no}`, `
      <div class="c muted">КУХНЯ</div>
      <div class="c big">Стол ${esc(o.table_label)}</div>
      <div class="c">Заказ №${esc(o.no)} · ${esc(hhmm(o.created_at))}</div>
      <hr><table class="k">${(o.items || []).map((i) => `<tr><td class="n">${esc(i.qty)} ×</td><td>${esc(tr(i.name) || i.id)}${optNames(i).length ? `<div class="opt">${esc(optNames(i).join(', '))}</div>` : ''}</td></tr>`).join('')}</table>
      ${o.note ? `<div class="note">${esc(o.note)}</div>` : ''}
      <hr><div class="c muted">${o.accepted_by_name ? `Принял: ${esc(o.accepted_by_name)} · ` : ''}напечатано ${esc(hhmm(new Date().toISOString()))}</div>`);
  }

  // чек / предварительный счёт стола: позиции всех заказов, сбор, налог, итог
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
    const t = bill || { subtotal: sum(sub), service: sum((o) => o.service), tax: sum((o) => o.tax), total: sum((o) => o.total) };
    const addr = tr(st.address);
    printSlip(bill ? `Чек ${bill.no}` : `Счёт стола ${table}`, `
      <h1>${esc(st.name || '')}</h1>
      ${addr ? `<div class="c muted">${esc(addr)}</div>` : ''}${st.phone ? `<div class="c muted">${esc(st.phone)}</div>` : ''}
      <hr><div>${bill ? `Чек №${esc(bill.no)}` : 'Счёт (предварительный)'} · стол ${esc(table)}</div>
      <div class="muted">${esc(new Date(bill?.paid_at || Date.now()).toLocaleString('ru-RU', { dateStyle: 'short', timeStyle: 'short' }))} · заказы №${esc(orders.map((o) => o.no).join(', №'))}</div>
      <hr><table>${[...lines.values()].map((l) => `<tr><td class="n">${l.qty}×</td><td>${esc(l.title)}</td><td class="s">${esc(money(l.price * l.qty))}</td></tr>`).join('')}</table>
      <hr><table>
        ${Number(t.service) || Number(t.tax) ? `<tr><td>Блюда</td><td class="s">${esc(money(t.subtotal))}</td></tr>` : ''}
        ${Number(t.service) ? `<tr><td>Сервисный сбор${st.service_pct ? ` ${Number(st.service_pct)}%` : ''}</td><td class="s">${esc(money(t.service))}</td></tr>` : ''}
        ${Number(t.tax) ? `<tr><td>${esc(st.tax_name || 'Налог')}${st.tax_pct ? ` ${Number(st.tax_pct)}%` : ''}</td><td class="s">${esc(money(t.tax))}</td></tr>` : ''}
        <tr class="tot"><td>ИТОГО</td><td class="s">${esc(money(t.total))}</td></tr>
      </table>
      ${bill ? `<div>Оплата: ${esc(PAY[bill.method] || bill.method)}${bill.paid_by_name ? ` · ${esc(bill.paid_by_name)}` : ''}</div>` : '<div class="muted">Не является чеком об оплате</div>'}
      <hr><div class="c">Спасибо! Рахмат!</div>`);
  }

  // ---------- «Зал» ----------
  function create(host) {
    // host: { api, isOwner, getOrders(), getDishes(), reloadOrders(), onCalls(fresh), rerender() }
    let tables = [];
    let calls = [];
    let bills = [];
    let seenCalls = null;
    const busy = new Set();

    async function load() {
      const from = dayStart().toISOString();
      const [t, c, b] = await Promise.all([host.api.floorTables(), host.api.calls(from), host.api.bills(from)]);
      tables = t;
      bills = b;
      const open = c.filter((x) => !x.done_at);
      const fresh = seenCalls ? open.filter((x) => !seenCalls.has(x.id)) : [];
      seenCalls = new Set([...(seenCalls || []), ...c.map((x) => x.id)]);
      calls = c;
      if (fresh.length) host.onCalls?.(fresh);
    }
    const openCalls = () => calls.filter((c) => !c.done_at);

    // заказы стола, которые ещё не оплачены
    const unpaid = (tableId) => host.getOrders().filter((o) => o.table_id === tableId && !o.paid_at && o.status !== 'cancelled')
      .sort((a, b) => a.no - b.no);

    function tableState(tb) {
      const os = unpaid(tb.id);
      const cs = openCalls().filter((c) => c.table_id === tb.id);
      const bill = cs.find((c) => c.kind === 'bill');
      const waiter = cs.find((c) => c.kind === 'waiter');
      let state = 'free';
      let text = 'Свободен';
      if (os.some((o) => o.status === 'new')) { state = 'new'; text = 'Новый заказ'; }
      else if (os.some((o) => o.status === 'accepted' || o.status === 'cooking')) { state = 'cooking'; text = 'Готовится'; }
      else if (os.length) { state = 'eating'; text = 'Подано · не оплачено'; }
      if (bill) { state = 'bill'; text = `Просят счёт${bill.pay_method ? ` (${PAY_GUEST[bill.pay_method]})` : ''}`; }
      const total = r2(os.reduce((s, o) => s + Number(o.total), 0));
      const first = os[0]?.created_at;
      return { os, bill, waiter, state, text, total, first };
    }

    function callsHtml() {
      const list = openCalls().sort((a, b) => new Date(a.created_at) - new Date(b.created_at));
      if (!list.length) return '';
      return `<section class="calls">${list.map((c) => `
        <div class="call ${c.kind === 'bill' ? 'is-bill' : ''}">
          ${icon(c.kind === 'bill' ? 'list' : 'bell')}
          <div class="grow"><b>Стол ${esc(c.table_label)}: ${c.kind === 'bill' ? `просят счёт${c.pay_method ? ` (${esc(PAY_GUEST[c.pay_method])})` : ''}` : 'зовут официанта'}</b>
            <small>${esc(mins(c.created_at) < 1 ? 'только что' : `${since(c.created_at)} назад`)}</small></div>
          ${c.kind === 'bill' && c.table_id ? `<button type="button" class="btn small" data-fl-table="${esc(c.table_id)}">Открыть счёт</button>` : ''}
          <button type="button" class="btn small ${c.kind === 'bill' ? 'ghost' : ''}" data-fl-done="${esc(c.id)}"${busy.has(c.id) ? ' disabled' : ''}>${icon('check', 'sm')}${c.kind === 'bill' ? 'Готово' : 'Иду'}</button>
        </div>`).join('')}</section>`;
    }

    function render(main) {
      const active = tables.filter((t) => t.active);
      const states = active.map((tb) => ({ tb, ...tableState(tb) }));
      const busyN = states.filter((s) => s.state !== 'free').length;
      const unpaidSum = r2(states.reduce((s, x) => s + x.total, 0));
      const paidSum = r2(bills.reduce((s, b) => s + Number(b.total), 0));
      main.innerHTML = `
        ${callsHtml()}
        <div class="a-stats">
          <div class="a-stat"><b>${busyN} из ${active.length}</b><span>столов занято</span></div>
          <div class="a-stat${openCalls().length ? ' hot' : ''}"><b>${openCalls().length}</b><span>вызовов</span></div>
          <div class="a-stat"><b>${money(unpaidSum)}</b><span>ждёт оплаты</span></div>
          <div class="a-stat"><b>${money(paidSum)}</b><span>оплачено сегодня · счетов ${bills.length}</span></div>
        </div>
        ${active.length ? `<div class="fl-grid">${states.map(({ tb, state, text, total, first, waiter, os }) => `
          <button type="button" class="fl-table is-${state}" data-fl-table="${esc(tb.id)}">
            <span class="fl-top"><b>${esc(tb.label)}</b>${waiter ? `<span class="fl-bell" title="Зовут официанта">${icon('bell', 'sm')}</span>` : ''}</span>
            <span class="fl-state">${esc(text)}</span>
            <span class="fl-meta">${os.length ? `${money(total)} · ${esc(since(first))}` : '&nbsp;'}</span>
          </button>`).join('')}</div>`
          : `<div class="a-empty">Столов ещё нет.${host.isOwner ? ' Создайте их в разделе «Столы и QR».' : ' Их создаёт владелец.'}</div>`}
        <p class="help">Нажмите на стол: заказы стола, счёт, оплата и печать.</p>`;
    }

    // ---------- окно стола ----------
    function orderBlock(o) {
      return `<article class="fl-order">
        <div class="o-head"><b>№${esc(o.no)} · ${esc(hhmm(o.created_at))}</b><span class="st st-${esc(o.status)}">${esc(ST[o.status])}</span></div>
        <ul class="o-items">${(o.items || []).map((i) => `<li><span><b>${esc(i.qty)}×</b> ${esc(tr(i.name) || i.id)}${optNames(i).length ? `<em class="o-opt">${esc(optNames(i).join(', '))}</em>` : ''}</span><span>${money(i.price * i.qty)}</span></li>`).join('')}</ul>
        ${o.note ? `<div class="o-note"><b>Комментарий:</b> ${esc(o.note)}</div>` : ''}
        ${o.edited_at ? `<div class="o-meta">Изменён${o.edited_by_name ? `: ${esc(o.edited_by_name)}` : ''} в ${esc(hhmm(o.edited_at))}</div>` : ''}
        <div class="fl-order-actions">
          <button type="button" class="btn small ghost" data-fl-ticket="${esc(o.id)}">${icon('printer', 'sm')}На кухню</button>
          ${host.isOwner ? `<button type="button" class="btn small ghost" data-fl-edit="${esc(o.id)}">${icon('edit', 'sm')}Изменить</button>` : ''}
        </div>
      </article>`;
    }

    function openTable(id, msg = '') {
      const tb = tables.find((t) => t.id === id);
      if (!tb) return;
      const { os, bill, waiter } = tableState(tb);
      const sum = (f) => r2(os.reduce((s, o) => s + Number(f(o) || 0), 0));
      const t = { subtotal: sum(sub), service: sum((o) => o.service), tax: sum((o) => o.tax), total: sum((o) => o.total) };
      const hasNew = os.some((o) => o.status === 'new');
      const paid = bills.filter((b) => b.table_id === id);
      const m = S.modal(`
        <h2 id="modal-title">Стол ${esc(tb.label)}</h2>
        ${msg ? `<p class="notice ok">${icon('check')}<span>${esc(msg)}</span></p>` : ''}
        ${waiter ? `<p class="notice">${icon('bell')}<span>Гость зовёт официанта (${esc(since(waiter.created_at))}). <button type="button" class="link-btn" data-fl-done="${esc(waiter.id)}">Отметить: подошёл</button></span></p>` : ''}
        ${bill ? `<p class="notice">${icon('list')}<span>Гость просит счёт${bill.pay_method ? `, оплата ${esc(PAY_GUEST[bill.pay_method])}` : ''}.</span></p>` : ''}
        ${os.length ? `
          ${os.map(orderBlock).join('')}
          <dl class="fl-sum">
            ${t.service || t.tax ? `<div><dt>Блюда</dt><dd>${money(t.subtotal)}</dd></div>` : ''}
            ${t.service ? `<div><dt>Сервисный сбор</dt><dd>${money(t.service)}</dd></div>` : ''}
            ${t.tax ? `<div><dt>${esc(S.settings?.tax_name || 'Налог')}</dt><dd>${money(t.tax)}</dd></div>` : ''}
            <div class="tot"><dt>К оплате</dt><dd>${money(t.total)}</dd></div>
          </dl>
          ${hasNew ? `<p class="notice bad">${icon('alert')}<span>На столе есть непринятый заказ — сначала примите его в «Заказах».</span></p>` : ''}
          <p class="section-label">Оплата — закрыть счёт</p>
          <div class="fl-pay">${Object.entries(PAY).map(([k, v]) => `<button type="button" class="btn${bill?.pay_method === k ? '' : ' soft'}" data-fl-pay="${k}"${hasNew ? ' disabled' : ''}>${esc(v)}</button>`).join('')}</div>
          <div class="modal-foot"><button type="button" class="btn ghost" data-fl-prebill>${icon('printer', 'sm')}Печать счёта</button><button type="button" class="btn ghost" data-modal-close>Закрыть</button></div>`
        : `<p class="a-empty" style="padding:18px 0">Неоплаченных заказов нет.</p><div class="modal-foot"><button type="button" class="btn ghost" data-modal-close>Закрыть</button></div>`}
        ${paid.length ? `<p class="section-label">Оплачено сегодня</p><ul class="fl-bills">${paid.map((b) => `
          <li><span><b>Чек №${esc(b.no)}</b> · ${esc(hhmm(b.paid_at))} · ${esc(PAY[b.method] || b.method)}${b.paid_by_name ? ` · ${esc(b.paid_by_name)}` : ''}</span>
          <span>${money(b.total)} <button type="button" class="link-btn" data-fl-reprint="${esc(b.id)}">${icon('printer', 'sm')}Чек</button></span></li>`).join('')}</ul>` : ''}`);
      m.dataset.table = id;
    }

    async function pay(tableId, method) {
      const tb = tables.find((t) => t.id === tableId);
      const os = unpaid(tableId);
      if (!tb || !os.length) return;
      const total = r2(os.reduce((s, o) => s + Number(o.total), 0));
      if (!await S.ask(`Закрыть счёт стола ${tb.label} на ${money(total)}? Оплата: ${PAY[method]}.`, { ok: 'Оплачено' })) return;
      document.querySelectorAll('[data-fl-pay]').forEach((b) => { b.disabled = true; });
      try {
        const b = await host.api.closeBill(tableId, method, os.map((o) => o.id));
        bills = [b, ...bills];
        await host.reloadOrders();
        calls = calls.map((c) => (c.table_id === tableId && c.kind === 'bill' && !c.done_at ? { ...c, done_at: b.paid_at } : c));
        S.closeModal();
        host.rerender();
        const again = await S.ask(`Счёт стола ${tb.label} закрыт: ${money(b.total)}, ${PAY[b.method]}. Напечатать чек?`, { ok: 'Печать чека', cancel: 'Не нужно' });
        if (again) printReceipt({ table: tb.label, orders: os, bill: b });
      } catch (ex) {
        const m = String(ex?.message || '');
        S.toast(/has_new/.test(m) ? 'На столе есть непринятый заказ — сначала примите его.' : /nothing_to_pay/.test(m) ? 'Этот счёт уже закрыт.' : S.errText(ex), true);
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
        S.toast('Вызов отмечен');
      } catch (ex) { S.toast(S.errText(ex), true); }
      busy.delete(id);
      const open = document.querySelector('.modal')?.dataset.table;
      host.rerender();
      if (open) openTable(open);
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
      const t = e.target.closest('[data-fl-table]');
      if (t) { openTable(t.dataset.flTable); return true; }
      const d = e.target.closest('[data-fl-done]');
      if (d) { done(d.dataset.flDone); return true; }
      const p = e.target.closest('[data-fl-pay]');
      if (p) { pay(document.querySelector('.modal')?.dataset.table, p.dataset.flPay); return true; }
      if (e.target.closest('[data-fl-prebill]')) {
        const id = document.querySelector('.modal')?.dataset.table;
        const tb = tables.find((x) => x.id === id);
        if (tb) printReceipt({ table: tb.label, orders: unpaid(id) });
        return true;
      }
      const rp = e.target.closest('[data-fl-reprint]');
      if (rp) {
        const b = bills.find((x) => x.id === rp.dataset.flReprint);
        const os = host.getOrders().filter((o) => b.order_ids.includes(o.id));
        if (b) printReceipt({ table: b.table_label, orders: os, bill: b });
        return true;
      }
      const tk = e.target.closest('[data-fl-ticket]');
      if (tk) { const o = host.getOrders().find((x) => x.id === tk.dataset.flTicket); if (o) printTicket(o); return true; }
      const ed = e.target.closest('[data-fl-edit]');
      if (ed) { const o = host.getOrders().find((x) => x.id === ed.dataset.flEdit); if (o) editOrder(o); return true; }
      return false;
    }

    return {
      load, render, handleClick, openTable, editOrder,
      openCalls, get bills() { return bills; }, get tables() { return tables; },
    };
  }

  window.Floor = { create, printTicket, printReceipt, PAY, optNames, lineTitle };
})();

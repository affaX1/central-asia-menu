// =====================================================================
//  verify.html — проверка подлинности чека (2026-11-23).
//  verify.html?b=<id счёта>&k=<код> → public.verify_receipt(p_id, p_key):
//  подлинный (оригинал чека из базы) / аннулирован / не найден (возможно, подделка).
//  Нет связи — отдельное состояние: это НЕ «подделка».
//  6 языков гостя; выбранный язык общий с меню (localStorage menu:lang).
// =====================================================================
(() => {
  'use strict';

  const T = {
    ru: {
      langName: 'Русский', locale: 'ru-RU', dir: 'ltr', language: 'Язык',
      title: 'Проверка чека',
      scanTitle: 'Отсканируйте QR на чеке',
      scanText: 'Камера телефона откроет эту страницу с оригиналом чека из кассы ресторана. Одного номера чека недостаточно — нужна ссылка из QR.',
      linkLabel: 'Или вставьте ссылку из QR', check: 'Проверить',
      badLink: 'Это не ссылка проверки чека. Нужна ссылка из QR целиком.',
      loading: 'Проверяем чек…',
      okTitle: 'Чек подлинный',
      okText: 'Это оригинал из кассы ресторана. Сверьте блюда и суммы с чеком, который вам показали.',
      voidTitle: (d) => `Чек аннулирован ${d}`,
      voidText: 'Оплату по этому чеку отменили в кассе — чек недействителен.',
      fakeTitle: 'Чек не найден — возможно, это подделка',
      fakeText: 'В кассе ресторана нет чека с такой ссылкой и кодом. Проверьте, что QR отсканирован целиком, или спросите в ресторане.',
      netTitle: 'Нет связи с сервером',
      netText: 'Сейчас проверить нельзя. Это не значит, что чек поддельный, — попробуйте ещё раз.',
      retry: 'Повторить', another: 'Проверить другой чек', checkedAt: 'Проверено',
      receiptNo: (n) => `Чек №${n}`, voidStamp: 'Аннулирован', verifyCode: 'Код проверки',
      table: 'Стол', delivery: 'Доставка', orders: 'Заказы', date: 'Дата',
      subtotal: 'Блюда', discount: 'Скидка', service: 'Сервисный сбор', dvFee: 'Доставка', total: 'Итого',
      rounding: 'Округление', toPay: 'К оплате', tip: 'Чаевые', paid: 'Оплачено', paidTotal: 'Всего оплачено',
      pay: { cash: 'Наличные', card: 'Карта', qr: 'QR', other: 'Другое' },
    },
    uz: {
      langName: "O'zbekcha", locale: 'uz-Latn-UZ', dir: 'ltr', language: 'Til',
      title: 'Chekni tekshirish',
      scanTitle: 'Chekdagi QR kodni skanerlang',
      scanText: "Telefon kamerasi bu sahifani restoran kassasidagi asl chek bilan ochadi. Faqat chek raqami yetarli emas — QR havolasi kerak.",
      linkLabel: "Yoki QR havolasini qo'ying", check: 'Tekshirish',
      badLink: "Bu chekni tekshirish havolasi emas. QR havolasi to'liq kerak.",
      loading: 'Chek tekshirilmoqda…',
      okTitle: 'Chek haqiqiy',
      okText: "Bu restoran kassasidagi asl chek. Taomlar va summalarni sizga ko'rsatilgan chek bilan solishtiring.",
      voidTitle: (d) => `Chek bekor qilingan ${d}`,
      voidText: "Bu chek bo'yicha to'lov kassada bekor qilingan — chek haqiqiy emas.",
      fakeTitle: 'Chek topilmadi — ehtimol, bu soxta',
      fakeText: "Restoran kassasida bunday havola va kodli chek yo'q. QR to'liq skanerlanganini tekshiring yoki restorandan so'rang.",
      netTitle: "Server bilan aloqa yo'q",
      netText: "Hozir tekshirib bo'lmaydi. Bu chek soxta degani emas — qayta urinib ko'ring.",
      retry: 'Qayta urinish', another: 'Boshqa chekni tekshirish', checkedAt: 'Tekshirildi',
      receiptNo: (n) => `Chek №${n}`, voidStamp: 'Bekor qilingan', verifyCode: 'Tekshirish kodi',
      table: 'Stol', delivery: 'Yetkazib berish', orders: 'Buyurtmalar', date: 'Sana',
      subtotal: 'Taomlar', discount: 'Chegirma', service: 'Xizmat haqi', dvFee: 'Yetkazib berish', total: 'Jami',
      rounding: 'Yaxlitlash', toPay: "To'lovga", tip: 'Choychaqa', paid: "To'langan", paidTotal: "Jami to'landi",
      pay: { cash: 'Naqd', card: 'Karta', qr: 'QR', other: 'Boshqa' },
    },
    en: {
      langName: 'English', locale: 'en-US', dir: 'ltr', language: 'Language',
      title: 'Receipt check',
      scanTitle: 'Scan the QR code on the receipt',
      scanText: "Your phone camera will open this page with the original receipt from the restaurant's till. A receipt number alone is not enough — the QR link is needed.",
      linkLabel: 'Or paste the link from the QR', check: 'Check',
      badLink: 'This is not a receipt check link. Paste the whole link from the QR.',
      loading: 'Checking the receipt…',
      okTitle: 'Genuine receipt',
      okText: "This is the original from the restaurant's till. Compare the dishes and amounts with the receipt you were shown.",
      voidTitle: (d) => `Receipt voided ${d}`,
      voidText: 'The payment for this receipt was cancelled at the till — the receipt is not valid.',
      fakeTitle: 'Receipt not found — it may be fake',
      fakeText: "The restaurant's till has no receipt with this link and code. Make sure the whole QR was scanned, or ask the restaurant.",
      netTitle: 'No connection to the server',
      netText: "The receipt can't be checked right now. That doesn't mean it is fake — please try again.",
      retry: 'Try again', another: 'Check another receipt', checkedAt: 'Checked',
      receiptNo: (n) => `Receipt #${n}`, voidStamp: 'Voided', verifyCode: 'Verification code',
      table: 'Table', delivery: 'Delivery', orders: 'Orders', date: 'Date',
      subtotal: 'Items', discount: 'Discount', service: 'Service charge', dvFee: 'Delivery', total: 'Total',
      rounding: 'Rounding', toPay: 'To pay', tip: 'Tip', paid: 'Paid', paidTotal: 'Total paid',
      pay: { cash: 'Cash', card: 'Card', qr: 'QR', other: 'Other' },
    },
    ar: {
      langName: 'العربية', locale: 'ar-u-nu-latn', dir: 'rtl', language: 'اللغة',
      title: 'التحقق من الإيصال',
      scanTitle: 'امسح رمز QR الموجود على الإيصال',
      scanText: 'ستفتح كاميرا الهاتف هذه الصفحة مع الإيصال الأصلي من صندوق المطعم. رقم الإيصال وحده لا يكفي — يلزم رابط رمز QR.',
      linkLabel: 'أو الصق الرابط من رمز QR', check: 'تحقق',
      badLink: 'هذا ليس رابط التحقق من الإيصال. الصق الرابط كاملًا من رمز QR.',
      loading: 'جارٍ التحقق من الإيصال…',
      okTitle: 'الإيصال أصلي',
      okText: 'هذا هو الأصل من صندوق المطعم. قارن الأطباق والمبالغ بالإيصال الذي عُرض عليك.',
      voidTitle: (d) => `الإيصال ملغى ${d}`,
      voidText: 'أُلغي الدفع لهذا الإيصال في الصندوق — الإيصال غير صالح.',
      fakeTitle: 'الإيصال غير موجود — قد يكون مزوّرًا',
      fakeText: 'لا يوجد في صندوق المطعم إيصال بهذا الرابط والرمز. تأكد من مسح رمز QR بالكامل، أو اسأل المطعم.',
      netTitle: 'لا يوجد اتصال بالخادم',
      netText: 'لا يمكن التحقق الآن. هذا لا يعني أن الإيصال مزوّر — حاول مرة أخرى.',
      retry: 'إعادة المحاولة', another: 'التحقق من إيصال آخر', checkedAt: 'تم التحقق',
      receiptNo: (n) => `إيصال رقم ${n}`, voidStamp: 'ملغى', verifyCode: 'رمز التحقق',
      table: 'طاولة', delivery: 'التوصيل', orders: 'الطلبات', date: 'التاريخ',
      subtotal: 'الأطباق', discount: 'خصم', service: 'رسوم الخدمة', dvFee: 'رسوم التوصيل', total: 'الإجمالي',
      rounding: 'التقريب', toPay: 'المبلغ المستحق', tip: 'إكرامية', paid: 'مدفوع', paidTotal: 'إجمالي المدفوع',
      pay: { cash: 'نقدًا', card: 'بطاقة', qr: 'QR', other: 'أخرى' },
    },
    ms: {
      langName: 'Bahasa Melayu', locale: 'ms-MY', dir: 'ltr', language: 'Bahasa',
      title: 'Semakan resit',
      scanTitle: 'Imbas kod QR pada resit',
      scanText: 'Kamera telefon akan membuka halaman ini dengan resit asal daripada kaunter bayaran restoran. Nombor resit sahaja tidak mencukupi — pautan QR diperlukan.',
      linkLabel: 'Atau tampal pautan daripada QR', check: 'Semak',
      badLink: 'Ini bukan pautan semakan resit. Tampal pautan penuh daripada QR.',
      loading: 'Menyemak resit…',
      okTitle: 'Resit tulen',
      okText: 'Ini resit asal daripada kaunter bayaran restoran. Bandingkan hidangan dan jumlah dengan resit yang ditunjukkan kepada anda.',
      voidTitle: (d) => `Resit dibatalkan ${d}`,
      voidText: 'Bayaran bagi resit ini telah dibatalkan di kaunter — resit tidak sah.',
      fakeTitle: 'Resit tidak ditemui — mungkin palsu',
      fakeText: 'Tiada resit dengan pautan dan kod ini di kaunter restoran. Pastikan seluruh QR diimbas, atau tanya restoran.',
      netTitle: 'Tiada sambungan ke pelayan',
      netText: 'Resit tidak dapat disemak sekarang. Ini tidak bermakna resit palsu — sila cuba lagi.',
      retry: 'Cuba lagi', another: 'Semak resit lain', checkedAt: 'Disemak',
      receiptNo: (n) => `Resit #${n}`, voidStamp: 'Dibatalkan', verifyCode: 'Kod pengesahan',
      table: 'Meja', delivery: 'Penghantaran', orders: 'Pesanan', date: 'Tarikh',
      subtotal: 'Hidangan', discount: 'Diskaun', service: 'Caj perkhidmatan', dvFee: 'Caj penghantaran', total: 'Jumlah',
      rounding: 'Pembundaran', toPay: 'Perlu dibayar', tip: 'Tip', paid: 'Dibayar', paidTotal: 'Jumlah dibayar',
      pay: { cash: 'Tunai', card: 'Kad', qr: 'QR', other: 'Lain-lain' },
    },
    zh: {
      langName: '中文', locale: 'zh-CN', dir: 'ltr', language: '语言',
      title: '收据验证',
      scanTitle: '请扫描收据上的二维码',
      scanText: '手机相机会打开本页面，显示餐厅收银系统中的原始收据。仅凭收据号码不够，需要二维码中的链接。',
      linkLabel: '或粘贴二维码中的链接', check: '验证',
      badLink: '这不是收据验证链接。请粘贴二维码中的完整链接。',
      loading: '正在验证收据…',
      okTitle: '收据真实有效',
      okText: '这是餐厅收银系统中的原始收据。请将菜品和金额与您看到的收据进行核对。',
      voidTitle: (d) => `收据已作废 ${d}`,
      voidText: '该收据的付款已在收银台撤销，收据无效。',
      fakeTitle: '未找到收据——可能是伪造的',
      fakeText: '餐厅收银系统中没有此链接和验证码对应的收据。请确认二维码已完整扫描，或向餐厅询问。',
      netTitle: '无法连接服务器',
      netText: '目前无法验证。这并不表示收据是伪造的，请重试。',
      retry: '重试', another: '验证其他收据', checkedAt: '验证时间',
      receiptNo: (n) => `收据 №${n}`, voidStamp: '已作废', verifyCode: '验证码',
      table: '桌号', delivery: '外送', orders: '订单', date: '日期',
      subtotal: '菜品', discount: '折扣', service: '服务费', dvFee: '外送费', total: '合计',
      rounding: '四舍五入', toPay: '应付', tip: '小费', paid: '已付款', paidTotal: '实付合计',
      pay: { cash: '现金', card: '刷卡', qr: '扫码', other: '其他' },
    },
  };
  // ---------- конец текстов ----------
  const LANGS = ['ru', 'uz', 'en', 'ar', 'ms', 'zh'];
  const B = window.MENU_BACKEND || {};

  const store = {
    get(k, d) { try { const v = localStorage.getItem('menu:' + k); return v == null ? d : JSON.parse(v); } catch { return d; } },
    set(k, v) { try { localStorage.setItem('menu:' + k, JSON.stringify(v)); } catch { /* приватный режим */ } },
  };
  const $ = (s) => document.querySelector(s);
  const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
  const icon = (id, cls = '') => `<svg class="ic ${cls}" aria-hidden="true"><use href="#i-${id}"/></svg>`;

  // язык: выбранный в меню → язык телефона → английский
  let lang = store.get('lang', null);
  if (!LANGS.includes(lang)) {
    const phone = (navigator.languages || [navigator.language || '']).map((l) => String(l).slice(0, 2).toLowerCase());
    lang = phone.find((l) => LANGS.includes(l)) || 'en';
  }
  const t = (k) => T[lang][k];
  const L = (o) => (o == null ? '' : typeof o === 'string' ? o : o[lang] || o.en || o.ru || Object.values(o).find(Boolean) || '');

  // ---------- ссылка: ?b=<uuid>&k=<код> (или то же после #) ----------
  const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  const normKey = (k) => String(k || '').replace(/[\s-]/g, '').toUpperCase();
  function parse(str) {
    const s = String(str || '').trim();
    const b = (s.match(/[?&#]b=([^&#\s]+)/) || [])[1];
    const k = (s.match(/[?&#]k=([^&#]+)/) || [])[1];
    const dec = (v) => { try { return decodeURIComponent(v); } catch { return v; } };
    return { b: b ? dec(b) : '', k: k ? normKey(dec(k)) : '' };
  }
  const linkOk = (p) => UUID.test(p.b) && /^[A-Z0-9]{12}$/.test(p.k);

  // phase: idle | loading | ok | void | fake | net
  let st = { phase: 'idle', p: null, data: null, formErr: false, formVal: '' };
  const fromUrl = (() => { const a = parse(location.search); return a.b || a.k ? a : parse(location.hash.replace(/^#/, '?')); })();
  // название ресторана: из ответа, а до него — из меню, сохранённого на этом телефоне
  let restName = store.get('cache', null)?.restaurant?.name || '';

  async function rpc(name, body) {
    if (!B.url || !B.key) throw new Error('no_backend');
    const headers = { 'Content-Type': 'application/json', apikey: B.key };
    if (String(B.key).startsWith('eyJ')) headers.Authorization = 'Bearer ' + B.key;
    const ctl = new AbortController();
    const timer = setTimeout(() => ctl.abort(), 15000);
    try {
      const res = await fetch(`${String(B.url).replace(/\/+$/, '')}/rest/v1/rpc/${name}`, { method: 'POST', headers, body: JSON.stringify(body), signal: ctl.signal });
      const data = await res.json().catch(() => null);
      if (!res.ok) throw new Error(String(data?.message || `http_${res.status}`));
      return data;
    } finally {
      clearTimeout(timer);
    }
  }

  async function check(p) {
    st = { ...st, phase: 'loading', p, data: null };
    render();
    // кривая ссылка — такого чека нет (сервер не спрашиваем)
    if (!linkOk(p)) { st = { ...st, phase: 'fake' }; render(); return; }
    let r;
    try { r = await rpc('verify_receipt', { p_id: p.b, p_key: p.k }); } catch { st = { ...st, phase: 'net' }; render(); return; }
    if (st.p !== p) return;
    if (r && r.ok === true) {
      if (r.restaurant?.name) restName = r.restaurant.name;
      st = { ...st, phase: r.voided ? 'void' : 'ok', data: r };
    } else if (r && r.ok === false) {
      st = { ...st, phase: 'fake' };
    } else {
      st = { ...st, phase: 'net' };
    }
    render();
  }

  // ---------- вид ----------
  const tzOf = (r) => r?.restaurant?.timezone || undefined;
  function fmtDate(iso, r, withSec = false) {
    const d = new Date(iso);
    const o = { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit', ...(withSec ? { second: '2-digit' } : {}) };
    try { return d.toLocaleString(t('locale'), { ...o, timeZone: tzOf(r) }); } catch { return d.toLocaleString(t('locale'), o); }
  }

  function verdict(cls, ic, title, text, extra = '') {
    return `<section class="vf-verdict ${cls}">
      <div class="vf-seal">${icon(ic)}</div>
      <h1 id="vf-h">${esc(title)}</h1>
      ${text ? `<p>${esc(text)}</p>` : ''}${extra}
    </section>`;
  }

  function formHtml() {
    return `<form class="vf-form" id="vf-form" novalidate>
      <label class="field"><small>${esc(t('linkLabel'))}</small><input id="vf-link" type="url" inputmode="url" autocomplete="off" autocapitalize="off" spellcheck="false" dir="ltr" placeholder="https://…/verify.html?b=…&amp;k=…" value="${esc(st.formVal)}"></label>
      ${st.formErr ? `<p class="notice bad">${icon('alert')}<span>${esc(t('badLink'))}</span></p>` : ''}
      <button type="submit" class="btn block">${icon('check', 'sm')}<span>${esc(t('check'))}</span></button>
    </form>`;
  }

  function receiptHtml(r, voided) {
    const rs = r.restaurant || {};
    const curName = rs.currency || 'RM';
    const num = (n) => new Intl.NumberFormat(t('locale'), { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(Number(n) || 0);
    const cur = (n) => (rs.currency_before !== false ? `${curName} ${num(n)}` : `${num(n)} ${curName}`);
    const lines = new Map();
    for (const i of r.items || []) {
      const on = (i.opts || []).map((x) => L(x)).filter(Boolean);
      const name = L(i.name);
      const k = `${JSON.stringify(i.name)}|${on.join(',')}|${i.price}`;
      const l = lines.get(k) || { name, on, price: Number(i.price), qty: 0 };
      l.qty += Number(i.qty);
      lines.set(k, l);
    }
    const n = (k) => Number(r[k]) || 0;
    const pctOf = (part, base) => { const p = base > 0 ? Math.round((part / base) * 1000) / 10 : 0; return p ? `${String(p).replace(/\.0$/, '')}%` : ''; };
    const taxBase = n('subtotal') - n('discount') + (rs.tax_on_service === false ? 0 : n('service'));
    const pays = (r.payments || []).length ? r.payments : [{ method: r.method, amount: n('total') + n('tip') + n('rounding') }];
    const row = (k, v, cls = '', dir = 'ltr') => `<div class="rc-row${cls ? ` ${cls}` : ''}"><span>${esc(k)}</span><b dir="${dir}">${esc(v)}</b></div>`;
    const addr = L(rs.address);
    return `<article class="g-receipt${voided ? ' voided' : ''}" aria-label="${esc(t('receiptNo')(r.no))}">
        <header class="rc-head"><b>${esc(rs.name || '')}</b>${addr ? `<small>${esc(addr)}</small>` : ''}${rs.phone ? `<small dir="ltr">${esc(rs.phone)}</small>` : ''}${rs.receipt_info ? `<small class="rc-info">${esc(rs.receipt_info)}</small>` : ''}</header>
        <div class="rc-doc">${esc(t('receiptNo')(r.no))}</div>
        ${voided ? `<div class="vf-stamp">${esc(t('voidStamp'))}</div>` : ''}
        <div class="rc-block">
          ${r.kind === 'delivery' ? row(t('delivery'), '') : row(t('table'), r.table_label || '')}
          ${(r.order_nos || []).length ? row(t('orders'), r.order_nos.map((x) => `№${x}`).join(', ')) : ''}
          ${row(t('date'), fmtDate(r.paid_at, r), '', 'auto')}
        </div>
        <ul class="rc-items">${[...lines.values()].map((l) => `<li><span><b>${esc(l.name)}</b>${l.on.length ? `<em>${esc(l.on.join(', '))}</em>` : ''}<small dir="ltr">${l.qty} × ${esc(num(l.price))}</small></span><b dir="ltr">${esc(num(l.price * l.qty))}</b></li>`).join('')}</ul>
        <div class="rc-block">
          ${row(t('subtotal'), num(n('subtotal')))}
          ${n('discount') ? row(`${t('discount')}${r.discount_pct ? ` ${Number(r.discount_pct)}%` : ''}`, `−${num(n('discount'))}`) : ''}
          ${n('service') ? row(`${t('service')} ${pctOf(n('service'), n('subtotal') - n('discount'))}`.trim(), num(n('service'))) : ''}
          ${n('tax') ? row(`${r.tax_name || 'SST'} ${pctOf(n('tax'), taxBase)}`.trim(), num(n('tax'))) : ''}
          ${n('delivery_fee') ? row(t('dvFee'), num(n('delivery_fee'))) : ''}
        </div>
        ${row(t('total'), cur(n('total')), 'rc-total')}
        ${n('rounding') ? `<div class="rc-block">${row(t('rounding'), `${n('rounding') > 0 ? '+' : '−'}${num(Math.abs(n('rounding')))}`)}${row(t('toPay'), cur(n('total') + n('rounding')))}</div>` : ''}
        <div class="rc-block">
          ${n('tip') ? row(t('tip'), num(n('tip'))) : ''}
          ${pays.map((p) => row(`${t('paid')}: ${t('pay')[p.method] || p.method}`, cur(p.amount))).join('')}
          ${pays.length > 1 || n('tip') ? row(t('paidTotal'), cur(n('total') + n('tip') + n('rounding')), 'rc-strong') : ''}
        </div>
        <p class="vf-code">${esc(t('verifyCode'))}: <b dir="ltr">${esc((st.p.k.match(/.{1,4}/g) || []).join('-'))}</b></p>
      </article>`;
  }

  const nowText = () => `${t('checkedAt')}: ${fmtDate(new Date().toISOString(), st.data, true)}`;

  function render() {
    const html = document.documentElement;
    html.lang = lang;
    html.dir = t('dir');
    document.title = restName ? `${t('title')} · ${restName}` : t('title');
    $('#vf-name').textContent = restName || t('title');
    $('#vf-sub').textContent = restName ? t('title') : '';
    $('#vf-lang-code').textContent = lang.toUpperCase();
    $('#vf-lang-btn').setAttribute('aria-label', `${t('language')}: ${t('langName')}`);
    $('#vf-lang-menu').innerHTML = LANGS.map((l) => `<li role="none"><button type="button" role="menuitemradio" aria-checked="${l === lang}" class="${l === lang ? 'on' : ''}" data-lang="${l}" dir="ltr">
      <span lang="${l}">${esc(T[l].langName)}</span><span class="lang-code">${l === lang ? icon('check', 'sm') : esc(l.toUpperCase())}</span></button></li>`).join('');

    const m = $('#vf-main');
    const again = `<button type="button" class="btn ghost block vf-again" data-act="another">${icon('qr', 'sm')}<span>${esc(t('another'))}</span></button>`;
    if (st.phase === 'loading') {
      m.innerHTML = `<div class="vf-loading"><span class="spinner" aria-hidden="true"></span><span>${esc(t('loading'))}</span></div>`;
    } else if (st.phase === 'ok') {
      m.innerHTML = verdict('ok', 'check', t('okTitle'), t('okText'), `<span class="vf-checked">${icon('clock')}<span id="vf-now">${esc(nowText())}</span></span>`)
        + receiptHtml(st.data, false) + again;
    } else if (st.phase === 'void') {
      m.innerHTML = verdict('void', 'alert', t('voidTitle')(st.data.voided_at ? fmtDate(st.data.voided_at, st.data) : ''), t('voidText'), `<span class="vf-checked">${icon('clock')}<span id="vf-now">${esc(nowText())}</span></span>`)
        + receiptHtml(st.data, true) + again;
    } else if (st.phase === 'fake') {
      m.innerHTML = verdict('fake', 'alert', t('fakeTitle'), t('fakeText')) + formHtml();
    } else if (st.phase === 'net') {
      m.innerHTML = verdict('net', 'refresh', t('netTitle'), t('netText'))
        + `<button type="button" class="btn block vf-again" data-act="retry">${icon('refresh', 'sm')}<span>${esc(t('retry'))}</span></button>`;
    } else {
      m.innerHTML = verdict('idle', 'qr', t('scanTitle'), t('scanText')) + formHtml();
    }
  }

  // «Проверено: …» идёт каждую секунду — живая страница, не картинка
  setInterval(() => { const el = document.getElementById('vf-now'); if (el) el.textContent = nowText(); }, 1000);

  function closeLang() { $('#vf-lang-menu').hidden = true; $('#vf-lang-btn').setAttribute('aria-expanded', 'false'); }
  document.addEventListener('click', (e) => {
    const a = e.target.closest('[data-act], [data-lang], #vf-lang-btn');
    if (!a) { closeLang(); return; }
    if (a.id === 'vf-lang-btn') {
      const menu = $('#vf-lang-menu');
      menu.hidden = !menu.hidden;
      a.setAttribute('aria-expanded', String(!menu.hidden));
      if (!menu.hidden) menu.querySelector('button.on')?.focus();
      return;
    }
    if (a.dataset.lang) {
      lang = a.dataset.lang;
      store.set('lang', lang);
      closeLang();
      render();
      $('#vf-lang-btn').focus();
      return;
    }
    if (a.dataset.act === 'retry' && st.p) check(st.p);
    if (a.dataset.act === 'another') { st = { phase: 'idle', p: null, data: null, formErr: false, formVal: '' }; render(); $('#vf-link')?.focus(); }
  });
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape') closeLang(); });
  document.addEventListener('input', (e) => { if (e.target.id === 'vf-link') st.formVal = e.target.value; });
  document.addEventListener('submit', (e) => {
    if (e.target.id !== 'vf-form') return;
    e.preventDefault();
    const p = parse($('#vf-link').value);
    if (!p.b || !p.k) { st = { ...st, formErr: true }; render(); $('#vf-link')?.focus(); return; }
    st.formErr = false;
    check(p);
  });

  if (fromUrl.b || fromUrl.k) check(fromUrl); else render();
})();

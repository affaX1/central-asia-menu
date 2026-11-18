(() => {
  'use strict';

  const M = window.MENU;

  // ---------- Тексты интерфейса ----------
  const T = {
    ru: {
      langName: 'Русский', locale: 'ru-RU', dir: 'ltr',
      menuWord: 'Меню',
      search: 'Найти блюдо',
      order: 'Мой заказ',
      total: 'Итого',
      clear: 'Очистить',
      nothing: 'Ничего не нашлось. Попробуйте другое слово.',
      add: 'Добавить',
      remove: 'Убрать одну',
      waiter: 'Покажите этот список официанту — он примет заказ.',
      orderEmpty: 'Пока пусто. Добавляйте блюда кнопкой +',
      g: 'г', ml: 'мл', kcal: 'ккал', pcs: () => 'шт.',
      daily: 'Ежедневно',
      table: 'Стол',
      openUntil: (x) => `Открыто до ${x}`,
      closedOpens: (x) => `Закрыто · откроемся в ${x}`,
      ingredients: 'Состав',
      allergens: 'Аллергены',
      close: 'Закрыть',
      theme: 'Сменить тему',
      language: 'Язык',
      send: 'Отправить заказ',
      sending: 'Отправляем…',
      sentTitle: (n) => `Заказ №${n} отправлен!`,
      sentHint: 'Официант скоро подойдёт. Статус обновляется сам.',
      myOrders: 'Ваши заказы',
      orderNo: (n) => `Заказ №${n}`,
      note: 'Комментарий для кухни (необязательно)',
      tableAsk: 'Номер вашего стола',
      errNet: 'Не получилось отправить. Проверьте интернет и попробуйте ещё раз.',
      errMany: 'Слишком много заказов подряд. Подождите минуту или позовите официанта.',
      errTable: 'Укажите номер стола',
      statuses: { new: 'Отправлен', accepted: 'Принят', cooking: 'Готовится', served: 'Подан', paid: 'Оплачен', cancelled: 'Отменён' },
      tags: { hit: 'Хит', new: 'Новинка', spicy: 'Острое', veg: 'Без мяса' },
      allergenNames: { gluten: 'глютен', milk: 'молоко', eggs: 'яйца', fish: 'рыба', shellfish: 'морепродукты', nuts: 'орехи', soy: 'соя', sesame: 'кунжут' },
    },
    uz: {
      langName: "O'zbekcha", locale: 'uz-Latn-UZ', dir: 'ltr',
      menuWord: 'Menyu',
      search: 'Taom qidirish',
      order: 'Mening buyurtmam',
      total: 'Jami',
      clear: 'Tozalash',
      nothing: "Hech narsa topilmadi. Boshqa so'z bilan qidirib ko'ring.",
      add: "Qo'shish",
      remove: 'Bittasini olib tashlash',
      waiter: "Ushbu ro'yxatni ofitsiantga ko'rsating — u buyurtmani qabul qiladi.",
      orderEmpty: "Hozircha bo'sh. Taomlarni + tugmasi bilan qo'shing",
      g: 'g', ml: 'ml', kcal: 'kkal', pcs: () => 'dona',
      daily: 'Har kuni',
      table: 'Stol',
      openUntil: (x) => `Ochiq · ${x} gacha`,
      closedOpens: (x) => `Yopiq · soat ${x} da ochiladi`,
      ingredients: 'Tarkibi',
      allergens: 'Allergenlar',
      close: 'Yopish',
      theme: "Mavzuni o'zgartirish",
      language: 'Til',
      send: 'Buyurtmani yuborish',
      sending: 'Yuborilmoqda…',
      sentTitle: (n) => `Buyurtma №${n} yuborildi!`,
      sentHint: "Ofitsiant tez orada keladi. Holat o'zi yangilanadi.",
      myOrders: 'Buyurtmalaringiz',
      orderNo: (n) => `Buyurtma №${n}`,
      note: 'Oshxona uchun izoh (ixtiyoriy)',
      tableAsk: 'Stolingiz raqami',
      errNet: "Yuborib bo'lmadi. Internetni tekshirib, qayta urinib ko'ring.",
      errMany: "Ketma-ket juda ko'p buyurtma. Bir daqiqa kuting yoki ofitsiantni chaqiring.",
      errTable: 'Stol raqamini kiriting',
      statuses: { new: 'Yuborildi', accepted: 'Qabul qilindi', cooking: 'Tayyorlanmoqda', served: 'Tortildi', paid: "To'landi", cancelled: 'Bekor qilindi' },
      tags: { hit: 'Xit', new: 'Yangi', spicy: 'Achchiq', veg: "Go'shtsiz" },
      allergenNames: { gluten: 'kleykovina', milk: 'sut', eggs: 'tuxum', fish: 'baliq', shellfish: 'dengiz mahsulotlari', nuts: "yong'oq", soy: 'soya', sesame: 'kunjut' },
    },
    en: {
      langName: 'English', locale: 'en-US', dir: 'ltr',
      menuWord: 'Menu',
      search: 'Find a dish',
      order: 'My order',
      total: 'Total',
      clear: 'Clear',
      nothing: 'Nothing found. Try another word.',
      add: 'Add',
      remove: 'Remove one',
      waiter: 'Show this list to your waiter to place the order.',
      orderEmpty: 'Nothing here yet. Add dishes with the + button',
      g: 'g', ml: 'ml', kcal: 'kcal', pcs: (n) => (n === 1 ? 'pc' : 'pcs'),
      daily: 'Daily',
      table: 'Table',
      openUntil: (x) => `Open until ${x}`,
      closedOpens: (x) => `Closed · opens at ${x}`,
      ingredients: 'Ingredients',
      allergens: 'Allergens',
      close: 'Close',
      theme: 'Switch theme',
      language: 'Language',
      send: 'Send order',
      sending: 'Sending…',
      sentTitle: (n) => `Order #${n} sent!`,
      sentHint: 'Your waiter will be with you shortly. The status updates by itself.',
      myOrders: 'Your orders',
      orderNo: (n) => `Order #${n}`,
      note: 'Note for the kitchen (optional)',
      tableAsk: 'Your table number',
      errNet: "Couldn't send. Check your connection and try again.",
      errMany: 'Too many orders in a row. Wait a minute or ask your waiter.',
      errTable: 'Enter your table number',
      statuses: { new: 'Sent', accepted: 'Accepted', cooking: 'Cooking', served: 'Served', paid: 'Paid', cancelled: 'Cancelled' },
      tags: { hit: 'Popular', new: 'New', spicy: 'Spicy', veg: 'Vegetarian' },
      allergenNames: { gluten: 'gluten', milk: 'milk', eggs: 'eggs', fish: 'fish', shellfish: 'shellfish', nuts: 'nuts', soy: 'soy', sesame: 'sesame' },
    },
    ar: {
      // Цифры оставляем привычные (0–9), как на ценниках и в часах работы.
      langName: 'العربية', locale: 'ar-u-nu-latn', dir: 'rtl',
      menuWord: 'القائمة',
      search: 'ابحث عن طبق',
      order: 'طلبي',
      total: 'المجموع',
      clear: 'مسح الطلب',
      nothing: 'لا توجد نتائج. جرّب كلمة أخرى.',
      add: 'إضافة',
      remove: 'إزالة واحد',
      waiter: 'اعرض هذه القائمة على النادل ليأخذ طلبك.',
      orderEmpty: 'لا شيء بعد. أضف الأطباق بزر +',
      g: 'غ', ml: 'مل', kcal: 'سعرة', pcs: (n) => (n >= 3 && n <= 10 ? 'قطع' : 'قطعة'),
      daily: 'يوميًا',
      table: 'طاولة',
      openUntil: (x) => `مفتوح حتى ${x}`,
      closedOpens: (x) => `مغلق · نفتح الساعة ${x}`,
      ingredients: 'المكونات',
      allergens: 'مسببات الحساسية',
      close: 'إغلاق',
      theme: 'تغيير المظهر',
      language: 'اللغة',
      send: 'إرسال الطلب',
      sending: 'جارٍ الإرسال…',
      sentTitle: (n) => `تم إرسال الطلب رقم ${n}!`,
      sentHint: 'سيأتيك النادل قريبًا. تتحدّث الحالة تلقائيًا.',
      myOrders: 'طلباتك',
      orderNo: (n) => `الطلب رقم ${n}`,
      note: 'ملاحظة للمطبخ (اختياري)',
      tableAsk: 'رقم طاولتك',
      errNet: 'تعذّر الإرسال. تحقّق من الاتصال وحاول مرة أخرى.',
      errMany: 'طلبات كثيرة متتالية. انتظر دقيقة أو اطلب النادل.',
      errTable: 'أدخل رقم الطاولة',
      statuses: { new: 'أُرسل', accepted: 'تم القبول', cooking: 'قيد التحضير', served: 'تم التقديم', paid: 'مدفوع', cancelled: 'أُلغي' },
      tags: { hit: 'الأكثر طلبًا', new: 'جديد', spicy: 'حار', veg: 'نباتي' },
      allergenNames: { gluten: 'غلوتين', milk: 'حليب', eggs: 'بيض', fish: 'سمك', shellfish: 'مأكولات بحرية', nuts: 'مكسرات', soy: 'صويا', sesame: 'سمسم' },
    },
    ms: {
      langName: 'Bahasa Melayu', locale: 'ms-MY', dir: 'ltr',
      menuWord: 'Menu',
      search: 'Cari hidangan',
      order: 'Pesanan saya',
      total: 'Jumlah',
      clear: 'Kosongkan',
      nothing: 'Tiada hasil. Cuba perkataan lain.',
      add: 'Tambah',
      remove: 'Buang satu',
      waiter: 'Tunjukkan senarai ini kepada pelayan untuk membuat pesanan.',
      orderEmpty: 'Masih kosong. Tambah hidangan dengan butang +',
      g: 'g', ml: 'ml', kcal: 'kcal', pcs: () => 'biji',
      daily: 'Setiap hari',
      table: 'Meja',
      openUntil: (x) => `Buka hingga ${x}`,
      closedOpens: (x) => `Tutup · dibuka pada ${x}`,
      ingredients: 'Bahan-bahan',
      allergens: 'Alergen',
      close: 'Tutup',
      theme: 'Tukar tema',
      language: 'Bahasa',
      send: 'Hantar pesanan',
      sending: 'Menghantar…',
      sentTitle: (n) => `Pesanan #${n} dihantar!`,
      sentHint: 'Pelayan akan datang sebentar lagi. Status dikemas kini sendiri.',
      myOrders: 'Pesanan anda',
      orderNo: (n) => `Pesanan #${n}`,
      note: 'Nota untuk dapur (pilihan)',
      tableAsk: 'Nombor meja anda',
      errNet: 'Gagal dihantar. Semak sambungan dan cuba lagi.',
      errMany: 'Terlalu banyak pesanan berturut-turut. Tunggu seminit atau panggil pelayan.',
      errTable: 'Masukkan nombor meja',
      statuses: { new: 'Dihantar', accepted: 'Diterima', cooking: 'Sedang dimasak', served: 'Telah dihidang', paid: 'Dibayar', cancelled: 'Dibatalkan' },
      tags: { hit: 'Popular', new: 'Baharu', spicy: 'Pedas', veg: 'Vegetarian' },
      allergenNames: { gluten: 'gluten', milk: 'susu', eggs: 'telur', fish: 'ikan', shellfish: 'kerang-kerangan', nuts: 'kacang', soy: 'soya', sesame: 'bijan' },
    },
  };

  // ---------- Хранилище (может быть недоступно — тогда просто без памяти) ----------
  const store = {
    get(k, d) {
      try { const v = localStorage.getItem('menu:' + k); return v == null ? d : JSON.parse(v); } catch { return d; }
    },
    set(k, v) {
      try { localStorage.setItem('menu:' + k, JSON.stringify(v)); } catch { /* приватный режим */ }
    },
  };

  // ---------- Состояние ----------
  const byId = Object.fromEntries(M.dishes.map((d) => [d.id, d]));
  // Язык: что гость выбрал сам → язык его телефона → defaultLanguage (английский).
  const LANGS = M.languages.filter((l) => T[l]);
  let lang = store.get('lang', null);
  if (!LANGS.includes(lang)) {
    const phone = (navigator.languages || [navigator.language || '']).map((l) => String(l).slice(0, 2).toLowerCase());
    lang = phone.find((l) => LANGS.includes(l)) || (LANGS.includes(M.defaultLanguage) ? M.defaultLanguage : LANGS[0]);
  }
  let order = store.get('order', {});
  if (!order || typeof order !== 'object') order = {};
  for (const id of Object.keys(order)) {
    if (!byId[id] || !(order[id] > 0)) delete order[id];
  }
  // Номер стола приходит из QR-кода: ...?table=5. Помним его 6 часов,
  // чтобы при обновлении страницы номер не пропадал, а завтра не путал.
  const TABLE_TTL = 6 * 60 * 60 * 1000;
  let table = '';
  {
    const p = new URLSearchParams(location.search);
    const fromUrl = (p.get('table') || p.get('t') || '').trim();
    if (/^[\p{L}\p{N}-]{1,10}$/u.test(fromUrl)) {
      table = fromUrl;
      store.set('table', { v: table, at: Date.now() });
    } else {
      const saved = store.get('table', null);
      if (saved && typeof saved.v === 'string' && Date.now() - saved.at < TABLE_TTL) table = saved.v;
    }
  }

  let query = '';
  let sheet = null; // { type: 'dish', id } | { type: 'order' }
  let lastFocus = null;
  let activeCat = null;
  let spyLockUntil = 0;

  // ---------- Помощники ----------
  const $ = (s) => document.querySelector(s);
  const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
  const norm = (s) => String(s || '').toLowerCase().replace(/ё/g, 'е');
  const t = (k) => T[lang][k];
  // Текст на текущем языке; если перевода нет — английский, потом русский.
  const L = (o) => (o == null ? '' : typeof o === 'string' ? o : o[lang] ?? o.en ?? o.ru ?? Object.values(o)[0] ?? '');
  // Цена: «RM 28» или «RM 28.90» (сены — только если они есть).
  const money = (n) => {
    const v = Math.round(n * 100) / 100;
    const num = new Intl.NumberFormat(t('locale'), {
      minimumFractionDigits: Number.isInteger(v) ? 0 : 2,
      maximumFractionDigits: 2,
    }).format(v);
    const c = M.restaurant.currency;
    return M.restaurant.currencyBefore ? `${c}\u00A0${num}` : `${num}\u00A0${c}`;
  };
  const amount = (d) => {
    if (!d.weight) return '';
    const unit = d.unit === 'pcs' ? t('pcs')(d.weight) : t(d.unit === 'ml' ? 'ml' : 'g');
    return d.weight + ' ' + unit;
  };

  // '22:00' -> минуты от полуночи
  const mins = (hhmm) => { const [h, m] = String(hhmm).split(':').map(Number); return h * 60 + (m || 0); };
  // Время в формате языка: 22:00 по-русски, 10 PM по-английски
  const clock = (hhmm) => {
    const h = Math.floor(mins(hhmm) / 60) % 24;
    const m = mins(hhmm) % 60;
    if (lang !== 'en') return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
    return `${h % 12 || 12}${m ? ':' + String(m).padStart(2, '0') : ''} ${h < 12 ? 'AM' : 'PM'}`;
  };
  function isOpenNow(r) {
    const now = new Date();
    const m = now.getHours() * 60 + now.getMinutes();
    const o = mins(r.open);
    const c = mins(r.close);
    return c > o ? m >= o && m < c : m >= o || m < c; // второй случай — работа после полуночи
  }
  const qty = (id) => order[id] || 0;
  const smooth = () => (matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth');

  function matches(d) {
    if (!query) return true;
    const hay = norm(LANGS.map((l) => `${d.name?.[l] || ''} ${d.desc?.[l] || ''}`).join(' '));
    return query.split(/\s+/).every((w) => hay.includes(w));
  }

  // ---------- Шапка ----------
  function renderStatic() {
    const r = M.restaurant;
    document.documentElement.lang = lang;
    document.documentElement.dir = t('dir'); // арабский — справа налево
    document.title = `${L(r.name)} — ${t('menuWord')}`;
    $('#r-name').textContent = L(r.name);
    $('#r-tagline').textContent = L(r.tagline);
    if (r.logo) $('.logo').textContent = r.logo;

    const info = [];
    if (table) info.push(`<span class="status table">🪑 ${esc(t('table'))} ${esc(table)}</span>`);
    if (r.open && r.close) {
      const open = isOpenNow(r);
      info.push(`<span class="status ${open ? 'on' : 'off'}">${esc(open ? t('openUntil')(clock(r.close)) : t('closedOpens')(clock(r.open)))}</span>`);
      info.push(`<span>🕒 ${esc(t('daily'))} <bdi dir="ltr">${esc(`${clock(r.open)}–${clock(r.close)}`)}</bdi></span>`);
    } else if (r.hours) {
      info.push(`<span>🕒 ${esc(L(r.hours))}</span>`);
    }
    if (r.address) info.push(`<span>📍 ${esc(L(r.address))}</span>`);
    if (r.phone) info.push(`<a href="tel:${esc(r.phone.replace(/[^\d+]/g, ''))}">📞 <bdi dir="ltr">${esc(r.phone)}</bdi></a>`);
    $('#r-info').innerHTML = info.join('');

    $('#search').placeholder = t('search');
    const langBtn = $('#lang-btn');
    langBtn.hidden = LANGS.length < 2;
    langBtn.innerHTML = `<span aria-hidden="true">🌐</span> ${esc(lang.toUpperCase())}`;
    langBtn.setAttribute('aria-label', `${t('language')}: ${t('langName')}`);
    $('#theme-btn').setAttribute('aria-label', t('theme'));
    $('#sheet-close').setAttribute('aria-label', t('close'));
    $('#foot').textContent = L(r.footer);
  }

  // ---------- Карточки ----------
  function tagsHtml(d) {
    if (!d.tags?.length) return '';
    return `<div class="tags">${d.tags.map((k) => `<span class="tag tag-${esc(k)}">${esc(t('tags')[k] || k)}</span>`).join('')}</div>`;
  }

  function thumb(d, big) {
    const hue = Number(M.categories.find((c) => c.id === d.category)?.hue) || 30;
    const inner = d.photo ? `<img src="${esc(d.photo)}" alt="" loading="lazy">` : esc(d.emoji || '🍽️');
    return `<div class="thumb${big ? ' big' : ''}" style="--hue:${hue}" aria-hidden="true">${inner}</div>`;
  }

  function control(id) {
    const n = qty(id);
    const plus = `<button type="button" data-act="inc" data-id="${esc(id)}" aria-label="${esc(t('add'))}">+</button>`;
    if (!n) return plus.replace('<button', '<button class="add"');
    return `<div class="stepper"><button type="button" data-act="dec" data-id="${esc(id)}" aria-label="${esc(t('remove'))}">−</button><span>${n}</span>${plus}</div>`;
  }

  function card(d) {
    return `
      <article class="card" data-open="${esc(d.id)}" tabindex="0" role="button" aria-label="${esc(L(d.name))}">
        ${thumb(d)}
        <div class="card-body">
          ${tagsHtml(d)}
          <h3>${esc(L(d.name))}</h3>
          <p class="desc">${esc(L(d.desc))}</p>
          <div class="card-foot">
            <div class="price-wrap"><span class="price">${money(d.price)}</span><span class="amount">${esc(amount(d))}</span></div>
            <div class="slot" data-slot="${esc(d.id)}">${control(d.id)}</div>
          </div>
        </div>
      </article>`;
  }

  function renderMenu() {
    const groups = M.categories
      .map((c) => ({ c, items: M.dishes.filter((d) => d.category === c.id && !d.hidden && matches(d)) }))
      .filter((g) => g.items.length);

    $('#cats').innerHTML = groups
      .map(({ c }) => `<button type="button" class="chip" data-cat="${esc(c.id)}">${esc(c.emoji || '')} ${esc(L(c.name))}</button>`)
      .join('');

    $('#menu').innerHTML = groups
      .map(({ c, items }) => `
        <section class="cat" id="cat-${esc(c.id)}" data-cat="${esc(c.id)}">
          <h2>${esc(L(c.name))}</h2>
          <div class="grid">${items.map(card).join('')}</div>
        </section>`)
      .join('');

    const empty = $('#empty');
    empty.hidden = groups.length > 0;
    empty.textContent = t('nothing');

    activeCat = null;
    onScroll();
  }

  // ---------- Активная категория при прокрутке ----------
  function setActive(id) {
    activeCat = id;
    const nav = $('#cats');
    nav.querySelectorAll('.chip').forEach((c) => {
      const on = c.dataset.cat === id;
      c.classList.toggle('active', on);
      c.setAttribute('aria-current', on ? 'true' : 'false');
      if (on) nav.scrollTo({ left: c.offsetLeft - nav.clientWidth / 2 + c.clientWidth / 2, behavior: smooth() });
    });
  }

  function onScroll() {
    if (Date.now() < spyLockUntil) return;
    const sections = [...document.querySelectorAll('section.cat')];
    if (!sections.length) return;
    const line = $('#cats').getBoundingClientRect().bottom + 16;
    let cur = sections[0].dataset.cat;
    for (const s of sections) if (s.getBoundingClientRect().top <= line) cur = s.dataset.cat;
    const atBottom = window.innerHeight + window.scrollY >= document.documentElement.scrollHeight - 4;
    if (atBottom && window.scrollY > 0) cur = sections[sections.length - 1].dataset.cat;
    if (cur !== activeCat) setActive(cur);
  }

  let ticking = false;
  window.addEventListener('scroll', () => {
    if (ticking) return;
    ticking = true;
    requestAnimationFrame(() => { ticking = false; onScroll(); });
  }, { passive: true });

  // ---------- Заказ ----------
  function totals() {
    let count = 0;
    let sum = 0;
    for (const [id, n] of Object.entries(order)) { count += n; sum += byId[id].price * n; }
    return { count, sum };
  }

  // ---------- Сервер заказов (Supabase) ----------
  // Пока в config.js пусто — всё как раньше: гость показывает список официанту.
  const B = window.MENU_BACKEND || {};
  const ONLINE = !!(B.url && B.key);
  const ACTIVE = ['new', 'accepted', 'cooking', 'served'];
  const TABLE_RE = /^[\p{L}\p{N}-]{1,10}$/u;

  async function rpc(name, body) {
    const headers = { 'Content-Type': 'application/json', apikey: B.key };
    if (String(B.key).startsWith('eyJ')) headers.Authorization = 'Bearer ' + B.key; // старый формат ключа
    let res;
    try {
      res = await fetch(`${String(B.url).replace(/\/+$/, '')}/rest/v1/rpc/${name}`, {
        method: 'POST', headers, body: JSON.stringify(body),
      });
    } catch {
      throw new Error('network');
    }
    const data = await res.json().catch(() => null);
    if (!res.ok) throw new Error(String(data?.message || `http_${res.status}`));
    return Array.isArray(data) ? data[0] : data;
  }

  // Заказы, отправленные с этого телефона. Храним сутки, не больше 10.
  let sent = store.get('sent', []);
  if (!Array.isArray(sent)) sent = [];
  sent = sent.filter((s) => s && s.id && Date.now() - s.at < 24 * 60 * 60 * 1000).slice(-10);
  const activeSent = () => sent.filter((s) => ACTIVE.includes(s.status));
  let sending = false;
  let sendError = '';
  let justSent = null;   // номер заказа, который только что ушёл (показываем «отправлен!»)
  let noteDraft = '';
  let tableDraft = '';

  const itemsSummary = (items) => (items || [])
    .map((i) => `${i.qty}× ${L(byId[i.id]?.name) || i.id}`).join(', ');

  async function sendOrder() {
    if (sending || !ONLINE) return;
    const tbl = String(table || tableDraft).trim();
    if (!TABLE_RE.test(tbl)) {
      sendError = t('errTable');
      renderSheet();
      $('#table-input')?.focus();
      return;
    }
    const items = Object.entries(order).map(([id, n]) => ({ id, qty: n }));
    if (!items.length) return;

    sending = true;
    sendError = '';
    renderSheet();
    try {
      const row = await rpc('place_order', { p_table: tbl, p_items: items, p_note: noteDraft.trim() || null, p_lang: lang });
      if (!row?.id) throw new Error('bad_reply');
      if (!table) {
        table = tbl;
        store.set('table', { v: table, at: Date.now() });
        renderStatic();
      }
      sent.push({ id: row.id, no: row.no, table: tbl, at: Date.now(), status: 'new', items });
      store.set('sent', sent);
      order = {};
      store.set('order', order);
      noteDraft = '';
      justSent = row.no;
      refreshSlots();
      schedulePoll(true);
    } catch (e) {
      const m = String(e?.message || '');
      sendError = m.includes('too_many') ? t('errMany') : m.includes('bad_table') ? t('errTable') : t('errNet');
    } finally {
      sending = false;
      renderBar();
      renderSheet();
    }
  }

  // Статус своих заказов спрашиваем каждые 15 секунд, пока страница открыта.
  let pollTimer = null;
  async function pollStatuses() {
    const list = activeSent().slice(-5);
    if (!ONLINE || !list.length) return;
    let changed = false;
    await Promise.all(list.map(async (s) => {
      try {
        const row = await rpc('order_status', { p_id: s.id });
        const next = row?.status || 'gone'; // gone — заказ старше суток или удалён
        if (next !== s.status) { s.status = next; changed = true; }
      } catch { /* нет сети — спросим в следующий раз */ }
    }));
    if (changed) {
      store.set('sent', sent);
      renderBar();
      if (sheet?.type === 'order') renderSheet();
    }
  }
  function schedulePoll(soon) {
    clearTimeout(pollTimer);
    if (!ONLINE || !activeSent().length) return;
    pollTimer = setTimeout(async () => {
      if (!document.hidden) await pollStatuses();
      schedulePoll();
    }, soon ? 2000 : 15000);
  }
  document.addEventListener('visibilitychange', () => {
    if (!document.hidden) { pollStatuses(); schedulePoll(); }
  });

  function renderBar() {
    const { count, sum } = totals();
    const bar = $('#order-bar');
    const live = activeSent();
    if (count > 0) {
      bar.classList.remove('status-bar');
      bar.innerHTML = `<span class="bar-left"><span class="badge">${count}</span>${esc(t('order'))}</span><span class="bar-sum">${money(sum)}</span>`;
    } else if (live.length) {
      const last = live[live.length - 1];
      bar.classList.add('status-bar');
      bar.innerHTML = `<span class="bar-left">🧾 ${esc(t('orderNo')(last.no))}</span><span class="st st-${esc(last.status)}">${esc(t('statuses')[last.status] || '')}</span>`;
    }
    bar.hidden = count === 0 && !live.length;
    document.body.classList.toggle('has-bar', !bar.hidden);
  }

  function refreshSlots() {
    document.querySelectorAll('[data-slot]').forEach((el) => { el.innerHTML = control(el.dataset.slot); });
  }

  function change(id, delta) {
    if (!byId[id]) return;
    const n = Math.max(0, qty(id) + delta);
    if (n) order[id] = n; else delete order[id];
    store.set('order', order);
    justSent = null;
    sendError = '';
    refreshSlots();
    renderBar();
    if (sheet?.type === 'order') renderSheet();
  }

  function orderSheetHtml() {
    const rows = Object.entries(order);
    const out = [`<h2 class="sheet-title" id="sheet-title">${esc(t('order'))}</h2>`];
    if (table) out.push(`<p class="table-big">${esc(t('table'))} ${esc(table)}</p>`);
    if (justSent != null) {
      out.push(`<div class="sent-ok" role="status"><strong>✅ ${esc(t('sentTitle')(justSent))}</strong><span>${esc(t('sentHint'))}</span></div>`);
    }

    if (rows.length) {
      if (!ONLINE) out.push(`<p class="hint">${esc(t('waiter'))}</p>`);
      out.push(`<ul class="order-list">${rows.map(([id, n]) => {
        const d = byId[id];
        return `<li>
          <span class="o-emoji" aria-hidden="true">${esc(d.emoji || '🍽️')}</span>
          <span class="o-name">${esc(L(d.name))}<small>${money(d.price)}</small></span>
          ${control(id)}
          <span class="o-sum">${money(d.price * n)}</span>
        </li>`;
      }).join('')}</ul>`);
      out.push(`<div class="order-total"><span>${esc(t('total'))}</span><strong>${money(totals().sum)}</strong></div>`);

      if (ONLINE) {
        const r = M.restaurant;
        if (r.open && r.close && !isOpenNow(r)) {
          out.push(`<p class="send-error">${esc(t('closedOpens')(clock(r.open)))}</p>`);
        } else {
          if (!table) {
            out.push(`<label class="field"><span>${esc(t('tableAsk'))}</span>
              <input id="table-input" type="text" inputmode="numeric" maxlength="10" autocomplete="off" value="${esc(tableDraft)}"></label>`);
          }
          out.push(`<label class="field"><span>${esc(t('note'))}</span>
            <textarea id="note-input" rows="2" maxlength="300">${esc(noteDraft)}</textarea></label>`);
          if (sendError) out.push(`<p class="send-error" role="alert">${esc(sendError)}</p>`);
          out.push(`<button type="button" class="send-btn" data-act="send"${sending ? ' disabled' : ''}>${esc(sending ? t('sending') : t('send'))}</button>`);
        }
      }
      out.push(`<button type="button" class="ghost" data-act="clear">${esc(t('clear'))}</button>`);
    } else if (justSent == null) {
      out.push(`<p class="hint">${esc(t('orderEmpty'))}</p>`);
    }

    const mine = sent.filter((s) => s.status !== 'gone').slice().reverse();
    if (ONLINE && mine.length) {
      out.push(`<h4>${esc(t('myOrders'))}</h4><ul class="sent-list">${mine.map((s) => `
        <li><span class="sent-name">${esc(t('orderNo')(s.no))}<small>${esc(itemsSummary(s.items))}</small></span>
        <span class="st st-${esc(s.status)}">${esc(t('statuses')[s.status] || s.status)}</span></li>`).join('')}</ul>`);
    }
    return out.join('');
  }

  // ---------- Шторка ----------
  function renderSheet() {
    if (!sheet) return;
    const body = $('#sheet-body');

    if (sheet.type === 'lang') {
      body.innerHTML = `
        <h2 class="sheet-title" id="sheet-title">🌐 ${esc(t('language'))}</h2>
        <ul class="lang-list">
          ${LANGS.map((l) => `<li><button type="button" class="lang-opt${l === lang ? ' on' : ''}" data-lang="${esc(l)}" dir="ltr" aria-pressed="${l === lang}">
            <span lang="${esc(l)}">${esc(T[l].langName)}</span><span class="lang-code">${l === lang ? '✓' : esc(l.toUpperCase())}</span>
          </button></li>`).join('')}
        </ul>`;
      return;
    }

    if (sheet.type === 'dish') {
      const d = byId[sheet.id];
      const meta = [amount(d), d.kcal ? `${d.kcal} ${t('kcal')}` : ''].filter(Boolean).join(' · ');
      const allergens = (d.allergens || []).map((a) => t('allergenNames')[a] || a).join(', ');
      body.innerHTML = `
        ${thumb(d, true)}
        ${tagsHtml(d)}
        <h2 class="sheet-title" id="sheet-title">${esc(L(d.name))}</h2>
        <p class="sheet-desc">${esc(L(d.desc))}</p>
        ${d.ingredients ? `<h4>${esc(t('ingredients'))}</h4><p>${esc(L(d.ingredients))}</p>` : ''}
        ${allergens ? `<h4>${esc(t('allergens'))}</h4><p>${esc(allergens)}</p>` : ''}
        <div class="sheet-foot">
          <div class="price-wrap"><span class="price big">${money(d.price)}</span><span class="amount">${esc(meta)}</span></div>
          <div class="slot" data-slot="${esc(d.id)}">${control(d.id)}</div>
        </div>`;
      return;
    }

    body.innerHTML = orderSheetHtml();
  }

  function openSheet(next) {
    const wasOpen = !!sheet;
    sheet = next;
    renderSheet();
    const el = $('#sheet');
    el.scrollTop = 0;
    if (wasOpen) return;
    lastFocus = document.activeElement;
    el.hidden = false;
    $('#backdrop').hidden = false;
    document.body.classList.add('locked');
    requestAnimationFrame(() => requestAnimationFrame(() => {
      el.classList.add('open');
      $('#backdrop').classList.add('open');
    }));
    $('#sheet-close').focus({ preventScroll: true });
  }

  function closeSheet() {
    if (!sheet) return;
    sheet = null;
    justSent = null;
    const el = $('#sheet');
    const bd = $('#backdrop');
    el.classList.remove('open');
    bd.classList.remove('open');
    document.body.classList.remove('locked');
    setTimeout(() => { if (!sheet) { el.hidden = true; bd.hidden = true; } }, 280);
    if (lastFocus && document.contains(lastFocus)) lastFocus.focus({ preventScroll: true });
  }

  // ---------- Тема ----------
  const media = matchMedia('(prefers-color-scheme: dark)');
  let theme = store.get('theme', null);
  function applyTheme() {
    const th = theme || (media.matches ? 'dark' : 'light');
    document.documentElement.dataset.theme = th;
    document.querySelector('meta[name="theme-color"]').setAttribute('content', th === 'dark' ? '#1F1A16' : '#FBF6EE');
  }
  media.addEventListener?.('change', applyTheme);

  // ---------- События ----------
  document.addEventListener('click', (e) => {
    const act = e.target.closest('[data-act]');
    if (act) {
      const a = act.dataset.act;
      if (a === 'inc') change(act.dataset.id, 1);
      else if (a === 'dec') change(act.dataset.id, -1);
      else if (a === 'send') sendOrder();
      else if (a === 'clear') {
        order = {};
        store.set('order', order);
        refreshSlots();
        renderBar();
        renderSheet();
      }
      return;
    }

    const langOpt = e.target.closest('[data-lang]');
    if (langOpt) {
      lang = langOpt.dataset.lang;
      store.set('lang', lang);
      closeSheet();
      renderAll();
      return;
    }

    const chip = e.target.closest('.chip');
    if (chip) {
      const sec = document.getElementById('cat-' + chip.dataset.cat);
      if (sec) {
        setActive(chip.dataset.cat);
        spyLockUntil = Date.now() + 800;
        sec.scrollIntoView({ behavior: smooth(), block: 'start' });
      }
      return;
    }

    const open = e.target.closest('[data-open]');
    if (open) openSheet({ type: 'dish', id: open.dataset.open });
  });

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') { closeSheet(); return; }
    if ((e.key === 'Enter' || e.key === ' ') && e.target.matches?.('[data-open]')) {
      e.preventDefault();
      openSheet({ type: 'dish', id: e.target.dataset.open });
    }
  });

  $('#order-bar').addEventListener('click', () => openSheet({ type: 'order' }));
  $('#backdrop').addEventListener('click', closeSheet);
  $('#sheet-close').addEventListener('click', closeSheet);

  document.addEventListener('input', (e) => {
    if (e.target.id === 'note-input') noteDraft = e.target.value;
    else if (e.target.id === 'table-input') tableDraft = e.target.value;
  });

  $('#search').addEventListener('input', (e) => {
    query = norm(e.target.value.trim());
    renderMenu();
  });

  $('#lang-btn').addEventListener('click', () => openSheet({ type: 'lang' }));

  $('#theme-btn').addEventListener('click', () => {
    theme = document.documentElement.dataset.theme === 'dark' ? 'light' : 'dark';
    store.set('theme', theme);
    applyTheme();
  });

  function renderAll() {
    renderStatic();
    renderMenu();
    renderBar();
    renderSheet();
  }

  applyTheme();
  renderAll();
  setInterval(renderStatic, 60 * 1000); // метка «Открыто / Закрыто» обновляется сама
  pollStatuses();
  schedulePoll();
})();

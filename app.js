(() => {
  'use strict';

  // =====================================================================
  //  Меню для гостя. Гость смотрит меню и собирает свой список блюд,
  //  чтобы показать его официанту. Список никуда не отправляется.
  // =====================================================================

  // ---------- Тексты интерфейса на 5 языках ----------
  const T = {
    ru: {
      langName: 'Русский', locale: 'ru-RU', dir: 'ltr',
      menuWord: 'Меню',
      search: 'Поиск по меню', clearSearch: 'Очистить поиск',
      order: 'Мой заказ', total: 'Итого', clear: 'Очистить список',
      nothing: 'Ничего не нашлось', nothingHint: 'Попробуйте другое слово или посмотрите всё меню.', showAll: 'Показать всё меню',
      add: 'Добавить', remove: 'Убрать одну', removeItem: 'Убрать',
      waiter: 'Покажите этот список официанту — он примет заказ.',
      orderEmpty: 'Список пока пуст. Добавляйте блюда кнопкой «плюс».',
      g: 'г', ml: 'мл', kcal: 'ккал', pcs: () => 'шт.',
      table: 'Стол',
      ingredients: 'Состав', allergens: 'Аллергены',
      close: 'Закрыть', themeDark: 'Тёмная тема', themeLight: 'Светлая тема', language: 'Язык',
      tags: { hit: 'Хит', new: 'Новинка', spicy: 'Острое', veg: 'Без мяса' },
      allergenNames: { gluten: 'глютен', milk: 'молоко', eggs: 'яйца', fish: 'рыба', shellfish: 'морепродукты', nuts: 'орехи', soy: 'соя', sesame: 'кунжут' },
      soldOut: 'Нет в наличии', soldOutRow: 'Сейчас нет в наличии — не входит в сумму',
      unavailableNotice: (n) => `Сейчас нет в наличии: ${n}. Эти позиции не входят в сумму — уберите их или спросите официанта.`,
      priceNotice: (n) => `Изменилась цена: ${n}. Сумма пересчитана.`,
      listUpdated: 'Меню обновилось — проверьте свой список.',
      open: 'Открыто', closed: 'Закрыто', until: (x) => `до ${x}`,
      opensToday: (x) => `откроется в ${x}`, opensTomorrow: (x) => `откроется завтра в ${x}`,
      opensOn: (d, x) => `откроется ${['в понедельник', 'во вторник', 'в среду', 'в четверг', 'в пятницу', 'в субботу', 'в воскресенье'][d]} в ${x}`,
      closedForNow: 'Временно не работает',
      hours: 'Часы работы', daily: 'Ежедневно', dayOff: 'выходной', today: 'Сегодня',
      tzNote: (tz) => `Время указано по часам ресторана (${tz}).`,
      days: ['Понедельник', 'Вторник', 'Среда', 'Четверг', 'Пятница', 'Суббота', 'Воскресенье'],
      openMap: 'Открыть на карте', call: 'Позвонить',
      loading: 'Загружаем меню…', loadError: 'Не удалось загрузить меню', loadErrorHint: 'Проверьте интернет и попробуйте ещё раз.', retry: 'Повторить',
      emptyMenu: 'Меню скоро появится', emptyMenuHint: 'Ресторан ещё заполняет меню. Спросите официанта.',
      offline: 'Нет связи — показано меню, загруженное ранее.',
    },
    uz: {
      langName: "O'zbekcha", locale: 'uz-Latn-UZ', dir: 'ltr',
      menuWord: 'Menyu',
      search: "Menyu bo'yicha qidirish", clearSearch: 'Qidiruvni tozalash',
      order: 'Mening buyurtmam', total: 'Jami', clear: "Ro'yxatni tozalash",
      nothing: 'Hech narsa topilmadi', nothingHint: "Boshqa so'z bilan qidiring yoki butun menyuni ko'ring.", showAll: "Butun menyuni ko'rsatish",
      add: "Qo'shish", remove: 'Bittasini olib tashlash', removeItem: 'Olib tashlash',
      waiter: "Ushbu ro'yxatni ofitsiantga ko'rsating — u buyurtmani qabul qiladi.",
      orderEmpty: "Ro'yxat hozircha bo'sh. Taomlarni «plyus» tugmasi bilan qo'shing.",
      g: 'g', ml: 'ml', kcal: 'kkal', pcs: () => 'dona',
      table: 'Stol',
      ingredients: 'Tarkibi', allergens: 'Allergenlar',
      close: 'Yopish', themeDark: "Qorong'i mavzu", themeLight: "Yorug' mavzu", language: 'Til',
      tags: { hit: 'Xit', new: 'Yangi', spicy: 'Achchiq', veg: "Go'shtsiz" },
      allergenNames: { gluten: 'kleykovina', milk: 'sut', eggs: 'tuxum', fish: 'baliq', shellfish: 'dengiz mahsulotlari', nuts: "yong'oq", soy: 'soya', sesame: 'kunjut' },
      soldOut: "Hozircha yo'q", soldOutRow: "Hozircha yo'q — summaga kirmaydi",
      unavailableNotice: (n) => `Hozircha yo'q: ${n}. Bu taomlar summaga kirmaydi — ularni olib tashlang yoki ofitsiantdan so'rang.`,
      priceNotice: (n) => `Narx o'zgardi: ${n}. Summa qayta hisoblandi.`,
      listUpdated: "Menyu yangilandi — ro'yxatingizni tekshiring.",
      open: 'Ochiq', closed: 'Yopiq', until: (x) => `${x} gacha`,
      opensToday: (x) => `soat ${x} da ochiladi`, opensTomorrow: (x) => `ertaga soat ${x} da ochiladi`,
      opensOn: (d, x) => `${['dushanba', 'seshanba', 'chorshanba', 'payshanba', 'juma', 'shanba', 'yakshanba'][d]} kuni soat ${x} da ochiladi`,
      closedForNow: 'Vaqtincha ishlamaydi',
      hours: 'Ish vaqti', daily: 'Har kuni', dayOff: 'dam olish kuni', today: 'Bugun',
      tzNote: (tz) => `Vaqt restoran soati bo'yicha (${tz}).`,
      days: ['Dushanba', 'Seshanba', 'Chorshanba', 'Payshanba', 'Juma', 'Shanba', 'Yakshanba'],
      openMap: 'Xaritada ochish', call: "Qo'ng'iroq qilish",
      loading: 'Menyu yuklanmoqda…', loadError: "Menyuni yuklab bo'lmadi", loadErrorHint: "Internetni tekshirib, qayta urinib ko'ring.", retry: 'Qayta urinish',
      emptyMenu: "Menyu tez orada paydo bo'ladi", emptyMenuHint: "Restoran menyuni to'ldirmoqda. Ofitsiantdan so'rang.",
      offline: "Aloqa yo'q — avval yuklangan menyu ko'rsatilmoqda.",
    },
    en: {
      langName: 'English', locale: 'en-US', dir: 'ltr',
      menuWord: 'Menu',
      search: 'Search the menu', clearSearch: 'Clear search',
      order: 'My order', total: 'Total', clear: 'Clear list',
      nothing: 'Nothing found', nothingHint: 'Try another word or browse the full menu.', showAll: 'Show the full menu',
      add: 'Add', remove: 'Remove one', removeItem: 'Remove',
      waiter: 'Show this list to your waiter to place the order.',
      orderEmpty: 'Your list is empty. Add dishes with the plus button.',
      g: 'g', ml: 'ml', kcal: 'kcal', pcs: (n) => (n === 1 ? 'pc' : 'pcs'),
      table: 'Table',
      ingredients: 'Ingredients', allergens: 'Allergens',
      close: 'Close', themeDark: 'Dark theme', themeLight: 'Light theme', language: 'Language',
      tags: { hit: 'Popular', new: 'New', spicy: 'Spicy', veg: 'Vegetarian' },
      allergenNames: { gluten: 'gluten', milk: 'milk', eggs: 'eggs', fish: 'fish', shellfish: 'shellfish', nuts: 'nuts', soy: 'soy', sesame: 'sesame' },
      soldOut: 'Sold out', soldOutRow: 'Sold out right now — not included in the total',
      unavailableNotice: (n) => `Not available right now: ${n}. These items are not included in the total — remove them or ask your waiter.`,
      priceNotice: (n) => `Price changed: ${n}. The total has been recalculated.`,
      listUpdated: 'The menu was updated — please check your list.',
      open: 'Open', closed: 'Closed', until: (x) => `until ${x}`,
      opensToday: (x) => `opens at ${x}`, opensTomorrow: (x) => `opens tomorrow at ${x}`,
      opensOn: (d, x) => `opens ${['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'][d]} at ${x}`,
      closedForNow: 'Temporarily closed',
      hours: 'Opening hours', daily: 'Daily', dayOff: 'closed', today: 'Today',
      tzNote: (tz) => `Times are shown in the restaurant's time zone (${tz}).`,
      days: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'],
      openMap: 'Open in Maps', call: 'Call',
      loading: 'Loading the menu…', loadError: "Couldn't load the menu", loadErrorHint: 'Check your connection and try again.', retry: 'Try again',
      emptyMenu: 'The menu is coming soon', emptyMenuHint: 'The restaurant is still filling in the menu. Please ask your waiter.',
      offline: 'No connection — showing the menu loaded earlier.',
    },
    ar: {
      // цифры привычные (0–9), как на ценниках и в часах работы
      langName: 'العربية', locale: 'ar-u-nu-latn', dir: 'rtl',
      menuWord: 'القائمة',
      search: 'ابحث في القائمة', clearSearch: 'مسح البحث',
      order: 'طلبي', total: 'المجموع', clear: 'مسح القائمة',
      nothing: 'لا توجد نتائج', nothingHint: 'جرّب كلمة أخرى أو تصفّح القائمة كاملة.', showAll: 'عرض القائمة كاملة',
      add: 'إضافة', remove: 'إزالة واحد', removeItem: 'إزالة',
      waiter: 'اعرض هذه القائمة على النادل ليأخذ طلبك.',
      orderEmpty: 'قائمتك فارغة. أضف الأطباق بزر الإضافة.',
      g: 'غ', ml: 'مل', kcal: 'سعرة', pcs: (n) => (n >= 3 && n <= 10 ? 'قطع' : 'قطعة'),
      table: 'طاولة',
      ingredients: 'المكونات', allergens: 'مسببات الحساسية',
      close: 'إغلاق', themeDark: 'المظهر الداكن', themeLight: 'المظهر الفاتح', language: 'اللغة',
      tags: { hit: 'الأكثر طلبًا', new: 'جديد', spicy: 'حار', veg: 'نباتي' },
      allergenNames: { gluten: 'غلوتين', milk: 'حليب', eggs: 'بيض', fish: 'سمك', shellfish: 'مأكولات بحرية', nuts: 'مكسرات', soy: 'صويا', sesame: 'سمسم' },
      soldOut: 'غير متوفر', soldOutRow: 'غير متوفر حاليًا — غير محسوب في المجموع',
      unavailableNotice: (n) => `غير متوفر حاليًا: ${n}. هذه الأصناف غير محسوبة في المجموع — أزلها أو اسأل النادل.`,
      priceNotice: (n) => `تغيّر السعر: ${n}. أُعيد حساب المجموع.`,
      listUpdated: 'تم تحديث القائمة — يرجى مراجعة طلبك.',
      open: 'مفتوح', closed: 'مغلق', until: (x) => `حتى ${x}`,
      opensToday: (x) => `يفتح الساعة ${x}`, opensTomorrow: (x) => `يفتح غدًا الساعة ${x}`,
      opensOn: (d, x) => `يفتح يوم ${['الإثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت', 'الأحد'][d]} الساعة ${x}`,
      closedForNow: 'مغلق مؤقتًا',
      hours: 'ساعات العمل', daily: 'يوميًا', dayOff: 'عطلة', today: 'اليوم',
      tzNote: (tz) => `الأوقات حسب توقيت المطعم (${tz}).`,
      days: ['الإثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت', 'الأحد'],
      openMap: 'فتح في الخرائط', call: 'اتصال',
      loading: 'جارٍ تحميل القائمة…', loadError: 'تعذّر تحميل القائمة', loadErrorHint: 'تحقّق من الاتصال وحاول مرة أخرى.', retry: 'إعادة المحاولة',
      emptyMenu: 'القائمة قريبًا', emptyMenuHint: 'المطعم ما زال يُعدّ القائمة. يرجى سؤال النادل.',
      offline: 'لا يوجد اتصال — تُعرض القائمة المحمّلة سابقًا.',
    },
    ms: {
      langName: 'Bahasa Melayu', locale: 'ms-MY', dir: 'ltr',
      menuWord: 'Menu',
      search: 'Cari dalam menu', clearSearch: 'Kosongkan carian',
      order: 'Pesanan saya', total: 'Jumlah', clear: 'Kosongkan senarai',
      nothing: 'Tiada hasil', nothingHint: 'Cuba perkataan lain atau lihat menu penuh.', showAll: 'Tunjukkan menu penuh',
      add: 'Tambah', remove: 'Buang satu', removeItem: 'Buang',
      waiter: 'Tunjukkan senarai ini kepada pelayan untuk membuat pesanan.',
      orderEmpty: 'Senarai anda kosong. Tambah hidangan dengan butang tambah.',
      g: 'g', ml: 'ml', kcal: 'kcal', pcs: () => 'biji',
      table: 'Meja',
      ingredients: 'Bahan-bahan', allergens: 'Alergen',
      close: 'Tutup', themeDark: 'Tema gelap', themeLight: 'Tema cerah', language: 'Bahasa',
      tags: { hit: 'Popular', new: 'Baharu', spicy: 'Pedas', veg: 'Vegetarian' },
      allergenNames: { gluten: 'gluten', milk: 'susu', eggs: 'telur', fish: 'ikan', shellfish: 'kerang-kerangan', nuts: 'kacang', soy: 'soya', sesame: 'bijan' },
      soldOut: 'Habis', soldOutRow: 'Habis buat masa ini — tidak termasuk dalam jumlah',
      unavailableNotice: (n) => `Tiada buat masa ini: ${n}. Item ini tidak dikira dalam jumlah — buang atau tanya pelayan.`,
      priceNotice: (n) => `Harga berubah: ${n}. Jumlah telah dikira semula.`,
      listUpdated: 'Menu telah dikemas kini — sila semak senarai anda.',
      open: 'Buka', closed: 'Tutup', until: (x) => `hingga ${x}`,
      opensToday: (x) => `buka pada ${x}`, opensTomorrow: (x) => `buka esok pada ${x}`,
      opensOn: (d, x) => `buka hari ${['Isnin', 'Selasa', 'Rabu', 'Khamis', 'Jumaat', 'Sabtu', 'Ahad'][d]} pada ${x}`,
      closedForNow: 'Ditutup buat sementara',
      hours: 'Waktu operasi', daily: 'Setiap hari', dayOff: 'tutup', today: 'Hari ini',
      tzNote: (tz) => `Waktu mengikut zon waktu restoran (${tz}).`,
      days: ['Isnin', 'Selasa', 'Rabu', 'Khamis', 'Jumaat', 'Sabtu', 'Ahad'],
      openMap: 'Buka dalam Peta', call: 'Hubungi',
      loading: 'Memuatkan menu…', loadError: 'Menu gagal dimuatkan', loadErrorHint: 'Semak sambungan dan cuba lagi.', retry: 'Cuba lagi',
      emptyMenu: 'Menu akan datang', emptyMenuHint: 'Restoran sedang menyediakan menu. Sila tanya pelayan.',
      offline: 'Tiada sambungan — menu yang dimuatkan sebelum ini dipaparkan.',
    },
  };

  // ---------- Источники данных ----------
  const BASE = window.MENU;                 // data.js — если сервер не подключён
  const SCH = window.MenuSchedule;
  const B = window.MENU_BACKEND || {};
  const ONLINE = !!(B.url && B.key);        // подключена база Supabase (config.js)
  const LANGS = BASE.languages.filter((l) => T[l]);

  const store = {
    get(k, d) { try { const v = localStorage.getItem('menu:' + k); return v == null ? d : JSON.parse(v); } catch { return d; } },
    set(k, v) { try { localStorage.setItem('menu:' + k, JSON.stringify(v)); } catch { /* приватный режим */ } },
  };

  const $ = (s) => document.querySelector(s);
  const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
  const norm = (s) => String(s || '').toLowerCase().replace(/ё/g, 'е');
  const icon = (id, cls = '') => `<svg class="ic ${cls}" aria-hidden="true"><use href="#i-${id}"/></svg>`;
  const nonEmpty = (o) => (o && typeof o === 'object' && Object.values(o).some((v) => String(v || '').trim()) ? o : null);

  // Единый вид меню, откуда бы оно ни пришло
  function fromBase(b) {
    const r = b.restaurant;
    return {
      restaurant: {
        name: r.name, tagline: r.tagline, logoUrl: r.logoUrl || null,
        currency: r.currency, currencyBefore: !!r.currencyBefore, timezone: r.timezone, schedule: r.schedule,
        address: nonEmpty(r.address), mapUrl: r.mapUrl || null, phone: r.phone || '', footer: nonEmpty(r.footer),
        defaultLanguage: b.defaultLanguage,
      },
      categories: b.categories.map((c) => ({ id: c.id, name: c.name })),
      dishes: b.dishes.filter((d) => !d.hidden).map((d) => ({
        id: d.id, category: d.category, name: d.name, desc: nonEmpty(d.desc), ingredients: nonEmpty(d.ingredients),
        price: Number(d.price), weight: d.weight ?? null, unit: d.unit || 'g', kcal: d.kcal ?? null, photo: d.photo || null,
        tags: d.tags || [], allergens: d.allergens || [], available: d.available !== false,
      })),
    };
  }

  function fromDb(st, cats, dishes) {
    const shown = cats.filter((c) => !c.hidden).sort((a, b) => a.sort - b.sort || a.id.localeCompare(b.id));
    const ids = new Set(shown.map((c) => c.id));
    return {
      restaurant: {
        name: st.name, tagline: nonEmpty(st.tagline), logoUrl: st.logo_url || null,
        currency: st.currency, currencyBefore: st.currency_before, timezone: st.timezone, schedule: st.schedule,
        address: nonEmpty(st.address), mapUrl: st.map_url || null, phone: st.phone || '', footer: nonEmpty(st.footer),
        defaultLanguage: st.default_language,
      },
      categories: shown.map((c) => ({ id: c.id, name: c.name })),
      dishes: dishes.filter((d) => !d.hidden && ids.has(d.category_id))
        .sort((a, b) => a.sort - b.sort || a.id.localeCompare(b.id))
        .map((d) => ({
          id: d.id, category: d.category_id, name: d.name, desc: nonEmpty(d.desc), ingredients: nonEmpty(d.ingredients),
          price: Number(d.price), weight: d.weight, unit: d.unit, kcal: d.kcal, photo: d.photo_url || null,
          tags: d.tags || [], allergens: d.allergens || [], available: d.available,
        })),
    };
  }

  // ---------- Состояние ----------
  let M = null;            // текущее меню
  let state = 'ready';     // ready | loading | error
  let stale = false;       // показываем сохранённое меню, потому что нет связи
  if (ONLINE) {
    const cached = store.get('cache', null);
    if (cached?.restaurant && Array.isArray(cached.dishes)) M = cached; else state = 'loading';
  } else {
    M = fromBase(BASE);
  }
  let byId = {};
  const index = () => { byId = Object.fromEntries((M?.dishes || []).map((d) => [d.id, d])); };
  index();

  // Язык: выбранный гостем → язык телефона → язык ресторана по умолчанию
  let lang = store.get('lang', null);
  if (!LANGS.includes(lang)) {
    const phone = (navigator.languages || [navigator.language || '']).map((l) => String(l).slice(0, 2).toLowerCase());
    const def = M?.restaurant.defaultLanguage || BASE.defaultLanguage;
    lang = phone.find((l) => LANGS.includes(l)) || (LANGS.includes(def) ? def : LANGS[0]);
  }

  // Список гостя: { id: количество }. Хранится на телефоне, никуда не отправляется.
  let order = store.get('order', {});
  if (!order || typeof order !== 'object' || Array.isArray(order)) order = {};
  for (const id of Object.keys(order)) if (!(order[id] > 0 && order[id] <= 99)) delete order[id];
  // Что гость видел: цена и название на момент добавления — чтобы предупредить об изменениях
  let seen = store.get('seen', {});
  if (!seen || typeof seen !== 'object') seen = {};
  let priceChanges = [];   // [{ id, from, to }]
  let attention = false;   // в списке что-то изменилось, гость ещё не открыл его

  // Номер стола из QR (?table=5). Помним 6 часов, чтобы он не пропал при обновлении.
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
  let sheet = null;        // { type: 'dish', id } | { type: 'order' } | { type: 'lang' } | { type: 'hours' }
  let lastFocus = null;
  let activeCat = null;
  let spyLockUntil = 0;

  // ---------- Помощники ----------
  const t = (k) => T[lang][k];
  const L = (o) => (o == null ? '' : typeof o === 'string' ? o : o[lang] || o.en || o.ru || Object.values(o).find(Boolean) || '');
  const R = () => M.restaurant;
  const money = (n) => {
    const v = Math.round(Number(n) * 100) / 100;
    const num = new Intl.NumberFormat(t('locale'), { minimumFractionDigits: Number.isInteger(v) ? 0 : 2, maximumFractionDigits: 2 }).format(v);
    return R().currencyBefore ? `${R().currency} ${num}` : `${num} ${R().currency}`;
  };
  const amount = (d) => {
    if (!d.weight) return '';
    const unit = d.unit === 'pcs' ? t('pcs')(d.weight) : t(d.unit === 'ml' ? 'ml' : 'g');
    return `${d.weight} ${unit}`;
  };
  const clock = (hhmm) => {
    const m = SCH.mins(hhmm);
    const h = Math.floor(m / 60) % 24;
    const mm = m % 60;
    if (lang !== 'en') return `${String(h).padStart(2, '0')}:${String(mm).padStart(2, '0')}`;
    return `${h % 12 || 12}${mm ? ':' + String(mm).padStart(2, '0') : ''} ${h < 12 ? 'AM' : 'PM'}`;
  };
  const orderable = (d) => !!d && d.available;
  const smooth = () => (matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth');
  const itemName = (id) => L(byId[id]?.name) || L(seen[id]?.name) || '…';

  function matches(d) {
    if (!query) return true;
    const hay = norm(LANGS.map((l) => `${d.name?.[l] || ''} ${d.desc?.[l] || ''}`).join(' '));
    return query.split(/\s+/).every((w) => hay.includes(w));
  }

  // ---------- Часы работы ----------
  function statusInfo() {
    const st = SCH.status(R().schedule, R().timezone);
    if (st.never) return { open: false, text: t('closedForNow') };
    if (st.open) return { open: true, text: `${t('open')} · ${t('until')(clock(st.closesAt))}` };
    const at = clock(st.opensAt);
    const when = st.opensIn === 0 ? t('opensToday')(at) : st.opensIn === 1 ? t('opensTomorrow')(at) : t('opensOn')(st.opensDay, at);
    return { open: false, text: `${t('closed')} · ${when}` };
  }
  function hoursLine() {
    const s = R().schedule;
    if (!Array.isArray(s) || s.length !== 7) return '';
    const g = SCH.groups(s);
    if (g.length === 1 && !g[0].closed) return `${t('daily')} ${clock(g[0].open)}–${clock(g[0].close)}`;
    const today = s[SCH.localNow(R().timezone, new Date()).day];
    return `${t('today')}: ${today.closed ? t('dayOff') : `${clock(today.open)}–${clock(today.close)}`}`;
  }

  // ---------- Шапка ----------
  function monogram(name) {
    const words = String(name || '').split(/\s+/).filter((w) => /\p{L}/u.test(w));
    return (words.slice(0, 2).map((w) => w.match(/\p{L}/u)[0]).join('') || 'R').toUpperCase();
  }

  function renderHeader() {
    document.documentElement.lang = lang;
    document.documentElement.dir = t('dir');
    $('#search').placeholder = t('search');
    $('#search-clear').setAttribute('aria-label', t('clearSearch'));
    $('#sheet-close').setAttribute('aria-label', t('close'));
    const langBtn = $('#lang-btn');
    langBtn.hidden = LANGS.length < 2;
    langBtn.innerHTML = `${icon('globe')}<span>${esc(lang.toUpperCase())}</span>`;
    langBtn.setAttribute('aria-label', `${t('language')}: ${t('langName')}`);
    const dark = document.documentElement.dataset.theme === 'dark';
    const themeBtn = $('#theme-btn');
    themeBtn.innerHTML = icon(dark ? 'sun' : 'moon');
    themeBtn.setAttribute('aria-label', dark ? t('themeLight') : t('themeDark'));

    if (!M) {
      document.title = t('menuWord');
      $('#r-name').textContent = '';
      $('#r-tagline').textContent = '';
      $('#logo').innerHTML = '';
      $('#r-info').innerHTML = '';
      $('#foot').textContent = '';
      return;
    }
    const r = R();
    document.title = `${r.name} — ${t('menuWord')}`;
    $('#r-name').textContent = r.name;
    $('#r-tagline').textContent = L(r.tagline);
    $('#logo').innerHTML = r.logoUrl ? `<img src="${esc(r.logoUrl)}" alt="">` : esc(monogram(r.name));

    const st = statusInfo();
    const badges = [];
    if (table) badges.push(`<span class="badge">${icon('table', 'sm')}${esc(t('table'))} ${esc(table)}</span>`);
    badges.push(`<span class="badge ${st.open ? 'ok' : 'off'}"><span class="dot"></span>${esc(st.text)}</span>`);

    const links = [];
    const hl = hoursLine();
    if (hl) {
      links.push(`<button type="button" class="info-link" data-sheet="hours">${icon('clock')}
        <span class="grow"><bdi>${esc(hl)}</bdi></span>${icon('chevron', 'chev')}</button>`);
    }
    const addr = L(r.address);
    if (addr) {
      const q = r.address?.en || r.address?.ms || addr;
      const href = r.mapUrl || `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${r.name}, ${q}`)}`;
      links.push(`<a class="info-link" href="${esc(href)}" target="_blank" rel="noopener" aria-label="${esc(`${t('openMap')}: ${addr}`)}">${icon('pin')}
        <span class="grow">${esc(addr)}</span>${icon('chevron', 'chev')}</a>`);
    }
    if (r.phone) {
      links.push(`<a class="info-link" href="tel:${esc(r.phone.replace(/[^\d+]/g, ''))}" aria-label="${esc(`${t('call')}: ${r.phone}`)}">${icon('phone')}
        <span class="grow"><bdi dir="ltr">${esc(r.phone)}</bdi></span>${icon('chevron', 'chev')}</a>`);
    }
    $('#r-info').innerHTML = `<div class="info-row">${badges.join('')}</div>${links.length ? `<div class="info-grid">${links.join('')}</div>` : ''}`;
    $('#foot').textContent = L(r.footer);
  }

  // ---------- Карточки ----------
  function photo(d, cls = '', flag = false) {
    const img = d?.photo
      ? `<img src="${esc(d.photo)}" alt="${esc(L(d.name))}" loading="lazy" decoding="async" width="800" height="600">`
      : icon('dish');
    const sold = flag && d && !d.available ? `<span class="sold-flag">${esc(t('soldOut'))}</span>` : '';
    return `<div class="photo ${cls}${d?.photo ? ' has-img' : ''}">${img}${sold}</div>`;
  }

  function tagsHtml(d) {
    if (!d.tags?.length) return '';
    return `<div class="tags">${d.tags.map((k) => `<span class="tag tag-${esc(k)}">${esc(t('tags')[k] || k)}</span>`).join('')}</div>`;
  }

  function control(id) {
    if (!orderable(byId[id])) return `<span class="sold">${esc(t('soldOut'))}</span>`;
    const n = order[id] || 0;
    const plus = `<button type="button" data-act="inc" data-id="${esc(id)}" aria-label="${esc(`${t('add')}: ${itemName(id)}`)}">${icon('plus')}</button>`;
    if (!n) return plus.replace('<button', '<button class="add"');
    return `<div class="stepper"><button type="button" data-act="dec" data-id="${esc(id)}" aria-label="${esc(`${t('remove')}: ${itemName(id)}`)}">${icon('minus')}</button><span aria-live="polite">${n}</span>${plus}</div>`;
  }

  function card(d) {
    const desc = L(d.desc);
    return `
      <article class="card${d.available ? '' : ' is-sold'}" data-open="${esc(d.id)}" tabindex="0" role="button" aria-label="${esc(L(d.name))}">
        ${photo(d, '', true)}
        <div class="card-body">
          ${tagsHtml(d)}
          <h3>${esc(L(d.name))}</h3>
          ${desc ? `<p class="desc">${esc(desc)}</p>` : '<p class="desc"></p>'}
          <div class="card-foot">
            <div class="price-wrap"><span class="price">${money(d.price)}</span><span class="amount">${esc(amount(d))}</span></div>
            <div class="slot" data-slot="${esc(d.id)}">${control(d.id)}</div>
          </div>
        </div>
      </article>`;
  }

  function renderMenu() {
    const main = $('#menu');
    const cats = $('#cats');
    if (state === 'loading' && !M) {
      cats.innerHTML = '';
      main.innerHTML = `<p class="sr-only" role="status">${esc(t('loading'))}</p>
        ${[0, 1].map(() => `<div class="skel-title"></div><div class="grid">${'<div class="skel"></div>'.repeat(3)}</div>`).join('')}`;
      return;
    }
    if (state === 'error' && !M) {
      cats.innerHTML = '';
      main.innerHTML = `<div class="state" role="alert">${icon('alert')}<h2>${esc(t('loadError'))}</h2>
        <p>${esc(t('loadErrorHint'))}</p><button type="button" class="btn" data-act="retry">${icon('refresh')}${esc(t('retry'))}</button></div>`;
      return;
    }

    const groups = M.categories
      .map((c) => ({ c, items: M.dishes.filter((d) => d.category === c.id && matches(d)) }))
      .filter((g) => g.items.length);

    cats.innerHTML = groups.map(({ c }) => `<button type="button" class="chip" data-cat="${esc(c.id)}">${esc(L(c.name))}</button>`).join('');

    const offline = stale ? `<p class="notice info" role="status">${icon('alert')}<span>${esc(t('offline'))}</span></p>` : '';
    if (!M.dishes.length) {
      main.innerHTML = `${offline}<div class="state">${icon('dish')}<h2>${esc(t('emptyMenu'))}</h2><p>${esc(t('emptyMenuHint'))}</p></div>`;
    } else if (!groups.length) {
      main.innerHTML = `${offline}<div class="state">${icon('search')}<h2>${esc(t('nothing'))}</h2>
        <p>${esc(t('nothingHint'))}</p><button type="button" class="btn ghost" data-act="show-all">${esc(t('showAll'))}</button></div>`;
    } else {
      main.innerHTML = offline + groups.map(({ c, items }) => `
        <section class="cat" id="cat-${esc(c.id)}" data-cat="${esc(c.id)}" aria-labelledby="h-${esc(c.id)}">
          <div class="cat-title"><h2 id="h-${esc(c.id)}">${esc(L(c.name))}</h2><span>${items.length}</span></div>
          <div class="grid">${items.map(card).join('')}</div>
        </section>`).join('');
    }
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
    if (window.innerHeight + window.scrollY >= document.documentElement.scrollHeight - 4 && window.scrollY > 0) {
      cur = sections[sections.length - 1].dataset.cat;
    }
    if (cur !== activeCat) setActive(cur);
  }
  let ticking = false;
  window.addEventListener('scroll', () => {
    if (ticking) return;
    ticking = true;
    requestAnimationFrame(() => { ticking = false; onScroll(); });
  }, { passive: true });

  // ---------- Список гостя ----------
  const lines = () => Object.entries(order).map(([id, n]) => ({ id, n, d: byId[id], ok: orderable(byId[id]) }));
  function totals() {
    let count = 0;
    let sum = 0;
    let gone = 0;
    for (const l of lines()) {
      count += l.n;
      if (l.ok) sum += l.d.price * l.n; else gone += 1;
    }
    return { count, sum, gone };
  }

  function renderBar() {
    const bar = $('#order-bar');
    if (!M) { bar.hidden = true; document.body.classList.remove('has-bar'); return; }
    const { count, sum } = totals();
    bar.hidden = count === 0;
    bar.innerHTML = `<span class="bar-left"><span class="count">${count}</span>${esc(t('order'))}${attention ? '<span class="warn-dot" aria-hidden="true"></span>' : ''}</span><span class="bar-sum">${money(sum)}</span>`;
    bar.setAttribute('aria-label', `${t('order')}: ${count}, ${t('total')} ${money(sum)}`);
    document.body.classList.toggle('has-bar', count > 0);
  }

  function remember(id) {
    const d = byId[id];
    if (d) seen[id] = { price: d.price, name: d.name };
    store.set('seen', seen);
  }

  function refreshSlots() {
    document.querySelectorAll('[data-slot]').forEach((el) => { el.innerHTML = control(el.dataset.slot); });
  }

  function change(id, delta) {
    if (delta > 0 && !orderable(byId[id])) return;
    const n = Math.min(99, Math.max(0, (order[id] || 0) + delta));
    if (n) { order[id] = n; remember(id); } else { delete order[id]; delete seen[id]; store.set('seen', seen); }
    priceChanges = priceChanges.filter((p) => order[p.id]);
    store.set('order', order);
    refreshSlots();
    renderBar();
    if (sheet?.type === 'order') renderSheet();
  }

  function orderSheetHtml() {
    const ls = lines();
    const out = [`<h2 class="sheet-title" id="sheet-title">${esc(t('order'))}</h2>`];
    if (table) out.push(`<span class="table-tag">${icon('table')}${esc(t('table'))} ${esc(table)}</span>`);
    if (!ls.length) {
      out.push(`<div class="state">${icon('list')}<p>${esc(t('orderEmpty'))}</p></div>`);
      return out.join('');
    }
    out.push(`<p class="waiter-card">${icon('list')}<span>${esc(t('waiter'))}</span></p>`);
    const gone = ls.filter((l) => !l.ok);
    if (gone.length) out.push(`<p class="notice bad" role="alert">${icon('alert')}<span>${esc(t('unavailableNotice')(gone.map((l) => itemName(l.id)).join(', ')))}</span></p>`);
    if (priceChanges.length) {
      const txt = priceChanges.map((p) => `${itemName(p.id)} ${money(p.from)} → ${money(p.to)}`).join('; ');
      out.push(`<p class="notice" role="status">${icon('alert')}<span>${esc(t('priceNotice')(txt))}</span></p>`);
    }
    out.push(`<ul class="order-list">${ls.map(({ id, n, d, ok }) => `
      <li class="${ok ? '' : 'gone'}">
        ${photo(d)}
        <span class="o-name"><b>${esc(itemName(id))}</b><small>${ok ? `${money(d.price)} × ${n}` : esc(t('soldOutRow'))}</small></span>
        <span class="o-sum">${ok ? money(d.price * n) : ''}</span>
        <div class="o-ctl">${ok ? control(id) : '<span></span>'}
          <button type="button" class="o-remove" data-act="del" data-id="${esc(id)}">${icon('trash', 'sm')}${esc(t('removeItem'))}</button></div>
      </li>`).join('')}</ul>`);
    out.push(`<div class="order-total"><span>${esc(t('total'))}</span><strong>${money(totals().sum)}</strong></div>`);
    out.push(`<button type="button" class="btn ghost block" data-act="clear">${icon('trash', 'sm')}${esc(t('clear'))}</button>`);
    return out.join('');
  }

  // ---------- Шторка ----------
  function renderSheet() {
    if (!sheet || !M) return;
    const body = $('#sheet-body');

    if (sheet.type === 'lang') {
      body.innerHTML = `<h2 class="sheet-title" id="sheet-title">${esc(t('language'))}</h2>
        <ul class="lang-list">${LANGS.map((l) => `<li><button type="button" class="lang-opt${l === lang ? ' on' : ''}" data-lang="${esc(l)}" dir="ltr" aria-pressed="${l === lang}">
          <span lang="${esc(l)}">${esc(T[l].langName)}</span><span class="lang-code">${l === lang ? icon('check') : esc(l.toUpperCase())}</span></button></li>`).join('')}</ul>`;
      return;
    }

    if (sheet.type === 'hours') {
      const s = R().schedule;
      const today = SCH.localNow(R().timezone, new Date()).day;
      const st = statusInfo();
      const city = String(R().timezone || '').split('/').pop().replace(/_/g, ' ');
      body.innerHTML = `<h2 class="sheet-title" id="sheet-title">${esc(t('hours'))}</h2>
        <span class="badge ${st.open ? 'ok' : 'off'}"><span class="dot"></span>${esc(st.text)}</span>
        <ul class="hours-list">${s.map((d, i) => `<li class="${i === today ? 'today' : ''}">
          <span>${esc(t('days')[i])}${i === today ? ` · ${esc(t('today'))}` : ''}</span>
          ${d.closed ? `<span class="off">${esc(t('dayOff'))}</span>` : `<bdi dir="ltr">${esc(clock(d.open))}–${esc(clock(d.close))}</bdi>`}</li>`).join('')}</ul>
        ${city ? `<p class="hint-small" style="margin-top:12px;color:var(--muted);font-size:13px">${esc(t('tzNote')(city))}</p>` : ''}`;
      return;
    }

    if (sheet.type === 'dish') {
      const d = byId[sheet.id];
      if (!d) { closeSheet(); return; }
      const meta = [amount(d), d.kcal ? `${d.kcal} ${t('kcal')}` : ''].filter(Boolean).join(' · ');
      const allergens = (d.allergens || []).map((a) => t('allergenNames')[a] || a).join(', ');
      body.innerHTML = `
        ${photo(d, 'big', true)}
        ${tagsHtml(d)}
        <h2 class="sheet-title" id="sheet-title">${esc(L(d.name))}</h2>
        ${L(d.desc) ? `<p class="sheet-desc">${esc(L(d.desc))}</p>` : ''}
        ${d.available ? '' : `<p class="notice bad">${icon('alert')}<span>${esc(t('soldOut'))}</span></p>`}
        ${L(d.ingredients) ? `<h4>${esc(t('ingredients'))}</h4><p>${esc(L(d.ingredients))}</p>` : ''}
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
    if (next.type === 'order') {
      attention = false;
      renderBar();
      $('#toast').classList.remove('show'); // то же самое уже написано в списке
    }
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
    if (sheet.type === 'order') priceChanges = [];
    sheet = null;
    const el = $('#sheet');
    const bd = $('#backdrop');
    el.classList.remove('open');
    bd.classList.remove('open');
    document.body.classList.remove('locked');
    setTimeout(() => { if (!sheet) { el.hidden = true; bd.hidden = true; } }, 300);
    if (lastFocus && document.contains(lastFocus)) lastFocus.focus({ preventScroll: true });
  }

  let toastTimer = null;
  function toast(msg, kind = '') {
    const el = $('#toast');
    el.textContent = msg;
    el.className = `toast ${kind} show`;
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => { el.className = `toast ${kind}`; }, 4200);
  }

  // ---------- Загрузка меню из базы ----------
  async function rest(path) {
    const headers = { apikey: B.key };
    if (String(B.key).startsWith('eyJ')) headers.Authorization = 'Bearer ' + B.key; // старый формат ключа
    const ctl = new AbortController();
    const timer = setTimeout(() => ctl.abort(), 15000); // медленная сеть: не ждём вечно
    try {
      const res = await fetch(`${String(B.url).replace(/\/+$/, '')}/rest/v1/${path}`, { headers, signal: ctl.signal });
      if (!res.ok) throw new Error(`http_${res.status}`);
      return await res.json();
    } finally {
      clearTimeout(timer);
    }
  }

  let loading = null;
  function refreshMenu() {
    if (!ONLINE) return Promise.resolve();
    if (loading) return loading;
    loading = (async () => {
      try {
        const [st, cats, dishes] = await Promise.all([
          rest('settings?select=*&id=eq.1'),
          rest('categories?select=*'),
          rest('dishes?select=*'),
        ]);
        if (!st[0]) throw new Error('no_settings');
        stale = false;
        applyMenu(fromDb(st[0], cats, dishes));
      } catch {
        if (M) { if (!stale) { stale = true; renderMenu(); } } else { state = 'error'; renderAll(); }
      } finally {
        loading = null;
      }
    })();
    return loading;
  }

  // Новое меню: сравниваем со списком гостя — что пропало, что подорожало.
  function applyMenu(next) {
    const first = !M;
    const goneBefore = new Set(lines().filter((l) => !l.ok).map((l) => l.id));
    const sameMenu = JSON.stringify(M) === JSON.stringify(next);
    M = next;
    state = 'ready';
    index();
    store.set('cache', M);

    let changed = false;
    for (const { id, d, ok } of lines()) {
      if (!ok && !goneBefore.has(id)) changed = true;
      if (ok && seen[id] && Number(seen[id].price) !== d.price) {
        priceChanges = priceChanges.filter((p) => p.id !== id).concat({ id, from: Number(seen[id].price), to: d.price });
        changed = true;
      }
      if (d) seen[id] = { price: d.price, name: d.name };
    }
    store.set('seen', seen);
    if (changed && !first) {
      attention = sheet?.type !== 'order';
      toast(t('listUpdated'));
    }
    if (!sameMenu || changed || first) renderAll();
  }

  // ---------- Тема ----------
  const media = matchMedia('(prefers-color-scheme: dark)');
  let theme = store.get('theme', null);
  function applyTheme() {
    const th = theme || (media.matches ? 'dark' : 'light');
    document.documentElement.dataset.theme = th;
    document.querySelector('meta[name="theme-color"]').setAttribute('content', th === 'dark' ? '#1B1611' : '#FAF5EC');
    renderHeader();
  }
  media.addEventListener?.('change', applyTheme);

  // ---------- События ----------
  document.addEventListener('click', (e) => {
    const act = e.target.closest('[data-act]');
    if (act) {
      const a = act.dataset.act;
      if (a === 'inc') change(act.dataset.id, 1);
      else if (a === 'dec') change(act.dataset.id, -1);
      else if (a === 'del') change(act.dataset.id, -(order[act.dataset.id] || 0));
      else if (a === 'clear') {
        order = {};
        seen = {};
        priceChanges = [];
        store.set('order', order);
        store.set('seen', seen);
        refreshSlots();
        renderBar();
        renderSheet();
      } else if (a === 'retry') {
        state = 'loading';
        renderMenu();
        refreshMenu();
      } else if (a === 'show-all') {
        $('#search').value = '';
        query = '';
        $('#search-clear').hidden = true;
        renderMenu();
      }
      return;
    }

    const sh = e.target.closest('[data-sheet]');
    if (sh) { openSheet({ type: sh.dataset.sheet }); return; }

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
        spyLockUntil = Date.now() + 900;
        sec.scrollIntoView({ behavior: smooth(), block: 'start' });
      }
      return;
    }

    const open = e.target.closest('[data-open]');
    if (open) openSheet({ type: 'dish', id: open.dataset.open });
  });

  // фото не загрузилось — показываем аккуратную заглушку
  document.addEventListener('error', (e) => {
    const img = e.target;
    if (img.tagName !== 'IMG') return;
    const box = img.closest('.photo, .logo');
    if (!box) return;
    img.remove();
    if (box.classList.contains('logo')) { box.textContent = monogram(M?.restaurant.name); return; }
    box.classList.remove('has-img');
    box.insertAdjacentHTML('afterbegin', icon('dish'));
  }, true);

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
  $('#search').addEventListener('input', (e) => {
    query = norm(e.target.value.trim());
    $('#search-clear').hidden = !query;
    renderMenu();
  });
  $('#search-clear').addEventListener('click', () => {
    $('#search').value = '';
    query = '';
    $('#search-clear').hidden = true;
    renderMenu();
    $('#search').focus();
  });
  $('#lang-btn').addEventListener('click', () => openSheet({ type: 'lang' }));
  $('#theme-btn').addEventListener('click', () => {
    theme = document.documentElement.dataset.theme === 'dark' ? 'light' : 'dark';
    store.set('theme', theme);
    applyTheme();
  });

  function renderAll() {
    renderHeader();
    renderMenu();
    renderBar();
    renderSheet();
  }

  applyTheme();
  renderAll();
  setInterval(() => { if (M) renderHeader(); }, 60 * 1000); // «Открыто / Закрыто» обновляется само
  if (ONLINE) {
    refreshMenu();
    setInterval(() => { if (!document.hidden) refreshMenu(); }, 60 * 1000);
    document.addEventListener('visibilitychange', () => { if (!document.hidden) refreshMenu(); });
    window.addEventListener('online', () => refreshMenu());
  }
})();

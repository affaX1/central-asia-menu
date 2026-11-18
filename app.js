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
  // Язык: что гость выбрал сам → язык его телефона → первый из списка.
  const LANGS = M.languages.filter((l) => T[l]);
  let lang = store.get('lang', null);
  if (!LANGS.includes(lang)) {
    const phone = (navigator.languages || [navigator.language || '']).map((l) => String(l).slice(0, 2).toLowerCase());
    lang = phone.find((l) => LANGS.includes(l)) || LANGS[0];
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

  function renderBar() {
    const { count, sum } = totals();
    const bar = $('#order-bar');
    bar.hidden = count === 0;
    bar.innerHTML = `<span class="bar-left"><span class="badge">${count}</span>${esc(t('order'))}</span><span class="bar-sum">${money(sum)}</span>`;
    document.body.classList.toggle('has-bar', count > 0);
  }

  function refreshSlots() {
    document.querySelectorAll('[data-slot]').forEach((el) => { el.innerHTML = control(el.dataset.slot); });
  }

  function change(id, delta) {
    if (!byId[id]) return;
    const n = Math.max(0, qty(id) + delta);
    if (n) order[id] = n; else delete order[id];
    store.set('order', order);
    refreshSlots();
    renderBar();
    if (sheet?.type === 'order') renderSheet();
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

    const rows = Object.entries(order);
    if (!rows.length) {
      body.innerHTML = `<h2 class="sheet-title" id="sheet-title">${esc(t('order'))}</h2><p class="hint">${esc(t('orderEmpty'))}</p>`;
      return;
    }
    body.innerHTML = `
      <h2 class="sheet-title" id="sheet-title">${esc(t('order'))}</h2>
      ${table ? `<p class="table-big">${esc(t('table'))} ${esc(table)}</p>` : ''}
      <p class="hint">${esc(t('waiter'))}</p>
      <ul class="order-list">
        ${rows.map(([id, n]) => {
          const d = byId[id];
          return `<li>
            <span class="o-emoji" aria-hidden="true">${esc(d.emoji || '🍽️')}</span>
            <span class="o-name">${esc(L(d.name))}<small>${money(d.price)}</small></span>
            ${control(id)}
            <span class="o-sum">${money(d.price * n)}</span>
          </li>`;
        }).join('')}
      </ul>
      <div class="order-total"><span>${esc(t('total'))}</span><strong>${money(totals().sum)}</strong></div>
      <button type="button" class="ghost" data-act="clear">${esc(t('clear'))}</button>`;
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
})();

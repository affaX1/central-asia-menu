(() => {
  'use strict';

  // =====================================================================
  //  Панель владельца: меню, фото, наличие, данные ресторана, расписание,
  //  сотрудники и QR-коды. Сохранение проверяет база: менять может только владелец.
  // =====================================================================

  const S = window.Staff;
  const ruPlural = (n, one, few, many) => { const a = Math.abs(n) % 100, b = a % 10; return a > 10 && a < 20 ? many : b === 1 ? one : b >= 2 && b <= 4 ? few : many; };
  const { $, esc, icon, tr, money } = S;

  const LANGS = [['ru', 'Русский'], ['en', 'English'], ['uz', "O'zbekcha"], ['ar', 'العربية'], ['ms', 'Bahasa Melayu'], ['zh', '中文']];
  const TAGS = [['hit', 'Хит'], ['new', 'Новинка'], ['spicy', 'Острое'], ['veg', 'Без мяса']];
  const MEAT = [['beef', 'говядина'], ['lamb', 'баранина'], ['horse', 'конина'], ['chicken', 'курица'], ['fish', 'рыба'], ['seafood', 'морепродукты']];
  const ALLERGENS = [['gluten', 'глютен'], ['milk', 'молоко'], ['eggs', 'яйца'], ['fish', 'рыба'], ['shellfish', 'морепродукты'], ['nuts', 'орехи'], ['soy', 'соя'], ['sesame', 'кунжут']];
  const DAYS = ['Понедельник', 'Вторник', 'Среда', 'Четверг', 'Пятница', 'Суббота', 'Воскресенье'];
  const ZONES = ['Asia/Kuala_Lumpur', 'Asia/Singapore', 'Asia/Jakarta', 'Asia/Bangkok', 'Asia/Tashkent', 'Asia/Samarkand', 'Asia/Almaty',
    'Asia/Bishkek', 'Asia/Dushanbe', 'Asia/Ashgabat', 'Asia/Baku', 'Asia/Dubai', 'Asia/Riyadh', 'Europe/Istanbul', 'Europe/Moscow',
    'Europe/London', 'Europe/Berlin', 'America/New_York'];

  let api = null;
  let floor = null;
  let me = null;
  let cats = [];
  let dishes = [];
  let staff = [];
  let invites = [];
  let tab = 'menu';
  let q = '';
  let stop = null;
  let ordersTimer = null;

  const norm = (s) => String(s || '').toLowerCase().replace(/ё/g, 'е');
  const amount = (d) => (d.weight ? `${d.weight} ${S.unitLabel[d.unit] || ''}` : '');
  const sw = (attr, on, label, disabled = false) => `<label class="switch"><input type="checkbox" ${attr}${on ? ' checked' : ''}${disabled ? ' disabled' : ''}><span class="track"></span>${esc(label)}</label>`;
  // метки в списке меню: акция, блюдо дня, остаток порций
  const dishTags = (d) => {
    const t = [];
    if (d.promo_price != null) t.push(`<span class="state-badge no">Акция ${esc(money(d.promo_price))}${d.promo_from ? ` · ${esc(d.promo_from)}–${esc(d.promo_to)}` : ''}</span>`);
    if (d.featured) t.push('<span class="state-badge ok">Блюдо дня</span>');
    if (d.stock === 0) t.push('<span class="state-badge no">Закончилось</span>');
    else if (d.stock != null) t.push(`<span class="state-badge muted">Осталось ${esc(d.stock)}</span>`);
    return t.length ? `<span class="d-tags">${t.join('')}</span>` : '';
  };
  const photoBox = (url, cls = '') => `<div class="photo ${cls}${url ? ' has-img' : ''}">${url ? `<img src="${esc(url)}" alt="" loading="lazy" decoding="async">` : icon('dish')}</div>`;

  const TRANSLIT = { а: 'a', б: 'b', в: 'v', г: 'g', д: 'd', е: 'e', ё: 'e', ж: 'zh', з: 'z', и: 'i', й: 'y', к: 'k', л: 'l', м: 'm', н: 'n', о: 'o', п: 'p', р: 'r', с: 's', т: 't', у: 'u', ф: 'f', х: 'h', ц: 'ts', ч: 'ch', ш: 'sh', щ: 'sch', ъ: '', ы: 'y', ь: '', э: 'e', ю: 'yu', я: 'ya' };
  function slug(text, taken) {
    let s = String(text || '').toLowerCase().split('').map((c) => TRANSLIT[c] ?? c).join('')
      .replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 32);
    if (!s) s = 'item-' + Date.now().toString(36);
    let out = s;
    for (let i = 2; taken.has(out); i++) out = `${s}-${i}`;
    return out;
  }

  // ---------- переключение разделов ----------
  // менеджер (старший смены): зал, заказы, отчёты, закрытие дня. Меню, столы, настройки, сотрудники и журнал — только владелец.
  const MANAGER_TABS = ['floor', 'orders', 'stop', 'reports', 'day'];
  const allowedTabs = () => (me?.role === 'owner' ? ['floor', 'orders', 'stop', 'menu', 'tables', 'reports', 'day', 'audit', 'promos', 'restaurant', 'staff'] : MANAGER_TABS);
  function applyRole() {
    const mgr = me?.role !== 'owner';
    document.querySelectorAll('.a-tab').forEach((a) => { a.hidden = !allowedTabs().includes(a.dataset.tab); });
    const sub = document.querySelector('.a-brand h1, .a-brand b');
    if (mgr && sub && /владельца/.test(sub.textContent)) sub.textContent = sub.textContent.replace('владельца', 'менеджера');
  }
  function setTab(next) {
    const was = tab;
    tab = allowedTabs().includes(next) ? next : 'orders';
    if (was === 'stop' && tab !== 'stop') closeStop();
    document.querySelectorAll('.a-tab').forEach((a) => a.setAttribute('aria-current', a.dataset.tab === tab ? 'page' : 'false'));
    // на телефоне нижняя панель прокручивается — показываем открытый раздел
    const cur = document.querySelector(`.a-tab[data-tab="${tab}"]`); const bar = cur?.parentElement;
    if (bar && bar.scrollWidth > bar.clientWidth) bar.scrollLeft = cur.offsetLeft - (bar.clientWidth - cur.offsetWidth) / 2;
    render();
  }
  window.addEventListener('hashchange', () => { if (api) setTab(location.hash.slice(1)); });

  function render() {
    if (tab === 'floor') { if (floor) { floor.render($('#a-main')); paintGoal(); } else $('#a-main').innerHTML = '<p class="a-empty">Загрузка…</p>'; }
    else if (tab === 'stop') renderStop();
    else if (tab === 'reports') window.OwnerReports.reports($('#a-main'), { api, role: me?.role, dishes: () => dishes });
    else if (tab === 'day') window.OwnerReports.day($('#a-main'), { api });
    else if (tab === 'audit') window.OwnerReports.audit($('#a-main'), { api, dishes, cats });
    else if (tab === 'orders') renderOrders();
    else if (tab === 'menu') renderMenu();
    else if (tab === 'tables') renderTables();
    else if (tab === 'restaurant') renderRestaurant();
    else if (tab === 'promos') renderPromos();
    else renderStaff();
  }


  async function loadMenu() {
    [cats, dishes] = await Promise.all([api.categories(), api.dishes()]);
  }
  // себестоимость блюд — отдельная таблица, читает только владелец
  let costs = new Map();
  let costsLoaded = false;
  async function loadCosts() {
    try {
      costs = new Map((await api.dishCosts()).map((r) => [r.dish_id, Number(r.cost)]));
      costsLoaded = true;
    } catch { costsLoaded = false; }
  }

  // =================================================================
  //  ЦЕЛЬ ДНЯ — полоска вверху «Зала» (владелец и менеджер)
  // =================================================================
  // Сумма — оплаченные сегодня (с полуночи по часам устройства) счета без отменённых оплат, без чаевых.
  // Анимируем только от прошлого показанного значения: обновление раз в 15 секунд не начинает с нуля.
  let goalShown = null;      // сколько было на полоске в прошлый раз, в сенах
  let goalRaf = 0;
  const reducedMotion = () => window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
  const plainNum = (n) => new Intl.NumberFormat('ru-RU', { maximumFractionDigits: 2 }).format(n);
  function paintGoal() {
    const goal = Math.round(Number(S.settings?.day_goal || 0) * 100);
    const main = $('#a-main');
    if (!goal || !floor || !main) return;
    const since = dayStart().getTime();
    const cur = floor.bills.filter((b) => new Date(b.paid_at).getTime() >= since).reduce((s, b) => s + Math.round(Number(b.total) * 100), 0);
    const from = goalShown ?? 0;
    goalShown = cur;
    const share = (v) => Math.min(100, (v / goal) * 100);
    const done = cur >= goal;
    const text = (v) => (done
      ? `Цель дня выполнена: ${money(v / 100)} из ${plainNum(goal / 100)}`
      : `Сегодня ${money(v / 100)} из ${plainNum(goal / 100)}`);
    main.insertAdjacentHTML('afterbegin', `<section class="goal${done ? ' is-done' : ''}" id="day-goal">
      <div class="goal-top">${done ? icon('check', 'sm') : ''}<b class="goal-text">${esc(text(from))}</b>
        <span class="goal-left">${done ? `${Math.round((cur / goal) * 100)}%` : `осталось ${esc(money((goal - cur) / 100))}`}</span></div>
      <div class="goal-track" role="progressbar" aria-label="Цель дня" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${Math.round(share(cur))}" aria-valuetext="${esc(text(cur))}">
        <span class="goal-fill" style="width:${share(from).toFixed(2)}%"></span></div>
    </section>`);
    const box = $('#day-goal');
    const fill = box.querySelector('.goal-fill');
    const label = box.querySelector('.goal-text');
    cancelAnimationFrame(goalRaf);
    if (from === cur || reducedMotion()) { fill.style.width = `${share(cur).toFixed(2)}%`; label.textContent = text(cur); return; }
    // полоска едет через CSS-переход, число догоняет её тем же темпом
    requestAnimationFrame(() => requestAnimationFrame(() => { fill.style.width = `${share(cur).toFixed(2)}%`; }));
    const t0 = performance.now();
    const step = (now) => {
      const k = Math.min(1, (now - t0) / 900);
      const e = 1 - Math.pow(1 - k, 3);
      if (label.isConnected) label.textContent = text(Math.round(from + (cur - from) * e));
      if (k < 1 && label.isConnected) goalRaf = requestAnimationFrame(step);
    };
    goalRaf = requestAnimationFrame(step);
  }

  // =================================================================
  //  СТОП-ЛИСТ — общий модуль stop-list.js (владелец, менеджер, повар)
  // =================================================================
  let stopHandle = null;
  function closeStop() {
    const h = stopHandle;
    stopHandle = null;
    try { (h?.close || h?.destroy || h?.unmount)?.call(h); } catch { /* модуль уже закрыт */ }
  }
  function renderStop() {
    const main = $('#a-main');
    const SL = window.StopList;
    closeStop();
    if (!SL || typeof SL.open !== 'function') {
      main.innerHTML = `<div class="a-empty">${icon('ban')}<p>Стоп-лист не загрузился. Обновите страницу. Пока можно выключать блюда переключателем «В наличии» в разделе «Меню».</p></div>`;
      return;
    }
    try {
      // модуль сам берёт блюда и вешает обработчики на main; close() снимает их при уходе из раздела.
      // onChange — блюдо выключили или поменяли остаток: обновляем свой список, чтобы «Меню» показало то же самое
      stopHandle = SL.open(main, { api, onChange: () => { loadMenu().catch(() => {}); } }) || null;
    } catch (ex) {
      main.innerHTML = `<p class="notice bad">${icon('alert')}<span>Стоп-лист не открылся: ${esc(S.errText(ex))}</span></p>`;
    }
  }

  // =================================================================
  //  МЕНЮ
  // =================================================================
  function renderMenu() {
    const main = $('#a-main');
    const words = norm(q).split(/\s+/).filter(Boolean);
    const hit = (d) => !words.length || words.every((w) => norm(Object.values(d.name || {}).join(' ')).includes(w));
    const sorted = [...cats].sort((a, b) => a.sort - b.sort || a.id.localeCompare(b.id));
    const total = dishes.length;
    const off = dishes.filter((d) => !d.available).length;
    const keepFocus = document.activeElement?.id === 'o-search';

    main.innerHTML = `
      <div class="toolbar">
        <label class="search">${icon('search')}<input id="o-search" type="search" placeholder="Найти блюдо" value="${esc(q)}" autocomplete="off"></label>
        <button type="button" class="btn small" data-act="new-dish">${icon('plus', 'sm')}Блюдо</button>
        <button type="button" class="btn small ghost" data-act="new-cat">${icon('plus', 'sm')}Категория</button>
      </div>
      <p class="help">Всего блюд: ${total}. Нет в наличии: ${off}. Переключатель «В наличии» действует сразу — гости и официанты увидят изменение без перезагрузки.</p>
      ${sorted.length ? sorted.map((c, i) => {
        const items = dishes.filter((d) => d.category_id === c.id && hit(d)).sort((a, b) => a.sort - b.sort || a.id.localeCompare(b.id));
        if (words.length && !items.length) return '';
        return `<section class="panel">
          <div class="panel-head">
            <h3>${esc(tr(c.name))}<small>${items.length}</small>${c.avail_from ? `<span class="state-badge muted">${icon('clock', 'sm')}${esc(c.avail_from)}–${esc(c.avail_to)}</span>` : ''}${c.station === 'bar' ? '<span class="state-badge muted">готовит бар</span>' : ''}</h3>
            ${c.hidden ? '<span class="state-badge muted">скрыта от гостей</span>' : ''}
            <div class="row-btns">
              <button type="button" class="btn small ghost" data-act="cat-up" data-id="${esc(c.id)}" aria-label="Выше"${i === 0 ? ' disabled' : ''}>${icon('arrow-up', 'sm')}</button>
              <button type="button" class="btn small ghost" data-act="cat-down" data-id="${esc(c.id)}" aria-label="Ниже"${i === sorted.length - 1 ? ' disabled' : ''}>${icon('arrow-down', 'sm')}</button>
              <button type="button" class="btn small ghost" data-act="edit-cat" data-id="${esc(c.id)}">${icon('edit', 'sm')}Изменить</button>
            </div>
          </div>
          ${items.length ? `<ul class="rows">${items.map((d) => `
            <li class="${d.available && !d.hidden ? '' : 'is-off'}">
              ${photoBox(d.photo_url)}
              <div class="grow"><b>${esc(tr(d.name))}</b><small>${esc([amount(d), d.hidden ? 'скрыто от гостей' : '', d.photo_url ? '' : 'нет фото'].filter(Boolean).join(' · '))}</small>${dishTags(d)}</div>
              <span class="price">${money(d.price)}</span>
              <div class="row-btns">
                ${sw(`data-avail="${esc(d.id)}" aria-label="В наличии: ${esc(tr(d.name))}"`, d.available, 'В наличии')}
                ${sw(`data-shown="${esc(d.id)}" aria-label="Показывать гостям: ${esc(tr(d.name))}"`, !d.hidden, 'В меню')}
                <button type="button" class="btn small ghost" data-act="edit-dish" data-id="${esc(d.id)}">${icon('edit', 'sm')}Изменить</button>
              </div>
            </li>`).join('')}</ul>` : '<p class="a-empty" style="padding:18px">В этой категории пока нет блюд.</p>'}
        </section>`;
      }).join('') : '<div class="a-empty">Меню пустое. Начните с кнопки «Категория», потом добавьте блюда.</div>'}`;
    if (keepFocus) { const i = $('#o-search'); i.focus(); i.setSelectionRange(i.value.length, i.value.length); }
  }

  function langFields(prefix, values, { label, area = false, required = false, hint = '' }) {
    return `<fieldset class="lang-fields"><legend>${esc(label)}</legend>${hint ? `<p class="help" style="margin:6px 0 0">${esc(hint)}</p>` : ''}
      ${LANGS.map(([code, name]) => `<label class="field"><span>${esc(name)}${code === 'ru' && required ? ' <em>обязательно</em>' : ''}</span>
        ${area
          ? `<textarea name="${prefix}_${code}" rows="2" maxlength="400" ${code === 'ar' ? 'dir="rtl"' : ''}>${esc(values?.[code] || '')}</textarea>`
          : `<input name="${prefix}_${code}" type="text" maxlength="120" ${code === 'ar' ? 'dir="rtl"' : ''} value="${esc(values?.[code] || '')}"${code === 'ru' && required ? ' required' : ''}>`}
      </label>`).join('')}</fieldset>`;
  }
  const readLang = (f, prefix) => Object.fromEntries(LANGS.map(([c]) => [c, String(f.get(`${prefix}_${c}`) || '').trim()]).filter(([, v]) => v));

  // ---------- блюдо ----------
  function dishForm(d) {
    const isNew = !d;
    d = d || { category_id: cats[0]?.id, name: {}, desc: {}, ingredients: {}, price: '', unit: 'g', tags: [], allergens: [], available: true, hidden: false, sort: 0 };
    let newPhoto = null;        // Blob, если выбрали новое фото
    let removePhoto = false;
    const m = S.modal(`
      <form id="dish-form" novalidate>
        <h2 id="modal-title">${isNew ? 'Новое блюдо' : 'Блюдо'}</h2>
        <div class="photo-row">
          <div id="photo-preview">${photoBox(d.photo_url)}</div>
          <div class="btns">
            <span class="btn small ghost file-btn">${icon('upload', 'sm')}${d.photo_url ? 'Заменить фото' : 'Загрузить фото'}
              <input type="file" id="photo-file" accept="image/jpeg,image/png,image/webp" aria-label="Фото блюда"></span>
            <button type="button" class="btn small danger" id="photo-remove"${d.photo_url ? '' : ' hidden'}>${icon('trash', 'sm')}Убрать фото</button>
          </div>
        </div>
        <p class="help" style="margin-top:8px">Настоящее фото этого блюда, JPG/PNG/WebP. Мы обрежем его до 4:3 и сожмём для быстрой загрузки.</p>
        ${langFields('name', d.name, { label: 'Название', required: true, hint: 'Русский обязателен. Если другого языка нет — гость увидит английское или русское название.' })}
        <div class="form-grid">
          <label class="field full"><span>Категория</span><select name="category_id">${cats.map((c) => `<option value="${esc(c.id)}"${c.id === d.category_id ? ' selected' : ''}>${esc(tr(c.name))}</option>`).join('')}</select></label>
          <label class="field"><span>Цена, ${esc(S.settings?.currency || '')}</span><input name="price" type="number" inputmode="decimal" min="0" max="99999" step="0.01" required value="${esc(d.price)}"></label>
          <label class="field"><span>Калории (необязательно)</span><input name="kcal" type="number" inputmode="numeric" min="0" max="20000" step="1" value="${esc(d.kcal ?? '')}"></label>
          <label class="field"><span>Выход (вес/объём/штук)</span><input name="weight" type="number" inputmode="numeric" min="1" max="100000" step="1" value="${esc(d.weight ?? '')}"></label>
          <label class="field"><span>Единица</span><select name="unit">${[['g', 'граммы'], ['ml', 'миллилитры'], ['pcs', 'штуки']].map(([v, n]) => `<option value="${v}"${d.unit === v ? ' selected' : ''}>${n}</option>`).join('')}</select></label>
        </div>
        ${langFields('desc', d.desc, { label: 'Описание (необязательно)', area: true })}
        ${langFields('ingr', d.ingredients, { label: 'Основные ингредиенты (коротко, через запятую)', area: true, hint: 'Например: рис, морковь, нут. Показываются в карточке блюда рядом с видом мяса.' })}
        <p class="section-label">Вид мяса (гости видят его первым в составе)</p>
        <div class="checks">${MEAT.map(([v, n]) => `<label><input type="checkbox" name="meat" value="${v}"${d.meat?.includes(v) ? ' checked' : ''}>${n}</label>`).join('')}</div>
        <p class="section-label">Метки</p>
        <div class="checks">${TAGS.map(([v, n]) => `<label><input type="checkbox" name="tags" value="${v}"${d.tags?.includes(v) ? ' checked' : ''}>${n}</label>`).join('')}</div>
        <p class="section-label">Аллергены</p>
        <div class="checks">${ALLERGENS.map(([v, n]) => `<label><input type="checkbox" name="allergens" value="${v}"${d.allergens?.includes(v) ? ' checked' : ''}>${n}</label>`).join('')}</div>
        <div class="form-grid" style="margin-top:6px">
          <label class="field"><span>Время готовки, мин (необязательно)</span><input name="prep_min" type="number" min="1" max="240" step="1" inputmode="numeric" value="${esc(d.prep_min ?? '')}" placeholder="например 20"></label>
        </div>
        <p class="section-label">Акция (необязательно)</p>
        <p class="help" style="margin:0 0 8px">Цена по акции должна быть меньше обычной — гость увидит обычную цену зачёркнутой. Часы — «счастливые часы»: акция действует только в это время. Часы пустые — акция весь день.</p>
        <div class="form-grid">
          <label class="field full"><span>Цена по акции, ${esc(S.settings?.currency || '')}</span><input name="promo_price" type="number" inputmode="decimal" min="0" max="99999" step="0.01" value="${esc(d.promo_price ?? '')}" placeholder="пусто — без акции"></label>
          <label class="field"><span>Акция с</span><input name="promo_from" type="time" value="${esc(d.promo_from || '')}"></label>
          <label class="field"><span>Акция до</span><input name="promo_to" type="time" value="${esc(d.promo_to || '')}"></label>
        </div>
        <div class="checks"><label><input type="checkbox" name="featured"${d.featured ? ' checked' : ''}>Блюдо дня</label></div>
        <p class="help" style="margin:4px 0 0">«Блюдо дня» гости видят выделенным в меню. Снимите отметку, когда день прошёл.</p>
        <p class="section-label">Остаток и себестоимость (необязательно)</p>
        <div class="form-grid">
          <label class="field"><span>Осталось порций</span><input name="stock" type="number" inputmode="numeric" min="0" max="100000" step="1" value="${esc(d.stock ?? '')}" placeholder="не считать">
            <span class="hint">Пусто — не считать. Каждый заказ уменьшает число; на нуле блюдо заказать нельзя.</span></label>
          ${me?.role === 'owner' ? `<label class="field"><span>Себестоимость, ${esc(S.settings?.currency || '')}</span><input name="cost" type="number" inputmode="decimal" min="0" max="99999" step="0.01" value="${esc(isNew ? '' : costs.get(d.id) ?? '')}"${costsLoaded ? ' placeholder="не указана"' : ' disabled placeholder="не загрузилась — обновите страницу"'}>
            <span class="hint">Сколько стоят продукты на одну порцию. Видите только вы; нужна для отчёта «Прибыль по блюдам».</span></label>` : ''}
        </div>
        <p class="section-label">«С этим берут» (до 6 блюд, необязательно)</p>
        <p class="help" style="margin:0 0 8px">Гость увидит их в карточке блюда и в корзине. Если не выбрать — подберём сами по тому, что гости чаще заказывают вместе.</p>
        <div class="pairs-pick">${dishes.filter((x) => x.id !== d.id).map((x) => `<label><input type="checkbox" name="pairs" value="${esc(x.id)}"${(d.pairs || []).includes(x.id) ? ' checked' : ''}>${esc(tr(x.name))}</label>`).join('')}</div>
        <p class="section-label">Варианты блюда (необязательно)</p>
        <p class="help" style="margin:0 0 8px">Например: «Порция: целая / половина (−10)», «Острота: без / средне / остро», «Добавки: яйцо (+3)». Гость выберет их при заказе, цена посчитается сама. Названия — по-русски и по-английски (на других языках гость увидит английское).</p>
        <div id="opt-editor"></div>
        <button type="button" class="btn small soft" id="opt-add-group">${icon('plus', 'sm')}Добавить группу вариантов</button>
        <div class="form-grid" style="margin-top:14px">
          <div>${sw('name="available"', d.available, 'В наличии')}</div>
          <div>${sw('name="shown"', !d.hidden, 'Показывать гостям')}</div>
          <label class="field"><span>Порядок в категории</span><input name="sort" type="number" step="1" value="${esc(d.sort ?? 0)}"></label>
        </div>
        <p class="notice bad" id="dish-err" role="alert" hidden></p>
        <div class="modal-foot">
          <button type="submit" class="btn">${icon('check', 'sm')}Сохранить</button>
          <button type="button" class="btn ghost" data-modal-close>Отмена</button>
          ${isNew ? '' : `<button type="button" class="btn danger" id="dish-delete">${icon('trash', 'sm')}Удалить</button>`}
        </div>
      </form>`);

    const err = (msg) => { const e = m.querySelector('#dish-err'); e.hidden = !msg; e.innerHTML = msg ? `${icon('alert')}<span>${esc(msg)}</span>` : ''; if (msg) e.scrollIntoView({ block: 'nearest' }); };

    // ---------- редактор вариантов ----------
    let groups = JSON.parse(JSON.stringify(d.options || []));
    const ed = m.querySelector('#opt-editor');
    const paintOpts = () => {
      ed.innerHTML = groups.map((g, gi) => `<fieldset class="opt-ed" data-gi="${gi}">
        <div class="form-grid">
          <label class="field"><span>Группа (рус.)</span><input data-o="g-ru" value="${esc(g.name?.ru || '')}" maxlength="40" placeholder="Порция"></label>
          <label class="field"><span>Группа (англ.)</span><input data-o="g-en" value="${esc(g.name?.en || '')}" maxlength="40" placeholder="Portion"></label>
        </div>
        <div class="checks"><label><input type="checkbox" data-o="g-req"${g.required ? ' checked' : ''}>Обязательно выбрать</label><label><input type="checkbox" data-o="g-multi"${g.multi ? ' checked' : ''}>Можно несколько</label></div>
        <ul class="opt-ed-list">${(g.choices || []).map((c, ci) => `<li data-ci="${ci}">
          <input data-o="c-ru" value="${esc(c.name?.ru || '')}" maxlength="40" placeholder="Вариант" aria-label="Вариант (рус.)">
          <input data-o="c-en" value="${esc(c.name?.en || '')}" maxlength="40" placeholder="English" aria-label="Вариант (англ.)">
          <input data-o="c-price" type="number" step="0.5" value="${esc(c.price ?? 0)}" aria-label="Доплата" title="Доплата к цене (минус — скидка)">
          <button type="button" class="btn small danger" data-o="c-del" aria-label="Убрать вариант">${icon('trash', 'sm')}</button></li>`).join('')}</ul>
        <div class="opt-ed-foot"><button type="button" class="btn small ghost" data-o="c-add">${icon('plus', 'sm')}Вариант</button><button type="button" class="btn small danger" data-o="g-del">Убрать группу</button></div>
      </fieldset>`).join('');
    };
    paintOpts();
    ed.addEventListener('input', (e) => {
      const o = e.target.dataset.o;
      const gi = e.target.closest('[data-gi]')?.dataset.gi;
      if (o == null || gi == null) return;
      const g = groups[gi];
      const ci = e.target.closest('[data-ci]')?.dataset.ci;
      if (o === 'g-ru') g.name = { ...g.name, ru: e.target.value };
      else if (o === 'g-en') g.name = { ...g.name, en: e.target.value };
      else if (o === 'c-ru') g.choices[ci].name = { ...g.choices[ci].name, ru: e.target.value };
      else if (o === 'c-en') g.choices[ci].name = { ...g.choices[ci].name, en: e.target.value };
      else if (o === 'c-price') g.choices[ci].price = e.target.value;
    });
    ed.addEventListener('change', (e) => {
      const o = e.target.dataset.o;
      const g = groups[e.target.closest('[data-gi]')?.dataset.gi];
      if (o === 'g-req') g.required = e.target.checked;
      else if (o === 'g-multi') g.multi = e.target.checked;
    });
    ed.addEventListener('click', (e) => {
      const b = e.target.closest('[data-o]');
      if (!b || b.tagName !== 'BUTTON') return;
      const gi = b.closest('[data-gi]').dataset.gi;
      if (b.dataset.o === 'c-add') { if (groups[gi].choices.length < 12) groups[gi].choices.push({ name: {}, price: 0 }); }
      else if (b.dataset.o === 'c-del') groups[gi].choices.splice(Number(b.closest('[data-ci]').dataset.ci), 1);
      else if (b.dataset.o === 'g-del') groups.splice(Number(gi), 1);
      paintOpts();
    });
    m.querySelector('#opt-add-group').addEventListener('click', () => {
      if (groups.length >= 6) return;
      groups.push({ name: {}, required: false, multi: false, choices: [{ name: {}, price: 0 }, { name: {}, price: 0 }] });
      paintOpts();
    });
    // проверка и стабильные коды: старые коды вариантов не меняются (на них ссылаются заказы)
    const readOptions = () => {
      const gIds = new Set(groups.map((g) => g.id).filter(Boolean));
      const out = [];
      for (const g of groups) {
        const gname = { ...(g.name || {}), ru: String(g.name?.ru || '').trim(), en: String(g.name?.en || '').trim() };
        const choices = (g.choices || []).filter((c) => String(c.name?.ru || c.name?.en || '').trim());
        if (!gname.ru && !gname.en && !choices.length) continue;
        if (!gname.ru && !gname.en) throw new Error('У группы вариантов нет названия.');
        if (!choices.length) throw new Error(`В группе «${gname.ru || gname.en}» нет ни одного варианта.`);
        const gid = g.id || slug(gname.en || gname.ru, gIds); gIds.add(gid);
        const cIds = new Set(choices.map((c) => c.id).filter(Boolean));
        out.push({ id: gid.slice(0, 30), name: gname, required: !!g.required, multi: !!g.multi,
          choices: choices.map((c) => {
            const price = Number(String(c.price ?? 0).replace(',', '.')) || 0;
            if (Math.abs(price) > 10000) throw new Error('Доплата варианта слишком большая.');
            const cid = c.id || slug(c.name?.en || c.name?.ru, cIds); cIds.add(cid);
            return { id: cid.slice(0, 30), name: { ...(c.name || {}), ru: String(c.name?.ru || '').trim(), en: String(c.name?.en || '').trim() }, price: Math.round(price * 100) / 100 };
          }) });
      }
      return out;
    };

    m.querySelector('#photo-file').addEventListener('change', async (e) => {
      const file = e.target.files[0];
      if (!file) return;
      err('');
      try {
        newPhoto = await S.processImage(file, 1200, 900);
        removePhoto = false;
        const url = URL.createObjectURL(newPhoto);
        m.querySelector('#photo-preview').innerHTML = photoBox(url);
        m.querySelector('#photo-remove').hidden = false;
      } catch (ex) {
        err(ex.message);
      }
      e.target.value = '';
    });
    m.querySelector('#photo-remove').addEventListener('click', () => {
      newPhoto = null;
      removePhoto = true;
      m.querySelector('#photo-preview').innerHTML = photoBox(null);
      m.querySelector('#photo-remove').hidden = true;
    });
    m.querySelector('#dish-delete')?.addEventListener('click', async () => {
      if (!await S.ask(`Удалить «${tr(d.name)}» насовсем? Если блюдо просто закончилось — лучше выключить «В наличии».`, { ok: 'Удалить' })) return;
      try {
        await api.deleteDish(d.id);
        if (d.photo_url) api.deleteImage(d.photo_url);
        dishes = dishes.filter((x) => x.id !== d.id);
        S.closeModal();
        S.toast('Блюдо удалено');
        render();
      } catch (ex) { err(S.errText(ex)); }
    });

    m.querySelector('#dish-form').addEventListener('submit', async (e) => {
      e.preventDefault();
      const f = new FormData(e.target);
      const name = readLang(f, 'name');
      const price = Number(String(f.get('price')).replace(',', '.'));
      const weight = f.get('weight') ? Number(f.get('weight')) : null;
      const kcal = f.get('kcal') !== '' ? Number(f.get('kcal')) : null;
      if (!name.ru) return err('Впишите название на русском.');
      if (f.get('price') === '' || !Number.isFinite(price) || price < 0 || price >= 100000) return err('Проверьте цену: число от 0 до 99 999.');
      if (weight !== null && !(Number.isInteger(weight) && weight >= 1 && weight <= 100000)) return err('Выход — целое число больше нуля.');
      if (kcal !== null && !(Number.isInteger(kcal) && kcal >= 0 && kcal <= 20000)) return err('Калории — целое число.');
      if (!f.get('category_id')) return err('Сначала создайте категорию.');
      let options;
      try { options = readOptions(); } catch (ex) { return err(ex.message); }
      const prepMin = f.get('prep_min') ? Number(f.get('prep_min')) : null;
      if (prepMin !== null && !(Number.isInteger(prepMin) && prepMin >= 1 && prepMin <= 240)) return err('Время готовки — от 1 до 240 минут.');
      const pairs = f.getAll('pairs');
      if (pairs.length > 6) return err('«С этим берут» — не больше 6 блюд.');
      // акция: цена меньше обычной; часы — оба или ни одного, и только вместе с ценой
      const promoRaw = String(f.get('promo_price') ?? '').trim().replace(',', '.');
      const promo = promoRaw === '' ? null : Number(promoRaw);
      if (promo !== null && !(Number.isFinite(promo) && promo >= 0)) return err('Цена по акции — число, например 12.50. Или оставьте пусто.');
      if (promo !== null && Math.round(promo * 100) >= Math.round(price * 100)) return err(`Цена по акции должна быть меньше обычной цены (${money(price)}).`);
      const pFrom = String(f.get('promo_from') || '').slice(0, 5);
      const pTo = String(f.get('promo_to') || '').slice(0, 5);
      if (!!pFrom !== !!pTo) return err('Часы акции: укажите оба времени — «с» и «до», или оставьте оба пустыми.');
      if (pFrom && pFrom === pTo) return err('Часы акции: время «с» и «до» совпадает.');
      if (pFrom && promo === null) return err('Часы акции работают только с ценой по акции — впишите цену или очистите часы.');
      const stockRaw = String(f.get('stock') ?? '').trim();
      const stock = stockRaw === '' ? null : Number(stockRaw);
      if (stock !== null && !(Number.isInteger(stock) && stock >= 0 && stock <= 100000)) return err('Осталось порций — целое число от 0 до 100 000, или пусто.');
      const costEl = e.target.querySelector('[name="cost"]');
      const costRaw = costEl && !costEl.disabled ? String(costEl.value).trim().replace(',', '.') : '';
      const cost = costRaw === '' ? null : Number(costRaw);
      if (cost !== null && !(Number.isFinite(cost) && cost >= 0 && cost < 100000)) return err('Себестоимость — число, например 4.20. Или оставьте пусто.');
      const costChanged = !!costEl && !costEl.disabled && (cost === null ? null : Math.round(cost * 100)) !== (costs.has(d.id) && !isNew ? Math.round(costs.get(d.id) * 100) : null);

      const btn = e.target.querySelector('[type="submit"]');
      btn.disabled = true;
      btn.textContent = newPhoto ? 'Загружаем фото…' : 'Сохраняем…';
      let uploaded = null;
      try {
        if (newPhoto) uploaded = await api.uploadImage(newPhoto, `dishes/${d.id || 'new'}`);
        const row = {
          id: d.id || slug(name.en || name.ru, new Set(dishes.map((x) => x.id))),
          category_id: f.get('category_id'),
          name,
          desc: readLang(f, 'desc'),
          ingredients: readLang(f, 'ingr'),
          price: Math.round(price * 100) / 100,
          weight, unit: f.get('unit'), kcal,
          tags: f.getAll('tags'), allergens: f.getAll('allergens'), meat: f.getAll('meat'), options, prep_min: prepMin, pairs,
          available: !!f.get('available'), hidden: !f.get('shown'),
          sort: Number(f.get('sort')) || 0,
          photo_url: uploaded || (removePhoto ? null : d.photo_url || null),
          promo_price: promo === null ? null : Math.round(promo * 100) / 100,
          promo_from: pFrom || null, promo_to: pTo || null,
          featured: !!f.get('featured'),
        };
        // остаток уменьшают заказы, пока форма открыта: пишем его, только если владелец сам поменял число
        if (isNew || stock !== (d.stock ?? null)) row.stock = stock;
        const saved = await api.saveDish(row);
        if ((uploaded || removePhoto) && d.photo_url) api.deleteImage(d.photo_url);
        dishes = dishes.filter((x) => x.id !== saved.id).concat(saved);
        // себестоимость — отдельная таблица; блюдо уже сохранено, поэтому её ошибку показываем отдельно
        let costErr = '';
        if (costChanged) {
          try {
            await api.saveDishCost(saved.id, cost === null ? null : Math.round(cost * 100) / 100);
            if (cost === null) costs.delete(saved.id); else costs.set(saved.id, Math.round(cost * 100) / 100);
          } catch (ex) { costErr = S.errText(ex); }
        }
        S.closeModal();
        if (costErr) S.toast(`Блюдо сохранено, но себестоимость — нет: ${costErr}`, true);
        else S.toast(isNew ? 'Блюдо добавлено' : 'Сохранено');
        render();
      } catch (ex) {
        if (uploaded) api.deleteImage(uploaded);
        const msg = String(ex?.message || '');
        err(/dishes_promo_check/.test(msg) ? 'Акция: цена по акции должна быть меньше обычной, а часы — оба или ни одного.'
          : /dishes_stock_check/.test(msg) ? 'Осталось порций — целое число от 0 до 100 000.' : S.errText(ex));
        btn.disabled = false;
        btn.innerHTML = `${icon('check', 'sm')}Сохранить`;
      }
    });
  }

  // ---------- категория ----------
  function catForm(c) {
    const isNew = !c;
    c = c || { name: {}, hidden: false, sort: (Math.max(0, ...cats.map((x) => x.sort)) + 10) };
    const count = isNew ? 0 : dishes.filter((d) => d.category_id === c.id).length;
    const m = S.modal(`
      <form id="cat-form" novalidate>
        <h2 id="modal-title">${isNew ? 'Новая категория' : 'Категория'}</h2>
        ${langFields('name', c.name, { label: 'Название', required: true })}
        <div style="margin-top:14px">${sw('name="shown"', !c.hidden, 'Показывать гостям')}</div>
        <p class="section-label">Где готовят</p>
        <div class="checks" role="radiogroup" aria-label="Где готовят">
          <label><input type="radio" name="station" value="kitchen"${c.station !== 'bar' ? ' checked' : ''}>Кухня</label>
          <label><input type="radio" name="station" value="bar"${c.station === 'bar' ? ' checked' : ''}>Бар</label>
        </div>
        <p class="help" style="margin:4px 0 0">Блюда этой категории попадут на экран кухни или на экран бара.</p>
        <p class="section-label">Время подачи (необязательно)</p>
        <p class="help" style="margin:0 0 8px">Например, «Завтрак» с 06:00 до 11:00. В эти часы категория стоит первой в меню, в другое время гость видит её, но заказать не может. Пусто — весь день.</p>
        <div class="form-grid">
          <label class="field"><span>С</span><input name="avail_from" type="time" value="${esc(c.avail_from || '')}"></label>
          <label class="field"><span>До</span><input name="avail_to" type="time" value="${esc(c.avail_to || '')}"></label>
        </div>
        <p class="notice bad" id="cat-err" role="alert" hidden></p>
        <div class="modal-foot">
          <button type="submit" class="btn">${icon('check', 'sm')}Сохранить</button>
          <button type="button" class="btn ghost" data-modal-close>Отмена</button>
          ${isNew ? '' : `<button type="button" class="btn danger" id="cat-delete"${count ? ` title="Сначала уберите блюда (${count})"` : ''}>${icon('trash', 'sm')}Удалить</button>`}
        </div>
      </form>`);
    const err = (msg) => { const e = m.querySelector('#cat-err'); e.hidden = !msg; e.innerHTML = msg ? `${icon('alert')}<span>${esc(msg)}</span>` : ''; };
    m.querySelector('#cat-delete')?.addEventListener('click', async () => {
      if (count) return err(`В категории ${count} ${ruPlural(count, 'блюдо', 'блюда', 'блюд')}. Перенесите их в другую категорию или удалите, потом удалите категорию.`);
      if (!await S.ask(`Удалить категорию «${tr(c.name)}»?`, { ok: 'Удалить' })) return;
      try {
        await api.deleteCategory(c.id);
        cats = cats.filter((x) => x.id !== c.id);
        S.closeModal();
        S.toast('Категория удалена');
        render();
      } catch (ex) { err(S.errText(ex)); }
    });
    m.querySelector('#cat-form').addEventListener('submit', async (e) => {
      e.preventDefault();
      const f = new FormData(e.target);
      const name = readLang(f, 'name');
      if (!name.ru) return err('Впишите название на русском.');
      const af = String(f.get('avail_from') || '').slice(0, 5);
      const at = String(f.get('avail_to') || '').slice(0, 5);
      if (!!af !== !!at) return err('Укажите оба времени — «с» и «до», или оставьте оба пустыми.');
      if (af && af === at) return err('Время «с» и «до» совпадает.');
      try {
        const saved = await api.saveCategory({
          id: c.id || slug(name.en || name.ru, new Set(cats.map((x) => x.id))),
          name, hidden: !f.get('shown'), sort: c.sort, avail_from: af || null, avail_to: at || null,
          station: f.get('station') === 'bar' ? 'bar' : 'kitchen',
        });
        cats = cats.filter((x) => x.id !== saved.id).concat(saved);
        S.closeModal();
        S.toast(isNew ? 'Категория добавлена' : 'Сохранено');
        render();
      } catch (ex) { err(S.errText(ex)); }
    });
  }

  async function moveCat(id, dir) {
    const sorted = [...cats].sort((a, b) => a.sort - b.sort || a.id.localeCompare(b.id));
    const i = sorted.findIndex((c) => c.id === id);
    const j = i + dir;
    if (i < 0 || j < 0 || j >= sorted.length) return;
    // пронумеровать заново с шагом 10, затем поменять местами
    sorted.forEach((c, k) => { c.sort = (k + 1) * 10; });
    [sorted[i].sort, sorted[j].sort] = [sorted[j].sort, sorted[i].sort];
    try {
      await Promise.all(sorted.map((c) => api.saveCategory({ id: c.id, name: c.name, hidden: c.hidden, sort: c.sort, avail_from: c.avail_from || null, avail_to: c.avail_to || null })));
      cats = sorted;
      render();
    } catch (ex) { S.toast(S.errText(ex), true); await loadMenu(); render(); }
  }

  // =================================================================
  //  РЕКЛАМА — ролики 15–20 секунд на главной приложения гостя (только владелец; права — в базе)
  // =================================================================
  const PROMO_MAX = 52428800;            // 50 МБ, как в хранилище promo-videos
  const PROMO_TYPES = ['video/mp4', 'video/quicktime', 'video/webm'];
  let promos = null;                     // null — ещё не загружены
  let promoBusy = '';                    // идёт загрузка: текст для владельца
  const promoSorted = () => [...(promos || [])].sort((a, b) => a.sort - b.sort || String(b.created_at).localeCompare(String(a.created_at)));
  const secs = (n) => `${String(Math.round(Number(n) * 10) / 10).replace('.', ',')} с`;
  const mb = (n) => `${String(Math.ceil(n / 104857.6) / 10).replace('.', ',')} МБ`;
  async function loadPromos() { promos = await api.promos(); }

  function renderPromos() {
    const main = $('#a-main');
    if (promos === null) {
      main.innerHTML = '<p class="a-empty">Загрузка…</p>';
      loadPromos().then(() => { if (tab === 'promos') renderPromos(); })
        .catch((ex) => { if (tab === 'promos') main.innerHTML = `<p class="notice bad">${icon('alert')}<span>Не получилось загрузить ролики: ${esc(S.errText(ex))}</span></p>`; });
      return;
    }
    const list = promoSorted();
    main.innerHTML = `
      <div class="toolbar">
        <span class="btn small file-btn"${promoBusy ? ' aria-disabled="true"' : ''}>${icon('upload', 'sm')}Загрузить видео
          <input type="file" id="promo-file" accept="video/mp4,video/quicktime,video/webm" aria-label="Загрузить видео"${promoBusy ? ' disabled' : ''}></span>
        ${promoBusy ? `<span class="promo-busy" role="status">${esc(promoBusy)}</span>` : ''}
      </div>
      <p class="help">Видео 15–20 секунд, до 50 МБ. Показывается гостям на главной в приложении.</p>
      ${list.length ? `<section class="panel"><ul class="rows promo-rows">${list.map((p, i) => `
        <li class="${p.active ? '' : 'is-off'}">
          <div class="promo-prev"><video src="${esc(p.video_url)}"${p.poster_url ? ` poster="${esc(p.poster_url)}"` : ''} muted playsinline loop autoplay preload="metadata" aria-hidden="true"></video></div>
          <div class="grow promo-info">
            <small>${esc([p.duration_s != null ? secs(p.duration_s) : '', p.active ? 'гости видят' : 'скрыто от гостей'].filter(Boolean).join(' · '))}</small>
            <div class="promo-titles">
              <label class="field"><span>Подпись по-русски</span><input type="text" maxlength="80" data-promo-title="ru" data-id="${esc(p.id)}" value="${esc(p.title?.ru || '')}" placeholder="Необязательно"></label>
              <label class="field"><span>English</span><input type="text" maxlength="80" data-promo-title="en" data-id="${esc(p.id)}" value="${esc(p.title?.en || '')}" placeholder="Optional"></label>
            </div>
            <div class="row-btns promo-btns">
            ${sw(`data-promo-active="${esc(p.id)}" aria-label="Показывать ролик ${i + 1}"`, p.active, 'Показывать')}
            <button type="button" class="btn small ghost" data-promo-move="-1" data-id="${esc(p.id)}" aria-label="Выше"${i === 0 ? ' disabled' : ''}>${icon('arrow-up', 'sm')}</button>
            <button type="button" class="btn small ghost" data-promo-move="1" data-id="${esc(p.id)}" aria-label="Ниже"${i === list.length - 1 ? ' disabled' : ''}>${icon('arrow-down', 'sm')}</button>
            <button type="button" class="btn small danger" data-promo-del="${esc(p.id)}">${icon('trash', 'sm')}Удалить</button>
            </div>
          </div>
        </li>`).join('')}</ul></section>` : '<div class="a-empty">Пока нет видео. Загрузите ролик 15–20 секунд — гости увидят его на главной.</div>'}`;
  }

  // длительность и размер кадра — в браузере, до загрузки (скрытый <video>)
  function readVideo(url) {
    return new Promise((resolve) => {
      const v = document.createElement('video');
      v.muted = true; v.playsInline = true; v.preload = 'auto';
      const timer = setTimeout(() => resolve(null), 20000);
      v.addEventListener('loadedmetadata', () => { clearTimeout(timer); resolve(v); }, { once: true });
      v.addEventListener('error', () => { clearTimeout(timer); resolve(null); }, { once: true });
      v.src = url;
    });
  }
  // обложка: кадр около 1-й секунды → jpeg; не вышло — null (ролик загрузится без обложки)
  function grabPoster(v) {
    return new Promise((resolve) => {
      const timer = setTimeout(() => resolve(null), 8000);
      const draw = () => {
        clearTimeout(timer);
        try {
          const w = v.videoWidth; const h = v.videoHeight;
          if (!w || !h) { resolve(null); return; }
          const k = Math.min(1, 1280 / Math.max(w, h));
          const c = document.createElement('canvas');
          c.width = Math.round(w * k); c.height = Math.round(h * k);
          c.getContext('2d').drawImage(v, 0, 0, c.width, c.height);
          c.toBlob((b) => resolve(b && b.size ? b : null), 'image/jpeg', 0.82);
        } catch { resolve(null); }
      };
      v.addEventListener('seeked', draw, { once: true });
      v.addEventListener('error', () => { clearTimeout(timer); resolve(null); }, { once: true });
      try { v.currentTime = Math.min(1, (v.duration || 2) / 2); } catch { clearTimeout(timer); resolve(null); }
    });
  }

  async function uploadPromo(file) {
    if (!file || promoBusy) return;
    const okType = PROMO_TYPES.includes(file.type) || /\.(mp4|m4v|mov|webm)$/i.test(file.name || '');
    if (!okType) { S.toast('Это не видео MP4, MOV или WebM. Выберите другой файл.', true); return; }
    if (file.size > PROMO_MAX) { S.toast(`Файл весит ${mb(file.size)} — это больше 50 МБ. Сожмите ролик (например, сохраните в 1080p) и попробуйте снова.`, true); return; }
    const url = URL.createObjectURL(file);
    let v = null;
    try {
      promoBusy = 'Проверяем видео…'; renderPromos();
      v = await readVideo(url);
      const d = v ? v.duration : NaN;
      if (!Number.isFinite(d) || d <= 0) {
        S.toast('Не получилось прочитать видео в этом браузере. Сохраните ролик как MP4 (H.264) и попробуйте снова.', true);
        return;
      }
      if (d > 30) { S.toast(`Ролик идёт ${secs(d)} — это дольше 30 секунд. Обрежьте его до 15–20 секунд.`, true); return; }
      if (d < 1) { S.toast('Ролик короче секунды — так гости ничего не увидят.', true); return; }
      if (d < 10) {
        promoBusy = ''; renderPromos();
        if (!await S.ask(`Ролик идёт всего ${secs(d)}. Лучше 15–20 секунд, иначе гости не успеют его рассмотреть. Всё равно загрузить?`, { ok: 'Загрузить', cancel: 'Не загружать' })) return;
      }
      promoBusy = 'Готовим обложку…'; renderPromos();
      const poster = await grabPoster(v);
      promoBusy = `Загружаем видео (${mb(file.size)})… Не закрывайте страницу.`; renderPromos();
      const videoUrl = await api.uploadPromoVideo(file);
      let posterUrl = null;
      if (poster) { try { posterUrl = await api.uploadPromoPoster(poster); } catch { posterUrl = null; } }
      const sort = (promos || []).reduce((m, p) => Math.max(m, Number(p.sort) || 0), -1) + 1;
      const row = await api.savePromo({ video_url: videoUrl, poster_url: posterUrl, title: {}, active: true, sort, duration_s: Math.round(d * 100) / 100 });
      promos = [...(promos || []), row];
      S.toast('Видео загружено. Гости увидят его на главной.');
    } catch (ex) {
      S.toast(/exceeded|too large|413/i.test(ex.message || '') ? 'Файл слишком большой для хранилища (больше 50 МБ).' : `Видео не загрузилось: ${S.errText(ex)}`, true);
    } finally {
      URL.revokeObjectURL(url);
      if (v) { v.removeAttribute('src'); v.load(); }
      promoBusy = '';
      if (tab === 'promos') renderPromos();
    }
  }

  async function promoAction(fn, okText) {
    try { await fn(); if (okText) S.toast(okText); } catch (ex) { S.toast(S.errText(ex), true); }
    try { await loadPromos(); } catch { /* покажем то, что есть */ }
    if (tab === 'promos') renderPromos();
  }
  function movePromo(id, dir) {
    const list = promoSorted();
    const i = list.findIndex((p) => p.id === id);
    const j = i + dir;
    if (i < 0 || j < 0 || j >= list.length) return;
    [list[i], list[j]] = [list[j], list[i]];
    const changed = list.map((p, k) => ({ p, k })).filter(({ p, k }) => p.sort !== k);
    promoAction(() => Promise.all(changed.map(({ p, k }) => api.savePromo({ id: p.id, sort: k }))));
  }
  function savePromoTitle(input) {
    const p = (promos || []).find((x) => x.id === input.dataset.id);
    if (!p) return;
    const val = input.value.trim().slice(0, 80);
    const title = { ...(p.title || {}) };
    if (val) title[input.dataset.promoTitle] = val; else delete title[input.dataset.promoTitle];
    if (JSON.stringify(title) === JSON.stringify(p.title || {})) return;
    // без перерисовки: владелец может уже печатать в соседнем поле
    api.savePromo({ id: p.id, title }).then((row) => { Object.assign(p, row); S.toast('Подпись сохранена'); })
      .catch((ex) => S.toast(S.errText(ex), true));
  }

  async function quickPatch(id, patch, okText) {
    const before = dishes.find((d) => d.id === id);
    try {
      const saved = await api.patchDish(id, patch);
      dishes = dishes.map((d) => (d.id === id ? saved : d));
      S.toast(okText);
    } catch (ex) {
      S.toast(S.errText(ex), true);
      dishes = dishes.map((d) => (d.id === id ? before : d));
    }
    render();
  }

  // =================================================================
  //  РЕСТОРАН
  // =================================================================
  // ---------- карта для точки ресторана (Leaflet + OpenStreetMap), грузится только в «Ресторане» ----------
  const LEAFLET = {
    css: ['https://unpkg.com/leaflet@1.9.4/dist/leaflet.css', 'sha256-p4NxAoJBhIIN+hmNHrzRCf9tD/miZyoHS5obTRR9BMY='],
    js: ['https://unpkg.com/leaflet@1.9.4/dist/leaflet.js', 'sha256-20nQCchB9co0qIjJZRGuk2/Z9VM+kNiyxNV1lvTlZBo='],
  };
  let leafletP = null;
  function loadLeaflet() {
    if (window.L?.map) return Promise.resolve(window.L);
    if (leafletP) return leafletP;
    leafletP = new Promise((res, rej) => {
      if (!document.getElementById('leaflet-css')) {
        const css = document.createElement('link');
        Object.assign(css, { id: 'leaflet-css', rel: 'stylesheet', href: LEAFLET.css[0], integrity: LEAFLET.css[1], crossOrigin: 'anonymous' });
        document.head.appendChild(css);
      }
      const js = document.createElement('script');
      Object.assign(js, { src: LEAFLET.js[0], integrity: LEAFLET.js[1], crossOrigin: 'anonymous' });
      js.onload = () => (window.L?.map ? res(window.L) : rej(new Error('leaflet')));
      js.onerror = () => { leafletP = null; js.remove(); rej(new Error('leaflet')); };   // в следующий раз попробуем снова
      document.head.appendChild(js);
    });
    return leafletP;
  }
  const accentColor = () => getComputedStyle(document.documentElement).getPropertyValue('--accent').trim() || '#B5462E';

  function renderRestaurant() {
    const st = S.settings;
    const sched = Array.isArray(st.schedule) && st.schedule.length === 7 ? st.schedule
      : Array.from({ length: 7 }, () => ({ closed: false, open: '10:00', close: '22:00' }));
    const zones = ZONES.includes(st.timezone) ? ZONES : [st.timezone, ...ZONES];
    const offset = (tz) => { try { return new Intl.DateTimeFormat('en-US', { timeZone: tz, timeZoneName: 'shortOffset' }).formatToParts(new Date()).find((p) => p.type === 'timeZoneName').value; } catch { return ''; } };
    let newLogo = null;
    let removeLogo = false;

    $('#a-main').innerHTML = `
      <form id="settings-form" novalidate>
        <section class="panel"><div class="panel-head"><h3>Ресторан</h3></div><div class="panel-body">
          <div class="photo-row">
            <div id="logo-preview">${st.logo_url ? `<div class="photo square has-img"><img src="${esc(st.logo_url)}" alt=""></div>` : `<div class="logo" style="width:90px;height:90px;font-size:30px">${esc(initials(st.name))}</div>`}</div>
            <div class="btns">
              <span class="btn small ghost file-btn">${icon('upload', 'sm')}${st.logo_url ? 'Заменить логотип' : 'Загрузить логотип'}
                <input type="file" id="logo-file" accept="image/jpeg,image/png,image/webp" aria-label="Логотип"></span>
              <button type="button" class="btn small danger" id="logo-remove"${st.logo_url ? '' : ' hidden'}>${icon('trash', 'sm')}Убрать</button>
            </div>
          </div>
          <p class="help" style="margin-top:8px">Без логотипа показываем аккуратную монограмму из названия.</p>
          <label class="field"><span>Название</span><input name="name" type="text" maxlength="80" required value="${esc(st.name)}"></label>
          ${langFields('tagline', st.tagline, { label: 'Короткое описание кухни' })}
        </div></section>

        <section class="panel"><div class="panel-head"><h3>Часы работы</h3></div><div class="panel-body">
          <label class="field"><span>Часовой пояс ресторана</span><select name="timezone">${zones.map((z) => `<option value="${esc(z)}"${z === st.timezone ? ' selected' : ''}>${esc(z.replace(/_/g, ' '))} (${esc(offset(z))})</option>`).join('')}</select>
            <span class="hint">«Открыто/Закрыто» считается по этому времени, а не по часам телефона гостя.</span></label>
          <div class="sched" id="sched">${sched.map((d, i) => `
            <div class="sched-row${d.closed ? ' off' : ''}" data-day="${i}">
              <b>${DAYS[i]}</b>
              ${sw(`data-open-day="${i}"`, !d.closed, 'Работаем')}
              <div class="times">
                <input type="time" name="open_${i}" value="${esc(d.open)}" aria-label="${DAYS[i]}: открытие">–
                <input type="time" name="close_${i}" value="${esc(d.close)}" aria-label="${DAYS[i]}: закрытие">
                <span class="night" data-night="${i}">${SCHED_NIGHT(d)}</span>
              </div>
            </div>`).join('')}</div>
          <button type="button" class="btn small ghost" id="copy-monday" style="margin-top:10px">Как в понедельник — на все дни</button>
          <p class="help" style="margin-top:8px">Если время закрытия меньше времени открытия (например 18:00–02:00), ресторан работает после полуночи.</p>
        </div></section>

        <section class="panel"><div class="panel-head"><h3>Адрес и телефон</h3></div><div class="panel-body">
          <p class="help">Пустые поля гостям не показываются. Не вписывайте сюда временные или выдуманные данные.</p>
          ${langFields('address', st.address, { label: 'Адрес' })}
          <label class="field"><span>Ссылка на карту (необязательно)</span><input name="map_url" type="url" inputmode="url" placeholder="https://maps.app.goo.gl/…" value="${esc(st.map_url || '')}">
            <span class="hint">Если пусто — адрес откроется поиском в Google Картах.</span></label>
          <label class="field"><span>Телефон</span><input name="phone" type="tel" inputmode="tel" maxlength="30" placeholder="+60 12 345 6789" value="${esc(st.phone || '')}"></label>
        </div></section>

        <section class="panel"><div class="panel-head"><h3>Резервная копия</h3></div><div class="panel-body">
          <p class="help" style="margin-top:0">${esc(backupText())} Один файл: меню, столы, сотрудники, все заказы, счета, Z-отчёты и отзывы. Скачивайте раз в неделю и храните в надёжном месте (Google Диск, почта).</p>
          <button type="button" class="btn ghost" data-backup>${icon('download', 'sm')}Скачать резервную копию</button>
        </div></section>

        <section class="panel"><div class="panel-head"><h3>Для гостей: Wi‑Fi и отзывы</h3></div><div class="panel-body">
          <p class="help">Wi‑Fi видят только гости, которые отсканировали QR на столе. Пустое поле — значок Wi‑Fi не показывается.</p>
          <div class="form-grid">
            <label class="field"><span>Название сети Wi‑Fi</span><input name="wifi_name" type="text" maxlength="64" autocomplete="off" placeholder="Например: CentralAsia_Guest" data-wifi></label>
            <label class="field"><span>Пароль Wi‑Fi</span><input name="wifi_pass" type="text" maxlength="64" autocomplete="off" placeholder="Пусто — сеть без пароля" data-wifi></label>
          </div>
          <label class="field"><span>Ссылка на отзыв в Google (необязательно)</span><input name="google_review_url" type="url" inputmode="url" maxlength="500" placeholder="https://g.page/r/…/review" value="${esc(st.google_review_url || '')}">
            <span class="hint">Google Карты → ваш ресторан → «Попросить отзывы» → скопировать ссылку. Гость с оценкой 4–5 звёзд увидит кнопку «Оставить отзыв в Google».</span></label>
        </div></section>

        <section class="panel"><div class="panel-head"><h3>Цены, язык, заказы</h3></div><div class="panel-body">
          <div class="form-grid">
            <label class="field"><span>Валюта</span><input name="currency" type="text" maxlength="8" required value="${esc(st.currency)}"></label>
            <label class="field"><span>Где писать валюту</span><select name="currency_before">
              <option value="1"${st.currency_before ? ' selected' : ''}>Перед ценой: ${esc(st.currency)} 28</option>
              <option value="0"${st.currency_before ? '' : ' selected'}>После цены: 28 ${esc(st.currency)}</option></select></label>
            <label class="field"><span>Язык, если язык телефона гостя не поддерживается</span><select name="default_language">${LANGS.map(([c, n]) => `<option value="${c}"${c === st.default_language ? ' selected' : ''}>${n}</option>`).join('')}</select></label>
            <div class="field full"><span>Онлайн-заказы</span>
              ${sw('name="orders_enabled"', st.orders_enabled, 'Принимать заказы из меню')}
              ${sw('name="orders_when_closed"', st.orders_when_closed, 'Принимать и когда ресторан закрыт по расписанию')}</div>
            <label class="field"><span>Цель дня, ${esc(st.currency || '')}</span><input name="day_goal" type="number" inputmode="decimal" min="1" max="9999999" step="1" value="${esc(st.day_goal ?? '')}" placeholder="не задана">
              <span class="hint">Сколько хотите выручить за день. Вверху «Зала» появится полоска: сколько уже оплачено сегодня. Пусто — полоски нет.</span></label>
            <div class="field full"><span>Халяль</span>
              ${sw('name="halal"', st.halal, 'Показывать гостям «Халяль»')}
              <span class="hint">Включайте, только если ресторан действительно халяльный. Данные сертификата — ниже, если они есть.</span>
              <span class="hint">Если приём выключен или ресторан закрыт, гость видит понятное сообщение и не может отправить заказ.</span></div>
          </div>
          ${langFields('halal_note', st.halal_note, { label: 'Халяль: данные сертификата (необязательно)', hint: 'Например: «Сертификат JAKIM № …». Пусто — гости видят только значок «Халяль».' })}
          ${langFields('footer', st.footer, { label: 'Подпись внизу меню (необязательно)' })}
        </div></section>

        <section class="panel" id="dl-panel"><div class="panel-head"><h3>Доставка</h3></div><div class="panel-body">
          <p class="help" style="margin-top:0">Гость ставит точку на карте — меню считает расстояние и цену доставки по вашим зонам. Деньги за заказ и доставку берёт курьер, наличными или картой. Курьера пригласите в разделе «Сотрудники».</p>
          ${sw('name="delivery_enabled"', !!st.delivery_enabled, 'Доставка включена')}
          <p class="section-label">Где ресторан</p>
          <div class="dl-map" id="dl-map"><p class="a-empty">Загружаем карту…</p></div>
          <p class="help" style="margin-top:0">Нажмите на карту там, где ресторан, — точка встанет туда. Если вы сейчас в ресторане, нажмите «Где я сейчас».</p>
          <div class="dl-point">
            <label class="field"><span>Широта</span><input name="delivery_lat" type="text" inputmode="decimal" maxlength="12" autocomplete="off" value="${esc(st.delivery_lat ?? '')}" placeholder="не задана"></label>
            <label class="field"><span>Долгота</span><input name="delivery_lng" type="text" inputmode="decimal" maxlength="12" autocomplete="off" value="${esc(st.delivery_lng ?? '')}" placeholder="не задана"></label>
            <button type="button" class="btn small ghost" id="dl-here">${icon('pin', 'sm')}Где я сейчас</button>
          </div>
          <p class="section-label">Зоны и цена доставки</p>
          <p class="help" style="margin-top:0">Расстояние считается по прямой от ресторана. Гость дальше последней зоны доставку заказать не сможет. До 8 зон.</p>
          <ul class="dl-zones" id="dl-zones"></ul>
          <button type="button" class="btn small ghost" id="dl-add">${icon('plus', 'sm')}Добавить зону</button>
          <label class="field" style="margin-top:14px"><span>Минимальная сумма заказа на доставку, ${esc(st.currency || '')}</span><input name="delivery_min" type="number" inputmode="decimal" min="0" max="99999" step="0.01" value="${esc(Number(st.delivery_min) ? st.delivery_min : '')}" placeholder="пусто — без минимума">
            <span class="hint">Считается по блюдам, без налога и платы за доставку.</span></label>
          <p class="section-label">Звонок гостю и проверка номера</p>
          <p class="help" style="margin-top:0">Новая доставка приходит как «Ожидает подтверждения» и на кухню не идёт, пока официант не позвонит гостю и не нажмёт «Принять заказ». Не дозвонились — «Не дозвонились», заказ отменяется.</p>
          <div class="form-grid">
            <label class="field"><span>Без звонка после N доставок</span><input name="dv_trust_after" type="number" inputmode="numeric" min="0" max="50" step="1" value="${esc(st.dv_trust_after ?? 3)}">
              <span class="hint">Гостю, который уже получил и оплатил столько доставок на этот номер, не звоним. Работает только при включённой проверке номера по SMS: без неё номер мог набрать кто угодно, поэтому звоним всем. 0 — звонить всегда.</span></label>
            <label class="field"><span>Всегда звонить, если сумма больше, ${esc(st.currency || '')}</span><input name="dv_confirm_over" type="number" inputmode="decimal" min="0" max="99999" step="0.01" value="${esc(st.dv_confirm_over ?? 150)}">
              <span class="hint">Крупный заказ подтверждаем звонком даже у постоянного гостя. Сумма — вместе с доставкой.</span></label>
          </div>
          <div class="field full" style="margin-top:6px" id="dv-sms-field"><span>Проверка номера по SMS</span>
            ${sw('name="dv_sms" data-dv-sms', !!st.dv_sms, 'Гость подтверждает телефон кодом из SMS', true)}
            <span class="hint" id="dv-sms-hint">Проверяем, настроены ли SMS…</span></div>
        </div></section>

        <section class="panel"><div class="panel-head"><h3>Сбор, налог, скидки и округление</h3></div><div class="panel-body">
          <p class="help">Сумма считается на сервере и видна гостю в корзине, на экране заказа и в чеке. Оставьте 0, если не берёте. Новые проценты действуют для новых заказов.</p>
          <div class="form-grid">
            <label class="field"><span>Сервисный сбор, %</span><input name="service_pct" type="number" min="0" max="30" step="0.5" value="${esc(Number(st.service_pct) || 0)}"></label>
            <label class="field"><span>Налог, %</span><input name="tax_pct" type="number" min="0" max="30" step="0.5" value="${esc(Number(st.tax_pct) || 0)}"></label>
            <label class="field"><span>Название налога</span><input name="tax_name" type="text" maxlength="20" value="${esc(st.tax_name || 'SST')}"></label>
            <div class="field"><span>Налог на сервисный сбор</span>${sw('name="tax_on_service"', st.tax_on_service !== false, 'Считать налог и на сбор')}</div>
            <div class="field"><span>Наличные</span>${sw('name="cash_rounding"', st.cash_rounding !== false, 'Округлять до 5 сен')}
              <span class="hint">Правило Малайзии: 1–2 сен вниз, 3–4 вверх, 6–7 вниз, 8–9 вверх. Только для наличных, карта и QR — точно.</span></div>
            <div class="field"><span>Скидки</span>${sw('name="waiter_discounts"', !!st.waiter_discounts, 'Официанты тоже могут давать скидку')}
              <span class="hint">Вы даёте скидку всегда. Причина обязательна и видна в журнале, отчётах и чеке.</span></div>
          </div>
          <label class="field"><span>Язык чека и счёта</span><select name="receipt_lang">${[['en', 'English'], ['ms', 'Bahasa Melayu'], ['ru', 'Русский'], ['uz', "O'zbekcha"]].map(([c, n]) => `<option value="${c}"${(st.receipt_lang || 'en') === c ? ' selected' : ''}>${n}</option>`).join('')}</select>
            <span class="hint">На этом языке печатаются все чеки и счета — и у вас, и у официантов. Для Малайзии обычно English или Bahasa Melayu.</span></label>
          <label class="field"><span>Реквизиты для чека (необязательно)</span><textarea name="receipt_info" rows="3" maxlength="300" placeholder="Например:&#10;Central Asia Sdn Bhd (SSM 202401234567)&#10;SST No: W10-1234-56789012">${esc(st.receipt_info || '')}</textarea>
            <span class="hint">Печатается вверху чека, под названием. До 5 строк.</span></label>
        </div></section>

        <p class="notice bad" id="set-err" role="alert" hidden></p>
        <div style="position:sticky;bottom:calc(12px + env(safe-area-inset-bottom));display:flex;gap:8px;z-index:5">
          <button type="submit" class="btn" style="flex:1;box-shadow:var(--shadow-lg)">${icon('check', 'sm')}Сохранить изменения</button>
        </div>
      </form>
      <section class="panel" id="sms-panel" style="margin-top:18px"><div class="panel-head"><h3>SMS для проверки номера (Twilio)</h3></div><div class="panel-body"><p class="a-empty">Загрузка…</p></div></section>
      <section class="panel" id="tg-panel" style="margin-top:18px"><div class="panel-head"><h3>Уведомления в Telegram</h3></div><div class="panel-body"><p class="a-empty">Загрузка…</p></div></section>`;
    renderTelegram();
    renderSms();

    const form = $('#settings-form');
    const err = (msg) => { const e = $('#set-err'); e.hidden = !msg; e.innerHTML = msg ? `${icon('alert')}<span>${esc(msg)}</span>` : ''; if (msg) e.scrollIntoView({ block: 'center' }); };
    const updNight = (i) => {
      const o = form.querySelector(`[name="open_${i}"]`).value;
      const c = form.querySelector(`[name="close_${i}"]`).value;
      form.querySelector(`[data-night="${i}"]`).textContent = SCHED_NIGHT({ open: o, close: c });
    };
    form.addEventListener('input', (e) => { const m = e.target.name?.match(/^(open|close)_(\d)$/); if (m) updNight(m[2]); });
    form.addEventListener('change', (e) => {
      const d = e.target.dataset.openDay;
      if (d !== undefined) form.querySelector(`[data-day="${d}"]`).classList.toggle('off', !e.target.checked);
    });
    $('#copy-monday').addEventListener('click', () => {
      const on = form.querySelector('[data-open-day="0"]').checked;
      const o = form.querySelector('[name="open_0"]').value;
      const c = form.querySelector('[name="close_0"]').value;
      for (let i = 1; i < 7; i++) {
        form.querySelector(`[data-open-day="${i}"]`).checked = on;
        form.querySelector(`[data-day="${i}"]`).classList.toggle('off', !on);
        form.querySelector(`[name="open_${i}"]`).value = o;
        form.querySelector(`[name="close_${i}"]`).value = c;
        updNight(i);
      }
    });
    // Wi‑Fi хранится отдельно от открытых настроек — подгружаем, не перебивая то, что уже вписали
    api.wifi().then((w) => {
      if (!form.isConnected) return;
      for (const [k, v] of [['wifi_name', w?.name], ['wifi_pass', w?.pass]]) {
        const el = form.querySelector(`[name="${k}"]`);
        if (el && !el.value) el.value = v || '';
      }
      form.dataset.wifiLoaded = '1';
    }).catch(() => {
      form.querySelectorAll('[data-wifi]').forEach((el) => { el.disabled = true; el.placeholder = 'Не загрузилось — обновите страницу'; });
    });
    $('#logo-file').addEventListener('change', async (e) => {
      const file = e.target.files[0];
      if (!file) return;
      try {
        newLogo = await S.processImage(file, 512, 512);
        removeLogo = false;
        $('#logo-preview').innerHTML = `<div class="photo square has-img"><img src="${URL.createObjectURL(newLogo)}" alt=""></div>`;
        $('#logo-remove').hidden = false;
      } catch (ex) { err(ex.message); }
      e.target.value = '';
    });
    $('#logo-remove').addEventListener('click', () => {
      newLogo = null;
      removeLogo = true;
      $('#logo-preview').innerHTML = `<div class="logo" style="width:90px;height:90px;font-size:30px">${esc(initials(form.name.value))}</div>`;
      $('#logo-remove').hidden = true;
    });

    // ---------- доставка: зоны, точка на карте ----------
    const cur = st.currency || '';
    let dlZones = (Array.isArray(st.delivery_zones) ? st.delivery_zones : [])
      .map((z) => ({ km: String(z.km ?? ''), fee: String(z.fee ?? '') }))
      .sort((a, b) => Number(a.km) - Number(b.km));
    const latIn = form.querySelector('[name="delivery_lat"]');
    const lngIn = form.querySelector('[name="delivery_lng"]');
    const numOf = (v) => { const x = String(v ?? '').trim().replace(',', '.'); return x === '' ? NaN : Number(x); };
    const pointOf = () => {
      const la = numOf(latIn.value);
      const ln = numOf(lngIn.value);
      return Number.isFinite(la) && Number.isFinite(ln) && Math.abs(la) <= 90 && Math.abs(ln) <= 180 ? [la, ln] : null;
    };
    let mapApi = null;   // { draw(pan) } — когда карта загрузилась
    function paintZones() {
      const box = $('#dl-zones');
      box.innerHTML = dlZones.length ? dlZones.map((z, i) => `<li class="dl-zone">
          <span>до</span><input type="text" inputmode="decimal" maxlength="5" data-z-km="${i}" value="${esc(z.km)}" aria-label="Зона ${i + 1}: до скольких километров">
          <span>км —</span>${st.currency_before ? `<span>${esc(cur)}</span>` : ''}
          <input type="text" inputmode="decimal" maxlength="7" data-z-fee="${i}" value="${esc(z.fee)}" aria-label="Зона ${i + 1}: цена доставки">${st.currency_before ? '' : `<span>${esc(cur)}</span>`}
          <button type="button" class="btn small danger" data-z-del="${i}" aria-label="Убрать зону ${i + 1}">${icon('trash', 'sm')}</button></li>`).join('')
        : '<li class="help" style="margin:0">Зон пока нет — добавьте хотя бы одну: до скольких километров и сколько стоит доставка.</li>';
      $('#dl-add').disabled = dlZones.length >= 8;
    }
    paintZones();
    $('#dl-zones').addEventListener('input', (e) => {
      const k = e.target.dataset.zKm;
      const fe = e.target.dataset.zFee;
      if (k !== undefined) dlZones[k].km = e.target.value;
      if (fe !== undefined) dlZones[fe].fee = e.target.value;
      mapApi?.draw(false);
    });
    $('#dl-zones').addEventListener('click', (e) => {
      const d = e.target.closest('[data-z-del]');
      if (!d) return;
      dlZones.splice(Number(d.dataset.zDel), 1);
      paintZones();
      mapApi?.draw(false);
    });
    $('#dl-add').addEventListener('click', () => {
      if (dlZones.length >= 8) return;
      dlZones.push({ km: '', fee: '' });
      paintZones();
      form.querySelector(`[data-z-km="${dlZones.length - 1}"]`)?.focus();
    });
    // включить доставку можно только с точкой ресторана и хотя бы одной зоной
    const zonesOk = () => dlZones.some((z) => numOf(z.km) >= 0.3 && numOf(z.km) <= 60 && numOf(z.fee) >= 0 && numOf(z.fee) <= 1000);
    const DL_NEED = 'Чтобы включить доставку, поставьте точку ресторана на карте и добавьте хотя бы одну зону с ценой.';
    form.querySelector('[name="delivery_enabled"]').addEventListener('change', (e) => {
      if (e.target.checked && (!pointOf() || !zonesOk())) { e.target.checked = false; S.toast(DL_NEED, true); }
    });
    [latIn, lngIn].forEach((el) => {
      el.addEventListener('input', () => mapApi?.draw(false));
      el.addEventListener('change', () => mapApi?.draw(true));
    });
    $('#dl-here').addEventListener('click', () => {
      if (!navigator.geolocation) { S.toast('Этот браузер не умеет определять место. Поставьте точку на карте.', true); return; }
      const b = $('#dl-here');
      b.disabled = true;
      navigator.geolocation.getCurrentPosition((pos) => {
        b.disabled = false;
        latIn.value = pos.coords.latitude.toFixed(6);
        lngIn.value = pos.coords.longitude.toFixed(6);
        mapApi?.draw(true, 17);
        S.toast(pos.coords.accuracy > 100 ? `Точка поставлена, но точность около ${Math.round(pos.coords.accuracy)} м — проверьте её на карте.` : 'Точка поставлена — проверьте её на карте.', pos.coords.accuracy > 100);
      }, () => {
        b.disabled = false;
        S.toast('Не получилось узнать, где вы. Разрешите браузеру доступ к геопозиции или поставьте точку на карте.', true);
      }, { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 });
    });
    loadLeaflet().then((L) => {
      const box = $('#dl-map');
      if (!box || !form.isConnected) return;
      box.innerHTML = '';
      const p0 = pointOf();
      // пока точки нет — просто показываем Куала-Лумпур, ничего не вписывая за владельца
      const map = L.map(box, { scrollWheelZoom: false }).setView(p0 || [3.139, 101.6869], p0 ? 14 : 11);
      L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 19, attribution: '&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener">OpenStreetMap</a>',
      }).addTo(map);
      const layer = L.layerGroup().addTo(map);
      const color = accentColor();
      mapApi = {
        // точка ресторана и круги зон; pan — сдвинуть карту к точке
        draw(pan, zoom) {
          layer.clearLayers();
          const p = pointOf();
          if (!p) return;
          const kms = dlZones.map((z) => numOf(z.km)).filter((k) => k >= 0.3 && k <= 60).sort((a, b) => a - b);
          kms.forEach((k) => L.circle(p, { radius: k * 1000, color, weight: 1.5, opacity: 0.7, fillOpacity: 0.04, dashArray: '6 6', interactive: false }).addTo(layer));
          L.circleMarker(p, { radius: 9, color: '#fff', weight: 3, fillColor: color, fillOpacity: 1 }).addTo(layer);
          if (pan) map.setView(p, zoom || Math.max(map.getZoom(), 14));
        },
      };
      map.on('click', (ev) => {
        latIn.value = ev.latlng.lat.toFixed(6);
        lngIn.value = ev.latlng.lng.toFixed(6);
        mapApi.draw(false);
      });
      mapApi.draw(false);
      setTimeout(() => map.invalidateSize(), 60);
    }).catch(() => {
      const box = $('#dl-map');
      if (box) box.innerHTML = `<p class="notice">${icon('alert')}<span>Карта не загрузилась (нет интернета?). Впишите широту и долготу вручную или нажмите «Где я сейчас».</span></p>`;
    });

    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      err('');
      const f = new FormData(form);
      const name = String(f.get('name') || '').trim();
      const phone = String(f.get('phone') || '').trim();
      const mapUrl = String(f.get('map_url') || '').trim();
      if (!name) return err('Впишите название ресторана.');
      if (phone && !/^[+0-9 ()-]{5,30}$/.test(phone)) return err('Телефон: только цифры, пробелы, +, -, скобки.');
      if (mapUrl && !/^https:\/\/\S+$/.test(mapUrl)) return err('Ссылка на карту должна начинаться с https://');
      const servicePct = Number(String(f.get('service_pct') || 0).replace(',', '.'));
      const taxPct = Number(String(f.get('tax_pct') || 0).replace(',', '.'));
      if (!(servicePct >= 0 && servicePct <= 30) || !(taxPct >= 0 && taxPct <= 30)) return err('Сбор и налог — от 0 до 30%.');
      const taxName = String(f.get('tax_name') || '').trim() || 'SST';
      const googleUrl = String(f.get('google_review_url') || '').trim();
      if (googleUrl && !/^https:\/\/\S+$/.test(googleUrl)) return err('Ссылка на отзыв в Google должна начинаться с https://');
      const wifiName = String(f.get('wifi_name') || '').trim().slice(0, 64);
      const wifiPass = String(f.get('wifi_pass') || '').trim().slice(0, 64);
      if (wifiPass && !wifiName) return err('Wi‑Fi: впишите название сети или уберите пароль.');
      const goalRaw = String(f.get('day_goal') ?? '').trim().replace(/\s/g, '').replace(',', '.');
      const dayGoal = goalRaw === '' ? null : Number(goalRaw);
      if (dayGoal !== null && !(Number.isFinite(dayGoal) && dayGoal > 0 && dayGoal < 10000000)) return err('Цель дня — сумма больше нуля, например 1000. Или оставьте пусто.');
      // доставка: точка ресторана (обе координаты или ни одной), зоны по км, минимальная сумма
      const dLatRaw = String(f.get('delivery_lat') || '').trim();
      const dLngRaw = String(f.get('delivery_lng') || '').trim();
      let dLat = null;
      let dLng = null;
      if (dLatRaw || dLngRaw) {
        const p = pointOf();
        if (!p || !dLatRaw || !dLngRaw) return err('Доставка: точка ресторана — широта от −90 до 90 и долгота от −180 до 180. Проще всего нажать на карту.');
        [dLat, dLng] = p.map((x) => Math.round(x * 1e6) / 1e6);
      }
      const dZones = [];
      for (const [i, z] of dlZones.entries()) {
        if (!String(z.km).trim() && !String(z.fee).trim()) continue;   // пустую строку просто не сохраняем
        const km = numOf(z.km);
        const fee = numOf(z.fee);
        if (!(km >= 0.3 && km <= 60)) return err(`Доставка, зона ${i + 1}: расстояние — от 0,3 до 60 км.`);
        if (!(fee >= 0 && fee <= 1000)) return err(`Доставка, зона ${i + 1}: цена — от 0 до 1000 ${cur}.`.trim());
        dZones.push({ km: Math.round(km * 100) / 100, fee: Math.round(fee * 100) / 100 });
      }
      dZones.sort((a, b) => a.km - b.km);
      if (new Set(dZones.map((z) => z.km)).size !== dZones.length) return err('Доставка: две зоны с одинаковым расстоянием — оставьте одну.');
      if (dZones.length > 8) return err('Доставка: не больше 8 зон.');
      const dMinRaw = String(f.get('delivery_min') ?? '').trim().replace(',', '.');
      const dMin = dMinRaw === '' ? 0 : Number(dMinRaw);
      if (!(Number.isFinite(dMin) && dMin >= 0 && dMin < 100000)) return err('Доставка: минимальная сумма — от 0, например 30. Или оставьте пусто.');
      const dOn = !!f.get('delivery_enabled');
      if (dOn && (dLat === null || !dZones.length)) return err(DL_NEED);
      const trustRaw = String(f.get('dv_trust_after') ?? '').trim();
      const dvTrust = trustRaw === '' ? 3 : Number(trustRaw);
      if (!(Number.isInteger(dvTrust) && dvTrust >= 0 && dvTrust <= 50)) return err('Звонок гостю: «без звонка после» — целое число от 0 до 50.');
      const overRaw = String(f.get('dv_confirm_over') ?? '').trim().replace(',', '.');
      const dvOver = overRaw === '' ? 0 : Number(overRaw);
      if (!(Number.isFinite(dvOver) && dvOver >= 0 && dvOver < 100000)) return err('Звонок гостю: сумма — от 0, например 150.');
      // переключатель SMS сохраняем, только когда знаем, настроены ли SMS (иначе он выключен на экране, а не у вас)
      const smsSw = form.querySelector('[data-dv-sms]');
      const receiptInfo = String(f.get('receipt_info') || '').split('\n').map((x) => x.trim()).filter(Boolean).slice(0, 5).join('\n').slice(0, 300);
      const schedule = [];
      for (let i = 0; i < 7; i++) {
        const open = f.get(`open_${i}`);
        const close = f.get(`close_${i}`);
        const on = form.querySelector(`[data-open-day="${i}"]`).checked;
        if (!/^\d{2}:\d{2}$/.test(open) || !/^\d{2}:\d{2}$/.test(close)) return err(`${DAYS[i]}: укажите время открытия и закрытия.`);
        if (on && open === close) return err(`${DAYS[i]}: время открытия и закрытия совпадает.`);
        schedule.push({ closed: !on, open, close: open === close ? (open === '23:59' ? '00:00' : '23:59') : close });
      }
      const btn = form.querySelector('[type="submit"]');
      btn.disabled = true;
      btn.textContent = 'Сохраняем…';
      let uploaded = null;
      try {
        if (newLogo) uploaded = await api.uploadImage(newLogo, 'logo');
        const patch = {
          name,
          tagline: readLang(f, 'tagline'),
          timezone: f.get('timezone'),
          schedule,
          address: readLang(f, 'address'),
          map_url: mapUrl || null,
          phone,
          currency: String(f.get('currency') || '').trim() || 'RM',
          currency_before: f.get('currency_before') === '1',
          default_language: f.get('default_language'),
          orders_enabled: !!f.get('orders_enabled'),
          orders_when_closed: !!f.get('orders_when_closed'),
          halal: !!f.get('halal'),
          halal_note: readLang(f, 'halal_note'),
          footer: readLang(f, 'footer'),
          logo_url: uploaded || (removeLogo ? null : st.logo_url || null),
          service_pct: servicePct, tax_pct: taxPct, tax_name: taxName.slice(0, 20), tax_on_service: !!f.get('tax_on_service'),
          receipt_info: receiptInfo,
          google_review_url: googleUrl || null,
          receipt_lang: ['en', 'ms', 'ru', 'uz'].includes(f.get('receipt_lang')) ? f.get('receipt_lang') : 'en',
          cash_rounding: !!f.get('cash_rounding'), waiter_discounts: !!f.get('waiter_discounts'),
          day_goal: dayGoal === null ? null : Math.round(dayGoal * 100) / 100,
          delivery_enabled: dOn, delivery_lat: dLat, delivery_lng: dLng, delivery_zones: dZones, delivery_min: Math.round(dMin * 100) / 100,
          dv_trust_after: dvTrust, dv_confirm_over: Math.round(dvOver * 100) / 100,
          ...(smsSw && smsSw.dataset.known === '1' ? { dv_sms: !smsSw.disabled && smsSw.checked } : {}),
        };
        const saved = await api.saveSettings(patch);
        if (form.dataset.wifiLoaded === '1') await api.saveWifi(wifiName, wifiPass);
        if ((uploaded || removeLogo) && st.logo_url) api.deleteImage(st.logo_url);
        S.settings = saved;
        paintBrand();
        S.toast('Сохранено. Гости увидят изменения при следующем обновлении меню.');
        renderRestaurant();
      } catch (ex) {
        if (uploaded) api.deleteImage(uploaded);
        err(S.errText(ex));
        btn.disabled = false;
        btn.innerHTML = `${icon('check', 'sm')}Сохранить изменения`;
      }
    });
  }

  // ---------- SMS (Twilio): ключи только записываются, наружу — хвост SID и номер ----------
  function paintSmsSwitch(info) {
    const box = document.querySelector('[data-dv-sms]');
    const hint = $('#dv-sms-hint');
    if (!box || !hint) return;
    const ok = !!info?.configured;
    box.dataset.known = info ? '1' : '';
    box.disabled = !ok;
    if (!ok) box.checked = false;
    hint.textContent = !info ? 'Не получилось узнать, настроены ли SMS — обновите страницу.'
      : ok ? 'Без кода из SMS гость не сможет заказать доставку. Код приходит с вашего номера Twilio; каждое SMS Twilio берёт в счёт.'
        : 'Сначала подключите SMS ниже (Twilio) — до этого включить нельзя.';
  }
  async function renderSms() {
    const box = $('#sms-panel .panel-body');
    if (!box) return;
    let info;
    try { info = await api.smsStatus(); } catch (ex) { paintSmsSwitch(null); box.innerHTML = `<p class="notice bad">${icon('alert')}<span>${esc(S.errText(ex))}</span></p>`; return; }
    if (!box.isConnected) return;
    paintSmsSwitch(info);
    box.innerHTML = `
      <p class="${info?.configured ? 'notice ok' : 'help'}">${info?.configured ? `${icon('check')}<span>Подключено: аккаунт ${esc(info.sid_tail || '')}, SMS уходят с номера ${esc(info.from || '')}.</span>` : 'Не подключено. Нужен аккаунт Twilio с номером, который может отправлять SMS в Малайзию.'}</p>
      <ol class="tg-steps">
        <li>Зарегистрируйтесь на <b>twilio.com</b> и купите номер с SMS (Phone Numbers → Buy a number).</li>
        <li>В Console → Account Info скопируйте <b>Account SID</b> и <b>Auth Token</b>.</li>
        <li>Вставьте их ниже вместе с номером и нажмите «Сохранить SMS». Затем включите «Проверка номера по SMS» в разделе «Доставка» и сохраните.</li>
        <li>Обязательно: в Twilio → Messaging → Settings → <b>Geo permissions</b> оставьте включённой только <b>Malaysia</b>. Коды и так уходят только на номера +60, но так никто не сможет отправить дорогие SMS за границу за ваш счёт.</li>
      </ol>
      <form id="sms-form" novalidate>
        <div class="form-grid">
          <label class="field full"><span>Account SID</span><input name="sid" type="text" autocomplete="off" spellcheck="false" maxlength="40" placeholder="AC…" value=""></label>
          <label class="field full"><span>Auth Token${info?.configured ? ' (сохранён — оставьте пустым, чтобы не менять)' : ''}</span><input name="token" type="password" autocomplete="new-password" spellcheck="false" maxlength="64" placeholder="${info?.configured ? 'сохранён' : '32 знака'}"></label>
          <label class="field full"><span>Номер отправителя (Twilio)</span><input name="from" type="tel" inputmode="tel" autocomplete="off" maxlength="20" placeholder="+1…" value="${esc(info?.from || '')}"></label>
        </div>
        <p class="notice bad" id="sms-err" role="alert" hidden></p>
        <div class="row-btns" style="display:flex;flex-wrap:wrap;gap:8px;margin-top:12px">
          <button type="submit" class="btn">${icon('check', 'sm')}Сохранить SMS</button>
          ${info?.configured || info?.sid_tail ? `<button type="button" class="btn ghost danger" data-sms-clear>${icon('trash', 'sm')}Отключить SMS</button>` : ''}
        </div>
        <p class="help">Auth Token хранится только на сервере: ни вы, ни официанты его больше не увидите. Account SID нужно вписывать заново при каждом сохранении.</p>
      </form>`;
    const f = $('#sms-form');
    const serr = (m) => { const e = $('#sms-err'); e.hidden = !m; e.innerHTML = m ? `${icon('alert')}<span>${esc(m)}</span>` : ''; };
    const smsErr = (ex) => {
      const m = String(ex?.message || '');
      return /bad_sid/.test(m) ? 'Account SID: начинается с AC, дальше 32 знака (Twilio → Console → Account Info).'
        : /bad_token/.test(m) ? 'Auth Token: 32 знака из Twilio → Console → Account Info.'
          : /bad_from/.test(m) ? 'Номер отправителя: номер Twilio в международном виде, например +1 415 555 0100.' : S.errText(ex);
    };
    f.addEventListener('submit', async (e) => {
      e.preventDefault();
      serr('');
      const sid = String(f.sid.value || '').trim();
      const token = String(f.token.value || '').trim();
      const from = String(f.from.value || '').trim();
      if (!/^AC[0-9a-fA-F]{32}$/.test(sid)) return serr('Account SID: начинается с AC, дальше 32 знака (Twilio → Console → Account Info).');
      if (!token && !info?.configured) return serr('Вставьте Auth Token.');
      const btn = f.querySelector('[type="submit"]');
      btn.disabled = true;
      try {
        await api.setSms(sid, token, from);
        S.toast('SMS сохранены. Теперь можно включить проверку номера в разделе «Доставка».');
        renderSms();
      } catch (ex) { serr(smsErr(ex)); btn.disabled = false; }
    });
    f.querySelector('[data-sms-clear]')?.addEventListener('click', async () => {
      if (!await S.ask('Отключить SMS? Ключи Twilio сотрутся, проверка номера по SMS выключится.', { ok: 'Отключить', cancel: 'Не отключать' })) return;
      try {
        await api.setSms('', '', '');
        S.settings = { ...S.settings, dv_sms: false };
        S.toast('SMS отключены');
        renderSms();
      } catch (ex) { serr(smsErr(ex)); }
    });
  }

  // ---------- Telegram ----------
  async function renderTelegram() {
    const box = $('#tg-panel .panel-body');
    if (!box) return;
    let st;
    try { st = await api.telegramStatus(); } catch (ex) { box.innerHTML = `<p class="notice bad">${icon('alert')}<span>${esc(S.errText(ex))}</span></p>`; return; }
    st = st || {};
    box.innerHTML = `
      <p class="${st.connected ? 'notice ok' : 'help'}">${st.connected ? `${icon('check')}<span>Подключено: бот ${esc(st.bot_username ? '@' + st.bot_username : st.bot_hint || '')}, ваших чатов: ${st.chats}. Сотрудников со своим Telegram: ${st.staff_linked || 0}.</span>` : 'Не подключено. Новые заказы и вызовы будут приходить вам в Telegram, даже когда панель закрыта.'}</p>
      ${st.bot_hint ? '<p class="help">Официанты и повара подключают свой Telegram сами: на своей странице → «Смена» (у повара — «Настройки») → «Подключить Telegram». Официант получает вызовы, «принесите счёт» и заказы своих столов, повар — каждый новый заказ сразу.</p>' : ''}
      ${st.net_ok === false ? `<p class="notice bad">${icon('alert')}<span>На сервере выключено расширение pg_net — сообщения не уйдут. Запустите schema.sql ещё раз.</span></p>` : ''}
      <ol class="tg-steps">
        <li>В Telegram откройте <b>@BotFather</b>, отправьте <b>/newbot</b>, придумайте имя — он пришлёт <b>токен</b>.</li>
        <li>Вставьте токен ниже.</li>
        <li>Откройте своего нового бота и напишите ему любое сообщение, например «привет».</li>
        <li>Нажмите «Найти мой чат», затем «Сохранить» и «Проверить».</li>
      </ol>
      <form id="tg-form" novalidate>
        <div class="form-grid">
          <label class="field full"><span>Токен бота${st.bot_hint ? ` (сейчас ${esc(st.bot_hint)} — оставьте пустым, чтобы не менять)` : ''}</span><input name="token" type="password" autocomplete="off" spellcheck="false" placeholder="123456789:AA…"></label>
          <label class="field full"><span>Чаты (через запятую, до 5)</span><input name="chats" type="text" inputmode="numeric" autocomplete="off" value="" placeholder="например 123456789"></label>
        </div>
        <div class="checks" style="margin-top:10px">
          <label><input type="checkbox" name="orders"${st.notify_orders !== false ? ' checked' : ''}>Новые заказы</label>
          <label><input type="checkbox" name="calls"${st.notify_calls !== false ? ' checked' : ''}>Вызовы гостей и просьбы счёта</label>
          <label><input type="checkbox" name="bills"${st.notify_bills ? ' checked' : ''}>Оплаченные счета</label>
          <label><input type="checkbox" name="reviews"${st.notify_reviews !== false ? ' checked' : ''}>Отзывы гостей</label>
        </div>
        <p class="notice bad" id="tg-err" hidden></p>
        <div class="btn-row">
          <button type="button" class="btn ghost" id="tg-find">${icon('search', 'sm')}Найти мой чат</button>
          <button type="submit" class="btn">${icon('check', 'sm')}Сохранить</button>
          ${st.connected ? `<button type="button" class="btn ghost" id="tg-test">${icon('send', 'sm')}Проверить</button><button type="button" class="btn danger" id="tg-off">Отключить</button>` : ''}
        </div>
      </form>`;
    const form = $('#tg-form');
    const err = (m) => { const e = $('#tg-err'); e.hidden = !m; e.textContent = m || ''; };
    if (st.chats) form.chats.placeholder = `сейчас подключено чатов: ${st.chats} — впишите заново, чтобы изменить`;
    $('#tg-find').addEventListener('click', async () => {
      err('');
      const token = form.token.value.trim();
      if (!token) { err('Сначала вставьте токен бота.'); return; }
      try {
        const r = await fetch(`https://api.telegram.org/bot${encodeURIComponent(token).replace('%3A', ':')}/getUpdates`).then((x) => x.json());
        if (!r.ok) { err('Telegram не принял токен. Проверьте, что скопировали его целиком.'); return; }
        const ids = [...new Set((r.result || []).map((u) => (u.message || u.my_chat_member || u.channel_post)?.chat?.id).filter(Boolean).map(String))];
        if (!ids.length) { err('Сообщений боту пока нет. Откройте бота в Telegram, напишите ему «привет» и нажмите ещё раз.'); return; }
        form.chats.value = ids.slice(0, 5).join(', ');
        S.toast('Чат найден. Теперь нажмите «Сохранить».');
      } catch { err('Не получилось связаться с Telegram. Проверьте интернет.'); }
    });
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      err('');
      const token = form.token.value.trim() || null;
      const chats = form.chats.value.split(/[\s,;]+/).map((x) => x.trim()).filter(Boolean);
      if (!st.bot_hint && !token) { err('Вставьте токен бота.'); return; }
      if (!chats.length) { err('Нажмите «Найти мой чат» или впишите номер чата.'); return; }
      try {
        await api.setTelegram(token, chats, form.orders.checked, form.calls.checked, form.bills.checked);
        await api.setTelegramReviews(form.reviews.checked);
        S.toast('Telegram подключён. Нажмите «Проверить».');
        renderTelegram();
      } catch (ex) {
        const m = String(ex?.message || '');
        err(/bad_token/.test(m) ? 'Токен не похож на токен бота: цифры, двоеточие, потом длинный код.' : /bad_chat/.test(m) ? 'Номер чата — только цифры (у групп с минусом впереди).' : S.errText(ex));
      }
    });
    $('#tg-test')?.addEventListener('click', async () => {
      try { const n = await api.telegramTest(); S.toast(n ? 'Проверочное сообщение отправлено — посмотрите Telegram.' : 'Не отправлено: проверьте токен и чат.', !n); } catch (ex) { S.toast(S.errText(ex), true); }
    });
    $('#tg-off')?.addEventListener('click', async () => {
      if (!await S.ask('Отключить уведомления в Telegram?', { ok: 'Отключить' })) return;
      try { await api.clearTelegram(); S.toast('Telegram отключён'); renderTelegram(); } catch (ex) { S.toast(S.errText(ex), true); }
    });
  }

  function SCHED_NIGHT(d) {
    const m = (s) => { const [h, mm] = String(s).split(':').map(Number); return h * 60 + mm; };
    return d.open && d.close && m(d.close) < m(d.open) ? 'до следующего дня' : '';
  }
  function initials(name) {
    const words = String(name || '').split(/\s+/).filter((w) => /\p{L}/u.test(w));
    return (words.slice(0, 2).map((w) => w.match(/\p{L}/u)[0]).join('') || 'R').toUpperCase();
  }
  function paintBrand() {
    const st = S.settings;
    $('#a-sub').textContent = st?.name || '';
    $('#a-logo').innerHTML = st?.logo_url ? `<img src="${esc(st.logo_url)}" alt="">` : esc(initials(st?.name));
  }

  // =================================================================
  //  СОТРУДНИКИ
  // =================================================================
  async function loadStaff() {
    [staff, invites] = await Promise.all([api.staff(), api.invites()]);
  }

  function renderStaff() {
    const staffLink = new URL('admin.html', location.href).href;
    $('#a-main').innerHTML = `
      <section class="panel"><div class="panel-head"><h3>Пригласить сотрудника</h3></div><div class="panel-body">
        <form id="invite-form" class="form-grid" novalidate>
          <label class="field"><span>Email сотрудника</span><input name="email" type="email" inputmode="email" required autocomplete="off"></label>
          <label class="field"><span>Имя (необязательно)</span><input name="name" type="text" maxlength="60"></label>
          <label class="field"><span>Роль</span><select name="role"><option value="waiter">Официант — зал: заказы, вызовы, счета</option><option value="cook">Повар — экран кухни</option><option value="courier">Курьер — доставка: забирает заказ, отвозит, берёт оплату</option><option value="manager">Менеджер — зал, скидки, отмена оплаты, закрытие дня, отчёты</option><option value="owner">Владелец — полный доступ</option></select></label>
          <div class="field" style="justify-content:flex-end"><button class="btn" type="submit">${icon('mail', 'sm')}Пригласить</button></div>
        </form>
        <p class="help" style="margin:12px 0 0">Как это работает: вы приглашаете email → сотрудник открывает <b>${esc(staffLink)}</b>, выбирает «Меня пригласили — зарегистрироваться» и подтверждает email из письма. Доступ появится сам.</p>
        <button type="button" class="btn small ghost" id="copy-link" style="margin-top:8px">Скопировать ссылку для сотрудника</button>
      </div></section>

      ${invites.length ? `<section class="panel"><div class="panel-head"><h3>Ждут регистрации<small>${invites.length}</small></h3></div>
        <ul class="rows">${invites.map((i) => `<li>
          <div class="grow"><b>${esc(i.email)}</b><small>${esc([i.name, ({ owner: 'владелец', manager: 'менеджер', waiter: 'официант', cook: 'повар', courier: 'курьер' })[i.role] || i.role].filter(Boolean).join(' · '))}</small></div>
          <div class="row-btns"><button type="button" class="btn small danger" data-revoke="${esc(i.email)}">Отменить приглашение</button></div>
        </li>`).join('')}</ul></section>` : ''}

      <section class="panel"><div class="panel-head"><h3>Сотрудники<small>${staff.length}</small></h3></div>
        <ul class="rows">${staff.map((s) => {
          const self = s.user_id === me.id;
          return `<li class="${s.active ? '' : 'is-off'}">
            <div class="grow"><b>${esc(s.name || s.email)}${self ? ' (это вы)' : ''}</b><small>${esc(s.email)}</small></div>
            <div class="row-btns">
              <label class="field" style="margin:0"><select data-role="${esc(s.user_id)}" aria-label="Роль"${self ? ' disabled' : ''}>
                <option value="waiter"${s.role === 'waiter' ? ' selected' : ''}>Официант</option>
                <option value="cook"${s.role === 'cook' ? ' selected' : ''}>Повар</option>
                <option value="courier"${s.role === 'courier' ? ' selected' : ''}>Курьер</option>
                <option value="manager"${s.role === 'manager' ? ' selected' : ''}>Менеджер</option>
                <option value="owner"${s.role === 'owner' ? ' selected' : ''}>Владелец</option></select></label>
              ${sw(`data-active="${esc(s.user_id)}" aria-label="Доступ: ${esc(s.email)}"`, s.active, 'Доступ', self)}
              ${self ? '' : `<button type="button" class="btn small danger" data-remove="${esc(s.user_id)}" aria-label="Удалить ${esc(s.email)}">${icon('trash', 'sm')}</button>`}
            </div>
          </li>`;
        }).join('')}</ul></section>`;

    $('#copy-link').addEventListener('click', async () => {
      try { await navigator.clipboard.writeText(staffLink); S.toast('Ссылка скопирована'); } catch { await S.ask('Скопируйте ссылку:', { ok: 'Готово', cancel: 'Закрыть', input: staffLink }); }
    });
    $('#invite-form').addEventListener('submit', async (e) => {
      e.preventDefault();
      const f = new FormData(e.target);
      const email = String(f.get('email') || '').trim().toLowerCase();
      if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) { S.toast('Проверьте email.', true); return; }
      try {
        const r = await api.invite(email, f.get('role'), String(f.get('name') || '').trim());
        S.toast(r === 'added' ? 'Аккаунт уже был — доступ выдан сразу' : 'Приглашение создано. Отправьте сотруднику ссылку.');
        await loadStaff();
        renderStaff();
      } catch (ex) { S.toast(S.errText(ex), true); }
    });
  }

  async function staffAction(fn, ok) {
    try { await fn(); S.toast(ok); } catch (ex) { S.toast(S.errText(ex), true); }
    await loadStaff();
    renderStaff();
  }

  // =================================================================
  //  ЗАКАЗЫ
  // =================================================================
  // без «принять / готовится / готово»: заказ ждёт подачи → подан (или отменён)
  const ST = { new: 'Ждёт подачи', served: 'Подан', cancelled: 'Отменён' };
  const ACTIVE = ['new', 'accepted', 'cooking', 'ready'];
  const stOf = (s) => (ACTIVE.includes(s) ? 'new' : s);
  // доставка своим курьером: свои этапы (принята → готовится → в пути → доставлен), без стола
  const isDeliv = (o) => window.Floor.isDeliv(o);
  const isActive = (o) => (isDeliv(o) ? (o.status === 'confirm' || window.Floor.DELIV_OPEN.includes(o.status)) && !o.paid_at : ACTIVE.includes(o.status));
  const isCall = (o) => isDeliv(o) && o.status === 'confirm';   // доставка ждёт звонка ресторана
  const placeOf = (o) => (isDeliv(o) ? `доставка, ${o.customer_name || 'гость'}` : `стол ${o.table_label}`);
  const pad = (n) => String(n).padStart(2, '0');
  const localDate = (d = new Date()) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  const dayStart = (d = new Date()) => { const x = new Date(d); x.setHours(0, 0, 0, 0); return x; };
  const hhmm = (iso) => new Date(iso).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' });
  const ago = (iso) => {
    const m = Math.max(0, Math.floor((Date.now() - new Date(iso).getTime()) / 60000));
    if (m < 1) return 'только что';
    if (m < 60) return `${m} мин назад`;
    return `${Math.floor(m / 60)} ч ${m % 60} мин назад`;
  };

  let orders = [];
  let history = [];
  let ordersView = 'active';
  let historyDay = localDate();
  let ordersLive = false;
  let seenOrders = null;       // id заказов, которые уже показывали (чтобы звенеть только на новые)
  const busyOrders = new Set();

  // ---------- звук и уведомления ----------
  let audio = null;
  let soundOn = (() => { try { return localStorage.getItem('owner:sound') !== '0'; } catch { return true; } })();
  function unlockAudio() {
    try {
      if (!audio) audio = new (window.AudioContext || window.webkitAudioContext)();
      if (audio.state === 'suspended') audio.resume();
    } catch { /* без звука */ }
    renderBanner();
  }
  ['pointerdown', 'keydown'].forEach((ev) => document.addEventListener(ev, unlockAudio, { capture: true }));
  function ding() {
    if (!soundOn || !audio || audio.state !== 'running') return;
    const t0 = audio.currentTime;
    [0, 0.22, 0.44].forEach((dt, i) => {
      const o = audio.createOscillator();
      const g = audio.createGain();
      o.type = 'sine';
      o.frequency.value = i === 2 ? 1175 : 880;
      g.gain.setValueAtTime(0.0001, t0 + dt);
      g.gain.exponentialRampToValueAtTime(0.45, t0 + dt + 0.02);
      g.gain.exponentialRampToValueAtTime(0.0001, t0 + dt + 0.2);
      o.connect(g).connect(audio.destination);
      o.start(t0 + dt);
      o.stop(t0 + dt + 0.22);
    });
  }
  let bannerMsg = '';
  // ---------- Резервная копия ----------
  // Бесплатный Supabase сам копий не делает: владелец скачивает всё одним файлом, раз в неделю напоминаем.
  const BACKUP_DAYS = 7;
  const backupDue = () => me?.role === 'owner' && S.settings && (!S.settings.backup_at || Date.now() - new Date(S.settings.backup_at).getTime() > BACKUP_DAYS * 864e5);
  const backupText = () => (S.settings?.backup_at
    ? `Резервная копия: последняя ${new Date(S.settings.backup_at).toLocaleDateString('ru-RU', { day: 'numeric', month: 'long' })}.`
    : 'Резервную копию ещё ни разу не скачивали.');
  let backupBusy = false;
  async function downloadBackup(btn) {
    if (backupBusy || me?.role !== 'owner') return;
    backupBusy = true;
    const was = btn?.innerHTML;
    if (btn) { btn.disabled = true; btn.textContent = 'Собираем копию…'; }
    try {
      const [settings, categories, dishes, tables, staffRows, invites, wifi, orders, bills, zReports, reviews] = await Promise.all([
        api.dump('settings', 'id'), api.dump('categories', 'sort'), api.dump('dishes', 'sort'), api.dump('tables', 'sort'),
        api.dump('staff', 'created_at', 'user_id'), api.dump('staff_invites', 'created_at', 'email'), api.wifi().catch(() => null),
        api.dump('orders', 'created_at'), api.dump('bills', 'paid_at'), api.dump('z_reports', 'closed_at'), api.dump('reviews', 'created_at'),
      ]);
      const now = new Date();
      const data = {
        app: 'central-asia-menu', kind: 'backup', version: 1, created_at: now.toISOString(),
        note: 'Резервная копия ресторана: меню, столы (с кодами QR), сотрудники, Wi‑Fi, все заказы, счета, Z-отчёты и отзывы. Храните в надёжном месте — здесь коды столов и пароль Wi‑Fi.',
        counts: { categories: categories.length, dishes: dishes.length, tables: tables.length, staff: staffRows.length, orders: orders.length, bills: bills.length, z_reports: zReports.length, reviews: reviews.length },
        settings: settings[0] || null, categories, dishes, tables, staff: staffRows, staff_invites: invites, wifi, orders, bills, z_reports: zReports, reviews,
      };
      const pad = (n) => String(n).padStart(2, '0');
      const name = `central-asia-backup-${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}.json`;
      const url = URL.createObjectURL(new Blob([JSON.stringify(data, null, 1)], { type: 'application/json' }));
      const a = document.createElement('a');
      a.href = url; a.download = name; document.body.appendChild(a); a.click(); a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 60000);
      const at = await api.markBackup();
      S.settings = { ...S.settings, backup_at: at };
      S.toast(`Копия скачана: ${name} (заказов ${orders.length}, счетов ${bills.length})`);
      renderBanner();
      if (tab === 'restaurant') renderRestaurant();
    } catch (ex) {
      S.toast(`Копию не получилось собрать: ${S.errText(ex)}`, true);
      if (btn && btn.isConnected) { btn.disabled = false; btn.innerHTML = was; }
    }
    backupBusy = false;
  }

  function renderBanner() {
    const el = $('#a-banner');
    if (!el || !api) return;
    const needSound = soundOn && (!audio || audio.state !== 'running');
    const parts = [];
    if (bannerMsg) parts.push(`<button type="button" class="banner-new" data-banner="orders">${icon('bell')}<span>${esc(bannerMsg)}</span></button>`);
    if (needSound) parts.push(`<button type="button" class="banner-sound" data-banner="sound">${icon('bell')}<span>Нажмите здесь, чтобы включить звук новых заказов</span></button>`);
    if (backupDue()) parts.push(`<button type="button" class="banner-sound" data-banner="backup">${icon('download')}<span>${esc(backupText())} Нажмите, чтобы скачать копию.</span></button>`);
    el.hidden = !parts.length;
    el.innerHTML = parts.join('');
  }
  function announce(fresh) {
    const calls = fresh.filter(isCall);
    if (calls.length) {
      const c = calls[calls.length - 1];
      bannerMsg = calls.length > 1 ? `Ждут звонка: ${calls.length}` : `Доставка №${c.no} ждёт звонка — позвоните гостю`;
      renderBanner();
      if (soundOn) window.Floor.chime(audio, 'confirm');
      try {
        if ('Notification' in window && Notification.permission === 'granted' && document.hidden) new Notification(bannerMsg, { body: `${money(c.total)} · ${c.customer_name || ''}`, tag: 'order-' + c.id, icon: 'icon.svg' });
      } catch { /* без системных уведомлений */ }
      return;
    }
    const o = fresh[fresh.length - 1];
    bannerMsg = fresh.length > 1 ? `Новых заказов: ${fresh.length}` : isDeliv(o) ? `Новая доставка №${o.no}${o.distance_km != null ? ` · ${window.Floor.kmText(o.distance_km)}` : ''}` : `Новый заказ №${o.no} — стол ${o.table_label}`;
    renderBanner();
    ding();
    try {
      if ('Notification' in window && Notification.permission === 'granted' && document.hidden) {
        new Notification(bannerMsg, { body: `${money(o.total)} · ${o.items.length} поз.`, tag: 'order-' + o.id, icon: 'icon.svg' });
      }
    } catch { /* без системных уведомлений */ }
  }
  // пока гость ждёт звонка — напоминаем каждые 30 секунд
  setInterval(() => { if (api && soundOn && orders.some(isCall)) window.Floor.chime(audio, 'confirm'); }, 30000);
  function updateCount() {
    // ждут подачи (столы) + новые доставки, которые ещё никто не принял
    const n = orders.filter((o) => (isDeliv(o) ? ['confirm', 'new'].includes(o.status) : ACTIVE.includes(o.status))).length;
    const el = $('#tab-count');
    if (el) { el.hidden = !n; el.textContent = n; }
    const c = floor ? floor.openCalls().length : 0;
    const ce = $('#calls-count');
    if (ce) { ce.hidden = !c; ce.textContent = c; }
    const who = me?.role === 'owner' ? 'владельца' : 'менеджера';
    document.title = n ? `(${n}) Ждут подачи — панель ${who}` : c ? `(${c}) Вызов — панель ${who}` : `Панель ${who}`;
  }
  function announceCalls(fresh) {
    const c = fresh[fresh.length - 1];
    bannerMsg = fresh.length > 1 ? `Вызовов: ${fresh.length}` : `Стол ${c.table_label}: ${c.kind === 'bill' ? 'просят счёт' : 'зовут официанта'}`;
    renderBanner();
    ding();
    updateCount();
    if (tab === 'floor' && !document.querySelector('.modal')) render();
  }

  async function loadOrders() {
    const rows = await api.orders(dayStart().toISOString());
    const fresh = seenOrders ? rows.filter((o) => (o.status === 'new' || isCall(o)) && !seenOrders.has(o.id)) : [];
    seenOrders = new Set([...(seenOrders || []), ...rows.map((o) => o.id)]);
    orders = rows;
    if (fresh.length) announce(fresh);
    updateCount();
  }
  async function loadHistory() {
    const from = new Date(`${historyDay}T00:00:00`);
    const to = new Date(from.getTime() + 24 * 60 * 60 * 1000);
    history = await api.orders(from.toISOString(), to.toISOString());
  }

  function orderCard(o) {
    if (isDeliv(o)) {
      // доставку отменяет владелец или менеджер (пока не оплачена); принять — как заказ стола
      const b = busyOrders.has(o.id) ? ' disabled' : '';
      // ждёт звонка: только «Позвонить / Принять заказ / Не дозвонились» на самой карточке
      const extra = isCall(o) ? '' : o.status === 'cancelled' ? `<button type="button" class="btn small ghost" data-order-next="${esc(o.id)}" data-to="confirm"${b}>Вернуть заказ</button>`
        : !o.paid_at ? `<button type="button" class="btn small danger" data-order-cancel="${esc(o.id)}"${b}>Отменить</button>` : '';
      return floor.delivCard(o, extra);
    }
    const st = stOf(o.status);
    const busy = busyOrders.has(o.id);
    return `<article class="o-card${st === 'new' ? ' is-new' : ''}">
      <div class="o-head"><b class="o-table">${icon('qr', 'sm')}Стол ${esc(o.table_label)}</b><span class="st st-${esc(st)}">${esc(ST[st] || st)}</span></div>
      <div class="o-meta">Заказ №${esc(o.no)} · ${esc(hhmm(o.created_at))} · ${esc(ago(o.created_at))}${o.lang ? ` · язык гостя ${esc(String(o.lang).toUpperCase())}` : ''}${o.source === 'staff' && o.created_by_name ? ` · пробил: ${esc(o.created_by_name)}` : ''}${st === 'served' && o.served_by_name ? ` · подал: ${esc(o.served_by_name)}` : ''}</div>
      <ul class="o-items">${(o.items || []).map((i) => `<li><span><b>${esc(i.qty)}×</b> ${esc(tr(i.name) || i.id)}${window.Floor.optNames(i).length ? `<em class="o-opt">${esc(window.Floor.optNames(i).join(', '))}</em>` : ''}${window.Floor.noteHtml(i)}</span><span>${money(i.price * i.qty)}</span></li>`).join('')}</ul>
      ${o.note ? `<div class="o-note"><b>Пожелания гостя:</b> ${esc(window.Floor.trNote(o.note))}</div>` : ''}
      ${o.edited_at ? `<div class="o-meta">Изменён${o.edited_by_name ? `: ${esc(o.edited_by_name)}` : ''} в ${esc(hhmm(o.edited_at))}</div>` : ''}
      ${Number(o.service) || Number(o.tax) ? `<div class="o-meta">Блюда ${money(o.subtotal ?? o.total)}${Number(o.service) ? ` · сбор ${money(o.service)}` : ''}${Number(o.tax) ? ` · налог ${money(o.tax)}` : ''}</div>` : ''}
      <div class="o-total"><span>Итого${o.paid_at ? ' · <span class="state-badge ok">оплачено</span>' : ''}</span><b>${money(o.total)}</b></div>
      <div class="o-actions">
        ${st === 'new' ? `<button type="button" class="btn" data-order-next="${esc(o.id)}" data-to="served"${busy ? ' disabled' : ''}>${icon('check', 'sm')}Подано</button>` : ''}
        ${st === 'served' && !o.paid_at ? `<button type="button" class="btn small ghost" data-order-next="${esc(o.id)}" data-to="new"${busy ? ' disabled' : ''}>Вернуть в «Ждёт подачи»</button>` : ''}
        ${st === 'cancelled' ? `<button type="button" class="btn small ghost" data-order-next="${esc(o.id)}" data-to="new"${busy ? ' disabled' : ''}>Вернуть заказ</button>` : ''}
        ${o.status !== 'cancelled' && !o.paid_at ? `<button type="button" class="btn small danger" data-order-cancel="${esc(o.id)}"${busy ? ' disabled' : ''}>Отменить</button>` : ''}
      </div>
      ${o.status !== 'cancelled' ? `<div class="o-actions">
        <button type="button" class="btn small ghost" data-fl-ticket="${esc(o.id)}">${icon('printer', 'sm')}На кухню</button>
        ${!o.paid_at ? `<button type="button" class="btn small ghost" data-fl-edit="${esc(o.id)}">${icon('edit', 'sm')}Изменить</button>` : ''}
        ${o.table_id && !o.paid_at ? `<button type="button" class="btn small ghost" data-fl-table="${esc(o.table_id)}">Счёт стола</button>` : ''}
      </div>` : ''}
    </article>`;
  }

  function renderOrders() {
    const main = $('#a-main');
    const today = dayStart().getTime();
    const todays = orders.filter((o) => new Date(o.created_at).getTime() >= today);
    // доставки, которые ждут звонка, — первыми
    const active = orders
      .filter(isActive)
      .sort((a, b) => isCall(b) - isCall(a) || new Date(a.created_at) - new Date(b.created_at));
    // ждущая звонка доставка — ещё не заказ: не в сумме и не в счётчике
    const counted = (o) => o.status !== 'cancelled' && o.status !== 'confirm';
    const sum = (list) => list.filter(counted).reduce((s, o) => s + Number(o.total), 0);
    const list = ordersView === 'active' ? active : [...history].sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
    const canNotify = 'Notification' in window && Notification.permission === 'default';
    const off = !S.settings?.orders_enabled;

    main.innerHTML = `
      ${off ? `<p class="notice bad">${icon('alert')}<span>Приём заказов из меню выключен (раздел «Ресторан»). Гости не могут отправить заказ.</span></p>` : ''}
      ${me?.role === 'owner' && !tables.length ? `<p class="notice">${icon('alert')}<span>Столов ещё нет — гости не смогут заказать. Создайте столы и распечатайте QR-коды в разделе «Столы и QR».</span></p>` : ''}
      <div class="a-stats">
        <div class="a-stat${active.length ? ' hot' : ''}"><b>${active.length}</b><span>${active.some(isDeliv) ? `активные · доставок ${active.filter(isDeliv).length}` : 'ждут подачи'}</span></div>
        <div class="a-stat"><b>${todays.filter((o) => o.status === 'served').length}</b><span>подано сегодня</span></div>
        <div class="a-stat"><b>${todays.filter((o) => o.status === 'cancelled').length}</b><span>отменено сегодня</span></div>
        <div class="a-stat"><b>${money(sum(todays))}</b><span>заказов сегодня: ${todays.filter(counted).length}</span></div>
      </div>
      <div class="toolbar">
        <div class="chips" style="margin:0">
          <button type="button" class="chip${ordersView === 'active' ? ' active' : ''}" data-ov="active">Активные<b>${active.length}</b></button>
          <button type="button" class="chip${ordersView === 'history' ? ' active' : ''}" data-ov="history">История</button>
        </div>
        ${ordersView === 'history' ? `<label class="field" style="margin:0"><span class="sr-only">День</span><input type="date" id="hist-day" value="${esc(historyDay)}" max="${esc(localDate())}"></label>` : ''}
        <span class="grow"></span>
        <span class="live-dot${ordersLive ? '' : ' off'}">${ordersLive ? 'Заказы приходят сразу' : 'Проверка каждые 15 секунд'}</span>
        <button type="button" class="btn small ghost" data-sound>${icon('bell', 'sm')}${soundOn ? 'Звук включён' : 'Звук выключен'}</button>
        ${canNotify ? `<button type="button" class="btn small ghost" data-notify>${icon('bell', 'sm')}Уведомления на этом устройстве</button>` : ''}
      </div>
      ${ordersView === 'history' ? `<p class="help">${esc(historyDay)}: заказов ${history.filter(counted).length}, сумма ${money(sum(history))}, отменено ${history.filter((o) => o.status === 'cancelled').length}.</p>` : ''}
      ${list.length ? `<div class="o-grid">${list.map(orderCard).join('')}</div>`
        : `<div class="a-empty">${ordersView === 'active' ? 'Активных заказов нет. Новый заказ появится здесь сам — со звуком.' : 'В этот день заказов не было.'}</div>`}`;
  }

  async function setOrderStatus(id, status) {
    const o = orders.find((x) => x.id === id) || history.find((x) => x.id === id);
    if (!o || busyOrders.has(id)) return;
    if (status === 'cancelled' && !await S.ask(`Отменить заказ №${o.no} (${placeOf(o)})? Гость увидит, что заказ отменён.${isDeliv(o) && o.status === 'on_the_way' ? ` Курьер ${o.courier_name || ''} уже везёт его — позвоните курьеру.` : ''}`, { ok: 'Отменить заказ', cancel: 'Не отменять' })) { render(); return; }
    busyOrders.add(id);
    render();
    try {
      // «Подано» — через сервер: он запишет, кто подал
      const saved = status === 'served' ? await api.serveOrder(id) : await api.setOrderStatus(id, status);
      orders = orders.map((x) => (x.id === id ? saved : x));
      history = history.map((x) => (x.id === id ? saved : x));
      if (status !== 'new' && bannerMsg && !orders.some((x) => ACTIVE.includes(x.status))) { bannerMsg = ''; renderBanner(); }
      S.toast(`Заказ №${o.no}: ${isDeliv(o) ? window.Floor.delivSt(saved?.status || status) : ST[stOf(saved?.status || status)]}`);
    } catch (ex) {
      S.toast(S.errText(ex), true);
    } finally {
      busyOrders.delete(id);
      updateCount();
      render();
    }
  }

  // =================================================================
  //  СТОЛЫ И QR-КОДЫ
  // =================================================================
  let tables = [];
  const menuBase = () => new URL('./', location.href).href;
  const tableUrl = (tb) => `${menuBase()}?t=${tb.token}`;
  const hasQr = () => typeof window.qrcode === 'function';

  function qrModules(text) {
    const q = window.qrcode(0, 'M');
    q.addData(text);
    q.make();
    return q;
  }
  function qrSvg(text, cls = 'qr-svg') {
    if (!hasQr()) return '';
    const q = qrModules(text);
    const n = q.getModuleCount();
    let d = '';
    for (let r = 0; r < n; r++) for (let c = 0; c < n; c++) if (q.isDark(r, c)) d += `M${c + 2} ${r + 2}h1v1h-1z`;
    return `<svg class="${cls}" viewBox="0 0 ${n + 4} ${n + 4}" shape-rendering="crispEdges" role="img" aria-label="QR-код"><rect width="${n + 4}" height="${n + 4}" fill="#fff"/><path d="${d}" fill="#24190F"/></svg>`;
  }
  function downloadPng(tb) {
    const q = qrModules(tableUrl(tb));
    const n = q.getModuleCount();
    const W = 900;
    const H = 1200;
    const cv = document.createElement('canvas');
    cv.width = W;
    cv.height = H;
    const g = cv.getContext('2d');
    g.fillStyle = '#FFFFFF';
    g.fillRect(0, 0, W, H);
    g.fillStyle = '#24190F';
    g.textAlign = 'center';
    g.font = '700 54px Georgia, serif';
    g.fillText(S.settings?.name || '', W / 2, 120, W - 80);
    const size = 680;
    const cell = Math.floor(size / (n + 4));
    const x0 = Math.round((W - cell * (n + 4)) / 2);
    const y0 = 170;
    for (let r = 0; r < n; r++) for (let c = 0; c < n; c++) if (q.isDark(r, c)) g.fillRect(x0 + (c + 2) * cell, y0 + (r + 2) * cell, cell, cell);
    g.fillStyle = '#B5462E';
    g.font = '800 72px Helvetica, Arial, sans-serif';
    g.fillText(`Стол ${tb.label}`, W / 2, y0 + cell * (n + 4) + 110);
    g.fillStyle = '#6F5E4A';
    g.font = '500 34px Helvetica, Arial, sans-serif';
    g.fillText('Наведите камеру — откроется меню · Scan for the menu', W / 2, H - 70, W - 80);
    const a = document.createElement('a');
    a.href = cv.toDataURL('image/png');
    a.download = `qr-stol-${String(tb.label).replace(/[^\p{L}\p{N}-]+/gu, '-')}.png`;
    document.body.appendChild(a);
    a.click();
    a.remove();
  }
  function printAll() {
    const list = tables.filter((t) => t.active);
    if (!list.length) { S.toast('Нет включённых столов.', true); return; }
    $('#print-area').innerHTML = list.map((tb) => `<div class="p-card">
      <div class="p-name">${esc(S.settings?.name || '')}</div>
      ${qrSvg(tableUrl(tb), 'p-qr')}
      <div class="p-table">Стол ${esc(tb.label)}</div>
      <div class="p-hint">Наведите камеру — откроется меню</div>
      <div class="p-hint">Scan for the menu · Imbas untuk menu · Menyuni ochish</div>
    </div>`).join('');
    window.print();
  }

  async function loadTables() { tables = await api.tables(); }

  function renderTables() {
    const main = $('#a-main');
    if (!hasQr()) {
      main.innerHTML = `<p class="notice bad">${icon('alert')}<span>Не загрузилась библиотека QR-кодов — проверьте интернет и обновите страницу.</span></p>`;
      return;
    }
    const sorted = [...tables].sort((a, b) => a.sort - b.sort || String(a.label).localeCompare(String(b.label), 'ru', { numeric: true }));
    main.innerHTML = `
      <section class="panel"><div class="panel-head"><h3>Добавить столы</h3></div><div class="panel-body">
        <form id="tbl-range" class="form-grid" novalidate>
          <label class="field"><span>С номера</span><input name="from" type="number" min="1" max="500" value="${tables.length ? '' : 1}" required></label>
          <label class="field"><span>По номер</span><input name="to" type="number" min="1" max="500" value="${tables.length ? '' : 10}" required></label>
          <div class="field full" style="margin-top:8px"><button class="btn" type="submit">${icon('plus', 'sm')}Создать столы</button></div>
        </form>
        <form id="tbl-one" class="form-grid" novalidate style="margin-top:6px">
          <label class="field"><span>Или один стол с любым названием</span><input name="label" type="text" maxlength="20" placeholder="Например: VIP, Терраса 2"></label>
          <div class="field" style="justify-content:flex-end"><button class="btn ghost" type="submit">${icon('plus', 'sm')}Добавить</button></div>
        </form>
        <p class="help" style="margin:12px 0 0">У каждого стола свой секретный код в QR. Гость с неверным или отключённым QR заказ отправить не сможет. «Новый QR» делает старую наклейку недействительной.</p>
      </div></section>
      <div class="toolbar">
        <b>Столов: ${tables.length}, включено: ${tables.filter((t) => t.active).length}</b><span class="grow"></span>
        <button type="button" class="btn small" data-print${tables.some((t) => t.active) ? '' : ' disabled'}>${icon('printer', 'sm')}Печать всех QR</button>
      </div>
      ${sorted.length ? `<section class="panel"><ul class="rows">${sorted.map((tb) => `
        <li class="${tb.active ? '' : 'is-off'}">
          <div class="qr-thumb">${qrSvg(tableUrl(tb))}</div>
          <div class="grow"><b>Стол ${esc(tb.label)}</b><small>${tb.active ? esc(tableUrl(tb)) : 'отключён — заказы с этого QR не принимаются'}</small></div>
          <div class="row-btns">
            ${sw(`data-tbl-active="${esc(tb.id)}" aria-label="Стол ${esc(tb.label)} включён"`, tb.active, 'Включён')}
            <button type="button" class="btn small ghost" data-tbl-png="${esc(tb.id)}">${icon('download', 'sm')}PNG</button>
            <button type="button" class="btn small ghost" data-tbl-edit="${esc(tb.id)}">${icon('edit', 'sm')}Название</button>
            <button type="button" class="btn small ghost" data-tbl-reset="${esc(tb.id)}">${icon('refresh', 'sm')}Новый QR</button>
            <button type="button" class="btn small danger" data-tbl-del="${esc(tb.id)}" aria-label="Удалить стол ${esc(tb.label)}">${icon('trash', 'sm')}</button>
          </div>
        </li>`).join('')}</ul></section>` : '<div class="a-empty">Столов пока нет. Создайте их выше — например, с 1 по 10.</div>'}`;

    $('#tbl-range').addEventListener('submit', async (e) => {
      e.preventDefault();
      const f = new FormData(e.target);
      const from = Number(f.get('from'));
      const to = Number(f.get('to'));
      if (!(Number.isInteger(from) && Number.isInteger(to) && from >= 1 && to >= from && to <= 500 && to - from < 200)) {
        S.toast('Укажите номера от 1 до 500, не больше 200 столов за раз.', true);
        return;
      }
      try {
        const n = await api.createTables(from, to);
        await loadTables();
        S.toast(n ? `Создано столов: ${n}` : 'Такие столы уже есть');
        renderTables();
      } catch (ex) { S.toast(S.errText(ex), true); }
    });
    $('#tbl-one').addEventListener('submit', async (e) => {
      e.preventDefault();
      const label = String(new FormData(e.target).get('label') || '').trim();
      if (!label) { S.toast('Впишите название стола.', true); return; }
      try {
        await api.saveTable({ label, sort: (Math.max(0, ...tables.map((t) => t.sort)) + 1) });
        await loadTables();
        S.toast('Стол добавлен');
        renderTables();
      } catch (ex) { S.toast(/duplicate|unique/i.test(ex.message) ? 'Стол с таким названием уже есть.' : S.errText(ex), true); }
    });
  }

  async function tableAction(fn, ok) {
    try { await fn(); await loadTables(); if (ok) S.toast(ok); } catch (ex) { S.toast(/duplicate|unique/i.test(ex.message) ? 'Стол с таким названием уже есть.' : S.errText(ex), true); await loadTables(); }
    renderTables();
  }

  // =================================================================
  //  События
  // =================================================================
  document.addEventListener('input', (e) => {
    if (e.target.id === 'o-search') { q = e.target.value; renderMenu(); }
  });

  document.addEventListener('change', (e) => {
    const t = e.target;
    if (t.dataset.avail) {
      const d = dishes.find((x) => x.id === t.dataset.avail);
      quickPatch(d.id, { available: t.checked }, t.checked ? `«${tr(d.name)}» снова в наличии` : `«${tr(d.name)}» — нет в наличии`);
    } else if (t.dataset.shown) {
      const d = dishes.find((x) => x.id === t.dataset.shown);
      quickPatch(d.id, { hidden: !t.checked }, t.checked ? 'Блюдо показано гостям' : 'Блюдо скрыто от гостей');
    } else if (t.dataset.orderStatus) {
      setOrderStatus(t.dataset.orderStatus, t.value);
    } else if (t.dataset.tblActive) {
      const tb = tables.find((x) => x.id === t.dataset.tblActive);
      tableAction(() => api.saveTable({ id: tb.id, label: tb.label, sort: tb.sort, active: t.checked }), t.checked ? `Стол ${tb.label} включён` : `Стол ${tb.label} отключён — его QR не принимает заказы`);
    } else if (t.id === 'hist-day') {
      historyDay = t.value || localDate();
      loadHistory().then(renderOrders).catch((ex) => S.toast(S.errText(ex), true));
    } else if (t.dataset.role) {
      const s = staff.find((x) => x.user_id === t.dataset.role);
      staffAction(() => api.setStaff(s.user_id, t.value, s.name, s.active), 'Роль изменена');
    } else if (t.id === 'promo-file') {
      const file = t.files?.[0];
      t.value = '';
      uploadPromo(file);
    } else if (t.dataset.promoTitle) {
      savePromoTitle(t);
    } else if (t.dataset.promoActive) {
      const id = t.dataset.promoActive;
      promoAction(() => api.savePromo({ id, active: t.checked }), t.checked ? 'Ролик снова показывается гостям' : 'Ролик скрыт от гостей');
    } else if (t.dataset.active) {
      const s = staff.find((x) => x.user_id === t.dataset.active);
      staffAction(() => api.setStaff(s.user_id, s.role, s.name, t.checked), t.checked ? 'Доступ включён' : 'Доступ отключён');
    }
  });

  document.addEventListener('click', async (e) => {
    if (floor?.handleClick(e)) return;
    const a = e.target.closest('[data-act]');
    if (a) {
      const id = a.dataset.id;
      if (a.dataset.act === 'new-dish') { if (!cats.length) { S.toast('Сначала создайте категорию.', true); return; } dishForm(null); }
      else if (a.dataset.act === 'edit-dish') dishForm(dishes.find((d) => d.id === id));
      else if (a.dataset.act === 'new-cat') catForm(null);
      else if (a.dataset.act === 'edit-cat') catForm(cats.find((c) => c.id === id));
      else if (a.dataset.act === 'cat-up') moveCat(id, -1);
      else if (a.dataset.act === 'cat-down') moveCat(id, 1);
      return;
    }
    const on = e.target.closest('[data-order-next]');
    if (on) { setOrderStatus(on.dataset.orderNext, on.dataset.to); return; }
    const oc = e.target.closest('[data-order-cancel]');
    if (oc) { setOrderStatus(oc.dataset.orderCancel, 'cancelled'); return; }
    const ov = e.target.closest('[data-ov]');
    if (ov) {
      ordersView = ov.dataset.ov;
      if (ordersView === 'history') loadHistory().then(renderOrders).catch((ex) => S.toast(S.errText(ex), true)); else renderOrders();
      return;
    }
    if (e.target.closest('[data-sound]')) {
      soundOn = !soundOn;
      try { localStorage.setItem('owner:sound', soundOn ? '1' : '0'); } catch { /* ok */ }
      if (soundOn) { unlockAudio(); ding(); }
      renderBanner();
      renderOrders();
      return;
    }
    if (e.target.closest('[data-notify]')) {
      Notification.requestPermission().then(() => renderOrders());
      return;
    }
    const bk = e.target.closest('[data-backup]');
    if (bk) { downloadBackup(bk); return; }
    const bn = e.target.closest('[data-banner]');
    if (bn) {
      if (bn.dataset.banner === 'backup') { downloadBackup(bn); return; }
      if (bn.dataset.banner === 'sound') { unlockAudio(); ding(); } else { const toFloor = /Стол .*:|Вызов/.test(bannerMsg); bannerMsg = ''; location.hash = toFloor ? '#floor' : '#orders'; renderBanner(); }
      return;
    }
    if (e.target.closest('[data-print]')) { printAll(); return; }
    const pm = e.target.closest('[data-promo-move]');
    if (pm) { movePromo(pm.dataset.id, Number(pm.dataset.promoMove)); return; }
    const pd = e.target.closest('[data-promo-del]');
    if (pd) {
      if (await S.ask('Удалить этот ролик? Гости перестанут его видеть, файл удалится насовсем.', { ok: 'Удалить' })) promoAction(() => api.deletePromo(pd.dataset.promoDel), 'Ролик удалён');
      return;
    }
    const tp = e.target.closest('[data-tbl-png]');
    if (tp) { downloadPng(tables.find((x) => x.id === tp.dataset.tblPng)); return; }
    const te = e.target.closest('[data-tbl-edit]');
    if (te) {
      const tb = tables.find((x) => x.id === te.dataset.tblEdit);
      const label = await S.ask('Новое название стола (до 20 символов). QR-код при этом не меняется.', { ok: 'Сохранить', input: tb.label, max: 20 });
      if (label && label.trim() && label.trim() !== tb.label) tableAction(() => api.saveTable({ id: tb.id, label: label.trim().slice(0, 20), sort: tb.sort, active: tb.active }), 'Название изменено');
      return;
    }
    const tr2 = e.target.closest('[data-tbl-reset]');
    if (tr2) {
      const tb = tables.find((x) => x.id === tr2.dataset.tblReset);
      if (await S.ask(`Сделать новый QR для стола ${tb.label}? Старая наклейка перестанет работать — распечатайте новую.`, { ok: 'Новый QR' })) tableAction(() => api.resetTableToken(tb.id), 'Новый QR готов — скачайте или распечатайте его');
      return;
    }
    const td = e.target.closest('[data-tbl-del]');
    if (td) {
      const tb = tables.find((x) => x.id === td.dataset.tblDel);
      if (await S.ask(`Удалить стол ${tb.label}? Его QR перестанет работать. Старые заказы останутся в истории.`, { ok: 'Удалить стол' })) tableAction(() => api.deleteTable(tb.id), 'Стол удалён');
      return;
    }
    const rv = e.target.closest('[data-revoke]');
    if (rv) { staffAction(() => api.revokeInvite(rv.dataset.revoke), 'Приглашение отменено'); return; }
    const rm = e.target.closest('[data-remove]');
    if (rm) {
      const s = staff.find((x) => x.user_id === rm.dataset.remove);
      if (await S.ask(`Удалить доступ сотрудника ${s.email}? Аккаунт останется, но войти в панели он не сможет.`, { ok: 'Удалить доступ' })) {
        staffAction(() => api.removeStaff(s.user_id), 'Сотрудник удалён');
      }
    }
  });

  S.start({
    need: 'owner',
    async onReady(ctx) {
      api = ctx.api;
      me = ctx.me;
      paintBrand();
      floor = window.Floor.create({
        api, isOwner: true, me,   // владелец или менеджер: правка заказа, отмена оплаты
        getOrders: () => orders, getDishes: () => dishes, getCats: () => cats,
        reloadOrders: loadOrders, onCalls: announceCalls,
        rerender: () => { updateCount(); if (['floor', 'orders'].includes(tab) && !document.querySelector('.modal')) render(); },
      });
      try {
        applyRole();
        await Promise.all([loadMenu(), me?.role === 'owner' ? loadStaff() : null, loadOrders(), me?.role === 'owner' ? loadTables() : null, me?.role === 'owner' ? loadCosts() : null, floor.load()]);
      } catch (ex) { S.toast(S.errText(ex), true); }
      updateCount();
      setTab(location.hash.slice(1) || 'orders');
      renderBanner();
      stop?.();
      // заказы — сразу, как пришли; меню — если его меняют на другом устройстве (не мешая открытой форме)
      stop = api.subscribe(['orders', 'dishes', 'categories', 'tables', 'calls', 'bills', 'table_waiters', 'reservations'], async (table) => {
        try {
          if (table === 'calls' || table === 'bills' || table === 'table_waiters' || table === 'reservations') { await floor.load(); updateCount(); if (tab === 'floor' && !document.querySelector('.modal')) render(); return; }
          if (table === 'orders') { await loadOrders(); if (tab === 'orders') renderOrders(); else if (tab === 'floor' && !document.querySelector('.modal')) render(); return; }
          if (document.querySelector('.modal')) return;
          if (table === 'tables') { await Promise.all([loadTables(), floor.load()]); if (tab === 'tables') renderTables(); return; }
          await loadMenu();
          if (tab === 'menu') renderMenu();
          // стоп-лист: модуль сам заново берёт блюда и не сбивает число, которое сейчас вводят
          else if (tab === 'stop') stopHandle?.reload?.();
        } catch { /* позже */ }
      }, (ok) => { ordersLive = ok; if (tab === 'orders') renderOrders(); });
      clearInterval(ordersTimer);
      ordersTimer = setInterval(async () => {
        try {
          await Promise.all([loadOrders(), floor.load()]);
          updateCount();
          if (!document.querySelector('.modal') && (tab === 'orders' || tab === 'floor')) render();
        } catch { /* нет сети */ }
      }, 15000);
    },
    onLogout() { stop?.(); stop = null; clearInterval(ordersTimer); closeStop(); goalShown = null; bannerMsg = ''; renderBanner(); },
  });
})();

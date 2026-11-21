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
  const MANAGER_TABS = ['floor', 'orders', 'reports', 'day'];
  const allowedTabs = () => (me?.role === 'owner' ? ['floor', 'orders', 'menu', 'tables', 'reports', 'day', 'audit', 'restaurant', 'staff'] : MANAGER_TABS);
  function applyRole() {
    const mgr = me?.role !== 'owner';
    document.querySelectorAll('.a-tab').forEach((a) => { a.hidden = !allowedTabs().includes(a.dataset.tab); });
    const sub = document.querySelector('.a-brand h1, .a-brand b');
    if (mgr && sub && /владельца/.test(sub.textContent)) sub.textContent = sub.textContent.replace('владельца', 'менеджера');
  }
  function setTab(next) {
    tab = allowedTabs().includes(next) ? next : 'orders';
    document.querySelectorAll('.a-tab').forEach((a) => a.setAttribute('aria-current', a.dataset.tab === tab ? 'page' : 'false'));
    // на телефоне нижняя панель прокручивается — показываем открытый раздел
    const cur = document.querySelector(`.a-tab[data-tab="${tab}"]`); const bar = cur?.parentElement;
    if (bar && bar.scrollWidth > bar.clientWidth) bar.scrollLeft = cur.offsetLeft - (bar.clientWidth - cur.offsetWidth) / 2;
    render();
  }
  window.addEventListener('hashchange', () => { if (api) setTab(location.hash.slice(1)); });

  function render() {
    if (tab === 'floor') { if (floor) floor.render($('#a-main')); else $('#a-main').innerHTML = '<p class="a-empty">Загрузка…</p>'; }
    else if (tab === 'reports') window.OwnerReports.reports($('#a-main'), { api });
    else if (tab === 'day') window.OwnerReports.day($('#a-main'), { api });
    else if (tab === 'audit') window.OwnerReports.audit($('#a-main'), { api, dishes, cats });
    else if (tab === 'orders') renderOrders();
    else if (tab === 'menu') renderMenu();
    else if (tab === 'tables') renderTables();
    else if (tab === 'restaurant') renderRestaurant();
    else renderStaff();
  }


  async function loadMenu() {
    [cats, dishes] = await Promise.all([api.categories(), api.dishes()]);
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
            <h3>${esc(tr(c.name))}<small>${items.length}</small>${c.avail_from ? `<span class="state-badge muted">${icon('clock', 'sm')}${esc(c.avail_from)}–${esc(c.avail_to)}</span>` : ''}</h3>
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
              <div class="grow"><b>${esc(tr(d.name))}</b><small>${esc([amount(d), d.hidden ? 'скрыто от гостей' : '', d.photo_url ? '' : 'нет фото'].filter(Boolean).join(' · '))}</small></div>
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
        };
        const saved = await api.saveDish(row);
        if ((uploaded || removePhoto) && d.photo_url) api.deleteImage(d.photo_url);
        dishes = dishes.filter((x) => x.id !== saved.id).concat(saved);
        S.closeModal();
        S.toast(isNew ? 'Блюдо добавлено' : 'Сохранено');
        render();
      } catch (ex) {
        if (uploaded) api.deleteImage(uploaded);
        err(S.errText(ex));
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
            <div class="field full"><span>Халяль</span>
              ${sw('name="halal"', st.halal, 'Показывать гостям «Халяль»')}
              <span class="hint">Включайте, только если ресторан действительно халяльный. Данные сертификата — ниже, если они есть.</span>
              <span class="hint">Если приём выключен или ресторан закрыт, гость видит понятное сообщение и не может отправить заказ.</span></div>
          </div>
          ${langFields('halal_note', st.halal_note, { label: 'Халяль: данные сертификата (необязательно)', hint: 'Например: «Сертификат JAKIM № …». Пусто — гости видят только значок «Халяль».' })}
          ${langFields('footer', st.footer, { label: 'Подпись внизу меню (необязательно)' })}
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
      <section class="panel" id="tg-panel" style="margin-top:18px"><div class="panel-head"><h3>Уведомления в Telegram</h3></div><div class="panel-body"><p class="a-empty">Загрузка…</p></div></section>`;
    renderTelegram();

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
          <label class="field"><span>Роль</span><select name="role"><option value="waiter">Официант — зал: заказы, вызовы, счета</option><option value="cook">Повар — экран кухни</option><option value="manager">Менеджер — зал, скидки, отмена оплаты, закрытие дня, отчёты</option><option value="owner">Владелец — полный доступ</option></select></label>
          <div class="field" style="justify-content:flex-end"><button class="btn" type="submit">${icon('mail', 'sm')}Пригласить</button></div>
        </form>
        <p class="help" style="margin:12px 0 0">Как это работает: вы приглашаете email → сотрудник открывает <b>${esc(staffLink)}</b>, выбирает «Меня пригласили — зарегистрироваться» и подтверждает email из письма. Доступ появится сам.</p>
        <button type="button" class="btn small ghost" id="copy-link" style="margin-top:8px">Скопировать ссылку для сотрудника</button>
      </div></section>

      ${invites.length ? `<section class="panel"><div class="panel-head"><h3>Ждут регистрации<small>${invites.length}</small></h3></div>
        <ul class="rows">${invites.map((i) => `<li>
          <div class="grow"><b>${esc(i.email)}</b><small>${esc([i.name, ({ owner: 'владелец', manager: 'менеджер', waiter: 'официант', cook: 'повар' })[i.role] || i.role].filter(Boolean).join(' · '))}</small></div>
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
    const o = fresh[fresh.length - 1];
    bannerMsg = fresh.length > 1 ? `Новых заказов: ${fresh.length}` : `Новый заказ №${o.no} — стол ${o.table_label}`;
    renderBanner();
    ding();
    try {
      if ('Notification' in window && Notification.permission === 'granted' && document.hidden) {
        new Notification(bannerMsg, { body: `${money(o.total)} · ${o.items.length} поз.`, tag: 'order-' + o.id, icon: 'icon.svg' });
      }
    } catch { /* без системных уведомлений */ }
  }
  function updateCount() {
    const n = orders.filter((o) => ACTIVE.includes(o.status)).length;
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
    const fresh = seenOrders ? rows.filter((o) => o.status === 'new' && !seenOrders.has(o.id)) : [];
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
    const active = orders
      .filter((o) => ACTIVE.includes(o.status))
      .sort((a, b) => new Date(a.created_at) - new Date(b.created_at));
    const sum = (list) => list.filter((o) => o.status !== 'cancelled').reduce((s, o) => s + Number(o.total), 0);
    const list = ordersView === 'active' ? active : [...history].sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
    const canNotify = 'Notification' in window && Notification.permission === 'default';
    const off = !S.settings?.orders_enabled;

    main.innerHTML = `
      ${off ? `<p class="notice bad">${icon('alert')}<span>Приём заказов из меню выключен (раздел «Ресторан»). Гости не могут отправить заказ.</span></p>` : ''}
      ${me?.role === 'owner' && !tables.length ? `<p class="notice">${icon('alert')}<span>Столов ещё нет — гости не смогут заказать. Создайте столы и распечатайте QR-коды в разделе «Столы и QR».</span></p>` : ''}
      <div class="a-stats">
        <div class="a-stat${active.length ? ' hot' : ''}"><b>${active.length}</b><span>ждут подачи</span></div>
        <div class="a-stat"><b>${todays.filter((o) => o.status === 'served').length}</b><span>подано сегодня</span></div>
        <div class="a-stat"><b>${todays.filter((o) => o.status === 'cancelled').length}</b><span>отменено сегодня</span></div>
        <div class="a-stat"><b>${money(sum(todays))}</b><span>заказов сегодня: ${todays.filter((o) => o.status !== 'cancelled').length}</span></div>
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
      ${ordersView === 'history' ? `<p class="help">${esc(historyDay)}: заказов ${history.filter((o) => o.status !== 'cancelled').length}, сумма ${money(sum(history))}, отменено ${history.filter((o) => o.status === 'cancelled').length}.</p>` : ''}
      ${list.length ? `<div class="o-grid">${list.map(orderCard).join('')}</div>`
        : `<div class="a-empty">${ordersView === 'active' ? 'Активных заказов нет. Новый заказ появится здесь сам — со звуком.' : 'В этот день заказов не было.'}</div>`}`;
  }

  async function setOrderStatus(id, status) {
    const o = orders.find((x) => x.id === id) || history.find((x) => x.id === id);
    if (!o || busyOrders.has(id)) return;
    if (status === 'cancelled' && !await S.ask(`Отменить заказ №${o.no} (стол ${o.table_label})? Гость увидит, что заказ отменён.`, { ok: 'Отменить заказ', cancel: 'Не отменять' })) { render(); return; }
    busyOrders.add(id);
    render();
    try {
      // «Подано» — через сервер: он запишет, кто подал
      const saved = status === 'served' ? await api.serveOrder(id) : await api.setOrderStatus(id, status);
      orders = orders.map((x) => (x.id === id ? saved : x));
      history = history.map((x) => (x.id === id ? saved : x));
      if (status !== 'new' && bannerMsg && !orders.some((x) => ACTIVE.includes(x.status))) { bannerMsg = ''; renderBanner(); }
      S.toast(`Заказ №${o.no}: ${ST[stOf(saved?.status || status)]}`);
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
        await Promise.all([loadMenu(), me?.role === 'owner' ? loadStaff() : null, loadOrders(), me?.role === 'owner' ? loadTables() : null, floor.load()]);
      } catch (ex) { S.toast(S.errText(ex), true); }
      updateCount();
      setTab(location.hash.slice(1) || 'orders');
      renderBanner();
      stop?.();
      // заказы — сразу, как пришли; меню — если его меняют на другом устройстве (не мешая открытой форме)
      stop = api.subscribe(['orders', 'dishes', 'categories', 'tables', 'calls', 'bills', 'table_waiters'], async (table) => {
        try {
          if (table === 'calls' || table === 'bills' || table === 'table_waiters') { await floor.load(); updateCount(); if (tab === 'floor' && !document.querySelector('.modal')) render(); return; }
          if (table === 'orders') { await loadOrders(); if (tab === 'orders') renderOrders(); else if (tab === 'floor' && !document.querySelector('.modal')) render(); return; }
          if (document.querySelector('.modal')) return;
          if (table === 'tables') { await Promise.all([loadTables(), floor.load()]); if (tab === 'tables') renderTables(); return; }
          await loadMenu();
          if (tab === 'menu') renderMenu();
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
    onLogout() { stop?.(); stop = null; clearInterval(ordersTimer); bannerMsg = ''; renderBanner(); },
  });
})();

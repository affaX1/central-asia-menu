(() => {
  'use strict';

  // =====================================================================
  //  Панель владельца: меню, фото, наличие, данные ресторана, расписание,
  //  сотрудники и QR-коды. Сохранение проверяет база: менять может только владелец.
  // =====================================================================

  const S = window.Staff;
  const { $, esc, icon, tr, money } = S;

  const LANGS = [['ru', 'Русский'], ['en', 'English'], ['uz', "O'zbekcha"], ['ar', 'العربية'], ['ms', 'Bahasa Melayu']];
  const TAGS = [['hit', 'Хит'], ['new', 'Новинка'], ['spicy', 'Острое'], ['veg', 'Без мяса']];
  const ALLERGENS = [['gluten', 'глютен'], ['milk', 'молоко'], ['eggs', 'яйца'], ['fish', 'рыба'], ['shellfish', 'морепродукты'], ['nuts', 'орехи'], ['soy', 'соя'], ['sesame', 'кунжут']];
  const DAYS = ['Понедельник', 'Вторник', 'Среда', 'Четверг', 'Пятница', 'Суббота', 'Воскресенье'];
  const ZONES = ['Asia/Kuala_Lumpur', 'Asia/Singapore', 'Asia/Jakarta', 'Asia/Bangkok', 'Asia/Tashkent', 'Asia/Samarkand', 'Asia/Almaty',
    'Asia/Bishkek', 'Asia/Dushanbe', 'Asia/Ashgabat', 'Asia/Baku', 'Asia/Dubai', 'Asia/Riyadh', 'Europe/Istanbul', 'Europe/Moscow',
    'Europe/London', 'Europe/Berlin', 'America/New_York'];

  let api = null;
  let me = null;
  let cats = [];
  let dishes = [];
  let staff = [];
  let invites = [];
  let tab = 'menu';
  let q = '';
  let stop = null;

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
  function setTab(next) {
    tab = ['menu', 'restaurant', 'staff', 'qr'].includes(next) ? next : 'menu';
    document.querySelectorAll('.a-tab').forEach((a) => a.setAttribute('aria-current', a.dataset.tab === tab ? 'page' : 'false'));
    render();
  }
  window.addEventListener('hashchange', () => { if (api) setTab(location.hash.slice(1)); });

  function render() {
    if (tab === 'menu') renderMenu();
    else if (tab === 'restaurant') renderRestaurant();
    else if (tab === 'staff') renderStaff();
    else renderQr();
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
            <h3>${esc(tr(c.name))}<small>${items.length}</small></h3>
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
        <details style="margin-top:12px"><summary class="section-label" style="cursor:pointer">Состав (необязательно)</summary>
          ${langFields('ingr', d.ingredients, { label: 'Состав', area: true })}</details>
        <p class="section-label">Метки</p>
        <div class="checks">${TAGS.map(([v, n]) => `<label><input type="checkbox" name="tags" value="${v}"${d.tags?.includes(v) ? ' checked' : ''}>${n}</label>`).join('')}</div>
        <p class="section-label">Аллергены</p>
        <div class="checks">${ALLERGENS.map(([v, n]) => `<label><input type="checkbox" name="allergens" value="${v}"${d.allergens?.includes(v) ? ' checked' : ''}>${n}</label>`).join('')}</div>
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
      if (!confirm(`Удалить «${tr(d.name)}» насовсем? Если блюдо просто закончилось — лучше выключить «В наличии».`)) return;
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
          tags: f.getAll('tags'), allergens: f.getAll('allergens'),
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
        <p class="notice bad" id="cat-err" role="alert" hidden></p>
        <div class="modal-foot">
          <button type="submit" class="btn">${icon('check', 'sm')}Сохранить</button>
          <button type="button" class="btn ghost" data-modal-close>Отмена</button>
          ${isNew ? '' : `<button type="button" class="btn danger" id="cat-delete"${count ? ` title="Сначала уберите блюда (${count})"` : ''}>${icon('trash', 'sm')}Удалить</button>`}
        </div>
      </form>`);
    const err = (msg) => { const e = m.querySelector('#cat-err'); e.hidden = !msg; e.innerHTML = msg ? `${icon('alert')}<span>${esc(msg)}</span>` : ''; };
    m.querySelector('#cat-delete')?.addEventListener('click', async () => {
      if (count) return err(`В категории ${count} блюд. Перенесите их в другую категорию или удалите, потом удалите категорию.`);
      if (!confirm(`Удалить категорию «${tr(c.name)}»?`)) return;
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
      try {
        const saved = await api.saveCategory({
          id: c.id || slug(name.en || name.ru, new Set(cats.map((x) => x.id))),
          name, hidden: !f.get('shown'), sort: c.sort,
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
      await Promise.all(sorted.map((c) => api.saveCategory({ id: c.id, name: c.name, hidden: c.hidden, sort: c.sort })));
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

        <section class="panel"><div class="panel-head"><h3>Цены, язык, столы</h3></div><div class="panel-body">
          <div class="form-grid">
            <label class="field"><span>Валюта</span><input name="currency" type="text" maxlength="8" required value="${esc(st.currency)}"></label>
            <label class="field"><span>Где писать валюту</span><select name="currency_before">
              <option value="1"${st.currency_before ? ' selected' : ''}>Перед ценой: ${esc(st.currency)} 28</option>
              <option value="0"${st.currency_before ? '' : ' selected'}>После цены: 28 ${esc(st.currency)}</option></select></label>
            <label class="field"><span>Язык, если язык телефона гостя не поддерживается</span><select name="default_language">${LANGS.map(([c, n]) => `<option value="${c}"${c === st.default_language ? ' selected' : ''}>${n}</option>`).join('')}</select></label>
            <label class="field"><span>Сколько столов (для QR-кодов)</span><input name="tables_count" type="number" min="1" max="200" step="1" value="${esc(st.tables_count)}"></label>
          </div>
          ${langFields('footer', st.footer, { label: 'Подпись внизу меню (необязательно)' })}
        </div></section>

        <p class="notice bad" id="set-err" role="alert" hidden></p>
        <div style="position:sticky;bottom:calc(12px + env(safe-area-inset-bottom));display:flex;gap:8px;z-index:5">
          <button type="submit" class="btn" style="flex:1;box-shadow:var(--shadow-lg)">${icon('check', 'sm')}Сохранить изменения</button>
        </div>
      </form>`;

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
      const tables = Number(f.get('tables_count'));
      if (!name) return err('Впишите название ресторана.');
      if (phone && !/^[+0-9 ()-]{5,30}$/.test(phone)) return err('Телефон: только цифры, пробелы, +, -, скобки.');
      if (mapUrl && !/^https:\/\/\S+$/.test(mapUrl)) return err('Ссылка на карту должна начинаться с https://');
      if (!(Number.isInteger(tables) && tables >= 1 && tables <= 200)) return err('Столов — от 1 до 200.');
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
          tables_count: tables,
          footer: readLang(f, 'footer'),
          logo_url: uploaded || (removeLogo ? null : st.logo_url || null),
        };
        const saved = await api.saveSettings(patch);
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
          <label class="field"><span>Роль</span><select name="role"><option value="waiter">Официант — только смотрит меню и наличие</option><option value="owner">Владелец — полный доступ</option></select></label>
          <div class="field" style="justify-content:flex-end"><button class="btn" type="submit">${icon('mail', 'sm')}Пригласить</button></div>
        </form>
        <p class="help" style="margin:12px 0 0">Как это работает: вы приглашаете email → сотрудник открывает <b>${esc(staffLink)}</b>, выбирает «Меня пригласили — зарегистрироваться» и подтверждает email из письма. Доступ появится сам.</p>
        <button type="button" class="btn small ghost" id="copy-link" style="margin-top:8px">Скопировать ссылку для сотрудника</button>
      </div></section>

      ${invites.length ? `<section class="panel"><div class="panel-head"><h3>Ждут регистрации<small>${invites.length}</small></h3></div>
        <ul class="rows">${invites.map((i) => `<li>
          <div class="grow"><b>${esc(i.email)}</b><small>${esc([i.name, i.role === 'owner' ? 'владелец' : 'официант'].filter(Boolean).join(' · '))}</small></div>
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
                <option value="owner"${s.role === 'owner' ? ' selected' : ''}>Владелец</option></select></label>
              ${sw(`data-active="${esc(s.user_id)}" aria-label="Доступ: ${esc(s.email)}"`, s.active, 'Доступ', self)}
              ${self ? '' : `<button type="button" class="btn small danger" data-remove="${esc(s.user_id)}" aria-label="Удалить ${esc(s.email)}">${icon('trash', 'sm')}</button>`}
            </div>
          </li>`;
        }).join('')}</ul></section>`;

    $('#copy-link').addEventListener('click', async () => {
      try { await navigator.clipboard.writeText(staffLink); S.toast('Ссылка скопирована'); } catch { prompt('Скопируйте ссылку:', staffLink); }
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
  //  QR-КОДЫ И ССЫЛКИ
  // =================================================================
  function renderQr() {
    const st = S.settings;
    const menuUrl = new URL('./', location.href).href;
    $('#a-main').innerHTML = `
      <section class="panel"><div class="panel-head"><h3>QR-коды на столы</h3></div><div class="panel-body">
        <p class="help">Каждый QR открывает меню с номером стола. Столов сейчас: <b>${esc(st.tables_count)}</b> (меняется в разделе «Ресторан»).</p>
        <div class="qr-box">
          <a class="btn" href="print.html?count=${encodeURIComponent(st.tables_count)}" target="_blank" rel="noopener">${icon('qr', 'sm')}Открыть карточки для печати</a>
          <a class="btn ghost" href="${esc(menuUrl)}" target="_blank" rel="noopener">${icon('external', 'sm')}Меню глазами гостя</a>
          <a class="btn ghost" href="waiter.html" target="_blank" rel="noopener">${icon('external', 'sm')}Меню для официанта</a>
        </div>
        <p class="help" style="margin-top:12px">Ссылка на меню: <b>${esc(menuUrl)}</b></p>
      </div></section>`;
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
    } else if (t.dataset.role) {
      const s = staff.find((x) => x.user_id === t.dataset.role);
      staffAction(() => api.setStaff(s.user_id, t.value, s.name, s.active), 'Роль изменена');
    } else if (t.dataset.active) {
      const s = staff.find((x) => x.user_id === t.dataset.active);
      staffAction(() => api.setStaff(s.user_id, s.role, s.name, t.checked), t.checked ? 'Доступ включён' : 'Доступ отключён');
    }
  });

  document.addEventListener('click', (e) => {
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
    const rv = e.target.closest('[data-revoke]');
    if (rv) { staffAction(() => api.revokeInvite(rv.dataset.revoke), 'Приглашение отменено'); return; }
    const rm = e.target.closest('[data-remove]');
    if (rm) {
      const s = staff.find((x) => x.user_id === rm.dataset.remove);
      if (confirm(`Удалить доступ сотрудника ${s.email}? Аккаунт останется, но войти в панели он не сможет.`)) {
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
      try {
        await Promise.all([loadMenu(), loadStaff()]);
      } catch (ex) { S.toast(S.errText(ex), true); }
      setTab(location.hash.slice(1) || 'menu');
      stop?.();
      // если меню меняет другой владелец на другом устройстве — подтягиваем, но не мешаем открытой форме
      stop = api.subscribe(['dishes', 'categories'], async () => {
        if (document.querySelector('.modal')) return;
        try { await loadMenu(); if (tab === 'menu') renderMenu(); } catch { /* позже */ }
      });
    },
    onLogout() { stop?.(); stop = null; },
  });
})();

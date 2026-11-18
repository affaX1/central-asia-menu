(() => {
  'use strict';

  // =====================================================================
  //  Меню для официанта: блюда, цены и наличие — только просмотр.
  //  Изменить что-либо отсюда нельзя (и база это тоже не разрешит).
  // =====================================================================

  const S = window.Staff;
  const { $, esc, icon, tr, money } = S;

  const ALLERGENS = { gluten: 'глютен', milk: 'молоко', eggs: 'яйца', fish: 'рыба', shellfish: 'морепродукты', nuts: 'орехи', soy: 'соя', sesame: 'кунжут' };
  const TAGS = { hit: 'Хит', new: 'Новинка', spicy: 'Острое', veg: 'Без мяса' };
  const LANG_NAMES = { ru: 'RU', uz: 'UZ', en: 'EN', ar: 'AR', ms: 'MS' };

  let api = null;
  let cats = [];
  let dishes = [];
  let q = '';
  let filter = 'all';   // all | yes | no
  let cat = '';         // '' = все категории
  let live = false;
  let stop = null;
  let timer = null;

  const norm = (s) => String(s || '').toLowerCase().replace(/ё/g, 'е');
  const amount = (d) => (d.weight ? `${d.weight} ${S.unitLabel[d.unit] || ''}` : '');

  function photo(d) {
    return `<div class="photo${d.photo_url ? ' has-img' : ''}">${d.photo_url ? `<img src="${esc(d.photo_url)}" alt="" loading="lazy" decoding="async">` : icon('dish')}</div>`;
  }

  function visible() {
    const shownCats = cats.filter((c) => !c.hidden);
    const ids = new Set(shownCats.map((c) => c.id));
    return { shownCats, list: dishes.filter((d) => !d.hidden && ids.has(d.category_id)) };
  }

  function render() {
    const main = $('#a-main');
    const { shownCats, list } = visible();
    const words = norm(q).split(/\s+/).filter(Boolean);
    const hit = (d) => {
      if (!words.length) return true;
      const hay = norm(`${Object.values(d.name || {}).join(' ')} ${Object.values(d.desc || {}).join(' ')}`);
      return words.every((w) => hay.includes(w));
    };
    const base = list.filter(hit).filter((d) => !cat || d.category_id === cat);
    const yes = base.filter((d) => d.available).length;
    const shown = base.filter((d) => (filter === 'yes' ? d.available : filter === 'no' ? !d.available : true));

    const keepFocus = document.activeElement?.id === 'w-search';
    main.innerHTML = `
      <div class="toolbar">
        <label class="search">${icon('search')}
          <input id="w-search" type="search" placeholder="Найти блюдо (на любом языке)" value="${esc(q)}" autocomplete="off"></label>
        <span class="live-dot${live ? '' : ' off'}">${live ? 'Обновляется само' : 'Обновление раз в минуту'}</span>
      </div>
      <div class="chips" role="group" aria-label="Наличие">
        <button type="button" class="chip${filter === 'all' ? ' active' : ''}" data-f="all">Все<b>${base.length}</b></button>
        <button type="button" class="chip${filter === 'yes' ? ' active' : ''}" data-f="yes">В наличии<b>${yes}</b></button>
        <button type="button" class="chip${filter === 'no' ? ' active' : ''}" data-f="no">Нет в наличии<b>${base.length - yes}</b></button>
      </div>
      <div class="chips" role="group" aria-label="Категории">
        <button type="button" class="chip${!cat ? ' active' : ''}" data-c="">Все категории</button>
        ${shownCats.map((c) => `<button type="button" class="chip${cat === c.id ? ' active' : ''}" data-c="${esc(c.id)}">${esc(tr(c.name))}</button>`).join('')}
      </div>
      ${shown.length ? shownCats.map((c) => {
        const items = shown.filter((d) => d.category_id === c.id);
        if (!items.length) return '';
        return `<section class="panel"><div class="panel-head"><h3>${esc(tr(c.name))}<small>${items.length}</small></h3></div>
          <ul class="rows">${items.map((d) => `
            <li class="${d.available ? '' : 'is-off'}" data-dish="${esc(d.id)}" role="button" tabindex="0" style="cursor:pointer">
              ${photo(d)}
              <div class="grow"><b>${esc(tr(d.name))}</b><small>${esc([d.name?.en && d.name.en !== tr(d.name) ? d.name.en : '', amount(d)].filter(Boolean).join(' · '))}</small></div>
              <span class="price">${money(d.price)}</span>
              <span class="state-badge ${d.available ? 'ok' : 'no'}">${d.available ? 'В наличии' : 'Нет в наличии'}</span>
            </li>`).join('')}</ul></section>`;
      }).join('') : `<div class="a-empty">${list.length ? 'Ничего не нашлось. Попробуйте другое слово или фильтр.' : 'В меню пока нет блюд.'}</div>`}`;
    if (keepFocus) {
      const inp = $('#w-search');
      inp.focus();
      inp.setSelectionRange(inp.value.length, inp.value.length);
    }
  }

  function showDish(id) {
    const d = dishes.find((x) => x.id === id);
    if (!d) return;
    const names = Object.entries(d.name || {}).filter(([, v]) => v).map(([k, v]) => `<li><b>${LANG_NAMES[k] || k}</b> ${esc(v)}</li>`).join('');
    S.modal(`
      <div class="photo" style="width:100%;height:auto;aspect-ratio:4/3;border-radius:16px;margin-bottom:14px">${d.photo_url ? `<img src="${esc(d.photo_url)}" alt="">` : icon('dish')}</div>
      <h2 id="modal-title">${esc(tr(d.name))}</h2>
      <p style="margin:6px 0 0"><span class="state-badge ${d.available ? 'ok' : 'no'}">${d.available ? 'В наличии' : 'Нет в наличии'}</span>
        ${(d.tags || []).map((t) => `<span class="state-badge muted">${esc(TAGS[t] || t)}</span>`).join(' ')}</p>
      <p style="font-size:22px;font-weight:800;margin:12px 0 0">${money(d.price)} <small style="font-size:14px;color:var(--muted);font-weight:600">${esc([amount(d), d.kcal ? `${d.kcal} ккал` : ''].filter(Boolean).join(' · '))}</small></p>
      ${tr(d.desc) ? `<p class="section-label">Описание</p><p style="margin:0;color:var(--muted)">${esc(tr(d.desc))}</p>` : ''}
      ${tr(d.ingredients) ? `<p class="section-label">Состав</p><p style="margin:0;color:var(--muted)">${esc(tr(d.ingredients))}</p>` : ''}
      ${d.allergens?.length ? `<p class="section-label">Аллергены</p><p style="margin:0;color:var(--muted)">${esc(d.allergens.map((a) => ALLERGENS[a] || a).join(', '))}</p>` : ''}
      ${names ? `<p class="section-label">Название на языках гостей</p><ul style="margin:4px 0 0;padding-inline-start:18px;color:var(--muted)">${names}</ul>` : ''}
      <div class="modal-foot"><button type="button" class="btn ghost" data-modal-close>Закрыть</button></div>`);
  }

  async function load() {
    try {
      [cats, dishes, S.settings] = await Promise.all([api.categories(), api.dishes(), api.settings()]);
      paintBrand();
      render();
    } catch (e) {
      S.toast(S.errText(e), true);
    }
  }

  function paintBrand() {
    const st = S.settings;
    if (!st) return;
    $('#a-sub').textContent = st.name;
    const words = String(st.name || '').split(/\s+/).filter((w) => /\p{L}/u.test(w));
    $('#a-logo').innerHTML = st.logo_url ? `<img src="${esc(st.logo_url)}" alt="">` : esc((words.slice(0, 2).map((w) => w.match(/\p{L}/u)[0]).join('') || 'R').toUpperCase());
  }

  document.addEventListener('input', (e) => {
    if (e.target.id === 'w-search') { q = e.target.value; render(); }
  });
  document.addEventListener('click', (e) => {
    const f = e.target.closest('[data-f]');
    if (f) { filter = f.dataset.f; render(); return; }
    const c = e.target.closest('[data-c]');
    if (c) { cat = c.dataset.c; render(); return; }
    const d = e.target.closest('[data-dish]');
    if (d) showDish(d.dataset.dish);
  });
  document.addEventListener('keydown', (e) => {
    if ((e.key === 'Enter' || e.key === ' ') && e.target.matches?.('[data-dish]')) { e.preventDefault(); showDish(e.target.dataset.dish); }
  });

  S.start({
    need: 'waiter',
    async onReady(ctx) {
      api = ctx.api;
      paintBrand();
      await load();
      stop?.();
      stop = api.subscribe(['dishes', 'categories', 'settings'], () => load(), (ok) => { live = ok; render(); });
      clearInterval(timer);
      timer = setInterval(() => { if (!document.hidden) load(); }, 60000);
    },
    onLogout() { stop?.(); stop = null; clearInterval(timer); },
  });
})();

// =====================================================================
//  QR «Проверить чек» на чеках (2026-11-23).
//  Ссылка verify.html?b=<id счёта>&k=<код> открывает ОРИГИНАЛ чека из базы —
//  подделку в фотошопе видно сразу. Используют app.js (чек гостя) и floor.js (печать 80 мм).
//  Библиотека QR — qrcode-generator 1.4.4 (та же, что в owner.html), грузится только когда нужна.
//  Ссылка всегда на сайт ресторана — и с локальной копии, и из приложения.
// =====================================================================
(() => {
  'use strict';
  const SITE = 'https://affax1.github.io/central-asia-menu/';
  const LIB = 'https://cdn.jsdelivr.net/npm/qrcode-generator@1.4.4/qrcode.js';

  const url = (id, key) => `${SITE}verify.html?b=${encodeURIComponent(id)}&k=${encodeURIComponent(key)}`;
  // коротко для текста под QR: affax1.github.io/central-asia-menu/verify
  const short = () => `${SITE.replace(/^https:\/\//, '')}verify`;
  // ABCDEFGHJKLM → ABCD-EFGH-JKLM
  const code = (key) => (String(key || '').toUpperCase().replace(/[^A-Z0-9]/g, '').match(/.{1,4}/g) || []).join('-');

  let loading = null;
  // true — библиотека есть; false — не загрузилась (нет сети): чек всё равно печатается с кодом и адресом
  function load(timeout = 6000) {
    if (typeof window.qrcode === 'function') return Promise.resolve(true);
    if (!loading) {
      loading = new Promise((res) => {
        const s = document.createElement('script');
        s.src = LIB;
        s.async = true;
        s.onload = () => res(typeof window.qrcode === 'function');
        s.onerror = () => { s.remove(); loading = null; res(false); };
        document.head.appendChild(s);
      });
    }
    return Promise.race([loading, new Promise((r) => setTimeout(() => r(false), timeout))]);
  }

  // SVG без размытия: белое поле в 4 модуля, тёмные модули — горизонтальные полосы одним path,
  // shape-rendering crispEdges — на термоленте края чёткие, между соседними модулями нет швов.
  // mm — размер для печати: модуль подгоняется под целое число точек термопринтера 203 dpi (8 точек на мм),
  // чтобы каждый квадратик QR печатался одинаковым, без «полуточек» на краях (28 мм → 26,5 мм при 53 модулях).
  function svg(text, { size = '', mm = 0, cls = 'rq-svg', color = '#000', label = 'QR' } = {}) {
    if (typeof window.qrcode !== 'function') return '';
    const q = window.qrcode(0, 'M');
    q.addData(text);
    q.make();
    const n = q.getModuleCount();
    const m = 4;
    const w = n + m * 2;
    let d = '';
    for (let r = 0; r < n; r++) {
      for (let c = 0; c < n; c++) {
        if (!q.isDark(r, c)) continue;
        let len = 1;
        while (c + len < n && q.isDark(r, c + len)) len++;
        d += `M${c + m} ${r + m}h${len}v1h-${len}z`;
        c += len - 1;
      }
    }
    if (mm) size = `${(Math.max(1, Math.round((mm / w) * 8)) / 8) * w}mm`;
    const wh = size ? ` width="${size}" height="${size}"` : '';
    return `<svg class="${cls}" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${w} ${w}"${wh} shape-rendering="crispEdges" role="img" aria-label="${String(label).replace(/[&<>"]/g, '')}"><rect width="${w}" height="${w}" fill="#fff"/><path d="${d}" fill="${color}"/></svg>`;
  }

  window.ReceiptQR = { SITE, url, short, code, load, svg };
})();

/* Тур «Как пользоваться» для организатора. Собственная лёгкая реализация без внешних библиотек:
   SVG-затемнение с вырезом + подсказка (popover). Сценарий рассчитан на демо-дату 1 декабря 2026:
   тур сам её выставит. Целевые элементы ищутся по атрибутам data-tour="..." в index.html.

   Геометрия считается от реальных размеров окна и текущей прокрутки (см. раздел «Экскурсия» в README):
   - вырез = getBoundingClientRect() цели ∩ окно ∩ видимая часть КАЖДОГО предка с overflow
     минус липкие (position:sticky) шапка и первый столбец, которые закрывают край контейнера;
   - перед показом шага цель прокручивается во всех вложенных контейнерах и сдвигается так,
     чтобы рядом с ней осталось место под подсказку;
   - подсказка выбирает сторону по свободному месту, а при низком окне (< 640 px) становится нижней панелью. */
(function () {
  var DEMO_DATE = '2026-12-01T00:00';
  var $ = function (s, r) { return (r || document).querySelector(s); };
  var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };
  var byTour = function (n) { return function () { return $('[data-tour="' + n + '"]'); }; };
  var sleep = function (ms) { return new Promise(function (r) { setTimeout(r, ms); }); };
  var frame = function () { return new Promise(function (r) { requestAnimationFrame(function () { r(); }); }); };
  async function frames(n) { for (var i = 0; i < n; i++) await frame(); }
  async function waitFor(fn, ms) {
    var t0 = Date.now();
    while (Date.now() - t0 < (ms || 1500)) { var v = fn(); if (v) return v; await sleep(40); }
    return null;
  }
  function tab(name) { return $$('[role=tab]').filter(function (b) { return b.textContent.trim().indexOf(name) === 0; })[0]; }
  async function openTab(name) {
    var t = tab(name); if (!t) return;
    if (t.getAttribute('aria-selected') !== 'true') t.click();
    await waitFor(function () { var x = tab(name); return x && x.getAttribute('aria-selected') === 'true'; });
    await sleep(120);
  }
  /* плашка «Демо · сегодня» (inline-стиль в разметке пишется как «bottom:104px», в DOM — «bottom: 104px») */
  function demoPill() { return $('div[style*="bottom:104px"]') || $('div[style*="bottom: 104px"]'); }
  async function setDemoDate(iso) {
    var wrap = demoPill();
    if (!wrap) return;
    var cur = $('[data-demo-date][aria-selected=true]');
    if (cur && cur.getAttribute('data-demo-date') === iso) return;
    if (!$('[data-demo-date]')) wrap.querySelector('button[aria-haspopup=listbox]').click();
    var opt = await waitFor(function () { return $('[data-demo-date="' + iso + '"]'); });
    if (opt) opt.click();
    await sleep(250);
  }
  /* Готовность экрана: ждём не вкладку, а саму перерисовку содержимого. */
  var ready = {
    draft: function () { return !!$('#dc-root [role=note]'); },
    month: function () { return !!$('#dc-root [role=table] input'); },
    summary: function () {
      var t = $('#dc-root [role=table]');
      return !!t && t.textContent.indexOf('Итог') !== -1 && t.textContent.indexOf('Рейтинг наставника за месяц') === -1;
    }
  };
  var ic = function (name) { return '<span class="lb-ic">' + name + '</span>'; };

  /* el — функция, возвращающая цель шага (null у вводного и заключительного шагов).
     side — предпочтительная сторона подсказки (мягкая: если места нет, выбирается другая).
     inline:'end' — если цель шире контейнера, показать её правый край (там подпись и значение).
     prep — подготовка экрана перед шагом (работает и при «Назад»). */
  var STEPS = [
    { icon: 'waving_hand', title: 'Как оценивать наставников',
      text: 'Экскурсия займёт две минуты. Пройдём путь организатора: <b>сезон → критерии → оценки → сводный рейтинг</b>. В любой момент её можно закрыть и вернуться кнопкой «Как пользоваться».',
      prep: async function () { await setDemoDate(DEMO_DATE); await openTab('Дек'); await waitFor(ready.draft, 2500); } },
    { icon: 'calendar_month', title: 'Выберите сезон', el: byTour('season'),
      text: 'Сезон проектной деятельности: <b>осень</b> (сентябрь – февраль) или <b>весна</b> (март – август). В списке у каждого сезона видно, на каком он этапе: «идёт оценка», «завершён», «не начат».',
      side: 'bottom' },
    { icon: 'view_timeline', title: 'Шесть месяцев сезона', el: byTour('months'),
      text: 'Внизу месяцы выбранного сезона. <b>Точка</b> показывает статус: зелёная — идёт оценка, серая — закрыт. Подпись «до 31 дек» — последний день, когда оценки можно ставить и менять.',
      note: 'Месяц открыт для оценки весь свой срок и весь следующий месяц. Поэтому одновременно открыты два месяца: текущий и предыдущий. Потом он закрывается сам.',
      side: 'top' },
    { icon: 'tune', title: 'Шаг 1. Критерии месяца', el: byTour('criteria'),
      text: 'Новый месяц начинается с критериев: по ним организатор будет оценивать каждую команду. <b>Наставники и их команды сюда загружаются с витрины проектов.</b> Менять их в системе нельзя, по вопросам составов обращайтесь на витрину.',
      side: 'bottom', prep: async function () { await openTab('Дек'); await waitFor(ready.draft, 2500); } },
    { icon: 'play_arrow', title: 'Начать оценку', el: byTour('start-eval'),
      text: 'Критерии готовы — нажмите «Начать оценку». После этого <b>критерии нельзя изменить</b>, а в таблице появятся строки для оценок. Кнопка недоступна, пока нет ни одного критерия или месяц ещё не наступил.',
      side: 'bottom', prep: async function () { await openTab('Дек'); await waitFor(ready.draft, 2500); } },
    { icon: 'schedule', title: 'Срок оценки', el: byTour('deadline'),
      text: 'Над таблицей всегда написано, <b>до какого числа</b> можно ставить и менять оценки. После этой даты месяц зафиксируется автоматически, кнопки «Зафиксировать» нет.',
      note: 'Не успели проставить всё — незаполненные ячейки останутся пустыми, а строки с пустыми ячейками не попадут в рейтинг наставника.',
      side: 'bottom', prep: async function () { await openTab('Ноя'); await waitFor(ready.month, 2500); } },
    { icon: 'edit', title: 'Поставьте балл', el: byTour('score-cell'),
      text: 'Введите целое число от 0 до максимума критерия. Сохранение идёт <b>автоматически</b>, когда вы выходите из ячейки. Enter переводит вниз по столбцу, Tab — вправо.',
      note: 'Неверное значение подсветится красным, а в расчёте останется прежний балл.',
      side: 'bottom', prep: async function () { await openTab('Ноя'); await waitFor(ready.month, 2500); } },
    { icon: 'monitoring', title: 'Рейтинг наставника', el: byTour('mentor-rating'), inline: 'end',
      text: 'Процент по строке считается, только когда заполнены <b>все критерии</b> команды. Рейтинг наставника за месяц — среднее по его полностью оценённым командам. Подпись «по N из M команд» показывает, сколько команд уже учтено.',
      side: 'bottom', prep: async function () { await openTab('Ноя'); await waitFor(ready.month, 2500); } },
    { icon: 'chat', title: 'Комментарий к команде', el: byTour('comment-btn'),
      text: 'К каждой команде можно оставить комментарий: что получилось, что обсуждали с наставником. Пустой текст комментарий удаляет.',
      side: 'right', prep: async function () { await openTab('Ноя'); await waitFor(ready.month, 2500); } },
    { icon: 'search', title: 'Поиск и выгрузка', el: byTour('search-export'),
      text: 'Найдите наставника или команду, отсортируйте список «как на витрине» или по рейтингу, выгрузите то, что видно на экране, в <b>CSV</b>.',
      side: 'bottom', prep: async function () { await openTab('Ноя'); await waitFor(ready.month, 2500); } },
    { icon: 'functions', title: 'Сводка сезона', el: byTour('summary-tab'),
      text: 'Первая вкладка собирает итог за весь сезон. Откроем её.',
      side: 'top', prep: async function () { await openTab('Ноя'); await waitFor(ready.month, 2500); } },
    { icon: 'leaderboard', title: 'Сводный рейтинг', el: byTour('summary-head'),
      text: 'Шесть колонок — месяцы сезона, справа <b>Итог</b>: среднее месячных рейтингов наставника, все месяцы весят одинаково. Пустая ячейка значит «в этом месяце наставника не было», прочерк — «был, но нет полностью оценённой команды».',
      note: 'В итог входят только месяцы, где идёт оценка или она закрыта и есть баллы.',
      side: 'top', prep: async function () { var t = $('[data-tour="summary-tab"]'); if (t && t.getAttribute('aria-selected') !== 'true') t.click(); await waitFor(ready.summary, 3000); } },
    { icon: 'task_alt', title: 'Готово',
      text: 'Порядок работы в каждом месяце: <b>критерии → начать оценку → баллы и комментарии → до срока вносить правки</b>. Дальше система закрывает месяц сама.',
      note: 'Экскурсию можно пройти снова кнопкой «Как пользоваться» в шапке страницы.' }
  ];

  /* ====================== Геометрия ====================== */
  var M = 12;          // минимальный отступ подсказки от края окна
  var GAP = 14;        // расстояние от выреза до подсказки (внутри него стрелка 8 px)
  var MINH = 150;      // минимальная высота подсказки с внутренней прокруткой
  var PAD = 0;         // припуск выреза на сторонах, которые ничем не обрезаны
  var SHEET_BELOW = 640; // окна ниже этого значения по высоте: режим «нижняя панель»
  var clamp = function (v, a, b) { return Math.max(a, Math.min(b, v)); };
  function viewport() { var d = document.documentElement; return { w: d.clientWidth, h: d.clientHeight }; }
  function clientBox(e) {
    var r = e.getBoundingClientRect();
    return { l: r.left + e.clientLeft, t: r.top + e.clientTop, r: r.left + e.clientLeft + e.clientWidth, b: r.top + e.clientTop + e.clientHeight };
  }
  /* Липкие элементы контейнера (шапка таблицы, первый столбец). Список кэшируется до смены DOM. */
  var domVer = 0, stickyCache = new WeakMap();
  function stickies(c) {
    var e = stickyCache.get(c);
    if (e && e.v === domVer) return e.list;
    var list = [];
    $$('*', c).forEach(function (n) {
      var cs = getComputedStyle(n);
      if (cs.position !== 'sticky') return;
      /* липкий элемент липнет к ближайшему предку с overflow: только он и закрывает край этого контейнера */
      var o = n.parentElement;
      while (o && o !== c && !isClipper(getComputedStyle(o))) o = o.parentElement;
      if (o === c) list.push({ el: n, top: cs.top !== 'auto', left: cs.left !== 'auto' });
    });
    stickyCache.set(c, { v: domVer, list: list });
    return list;
  }
  function related(a, b) { return a === b || a.contains(b) || b.contains(a); }
  function isClipper(cs) { return cs.overflowX !== 'visible' || cs.overflowY !== 'visible'; }
  /* Видимая часть элемента: окно ∩ каждый предок-контейнер, минус липкие шапка и столбец, закрывающие край. */
  function visibleRect(el) {
    var raw = el.getBoundingClientRect(), v = viewport();
    var L = Math.max(raw.left, 0), T = Math.max(raw.top, 0), R = Math.min(raw.right, v.w), B = Math.min(raw.bottom, v.h);
    for (var p = el.parentElement; p && p !== document.documentElement; p = p.parentElement) {
      var cs = getComputedStyle(p);
      if (!isClipper(cs)) continue;
      var cb = clientBox(p);
      L = Math.max(L, cb.l); T = Math.max(T, cb.t); R = Math.min(R, cb.r); B = Math.min(B, cb.b);
      var st = stickies(p);
      for (var k = 0; k < st.length; k++) {
        var s = st[k]; if (related(s.el, el)) continue;
        var sr = s.el.getBoundingClientRect();
        if (s.top && sr.top <= Math.max(T, cb.t) + 1 && sr.bottom > T && sr.right > L && sr.left < R) T = Math.max(T, sr.bottom);
        if (s.left && sr.left <= Math.max(L, cb.l) + 1 && sr.right > L && sr.bottom > T && sr.top < B) L = Math.max(L, sr.right);
      }
    }
    var out = { l: L, t: T, r: R, b: B, w: R - L, h: B - T, empty: R - L < 1 || B - T < 1,
      cl: L > raw.left + 0.5, ct: T > raw.top + 0.5, cr: R < raw.right - 0.5, cb: B < raw.bottom - 0.5 };
    return out;
  }
  /* Контейнеры, которые реально прокручиваются, от внутреннего к внешнему. */
  function scrollChain(el) {
    var list = [];
    for (var p = el.parentElement; p; p = p.parentElement) {
      if (p === document.documentElement || p === document.body) continue;
      var cs = getComputedStyle(p);
      var y = /(auto|scroll)/.test(cs.overflowY) && p.scrollHeight > p.clientHeight + 1;
      var x = /(auto|scroll)/.test(cs.overflowX) && p.scrollWidth > p.clientWidth + 1;
      if (x || y) list.push({ el: p, x: x, y: y });
    }
    var se = document.scrollingElement;
    if (se && (se.scrollHeight > se.clientHeight + 1 || se.scrollWidth > se.clientWidth + 1)) list.push({ el: se, x: true, y: true, root: true });
    return list;
  }
  /* Область контейнера, где элемент виден: client box минус липкие края, которые не относятся к цели. */
  function region(c, el) {
    var v = viewport();
    var cb = c.root ? { l: 0, t: 0, r: v.w, b: v.h } : clientBox(c.el);
    if (!c.root) {
      stickies(c.el).forEach(function (s) {
        if (related(s.el, el)) return;
        var sr = s.el.getBoundingClientRect();
        if (s.top && sr.top <= cb.t + 1 && sr.bottom > cb.t && sr.bottom < cb.b) cb.t = sr.bottom;
        if (s.left && sr.left <= cb.l + 1 && sr.right > cb.l && sr.right < cb.r) cb.l = sr.right;
      });
    }
    return cb;
  }
  function scrollTo(c, left, top) {
    var e = c.el; try { e.scrollTo({ left: left, top: top, behavior: 'instant' }); } catch (x) { e.scrollLeft = left; e.scrollTop = top; }
  }
  /* Показать цель целиком (или максимум возможного) во всех контейнерах: изнутри наружу. */
  function reveal(el, step) {
    scrollChain(el).forEach(function (c) {
      var r = el.getBoundingClientRect(), g = region(c, el), top = c.el.scrollTop, left = c.el.scrollLeft;
      if (c.y) {
        var avail = g.b - g.t, dy = 0;
        if (r.height > avail) dy = r.top - g.t;
        else if (r.top < g.t) dy = r.top - g.t;
        else if (r.bottom > g.b) dy = r.bottom - g.b;
        top += dy;
      }
      if (c.x) {
        var aw = g.r - g.l, dx = 0;
        if (r.width > aw) dx = (step && step.inline === 'end') ? r.right - g.r : r.left - g.l;
        else if (r.left < g.l) dx = r.left - g.l;
        else if (r.right > g.r) dx = r.right - g.r;
        left += dx;
      }
      scrollTo(c, left, top);
    });
  }
  /* Сдвинуть цель по вертикали на dy (dy > 0 — вниз), не теряя видимости. Возвращает видимую часть после сдвига. */
  function shiftTarget(el, dy) {
    var chain = scrollChain(el).filter(function (c) { return c.y; }).reverse(); // снаружи внутрь
    var snap = chain.map(function (c) { return c.el.scrollTop; });
    var r0 = visibleRect(el);
    function apply(amount) {
      chain.forEach(function (c, i) { c.el.scrollTop = snap[i]; });
      var rem = amount;
      for (var i = 0; i < chain.length && Math.abs(rem) > 0.5; i++) {
        var old = chain[i].el.scrollTop; chain[i].el.scrollTop = old - rem; rem -= (old - chain[i].el.scrollTop);
      }
    }
    var full = function (r) { return !r.empty && r.h >= r0.h - 1.5 && r.w >= r0.w - 1.5; };
    apply(dy); var r1 = visibleRect(el); if (full(r1)) return r1;
    var lo = 0, hi = dy;
    for (var k = 0; k < 9; k++) { var mid = (lo + hi) / 2; apply(mid); if (full(visibleRect(el))) lo = mid; else hi = mid; }
    apply(lo); return visibleRect(el);
  }
  function snapshot(el) { return scrollChain(el).map(function (c) { return [c.el, c.el.scrollLeft, c.el.scrollTop]; }); }
  function restore(s) { s.forEach(function (a) { a[0].scrollLeft = a[1]; a[0].scrollTop = a[2]; }); }

  /* Кандидаты положения подсказки вокруг выреза r для подсказки W×H. */
  function sides(r, W, H, v) {
    var cx = (r.l + r.r) / 2, cy = (r.t + r.b) / 2, o = {};
    var x = clamp(cx - W / 2, M, v.w - M - W);
    var a = v.h - M - (r.b + GAP);
    o.bottom = { side: 'bottom', avail: a, fit: a >= H, h: Math.min(H, a), x: x, y: r.b + GAP };
    a = r.t - GAP - M;
    o.top = { side: 'top', avail: a, fit: a >= H, h: Math.min(H, a), x: x, y: r.t - GAP - Math.min(H, a) };
    var hh = Math.min(H, v.h - 2 * M), y = clamp(cy - hh / 2, M, v.h - M - hh);
    a = v.w - M - (r.r + GAP);
    o.right = { side: 'right', avail: a, fit: a >= W && H <= v.h - 2 * M, h: hh, x: r.r + GAP, y: y, ok: a >= W };
    a = r.l - GAP - M;
    o.left = { side: 'left', avail: a, fit: a >= W && H <= v.h - 2 * M, h: hh, x: r.l - GAP - W, y: y, ok: a >= W };
    return o;
  }
  var OPP = { top: 'bottom', bottom: 'top', left: 'right', right: 'left' };
  function order(pref) {
    var o = []; if (pref) { o.push(pref, OPP[pref]); }
    ['bottom', 'top', 'right', 'left'].forEach(function (s) { if (o.indexOf(s) < 0) o.push(s); });
    return o;
  }

  /* ====================== Тур ====================== */
  var drv = null;   // состояние открытого тура
  var busy = false;

  function build() {
    var ov = document.createElement('div');
    ov.className = 'lb-ov';
    ov.innerHTML = '<svg width="100%" height="100%" aria-hidden="true"><defs><mask id="lb-mask"><rect x="0" y="0" width="100%" height="100%" fill="#fff"/><rect class="lb-hole" x="0" y="0" width="0" height="0" rx="8" fill="#000"/></mask></defs>' +
      '<rect x="0" y="0" width="100%" height="100%" fill="#181c1e" fill-opacity="0.55" mask="url(#lb-mask)"/></svg>';
    var pop = document.createElement('div');
    pop.className = 'lb-pop'; pop.setAttribute('role', 'dialog'); pop.setAttribute('aria-modal', 'true'); pop.setAttribute('aria-labelledby', 'lb-pop-title');
    pop.setAttribute('data-ready', '0');
    pop.innerHTML = '<div class="lb-arrow"></div>' +
      '<button type="button" class="lb-pop-close" aria-label="Закрыть экскурсию">×</button>' +
      '<div class="lb-pop-title" id="lb-pop-title"></div>' +
      '<div class="lb-pop-body" tabindex="0"></div>' +
      '<div class="lb-pop-footer"><span class="lb-pop-progress"></span><span class="lb-pop-btns">' +
      '<button type="button" class="lb-pop-prev">Назад</button><button type="button" class="lb-pop-next">Далее</button></span></div>';
    document.body.appendChild(ov); document.body.appendChild(pop);
    return { ov: ov, pop: pop, hole: ov.querySelector('.lb-hole'), arrow: pop.querySelector('.lb-arrow'),
      title: pop.querySelector('.lb-pop-title'), body: pop.querySelector('.lb-pop-body'), progress: pop.querySelector('.lb-pop-progress'),
      prev: pop.querySelector('.lb-pop-prev'), next: pop.querySelector('.lb-pop-next'), close: pop.querySelector('.lb-pop-close') };
  }
  function fill(i) {
    var s = STEPS[i], d = drv;
    d.title.innerHTML = ic(s.icon) + '<span>' + s.title + '</span>';
    d.body.innerHTML = s.text + (s.note ? '<span class="lb-note">' + s.note + '</span>' : '');
    d.body.scrollTop = 0;
    d.progress.textContent = (i + 1) + ' из ' + STEPS.length;
    d.prev.style.display = i === 0 ? 'none' : '';
    d.next.textContent = i === STEPS.length - 1 ? 'Готово' : 'Далее';
  }
  function setHole(r) {
    var h = drv.hole;
    if (!r || r.empty) { h.setAttribute('width', 0); h.setAttribute('height', 0); drv.rect = null; return; }
    var l = r.l - (r.cl ? 0 : PAD), t = r.t - (r.ct ? 0 : PAD), rr = r.r + (r.cr ? 0 : PAD), b = r.b + (r.cb ? 0 : PAD);
    h.setAttribute('x', l); h.setAttribute('y', t); h.setAttribute('width', rr - l); h.setAttribute('height', b - t);
    h.setAttribute('rx', Math.min(8, (b - t) / 2));
    drv.rect = r;
  }
  function measure(W) {
    var p = drv.pop;
    p.style.width = W + 'px'; p.style.maxHeight = 'none'; p.style.left = '-9999px'; p.style.top = '0px'; p.classList.remove('lb-sheet');
    var body = drv.body; body.style.maxHeight = '';
    return p.offsetHeight;
  }
  /* Выбор положения без прокрутки: полностью помещается → частично с прокруткой текста → нижняя панель. */
  function choose(r, W, H, v, pref) {
    var c = sides(r, W, H, v), ord = order(pref), i;
    for (i = 0; i < ord.length; i++) if (c[ord[i]].fit) return c[ord[i]];
    var best = null;
    ord.forEach(function (s) {
      var k = c[s], room = (s === 'top' || s === 'bottom') ? k.avail >= MINH : k.ok;
      if (room && (!best || k.h > best.h + 0.5)) best = k;
    });
    return best;
  }
  function apply(plan, W, r) {
    var p = drv.pop, a = drv.arrow, v = viewport();
    var sheet = plan.side === 'sheet', center = plan.side === 'center';
    p.classList.toggle('lb-sheet', sheet);
    p.style.width = plan.w + 'px';
    p.style.left = Math.round(plan.x * 100) / 100 + 'px'; p.style.top = Math.round(plan.y * 100) / 100 + 'px';
    p.style.maxHeight = plan.h + 'px';
    a.style.display = center ? 'none' : '';
    p.setAttribute('data-side', plan.side);
    if (!center && r) {
      var side = sheet ? (plan.where === 'top' ? 'top' : 'bottom') : plan.side; // «bottom» = подсказка под целью, стрелка вверху
      a.className = 'lb-arrow lb-arrow-' + side;
      if (side === 'top' || side === 'bottom') {
        var ax = clamp((r.l + r.r) / 2 - plan.x, 20, plan.w - 20);
        a.style.left = (ax - 1) + 'px'; a.style.top = ''; /* −1: рамка подсказки */
      } else {
        var ay = clamp((r.t + r.b) / 2 - plan.y, 20, plan.h - 20);
        a.style.top = (ay - 1) + 'px'; a.style.left = '';
      }
    }
    p.setAttribute('data-ready', '1');
  }
  /* Нижняя панель (или верхняя, если цель в нижней части окна, например лента месяцев). */
  function sheetPlan(v, H, where) {
    var w = Math.min(v.w - 2 * M, 720), h = Math.min(H, Math.max(MINH, Math.floor(v.h * 0.5)));
    return { side: 'sheet', where: where || 'bottom', w: w, h: h, x: (v.w - w) / 2, y: where === 'top' ? M : v.h - M - h };
  }
  /* Выбор: панель снизу или сверху. Цель сдвигается прокруткой так, чтобы вырез остался вне панели. */
  function placeSheet(el, r, v, Ws) {
    var H = measure(Ws), h = Math.min(H, Math.max(MINH, Math.floor(v.h * 0.5)));
    var snap = snapshot(el), best = null;
    var opts = (r.t + r.b) / 2 > v.h / 2 ? ['top', 'bottom'] : ['bottom', 'top'];
    for (var k = 0; k < opts.length; k++) {
      var where = opts[k]; restore(snap);
      var rr = visibleRect(el);
      var need = where === 'bottom' ? (rr.b + GAP) - (v.h - M - h) : (M + h + GAP) - rr.t;
      if (need > 0) rr = shiftTarget(el, where === 'bottom' ? -need : need);
      var over = where === 'bottom' ? Math.max(0, (rr.b + GAP) - (v.h - M - h)) : Math.max(0, (M + h + GAP) - rr.t);
      var cand = { where: where, over: over, snap: snapshot(el) };
      if (!best || over < best.over) best = cand;
      if (over <= 0.5) break;
    }
    restore(best.snap);
    return { plan: sheetPlan(v, H, best.where), r: visibleRect(el) };
  }
  function centerPlan(v, W, H) {
    var h = Math.min(H, v.h - 2 * M);
    return { side: 'center', w: W, h: h, x: (v.w - W) / 2, y: (v.h - h) / 2 };
  }
  function resolveTarget(i) { var s = STEPS[i]; var e = s.el && s.el(); return e && document.contains(e) ? e : null; }
  function sig(el) {
    var r = el.getBoundingClientRect();
    return [r.left, r.top, r.width, r.height].map(function (n) { return Math.round(n * 2); }).join(',') +
      '|' + scrollChain(el).map(function (c) { return Math.round(c.el.scrollTop) + ':' + Math.round(c.el.scrollLeft); }).join(',');
  }
  /* Цель готова, когда она есть в документе и её положение не меняется ~130 мс. Узел могут заменить: ищем заново. */
  async function stable(i, ms) {
    var t0 = Date.now(), prev = null, node = null, since = 0;
    while (Date.now() - t0 < (ms || 3000)) {
      var n = resolveTarget(i);
      if (n) {
        var k = sig(n);
        if (n === node && k === prev) { if (Date.now() - since >= 130) return n; }
        else { node = n; prev = k; since = Date.now(); }
      } else { node = null; prev = null; }
      await frame();
    }
    return resolveTarget(i);
  }

  /* Полный расчёт шага: ждём цель, прокручиваем, ищем положение подсказки (при необходимости сдвигаем цель). */
  async function layoutStep(i, my) {
    var d = drv, s = STEPS[i], v = viewport();
    var sheetMode = v.h < SHEET_BELOW;
    var Wn = Math.min(380, v.w - 32), Ws = Math.min(v.w - 2 * M, 720);
    d.pop.setAttribute('data-ready', '0');
    if (!s.el) {
      setHole(null);
      var Hc = measure(Wn); apply(centerPlan(v, Wn, Hc), Wn, null); return;
    }
    var el = await stable(i, 3000);
    if (my !== d.gen) return;
    if (!el) { setHole(null); var H0 = measure(Wn); apply(centerPlan(v, Wn, H0), Wn, null); return; }
    reveal(el, s);
    await frames(2);
    el = resolveTarget(i) || el;
    reveal(el, s); await frames(1);
    if (my !== d.gen) return;
    var r = visibleRect(el), W = sheetMode ? Ws : Wn, H = measure(W), plan = null;
    if (r.empty) { setHole(null); apply(centerPlan(v, Wn, measure(Wn)), Wn, null); return; }
    if (sheetMode) {
      var sp = placeSheet(el, r, v, Ws); plan = sp.plan; r = sp.r;
    } else {
      plan = choose(r, W, H, v, s.side);
      if (!plan || !plan.fit) {
        /* сдвигаем цель так, чтобы с одной из сторон освободилось место под всю подсказку */
        var snap0 = snapshot(el), cands = [];
        order(s.side).forEach(function (side) {
          if (plan && plan.fit) return;
          if (side !== 'top' && side !== 'bottom') return;
          restore(snap0);
          var rr = visibleRect(el), shifted;
          var need2 = side === 'bottom' ? (rr.b + GAP + H) - (v.h - M) : (M + H + GAP) - rr.t;
          shifted = need2 > 0 ? shiftTarget(el, side === 'bottom' ? -need2 : need2) : rr;
          var c = sides(shifted, W, H, v)[side];
          if (c.fit) { plan = c; r = shifted; }
          else if (c.avail >= MINH) cands.push({ c: c, r: shifted, snap: snapshot(el) });
        });
        if (!plan || !plan.fit) {
          restore(snap0);
          var bestC = null; cands.forEach(function (k) { if (!bestC || k.c.h > bestC.c.h) bestC = k; });
          var rr0 = visibleRect(el);
          var base = choose(rr0, W, H, v, s.side);
          if (bestC && (!base || bestC.c.h > base.h + 0.5)) { restore(bestC.snap); plan = bestC.c; r = visibleRect(el); }
          else if (base) { plan = base; r = rr0; }
        }
        if (!plan) { r = visibleRect(el); plan = null; }
      } else { /* уже помещается */ }
    }
    if (!plan) { /* ни одна сторона не годится — нижняя панель */
      var sp2 = placeSheet(el, visibleRect(el), v, Ws); plan = sp2.plan; r = sp2.r;
      W = Ws;
    }
    await frames(2);
    el = resolveTarget(i) || el;
    r = visibleRect(el);
    if (my !== d.gen) return;
    /* при пересчёте после прокрутки положение подсказки уточняем под фактический вырез */
    var finalPlan;
    if (plan.side === 'sheet') finalPlan = sheetPlan(v, measure(Ws), plan.where);
    else {
      var Hf = measure(W), cf = sides(r, W, Hf, v)[plan.side];
      var okSide = (plan.side === 'top' || plan.side === 'bottom') ? cf.avail >= MINH : cf.ok;
      finalPlan = okSide ? cf : (choose(r, W, Hf, v, s.side) || sheetPlan(v, measure(Ws), 'bottom'));
    }
    if (finalPlan.side !== 'sheet') finalPlan.w = W;
    finalPlan.w = finalPlan.w || W;
    setHole(r);
    apply(finalPlan, W, r);
    d.plan = finalPlan; d.W = W;
  }

  async function show(i) {
    var d = drv; if (!d) return;
    var my = ++d.gen; d.cur = i; d.planning = true;
    var s = STEPS[i];
    d.pop.setAttribute('data-ready', '0'); d.pop.classList.add('lb-busy'); setHole(null);
    fill(i);
    if (s.prep) await s.prep();
    if (my !== d.gen || !drv) return;
    fill(i);
    await layoutStep(i, my);
    if (my !== d.gen || !drv) return;
    d.pop.classList.remove('lb-busy'); d.planning = false;
    try { d.next.focus({ preventScroll: true }); } catch (e) {}
    watch(i);
  }
  /* Наблюдатели: замена узла, изменение размеров, прокрутка и размер окна. Цикл rAF держит вырез на цели. */
  function watch(i) {
    var d = drv; if (!d) return;
    if (d.ro) d.ro.disconnect();
    var el = resolveTarget(i);
    if (d.ro && el) { d.ro.observe(el); scrollChain(el).forEach(function (c) { d.ro.observe(c.el); }); }
  }
  function tick() {
    var d = drv; if (!d) return;
    d.raf = requestAnimationFrame(tick);
    if (d.planning || d.cur < 0) return;
    var i = d.cur, s = STEPS[i]; if (!s.el) return;
    var el = resolveTarget(i);
    if (!el) { d.lost = (d.lost || 0) + 1; if (d.lost > 3 && !d.replan) schedule(0); return; }
    d.lost = 0;
    if (el !== d.watched) { d.watched = el; watch(i); }
    var r = visibleRect(el), o = d.rect;
    if (r.empty) { if (o) { setHole(null); } return; }
    if (!o || Math.abs(r.l - o.l) > 0.25 || Math.abs(r.t - o.t) > 0.25 || Math.abs(r.r - o.r) > 0.25 || Math.abs(r.b - o.b) > 0.25) {
      var big = o && (Math.abs(r.w - o.w) > 1.5 || Math.abs(r.h - o.h) > 1.5);
      setHole(r);
      if (d.plan) {
        var v = viewport(), W = d.W, H = measure(W), plan = d.plan.side === 'sheet' ? sheetPlan(v, H, d.plan.where) : choose(r, W, H, v, s.side);
        if (!plan) plan = sheetPlan(v, measure(Math.min(v.w - 2 * M, 720)), 'bottom');
        if (plan.side !== 'sheet') plan.w = W;
        apply(plan, W, r); d.plan = plan;
        if (big && !d.replan) schedule(150); // размер цели поменялся: пересчитать прокрутку и сторону
      }
    }
  }
  function schedule(ms) {
    var d = drv; if (!d) return;
    clearTimeout(d.replan);
    d.replan = setTimeout(function () { d.replan = null; if (drv && drv.cur >= 0 && !drv.planning) show(drv.cur); }, ms);
  }
  function onResize() { if (drv) { schedule(60); } }
  function onKey(e) {
    var d = drv; if (!d) return;
    if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); destroy(); return; }
    if (e.key === 'ArrowRight' && !(e.target && /^(INPUT|TEXTAREA)$/.test(e.target.tagName))) { e.preventDefault(); d.next.click(); return; }
    if (e.key === 'ArrowLeft' && d.cur > 0 && !(e.target && /^(INPUT|TEXTAREA)$/.test(e.target.tagName))) { e.preventDefault(); d.prev.click(); return; }
    if (e.key === 'Tab') {
      var f = [d.close, d.body, d.prev, d.next].filter(function (b) { return b.offsetParent !== null || b === d.close; });
      var ix = f.indexOf(document.activeElement);
      if (ix < 0) { e.preventDefault(); f[0].focus(); return; }
      var nx = e.shiftKey ? ix - 1 : ix + 1;
      if (nx < 0) nx = f.length - 1; if (nx >= f.length) nx = 0;
      e.preventDefault(); f[nx].focus();
    }
  }
  function destroy() {
    var d = drv; if (!d) return;
    drv = null; busy = false;
    cancelAnimationFrame(d.raf); clearTimeout(d.replan);
    if (d.ro) d.ro.disconnect(); if (d.mo) d.mo.disconnect();
    window.removeEventListener('resize', onResize); document.removeEventListener('keydown', onKey, true);
    if (window.visualViewport) window.visualViewport.removeEventListener('resize', onResize);
    d.ov.remove(); d.pop.remove();
    document.body.classList.remove('lb-touring');
    var b = $('[data-tour-start]'); if (b) { try { b.focus({ preventScroll: true }); } catch (e) {} }
  }
  function start() {
    if (busy) return;
    busy = true;
    var parts = build();
    drv = Object.assign(parts, { gen: 0, cur: -1, planning: true, rect: null, plan: null });
    drv.next.addEventListener('click', function () { var i = drv.cur; if (i === STEPS.length - 1) destroy(); else show(i + 1); });
    drv.prev.addEventListener('click', function () { if (drv.cur > 0) show(drv.cur - 1); });
    drv.close.addEventListener('click', destroy);
    drv.ov.addEventListener('click', function (e) {
      var r = drv.rect; if (r && e.clientX >= r.l && e.clientX <= r.r && e.clientY >= r.t && e.clientY <= r.b) return;
      destroy();
    });
    window.addEventListener('resize', onResize); document.addEventListener('keydown', onKey, true);
    document.addEventListener('scroll', function () {}, true);
    if (window.visualViewport) window.visualViewport.addEventListener('resize', onResize);
    var root = document.getElementById('dc-root') || document.body;
    drv.mo = new MutationObserver(function () { domVer++; });
    drv.mo.observe(root, { childList: true, subtree: true });
    drv.ro = typeof ResizeObserver === 'function' ? new ResizeObserver(function () { if (drv && !drv.planning) { var el = resolveTarget(drv.cur); if (!el) return; var r = visibleRect(el), o = drv.rect; if (o && !r.empty && (Math.abs(r.w - o.w) > 1.5 || Math.abs(r.h - o.h) > 1.5)) schedule(150); } }) : null;
    (async function () {
      var s0 = STEPS[0]; if (s0.prep) await s0.prep();
      if (!drv) return;
      document.body.classList.add('lb-touring'); /* плашка «Демо · сегодня» затемняется и не мешает подсказке */
      drv.raf = requestAnimationFrame(tick);
      show(0);
    })();
  }
  document.addEventListener('click', function (e) {
    if (e.target.closest && e.target.closest('[data-tour-start]')) { writeSeen(); hideInvite(); start(); }
  });
  window.startMentorTour = start;

  /* ---------- Приглашение на экскурсию (вариант В) ----------
     Правила:
     1. Плашка показывается, если тур ещё не видели или поднялась TOUR_VERSION.
     2. Любое действие (запуск тура, крестик) прячет её навсегда: повторно не навязываем.
     3. Кнопка «Как пользоваться» в шапке остаётся всегда.
     4. Состояние хранится в браузере. Для боевой системы можно перенести в профиль пользователя. */
  var TOUR_VERSION = 2; // поднимать при существенных изменениях процесса
  var KEY = 'mentor-eval-tour';
  var WHATS_NEW = 'Оценки теперь фиксируются автоматически, а связка наставников и команд берётся с витрины проектов. Экскурсия покажет, что изменилось.';
  function readSeen() { try { return JSON.parse(localStorage.getItem(KEY) || 'null'); } catch (e) { return null; } }
  function writeSeen() { try { localStorage.setItem(KEY, JSON.stringify({ version: TOUR_VERSION, at: new Date().toISOString() })); } catch (e) {} }
  function hideInvite() { var n = document.querySelector('.lb-invite'); if (n) n.remove(); document.body.classList.remove('lb-has-invite'); }
  async function showInvite() {
    try { if (/[?&]resettour\b/.test(location.search)) localStorage.removeItem(KEY); } catch (e) {}
    var seen = readSeen();
    if (seen && seen.version >= TOUR_VERSION) return;
    /* ждём, пока рантайм отрисует страницу (до этого в сыром HTML лежит шаблон, а #dc-root ещё нет) */
    var tl = await waitFor(function () { return document.querySelector('#dc-root [role=tablist]'); }, 15000);
    var root = document.getElementById('dc-root'); /* вставляем вне разметки рантайма: он её перерисовывает и стирает чужие узлы */
    if (!tl || !root || document.querySelector('.lb-invite')) return;
    var updated = !!seen;
    var box = document.createElement('div');
    box.className = 'lb-invite'; box.setAttribute('role', 'region'); box.setAttribute('aria-label', 'Приглашение на экскурсию');
    box.innerHTML =
      '<span class="lb-ic">' + (updated ? 'update' : 'waving_hand') + '</span>' +
      '<div class="lb-invite-body"><div class="lb-invite-title">' + (updated ? 'Мы обновили правила оценки' : 'Впервые в оценке наставников?') + '</div>' +
      '<div class="lb-invite-text">' + (updated ? WHATS_NEW : 'Двухминутная экскурсия покажет путь организатора: от критериев до сводного рейтинга. Позже её можно запустить кнопкой «Как пользоваться».') + '</div></div>' +
      '<button type="button" class="lb-invite-go">Пройти экскурсию</button>' +
      '<button type="button" class="lb-invite-x" aria-label="Закрыть приглашение"><span class="ms">close</span></button>';
    document.body.insertBefore(box, root); document.body.classList.add('lb-has-invite');
    box.querySelector('.lb-invite-go').addEventListener('click', function () { writeSeen(); hideInvite(); start(); });
    box.querySelector('.lb-invite-x').addEventListener('click', function () { writeSeen(); hideInvite(); });
  }
  var runInvite = function () { showInvite().catch(function (e) { console.log('INVITE ERR', e && e.message); }); };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', runInvite); else runInvite();

})();

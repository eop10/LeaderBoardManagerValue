/* Тур «Как пользоваться» для организатора. Библиотека: driver.js (MIT).
   Сценарий рассчитан на демо-дату 1 декабря 2026: тур сам её выставит.
   Элементы ищутся по ролям и подписям, а не по классам: разметка прототипа не менялась. */
(function () {
  var DEMO_DATE = '2026-12-01T00:00';
  var $ = function (s, r) { return (r || document).querySelector(s); };
  var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };
  var byText = function (sel, txt) {
    return $$(sel).filter(function (e) { return (e.textContent || '').indexOf(txt) !== -1; })[0] || null;
  };
  var sleep = function (ms) { return new Promise(function (r) { setTimeout(r, ms); }); };
  async function waitFor(fn, ms) {
    var t0 = Date.now();
    while (Date.now() - t0 < (ms || 1500)) { var v = fn(); if (v) return v; await sleep(40); }
    return null;
  }
  function tab(name) { return $$('[role=tab]').filter(function (b) { return b.textContent.trim().indexOf(name) === 0; })[0]; }
  async function openTab(name, selectedAfter) {
    var t = tab(name); if (!t) return;
    if (t.getAttribute('aria-selected') !== 'true') t.click();
    await waitFor(function () { var x = tab(name); return x && x.getAttribute('aria-selected') === 'true'; });
    await sleep(120);
  }
  async function setDemoDate(iso) {
    var wrap = $('div[style*="bottom:104px"]');
    if (!wrap) return;
    var cur = $('[data-demo-date][aria-selected=true]');
    if (cur && cur.getAttribute('data-demo-date') === iso) return;
    if (!$('[data-demo-date]')) wrap.querySelector('button[aria-haspopup=listbox]').click();
    var opt = await waitFor(function () { return $('[data-demo-date="' + iso + '"]'); });
    if (opt) opt.click();
    await sleep(250);
  }
  var ic = function (name) { return '<span class="lb-ic">' + name + '</span>'; };

  /* prep — подготовка экрана перед показом шага (работает и при «Назад»). */
  var STEPS = [
    { icon: 'waving_hand', title: 'Как оценивать наставников',
      text: 'Экскурсия займёт две минуты. Пройдём путь организатора: <b>сезон → критерии → оценки → сводный рейтинг</b>. В любой момент её можно закрыть и вернуться кнопкой «Как пользоваться».',
      prep: async function () { await setDemoDate(DEMO_DATE); await openTab('Дек'); } },
    { icon: 'calendar_month', title: 'Выберите сезон', el: function () { return $('button[aria-label="Сезон"]'); },
      text: 'Сезон проектной деятельности: <b>осень</b> (сентябрь – февраль) или <b>весна</b> (март – август). В списке у каждого сезона видно, на каком он этапе: «идёт оценка», «завершён», «не начат».',
      side: 'bottom' },
    { icon: 'view_timeline', title: 'Шесть месяцев сезона', el: function () { return $('[role=tablist]'); },
      text: 'Внизу месяцы выбранного сезона. <b>Точка</b> показывает статус: зелёная — идёт оценка, серая — закрыт. Подпись «до 31 дек» — последний день, когда оценки можно ставить и менять.',
      note: 'Месяц открыт для оценки весь свой срок и весь следующий месяц. Поэтому одновременно открыты два месяца: текущий и предыдущий. Потом он закрывается сам.',
      side: 'top' },
    { icon: 'tune', title: 'Шаг 1. Критерии месяца', el: function () { return $('[role=note]'); },
      text: 'Новый месяц начинается с критериев: по ним организатор будет оценивать каждую команду. <b>Наставники и их команды сюда загружаются с витрины проектов.</b> Менять их в системе нельзя, по вопросам составов обращайтесь на витрину.',
      side: 'bottom', prep: async function () { await openTab('Дек'); } },
    { icon: 'play_arrow', title: 'Начать оценку', el: function () { return byText('button', 'Начать оценку') || byText('button', 'НАЧАТЬ ОЦЕНКУ'); },
      text: 'Критерии готовы — нажмите «Начать оценку». После этого <b>критерии нельзя изменить</b>, а в таблице появятся строки для оценок. Кнопка недоступна, пока нет ни одного критерия или месяц ещё не наступил.',
      side: 'bottom', prep: async function () { await openTab('Дек'); } },
    { icon: 'schedule', title: 'Срок оценки', el: function () { var s = $('section'); return s && s.firstElementChild; },
      text: 'Над таблицей всегда написано, <b>до какого числа</b> можно ставить и менять оценки. После этой даты месяц зафиксируется автоматически, кнопки «Зафиксировать» нет.',
      note: 'Не успели проставить всё — незаполненные ячейки останутся пустыми, а строки с пустыми ячейками не попадут в рейтинг наставника.',
      side: 'bottom', prep: async function () { await openTab('Ноя'); } },
    { icon: 'edit', title: 'Поставьте балл', el: function () { var i = $('[role=table] input'); return i ? i.closest('[role=cell]') : null; },
      text: 'Введите целое число от 0 до максимума критерия. Сохранение идёт <b>автоматически</b>, когда вы выходите из ячейки. Enter переводит вниз по столбцу, Tab — вправо.',
      note: 'Неверное значение подсветится красным, а в расчёте останется прежний балл.',
      side: 'bottom', prep: async function () { await openTab('Ноя'); } },
    { icon: 'monitoring', title: 'Рейтинг наставника', el: function () { return $('[role=rowgroup] > [role=row]'); },
      text: 'Процент по строке считается, только когда заполнены <b>все критерии</b> команды. Рейтинг наставника за месяц — среднее по его полностью оценённым командам. Подпись «по N из M команд» показывает, сколько команд уже учтено.',
      side: 'top', prep: async function () { await openTab('Ноя'); } },
    { icon: 'chat', title: 'Комментарий к команде', el: function () { return $('[role=table] button[aria-label*="омментар"]'); },
      text: 'К каждой команде можно оставить комментарий: что получилось, что обсуждали с наставником. Пустой текст комментарий удаляет.',
      side: 'right', prep: async function () { await openTab('Ноя'); } },
    { icon: 'search', title: 'Поиск и выгрузка', el: function () { var i = $('input[aria-label="Поиск"]'); return i ? i.parentElement.parentElement : null; },
      text: 'Найдите наставника или команду, отсортируйте список «как на витрине» или по рейтингу, выгрузите то, что видно на экране, в <b>CSV</b>.',
      side: 'bottom', prep: async function () { await openTab('Ноя'); } },
    { icon: 'functions', title: 'Сводка сезона', el: function () { return $$('[role=tab]')[0]; },
      text: 'Первая вкладка собирает итог за весь сезон. Откроем её.',
      side: 'top', prep: async function () { await openTab('Ноя'); } },
    { icon: 'leaderboard', title: 'Сводный рейтинг', el: function () { return $('[role=table]'); },
      text: '<b>Итог</b> — среднее месячных рейтингов наставника за сезон: все месяцы весят одинаково. Пустая ячейка значит «в этом месяце наставника не было», прочерк — «был, но нет полностью оценённой команды».',
      note: 'В итог входят только месяцы, где идёт оценка или она закрыта и есть баллы.',
      side: 'top', prep: async function () { var t = $$('[role=tab]')[0]; if (t && t.getAttribute('aria-selected') !== 'true') t.click(); await waitFor(function () { return $('[role=table]') && !$('input[aria-label="Поиск"]') || $('[role=table]'); }); await sleep(200); } },
    { icon: 'task_alt', title: 'Готово', 
      text: 'Порядок работы в каждом месяце: <b>критерии → начать оценку → баллы и комментарии → до срока вносить правки</b>. Дальше система закрывает месяц сама.',
      note: 'Экскурсию можно пройти снова кнопкой «Как пользоваться» в шапке страницы.' }
  ];

  var drv = null, busy = false;
  async function show(i) {
    var s = STEPS[i]; if (s.prep) await s.prep();
    if (s.el) await waitFor(s.el, 1200);
    drv.moveTo(i);
  }
  function start() {
    if (busy || !window.driver || !window.driver.js) return;
    busy = true;
    var D = window.driver.js.driver;
    drv = D({
      popoverClass: 'lb-tour', overlayColor: '#181c1e', overlayOpacity: 0.55,
      stagePadding: 6, stageRadius: 10, smoothScroll: true, allowClose: true,
      showProgress: true, progressText: '{{current}} из {{total}}',
      nextBtnText: 'Далее', prevBtnText: 'Назад', doneBtnText: 'Готово',
      steps: STEPS.map(function (s) {
        return {
          element: s.el ? function () { return s.el() || document.body; } : undefined,
          popover: {
            title: ic(s.icon) + '<span>' + s.title + '</span>',
            description: s.text + (s.note ? '<span class="lb-note">' + s.note + '</span>' : ''),
            side: s.side, align: 'center'
          }
        };
      }),
      onNextClick: function (el, st, o) { var i = o.state.activeIndex; if (i === STEPS.length - 1) drv.destroy(); else show(i + 1); },
      onPrevClick: function (el, st, o) { show(o.state.activeIndex - 1); },
      onDestroyed: function () { busy = false; }
    });
    (async function () { if (STEPS[0].prep) await STEPS[0].prep(); drv.drive(0); })();
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

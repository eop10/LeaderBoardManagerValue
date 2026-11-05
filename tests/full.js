// Полный автотест тура: вперёд и назад по 13 шагам, на нескольких размерах, плюс resize «на ходу».
// Ожидаемый вырез считается НЕЗАВИСИМО от кода тура: сэмплированием document.elementFromPoint
// (учитывает обрезку контейнерами и перекрытие липкими шапкой/столбцом).
const { chromium, open } = require('./env');
const fs = require('fs');

const TARGETS = [null, 'season', 'months', 'criteria', 'start-eval', 'deadline', 'score-cell', 'mentor-rating', 'comment-btn', 'search-export', 'summary-tab', 'summary-head', null];
const RIBBON_STEPS = new Set([3, 11]);   // цели лежат в нижней ленте: к ним проверка «не заходит на ленту» не применяется
const SIZES = (process.argv[2] || '1000x500,1000x555,1024x640,1280x720,1440x900,1920x1080').split(',').map(s => s.split('x').map(Number));
const SHOTS = process.argv[3] === 'shots';
const DSF = SHOTS ? 2 : 1;

// Выполняется в странице: независимая оценка видимой части цели и всех геометрических проверок.
const measure = (arg) => {
  const { tname } = arg;
  const ov = document.querySelector('.lb-ov'), pop = document.querySelector('.lb-pop');
  const hole = ov.querySelector('.lb-hole');
  const H = ['x', 'y', 'width', 'height'].map(k => +hole.getAttribute(k));
  const holeR = { l: H[0], t: H[1], r: H[0] + H[2], b: H[1] + H[3], w: H[2], h: H[3] };
  const pr = pop.getBoundingClientRect();
  const arrow = pop.querySelector('.lb-arrow'); const ar = arrow.getBoundingClientRect();
  const vw = document.documentElement.clientWidth, vh = document.documentElement.clientHeight;
  const out = { vw, vh, hole: holeR, pop: { l: pr.left, t: pr.top, r: pr.right, b: pr.bottom, w: pr.width, h: pr.height },
    side: pop.dataset.side, arrowCls: arrow.className, arrowShown: getComputedStyle(arrow).display !== 'none',
    arrow: { cx: ar.left + ar.width / 2, cy: ar.top + ar.height / 2 },
    progress: pop.querySelector('.lb-pop-progress').textContent };
  // кнопки
  out.btns = ['.lb-pop-close', '.lb-pop-prev', '.lb-pop-next'].map(sel => {
    const b = pop.querySelector(sel); const r = b.getBoundingClientRect();
    if (getComputedStyle(b).display === 'none') return { sel, hidden: true, ok: true };
    const cx = r.left + r.width / 2, cy = r.top + r.height / 2;
    const hit = document.elementFromPoint(cx, cy);
    return { sel, ok: r.width > 0 && r.left >= 0 && r.right <= vw && r.top >= 0 && r.bottom <= vh && hit && (hit === b || b.contains(hit)) };
  });
  out.bodyScroll = (() => { const b = pop.querySelector('.lb-pop-body'); return { sh: b.scrollHeight, ch: b.clientHeight }; })();
  if (!tname) return out;
  const el = document.querySelector('[data-tour="' + tname + '"]');
  if (!el) { out.noEl = true; return out; }
  const raw = el.getBoundingClientRect();
  out.raw = { l: raw.left, t: raw.top, r: raw.right, b: raw.bottom, w: raw.width, h: raw.height };
  // убираем слои тура, чтобы они не мешали elementFromPoint
  const sv = [ov.style.display, pop.style.display]; ov.style.display = 'none'; pop.style.display = 'none';
  const hits = (x, y) => { const e = document.elementFromPoint(x, y); return !!e && (e === el || el.contains(e)); };
  const x0 = Math.max(0, Math.floor(raw.left)), x1 = Math.min(vw - 1, Math.ceil(raw.right)), y0 = Math.max(0, Math.floor(raw.top)), y1 = Math.min(vh - 1, Math.ceil(raw.bottom));
  let L = 1e9, T = 1e9, R = -1e9, B = -1e9, n = 0, tot = 0;
  const S = 3;
  for (let y = y0; y <= y1; y += S) for (let x = x0; x <= x1; x += S) { tot++; if (hits(x, y)) { n++; L = Math.min(L, x); R = Math.max(R, x); T = Math.min(T, y); B = Math.max(B, y); } }
  if (n) { // уточняем границы до 1 px
    const rowHas = (y) => { for (let x = Math.max(0, L); x <= Math.min(vw - 1, R); x += S) if (hits(x, y)) return true; return false; };
    const colHas = (x) => { for (let y = Math.max(0, T); y <= Math.min(vh - 1, B); y += S) if (hits(x, y)) return true; return false; };
    for (let k = 0; k < S; k++) { if (rowHas(T - 1)) T--; if (rowHas(B + 1)) B++; if (colHas(L - 1)) L--; if (colHas(R + 1)) R++; }
    out.exp = { l: L, t: T, r: R + 1, b: B + 1, w: R + 1 - L, h: B + 1 - T }; out.visFrac = n / tot;
  } else out.exp = null;
  ov.style.display = sv[0]; pop.style.display = sv[1];
  // области, куда вырез заходить не должен
  const aside = document.querySelector('aside').getBoundingClientRect();
  const main = document.querySelector('main'); const ribbon = main.lastElementChild.getBoundingClientRect();
  out.aside = { r: aside.right }; out.ribbon = { t: ribbon.top };
  return out;
};

function check(m, step, tname) {
  const errs = [];
  const tol = 2;
  const ov = (a, b) => a.l < b.r && a.r > b.l && a.t < b.b && a.b > b.t;
  const hasTarget = !!tname;
  // 3. подсказка внутри окна, отступ ≥ 12
  const p = m.pop, margin = 12 - 0.5;
  const popIn = p.l >= margin && p.t >= margin && p.r <= m.vw - margin && p.b <= m.vh - margin;
  if (!popIn) errs.push('подсказка вне окна/отступ<12');
  const wantW = Math.min(380, m.vw - 32);
  if (m.side !== 'sheet' && Math.abs(p.w - wantW) > 1) errs.push('ширина ' + p.w + ' ≠ ' + wantW);
  if (m.btns.some(b => !b.ok)) errs.push('кнопки недоступны: ' + m.btns.filter(b => !b.ok).map(b => b.sel).join());
  let holeOk = true, noSide = true, notOver = true, arrowOk = true, vis = true;
  if (hasTarget) {
    if (m.noEl || !m.exp) { errs.push('цель не видна/не найдена'); holeOk = false; vis = false; }
    else {
      const h = m.hole, e = m.exp;
      const d = Math.max(Math.abs(h.l - e.l), Math.abs(h.t - e.t), Math.abs(h.r - e.r), Math.abs(h.b - e.b));
      m.maxDelta = d;
      holeOk = d <= tol; if (!holeOk) errs.push('вырез отличается от видимой части на ' + d.toFixed(1) + 'px');
      // 2. не заходит на меню и ленту
      noSide = h.l >= m.aside.r - 0.5 && (RIBBON_STEPS.has(step) || h.b <= m.ribbon.t + 0.5) && h.t >= -0.5 && h.r <= m.vw + 0.5 && h.b <= m.vh + 0.5;
      if (!noSide) errs.push('вырез заходит на меню/ленту/за окно');
      // 3. не перекрывает вырез
      notOver = !ov({ l: p.l, t: p.t, r: p.r, b: p.b }, h); if (!notOver) errs.push('подсказка перекрывает вырез');
      // 4. стрелка
      if (!m.arrowShown) { arrowOk = false; errs.push('нет стрелки'); }
      else {
        const hcx = (h.l + h.r) / 2, hcy = (h.t + h.b) / 2, a = m.arrow;
        const cls = m.arrowCls; // lb-arrow-bottom: подсказка под целью
        if (/lb-arrow-(bottom|top)/.test(cls)) {
          const expX = Math.min(Math.max(hcx, p.l + 20), p.r - 20);
          const faceOk = cls.includes('bottom') ? (Math.abs(a.cy - p.t) < 3 && p.t >= h.b - 0.5) : (Math.abs(a.cy - p.b) < 3 && p.b <= h.t + 0.5);
          arrowOk = Math.abs(a.cx - expX) <= tol && faceOk;
        } else {
          const expY = Math.min(Math.max(hcy, p.t + 20), p.b - 20);
          const faceOk = cls.includes('right') ? (Math.abs(a.cx - p.l) < 3 && p.l >= h.r - 0.5) : (Math.abs(a.cx - p.r) < 3 && p.r <= h.l + 0.5);
          arrowOk = Math.abs(a.cy - expY) <= tol && faceOk;
        }
        // стрелка не выходит за углы подсказки
        if (/lb-arrow-(bottom|top)/.test(cls) ? (a.cx < p.l + 12 || a.cx > p.r - 12) : (a.cy < p.t + 12 || a.cy > p.b - 12)) arrowOk = false;
        if (!arrowOk) errs.push('стрелка не на вырез');
      }
      // 5. цель видна целиком по высоте (не под липкой шапкой), по ширине — максимум возможного
      const rw = m.raw, e2 = m.exp;
      const fullH = e2.h >= rw.h - 2;
      if (!fullH) { vis = false; errs.push('цель обрезана по высоте: видно ' + e2.h.toFixed(0) + ' из ' + rw.h.toFixed(0)); }
      m.visH = e2.h / rw.h;
    }
  }
  return { errs, holeOk, noSide, popIn, notOver, arrowOk, vis };
}

async function waitReady(page, n) {
  await page.waitForFunction((n) => { const p = document.querySelector('.lb-pop'); return p && p.getAttribute('data-ready') === '1' && p.querySelector('.lb-pop-progress').textContent.startsWith(n + ' из'); }, n, { timeout: 20000 });
  // ждём, пока вырез и подсказка перестанут меняться
  let prev = null, same = 0;
  for (let i = 0; i < 40 && same < 3; i++) {
    await page.waitForTimeout(80);
    const k = await page.evaluate(() => { const h = document.querySelector('.lb-hole'); const p = document.querySelector('.lb-pop').getBoundingClientRect(); return ['x', 'y', 'width', 'height'].map(a => (+h.getAttribute(a)).toFixed(1)).join() + '|' + [p.left, p.top, p.width, p.height].map(a => a.toFixed(1)).join(); });
    if (k === prev) same++; else { same = 0; prev = k; }
  }
}

(async () => {
  const b = await chromium.launch();
  const rows = []; const failures = [];
  fs.mkdirSync('shots', { recursive: true });
  for (const [w, h] of SIZES) {
    const { page, errs } = await open(b, w, h, '?resettour', { dsf: DSF });
    await page.click(process.env.INVITE ? '.lb-invite-go' : '[data-tour-start]');
    const visit = async (n, dir, extra) => {
      await waitReady(page, n);
      const tname = TARGETS[n - 1];
      const m = await page.evaluate(measure, { tname });
      const c = check(m, n, tname);
      const row = { size: `${w}x${h}`, step: n, dir: dir + (extra || ''), side: m.side, hole: tname ? m.hole : null, exp: m.exp || null, maxDelta: m.maxDelta, visH: m.visH, popTxtScroll: m.bodyScroll.sh > m.bodyScroll.ch + 1, ...c };
      rows.push(row); if (c.errs.length) failures.push(`${row.size} шаг ${n} ${row.dir}: ${c.errs.join('; ')}`);
      if (SHOTS && w === 1000 && h === 555 && dir === 'fwd' && !extra && [8, 9, 10, 12].includes(n)) await page.screenshot({ path: `shots/final_s${n}_1000x555.png` });
      return m;
    };
    for (let n = 1; n <= 13; n++) {
      await visit(n, 'fwd');
      if (n < 13) await page.click('.lb-pop-next');
    }
    // назад с 13 до 1
    for (let n = 12; n >= 1; n--) { await page.click('.lb-pop-prev'); await visit(n, 'back'); }
    // resize «на ходу» на шагах 8, 9, 12
    const alt = [[w >= 1200 ? 1000 : 1440, w >= 1200 ? 555 : 900], [1000, 500]];
    for (const st of [8, 9, 12]) {
      // перейти к шагу st
      let cur = parseInt(await page.textContent('.lb-pop-progress'));
      while (cur < st) { await page.click('.lb-pop-next'); cur++; await waitReady(page, cur); }
      while (cur > st) { await page.click('.lb-pop-prev'); cur--; await waitReady(page, cur); }
      for (const [aw, ah] of alt) {
        await page.setViewportSize({ width: aw, height: ah });
        await page.waitForTimeout(150);
        await visit(st, 'resize', `→${aw}x${ah}`);
      }
      await page.setViewportSize({ width: w, height: h });
      await page.waitForTimeout(150);
      await visit(st, 'resize', `→${w}x${h}`);
    }
    // закрыть тур
    await page.keyboard.press('Escape');
    await page.waitForTimeout(200);
    const left = await page.evaluate(() => !!document.querySelector('.lb-pop') || !!document.querySelector('.lb-ov') || document.body.classList.contains('lb-touring'));
    if (left) failures.push(`${w}x${h}: тур не закрылся по Esc`);
    if (errs.length) failures.push(`${w}x${h}: ошибки страницы: ${errs.slice(0, 3).join(' | ')}`);
    await page.context().close();
  }
  await b.close();
  fs.writeFileSync('results.json', JSON.stringify(rows, null, 1));
  const total = rows.length, bad = rows.filter(r => r.errs.length).length;
  console.log(`проверок: ${total}, с ошибками: ${bad}`);
  failures.slice(0, 60).forEach(f => console.log('FAIL', f));
})();

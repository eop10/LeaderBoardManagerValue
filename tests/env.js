const { chromium } = require('playwright');
const fs = require('fs');
const FN = process.env.TOUR_NODE_MODULES || require('path').join(__dirname, 'node_modules');
const files = {};
const fontCss = [];
for (const w of [500,600,700,800]) for (const sub of ['cyrillic','latin']) fontCss.push(`@font-face{font-family:Manrope;font-weight:${w};src:url(https://fonts.gstatic.com/m/manrope-${sub}-${w}.woff2) format('woff2');unicode-range:${sub==='cyrillic'?'U+0301,U+0400-045F,U+0490-0491,U+04B0-04B1,U+2116':'U+0000-00FF,U+0131,U+0152-0153,U+02BB-02BC,U+02C6,U+02DA,U+02DC,U+2000-206F,U+20AC,U+2122,U+2191,U+2193,U+2212,U+2215,U+FEFF,U+FFFD'}}`);
for (const w of [400,500,600,700]) for (const sub of ['latin']) fontCss.push(`@font-face{font-family:'Hanken Grotesk';font-weight:${w};src:url(https://fonts.gstatic.com/h/hanken-grotesk-${sub}-${w}.woff2) format('woff2');unicode-range:${sub==='cyrillic'?'U+0301,U+0400-045F,U+0490-0491,U+04B0-04B1,U+2116':'U+0000-00FF,U+0131,U+0152-0153,U+02BB-02BC,U+02C6,U+02DA,U+02DC,U+2000-206F,U+20AC,U+2122,U+2191,U+2193,U+2212,U+2215,U+FEFF,U+FFFD'}}`);
fontCss.push("@font-face{font-family:'Material Symbols Outlined';font-weight:400;font-style:normal;src:url(https://fonts.gstatic.com/ms/outlined.woff2) format('woff2')}");
async function open(browser, w, h, query, opts) {
  const ctx = await browser.newContext({ viewport: { width: w, height: h }, deviceScaleFactor: (opts&&opts.dsf)||1 });
  const page = await ctx.newPage();
  await page.route('https://fonts.googleapis.com/**', r => r.fulfill({ status: 200, contentType: 'text/css', body: fontCss.join('\n') }));
  await page.route('https://fonts.gstatic.com/**', r => {
    const u = r.request().url(); let m;
    let p;
    if ((m = u.match(/m\/manrope-(\w+)-(\d+)\.woff2/))) p = FN + '/@fontsource/manrope/files/manrope-' + m[1] + '-' + m[2] + '-normal.woff2';
    else if ((m = u.match(/h\/hanken-grotesk-(\w+)-(\d+)\.woff2/))) p = FN + '/@fontsource/hanken-grotesk/files/hanken-grotesk-' + m[1] + '-' + m[2] + '-normal.woff2';
    else p = FN + '/material-symbols/material-symbols-outlined.woff2';
    if (!fs.existsSync(p)) return r.fulfill({ status: 404, body: '' });
    r.fulfill({ status: 200, contentType: 'font/woff2', headers: {'access-control-allow-origin':'*'}, body: fs.readFileSync(p) });
  });
  await page.route('https://unpkg.com/**', r => {
    const u = r.request().url(); const m = u.match(/unpkg\.com\/(react-dom|react)@[\d.]+\/(.*)$/);
    const p = FN + '/' + m[1] + '/' + m[2];
    r.fulfill({ status: 200, contentType: 'application/javascript', headers: {'access-control-allow-origin':'*'}, body: fs.readFileSync(p) });
  });
  const errs = []; page.on('pageerror', e => errs.push(String(e))); page.on('console', m => { if (m.type()==='error') errs.push(m.text()); });
  await page.goto('http://localhost:' + (process.env.PORT||8765) + '/index.html' + (query||'?resettour'));
  await page.waitForSelector('#dc-root [role=tablist]', { timeout: 20000 });
  await page.evaluate(() => document.fonts.ready);
  return { ctx, page, errs };
}
module.exports = { chromium, open };

const { chromium, open } = require('./env');
(async () => {
  const [w,h]=[+process.argv[2]||1000,+process.argv[3]||555];
  const b = await chromium.launch();
  const { page } = await open(b, w, h, '?resettour');
  await page.click('[data-tour-start]');
  const ready = n => page.waitForFunction(n => { const p=document.querySelector('.lb-pop'); return p&&p.getAttribute('data-ready')==='1'&&p.querySelector('.lb-pop-progress').textContent.startsWith(n+' из'); }, n, {timeout:20000});
  await ready(1); await page.waitForTimeout(300);
  await page.evaluate(() => {
    window.__rec = null;
    window.__start = () => { const rec=[]; window.__rec=rec; const t0=performance.now();
      (function f(){ const hole=document.querySelector('.lb-hole'); const hr={left:+hole.getAttribute('x'),top:+hole.getAttribute('y'),width:+hole.getAttribute('width'),height:+hole.getAttribute('height')}; const p=document.querySelector('.lb-pop'); const pr=p.getBoundingClientRect(); const cs=getComputedStyle(p);
        const sc=[...document.querySelectorAll('#dc-root *')].filter(e=>e.scrollTop>0).map(e=>Math.round(e.scrollTop)).join(',');
        rec.push({t:Math.round(performance.now()-t0), hole:[hr.left,hr.top,hr.width,hr.height].map(Math.round), pop:[pr.left,pr.top,pr.width,pr.height].map(Math.round), vis:cs.visibility, op:(+cs.opacity).toFixed(2), sc, ready:p.getAttribute('data-ready')});
        if(window.__rec===rec) requestAnimationFrame(f); })(); };
  });
  const out=[];
  for (let n=1;n<13;n++){
    await page.evaluate(()=>window.__start());
    await page.click('.lb-pop-next');
    await ready(n+1); await page.waitForTimeout(250);
    const rec = await page.evaluate(()=>{const r=window.__rec; window.__rec=null; return r;});
    // metrics
    let maxHole=0,maxPop=0,hidden=0,blank=0,jumps=[];
    for(let i=1;i<rec.length;i++){const a=rec[i-1],c=rec[i];
      const dh=Math.max(...a.hole.map((v,k)=>Math.abs(v-c.hole[k]))); const dp=Math.max(...a.pop.map((v,k)=>Math.abs(v-c.pop[k])));
      maxHole=Math.max(maxHole,dh); maxPop=Math.max(maxPop,dp); if(dh>120||dp>120) jumps.push([c.t,dh,dp]); }
    hidden=rec.filter(r=>r.vis==='hidden'||+r.op<0.5).length; blank=rec.filter(r=>r.hole[2]<2).length;
    const dur=rec.length?rec[rec.length-1].t:0;
    out.push({step:`${n}→${n+1}`,frames:rec.length,ms:dur,maxHoleJump:maxHole,maxPopJump:maxPop,hiddenFrames:hidden,noHoleFrames:blank,bigJumps:jumps.slice(0,4), rec12: n===12? rec.filter((_,i)=>i<14).map(r=>[r.t,r.pop.join(),r.hole.join()]):undefined});
  }
  out.forEach(o=>console.log(JSON.stringify(o)));
  await b.close();
})();

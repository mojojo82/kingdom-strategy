const { chromium } = require('/home/claude/.npm-global/lib/node_modules/@playwright/mcp/node_modules/playwright');
const OUT='/tmp/claude-0/-home-claude/ea8aa5cd-2a55-5679-b734-73d165c6f3b7/scratchpad/prov/';
(async () => {
  const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args: ['--no-sandbox'] });
  const p = await b.newPage({ viewport: { width: 430, height: 932 }, deviceScaleFactor: 2 }); const errs=[]; p.on('pageerror',e=>errs.push(e.message));
  await p.goto('file:///home/claude/game.html'); await p.waitForTimeout(1500);
  // a vertex shared by capital + inner provinces
  const v = await p.evaluate(()=>{ const c=provinces()[0].poly[0]; return [Math.round(c[0]),Math.round(c[1])]; });
  for (const iso of [false,true]) for (const z of [1,0.6]) {
    const r = await p.evaluate(async({iso,z,v})=>{ setScreen('world'); if(mapIso!==iso) document.getElementById('devMapIsoBtn').click(); await new Promise(r=>setTimeout(r,300)); setMapZoom(z); await new Promise(r=>setTimeout(r,100)); const vp=document.getElementById('mapviewport'); const c=tileCenterPx({x:v[0],y:v[1]}); vp.scrollLeft=c.x-vp.clientWidth/2; vp.scrollTop=c.y-vp.clientHeight/2; renderVisibleTiles(); await new Promise(r=>setTimeout(r,500));
      const t0=performance.now(); for(let i=0;i<20;i++) drawProvinces(); const dt=(performance.now()-t0)/20;
      return { drawMs: dt.toFixed(2), tile: v }; }, {iso,z,v});
    console.log(iso?'iso':'flat', z, JSON.stringify(r));
    await p.screenshot({ path: OUT+'v_'+(iso?'iso':'flat')+'_'+z+'.png', clip:{x:0,y:62,width:430,height:700} });
  }
  // card row
  const card = await p.evaluate(()=>{ const h = ticHtml({id:'600,600',name:'Test',sub:'x',stats:[['A','1']]}); const d=document.createElement('div'); d.innerHTML=h; return d.textContent.replace(/\s+/g,' ').slice(0,200); });
  console.log('card:', card);
  console.log('errs', errs); await b.close();
})();

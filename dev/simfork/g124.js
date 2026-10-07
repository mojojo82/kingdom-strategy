const { chromium } = require('/home/claude/.npm-global/lib/node_modules/@playwright/mcp/node_modules/playwright');
(async () => {
  const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args: ['--no-sandbox'] });
  const p = await b.newPage({ viewport: { width: 430, height: 932 }, hasTouch:true }); const errs=[]; p.on('pageerror',e=>errs.push(e.message));
  await p.goto('file:///home/claude/game.html'); await p.waitForTimeout(1500);
  for (const iso of [false,true]) for (const z of [1, 0.2, 0.05]) {
    const pt = await p.evaluate(async({iso,z})=>{ setScreen('world'); if(mapIso!==iso) document.getElementById('devMapIsoBtn').click(); await new Promise(r=>setTimeout(r,200)); setMapZoom(z); selectedTile=null;
      const vp=document.getElementById('mapviewport'); const c=tileCenterPx({x:-300,y:600}); vp.scrollLeft=c.x-vp.clientWidth/2; vp.scrollTop=c.y-vp.clientHeight/2; renderVisibleTiles(); await new Promise(r=>setTimeout(r,300));
      const r=vp.getBoundingClientRect(); return {x:r.left+r.width/2, y:r.top+r.height/2}; }, {iso,z});
    await p.mouse.click(pt.x, pt.y); await p.waitForTimeout(300);
    console.log(iso?'iso':'flat', z, await p.evaluate(()=>({sel:selectedTile, card: (document.querySelector('.tile-info-card, #tileInfo')||{}).textContent||''})).then(o=>JSON.stringify({sel:o.sel, card:o.card.slice(0,40)})));
  }
  console.log(errs); await b.close();
})();

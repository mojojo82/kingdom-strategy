const { chromium } = require('/home/claude/.npm-global/lib/node_modules/@playwright/mcp/node_modules/playwright');
const OUT='/tmp/claude-0/-home-claude/ea8aa5cd-2a55-5679-b734-73d165c6f3b7/scratchpad/prov/';
(async () => {
  const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args: ['--no-sandbox'] });
  const p = await b.newPage({ viewport: { width: 430, height: 932 }, deviceScaleFactor: 2 }); const errs=[]; p.on('pageerror',e=>errs.push(e.message));
  await p.goto('file:///home/claude/game.html'); await p.waitForTimeout(1500);
  for (const [iso,z,tag] of [[true,1,'iso1'],[true,0.5,'iso05'],[false,1,'flat'],[true,0.2,'far']]) {
    const r=await p.evaluate(async({iso,z})=>{ setScreen('world'); if(mapIso!==iso) document.getElementById('devMapIsoBtn').click(); await new Promise(r=>setTimeout(r,200));
      document.getElementById('devBurnBtn').click(); setMapZoom(z); const h=tileXY(game.state.homeTileId); const vp=document.getElementById('mapviewport'); const c=tileCenterPx({x:h[0],y:h[1]}); vp.scrollLeft=c.x-vp.clientWidth/2; vp.scrollTop=c.y-vp.clientHeight/2; renderVisibleTiles(); await new Promise(r=>setTimeout(r,500));
      document.querySelectorAll('#tileinfo,#mapOverlayCtl,#fpsCounter,#fleetHud').forEach(e=>e.style.visibility='hidden');
      const t0=performance.now(); for(let i=0;i<20;i++) renderVisibleTiles(); return { boxes: document.querySelectorAll('.base-fire-box').length, ms: ((performance.now()-t0)/20).toFixed(2), lod: mapLod() }; }, {iso,z});
    console.log(tag, JSON.stringify(r));
    await p.screenshot({ path: OUT+'burn_'+tag+'.png', clip:{x:65,y:250,width:300,height:330} });
  }
  console.log(errs); await b.close();
})();

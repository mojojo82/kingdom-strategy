const { chromium } = require('/home/claude/.npm-global/lib/node_modules/@playwright/mcp/node_modules/playwright');
const OUT='/tmp/claude-0/-home-claude/ea8aa5cd-2a55-5679-b734-73d165c6f3b7/scratchpad/prov/';
(async () => {
  const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args: ['--no-sandbox'] });
  const p = await b.newPage({ viewport: { width: 430, height: 932 }, deviceScaleFactor: 2 }); const errs=[]; p.on('pageerror',e=>errs.push(e.message));
  await p.goto('file:///home/claude/game.html'); await p.waitForTimeout(1500);
  await p.evaluate(async()=>{ setScreen('world'); if(!mapIso) document.getElementById('devMapIsoBtn').click(); await new Promise(r=>setTimeout(r,200));
    const h=tileXY(game.state.homeTileId); const W=[h[0]+5,h[1]+3]; mapDecor={}; mapDecor[W[0]+'_'+W[1]]={s:'shipwreck_2x2',x:W[0],y:W[1]};
    setMapZoom(1); const vp=document.getElementById('mapviewport'); const c=tileCenterPx({x:W[0]+0.5,y:W[1]+0.5}); vp.scrollLeft=c.x-vp.clientWidth/2; vp.scrollTop=c.y-vp.clientHeight/2; renderVisibleTiles(); await new Promise(r=>setTimeout(r,700));
    document.querySelectorAll('#mapOverlayCtl,#fpsCounter,#fleetHud').forEach(e=>e.style.visibility='hidden'); });
  await p.screenshot({ path: OUT+'wreck_ingame.png', clip:{x:15,y:250,width:400,height:450} });
  console.log(errs); await b.close();
})();

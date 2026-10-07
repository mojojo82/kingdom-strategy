const { chromium } = require('/home/claude/.npm-global/lib/node_modules/@playwright/mcp/node_modules/playwright');
const OUT='/tmp/claude-0/-home-claude/ea8aa5cd-2a55-5679-b734-73d165c6f3b7/scratchpad/prov/';
(async () => {
  const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args: ['--no-sandbox'] });
  const p = await b.newPage({ viewport: { width: 430, height: 932 }, deviceScaleFactor: 2 }); const errs=[]; p.on('pageerror',e=>errs.push(e.message));
  await p.goto('file:///home/claude/game.html'); await p.waitForTimeout(1500);
  for (const [iso,z] of [[true,1],[true,2.5],[true,0.6],[false,1]]) {
    const r = await p.evaluate(async({iso,z})=>{ setScreen('world'); if(mapIso!==iso) document.getElementById('devMapIsoBtn').click(); await new Promise(r=>setTimeout(r,200)); setMapZoom(z);
      const h=tileXY(game.state.homeTileId); const f=game.state.map.resourcesIn(h[0]-30,h[0]+30,h[1]-30,h[1]+30).filter(t=>true).sort((a,b)=>Math.hypot(a.x-h[0],a.y-h[1])-Math.hypot(b.x-h[0],b.y-h[1]))[0];
      const vp=document.getElementById('mapviewport'); const c=tileCenterPx(f); vp.scrollLeft=c.x-vp.clientWidth/2; vp.scrollTop=c.y-vp.clientHeight/2; renderVisibleTiles(); await new Promise(r=>setTimeout(r,500));
      document.querySelectorAll('#mapOverlayCtl, #fpsCounter, #fleetHud').forEach(e=>e.style.visibility='hidden');
      return { lod: mapLod(), art: document.querySelectorAll('.tile .res-art').length, f: f.id }; }, {iso,z});
    console.log(iso?'iso':'flat', z, JSON.stringify(r));
    await p.screenshot({ path: OUT+'farm_'+(iso?'iso':'flat')+z+'.png', clip:{x:15,y:220,width:400,height:400} });
  }
  // tap the food node -> card
  const card = await p.evaluate(async()=>{ setMapZoom(1); return 1; });
  console.log(errs); await b.close();
})();

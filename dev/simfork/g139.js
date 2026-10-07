const { chromium } = require('/home/claude/.npm-global/lib/node_modules/@playwright/mcp/node_modules/playwright');
const OUT='/tmp/claude-0/-home-claude/ea8aa5cd-2a55-5679-b734-73d165c6f3b7/scratchpad/prov/';
(async () => {
  const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args: ['--no-sandbox'] });
  const p = await b.newPage({ viewport: { width: 430, height: 932 }, deviceScaleFactor: 2 }); const errs=[]; p.on('pageerror',e=>errs.push(e.message));
  await p.goto('file:///home/claude/game.html'); await p.waitForTimeout(2000);
  const r = await p.evaluate(async()=>{ setScreen('world'); if(!mapIso) document.getElementById('devMapIsoBtn').click(); await new Promise(r=>setTimeout(r,200));
    terrainEnsure(); const h=tileXY(game.state.homeTileId); const ox=h[0]-6, oy=h[1]-6;
    for(let y=0;y<16;y++) for(let x=0;x<16;x++){ const dx=x-8, dy=y-8; if(dx*dx+dy*dy<64+((x*7+y*3)%9)) { terrainArr[(oy+y)*terrainN+ox+x]= (x>y?4:1); terrainMarkDirty(ox+x,oy+y);} }
    for(let y=9;y<13;y++) for(let x=9;x<14;x++){ terrainArr[(oy+y)*terrainN+ox+x]=3; terrainMarkDirty(ox+x,oy+y);}
    terrainClearAll(); setMapZoom(1); const vp=document.getElementById('mapviewport'); const c=tileCenterPx({x:ox+8,y:oy+8}); vp.scrollLeft=c.x-vp.clientWidth/2; vp.scrollTop=c.y-vp.clientHeight/2;
    const t0=performance.now(); renderVisibleTiles(); const ms=performance.now()-t0; await new Promise(r=>setTimeout(r,800));
    document.querySelectorAll('#mapOverlayCtl,#fpsCounter,#fleetHud').forEach(e=>e.style.visibility='hidden');
    return { tex: !!grass2Tex, cells: Object.keys(terrainEls).length, hd: Object.values(terrainEls).filter(c=>c.width===64).length, firstRenderMs: ms.toFixed(1) }; });
  console.log(JSON.stringify(r), errs);
  await p.screenshot({ path: OUT+'grass2_ingame.png', clip:{x:0,y:140,width:430,height:620} });
  await b.close();
})();

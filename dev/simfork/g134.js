const { chromium } = require('/home/claude/.npm-global/lib/node_modules/@playwright/mcp/node_modules/playwright');
const OUT='/tmp/claude-0/-home-claude/ea8aa5cd-2a55-5679-b734-73d165c6f3b7/scratchpad/prov/';
(async () => {
  const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args: ['--no-sandbox'] });
  const p = await b.newPage({ viewport: { width: 430, height: 932 }, deviceScaleFactor: 2 }); const errs=[]; p.on('pageerror',e=>errs.push(e.message));
  await p.goto('file:///home/claude/game.html'); await p.waitForTimeout(1500);
  const shape=["....XXXX......","..XXXXXXXX....",".XXXXXXXXXX...",".XXXXXXXXXXX..","..XXXXX..XXX..","...XXX....X...","...XXX........","....XXXXXXXXX.",".....XXXXXXXX.","..........XX.."];
  for (const z of [1,0.6,0.3]) {
  const r = await p.evaluate(async({shape,z})=>{ setScreen('world'); if(!mapIso) document.getElementById('devMapIsoBtn').click(); await new Promise(r=>setTimeout(r,200));
    terrainEnsure(); const h=tileXY(game.state.homeTileId); const ox=h[0]+3, oy=h[1]-4;
    shape.forEach((row,y)=>[...row].forEach((ch,x)=>{ if(ch==='X'){ terrainArr[(oy+y)*terrainN+ox+x]=3; terrainMarkDirty(ox+x,oy+y);} }));
    terrainClearAll(); setMapZoom(z); const vp=document.getElementById('mapviewport'); const c=tileCenterPx({x:ox+7,y:oy+5}); vp.scrollLeft=c.x-vp.clientWidth/2; vp.scrollTop=c.y-vp.clientHeight/2; renderVisibleTiles(); await new Promise(r=>setTimeout(r,700));
    document.querySelectorAll('#mapOverlayCtl,#fpsCounter,#fleetHud').forEach(e=>e.style.visibility='hidden');
    const t0=performance.now(); for(let i=0;i<10;i++) renderVisibleTiles(); 
    return { forest: Object.keys(forestEls).length, ms: ((performance.now()-t0)/10).toFixed(2), lod: mapLod() }; }, {shape,z});
  console.log(z, JSON.stringify(r));
  await p.screenshot({ path: OUT+'forestbrush_'+z+'.png', clip:{x:0,y:140,width:430,height:620} });
  }
  // paint with brush via UI: select forest, drag
  await p.evaluate(async()=>{ setMapZoom(1); if(!terrainDev) document.getElementById('devTerrainBtn').click(); document.getElementById('mapPaintBtn').click(); });
  await p.click('#tpTiles button[data-t="3"]');
  await p.mouse.move(200,800); await p.mouse.down(); await p.mouse.move(260,820,{steps:6}); await p.mouse.up(); await p.waitForTimeout(300);
  console.log('after brush', await p.evaluate(()=>Object.keys(forestEls).length), errs); await b.close();
})();

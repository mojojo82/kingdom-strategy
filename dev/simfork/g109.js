const { chromium } = require('/home/claude/.npm-global/lib/node_modules/@playwright/mcp/node_modules/playwright');
(async () => {
  const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args: ['--no-sandbox'] });
  const p = await b.newPage({ viewport: { width: 420, height: 800 } }); const errs=[]; p.on('pageerror',e=>errs.push(e.message));
  await p.goto('file:///home/claude/game.html'); await p.waitForTimeout(2000);
  await p.evaluate(()=>{ const s=game.state; setScreen('world'); s.homeTileId=mapTileAt(s.map,10,10).id; ['14,4','4,15','17,16','60,40','120,150'].forEach((id,i)=>occupiedTileIds[id]='bot_x'+i); terrainEnsure(); for(let y=6;y<16;y++) for(let x=5;x<17;x++) terrainArr[y*terrainN+x]=1; terrainClearAll(); });
  for (const iso of [false,true]) {
    if (iso) { await p.evaluate(()=>document.getElementById('devMapIsoBtn').click()); await p.waitForTimeout(400); }
    for (const [tag,z] of [['near',1],['mid',0.4],['far',0.15],['min',0.001]]) {
      const r=await p.evaluate((z)=>{ setMapZoom(z); const h=mapTileById(game.state.map,game.state.homeTileId); const c=tileCenterPx(h); const vp=document.getElementById('mapviewport'); vp.scrollLeft=c.x-vp.clientWidth/2; vp.scrollTop=c.y-vp.clientHeight/2; const t0=performance.now(); for(let i=0;i<20;i++) renderVisibleTiles(); return {zoom:+mapZoom.toFixed(3), min:+mapZoomMin().toFixed(3), lod:mapLod(), els:Object.keys(mapTileEls).length, terr:Object.keys(terrainEls).length, ms:+((performance.now()-t0)/20).toFixed(2)}; }, z);
      await p.waitForTimeout(300); await p.screenshot({path:`g109_${iso?'iso':'flat'}_${tag}.png`}); console.log(iso?'iso':'flat', tag, JSON.stringify(r));
    }
  }
  // tap nearest marker at far zoom: click near home marker
  const sel=await p.evaluate(()=>{ setMapZoom(0.15); const h=mapTileById(game.state.map,game.state.homeTileId); const c=tileCenterPx(h); const vp=document.getElementById('mapviewport'); vp.scrollLeft=c.x-vp.clientWidth/2; vp.scrollTop=c.y-vp.clientHeight/2; renderVisibleTiles(); selectedTile=null; const w=document.getElementById('mapworld').getBoundingClientRect(); return {x:w.left+c.x+9, y:w.top+c.y+6}; });
  await p.mouse.click(sel.x, sel.y); await p.waitForTimeout(300);
  console.log('tap near home marker ->', await p.evaluate(()=>selectedTile+' home='+game.state.homeTileId), errs);
  await b.close();
})();

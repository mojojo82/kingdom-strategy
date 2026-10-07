const { chromium } = require('/home/claude/.npm-global/lib/node_modules/@playwright/mcp/node_modules/playwright');
(async () => {
  const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args: ['--no-sandbox'] });
  // old terrain format saved by v864 (200x200 string) -> migrated?
  const ctx = await b.newContext({ viewport: { width: 420, height: 800 } });
  const p0 = await ctx.newPage(); await p0.goto('file:///home/claude/game_v864.html'); await p0.waitForTimeout(2000);
  await p0.evaluate(()=>{ terrainEnsure(); for(let y=5;y<9;y++) for(let x=5;x<12;x++) terrainArr[y*terrainN+x]=1; terrainArr[150*terrainN+150]=2; terrainSaveLocal(); });
  const legacyOld = await p0.evaluate(()=>{ const o=[]; for(let y=0;y<20;y++) for(let x=0;x<20;x++){ const t=mapTileAt(game.state.map,x,y); o.push([t.id,t.type,t.resourceType||'',t.amountLeft||0].join('|')); } return o.join(';'); });
  await p0.close();
  const p = await ctx.newPage(); const errs=[]; p.on('pageerror',e=>errs.push(e.message));
  const t0=Date.now(); await p.goto('file:///home/claude/game.html'); await p.waitForTimeout(2000);
  const r=await p.evaluate(()=>{ const M=game.state.map; const o=[]; for(let y=0;y<20;y++) for(let x=0;x<20;x++){ const t=mapTileAt(M,x,y); o.push([t.id,t.type,t.resourceType||'',t.amountLeft||0].join('|')); }
    let res=0, tot=0; for(let y=300;y<340;y++) for(let x=500;x<540;x++){ tot++; if(mapTileAt(M,x,y).type==='resource') res++; }
    terrainEnsure();
    return {size:M.size, length:M.length, chunksAtBoot:M.count, legacy:o.join(';'), resPct:+(100*res/tot).toFixed(1), terrMigrated:[terrainArr[6*terrainN+6], terrainArr[150*terrainN+150]], landChunks:Object.keys(terrainLandChunks), v2:!!localStorage.getItem('kingdom_prototype_terrain_v2'), heapMB: performance.memory? Math.round(performance.memory.usedJSHeapSize/1e6):null}; });
  console.log('legacy identical:', r.legacy===legacyOld); delete r.legacy; console.log(JSON.stringify(r), errs);
  // world view at min zoom (iso) + far corner + timings
  const v=await p.evaluate(async()=>{ setScreen('world'); document.getElementById('devMapIsoBtn').click(); await new Promise(r=>setTimeout(r,300)); setMapZoom(0.001); const vp=document.getElementById('mapviewport'); vp.scrollLeft=(vp.scrollWidth-vp.clientWidth)/2; vp.scrollTop=0; let t=performance.now(); for(let i=0;i<10;i++) renderVisibleTiles(); const far=(performance.now()-t)/10;
    setMapZoom(1); const c=tileCenterPx({x:1150,y:1150}); vp.scrollLeft=c.x-200; vp.scrollTop=c.y-300; t=performance.now(); for(let i=0;i<10;i++) renderVisibleTiles(); const near=(performance.now()-t)/10;
    return {worldW:document.getElementById('mapworld').style.width, minZoom:+mapZoomMin().toFixed(4), farMs:+far.toFixed(2), nearCornerMs:+near.toFixed(2), tilesNear:Object.keys(mapTileEls).length, chunks:game.state.map.count, heapMB: performance.memory? Math.round(performance.memory.usedJSHeapSize/1e6):null}; });
  console.log(JSON.stringify(v));
  await p.evaluate(()=>{ setMapZoom(0.001); const vp=document.getElementById('mapviewport'); vp.scrollLeft=(vp.scrollWidth-vp.clientWidth)/2; vp.scrollTop=0; renderVisibleTiles(); }); await p.waitForTimeout(400); await p.screenshot({path:'g113_min.png'});
  console.log(errs); await b.close();
})();

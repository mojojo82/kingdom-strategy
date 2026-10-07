const { chromium } = require('/home/claude/.npm-global/lib/node_modules/@playwright/mcp/node_modules/playwright');
(async () => {
  const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args: ['--no-sandbox'] });
  const p = await b.newPage({ viewport: { width: 430, height: 932 } }); const errs=[]; p.on('pageerror',e=>errs.push(e.message));
  await p.goto('file:///home/claude/game.html'); await p.waitForTimeout(2000);
  for (const iso of [false,true]) {
    const r=await p.evaluate(async(iso)=>{ setScreen('world'); if (iso!==mapIso) document.getElementById('devMapIsoBtn').click(); await new Promise(r=>setTimeout(r,300)); setMapZoom(1);
      const vp=document.getElementById('mapviewport'); const c=tileCenterPx({x:400,y:400}); vp.scrollLeft=c.x-200; vp.scrollTop=c.y-300; await new Promise(r=>setTimeout(r,200));
      let calls=0; const orig=window.renderVisibleTiles; window.renderVisibleTiles=function(){ calls++; return orig.apply(this,arguments); };
      for(let i=0;i<90;i++){ vp.scrollLeft+=3; vp.scrollTop+=2; await new Promise(r=>requestAnimationFrame(r)); }
      window.renderVisibleTiles=orig;
      // blank check: every resource tile whose centre is on screen has an element
      const vr=vp.getBoundingClientRect(), wr=document.getElementById('mapworld').getBoundingClientRect(); let missing=0, onscreen=0;
      for(let y=380;y<460;y++) for(let x=380;x<460;x++){ const t=mapTileAt(game.state.map,x,y); if(t.type!=='resource') continue; const cc=tileCenterPx(t); const sx=wr.left+cc.x, sy=wr.top+cc.y; if(sx>vr.left&&sx<vr.right&&sy>vr.top&&sy<vr.bottom){ onscreen++; if(!mapTileEls[t.id]) missing++; } }
      return {iso, frames:90, rebuilds:calls, onscreenRes:onscreen, missing}; }, iso);
    console.log(JSON.stringify(r));
  }
  // flat taps: empty land and a resource
  const taps=await p.evaluate(async()=>{ if (mapIso) document.getElementById('devMapIsoBtn').click(); await new Promise(r=>setTimeout(r,300)); setMapZoom(1);
    const vp=document.getElementById('mapviewport'); const c=tileCenterPx({x:420,y:420}); vp.scrollLeft=c.x-200; vp.scrollTop=c.y-300; renderVisibleTiles(); await new Promise(r=>setTimeout(r,200));
    let emptyT=null, resT=null; for(let y=419;y<426 && !(emptyT&&resT);y++) for(let x=419;x<425;x++){ const t=mapTileAt(game.state.map,x,y); if(t.type==='empty'&&!emptyT) emptyT=t; if(t.type==='resource'&&!resT) resT=t; }
    const wr=document.getElementById('mapworld').getBoundingClientRect(); return {empty:[emptyT.id, wr.left+tileCenterPx(emptyT).x, wr.top+tileCenterPx(emptyT).y], res:[resT.id, wr.left+tileCenterPx(resT).x, wr.top+tileCenterPx(resT).y]}; });
  await p.mouse.click(taps.empty[1], taps.empty[2]); await p.waitForTimeout(200); const s1=await p.evaluate(()=>[selectedTile, (document.getElementById('tileinfo').textContent.match(/Open Land|Too Close/)||[''])[0]]);
  await p.evaluate(()=>{ selectedTile=null; renderTileInfo(); renderVisibleTiles(); });
  await p.mouse.click(taps.res[1], taps.res[2]); await p.waitForTimeout(200); const s2=await p.evaluate(()=>[selectedTile, (document.getElementById('tileinfo').textContent.match(/\w+ Node/)||[''])[0]]);
  console.log('flat tap empty', taps.empty[0], '->', s1, '| tap resource', taps.res[0], '->', s2, errs);
  await b.close();
})();

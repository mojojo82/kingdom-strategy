const { chromium } = require('/home/claude/.npm-global/lib/node_modules/@playwright/mcp/node_modules/playwright');
(async () => {
  const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args: ['--no-sandbox'] });
  for (const f of (process.argv[2]||'game_v858.html,game.html').split(',')) {
    const p = await b.newPage({ viewport: { width: 420, height: 800 } }); const errs=[]; p.on('pageerror',e=>errs.push(e.message));
    await p.goto('file:///home/claude/'+f); await p.waitForTimeout(2000);
    const r=await p.evaluate(()=>{ setScreen('world'); const s=game.state; s.troops.infantry=500; const ht=s.map.find(x=>x.type==='empty'&&x.x>=8&&x.x<=12&&x.y>=8&&x.y<=12); s.homeTileId=ht.id;
      const res=s.map.filter(x=>x.type==='resource').slice(0,5); res.forEach(t=>game.sendMarch({infantry:10},t.id,'gather',[]));
      centerMapOnHome(); renderVisibleTiles();
      const vp=document.getElementById('mapviewport'); let t0=performance.now(); for(let i=0;i<60;i++){ vp.scrollLeft+=7; vp.scrollTop+=5; renderVisibleTiles(); } const rv=(performance.now()-t0)/60;
      t0=performance.now(); for(let i=0;i<200;i++) updateMarchMarkers(true); const um=(performance.now()-t0)/200;
      // fingerprint of rendered tiles for identical-behaviour check
      const ids=Object.keys(mapTileEls).sort().join('|'); const cls=Object.keys(mapTileEls).sort().map(k=>mapTileEls[k].className).join('|');
      return {renderVisibleMs:+rv.toFixed(3), marchFrameMs:+um.toFixed(3), tiles:Object.keys(mapTileEls).length, fp: ids.length+':'+cls.length, sel: (selectedTile=s.homeTileId, renderTileInfo(), document.getElementById('tileinfo').textContent.slice(0,40))}; });
    console.log(f, JSON.stringify(r), errs); await p.close();
  }
  await b.close();
})();

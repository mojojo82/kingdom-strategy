const { chromium } = require('/home/claude/.npm-global/lib/node_modules/@playwright/mcp/node_modules/playwright');
(async () => {
  const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args: ['--no-sandbox'] });
  const out={};
  for (const f of ['game_v867.html','game.html']) {
    const p = await b.newPage({ viewport: { width: 430, height: 932 } }); const errs=[]; p.on('pageerror',e=>errs.push(e.message));
    await p.goto('file:///home/claude/'+f); await p.waitForTimeout(2000);
    out[f]=[];
    for (const [iso,z] of [[false,1],[true,1],[true,0.4],[true,0.05]]) {
      await p.evaluate(async([iso,z])=>{ game.state.homeTileId='64,30'; setScreen('world'); if (iso!==mapIso) document.getElementById('devMapIsoBtn').click(); await new Promise(r=>setTimeout(r,200)); setMapZoom(z); const h=mapTileById(game.state.map,game.state.homeTileId); const c=tileCenterPx(h); const vp=document.getElementById('mapviewport'); vp.scrollLeft=c.x-200; vp.scrollTop=c.y-300; renderVisibleTiles(); selectedTile=game.state.homeTileId; renderVisibleTiles(); renderTileInfo(); }, [iso,z]);
      await p.waitForTimeout(500); const buf=await p.screenshot(); out[f].push(buf);
    }
    const t=await p.evaluate(()=>{ const vp=document.getElementById('mapviewport'); let a=performance.now(); for(let i=0;i<80;i++){ vp.scrollLeft+=9; vp.scrollTop+=5; renderVisibleTiles(); void document.body.offsetHeight; } return +((performance.now()-a)/80).toFixed(2); });
    console.log(f,'render+layout ms',t, errs); await p.close();
  }
  const fs=require('fs'); out['game.html'].forEach((buf,i)=>{ fs.writeFileSync(`g117_new_${i}.png`,buf); fs.writeFileSync(`g117_old_${i}.png`,out['game_v867.html'][i]); });
  await b.close();
})();

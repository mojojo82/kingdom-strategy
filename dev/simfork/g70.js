const { chromium } = require('/home/claude/.npm-global/lib/node_modules/@playwright/mcp/node_modules/playwright');
(async () => {
  const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args: ['--no-sandbox'] });
  const p = await b.newPage({ viewport: { width: 420, height: 800 }, deviceScaleFactor: 2 });
  const errs=[]; p.on('pageerror',e=>errs.push(e.message));
  await p.goto('file:///home/claude/game.html'); await p.waitForTimeout(2000);
  await p.evaluate(() => setScreen('world')); await p.waitForTimeout(800);
  await p.evaluate(() => document.getElementById('devMapIsoBtn').click()); await p.waitForTimeout(600);
  const info = await p.evaluate(() => {
    let best=null,bd=1e9; const home=tileXY(game.state.homeTileId);
    game.state.map.forEach(t=>{ if(t.type!=='empty'){const d=Math.abs(t.x-home[0])+Math.abs(t.y-home[1]); if(d<bd){bd=d;best=t;}}});
    occupiedTileIds[(best.x+3)+","+(best.y+4)]='other1'; occupiedTileIds[(best.x+7)+","+(best.y+3)]='other2';
    const vp=document.getElementById('mapviewport'); const c=tileCenterPx(best); vp.scrollLeft=c.x-vp.clientWidth/2; vp.scrollTop=c.y-vp.clientHeight/2; renderVisibleTiles();
    const t0=performance.now(); for(let i=0;i<30;i++) renderVisibleTiles(); const ms=(performance.now()-t0)/30;
    return {best:best.id, els:Object.keys(mapTileEls).length, ms};
  });
  console.log(JSON.stringify(info));
  // tap on sprite of other1
  const pt = await p.evaluate(() => { const id=Object.keys(mapTileEls).find(i=>occupiedTileIds[i]==='other1'); const r=mapTileEls[id].querySelector('.city-icon-img').getBoundingClientRect(); return {x:r.left+r.width/2,y:r.top+r.height*0.4,id}; });
  await p.mouse.click(pt.x, pt.y); await p.waitForTimeout(400);
  console.log('sprite tap', pt.id, '->', await p.evaluate(()=>selectedTile));
  await p.screenshot({path:'iso4.png'});
  // tap empty ground to the right
  await p.mouse.click(380, 760-200); await p.waitForTimeout(300);
  console.log('ground tap ->', await p.evaluate(()=>selectedTile));
  console.log(errs); await b.close();
})();

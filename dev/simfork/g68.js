const { chromium } = require('/home/claude/.npm-global/lib/node_modules/@playwright/mcp/node_modules/playwright');
(async () => {
  const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args: ['--no-sandbox'] });
  const p = await b.newPage({ viewport: { width: 420, height: 800 }, deviceScaleFactor: 2 });
  const errs=[]; p.on('pageerror',e=>errs.push(e.message));
  await p.goto('file:///home/claude/game.html'); await p.waitForTimeout(2000);
  await p.evaluate(() => { setScreen('world'); }); await p.waitForTimeout(1000);
  await p.evaluate(() => document.getElementById('devMapIsoBtn').click()); await p.waitForTimeout(600);
  const info = await p.evaluate(() => {
    const home=tileXY(game.state.homeTileId);
    // find nearest cluster of resource/npc tiles with a base fake neighbour
    let best=null, bd=1e9; game.state.map.forEach(t=>{ if(t.type!=='empty'){ const d=Math.abs(t.x-home[0])+Math.abs(t.y-home[1]); if(d<bd){bd=d;best=t;} }});
    occupiedTileIds[(best.x+3)+","+(best.y+3)]='other1';
    const vp=document.getElementById('mapviewport'); const c=tileCenterPx(best); vp.scrollLeft=c.x-vp.clientWidth/2; vp.scrollTop=c.y-vp.clientHeight/2; renderVisibleTiles();
    // fake march
    try { game.state.marches.push({id:99,tileId:best.id,status:'outbound',arriveAt:Date.now()+60000,travelSec:120,returnAt:Date.now()+120000,action:'gather',army:{}}); } catch(e){}
    return {best:best.id, home:game.state.homeTileId, tiles:Object.keys(mapTileEls).length};
  });
  console.log(JSON.stringify(info)); await p.waitForTimeout(800);
  await p.screenshot({path:'iso3.png'});
  console.log(await p.evaluate(()=>{const m=document.querySelectorAll('.march-marker'); return m.length+' markers '+ (m[0]?m[0].style.left+','+m[0].style.top:'')}));
  console.log(errs); await b.close();
})();

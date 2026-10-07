const { chromium } = require('/home/claude/.npm-global/lib/node_modules/@playwright/mcp/node_modules/playwright');
(async () => {
  const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args: ['--no-sandbox','--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader','--ignore-gpu-blocklist'] });
  const p = await b.newPage({ viewport: { width: 420, height: 800 }, deviceScaleFactor: 2 });
  const errs=[]; p.on('pageerror',e=>errs.push(e.message)); p.on('console',m=>{ if(m.type()==='error'&&!/ERR_TUNNEL|capability bridge/.test(m.text())) errs.push('console: '+m.text()); });
  await p.goto('file:///home/claude/game.html'); await p.waitForTimeout(2000);
  await p.evaluate(() => setScreen('world')); await p.waitForTimeout(800);
  await p.evaluate(() => { document.getElementById('devMapIsoBtn').click(); document.getElementById('devMarch3dBtn').click(); }); await p.waitForTimeout(500);
  const info = await p.evaluate(() => {
    const home=tileXY(game.state.homeTileId);
    // several fake marches in different directions
    const dirs=[[6,0],[0,6],[-6,0],[0,-6],[5,5],[-5,5],[5,-5],[-5,-5]];
    dirs.forEach((d,i)=>{ const id=game.state.map.find(t=>t.x===home[0]+d[0]&&t.y===home[1]+d[1]); if(!id) return; game.state.marches.push({id:100+i,tileId:id.id,status:'outbound',arriveAt:Date.now()+60000,travelSec:120,returnAt:Date.now()+120000,action:'gather',army:{}}); });
    const vp=document.getElementById('mapviewport'); const c=tileCenterPx({x:home[0],y:home[1]}); vp.scrollLeft=c.x-vp.clientWidth/2; vp.scrollTop=c.y-vp.clientHeight/2; renderVisibleTiles();
    return {n:game.state.marches.length};
  });
  await p.waitForTimeout(1500);
  console.log(JSON.stringify(info), await p.evaluate(()=>({ok:marchGL.ok, vis: document.getElementById('marchGL') && document.getElementById('marchGL').style.display})));
  await p.evaluate(()=>{const v=document.getElementById('mapviewport'); v.scrollLeft+=90; v.scrollTop+=60;}); await p.waitForTimeout(900); await p.screenshot({path:'ships2.png'}); console.log(await p.evaluate(()=>({ox:marchGL.ox,oy:marchGL.oy,sl:document.getElementById('mapviewport').scrollLeft})));
  console.log(errs); await b.close();
})();

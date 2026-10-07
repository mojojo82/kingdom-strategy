const { chromium } = require('/home/claude/.npm-global/lib/node_modules/@playwright/mcp/node_modules/playwright');
(async () => {
  const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args: ['--no-sandbox','--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader','--ignore-gpu-blocklist'] });
  const p = await b.newPage({ viewport: { width: 420, height: 800 }, deviceScaleFactor: 1 });
  const errs=[]; p.on('pageerror',e=>errs.push(e.message));
  await p.goto('file:///home/claude/game.html'); await p.waitForTimeout(2000);
  await p.evaluate(() => setScreen('world')); await p.waitForTimeout(800);
  await p.evaluate(() => { document.getElementById('devMapIsoBtn').click(); document.getElementById('devMarch3dBtn').click(); }); await p.waitForTimeout(500);
  await p.evaluate(() => { const home=tileXY(game.state.homeTileId); const id=game.state.map.find(t=>t.x===home[0]-5&&t.y===home[1]-5); game.state.marches.push({id:100,tileId:id.id,status:'outbound',arriveAt:Date.now()+600000,travelSec:1200,returnAt:Date.now()+1200000,action:'gather',army:{}}); const vp=document.getElementById('mapviewport'); const c=tileCenterPx({x:home[0]+2,y:home[1]+2}); vp.scrollLeft=c.x-vp.clientWidth/2; vp.scrollTop=c.y-vp.clientHeight/2; renderVisibleTiles(); });
  async function snap(tag){ await p.waitForTimeout(700); const r=await p.evaluate(()=>{const g=document.getElementById('marchGL'); const vp=document.getElementById('mapviewport'); const cr=g.getBoundingClientRect(); return {zoom:mapZoom, canvas:[g.style.left,g.style.top,g.style.width,g.style.height], cvRect:[Math.round(cr.left),Math.round(cr.top),Math.round(cr.width),Math.round(cr.height)], ox:marchGL.ox, oy:marchGL.oy, sl:vp.scrollLeft, st:vp.scrollTop, world:document.getElementById('mapworld').style.width}; }); console.log(tag, JSON.stringify(r)); await p.screenshot({path:'z_'+tag+'.png'}); }
  await snap('a');
  await p.evaluate(()=>setMapZoom(2));
  await snap('b');
  await p.evaluate(()=>setMapZoom(0.7));
  await snap('c');
  console.log(errs); await b.close();
})();

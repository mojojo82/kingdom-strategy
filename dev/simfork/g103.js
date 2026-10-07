const { chromium } = require('/home/claude/.npm-global/lib/node_modules/@playwright/mcp/node_modules/playwright');
(async () => {
  const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args: ['--no-sandbox'] });
  const p = await b.newPage({ viewport: { width: 420, height: 800 } }); const errs=[]; p.on('pageerror',e=>errs.push(e.message));
  await p.goto('file:///home/claude/game.html'); await p.waitForTimeout(2000);
  await p.evaluate(()=>{ setScreen('world'); setMapZoom(MAP_ZOOM_MIN); const vp=document.getElementById('mapviewport'); vp.scrollLeft=0; vp.scrollTop=0; renderVisibleTiles(); }); await p.waitForTimeout(700);
  await p.screenshot({path:'g103_flat.png'});
  await p.evaluate(()=>{ document.getElementById('devMapIsoBtn').click(); }); await p.waitForTimeout(500);
  await p.evaluate(()=>{ setMapZoom(MAP_ZOOM_MIN); const vp=document.getElementById('mapviewport'); const c=tileCenterPx({x:0,y:0}); vp.scrollLeft=c.x-vp.clientWidth/2; vp.scrollTop=Math.max(0,c.y-120); renderVisibleTiles(); }); await p.waitForTimeout(700);
  await p.screenshot({path:'g103_iso.png'});
  console.log(await p.evaluate(()=>({zmin:MAP_ZOOM_MIN, svg:!!document.getElementById('mapBorder')})), errs); await b.close();
})();

const { chromium } = require('/home/claude/.npm-global/lib/node_modules/@playwright/mcp/node_modules/playwright');
(async () => {
  const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args: ['--no-sandbox'] });
  const p = await b.newPage({ viewport: { width: 420, height: 800 } }); const errs=[]; p.on('pageerror',e=>errs.push(e.message));
  await p.goto('file:///home/claude/game.html'); await p.waitForTimeout(2000);
  const t=await p.evaluate(()=>{ const s=game.state; s.troops.infantry=100; setScreen('world'); const home=tileXY(s.homeTileId); const t=s.map.filter(x=>x.type==='resource').sort((a,b)=>Math.hypot(a.x-home[0],a.y-home[1])-Math.hypot(b.x-home[0],b.y-home[1]))[3]; game.sendMarch({infantry:20},t.id,'gather',[]); render(); const vp=document.getElementById('mapviewport'); vp.scrollLeft=0; vp.scrollTop=0; return t.id; });
  await p.waitForTimeout(500);
  await p.click('#fleetHud .fh-row'); await p.waitForTimeout(1200);
  console.log(t, await p.evaluate((id)=>{ const vp=document.getElementById('mapviewport'); const xy=tileXY(id); const c=tileCenterPx({x:xy[0],y:xy[1]}); return {offX:Math.round(c.x-vp.scrollLeft-vp.clientWidth/2), offY:Math.round(c.y-vp.scrollTop-vp.clientHeight/2)}; }, t), errs);
  await p.screenshot({path:'g96.png'}); await b.close();
})();

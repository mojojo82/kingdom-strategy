const { chromium } = require('/home/claude/.npm-global/lib/node_modules/@playwright/mcp/node_modules/playwright');
(async () => {
  const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args: ['--no-sandbox'] });
  const p = await b.newPage({ viewport: { width: 420, height: 800 } }); const errs=[]; p.on('pageerror',e=>errs.push(e.message));
  await p.goto('file:///home/claude/game.html'); await p.waitForTimeout(2000);
  await p.evaluate(()=>{ const s=game.state; s.troops.infantry=100; setScreen('world'); const home=tileXY(s.homeTileId); const t=s.map.filter(x=>x.type==='resource').sort((a,b)=>Math.hypot(a.x-home[0],a.y-home[1])-Math.hypot(b.x-home[0],b.y-home[1]))[20]; game.sendMarch({infantry:20},t.id,'gather',[]); const m=s.marches[0]; m.arriveAt=Date.now()+m.travelSec*500; render(); const vp=document.getElementById('mapviewport'); vp.scrollLeft=0; vp.scrollTop=0; });
  await p.waitForTimeout(500);
  await p.click('#fleetHud .fh-row'); await p.waitForTimeout(1200);
  console.log(await p.evaluate(()=>{ const vp=document.getElementById('mapviewport'), el=Object.values(marchMarkerEls)[0]; const r=el.getBoundingClientRect(), v=vp.getBoundingClientRect(); return {shipFromCentreX:Math.round(r.left+r.width/2-(v.left+v.width/2)), shipFromCentreY:Math.round(r.top+r.height/2-(v.top+v.height/2)), shipVisible: r.left>=v.left&&r.right<=v.right&&r.top>=v.top&&r.bottom<=v.bottom}; }), errs);
  await b.close();
})();

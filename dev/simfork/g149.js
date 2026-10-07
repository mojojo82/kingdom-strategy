const { chromium } = require('/home/claude/.npm-global/lib/node_modules/@playwright/mcp/node_modules/playwright');
(async () => {
  const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args: ['--no-sandbox'] });
  const ctx = await b.newContext({ viewport: { width: 390, height: 844 }, hasTouch:true, isMobile:true, deviceScaleFactor:3 });
  const p = await ctx.newPage();
  // first visit: go to world, iso on, save
  await p.goto('file:///home/claude/game.html'); await p.waitForTimeout(1500);
  await p.evaluate(async()=>{ setScreen('world'); if(!mapIso) document.getElementById('devMapIsoBtn').click(); persist(); });
  const probe = ()=>p.evaluate(()=>{ const vp=document.getElementById('mapviewport'); if(!vp) return null; const x=vp.scrollLeft+vp.clientWidth/2, y=vp.scrollTop+vp.clientHeight/2; let t;
    if (mapIso){ const g=isoGeom(), a=(x-g.offX)/g.r2, b=(y-g.offY)/(g.r2*ISO_K); t=[Math.round((a+b)/2),Math.round((b-a)/2)]; } else { const P=tilePxZ()+gapPxZ(); t=[Math.floor((x-padPxZ())/P),Math.floor((y-padPxZ())/P)]; }
    return { screen: appScreen, centre: t.join(','), home: game.state.homeTileId, vp:[vp.clientWidth,vp.clientHeight], scroll:[Math.round(vp.scrollLeft),Math.round(vp.scrollTop)], iso: mapIso, zoom: +mapZoom.toFixed(3) }; });
  await p.reload();
  const log=[]; const t0=Date.now();
  for (let i=0;i<30;i++){ await p.waitForTimeout(i<10?100:400); const r=await probe(); log.push(((Date.now()-t0)/1000).toFixed(1)+'s '+JSON.stringify(r)); }
  console.log(log.filter((l,i)=>i===0||l.slice(5)!==log[i-1].slice(5)).join('\n'));
  await b.close();
})();

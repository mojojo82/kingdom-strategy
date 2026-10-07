const { chromium } = require('/home/claude/.npm-global/lib/node_modules/@playwright/mcp/node_modules/playwright');
(async () => {
  const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args: ['--no-sandbox','--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader','--ignore-gpu-blocklist'] });
  const p = await b.newPage({ viewport: { width: 430, height: 932 }, deviceScaleFactor: 2 }); const errs=[]; p.on('pageerror',e=>errs.push(e.message));
  await p.goto('file:///home/claude/game.html'); await p.waitForTimeout(2000);
  await p.evaluate(()=>{ const s=game.state; s.troops.infantry=100; setScreen('world'); document.getElementById('devMapIsoBtn').click(); if(!march3dOn) document.getElementById('devMarch3dBtn').click();
    s.homeTileId=mapTileAt(s.map,64,30).id; const m=game.sendMarch({infantry:10},mapTileAt(s.map,13,10).id,'gather',[]).march; m.arriveAt=Date.now()+m.travelSec*400; });
  for (const z of [0.5,0.3,0.15,0.08,0.05]) {
    await p.evaluate((z)=>{ setMapZoom(z); const c=marchNowPx(game.state.marches[0]); const vp=document.getElementById('mapviewport'); vp.scrollLeft=c.x-vp.clientWidth/2; vp.scrollTop=c.y-vp.clientHeight/2; }, z);
    await p.waitForTimeout(500);
    const info=await p.evaluate(()=>{ const cv=document.getElementById('marchGL'); const r=cv?cv.getBoundingClientRect():null; return {cv: r?[Math.round(r.left),Math.round(r.top),Math.round(r.width),Math.round(r.height), cv.style.display]:null, lod:mapLod(), u:+(tilePxZ()+gapPxZ()).toFixed(2)}; });
    await p.screenshot({path:`g110_${z}.png`}); console.log(z, JSON.stringify(info));
  }
  console.log(errs); await b.close();
})();

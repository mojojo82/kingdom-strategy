const { chromium } = require('/home/claude/.npm-global/lib/node_modules/@playwright/mcp/node_modules/playwright');
(async () => {
  const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args: ['--no-sandbox'] });
  const p = await b.newPage({ viewport: { width: 430, height: 932 } });
  await p.goto('file:///home/claude/game.html'); await p.waitForTimeout(1500);
  for (const iso of [false,true]) console.log(await p.evaluate(async(iso)=>{ setScreen('world'); if(mapIso!==iso) document.getElementById('devMapIsoBtn').click(); await new Promise(r=>setTimeout(r,300)); setMapZoom(0.001);
    const g=mapIso?isoGeom():null, P=tilePxZ()+gapPxZ(); const px=(x,y)=>mapIso?isoCenterG(g,x,y):{x:x*P,y:y*P}; const o0=px(0,0),o1=px(1,0),o2=px(0,1);
    return JSON.stringify({iso:mapIso, mapZoom, o1:[o1.x-o0.x,o1.y-o0.y], o2:[o2.x-o0.x,o2.y-o0.y], cls:document.querySelector('.prov-label').className}); }, iso));
  await b.close();
})();

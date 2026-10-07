const { chromium } = require('/home/claude/.npm-global/lib/node_modules/@playwright/mcp/node_modules/playwright');
(async () => {
  const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args: ['--no-sandbox'] });
  const p = await b.newPage({ viewport: { width: 430, height: 932 } }); const errs=[]; p.on('pageerror',e=>errs.push(e.message));
  await p.goto('file:///home/claude/game.html'); await p.waitForTimeout(1500);
  await p.evaluate(async()=>{ setScreen('world'); if(!mapIso) document.getElementById('devMapIsoBtn').click(); await new Promise(r=>setTimeout(r,200)); setMapZoom(1); if(!terrainDev) document.getElementById('devTerrainBtn').click(); document.getElementById('mapPaintBtn').click(); });
  await p.click('#tpTiles button[data-t="3"]'); await p.click('#tpBrush button[data-b="1"]');
  await p.mouse.move(250,500); await p.mouse.down(); await p.mouse.move(330,540,{steps:8}); await p.mouse.up(); await p.waitForTimeout(400);
  const a = await p.evaluate(()=>({ forestTiles: [...terrainArr].filter(v=>v===3).length, els: Object.keys(forestEls).length }));
  await p.click('#tpUndo'); await p.waitForTimeout(300);
  const c = await p.evaluate(()=>({ forestTiles: [...terrainArr].filter(v=>v===3).length, els: Object.keys(forestEls).length }));
  console.log(JSON.stringify({a,c}), errs); await b.close();
})();

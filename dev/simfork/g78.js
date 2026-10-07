const { chromium } = require('/home/claude/.npm-global/lib/node_modules/@playwright/mcp/node_modules/playwright');
(async () => {
  const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args: ['--no-sandbox'] });
  const p = await b.newPage({ viewport: { width: 420, height: 800 } });
  const errs=[]; p.on('pageerror',e=>errs.push(e.message)); p.on('console',m=>{ if(m.type()==='error'&&!/ERR_TUNNEL|capability/.test(m.text())) errs.push('C:'+m.text()); });
  await p.goto('file:///home/claude/game.html'); await p.waitForTimeout(2000);
  await p.evaluate(() => { setScreen('world'); document.getElementById('devTerrainBtn').click(); }); await p.waitForTimeout(600);
  await p.click('#mapPaintBtn'); await p.waitForTimeout(300);
  const box = await (await p.$('#mapviewport')).boundingBox(); const cx=box.x+box.width/2, cy=box.y+box.height/2;
  async function drag(pts){ await p.mouse.move(pts[0][0],pts[0][1]); await p.mouse.down(); for(const q of pts.slice(1)){ await p.mouse.move(q[0],q[1],{steps:6}); } await p.mouse.up(); }
  // big grass blob, thicker brush
  await p.click('#tpBrush button[data-b="2"]');
  await drag([[cx-90,cy-60],[cx+80,cy-60],[cx+80,cy+40],[cx-90,cy+40],[cx-90,cy-60]]);
  await p.click('#tpBrush button[data-b="1"]'); await p.click('#tpTiles button[data-t="2"]');
  await drag([[cx-30,cy-10],[cx+30,cy+10]]);
  await p.click('#tpBrush button[data-b="0"]'); await p.click('#tpTiles button[data-t="0"]');
  await drag([[cx+50,cy-60],[cx+50,cy-20]]);
  await p.waitForTimeout(300);
  console.log(await p.evaluate(()=>({cells:Object.keys(terrainEls).length, painted:Array.from(terrainArr).filter(x=>x).length, undo:terrainPaint.undo.length})));
  await p.screenshot({path:'g78_flat.png'});
  await p.click('#tpDone');
  await p.evaluate(()=>{ document.getElementById('devMapIsoBtn').click(); }); await p.waitForTimeout(900);
  await p.screenshot({path:'g78_iso.png'});
  await p.evaluate(()=>setMapZoom(2)); await p.waitForTimeout(700); await p.screenshot({path:'g78_iso2.png'});
  console.log(await p.evaluate(()=>({cells:Object.keys(terrainEls).length, local:(localStorage.getItem(TERRAIN_KEY)||'').replace(/0/g,'').length})));
  console.log(errs); await b.close();
})();

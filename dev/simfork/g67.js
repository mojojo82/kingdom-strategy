const { chromium } = require('/home/claude/.npm-global/lib/node_modules/@playwright/mcp/node_modules/playwright');
(async () => {
  const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args: ['--no-sandbox'] });
  const p = await b.newPage({ viewport: { width: 420, height: 800 }, deviceScaleFactor: 2 });
  const errs=[]; p.on('pageerror',e=>errs.push(e.message));
  await p.goto('file:///home/claude/game.html'); await p.waitForTimeout(2000);
  await p.evaluate(() => { setScreen('world'); }); await p.waitForTimeout(1200);
  await p.evaluate(() => document.getElementById('devMapIsoBtn').click()); await p.waitForTimeout(800);
  const r = await p.evaluate(() => { const w=document.getElementById('mapworld'); return {iso:w.className, w:w.style.width, h:w.style.height, tiles:Object.keys(mapTileEls).length, home:game.state.homeTileId, sl:document.getElementById('mapviewport').scrollLeft}; });
  console.log(JSON.stringify(r));
  await p.screenshot({path:'iso1.png'});
  // tap a real tile via mouse at a tile centre
  const pt = await p.evaluate(() => { const [x,y]=tileXY(game.state.homeTileId); const d=mapTileEls[(x+4)+","+(y+1)]; const r=d.getBoundingClientRect(); return {x:r.left+r.width/2,y:r.top+r.height/2,id:(x+4)+","+(y+1)}; });
  await p.mouse.click(pt.x, pt.y); await p.waitForTimeout(400);
  console.log(pt.id, 'selected ->', await p.evaluate(()=>selectedTile));
  await p.screenshot({path:'iso2.png'});
  console.log(errs); await b.close();
})();

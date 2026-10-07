const { chromium } = require('/home/claude/.npm-global/lib/node_modules/@playwright/mcp/node_modules/playwright');
(async () => {
  const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args: ['--no-sandbox'] });
  const p = await b.newPage({ viewport: { width: 420, height: 800 }, deviceScaleFactor: 2 });
  const errs=[]; p.on('pageerror',e=>errs.push(e.message));
  await p.goto('file:///home/claude/game.html'); await p.waitForTimeout(2000);
  await p.evaluate(() => { setScreen('world'); }); await p.waitForTimeout(1000);
  const flat = await p.evaluate(() => { const [x,y]=tileXY(game.state.homeTileId); selectedTile=game.state.homeTileId; renderVisibleTiles(); return {cls:document.getElementById('mapworld').className, fp:Object.keys(mapTileEls).filter(i=>mapTileEls[i].classList.contains('fp')).length, wrap: !!mapTileEls[game.state.homeTileId].querySelector('.tile-up .city-icon-img')}; });
  console.log('flat', JSON.stringify(flat)); await p.screenshot({path:'flat_after.png'});
  await p.evaluate(() => { document.getElementById('devMapIsoBtn').click(); setMapZoom(1.6); }); await p.waitForTimeout(600);
  console.log('iso zoom', await p.evaluate(()=>({w:document.getElementById('mapworld').style.width, tiles:Object.keys(mapTileEls).length, sel:selectedTile})));
  await p.evaluate(() => document.getElementById('devMapIsoBtn').click()); await p.waitForTimeout(400);
  console.log('back flat', await p.evaluate(()=>document.getElementById('mapworld').className+' '+document.getElementById('mapworld').style.width));
  console.log(errs); await b.close();
})();

const { chromium } = require('/home/claude/.npm-global/lib/node_modules/@playwright/mcp/node_modules/playwright');
(async () => {
  const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args: ['--no-sandbox'] });
  const p = await b.newPage({ viewport: { width: 420, height: 800 }, deviceScaleFactor: 2 });
  const errs=[]; p.on('pageerror',e=>errs.push(e.message));
  await p.goto('file:///home/claude/game.html'); await p.waitForTimeout(2000);
  await p.evaluate(() => setScreen('world')); await p.waitForTimeout(1500);
  const r = await p.evaluate(() => { selectedTile = game.state.homeTileId; renderVisibleTiles(); renderTileInfo(); const d = mapTileEls[selectedTile]; if (d) d.scrollIntoView({block:'center',inline:'center'}); return {home:selectedTile, cls: d && d.className}; });
  console.log(JSON.stringify(r)); await p.waitForTimeout(600);
  await p.screenshot({path:'foot.png'}); console.log(errs); await b.close();
})();

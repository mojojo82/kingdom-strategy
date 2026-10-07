const { chromium } = require('/home/claude/.npm-global/lib/node_modules/@playwright/mcp/node_modules/playwright');
(async () => {
  const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args: ['--no-sandbox'] });
  const p = await b.newPage({ viewport: { width: 420, height: 800 }, deviceScaleFactor: 2 });
  const errs=[]; p.on('pageerror',e=>errs.push(e.message));
  await p.goto('file:///home/claude/game.html'); await p.waitForTimeout(2000);
  await p.evaluate(() => setScreen('world')); await p.waitForTimeout(1500);
  const r = await p.evaluate(() => {
    const h = game.state.homeTileId, [x,y]=tileXY(h);
    selectedTile = h; renderVisibleTiles(); renderTileInfo(); mapTileEls[h].scrollIntoView({block:'center',inline:'center'});
    const fpHome = Object.keys(mapTileEls).filter(i=>mapTileEls[i].classList.contains('fp'));
    // click neighbour
    selectedTile=null; mapTileEls[(x+1)+","+(y-1)].onclick(); const viaNeighbour = selectedTile;
    // near empty (bad)
    const near=(x+2)+","+y; selectedTile=near; renderVisibleTiles(); const bad = Object.keys(mapTileEls).filter(i=>mapTileEls[i].classList.contains('bad')).length;
    const tooClose = isTileTooCloseToCity(near);
    // far empty
    const far=game.state.map.find(t=>t.type==='empty' && !isBaseTile(t.id) && !isTileTooCloseToCity(t.id) && Math.abs(t.x-x)>6 && Math.abs(t.y-y)>6 && t.x>3&&t.y>3);
    return {h, nHome:fpHome.length, viaNeighbour, bad, tooClose, far: far && far.id, farClose: far && isTileTooCloseToCity(far.id), n: mapSizeTiles()};
  });
  console.log(JSON.stringify(r));
  await p.evaluate(()=>{ const h=game.state.homeTileId, [x,y]=tileXY(h); occupiedTileIds[(x+4)+","+y]='other1'; selectedTile=(x+2)+","+y; renderVisibleTiles(); renderTileInfo(); });
  await p.waitForTimeout(500); await p.screenshot({path:'fp_bad.png'});
  await p.evaluate(()=>{ const h=game.state.homeTileId; selectedTile=h; renderVisibleTiles(); renderTileInfo(); }); await p.waitForTimeout(500); await p.screenshot({path:'fp_home.png'});
  console.log(errs); await b.close();
})();

/* Panning follow + off-screen hide + PC viewport + empty-tile card. */
const { chromium } = require('/home/claude/.npm-global/lib/node_modules/@playwright/mcp/node_modules/playwright');
(async () => {
  const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args: ['--no-sandbox'] });
  for (const vpz of [[390, 844], [1280, 800]]) {
    const p = await b.newPage({ viewport: { width: vpz[0], height: vpz[1] }, deviceScaleFactor: 1 });
    const errs = []; p.on('pageerror', e => errs.push(e.message));
    await p.goto('file:///home/claude/game.html'); await p.waitForTimeout(2500);
    await p.evaluate(() => setScreen('world')); await p.waitForTimeout(1200);
    const sel = await p.evaluate(() => {
      const v = document.getElementById('mapviewport').getBoundingClientRect(); let best = null, bd = 1e9;
      Object.keys(mapTileEls).forEach(id => { const t = game.state.map.find(m => m.id === id); if (!t || t.type !== 'empty' || id === game.state.homeTileId) return; const r = mapTileEls[id].getBoundingClientRect(); const d = Math.hypot(r.left + r.width / 2 - (v.left + v.width * .5), r.top + r.height / 2 - (v.top + v.height * .4)); if (d < bd) { bd = d; best = id; } });
      occupiedTileIds[best] = 'botX'; otherCityStatsCache['botX'] = { townhallLevel: 12, power: 3456789, heroCount: 5, troopsTotal: 123456 };
      selectedTile = best; renderVisibleTiles(); renderTileInfo(); return best;
    });
    const rel = () => p.evaluate((id) => { const c = document.getElementById('tileinfo'), t = mapTileEls[id]; const cr = c.getBoundingClientRect(); if (!t) return { tile: 'unmounted', vis: getComputedStyle(c).visibility }; const tr = t.getBoundingClientRect(); return { dx: Math.round(cr.left + cr.width / 2 - (tr.left + tr.width / 2)), dy: Math.round(cr.top - tr.bottom), vis: getComputedStyle(c).visibility, arrow: document.getElementById('tileinfoArrow').style.display }; }, sel);
    console.log(vpz.join('x'), 'start      ', JSON.stringify(await rel()));
    await p.evaluate(() => { document.getElementById('mapviewport').scrollLeft += 60; document.getElementById('mapviewport').scrollTop += 90; }); await p.waitForTimeout(300);
    console.log(vpz.join('x'), 'after pan   ', JSON.stringify(await rel()));
    await p.evaluate(() => { document.getElementById('mapviewport').scrollTop += 2000; }); await p.waitForTimeout(400);
    console.log(vpz.join('x'), 'scrolled out', JSON.stringify(await rel()));
    await p.evaluate(() => { document.getElementById('mapviewport').scrollTop -= 2000; }); await p.waitForTimeout(400);
    console.log(vpz.join('x'), 'scrolled back', JSON.stringify(await rel()));
    /* empty tile card (teleport) */
    await p.evaluate((id) => { delete occupiedTileIds[id]; renderVisibleTiles(); renderTileInfo(); }, sel); await p.waitForTimeout(300);
    const h = await p.evaluate(() => { const c = document.getElementById('tileinfo'); return { h: Math.round(c.getBoundingClientRect().height), w: Math.round(c.getBoundingClientRect().width), scroll: c.scrollHeight > c.clientHeight + 1 }; });
    console.log(vpz.join('x'), 'empty tile card', JSON.stringify(h));
    await p.screenshot({ path: `/home/claude/simfork/g55_${vpz[0]}.png` });
    console.log('errors:', errs.length ? errs : 'none');
    await p.close();
  }
  await b.close();
})();

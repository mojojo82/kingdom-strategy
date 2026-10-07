/* Select a (faked) player base at a chosen viewport position on the world map, screenshot, and report card geometry vs the base.
   usage: node g54.js <outPrefix> <fx,fy> [<fx,fy> ...]   fx,fy = fraction of the map viewport (0..1) where the base sits */
const { chromium } = require('/home/claude/.npm-global/lib/node_modules/@playwright/mcp/node_modules/playwright');
(async () => {
  const prefix = process.argv[2], spots = process.argv.slice(3).map(s => s.split(',').map(Number));
  const vp = (process.env.VP || '390x844').split('x').map(Number);
  const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args: ['--no-sandbox'] });
  const p = await b.newPage({ viewport: { width: vp[0], height: vp[1] }, deviceScaleFactor: 2, isMobile: vp[0] < 700, hasTouch: vp[0] < 700 });
  const errs = []; p.on('pageerror', e => errs.push(e.message));
  await p.goto('file:///home/claude/game.html'); await p.waitForTimeout(2500);
  await p.evaluate(() => setScreen('world')); await p.waitForTimeout(1200);
  for (let i = 0; i < spots.length; i++) {
    const [fx, fy] = spots[i];
    const info = await p.evaluate(([fx, fy]) => {
      const vp = document.getElementById('mapviewport').getBoundingClientRect();
      const tx = vp.left + vp.width * fx, ty = vp.top + vp.height * fy;
      let best = null, bd = 1e9;
      Object.keys(mapTileEls).forEach(id => { const t = game.state.map.find(m => m.id === id); if (!t || t.type !== 'empty' || id === game.state.homeTileId) return; const r = mapTileEls[id].getBoundingClientRect(); const d = Math.hypot(r.left + r.width / 2 - tx, r.top + r.height / 2 - ty); if (d < bd) { bd = d; best = id; } });
      Object.keys(occupiedTileIds).forEach(k => delete occupiedTileIds[k]); occupiedTileIds[best] = 'botX';
      otherCityStatsCache['botX'] = { townhallLevel: 12, power: 3456789, heroCount: 5, troopsTotal: 123456 };
      selectedTile = best; renderVisibleTiles(); renderTileInfo(); placeTileInfo();
      return best;
    }, [fx, fy]);
    await p.waitForTimeout(400);
    const geo = await p.evaluate((id) => {
      const el = document.getElementById('tileinfo').getBoundingClientRect(), t = mapTileEls[id].getBoundingClientRect(), v = document.getElementById('mapviewport').getBoundingClientRect();
      const ar = document.getElementById('tileinfoArrow'); const a = ar && ar.style.display !== 'none' ? ar.getBoundingClientRect() : null;
      return { card: [el.left, el.top, el.width, el.height].map(Math.round), tile: [t.left, t.top, t.width, t.height].map(Math.round), viewport: [v.left, v.top, v.width, v.height].map(Math.round), arrow: a ? [a.left, a.top, a.width, a.height].map(Math.round) : null, vis: getComputedStyle(document.getElementById('tileinfo')).visibility };
    }, info);
    console.log(i, [fx, fy].join(','), JSON.stringify(geo));
    await p.screenshot({ path: `/home/claude/simfork/${prefix}_${i}.png` });
  }
  console.log('errors:', errs.length ? errs : 'none');
  await b.close();
})();

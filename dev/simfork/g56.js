/* With a player base selected + card showing: does a drag on the map dismiss the card? (touch via CDP, and mouse). Also: a plain tap on another tile must still select it. */
const { chromium } = require('/home/claude/.npm-global/lib/node_modules/@playwright/mcp/node_modules/playwright');
async function setup(p) {
  await p.goto('file:///home/claude/game.html'); await p.waitForTimeout(2500);
  await p.evaluate(() => setScreen('world')); await p.waitForTimeout(1200);
  return p.evaluate(() => {
    const v = document.getElementById('mapviewport').getBoundingClientRect(); let best = null, bd = 1e9;
    Object.keys(mapTileEls).forEach(id => { const t = game.state.map.find(m => m.id === id); if (!t || t.type !== 'empty' || id === game.state.homeTileId) return; const r = mapTileEls[id].getBoundingClientRect(); const d = Math.hypot(r.left + r.width / 2 - (v.left + v.width * .5), r.top + r.height / 2 - (v.top + v.height * .35)); if (d < bd) { bd = d; best = id; } });
    occupiedTileIds[best] = 'botX'; otherCityStatsCache['botX'] = { townhallLevel: 12, power: 3456789, heroCount: 5, troopsTotal: 123456 };
    selectedTile = best; renderVisibleTiles(); renderTileInfo();
    const r = mapTileEls[best].getBoundingClientRect(); const vr = document.getElementById('mapviewport').getBoundingClientRect();
    return { id: best, v: [vr.left, vr.top, vr.width, vr.height] };
  });
}
const state = (p) => p.evaluate(() => ({ sel: selectedTile, card: getComputedStyle(document.getElementById('tileinfo')).display, vis: getComputedStyle(document.getElementById('tileinfo')).visibility, arrow: document.getElementById('tileinfoArrow').style.display }));
(async () => {
  const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args: ['--no-sandbox'] });
  /* TOUCH drag (phone) */
  { const p = await b.newPage({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true }); const errs = []; p.on('pageerror', e => errs.push(e.message));
    const s = await setup(p); const cdp = await p.context().newCDPSession(p);
    const x = s.v[0] + 60, y = s.v[1] + s.v[3] * 0.8; /* start on empty water far from the card */
    console.log('touch  before drag:', JSON.stringify(await state(p)));
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x, y }] });
    for (let i = 1; i <= 6; i++) { await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: x + i * 6, y: y - i * 6 }] }); await p.waitForTimeout(30); }
    await p.waitForTimeout(150);
    console.log('touch  mid drag   :', JSON.stringify(await state(p)));
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] }); await p.waitForTimeout(200);
    console.log('touch  after drag :', JSON.stringify(await state(p)), errs.length ? errs : 'no errors');
    /* tap on a different tile still selects it */
    const other = await p.evaluate((cur) => { const v = document.getElementById('mapviewport').getBoundingClientRect(); let best = null, bd = 1e9; Object.keys(mapTileEls).forEach(id => { if (id === cur) return; const r = mapTileEls[id].getBoundingClientRect(); const d = Math.hypot(r.left + r.width / 2 - (v.left + v.width * .3), r.top + r.height / 2 - (v.top + v.height * .6)); if (d < bd) { bd = d; best = id; } }); const r = mapTileEls[best].getBoundingClientRect(); return { id: best, x: r.left + r.width / 2, y: r.top + r.height / 2 }; }, s.id);
    await p.touchscreen.tap(other.x, other.y); await p.waitForTimeout(250);
    console.log('touch  tap tile   :', JSON.stringify(await state(p)), 'expected sel', other.id);
    await p.close(); }
  /* MOUSE drag (PC) - fresh page, base selected */
  { const p = await b.newPage({ viewport: { width: 1280, height: 800 } }); const errs = []; p.on('pageerror', e => errs.push(e.message));
    const s = await setup(p); const x = s.v[0] + 60, y = s.v[1] + 40;
    console.log('mouse  before drag:', JSON.stringify(await state(p)));
    await p.mouse.move(x, y); await p.mouse.down(); for (let i = 1; i <= 6; i++) { await p.mouse.move(x + i * 6, y - i * 6); await p.waitForTimeout(30); }
    await p.waitForTimeout(150); console.log('mouse  mid drag   :', JSON.stringify(await state(p)));
    await p.mouse.up(); await p.waitForTimeout(200); console.log('mouse  after drag :', JSON.stringify(await state(p)), errs.length ? errs : 'no errors');
    await p.close(); }
  await b.close();
})();

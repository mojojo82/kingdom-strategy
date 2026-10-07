const { chromium } = require('/home/claude/.npm-global/lib/node_modules/@playwright/mcp/node_modules/playwright');
(async () => {
  const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args: ['--no-sandbox'] });
  const p = await b.newPage({ viewport: { width: 420, height: 800 }, deviceScaleFactor: 3 });
  const errs = []; p.on('pageerror', e => errs.push(e.message));
  await p.goto('file:///home/claude/game.html'); await p.waitForTimeout(2500);
  await p.evaluate(() => { setScreen('conquest'); game.state.equippedWeapons = ['orbit_shield']; });
  await p.waitForTimeout(1200);
  /* trace the draw order of one frame: back pass, hull, front pass */
  await p.evaluate(() => {
    window.__tr = []; const op = orbitShieldDrawPass, oh = orbitShieldDrawHull;
    window.orbitShieldDrawPass = function (c, s, f) { window.__tr.push(f ? 'frontPass' : 'backPass'); return op.apply(this, arguments); };
    window.orbitShieldDrawHull = function () { window.__tr.push('hull'); return oh.apply(this, arguments); };
  });
  await p.waitForTimeout(500);
  const tr = await p.evaluate(() => window.__tr.slice(0, 9));
  console.log('fortLifeOn =', await p.evaluate(() => fortLifeOn), ' draw order of first frames:', tr.join(' > '));
  const box = await p.evaluate(() => { const r = document.getElementById('idleCanvas').getBoundingClientRect(); return { x: r.left, y: r.top, w: r.width, h: r.height }; });
  for (const on of [true, false]) {
    await p.evaluate((on) => { fortLifeOn = on; }, on);
    for (let i = 0; i < 3; i++) { await p.waitForTimeout(500); await p.screenshot({ path: `/home/claude/simfork/fl_${on ? 'on' : 'off'}_${i}.png`, clip: { x: box.x, y: box.y + box.h * 0.35, width: box.w * 0.45, height: box.h * 0.65 } }); }
  }
  console.log('errors:', errs.length ? errs : 'none'); await b.close();
})();

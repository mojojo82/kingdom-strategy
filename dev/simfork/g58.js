const { chromium } = require('/home/claude/.npm-global/lib/node_modules/@playwright/mcp/node_modules/playwright');
(async () => {
  const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args: ['--no-sandbox'] });
  const p = await b.newPage({ viewport: { width: 420, height: 800 }, deviceScaleFactor: 3 });
  const errs = []; p.on('pageerror', e => errs.push(e.message));
  await p.goto('file:///home/claude/game.html'); await p.waitForTimeout(2500);
  await p.evaluate(() => { setScreen('conquest'); game.state.equippedWeapons = ['orbit_shield']; });
  await p.waitForTimeout(1500);
  console.log(JSON.stringify(await p.evaluate(() => ({ cfg: orbitShieldCfg, active: orbitShieldActive(), imgOk: (function(){ var i = fortressCqImg(); return !!(i && i.complete && i.naturalWidth > 0); })(), set: (function(){ var s = orbitShieldSets.cq; return s ? s.balls.map(b => ({ z: b.z === undefined ? null : +b.z.toFixed(2), x: b.x && Math.round(b.x), y: b.y && Math.round(b.y) })) : null; })() }))));
  const box = await p.evaluate(() => { const r = document.getElementById('idleCanvas').getBoundingClientRect(); return { x: r.left, y: r.top, w: r.width, h: r.height }; });
  for (let i = 0; i < 4; i++) { await p.waitForTimeout(450); await p.screenshot({ path: `/home/claude/simfork/os_${i}.png`, clip: { x: box.x, y: box.y, width: box.w * 0.5, height: box.h } }); }
  console.log('errors:', errs.length ? errs : 'none'); await b.close();
})();

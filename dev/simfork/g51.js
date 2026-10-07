/* Repro: boss kills fortress -> log boss visual (enemyById) vs engine enemies each 100ms until Defeat screen. */
const { chromium } = require('/home/claude/.npm-global/lib/node_modules/@playwright/mcp/node_modules/playwright');
(async () => {
  const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args: ['--no-sandbox'] });
  const p = await b.newPage({ viewport: { width: 420, height: 800 } });
  const errs = []; p.on('pageerror', e => errs.push(e.message));
  await p.goto('file:///home/claude/game.html');
  await p.waitForTimeout(2500);
  await p.evaluate(() => {
    setScreen('conquest');
    const I = game.state.idle;
    I.bossPhase = true; I.enemies = []; I.spawnTimer = null; I.pending = null;
  });
  /* wait for the boss to exist, then make it unkillable and the fortress nearly dead */
  await p.waitForFunction(() => game.state.idle.enemies.some(e => e.type === 'boss'), null, { timeout: 15000 });
  await p.evaluate(() => {
    const I = game.state.idle, bs = I.enemies.find(e => e.type === 'boss');
    bs.hp = bs.maxHp = 1e12; window.__bossId = bs.id; I.playerHp = 1;
    window.__log = [];
    window.__iv = setInterval(() => {
      const bs2 = game.state.idle.enemies.find(e => e.type === 'boss');
      const vis = idleAnim.enemyById && idleAnim.enemyById[window.__bossId];
      const ov = document.getElementById('idleResult');
      window.__log.push({ t: Math.round(performance.now()), engBoss: !!bs2, visHas: !!vis, visX: vis ? Math.round(vis.x) : null,
        pending: game.state.idle.pending && game.state.idle.pending.type, resultShown: ov ? (ov.style.display !== 'none' && ov.offsetHeight > 0) : null,
        keys: Object.keys(idleAnim.enemyById || {}).length });
    }, 100);
  });
  await p.waitForFunction(() => game.state.idle.pending && game.state.idle.pending.type === 'defeat', null, { timeout: 40000 });
  await p.waitForTimeout(3500);
  const log = await p.evaluate(() => { clearInterval(window.__iv); return window.__log; });
  /* print only rows where something changes */
  let prev = '';
  log.forEach(r => { const k = [r.engBoss, r.visHas, r.pending, r.resultShown, r.visX == null ? 'n' : (r.visX > 380 ? 'far' : 'near')].join('|'); if (k !== prev) { console.log(JSON.stringify(r)); prev = k; } });
  /* press the real Confirm button, then check the field is clean and combat resumes */
  const btn = p.getByText('Confirm', { exact: true }).first();
  const vis = await btn.isVisible().catch(() => false);
  console.log('Confirm button visible:', vis);
  if (vis) await btn.click(); else await p.evaluate(() => game.idleResolveResult());
  await p.waitForTimeout(1500);
  console.log('after confirm:', JSON.stringify(await p.evaluate(() => ({ pending: game.state.idle.pending, engEnemies: game.state.idle.enemies.length, visKeys: Object.keys(idleAnim.enemyById || {}).length, hp: game.state.idle.playerHp, wipeFlag: !!idleAnim.wipeEnemiesOnResolve }))));
  console.log('errors:', errs.length ? errs : 'none');
  await b.close();
})();

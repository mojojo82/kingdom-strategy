/* After a boss defeat: wait, then report whether the Defeat overlay is up and screenshot it. */
const { chromium } = require('/home/claude/.npm-global/lib/node_modules/@playwright/mcp/node_modules/playwright');
(async () => {
  const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args: ['--no-sandbox'] });
  const p = await b.newPage({ viewport: { width: 420, height: 800 }, deviceScaleFactor: 2 });
  await p.goto('file:///home/claude/game.html'); await p.waitForTimeout(2500);
  await p.evaluate(() => { setScreen('conquest'); const I = game.state.idle; I.bossPhase = true; I.enemies = []; I.spawnTimer = null; I.pending = null; });
  await p.waitForFunction(() => game.state.idle.enemies.some(e => e.type === 'boss'), null, { timeout: 15000 });
  await p.evaluate(() => { const I = game.state.idle, bs = I.enemies.find(e => e.type === 'boss'); bs.hp = bs.maxHp = 1e12; I.playerHp = 1; });
  await p.waitForFunction(() => game.state.idle.pending && game.state.idle.pending.type === 'defeat', null, { timeout: 40000 });
  for (let i = 0; i < 8; i++) {
    await p.waitForTimeout(700);
    const r = await p.evaluate(() => { const o = document.getElementById('idleResult'); const cs = o && getComputedStyle(o); return { exists: !!o, display: cs && cs.display, op: cs && cs.opacity, h: o && o.offsetHeight, txt: o && o.innerText.slice(0, 60).replace(/\n/g, ' '), bossVis: Object.keys(idleAnim.enemyById || {}).length, screen: document.body.dataset.screen }; });
    console.log(i, JSON.stringify(r));
  }
  await p.screenshot({ path: '/home/claude/simfork/g52_defeat.png' });
  await b.close();
})();

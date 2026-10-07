/* Repro: save written while the Defeat screen is up (boss frozen, HP 0) -> reload -> open Conquest. Does it defeat again right away?
   Also scenario B: save mid-boss-fight with low HP. Prints state right after load and whether a defeat fires within 12s of opening Conquest. */
const { chromium } = require('/home/claude/.npm-global/lib/node_modules/@playwright/mcp/node_modules/playwright');
async function run(label, setup) {
  const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args: ['--no-sandbox'] });
  const ctx = await b.newContext({ viewport: { width: 420, height: 800 } });
  const p = await ctx.newPage(); const errs = []; p.on('pageerror', e => errs.push(e.message));
  await p.goto('file:///home/claude/game.html'); await p.waitForTimeout(2500);
  await p.evaluate(() => { setScreen('conquest'); });
  await p.waitForTimeout(1500);
  await p.evaluate(setup);
  await p.evaluate(() => { persist(); });
  await p.waitForTimeout(300);
  const saved = await p.evaluate(() => { const I = game.state.idle; return { hp: I.playerHp, en: I.enemies.length, bossPhase: I.bossPhase }; });
  await p.reload(); await p.waitForTimeout(2500);
  const afterLoad = await p.evaluate(() => { const I = game.state.idle; return { screen: document.body.dataset.screen, hp: I.playerHp, en: I.enemies.length, bossPhase: I.bossPhase, killed: I.enemiesKilledInLevel, pending: I.pending && I.pending.type, resets: I.resetCount, conquestOpened: game.state.conquestOpened }; });
  await p.evaluate(() => setScreen('conquest'));
  let defeatAt = null;
  for (let i = 0; i < 24; i++) { await p.waitForTimeout(500); const d = await p.evaluate(() => { const I = game.state.idle; return I.pending && I.pending.type; }); if (d === 'defeat') { defeatAt = (i + 1) * 0.5; break; } }
  console.log(label, JSON.stringify({ savedWith: saved, afterLoad, defeatWithinSec: defeatAt, errors: errs.length }));
  await b.close();
}
(async () => {
  /* A: exactly what v810/v811 leave in state while the Defeat screen is up */
  await run('A defeat-screen save:', () => { const I = game.state.idle; I.bossPhase = true; I.enemies = [{ id: 9001, type: 'boss', hp: 5e6, maxHp: 5e6, def: 0, arrived: true, arriveRemaining: 0, engaged: true, closeRemaining: 0, aliveSeconds: 5, atkCooldown: 1, hitCount: 0 }]; I.playerHp = 0; I.pending = null; });
  /* B: mid-boss-fight, fortress nearly dead, boss at the wall */
  await run('B mid-fight save:   ', () => { const I = game.state.idle; I.bossPhase = true; I.enemies = [{ id: 9002, type: 'boss', hp: 5e6, maxHp: 5e6, def: 0, arrived: true, arriveRemaining: 0, engaged: true, closeRemaining: 0, aliveSeconds: 5, atkCooldown: 0.2, hitCount: 0 }]; I.playerHp = 3; });
})();

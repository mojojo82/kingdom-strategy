const { chromium } = require('/home/claude/.npm-global/lib/node_modules/@playwright/mcp/node_modules/playwright');
const FILE = process.argv[2] || 'game.html';
(async () => {
  const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args: ['--no-sandbox'] });
  const ctx = await b.newContext({ viewport: { width: 430, height: 932 } });
  const p = await ctx.newPage(); const errs=[]; p.on('pageerror',e=>errs.push(e.message));
  await p.goto('file:///home/claude/'+FILE); await p.waitForTimeout(1500);
  await p.evaluate(()=>setScreen('conquest')); await p.waitForTimeout(3000);
  await p.evaluate(()=>{ setScreen('world'); persist(); });
  await p.reload(); await p.waitForTimeout(1500);
  const s0 = await p.evaluate(()=>({ screen: appScreen, opened: game.state.conquestOpened, killed: game.state.idle.enemiesKilledInLevel, enemies: game.state.idle.enemies.length }));
  await p.evaluate(()=>{ if (appScreen==='conquest') setScreen('world'); });
  await p.waitForTimeout(6000);
  const s1 = await p.evaluate(()=>({ screen: appScreen, opened: game.state.conquestOpened, killed: game.state.idle.enemiesKilledInLevel, enemies: game.state.idle.enemies.length }));
  await p.evaluate(()=>setScreen('conquest')); await p.waitForTimeout(4000);
  const s2 = await p.evaluate(()=>({ screen: appScreen, opened: game.state.conquestOpened, killed: game.state.idle.enemiesKilledInLevel, enemies: game.state.idle.enemies.length }));
  // reload again from a save made while on world -> still deferred?
  await p.evaluate(()=>{ setScreen('world'); persist(); }); await p.reload(); await p.waitForTimeout(4000);
  const s3 = await p.evaluate(()=>({ screen: appScreen, opened: game.state.conquestOpened, killed: game.state.idle.enemiesKilledInLevel }));
  console.log(FILE, JSON.stringify({s0,s1,s2,s3}), errs.slice(0,2)); await b.close();
})();

const { chromium } = require('/home/claude/.npm-global/lib/node_modules/@playwright/mcp/node_modules/playwright');
(async () => {
  const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args: ['--no-sandbox'] });
  const p = await b.newPage({ viewport: { width: 430, height: 932 } });
  await p.goto('file:///home/claude/game.html'); await p.waitForTimeout(1500);
  await p.evaluate(()=>setScreen('conquest')); await p.waitForTimeout(3000);
  await p.evaluate(()=>{ game.state.idle.playerHp = 0; }); await p.waitForTimeout(6000);
  console.log(await p.evaluate(()=>({ overlay: document.getElementById('idleResult').className, pending: game.state.idle.pending && game.state.idle.pending.type })));
  await p.click('#idleResult .ir-ok'); await p.waitForTimeout(1500);
  console.log(await p.evaluate(()=>({ overlay: document.getElementById('idleResult').style.display, pending: game.state.idle.pending, hp: game.state.idle.playerHp })));
  await b.close();
})();

const { chromium } = require('/home/claude/.npm-global/lib/node_modules/@playwright/mcp/node_modules/playwright');
(async () => {
  const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args: ['--no-sandbox'] });
  for (const f of ['game_v841.html','game.html']) {
    const p = await b.newPage({ viewport: { width: 420, height: 800 } }); const errs=[]; p.on('pageerror',e=>errs.push(e.message));
    await p.goto('file:///home/claude/'+f); await p.waitForTimeout(2000);
    await p.evaluate(()=>{ const s=game.state; s.heroes.gareth.owned=true; s.conquestRoster=['gareth']; setScreen('conquest'); });
    await p.waitForTimeout(45000);
    console.log(f, JSON.stringify(await p.evaluate(()=>({hits:game.state.idle.attackHitCounts.gareth, defeated:game.state.idle.defeated}))), errs);
    await p.close();
  }
  await b.close();
})();

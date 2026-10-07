const { chromium } = require('/home/claude/.npm-global/lib/node_modules/@playwright/mcp/node_modules/playwright');
(async () => {
  const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args: ['--no-sandbox'] });
  const p = await b.newPage({ viewport: { width: 420, height: 800 } }); const errs=[]; p.on('pageerror',e=>errs.push(e.message));
  await p.goto('file:///home/claude/game.html'); await p.waitForTimeout(2000);
  console.log(await p.evaluate(()=>{ const s=game.state; return {roster:s.conquestRoster, gareth:s.heroes.gareth&&s.heroes.gareth.owned, auto:s.idle.skillAuto, opened:s.conquestOpened}; }));
  await p.evaluate(()=>{ const s=game.state; s.heroes.gareth.owned=true; if(!s.conquestRoster.includes('gareth')) s.conquestRoster.unshift('gareth'); setScreen('conquest'); });
  for(let i=0;i<6;i++){ await p.waitForTimeout(15000); console.log(i*15+15, JSON.stringify(await p.evaluate(()=>({f:game.state.idle.skillFireCounts,l:game.state.idle.skillLandCounts, cd:game.state.heroCooldowns.gareth, en:game.state.idle.enemies.length})))); }
  console.log(errs); await b.close();
})();

const { chromium } = require('/home/claude/.npm-global/lib/node_modules/@playwright/mcp/node_modules/playwright');
(async () => {
  const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args: ['--no-sandbox'] });
  const p = await b.newPage({ viewport: { width: 420, height: 800 } }); const errs=[]; p.on('pageerror',e=>errs.push(e.message));
  await p.goto('file:///home/claude/game.html'); await p.waitForTimeout(2000);
  await p.evaluate(()=>{ const s=game.state; s.heroes.gareth.owned=true; if(!s.conquestRoster.includes('gareth')) s.conquestRoster.unshift('gareth'); setScreen('conquest');
    window.__iv=setInterval(()=>{ game.setIdleMeleeTargets({gareth:null}); },100); /* nobody ever at his sword */ });
  await p.waitForTimeout(75000);
  console.log(JSON.stringify(await p.evaluate(()=>({f:game.state.idle.skillFireCounts,l:game.state.idle.skillLandCounts}))), errs); await b.close();
})();

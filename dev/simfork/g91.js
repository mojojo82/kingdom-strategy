const { chromium } = require('/home/claude/.npm-global/lib/node_modules/@playwright/mcp/node_modules/playwright');
(async () => {
  const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args: ['--no-sandbox'] });
  const p = await b.newPage({ viewport: { width: 420, height: 800 } }); const errs=[]; p.on('pageerror',e=>errs.push(e.message));
  await p.goto('file:///home/claude/game.html'); await p.waitForTimeout(2000);
  await p.evaluate(()=>{ const s=game.state; ['roran','kessa','gareth','lyra'].forEach(k=>{ if(s.heroes[k]) s.heroes[k].owned=true; }); s.conquestRoster=['roran','kessa','gareth','lyra']; setScreen('conquest'); window.__F=[]; let last=0, seen=null;
    window.__iv=setInterval(()=>{ const n=game.state.idle.skillFireCounts.gareth||0; const m=heroChargeMem.c_gareth; if(m && m!==seen){ seen=m; const v=idleAnim.heroVis.gareth; window.__F.push({vx:Math.round(v.x), tgtDx:Math.round((idleAnim.skTgtX.gareth||0)-v.x), mode: m.left?'left':(m.through?'through-right':'lunge'), from:Math.round(m.fromX-v.x)}); } },30); });
  await p.waitForTimeout(90000);
  console.log(JSON.stringify(await p.evaluate(()=>({fires:game.state.idle.skillFireCounts.gareth, lands:game.state.idle.skillLandCounts.gareth, charges:window.__F})))); console.log(errs); await b.close();
})();

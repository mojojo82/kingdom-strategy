const { chromium } = require('/home/claude/.npm-global/lib/node_modules/@playwright/mcp/node_modules/playwright');
(async () => {
  const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args: ['--no-sandbox'] });
  const p = await b.newPage({ viewport: { width: 420, height: 800 } }); const errs=[]; p.on('pageerror',e=>errs.push(e.message));
  await p.goto('file:///home/claude/game.html'); await p.waitForTimeout(2000);
  await p.evaluate(()=>{ const s=game.state; ['roran','kessa','gareth','lyra'].forEach(k=>{ if(s.heroes[k]) s.heroes[k].owned=true; }); s.conquestRoster=['roran','kessa','gareth','lyra']; setScreen('conquest'); window.__L=[];
    window.__iv=setInterval(()=>{ window.__L.push([performance.now(), game.state.heroCooldowns.gareth, game.state.idle.enemies.filter(e=>e.hp>0).length, game.state.idle.skillFireCounts.gareth||0, game.state.idle.skillLandCounts.gareth||0]); },100); });
  await p.waitForTimeout(75000);
  console.log(JSON.stringify(await p.evaluate(()=>{ const L=window.__L; let st=null,w=[]; for(const x of L){ const stuck=x[1]<=0.01&&x[2]>0; if(stuck){ if(st==null) st=x[0]; } else if(st!=null){ w.push(Math.round(x[0]-st)); st=null; } } w.sort((a,b)=>b-a); const l=L[L.length-1]; return {fires:l[3], lands:l[4], worstReadyWithEnemyAliveMs:w.slice(0,5)}; }))); console.log(errs); await b.close();
})();

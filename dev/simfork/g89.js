const { chromium } = require('/home/claude/.npm-global/lib/node_modules/@playwright/mcp/node_modules/playwright');
(async () => {
  const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args: ['--no-sandbox'] });
  const p = await b.newPage({ viewport: { width: 420, height: 800 } }); const errs=[]; p.on('pageerror',e=>errs.push(e.message));
  await p.goto('file:///home/claude/game.html'); await p.waitForTimeout(2000);
  await p.evaluate(()=>{ const s=game.state; s.heroes.gareth.owned=true; if(!s.conquestRoster.includes('gareth')) s.conquestRoster=['roran','kessa','gareth','lyra']; else s.conquestRoster=['roran','kessa','gareth','lyra']; ['roran','kessa','lyra'].forEach(k=>{ if(s.heroes[k]) s.heroes[k].owned=true; }); setScreen('conquest'); window.__h=[]; let last=0; window.__iv=setInterval(()=>{ const n=game.state.idle.attackHitCounts.gareth||0; if(n>last){ last=n; const v=idleAnim.heroVis.gareth; const es=Object.values(idleAnim.enemyById).filter(e=>e.x>v.x-20).sort((a,b)=>a.x-b.x); window.__h.push({n, vx:Math.round(v.x), nearest:es[0]?Math.round(es[0].x):null, d:es[0]?Math.round(es[0].x-v.x):null, type:es[0]&&es[0].type, st:v.state||null}); } },40); });
  const c=await p.$('#idleCanvas'); let shots=0,last=0;
  for(let i=0;i<400 && shots<12;i++){ await p.waitForTimeout(100); const n=await p.evaluate(()=>window.__h.length); if(n>last){ last=n; await c.screenshot({path:`g86_${shots}.png`}); shots++; } }
  console.log(JSON.stringify(await p.evaluate(()=>window.__h.slice(0,40)))); console.log(errs); await b.close();
})();

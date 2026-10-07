const { chromium } = require('/home/claude/.npm-global/lib/node_modules/@playwright/mcp/node_modules/playwright');
(async () => {
  const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args: ['--no-sandbox'] });
  const p = await b.newPage({ viewport: { width: 420, height: 800 } }); const errs=[]; p.on('pageerror',e=>errs.push(e.message));
  await p.goto('file:///home/claude/game.html'); await p.waitForTimeout(2000);
  await p.evaluate(()=>{ const s=game.state; s.heroes.gareth.owned=true; if(!s.conquestRoster.includes('gareth')) s.conquestRoster.unshift('gareth'); setScreen('conquest'); window.__f=0; window.__xs=[]; window.__iv=setInterval(()=>{ const v=idleAnim.heroVis.gareth; window.__xs.push([Date.now()%100000, v&&Math.round(v.x), (game.state.idle.skillFireCounts.gareth||0), (game.state.idle.skillLandCounts.gareth||0), game.state.idle.enemies.map(e=>e.arrived?1:0).join('')]); },100); });
  let shots=0, last=0;
  for(let i=0;i<500 && shots<3;i++){ await p.waitForTimeout(200); const f=await p.evaluate(()=>game.state.idle.skillFireCounts.gareth||0); if(f>last){ last=f; await p.waitForTimeout(250); await (await p.$('#idleCanvas')).screenshot({path:`g83_${shots}.png`}); shots++; } }
  const xs=await p.evaluate(()=>window.__xs); const idx=xs.findIndex((r,i)=>i>0&&r[2]>xs[i-1][2]); console.log(JSON.stringify(xs.slice(Math.max(0,idx-6),idx+10))); console.log(errs); await b.close();
})();

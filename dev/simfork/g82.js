const { chromium } = require('/home/claude/.npm-global/lib/node_modules/@playwright/mcp/node_modules/playwright');
(async () => {
  const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args: ['--no-sandbox'] });
  const p = await b.newPage({ viewport: { width: 420, height: 800 } }); const errs=[]; p.on('pageerror',e=>errs.push(e.message));
  await p.goto('file:///home/claude/game.html'); await p.waitForTimeout(2000);
  await p.evaluate(()=>{ const s=game.state; s.heroes.gareth.owned=true; if(!s.conquestRoster.includes('gareth')) s.conquestRoster.unshift('gareth'); setScreen('conquest'); window.__log=[]; window.__iv=setInterval(()=>{ const s=game.state; window.__log.push({t:Date.now(), cd:s.heroCooldowns.gareth, en:s.idle.enemies.length, arr:s.idle.enemies.filter(e=>e.arrived).length, eng:s.idle.enemies.filter(e=>e.engaged).length, fire:(s.idle.skillFireCounts.gareth||0)}); },200); });
  await p.waitForTimeout(100000);
  const r=await p.evaluate(()=>{ const L=window.__log; let waiting=[],cur=0,t0=null; for(let i=0;i<L.length;i++){ const x=L[i]; const ready=x.cd<=0.01 && x.en>0; if(ready){ if(t0==null)t0=x.t; } else { if(t0!=null){ waiting.push(+((x.t-t0)/1000).toFixed(1)); t0=null; } } } return {samples:L.length, waits:waiting, fires:L[L.length-1].fire, sample:L.filter((x,i)=>x.cd<=0.01&&x.en>0).slice(0,6)}; });
  console.log(JSON.stringify(r)); console.log(errs); await b.close();
})();

const { chromium } = require('/home/claude/.npm-global/lib/node_modules/@playwright/mcp/node_modules/playwright');
(async () => {
  const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args: ['--no-sandbox'] });
  const p = await b.newPage({ viewport: { width: 420, height: 800 } }); const errs=[]; p.on('pageerror',e=>errs.push(e.message));
  await p.goto('file:///home/claude/game.html'); await p.waitForTimeout(2000);
  await p.evaluate(()=>{ const s=game.state; ['roran','kessa','gareth','lyra'].forEach(k=>{ if(s.heroes[k]) s.heroes[k].owned=true; }); s.conquestRoster=['roran','kessa','gareth','lyra']; setScreen('conquest'); window.__L=[];
    window.__iv=setInterval(()=>{ const v=idleAnim.heroVis.gareth; if(!v) return; const en=game.state.idle.enemies; let adj=0; en.forEach(e=>{ const ev=idleAnim.enemyById[e.id]; if(ev && Math.abs(ev.x-v.x)<=25) adj++; }); window.__L.push([performance.now(), game.state.heroCooldowns.gareth, adj, en.length, en.filter(e=>e.arrived).length, game.state.idle.skillFireCounts.gareth||0, game.state.idle.skillLandCounts.gareth||0, idleHeroIsKoSafe()]); },100);
    window.idleHeroIsKoSafe=()=>{ try { return game.idleHeroIsKo('gareth'); } catch(e){ return 'err'; } }; });
  await p.waitForTimeout(90000);
  const r=await p.evaluate(()=>{ const L=window.__L; let st=null, waits=[]; for(const x of L){ const stuck = x[1]<=0.01 && x[2]>0; if(stuck){ if(st==null) st=x; } else if(st){ waits.push({ms:Math.round(x[0]-st[0]), adj:st[2], en:st[3], arr:st[4], ko:st[7]}); st=null; } } waits.sort((a,b)=>b.ms-a.ms); const last=L[L.length-1]; return {fires:last[5], lands:last[6], worstReadyWithAdjacent:waits.slice(0,6), cdSample:L.filter((x,i)=>i%50==0).map(x=>[+x[1].toFixed?x[1]:x[1],x[2],x[4]])}; });
  console.log(JSON.stringify(r)); console.log(errs); await b.close();
})();

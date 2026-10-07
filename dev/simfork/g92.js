const { chromium } = require('/home/claude/.npm-global/lib/node_modules/@playwright/mcp/node_modules/playwright');
(async () => {
  const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args: ['--no-sandbox'] });
  const p = await b.newPage({ viewport: { width: 420, height: 800 } }); const errs=[]; p.on('pageerror',e=>errs.push(e.message));
  await p.goto('file:///home/claude/game.html'); await p.waitForTimeout(2000);
  await p.evaluate(()=>{ const s=game.state; ['roran','kessa','gareth','lyra'].forEach(k=>{ if(s.heroes[k]) s.heroes[k].owned=true; }); s.conquestRoster=['roran','kessa','gareth','lyra']; setScreen('conquest'); window.__L=[];
    const cv=document.getElementById('idleCanvas');
    window.__iv=setInterval(()=>{ const W=cv.clientWidth||420; const en=game.state.idle.enemies; const vis=en.map(e=>{ const v=idleAnim.enemyById[e.id]; return {id:e.id, x:v?Math.round(v.x):null, arr:!!e.arrived, ar:+(e.arriveRemaining||0).toFixed(2), hp:Math.round(e.hp)}; }); window.__L.push({t:Math.round(performance.now()), cd:game.state.heroCooldowns.gareth, f:game.state.idle.skillFireCounts.gareth||0, gx:Math.round(idleAnim.heroVis.gareth?idleAnim.heroVis.gareth.x:0), W, en:vis}); },100); });
  await p.waitForTimeout(90000);
  const r=await p.evaluate(()=>{ const L=window.__L; const W=L[0].W; let st=null, out=[]; for(const x of L){ const onCanvas=x.en.filter(e=>e.x!=null&&e.x<=W-2); const stuck=x.cd<=0.01 && onCanvas.length>0; if(stuck){ if(!st) st=x; } else if(st){ out.push({ms:x.t-st.t, at:st}); st=null; } } out.sort((a,b)=>b.ms-a.ms); return {W, fires:L[L.length-1].f, worst:out.slice(0,3).map(o=>({ms:o.ms, gx:o.at.gx, en:o.at.en}))}; });
  console.log(JSON.stringify(r,null,0)); console.log(errs); await b.close();
})();

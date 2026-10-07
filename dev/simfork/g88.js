const { chromium } = require('/home/claude/.npm-global/lib/node_modules/@playwright/mcp/node_modules/playwright');
(async () => {
  const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args: ['--no-sandbox'] });
  for (const f of (process.argv[2]||'game_v841.html,game.html').split(',')) {
    const p = await b.newPage({ viewport: { width: 420, height: 800 } }); const errs=[]; p.on('pageerror',e=>errs.push(e.message));
    await p.goto('file:///home/claude/'+f); await p.waitForTimeout(2000);
    await p.evaluate(()=>{ const s=game.state; ['roran','kessa','gareth','lyra'].forEach(k=>{ if(s.heroes[k]) s.heroes[k].owned=true; }); s.conquestRoster=['roran','kessa','gareth','lyra']; setScreen('conquest'); window.__L=[];
      window.__iv=setInterval(()=>{ const v=idleAnim.heroVis.gareth; if(!v) return; let best=null; Object.values(idleAnim.enemyById).forEach(e=>{ const d=e.x-v.x; if(Math.abs(d)<=60 && (best==null||Math.abs(d)<Math.abs(best.d))) best={d:Math.round(d),t:e.type}; }); window.__L.push([performance.now(), best?best.d:null, best?best.t:null, game.state.idle.attackHitCounts.gareth||0, game.heroAttackSec?game.heroAttackSec('gareth'):null]); },50); });
    await p.waitForTimeout(60000);
    const r=await p.evaluate(()=>{ const L=window.__L; const out=[]; let s=null,hitsAt=null; for(const x of L){ const adj=x[1]!=null && Math.abs(x[1])<=24; if(adj){ if(s==null){ s=x[0]; hitsAt=x[3]; } else if(x[3]>hitsAt){ s=x[0]; hitsAt=x[3]; } else if(x[0]-s>1200 && !out.find(o=>o.start===Math.round(s))) out.push({start:Math.round(s), d:x[1], type:x[2]}); } else s=null; } 
      // longest adjacent-without-hit stretches
      let longest=[],cur=null; for(const x of L){ const adj=x[1]!=null&&Math.abs(x[1])<=24; if(adj){ if(!cur||x[3]>cur.h){ if(cur) longest.push(cur.len); cur={s:x[0],h:x[3],len:0}; } cur.len=x[0]-cur.s; } else { if(cur) longest.push(cur.len); cur=null; } }
      longest.sort((a,b)=>b-a); return {atkSec:L[L.length-1][4], hits:L[L.length-1][3], worstGapsMs:longest.slice(0,6).map(Math.round), behindSamples:L.filter(x=>x[1]!=null&&x[1]< -8&&x[1]>=-24).length, total:L.length}; });
    console.log(f, JSON.stringify(r), errs); await p.close();
  }
  await b.close();
})();

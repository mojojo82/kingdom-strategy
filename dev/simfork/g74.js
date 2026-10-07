const { chromium } = require('/home/claude/.npm-global/lib/node_modules/@playwright/mcp/node_modules/playwright');
(async () => {
  const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args: ['--no-sandbox'] });
  const p = await b.newPage({ viewport: { width: 420, height: 800 } });
  const errs=[]; p.on('pageerror',e=>errs.push(e.message));
  await p.goto('file:///home/claude/game.html'); await p.waitForTimeout(2500);
  const r = await p.evaluate(async () => {
    const st=game.state; const home=tileXY(st.homeTileId);
    const t=st.map.filter(x=>x.type==='resource'||x.type==='npc').sort((a,b)=>Math.hypot(a.x-home[0],a.y-home[1])-Math.hypot(b.x-home[0],b.y-home[1]))[0];
    const k=Object.keys(TROOP_DEFS)[0]; st.troops[k]=100; const before=st.troops[k];
    const res=game.sendMarch({[k]:50},t.id,t.type==='npc'?'attack':'gather',[]);
    if(!res.ok) return {fail:res.reason,home:st.homeTileId}; const m=st.marches[0]; const out={sent:!!res.ok, reason:res.reason, travel:m&&m.travelSec};
    // pretend we were offline: shift the whole schedule 3 hours into the past, with the leg to target done long ago
    const T=Date.now(); m.arriveAt=T-3*3600e3; 
    game.tick(); out.s1=m.status; processMarchResolutions(); await new Promise(r=>setTimeout(r,1500));
    out.s2=m.status; out.actionEnd=m.actionEnd-m.arriveAt; game.tick(); out.s3=st.marches.length?st.marches[0].status:'home'; out.troopsBack=st.troops[k]-before+50; out.marchesLeft=st.marches.length;
    return out;
  });
  console.log(JSON.stringify(r)); console.log(errs); await b.close();
})();

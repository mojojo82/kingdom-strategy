const { chromium } = require('/home/claude/.npm-global/lib/node_modules/@playwright/mcp/node_modules/playwright');
const fs=require('fs'); const MOCK=fs.readFileSync('/home/claude/tests/mockdb.js','utf8'); const store={};
(async () => {
  const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args: ['--no-sandbox'] });
  const ctx=await b.newContext({ viewport:{width:430,height:932} }); await ctx.exposeFunction('__store',(op,k,v)=>{ if(op==='set') store[k]=JSON.parse(v); else if(op==='del') delete store[k]; return JSON.stringify(store); });
  await ctx.addInitScript(`localStorage.setItem('kingdom_prototype_playerid_v1','pS');`+MOCK);
  const p=await ctx.newPage(); const errs=[]; p.on('pageerror',e=>errs.push(e.message)); await p.goto('file:///home/claude/game.html'); await p.waitForTimeout(4000);
  const SECS=+process.argv[2]||120;
  await p.evaluate((a)=>{ window.__CH=a[0]; window.__HP0=a[1]; }, [+process.argv[3]||0, process.argv[4]==='hp0']); const r=await p.evaluate(async(SECS)=>{
    try{ setScreen('conquest'); }catch(e){ try{ setScreen('idle'); }catch(e2){} }
    const st=game.state.idle; if(window.__CH){ st.chapter=window.__CH; st.levelNum=1; st.enemies=[]; st.bossPhase=false; st.enemiesKilledInLevel=0; } const start=Date.now(), clears=[]; let lastLabel=st.lastLevelClearLabel, lastAt=null;
    const h=setInterval(()=>{ (st.enemies||[]).forEach(e=>{ if(e.hp>(window.__HP0?0:1)) e.hp=(window.__HP0?0:1); if(e.atk) e.atk=0; }); if(typeof st.playerHp==='number' && st.playerHp<1e6) st.playerHp=1e6; window.__seen=window.__seen||{}; if(st.pending) window.__seen[st.pending.type]=(window.__seen[st.pending.type]||0)+1; if(st.pending&&st.pending.type==='victory'){ st.pending=null; } if(st.pending&&st.pending.type==='defeat'){ try{ game.idleResolveResult&&game.idleResolveResult(); }catch(e){} st.pending=null; }
      if(st.lastLevelClearLabel!==lastLabel){ lastLabel=st.lastLevelClearLabel; clears.push([lastLabel, Date.now()-start]); } }, 25);
    await new Promise(r=>setTimeout(r,SECS*1000)); clearInterval(h);
    const gaps=clears.map((c,i)=> i? c[1]-clears[i-1][1] : null).filter(x=>x!=null);
    return { clears: clears.length, labels: clears.map(c=>c[0]).slice(0,40).join(' '), gapsSec: gaps.map(g=>(g/1000).toFixed(1)).join(' '), minGap: gaps.length? Math.min(...gaps)/1000:null, avgGap: gaps.length? gaps.reduce((a,b)=>a+b,0)/gaps.length/1000:null, hidden: document.hidden, seen: JSON.stringify(window.__seen), killed: st.defeated, lvl: st.chapter+'-'+st.levelNum, boss: st.bossPhase, enemiesNow: (st.enemies||[]).length, screen: document.body.dataset.screen };
  }, SECS);
  console.log(JSON.stringify(r,null,1)); console.log(errs.slice(0,5)); await b.close();
})();

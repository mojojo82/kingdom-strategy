const { chromium } = require('/home/claude/.npm-global/lib/node_modules/@playwright/mcp/node_modules/playwright');
(async () => {
  const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args: ['--no-sandbox'] });
  const maps={};
  for (const f of ['game_v845.html','game.html']) {
    const p = await b.newPage(); const errs=[]; p.on('pageerror',e=>errs.push(e.message));
    await p.goto('file:///home/claude/'+f); await p.waitForTimeout(2500);
    maps[f]=await p.evaluate(()=>game.state.map.map(t=>[t.id,t.type,t.resourceType||'',t.amountLeft||0,t.garrison?1:0]));
    console.log(f, errs.length?errs:'ok'); await p.close();
  }
  const a=maps['game_v845.html'], c=maps['game.html']; let campToEmpty=0, resSame=0, resDiff=0, other=0, guardedBefore=0, guardedAfter=0;
  for(let i=0;i<a.length;i++){ const x=a[i], y=c[i]; if(x[4]&&x[1]==='resource') guardedBefore++; if(y[4]) guardedAfter++;
    if(x[1]==='npc'){ if(y[1]==='empty') campToEmpty++; else other++; }
    else if(x[1]==='resource'){ if(y[1]==='resource'&&x[2]===y[2]&&x[3]===y[3]&&x[0]===y[0]) resSame++; else resDiff++; }
    else if(x[1]!==y[1]) other++; }
  console.log({tiles:a.length, campToEmpty, resSame, resDiff, other, guardedNodesBefore:guardedBefore, guardedAfter, npcLeft:c.filter(t=>t[1]==='npc').length});
  await b.close();
})();

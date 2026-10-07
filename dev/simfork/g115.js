const { chromium } = require('/home/claude/.npm-global/lib/node_modules/@playwright/mcp/node_modules/playwright');
(async () => {
  const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args: ['--no-sandbox'] });
  const p = await b.newPage({ viewport: { width: 430, height: 932 } });
  await p.goto('file:///home/claude/game.html'); await p.waitForTimeout(2000);
  await p.evaluate(async()=>{ setScreen('world'); if (!mapIso) document.getElementById('devMapIsoBtn').click(); await new Promise(r=>setTimeout(r,300)); setMapZoom(1); const vp=document.getElementById('mapviewport'); const c=tileCenterPx({x:400,y:400}); vp.scrollLeft=c.x-200; vp.scrollTop=c.y-300; renderVisibleTiles(); });
  const cdp = await p.context().newCDPSession(p); await cdp.send('Profiler.enable'); await cdp.send('Profiler.setSamplingInterval',{interval:100}); await cdp.send('Profiler.start');
  await p.evaluate(()=>{ const vp=document.getElementById('mapviewport'); for(let i=0;i<300;i++){ vp.scrollLeft+=9; vp.scrollTop+=5; renderVisibleTiles(); } });
  const { profile } = await cdp.send('Profiler.stop');
  const self={}; const byId={}; profile.nodes.forEach(n=>byId[n.id]=n);
  const dt=profile.timeDeltas; const counts={}; profile.samples.forEach((id,i)=>{ counts[id]=(counts[id]||0)+(dt[i]||0); });
  for (const id in counts){ const n=byId[id]; const k=n.callFrame.functionName+':'+n.callFrame.lineNumber; self[k]=(self[k]||0)+counts[id]; }
  const tot=Object.values(self).reduce((a,b)=>a+b,0);
  console.log(Object.entries(self).sort((a,b)=>b[1]-a[1]).slice(0,14).map(([k,v])=>k+' '+(100*v/tot).toFixed(1)+'%').join('\n'));
  await b.close();
})();

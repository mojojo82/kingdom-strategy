const { chromium } = require('/home/claude/.npm-global/lib/node_modules/@playwright/mcp/node_modules/playwright');
(async () => {
  const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args: ['--no-sandbox'] });
  const maps={};
  for (const f of ['game_v863.html','game.html']) {
    const p = await b.newPage(); const errs=[]; p.on('pageerror',e=>errs.push(e.message));
    await p.goto('file:///home/claude/'+f); await p.waitForTimeout(2500);
    maps[f]=await p.evaluate(()=>{ const out=[]; const n=Math.round(Math.sqrt(game.state.map.length)); for(let y=0;y<n;y++) for(let x=0;x<n;x++){ const t=mapTileAt(game.state.map,x,y); out.push([t.id,t.type,t.resourceType||'',t.amountLeft||0,t.garrison?1:0,t.x,t.y].join('|')); } return {out, chunks: game.state.map.isWorld? game.state.map.count : 'array'}; });
    // second server seed too
    maps[f+'2']=await p.evaluate(()=>{ const m=buildMap(200, seedForServer('server7'), 20); const out=[]; for(let y=0;y<200;y++) for(let x=0;x<200;x++){ const t=(m.isWorld?m.tileAt(x,y):m[y*200+x]); out.push([t.id,t.type,t.resourceType||'',t.amountLeft||0].join('|')); } return {out}; });
    console.log(f, 'chunks held', maps[f].chunks, errs); await p.close();
  }
  const A=maps['game_v863.html'].out, B=maps['game.html'].out; let diff=0; for(let i=0;i<A.length;i++) if(A[i]!==B[i]) diff++;
  const A2=maps['game_v863.html2'].out, B2=maps['game.html2'].out; let diff2=0; for(let i=0;i<A2.length;i++) if(A2[i]!==B2[i]) diff2++;
  console.log({tiles:A.length, differences:diff, otherServerDifferences:diff2, resources:B.filter(r=>r.split('|')[1]==='resource').length});
  await b.close();
})();

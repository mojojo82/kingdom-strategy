const { chromium } = require('/home/claude/.npm-global/lib/node_modules/@playwright/mcp/node_modules/playwright');
const FILE=process.argv[2]||'game.html';
(async () => {
  const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args: ['--no-sandbox'] });
  const p = await (await b.newContext({ viewport: { width: 390, height: 844 }, hasTouch:true })).newPage();
  await p.goto('file:///home/claude/'+FILE); await p.waitForTimeout(1500);
  const centre = ()=>p.evaluate(()=>{ const vp=document.getElementById('mapviewport'), x=vp.scrollLeft+vp.clientWidth/2, y=vp.scrollTop+vp.clientHeight/2; let t; if (mapIso){ const g=isoGeom(), a=(x-g.offX)/g.r2, b=(y-g.offY)/(g.r2*ISO_K); t=[Math.round((a+b)/2),Math.round((b-a)/2)]; } else { const P=tilePxZ()+gapPxZ(); t=[Math.floor((x-padPxZ())/P),Math.floor((y-padPxZ())/P)]; } return t.join(',')+' home '+game.state.homeTileId; });
  await p.evaluate(()=>setScreen('world')); await p.waitForTimeout(300);
  console.log(FILE,'start', await centre());
  // simulate the cloud save arriving with a different home
  await p.evaluate(()=>{ game.state.homeTileId='300,400'; render(); }); await p.waitForTimeout(300);
  console.log(FILE,'after cloud home change', await centre());
  // simulate synced iso setting arriving
  await p.evaluate(()=>{ const btn=document.getElementById('devMapIsoBtn'); }); 
  // user drags, then another home change -> should NOT jump
  await p.touchscreen.tap(200,400); await p.evaluate(()=>{ const vp=document.getElementById('mapviewport'); vp.scrollLeft+=500; }); await p.waitForTimeout(200);
  const moved=await centre();
  await p.evaluate(()=>{ game.state.homeTileId='500,500'; render(); }); await p.waitForTimeout(300);
  console.log(FILE,'after user moved', moved, '-> after another home change', await centre());
  await b.close();
})();

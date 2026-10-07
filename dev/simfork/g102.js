const { chromium } = require('/home/claude/.npm-global/lib/node_modules/@playwright/mcp/node_modules/playwright');
(async () => {
  const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args: ['--no-sandbox','--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader','--ignore-gpu-blocklist'] });
  const p = await b.newPage({ viewport: { width: 420, height: 800 } }); const errs=[]; p.on('pageerror',e=>errs.push(e.message));
  await p.goto('file:///home/claude/game.html'); await p.waitForTimeout(2000);
  async function setup(){ await p.evaluate(()=>{ const s=game.state; s.troops.infantry=200; s.marches=[]; setScreen('world'); const ht=s.map.find(x=>x.type==='empty'&&x.x>=8&&x.x<=12&&x.y>=8&&x.y<=12); s.homeTileId=ht.id; const home=tileXY(s.homeTileId);
    const res=s.map.filter(x=>x.type==='resource').map(t=>({t,d:Math.hypot(t.x-home[0],t.y-home[1])})).filter(o=>o.d>3&&o.d<7).map(o=>o.t);
    game.sendMarch({infantry:20},res[0].id,'gather',[]); const m2=game.sendMarch({infantry:20},res[res.length-1].id,'gather',[]).march; m2.status='returning'; m2.returnAt=Date.now()+m2.travelSec*600; m2.actionEnd=Date.now()-1000;
    centerMapOnHome(); renderVisibleTiles(); }); await p.waitForTimeout(1200); }
  await setup(); await p.screenshot({path:'g102_flat.png'});
  await p.evaluate(()=>{ document.getElementById('devMapIsoBtn').click(); }); await p.waitForTimeout(400); await setup(); await p.screenshot({path:'g102_iso.png'});
  console.log(await p.evaluate(()=>Object.keys(marchPathEls).map(k=>marchPathEls[k].className+' w='+marchPathEls[k].style.width)), errs); await b.close();
})();

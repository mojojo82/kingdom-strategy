const { chromium } = require('/home/claude/.npm-global/lib/node_modules/@playwright/mcp/node_modules/playwright');
(async () => {
  const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args: ['--no-sandbox','--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader','--ignore-gpu-blocklist'] });
  const p = await b.newPage({ viewport: { width: 420, height: 800 } });
  const errs=[]; p.on('pageerror',e=>errs.push(e.message));
  await p.goto('file:///home/claude/game.html'); await p.waitForTimeout(2000);
  await p.evaluate(() => setScreen('world')); await p.waitForTimeout(600);
  await p.evaluate(() => { document.getElementById('devMapIsoBtn').click(); document.getElementById('devMarch3dBtn').click(); }); await p.waitForTimeout(400);
  await p.evaluate(() => { PLAYER_ID='A'; const st=game.state; const home=tileXY(st.homeTileId); const T=Date.now();
    const tg=st.map.find(t=>t.x===home[0]-6&&t.y===home[1]-6); const hm=st.map.find(t=>t.x===home[0]-2&&t.y===home[1]-1);
    worldMarches['B_1']={ownerId:'B',mid:1,tileId:tg.id,homeTileId:hm.id,action:'gather',travelSec:600,arriveAt:T+300000,actionEnd:T+305000,returnAt:T+905000,army:{},heroKeys:[],resolved:false};
    const vp=document.getElementById('mapviewport'); const c=tileCenterPx({x:home[0]-4,y:home[1]-3}); vp.scrollLeft=c.x-vp.clientWidth/2; vp.scrollTop=c.y-vp.clientHeight/2; renderVisibleTiles(); });
  await p.waitForTimeout(1500); await p.screenshot({path:'g76.png'});
  console.log(await p.evaluate(()=>Object.keys(marchMarkerEls)), errs); await b.close();
})();

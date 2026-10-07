const { chromium } = require('/home/claude/.npm-global/lib/node_modules/@playwright/mcp/node_modules/playwright');
const fs=require('fs');
const OUT='/tmp/claude-0/-home-claude/ea8aa5cd-2a55-5679-b734-73d165c6f3b7/scratchpad/prov/';
const uri='data:image/webp;base64,'+fs.readFileSync('/home/claude/assets/forest3.webp').toString('base64');
(async () => {
  const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args: ['--no-sandbox'] });
  const p = await b.newPage({ viewport: { width: 430, height: 932 }, deviceScaleFactor: 2 });
  await p.goto('file:///home/claude/game.html'); await p.waitForTimeout(1500);
  for (const z of [1, 0.55]) {
    await p.evaluate(async({uri,z})=>{ setScreen('world'); if(!mapIso) document.getElementById('devMapIsoBtn').click(); await new Promise(r=>setTimeout(r,200));
      DECOR_SPRITES.forest9={name:'Forest',size:'9x9',foot:3,fx:0.4997,fy:0.5083,fw:0.9967,aspect:0.5834,src:uri};
      const h=tileXY(game.state.homeTileId); const F=[h[0]+5,h[1]+1]; mapDecor={}; mapDecor[F[0]+'_'+F[1]]={s:'forest9',x:F[0],y:F[1]};
      setMapZoom(z); const vp=document.getElementById('mapviewport'); const c=tileCenterPx({x:h[0]+5,y:h[1]+1}); vp.scrollLeft=c.x-vp.clientWidth/2; vp.scrollTop=c.y-vp.clientHeight/2; renderVisibleTiles(); await new Promise(r=>setTimeout(r,600));
      document.querySelectorAll('#mapOverlayCtl,#fpsCounter,#fleetHud').forEach(e=>e.style.visibility='hidden'); }, {uri,z});
    await p.screenshot({ path: OUT+'forest3b_mock_'+z+'.png', clip:{x:0,y:140,width:430,height:600} });
  }
  await b.close();
})();

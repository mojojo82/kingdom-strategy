const { chromium } = require('/home/claude/.npm-global/lib/node_modules/@playwright/mcp/node_modules/playwright');
const OUT='/tmp/claude-0/-home-claude/ea8aa5cd-2a55-5679-b734-73d165c6f3b7/scratchpad/prov/';
(async () => {
  const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args: ['--no-sandbox'] });
  const p = await b.newPage({ viewport: { width: 430, height: 932 }, deviceScaleFactor: 3 });
  await p.goto('file:///home/claude/game.html'); await p.waitForTimeout(1500);
  for (const sh of [false,true]) {
    await p.evaluate(async(sh)=>{ setScreen('world'); if(!mapIso) document.getElementById('devMapIsoBtn').click(); await new Promise(r=>setTimeout(r,200));
      terrainEnsure(); const h=tileXY(game.state.homeTileId); const ox=h[0]+4, oy=h[1]-2;
      for(let y=0;y<8;y++) for(let x=0;x<8;x++){ terrainArr[(oy+y)*terrainN+ox+x]=1; terrainMarkDirty(ox+x,oy+y);} terrainClearAll();
      mapDecor={}; const ks=['sc_pine_tall','sc_pine_small','sc_rock_big','sc_rock_mid','sc_stump','sc_juniper','sc_fern','sc_heather','sc_log','sc_flowers','obelisk_1x1','spire_1x1'];
      ks.forEach((k,i)=>{ const x=ox+2+(i%4), y=oy+2+Math.floor(i/4); mapDecor[x+'_'+y]={s:k,x,y}; });
      setMapZoom(2); const vp=document.getElementById('mapviewport'); const c=tileCenterPx({x:ox+3.5,y:oy+3}); vp.scrollLeft=c.x-vp.clientWidth/2; vp.scrollTop=c.y-vp.clientHeight/2; renderVisibleTiles(); await new Promise(r=>setTimeout(r,800));
      document.querySelectorAll('.map-decor').forEach(e=>e.style.filter= sh ? 'drop-shadow(0 2px 4px rgba(0,0,0,.45))' : '');
      document.querySelectorAll('#mapOverlayCtl,#fpsCounter,#fleetHud').forEach(e=>e.style.visibility='hidden'); }, sh);
    await p.waitForTimeout(300);
    await p.screenshot({ path: OUT+'shadow_'+(sh?'on':'off')+'.png', clip:{x:15,y:250,width:400,height:420} });
  }
  await b.close();
})();

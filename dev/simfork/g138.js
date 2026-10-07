const { chromium } = require('/home/claude/.npm-global/lib/node_modules/@playwright/mcp/node_modules/playwright');
const OUT='/tmp/claude-0/-home-claude/ea8aa5cd-2a55-5679-b734-73d165c6f3b7/scratchpad/prov/';
(async () => {
  const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args: ['--no-sandbox'] });
  const p = await b.newPage({ viewport: { width: 430, height: 932 }, deviceScaleFactor: 3 });
  await p.goto('file:///home/claude/game.html'); await p.waitForTimeout(1500);
  const home = await p.evaluate(()=>game.state.homeTileId);
  for (const [px,z,name] of [[20,1,'base_z1'],[64,1,'hires_z1'],[20,2.2,'base_z2'],[64,2.2,'hires_z2']]) {
    await p.evaluate(async({px,z})=>{ setScreen('world'); if(!mapIso) document.getElementById('devMapIsoBtn').click(); await new Promise(r=>setTimeout(r,200));
      terrainEnsure(); const h=tileXY(game.state.homeTileId); const ox=h[0]-6, oy=h[1]-6;
      for(let y=0;y<16;y++) for(let x=0;x<16;x++){ const dx=x-8, dy=y-8; if(dx*dx+dy*dy<64+((x*7+y*3)%9)) { terrainArr[(oy+y)*terrainN+ox+x]=1; terrainMarkDirty(ox+x,oy+y);} }
      for(let y=9;y<13;y++) for(let x=9;x<14;x++){ terrainArr[(oy+y)*terrainN+ox+x]=3; terrainMarkDirty(ox+x,oy+y);}
      TERRAIN_PX=px; terrainClearAll(); setMapZoom(z); const vp=document.getElementById('mapviewport'); const c=tileCenterPx({x:ox+5,y:oy+9}); vp.scrollLeft=c.x-vp.clientWidth/2; vp.scrollTop=c.y-vp.clientHeight/2; renderVisibleTiles(); await new Promise(r=>setTimeout(r,800));
      document.querySelectorAll('#mapOverlayCtl,#fpsCounter,#fleetHud').forEach(e=>e.style.visibility='hidden'); }, {px,z});
    await p.screenshot({ path: OUT+'gr_'+name+'.png', clip:{x:15,y:300,width:400,height:300} });
  }
  await b.close();
})();

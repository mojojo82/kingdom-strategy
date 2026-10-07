const { chromium } = require('/home/claude/.npm-global/lib/node_modules/@playwright/mcp/node_modules/playwright');
const fs=require('fs');
const OUT='/tmp/claude-0/-home-claude/ea8aa5cd-2a55-5679-b734-73d165c6f3b7/scratchpad/prov/';
const H=JSON.parse(fs.readFileSync('/home/claude/assets/hills2_fix.json')); const M=JSON.parse(fs.readFileSync('/home/claude/assets/mtn_fix.json'));
(async () => {
  const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args: ['--no-sandbox'] });
  const p = await b.newPage({ viewport: { width: 430, height: 932 }, deviceScaleFactor: 2 });
  await p.goto('file:///home/claude/game.html'); await p.waitForTimeout(1500);
  for (const z of [0.9,0.5]) {
  await p.evaluate(async({M,H,z})=>{ 
    setScreen('world'); if(!mapIso) document.getElementById('devMapIsoBtn').click(); await new Promise(r=>setTimeout(r,200));
    terrainEnsure(); const h=tileXY(game.state.homeTileId); const ox=h[0]+3, oy=h[1]-6;
    for(let y=0;y<22;y++) for(let x=0;x<22;x++){ const dx=x-11,dy=y-11; if(dx*dx+dy*dy<110+((x*7+y*5)%13)){ terrainArr[(oy+y)*terrainN+ox+x]=1; terrainMarkDirty(ox+x,oy+y);} } terrainClearAll();
    mapDecor={}; const put=(k,x,y)=>{ mapDecor[(ox+x)+'_'+(oy+y)]={s:k,x:ox+x,y:oy+y}; };
    // a range running diagonally: foothill, peak, snowy, ridge, peak2, foothill
    put('mtn_foot1',4,6); put('mtn_mid1',6,7); put('mtn_ridge',9,8); put('mtn_peak',11,6); put('mtn_mid2',13,9); put('mtn_foot2',15,8); put('mtn_foot1',8,11);
    put('hill_2x2',5,14); put('crag_2x2',15,13); put('sc_pine_tall',10,13); put('sc_pine_small',11,14); put('sc_rock_big',7,13); put('sc_pine_tall',17,11);
    setMapZoom(z); const vp=document.getElementById('mapviewport'); const c=tileCenterPx({x:ox+10,y:oy+9}); vp.scrollLeft=c.x-vp.clientWidth/2; vp.scrollTop=c.y-vp.clientHeight/2; renderVisibleTiles(); await new Promise(r=>setTimeout(r,900));
    document.querySelectorAll('#mapOverlayCtl,#fpsCounter,#fleetHud,#mapProvinces').forEach(e=>e.style.visibility='hidden'); }, {M,H,z});
  await p.screenshot({ path: OUT+'mtn3_mock_'+z+'.png', clip:{x:0,y:130,width:430,height:640} });
  }
  await b.close();
})();

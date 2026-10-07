const { chromium } = require('/home/claude/.npm-global/lib/node_modules/@playwright/mcp/node_modules/playwright');
const OUT='/tmp/claude-0/-home-claude/ea8aa5cd-2a55-5679-b734-73d165c6f3b7/scratchpad/prov/';
(async () => {
  const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args: ['--no-sandbox'] });
  const p = await b.newPage({ viewport: { width: 430, height: 932 }, deviceScaleFactor: 2 }); const errs=[]; p.on('pageerror',e=>errs.push(e.message));
  await p.goto('file:///home/claude/game.html'); await p.waitForTimeout(1500);
  const r=await p.evaluate(async()=>{ setScreen('world'); if(!mapIso) document.getElementById('devMapIsoBtn').click(); await new Promise(r=>setTimeout(r,200));
    terrainEnsure(); const h=tileXY(game.state.homeTileId); const ox=h[0]+4, oy=h[1]-2;
    for(let y=0;y<12;y++) for(let x=0;x<12;x++){ terrainArr[(oy+y)*terrainN+ox+x]=1; terrainMarkDirty(ox+x,oy+y);} 
    for(let y=7;y<10;y++) for(let x=7;x<11;x++){ terrainArr[(oy+y)*terrainN+ox+x]=3; }
    mapDecor={}; const keys=Object.keys(DECOR_SPRITES).filter(k=>k.startsWith('sc_'));
    keys.forEach((k,i)=>{ const x=ox+1+(i%4)*1, y=oy+1+Math.floor(i/4)*1; mapDecor[x+'_'+y]={s:k,x,y}; });
    let q=0; [[6,2],[7,3],[5,5],[8,1],[9,4],[6,6],[3,8],[2,9],[4,10],[10,6]].forEach(([dx,dy])=>{ const k=keys[(q++*5)%keys.length]; mapDecor[(ox+dx)+'_'+(oy+dy)]={s:k,x:ox+dx,y:oy+dy}; });
    terrainClearAll(); setMapZoom(1.2); const vp=document.getElementById('mapviewport'); const c=tileCenterPx({x:ox+5,y:oy+5}); vp.scrollLeft=c.x-vp.clientWidth/2; vp.scrollTop=c.y-vp.clientHeight/2; renderVisibleTiles(); await new Promise(r=>setTimeout(r,800));
    document.querySelectorAll('#mapOverlayCtl,#fpsCounter,#fleetHud').forEach(e=>e.style.visibility='hidden'); return keys.length; });
  await p.screenshot({ path: OUT+'scatter.png', clip:{x:0,y:200,width:430,height:520} });
  await p.evaluate(()=>document.getElementById('mapPaintBtn')&&(terrainDev||document.getElementById('devTerrainBtn').click(), document.getElementById('mapPaintBtn').click()));
  await p.screenshot({ path: OUT+'scatter_pal.png', clip:{x:0,y:100,width:120,height:600} });
  console.log(r, errs); await b.close();
})();

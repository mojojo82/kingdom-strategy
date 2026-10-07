const { chromium } = require('/home/claude/.npm-global/lib/node_modules/@playwright/mcp/node_modules/playwright');
const OUT='/tmp/claude-0/-home-claude/ea8aa5cd-2a55-5679-b734-73d165c6f3b7/scratchpad/prov/';
(async () => {
  const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args: ['--no-sandbox'] });
  const p = await b.newPage({ viewport: { width: 430, height: 932 }, deviceScaleFactor: 2 }); const errs=[]; p.on('pageerror',e=>errs.push(e.message));
  await p.goto('file:///home/claude/game.html'); await p.waitForTimeout(1500);
  const hx = (await p.evaluate(()=>game.state.homeTileId)).split(',').map(Number);
  const T=[hx[0]+6,hx[1]+2];
  for (const iso of [true,false]) {
  await p.evaluate(async({T,iso})=>{ setScreen('world'); if(mapIso!==iso) document.getElementById('devMapIsoBtn').click(); await new Promise(r=>setTimeout(r,200)); setMapZoom(1);
    if(!terrainDev) document.getElementById('devTerrainBtn').click(); mapDecor={};
    mapDecor[T[0]+'_'+T[1]]={s:'spire_base',x:T[0],y:T[1]}; mapDecor[(T[0]+4)+'_'+(T[1])]={s:'spire_2x2',x:T[0]+4,y:T[1]}; mapDecor[(T[0])+'_'+(T[1]+4)]={s:'forge_base',x:T[0],y:T[1]+4}; selectedTile=T[0]+','+(T[1]+4); mapDecor[(T[0]+4)+'_'+(T[1]+4)]={s:'obelisk_base',x:T[0]+4,y:T[1]+4};
    selectedTile=T[0]+','+(T[1]+4);
    const vp=document.getElementById('mapviewport'); const c=tileCenterPx({x:T[0]+2,y:T[1]+2}); vp.scrollLeft=c.x-vp.clientWidth/2; vp.scrollTop=c.y-vp.clientHeight/2; renderVisibleTiles(); await new Promise(r=>setTimeout(r,400));
    document.querySelectorAll('#tileinfo,#tileinfoArrow,#mapOverlayCtl').forEach(e=>e.style.visibility='hidden'); }, {T,iso});
  await p.screenshot({ path: OUT+'spire_'+(iso?'iso':'flat')+'.png', clip:{x:15,y:200,width:400,height:500} });
  }
  await p.evaluate(()=>{ document.getElementById('mapPaintBtn').click(); });
  await p.screenshot({ path: OUT+'spire_pal.png', clip:{x:0,y:150,width:200,height:650} });
  console.log(await p.evaluate(()=>[...document.querySelectorAll('#spritePalette .sp-item')].map(x=>x.dataset.k).join(',')), errs); await b.close();
})();

const { chromium } = require('/home/claude/.npm-global/lib/node_modules/@playwright/mcp/node_modules/playwright');
const OUT='/tmp/claude-0/-home-claude/ea8aa5cd-2a55-5679-b734-73d165c6f3b7/scratchpad/prov/';
(async () => {
  const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args: ['--no-sandbox'] });
  const p = await b.newPage({ viewport: { width: 430, height: 932 }, deviceScaleFactor: 2 }); const errs=[]; p.on('pageerror',e=>errs.push(e.message));
  await p.goto('file:///home/claude/game.html'); await p.waitForTimeout(1500);
  const hx = (await p.evaluate(()=>game.state.homeTileId)).split(',').map(Number);
  const T=[hx[0]+6,hx[1]];
  await p.evaluate(async({T})=>{ setScreen('world'); if(!mapIso) document.getElementById('devMapIsoBtn').click(); await new Promise(r=>setTimeout(r,200)); setMapZoom(1);
    if(!terrainDev) document.getElementById('devTerrainBtn').click(); mapDecor={};
    // clear resources around target so the footprint is an empty tile
    const vp=document.getElementById('mapviewport'); const c=tileCenterPx({x:T[0],y:T[1]}); vp.scrollLeft=c.x-vp.clientWidth/2; vp.scrollTop=c.y-vp.clientHeight/2; renderVisibleTiles(); await new Promise(r=>setTimeout(r,300));
    document.getElementById('mapPaintBtn').click(); }, {T});
  const pt = async (x,y)=> p.evaluate(({x,y})=>{ const w=document.getElementById('mapworld').getBoundingClientRect(); const c=tileCenterPx({x,y}); return {x:w.left+c.x, y:w.top+c.y}; },{x,y});
  await p.click('#spritePalette .sp-item[data-k="obelisk_base"]');
  let a = await pt(T[0],T[1]); await p.mouse.click(a.x,a.y); await p.waitForTimeout(200);
  // move: drag from footprint corner tile to 4 tiles down-right
  await p.click('#spritePalette .sp-item[data-k="move"]');
  a = await pt(T[0]+1,T[1]); const d = await pt(T[0]+1,T[1]+4);
  await p.mouse.move(a.x,a.y); await p.mouse.down(); for(let i=1;i<=8;i++){ await p.mouse.move(a.x+(d.x-a.x)*i/8, a.y+(d.y-a.y)*i/8); await p.waitForTimeout(30);} await p.mouse.up(); await p.waitForTimeout(200);
  console.log('after move', await p.evaluate(()=>JSON.stringify(mapDecor)));
  await p.click('#tpUndo'); console.log('after undo', await p.evaluate(()=>JSON.stringify(mapDecor)));
  await p.click('#tpUndo'); await p.click('#tpUndo'); console.log('undo x3', await p.evaluate(()=>JSON.stringify(mapDecor)));
  // redo placement and move for real, then close paint and select as a player
  await p.click('#spritePalette .sp-item[data-k="obelisk_base"]'); a = await pt(T[0],T[1]); await p.mouse.click(a.x,a.y);
  await p.click('#tpDone'); await p.waitForTimeout(200);
  a = await pt(T[0],T[1]); await p.mouse.click(a.x,a.y); await p.waitForTimeout(500);
  console.log('selected', await p.evaluate(()=>({sel:selectedTile, fp:document.querySelectorAll('.tile.fp').length})));
  await p.evaluate(()=>{ const ti=document.getElementById('tileinfo'); if(ti) ti.style.visibility='hidden'; document.querySelectorAll('#tileinfoArrow').forEach(e=>e.style.visibility='hidden'); });
  await p.screenshot({ path: OUT+'decor_sel.png', clip:{x:a.x-160,y:a.y-220,width:320,height:330} });
  console.log(errs); await b.close();
})();

const { chromium } = require('/home/claude/.npm-global/lib/node_modules/@playwright/mcp/node_modules/playwright');
const OUT='/tmp/claude-0/-home-claude/ea8aa5cd-2a55-5679-b734-73d165c6f3b7/scratchpad/prov/';
(async () => {
  const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args: ['--no-sandbox'] });
  const p = await b.newPage({ viewport: { width: 430, height: 932 }, deviceScaleFactor: 2 }); const errs=[]; p.on('pageerror',e=>errs.push(e.message)); p.on('console',m=>{ if(m.type()==='error' && !/TUNNEL|capability/.test(m.text())) errs.push(m.text()); });
  await p.goto('file:///home/claude/game.html'); await p.waitForTimeout(1500);
  const home = await p.evaluate(()=>game.state.homeTileId);
  const hx = home.split(',').map(Number);
  for (const iso of [true,false]) {
    await p.evaluate(async({iso,hx})=>{ setScreen('world'); if(mapIso!==iso) document.getElementById('devMapIsoBtn').click(); await new Promise(r=>setTimeout(r,200)); setMapZoom(0.8);
      if(!terrainDev) document.getElementById('devTerrainBtn').click(); mapDecor={}; renderVisibleTiles();
      const vp=document.getElementById('mapviewport'); const c=tileCenterPx({x:hx[0]+3,y:hx[1]}); vp.scrollLeft=c.x-vp.clientWidth/2; vp.scrollTop=c.y-vp.clientHeight/2; renderVisibleTiles(); await new Promise(r=>setTimeout(r,300));
      document.getElementById('mapPaintBtn').click(); }, {iso,hx});
    const pal = await p.evaluate(()=>{ const sp=document.getElementById('spritePalette'); const r=sp.getBoundingClientRect(); return {disp:getComputedStyle(sp).display, r:[r.left,r.top,r.width,r.height].map(Math.round), items:[...sp.querySelectorAll('.sp-item')].map(x=>x.dataset.k)}; });
    console.log('palette', JSON.stringify(pal));
    async function tapTile(x,y){ const pt = await p.evaluate(({x,y})=>{ const w=document.getElementById('mapworld').getBoundingClientRect(); const c=tileCenterPx({x,y}); return {x:w.left+c.x, y:w.top+c.y}; },{x,y}); await p.mouse.click(pt.x, pt.y); await p.waitForTimeout(150); }
    await p.click('#spritePalette .sp-item[data-k="obelisk_base"]');
    await tapTile(hx[0]+5, hx[1]);
    await p.click('#spritePalette .sp-item[data-k="obelisk_1x1"]');
    await tapTile(hx[0]+3, hx[1]+3); await tapTile(hx[0]+5, hx[1]+3);
    await p.waitForTimeout(400);
    console.log(iso?'iso':'flat', await p.evaluate(()=>JSON.stringify({ decor: mapDecor, els: Object.keys(decorEls).length, hint: document.getElementById('tpHint').textContent, sel: selectedTile, terrainStrokes: terrainPaint.undo.filter(u=>!u.decor).length })));
    await p.screenshot({ path: OUT+'decor_'+(iso?'iso':'flat')+'.png' });
    // erase + undo
    await p.click('#spritePalette .sp-item[data-k="erase"]'); await tapTile(hx[0]+5, hx[1]+1);
    const afterErase = await p.evaluate(()=>Object.keys(mapDecor));
    await p.click('#tpUndo'); const afterUndo = await p.evaluate(()=>Object.keys(mapDecor));
    // zoom far -> hidden, back -> shown
    const lodTest = await p.evaluate(async()=>{ setMapZoom(0.05); await new Promise(r=>setTimeout(r,100)); const far=Object.keys(decorEls).length; setMapZoom(0.8); renderVisibleTiles(); return {far, near:Object.keys(decorEls).length}; });
    console.log('erase', afterErase, 'undo', afterUndo, JSON.stringify(lodTest));
    await p.click('#tpDone'); console.log('palette after done', await p.evaluate(()=>getComputedStyle(document.getElementById('spritePalette')).display));
  }
  console.log('errs', errs); await b.close();
})();

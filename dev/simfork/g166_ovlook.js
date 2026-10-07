const { chromium } = require('/home/claude/.npm-global/lib/node_modules/@playwright/mcp/node_modules/playwright');
const fs=require('fs'); const MOCK=fs.readFileSync('/home/claude/tests/mockdb.js','utf8');
const OUT='/tmp/claude-0/-home-claude-kingdom-strategy/ea8aa5cd-2a55-5679-b734-73d165c6f3b7/scratchpad/seams/';
const seed=JSON.parse(fs.readFileSync('/home/claude/kingdom-strategy/seed-world.json','utf8'));
(async () => { const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args: ['--no-sandbox'] });
  for (const [tag,file] of [['old','/home/claude/game_v907.html'],['new','/home/claude/game.html']]) {
    const store={}; for (const c of ['terrain','mapdecor']) for (const id in seed[c]) store[c+'/'+id]=seed[c][id];
    const ctx=await b.newContext({ viewport:{width:900,height:700}, deviceScaleFactor:2 });
    await ctx.exposeFunction('__store',(op,k,v)=>{ if(op==='set') store[k]=JSON.parse(v); else if(op==='del') delete store[k]; return JSON.stringify(store); });
    await ctx.addInitScript(`localStorage.setItem('kingdom_prototype_playerid_v1','pOv');localStorage.setItem('kingdom_prototype_mapiso_v1','1');`+MOCK);
    const p=await ctx.newPage(); await p.goto('file://'+file); await p.waitForTimeout(4500);
    for (const tp of (process.env.TPS||'3,6,9,14,20').split(',').map(Number)) {
      const r=await p.evaluate(async(tp)=>{ terrainEnsure(); const ks=Object.keys(terrainLandChunks).map(k=>k.split('_').map(Number)); let cx=0,cy=0; ks.forEach(k=>{cx+=k[0];cy+=k[1];}); cx=(cx/ks.length+0.5)*TERRAIN_CHUNK; cy=(cy/ks.length+0.5)*TERRAIN_CHUNK;
        setMapZoom(tp/isoCfg.tile); const vp=document.getElementById('mapviewport'); const c=tileCenterPx({x:Math.round(cx),y:Math.round(cy)}); vp.scrollLeft=c.x-vp.clientWidth/2; vp.scrollTop=c.y-vp.clientHeight/2; renderVisibleTiles(); await new Promise(r=>setTimeout(r,700));
        document.querySelectorAll('#tileinfo,#mapOverlayCtl').forEach(e=>e.style.visibility='hidden'); const R=vp.getBoundingClientRect(); return {x:R.x+R.width/2-200,y:R.y+R.height/2-130, lod:mapLod(), ov:(typeof terrainOv!=='undefined')&&!!terrainOv.el, cells:Object.keys(terrainEls).length}; }, tp);
      await p.screenshot({path:OUT+`ov_${tag}_${tp}.png`, clip:{x:r.x,y:r.y,width:400,height:260}}); console.log(tag, 'tile px', tp, JSON.stringify(r));
    }
    await ctx.close(); }
  await b.close(); })();

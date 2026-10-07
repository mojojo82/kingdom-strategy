const { chromium } = require('/home/claude/.npm-global/lib/node_modules/@playwright/mcp/node_modules/playwright');
const fs=require('fs'); const MOCK=fs.readFileSync('/home/claude/tests/mockdb.js','utf8');
const OUT='/tmp/claude-0/-home-claude-kingdom-strategy/ea8aa5cd-2a55-5679-b734-73d165c6f3b7/scratchpad/seams/';
const seed=JSON.parse(fs.readFileSync('/home/claude/kingdom-strategy/seed-world.json','utf8'));
(async () => { const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args: ['--no-sandbox'] });
  for (const [tag,file] of [['old','/home/claude/game_v906.html'],['new','/home/claude/game.html']]) {
    const store={}; for (const c of ['terrain','mapdecor']) for (const id in seed[c]) store[c+'/'+id]=seed[c][id];
    const ctx=await b.newContext({ viewport:{width:900,height:700}, deviceScaleFactor:1 });
    await ctx.exposeFunction('__store',(op,k,v)=>{ if(op==='set') store[k]=JSON.parse(v); else if(op==='del') delete store[k]; return JSON.stringify(store); });
    await ctx.addInitScript(`localStorage.setItem('kingdom_prototype_playerid_v1','pLook');`+MOCK);
    const p=await ctx.newPage(); await p.goto('file://'+file); await p.waitForTimeout(4000);
    const r=await p.evaluate(async()=>{ terrainEnsure(); const n=terrainN; let coast=null;
      for (let y=2;y<n-2&&!coast;y++) for (let x=2;x<n-2;x++) if(terrainArr[y*n+x]===1 && terrainArr[y*n+x+2]===0 && terrainArr[(y+1)*n+x]===1){ coast=[x,y]; break; }
      setMapZoom(1); const vp=document.getElementById('mapviewport'); const c=tileCenterPx({x:coast[0],y:coast[1]}); vp.scrollLeft=c.x-vp.clientWidth/2; vp.scrollTop=c.y-vp.clientHeight/2;
      const t0=performance.now(); terrainClearAll(); renderVisibleTiles(); const ms=performance.now()-t0; await new Promise(r=>setTimeout(r,500));
      document.querySelectorAll('#tileinfo,#mapOverlayCtl').forEach(e=>e.style.visibility='hidden'); const R=vp.getBoundingClientRect(); return {x:R.x+R.width/2-180,y:R.y+R.height/2-140,ms,cells:Object.keys(terrainEls).length}; });
    await p.screenshot({path:OUT+'look_'+tag+'.png', clip:{x:r.x,y:r.y,width:360,height:280}}); console.log(tag,'full terrain redraw',r.ms.toFixed(1),'ms for',r.cells,'cells'); await ctx.close(); }
  await b.close(); })();

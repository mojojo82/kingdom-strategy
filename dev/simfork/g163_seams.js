// Grass seam detector: render painted map in iso at several zooms / screen scalings, count pixels in open grass that aren't a grass colour.
const { chromium } = require('/home/claude/.npm-global/lib/node_modules/@playwright/mcp/node_modules/playwright');
const fs=require('fs'); const MOCK=fs.readFileSync('/home/claude/tests/mockdb.js','utf8');
const FILE=process.argv[2]||'/home/claude/game.html', TAG=process.argv[3]||'cur';
const OUT='/tmp/claude-0/-home-claude-kingdom-strategy/ea8aa5cd-2a55-5679-b734-73d165c6f3b7/scratchpad/seams/'; fs.mkdirSync(OUT,{recursive:true});
const seed=JSON.parse(fs.readFileSync('/home/claude/kingdom-strategy/seed-world.json','utf8'));
const base={}; for (const c of ['terrain','mapdecor']) for (const id in seed[c]) base[c+'/'+id]=seed[c][id];
(async () => {
  const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args: ['--no-sandbox'] });
  const rows=[];
  for (const dpr of [1, 1.1, 1.25, 1.5, 2]) {
    const store=JSON.parse(JSON.stringify(base));
    const ctx=await b.newContext({ viewport:{width:1100,height:800}, deviceScaleFactor:dpr });
    await ctx.exposeFunction('__store',(op,k,v)=>{ if(op==='set') store[k]=JSON.parse(v); else if(op==='del') delete store[k]; return JSON.stringify(store); });
    await ctx.addInitScript(`localStorage.setItem('kingdom_prototype_playerid_v1','pSeam');`+MOCK);
    const p=await ctx.newPage(); if(process.env.MAG) await p.addInitScript('window.__MAG=1'); await p.goto('file://'+FILE); await p.waitForTimeout(4000);
    for (const z of [0.6, 0.85, 1, 1.3, 1.7]) {
      const info=await p.evaluate(async(z)=>{
        // centre on the middle of the largest painted grass block
        terrainEnsure(); const n=terrainN; let best=null;
        for (let y=3;y<n-3;y++) for (let x=3;x<n-3;x++) { if (terrainArr[y*n+x]!==1) continue; let ok=true; for(let dy=-3;dy<=3&&ok;dy++) for(let dx=-3;dx<=3;dx++) if(terrainArr[(y+dy)*n+x+dx]!==1){ok=false;break;} if(ok){best=[x,y];break;} if(best)break; }
        if(!best) return null;
        setMapZoom(z); const vp=document.getElementById('mapviewport'); const c=tileCenterPx({x:best[0],y:best[1]}); vp.scrollLeft=c.x-vp.clientWidth/2; vp.scrollTop=c.y-vp.clientHeight/2; renderVisibleTiles();
        await new Promise(r=>setTimeout(r,500));
        document.querySelectorAll('.map-decor,.tile,.forest-piece,#tileinfo,#mapOverlayCtl').forEach(e=>e.style.visibility='hidden'); if(window.__MAG){ const st=document.createElement('style'); st.textContent='#mapviewport,#mapworld{background:#ff00ff !important;background-image:none !important} #mapworld > *:not(#mapTerrainLayer){visibility:hidden !important}'; document.head.appendChild(st); await new Promise(r=>setTimeout(r,200)); }
        const r=vp.getBoundingClientRect(); const s=tilePxZ()*1.5;
        return { x:r.x+r.width/2-s, y:r.y+r.height/2-s*0.6, w:2*s, h:1.2*s, grass:TERR_GRASS };
      }, z);
      if(!info){ console.log('no grass block'); process.exit(1); }
      const buf=await p.screenshot({clip:{x:info.x,y:info.y,width:info.w,height:info.h}});
      const f=OUT+`${TAG}_d${dpr}_z${z}.png`; fs.writeFileSync(f,buf);
      rows.push({dpr,z,f,grass:info.grass});
    }
    await ctx.close();
  }
  fs.writeFileSync(OUT+TAG+'.json',JSON.stringify(rows)); await b.close();
})();

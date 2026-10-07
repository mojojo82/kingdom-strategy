const { chromium } = require('/home/claude/.npm-global/lib/node_modules/@playwright/mcp/node_modules/playwright');
const fs=require('fs'); const MOCK=fs.readFileSync('/home/claude/tests/mockdb.js','utf8');
const OUT='/tmp/claude-0/-home-claude/ea8aa5cd-2a55-5679-b734-73d165c6f3b7/scratchpad/blur/';
const F=process.argv[2]||'game.html';
(async () => {
  const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args: ['--no-sandbox'] });
  const ctx=await b.newContext({ viewport:{width:1400,height:900}, deviceScaleFactor:1 });
  const store={}; await ctx.exposeFunction('__store',(op,k,v)=>{ if(op==='set') store[k]=JSON.parse(v); else if(op==='del') delete store[k]; return JSON.stringify(store); });
  await ctx.addInitScript(`localStorage.setItem('kingdom_prototype_playerid_v1','pA');localStorage.setItem('kingdom_prototype_mapiso_v1','1');`+MOCK);
  const p=await ctx.newPage(); const errs=[]; p.on('pageerror',e=>errs.push(e.message)); await p.goto('file:///home/claude/'+F); await p.waitForTimeout(3500);
  const pos=await p.evaluate(async()=>{ setMapZoom(1.6); const h=tileXY(game.state.homeTileId); const vp=document.getElementById('mapviewport'); const c=tileCenterPx({x:h[0],y:h[1]}); vp.scrollLeft=c.x-vp.clientWidth/2; vp.scrollTop=c.y-vp.clientHeight/2; renderVisibleTiles(); await new Promise(r=>setTimeout(r,500)); const r=vp.getBoundingClientRect(); return {x:r.x+r.width/2-110,y:r.y+r.height/2-150}; });
  const clip={x:pos.x,y:pos.y,width:220,height:220};
  await p.screenshot({path:OUT+'unsel.png', clip});
  const info=await p.evaluate(async()=>{ selectedTile=game.state.homeTileId; renderVisibleTiles(); renderTileInfo(); await new Promise(r=>setTimeout(r,500)); document.querySelectorAll('#tileinfo').forEach(e=>e.style.visibility='hidden'); const el=document.querySelector('.tile.selected'); const cs=el&&getComputedStyle(el); const kids=el?[...el.querySelectorAll('*')].map(k=>{const s=getComputedStyle(k);return k.className+'|'+s.filter+'|'+s.transform+'|'+s.willChange}).slice(0,6):[]; return el?{cls:el.className,filter:cs.filter,tf:cs.transform,bs:cs.boxShadow,wc:cs.willChange,anim:cs.animationName,kids}:null; });
  console.log(JSON.stringify(info,null,1));
  await p.screenshot({path:OUT+'sel.png', clip});
  console.log(errs); await b.close();
})();

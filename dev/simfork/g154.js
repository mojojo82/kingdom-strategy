const { chromium } = require('/home/claude/.npm-global/lib/node_modules/@playwright/mcp/node_modules/playwright');
const fs=require('fs'); const MOCK=fs.readFileSync('/home/claude/tests/mockdb.js','utf8'); const store={};
const OUT='/tmp/claude-0/-home-claude/ea8aa5cd-2a55-5679-b734-73d165c6f3b7/scratchpad/prov/';
(async () => {
  const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args: ['--no-sandbox'] });
  const ctx=await b.newContext({ viewport:{width:430,height:932}, deviceScaleFactor:2 });
  await ctx.exposeFunction('__store',(op,k,v)=>{ if(op==='set') store[k]=JSON.parse(v); else if(op==='del') delete store[k]; return JSON.stringify(store); });
  await ctx.addInitScript(`localStorage.setItem('kingdom_prototype_playerid_v1','pA');`+MOCK);
  const p=await ctx.newPage(); const errs=[]; p.on('pageerror',e=>errs.push(e.message)); await p.goto('file:///home/claude/game.html'); await p.waitForTimeout(3500);
  await p.evaluate(()=>createAlliance('Iron Wolves','WOLF')); await p.waitForTimeout(500); await p.evaluate(()=>window.__mockNotify()); await p.waitForTimeout(400);
  const r=await p.evaluate(async()=>{ setScreen('world'); setMapZoom(1); const h=tileXY(game.state.homeTileId); const vp=document.getElementById('mapviewport'); const c=tileCenterPx({x:h[0],y:h[1]}); vp.scrollLeft=c.x-vp.clientWidth/2; vp.scrollTop=c.y-vp.clientHeight/2; renderVisibleTiles(); await new Promise(r=>setTimeout(r,400)); return [...document.querySelectorAll('.city-tag')].map(e=>e.textContent+'/'+e.className); });
  console.log(r);
  await p.evaluate(()=>document.querySelectorAll('#tileinfo,#mapOverlayCtl').forEach(e=>e.style.visibility='hidden'));
  await p.screenshot({path:OUT+'ally_tag.png', clip:{x:65,y:300,width:300,height:300}});
  // browse list for a non-member: leave then view
  console.log(errs); await b.close();
})();

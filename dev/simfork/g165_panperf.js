// Pan smoothness when zoomed far out: real mouse drag on the map, frame times measured with requestAnimationFrame, CPU throttled 4x (phone-like).
const { chromium } = require('/home/claude/.npm-global/lib/node_modules/@playwright/mcp/node_modules/playwright');
const fs=require('fs'); const MOCK=fs.readFileSync('/home/claude/tests/mockdb.js','utf8');
const seed=JSON.parse(fs.readFileSync('/home/claude/kingdom-strategy/seed-world.json','utf8'));
const files=process.argv.slice(2);
(async () => { const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args: ['--no-sandbox'] });
  const HIDES=(process.env.HIDES||'none').split('|'); for (const file of files) for (const which of ['min']) for (const hide of HIDES) {
    const store={}; for (const c of ['terrain','mapdecor']) for (const id in seed[c]) store[c+'/'+id]=seed[c][id];
    const ctx=await b.newContext({ viewport:{width:1400,height:900}, deviceScaleFactor:1 });
    await ctx.exposeFunction('__store',(op,k,v)=>{ if(op==='set') store[k]=JSON.parse(v); else if(op==='del') delete store[k]; return JSON.stringify(store); });
    await ctx.addInitScript(`localStorage.setItem('kingdom_prototype_playerid_v1','pPan');localStorage.setItem('kingdom_prototype_mapiso_v1','1');`+MOCK);
    const p=await ctx.newPage(); await p.addInitScript('window.__HIDE='+JSON.stringify(hide)); await p.goto('file://'+file); await p.waitForTimeout(5000);
    const info=await p.evaluate(async(which)=>{ try{ setScreen('world'); }catch(e){} const z = which==='min' ? mapZoomMin() : (8/ (isoCfg.tile)); setMapZoom(z); renderVisibleTiles(); await new Promise(r=>setTimeout(r,800)); if(window.__HIDE && window.__HIDE!=='none'){ const st=document.createElement('style'); st.textContent=window.__HIDE+'{display:none !important}'; document.head.appendChild(st); }
      const vp=document.getElementById('mapviewport'); const r=vp.getBoundingClientRect(); return {x:r.x+r.width/2,y:r.y+r.height/2,z:mapZoom,lod:mapLod(),dom:document.getElementById('mapworld').querySelectorAll('*').length}; }, which);
    const cdp=await ctx.newCDPSession(p); await cdp.send('Emulation.setCPUThrottlingRate',{rate:4});
    await p.evaluate(()=>{ window.__ft=[]; let last=performance.now(); (function f(t){ window.__ft.push(t-last); last=t; if(window.__ft.length<400) requestAnimationFrame(f); })(performance.now()); window.__rv=0; window.__rvMs=0; const o=window.renderVisibleTiles; window.renderVisibleTiles=function(){ const t=performance.now(); const r=o.apply(this,arguments); window.__rvMs+=performance.now()-t; window.__rv++; return r; }; });
    await p.mouse.move(info.x, info.y); await p.mouse.down();
    for (let k=0;k<3;k++) { for (let s=0;s<40;s++) await p.mouse.move(info.x+ (s*6) , info.y + (s*3)); for (let s=40;s>0;s--) await p.mouse.move(info.x+ (s*6), info.y+(s*3)); }
    await p.mouse.up(); await p.waitForTimeout(300);
    const r=await p.evaluate(()=>{ const f=window.__ft.slice(2).sort((a,b)=>a-b); const avg=f.reduce((a,b)=>a+b,0)/f.length; return { frames:f.length, avgMs:+avg.toFixed(1), p95:+f[Math.floor(f.length*0.95)].toFixed(1), worst:+f[f.length-1].toFixed(1), renderCalls:window.__rv, renderMsTotal:+window.__rvMs.toFixed(0), terr:Object.keys(terrainEls||{}).length }; });
    console.log(hide.padEnd(28), 'zoom', info.z.toFixed(3), 'lod', info.lod, 'dom', info.dom, JSON.stringify(r));
    await ctx.close(); }
  await b.close(); })();

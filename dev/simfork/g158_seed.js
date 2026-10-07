const { chromium } = require('/home/claude/.npm-global/lib/node_modules/@playwright/mcp/node_modules/playwright');
const fs=require('fs'); const FAKE=fs.readFileSync('/home/claude/tests/fakefb.js','utf8'); const GAME=fs.readFileSync('/home/claude/game.html','utf8'); const SEED=fs.readFileSync('/home/claude/kingdom-strategy/seed-world.json','utf8');
const store={};
(async () => {
  const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args: ['--no-sandbox'] });
  const errs=[], cons=[];
  async function mk(pid){ const ctx=await b.newContext({ viewport:{width:1400,height:900} });
    await ctx.exposeFunction('__fbstore',(op,k,v)=>{ if(op==='set') store[k]=JSON.parse(v); else if(op==='del') delete store[k]; return JSON.stringify(store); });
    await ctx.route(/mojojo82\.github\.io/, r=> r.request().url().endsWith('seed-world.json') ? r.fulfill({status:200,contentType:'application/json',body:SEED}) : r.fulfill({status:200, contentType:'text/html', body:GAME}));
    await ctx.route(/gstatic\.com\/firebasejs\/.*firebase-app-compat\.js/, r=>r.fulfill({status:200, contentType:'application/javascript', body:FAKE}));
    await ctx.route(/gstatic\.com\/firebasejs\/.*(auth|firestore)-compat\.js/, r=>r.fulfill({status:200, contentType:'application/javascript', body:''}));
    await ctx.addInitScript(`localStorage.setItem('kingdom_prototype_playerid_v1','${pid}');`);
    const p=await ctx.newPage(); p.on('pageerror',e=>errs.push(e.message)); p.on('console',m=>{ const t=m.text(); if(/seed|Firestore|Firebase/i.test(t)) cons.push(pid+': '+t.slice(0,150)); });
    await p.goto('https://mojojo82.github.io/kingdom-strategy/test/'); await p.waitForTimeout(6000); return p; }
  const A=await mk('pA');
  const k=Object.keys(store);
  console.log('terrain', k.filter(x=>x.startsWith('envs/test/terrain/')).length, 'mapdecor', k.filter(x=>x.startsWith('envs/test/mapdecor/')).length, 'marker', JSON.stringify(store['envs/test/world/seedImport']));
  await A.evaluate(()=>window.__fbNotify()); await A.waitForTimeout(800);
  console.log('A decor objects', await A.evaluate(()=>{ try { return Object.keys(mapDecor||{}).length; } catch(e){ return 'var? '+Object.keys(window).filter(n=>/decor/i.test(n)).slice(0,8).join(','); } }));
  // a second player must not re-import
  delete store['envs/test/mapdecor/36_31']; const B=await mk('pB');
  console.log('after B, 36_31 re-added?', !!store['envs/test/mapdecor/36_31']);
  console.log('errs', errs, cons); await b.close();
})();

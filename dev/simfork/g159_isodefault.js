const { chromium } = require('/home/claude/.npm-global/lib/node_modules/@playwright/mcp/node_modules/playwright');
const fs=require('fs'); const MOCK=fs.readFileSync('/home/claude/tests/mockdb.js','utf8'); const store={};
(async () => {
  const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args: ['--no-sandbox'] });
  for (const pre of ['', "localStorage.setItem('kingdom_prototype_mapiso_v1','0');", "localStorage.setItem('kingdom_prototype_mapiso_v1','1');"]) {
    const ctx=await b.newContext(); await ctx.exposeFunction('__store',(op,k,v)=>{ if(op==='set') store[k]=JSON.parse(v); else if(op==='del') delete store[k]; return JSON.stringify(store); });
    await ctx.addInitScript(`localStorage.setItem('kingdom_prototype_playerid_v1','pZ${Math.random()}');`+pre+MOCK);
    const p=await ctx.newPage(); const errs=[]; p.on('pageerror',e=>errs.push(e.message)); await p.goto('file:///home/claude/game.html'); await p.waitForTimeout(3500);
    console.log(JSON.stringify(pre.slice(0,60)||'(none)'), '-> mapIso', await p.evaluate(()=>mapIso), 'iso class', await p.evaluate(()=>{ renderVisibleTiles(); return document.getElementById('mapworld').classList.contains('iso'); }), errs);
    await ctx.close();
  }
  await b.close();
})();

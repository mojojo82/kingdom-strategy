const { chromium } = require('/home/claude/.npm-global/lib/node_modules/@playwright/mcp/node_modules/playwright');
const fs=require('fs'); const FAKE=fs.readFileSync('/home/claude/tests/fakefb.js','utf8'); const GAME=fs.readFileSync('/home/claude/game.html','utf8');
const OUT='/tmp/claude-0/-home-claude/ea8aa5cd-2a55-5679-b734-73d165c6f3b7/scratchpad/blur/';
const store={};
(async () => {
  const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args: ['--no-sandbox'] });
  const pages=[]; const errs=[]; const cons=[];
  async function mk(pid,name,url,vp,opts={}){ const ctx=await b.newContext({ viewport:vp||{width:430,height:932} });
    await ctx.exposeFunction('__fbstore',(op,k,v)=>{ if(op==='set') store[k]=JSON.parse(v); else if(op==='del') delete store[k]; return JSON.stringify(store); });
    await ctx.route(/mojojo82\.github\.io/, r=>r.fulfill({status:200, contentType:'text/html', body:GAME}));
    await ctx.route(/gstatic\.com\/firebasejs\/.*firebase-app-compat\.js/, r=>r.fulfill({status:200, contentType:'application/javascript', body:FAKE}));
    await ctx.route(/gstatic\.com\/firebasejs\/.*(auth|firestore)-compat\.js/, r=>r.fulfill({status:200, contentType:'application/javascript', body:'/*fake*/'}));
    await ctx.addInitScript(`localStorage.setItem('kingdom_prototype_playerid_v1','${pid}');`+(opts.noAnon?'window.__fbAnonDisabled=true;':''));
    const p=await ctx.newPage(); p.on('pageerror',e=>errs.push(pid+': '+e.message));
    p.on('console',m=>{ if(m.type()==='error'||m.type()==='warning'){ const t=m.text(); if(/Firestore|Firebase|Nested|undefined|segments|not_found|store's/.test(t)) cons.push(pid+': '+t.slice(0,200)); } });
    await p.goto(url); await p.waitForTimeout(5000);
    await p.evaluate(n=>setPlayerName(n),name); pages.push(p); return p; }
  const sync=async()=>{ for(const p of pages) await p.evaluate(()=>window.__fbNotify&&window.__fbNotify()); await pages[0].waitForTimeout(400); };
  const T='https://mojojo82.github.io/kingdom-strategy/test/';
  const A=await mk('pA','Alice',T,{width:1400,height:900}), B=await mk('pB','Bob',T);
  console.log('A backend', await A.evaluate(()=>[JSON.stringify(window.KS_BACKEND), cloudDb&&cloudDb.backend, PLAYER_ID, document.getElementById('ksFbBadge')&&document.getElementById('ksFbBadge').textContent]));
  console.log('settings', await A.evaluate(()=>JSON.stringify(window.__fbSettings)));
  await A.evaluate(()=>cloudSyncNow(true)); await A.waitForTimeout(800);
  const keys=Object.keys(store); console.log('store keys', keys.length, 'all under envs/test?', keys.every(k=>k.startsWith('envs/test/')), keys.slice(0,12));
  // save round-trip equality
  console.log('save roundtrip', await A.evaluate(async()=>{ const s=await cloudDb.doc(cloudSaveDoc()).get(); const C=v=>Array.isArray(v)?v.map(C):(v&&typeof v==='object'?Object.keys(v).sort().reduce((o,k)=>(o[k]=C(v[k]),o),{}):v); const a=JSON.stringify(C(s.data())), b=JSON.stringify(C(JSON.parse(lastCloudWrittenJson))); let i=0; while(i<a.length&&a[i]===b[i]) i++; return [s.exists, a.length, b.length, a===b, a.slice(i-60,i+60), b.slice(i-60,i+60)]; }));
  const nested=JSON.stringify(store).includes('__arr'); console.log('nested arrays encoded somewhere:', nested);
  // chat
  await A.evaluate(()=>{ document.getElementById('worldChatInput').value='Hi from Alice on Firebase'; sendWorldChatMessage(); });
  await sync();
  await B.evaluate(()=>{ chatTab='world'; setScreen('more','chat'); document.getElementById('worldChatInput').value='Bob here'; sendWorldChatMessage(); });
  await sync();
  console.log('B chat', await B.evaluate(()=>getChatMessages().map(m=>m.name+':'+m.text)));
  console.log('A chat', await A.evaluate(()=>getChatMessages().map(m=>m.name+':'+m.text)));
  // alliance
  console.log('create', await A.evaluate(()=>createAlliance('Fire Wolves','FIRE'))); await sync();
  const aid=await B.evaluate(()=>Object.keys(ALLY.list)[0]); console.log('B sees alliance', aid);
  console.log('B join', await B.evaluate(a=>joinAlliance(a),aid)); await sync();
  console.log('accept', await A.evaluate(()=>acceptJoinRequest('pB'))); await sync();
  console.log('B my', await B.evaluate(()=>JSON.stringify(ALLY.my)));
  // cities / home claimed
  console.log('homes', await A.evaluate(()=>game.state.homeTileId), await B.evaluate(()=>game.state.homeTileId), 'cities docs', Object.keys(store).filter(k=>k.includes('/cities/')).length, 'leases', Object.keys(store).filter(k=>k.includes('_leases')).length);
  console.log('B sees A city?', await B.evaluate(()=>{ const h=null; return Object.keys(cityOwners||{}).length; }).catch(e=>'n/a '+e.message));
  // live env path + no-anon
  const L=await mk('pL','Liv','https://mojojo82.github.io/kingdom-strategy/',null,{noAnon:true});
  console.log('L backend', await L.evaluate(()=>[JSON.stringify(window.KS_BACKEND), document.getElementById('ksFbBadge').textContent]));
  await L.evaluate(()=>cloudSyncNow(true)); await L.waitForTimeout(600);
  console.log('live keys', Object.keys(store).filter(k=>!k.startsWith('envs/')).slice(0,6));
  await A.screenshot({path:OUT+'fb_pc.png'});
  console.log('errs',errs); console.log('console',cons.slice(0,15)); await b.close();
})();

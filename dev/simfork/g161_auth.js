const { chromium } = require('/home/claude/.npm-global/lib/node_modules/@playwright/mcp/node_modules/playwright');
const fs=require('fs'); const FAKE=fs.readFileSync('/home/claude/tests/fakefb.js','utf8'); const GAME=fs.readFileSync('/home/claude/game.html','utf8');
const OUT='/tmp/claude-0/-home-claude-kingdom-strategy/ea8aa5cd-2a55-5679-b734-73d165c6f3b7/scratchpad/'; fs.mkdirSync(OUT,{recursive:true});
const store={}; const call=require('/home/claude/tests/fnrunner.js')(store);
(async () => {
  const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args: ['--no-sandbox'] });
  const errs=[], cons=[];
  async function ctxNew(tag, vp){ const ctx=await b.newContext({ viewport: vp||{width:430,height:932} });
    await ctx.exposeFunction('__fbstore',(op,k,v)=>{ if(op==='set') store[k]=JSON.parse(v); else if(op==='del') delete store[k]; return JSON.stringify(store); });
    await ctx.exposeFunction('__fbcall', call);
    await ctx.route(/mojojo82\.github\.io/, r=> r.fulfill({status:200, contentType:'text/html', body:GAME}));
    await ctx.route(/gstatic\.com\/firebasejs\/.*firebase-app-compat\.js/, r=>r.fulfill({status:200, contentType:'application/javascript', body:FAKE}));
    await ctx.route(/gstatic\.com\/firebasejs\/.*(auth|firestore|functions)-compat\.js/, r=>r.fulfill({status:200, contentType:'application/javascript', body:''}));
    const p=await ctx.newPage(); p.on('pageerror',e=>errs.push(tag+': '+e.message)); p.on('console',m=>{ const t=m.text(); if(m.type()==='error'||/server|wallet|claim|Firebase/i.test(t)) cons.push(tag+': '+t.slice(0,160)); });
    return p; }
  const T='https://mojojo82.github.io/kingdom-strategy/test/';
  const A=await ctxNew('A',{width:1400,height:900});
  // old anonymous-era local data that must NOT leak into the new account
  await A.goto(T); await A.evaluate(()=>{ localStorage.setItem('kingdom_prototype_save_v1','{"gems":99999}'); }); await A.reload();
  await A.waitForSelector('#ksAuth', {timeout:15000});
  console.log('1. sign-in screen shown:', await A.isVisible('#ksAuth .box'), '| game player id before sign-in:', await A.evaluate(()=>typeof PLAYER_ID!=='undefined'?PLAYER_ID:'?'));
  await A.fill('#ksE','alice@test.dev'); await A.fill('#ksP','123'); await A.click('#ksUp'); await A.waitForTimeout(400);
  console.log('   weak password message:', await A.textContent('#ksM'));
  await A.fill('#ksP','secret123'); await A.click('#ksUp');
  await A.waitForSelector('#ksN', {timeout:15000}); // reloaded, now asks for a name
  console.log('2. old local save wiped:', await A.evaluate(()=>!/99999/.test(localStorage.getItem('kingdom_prototype_save_v1')||'')));
  await A.fill('#ksN','Alice'); await A.click('#ksGo'); await A.waitForTimeout(5000);
  const st=await A.evaluate(()=>({ pid: PLAYER_ID, uid: KS_BACKEND.uid, name: getPlayerName(), badge: document.getElementById('ksFbBadge').textContent, gems: game.state.gems, devIcons: getComputedStyle(document.querySelector('.idle-util-icons')||document.body).display }));
  console.log('3. signed in:', JSON.stringify(st));
  // level gems paid by the server at game pace
  await A.evaluate(()=>{ game.state.idle.levelNum=4; ksClaimLoop(); }); await A.waitForTimeout(1500);
  console.log('4. after 1.5s (3 levels cleared): gems', await A.evaluate(()=>game.state.gems), 'wallet', JSON.stringify(store['envs/test/players/'+st.uid+'/wallet/main']));
  await A.waitForTimeout(9500);
  console.log('   after 11s: gems', await A.evaluate(()=>game.state.gems), 'wallet lvl', store['envs/test/players/'+st.uid+'/wallet/main'].lvl);
  // cheat: edit gems locally + push save
  await A.evaluate(()=>{ game.state.gems=99999; cloudSyncNow(true); }); await A.waitForTimeout(6000);
  console.log('5. local gem edit undone:', await A.evaluate(()=>game.state.gems), '| wallet', store['envs/test/players/'+st.uid+'/wallet/main'].gems);
  // B attacks A, A extinguishes with server gems
  const home=await A.evaluate(()=>game.state.homeTileId);
  const B=await ctxNew('B'); await B.goto(T); await B.waitForSelector('#ksAuth'); await B.click('#ksG'); await B.waitForSelector('#ksN',{timeout:15000}); await B.click('#ksGo'); await B.waitForTimeout(5000);
  const hb=await B.evaluate(h=>hitBase(h), home); console.log('6. B hits A:', JSON.stringify(hb), '| again:', JSON.stringify(await B.evaluate(h=>hitBase(h), home)));
  await A.evaluate(()=>window.__fbNotify()); await A.waitForTimeout(600);
  const g0=await A.evaluate(()=>game.state.gems); await A.evaluate(()=>extinguishMyBase()); await A.waitForTimeout(800);
  console.log('7. A extinguish: gems', g0, '->', await A.evaluate(()=>game.state.gems), '| burning now', await A.evaluate(()=>isBaseBurning(game.state.homeTileId)));
  await A.evaluate(()=>repairMyBase()); await A.waitForTimeout(600); console.log('   repair w/o enough gems -> log:', await A.evaluate(()=>(game.state.log||[])[0] && (game.state.log[0].text||game.state.log[0])));
  // save cadence: a click pushes the save within ~1.5s
  const key='envs/test/players/'+st.uid+'/save/main'; const before=JSON.stringify(store[key]||{}).length;
  await A.evaluate(()=>{ game.state.resources.gold += 12345; }); await A.mouse.click(700,450); await A.evaluate(()=>persist()); await A.waitForTimeout(2200);
  console.log('8. save pushed after click:', (JSON.stringify(store[key]||{}).includes('"gold"')), 'gold in cloud', store[key] && store[key].resources && store[key].resources.gold);
  // same account on a second device loads the cloud save, local junk wiped
  const A2=await ctxNew('A2'); await A2.goto(T); await A2.evaluate(()=>{ localStorage.setItem('__fakeAuth', JSON.stringify({uid:'x',email:'alice@test.dev'})); }); 
  await A2.evaluate(()=>{ localStorage.removeItem('__fakeAuth'); }); await A2.reload(); await A2.waitForSelector('#ksAuth'); await A2.fill('#ksE','alice@test.dev'); await A2.fill('#ksP','secret123'); await A2.click('#ksIn'); await A2.waitForTimeout(7000);
  console.log('9. second device same account: pid matches', await A2.evaluate(u=>PLAYER_ID===u, st.uid), 'gold', await A2.evaluate(()=>game.state.resources.gold), 'name', await A2.evaluate(()=>getPlayerName()), 'name prompt shown?', await A2.isVisible('#ksN').catch(()=>false));
  await A.screenshot({path:OUT+'auth_pc.png'});
  console.log('errs', errs.slice(0,8)); console.log('console', cons.filter(c=>!/Failed to load resource/.test(c)).slice(0,12)); await b.close();
})();

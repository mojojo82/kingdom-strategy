const { chromium } = require('/home/claude/.npm-global/lib/node_modules/@playwright/mcp/node_modules/playwright');
const fs=require('fs'); const FAKE=fs.readFileSync('/home/claude/tests/fakefb.js','utf8'); const GAME=fs.readFileSync('/home/claude/game.html','utf8');
const OUT='/tmp/claude-0/-home-claude-kingdom-strategy/ea8aa5cd-2a55-5679-b734-73d165c6f3b7/scratchpad/';
const store={}; const call=require('/home/claude/tests/fnrunner.js')(store); const C=require('/home/claude/kingdom-strategy/functions/core.js');
(async () => { const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args: ['--no-sandbox'] });
  const errs=[];
  async function open(vp){ const ctx=await b.newContext({ viewport: vp });
    await ctx.exposeFunction('__fbstore',(op,k,v)=>{ if(op==='set') store[k]=JSON.parse(v); else if(op==='del') delete store[k]; return JSON.stringify(store); });
    await ctx.exposeFunction('__fbcall', call);
    await ctx.route(/mojojo82\.github\.io/, r=> r.fulfill({status:200, contentType:'text/html', body:GAME}));
    await ctx.route(/gstatic\.com\/firebasejs\/.*firebase-app-compat\.js/, r=>r.fulfill({status:200, contentType:'application/javascript', body:FAKE}));
    await ctx.route(/gstatic\.com\/firebasejs\/.*(auth|firestore|functions)-compat\.js/, r=>r.fulfill({status:200, contentType:'application/javascript', body:''}));
    const p=await ctx.newPage(); p.on('pageerror',e=>errs.push(e.message)); return p; }
  const T='https://mojojo82.github.io/kingdom-strategy/test/';
  const A=await open({width:1400,height:900}); await A.goto(T); await A.waitForSelector('#ksAuth .box'); await A.fill('#ksE','mia@test.dev'); await A.fill('#ksP','secret123'); await A.click('#ksUp');
  await A.waitForSelector('#ksN',{timeout:15000}); await A.fill('#ksN','Mia'); await A.click('#ksGo'); await A.waitForTimeout(5000);
  const uid=await A.evaluate(()=>PLAYER_ID);
  // admin sends a mail (written as the server would)
  const mail=C.makeMail('Sorry for the downtime','Here is something for your trouble.',{gems:50,food:1000,shards_gareth:5},'adm',Date.now());
  store['envs/test/players/'+uid+'/mail/m1']=mail; await A.evaluate(()=>window.__fbNotify()); await A.waitForTimeout(600);
  const before=await A.evaluate(()=>({badge:document.getElementById('mailBadge').textContent, on:document.getElementById('mailBadge').classList.contains('on'), btn:getComputedStyle(document.getElementById('mailBtn')).display, food:game.state.resources.food, shards:game.state.heroes.gareth.fragments, gems:game.state.gems}));
  console.log('1. new mail -> badge', JSON.stringify(before));
  await A.click('#mailBtn'); await A.waitForTimeout(300); await A.screenshot({path:OUT+'mail_open.png', clip:{x:420,y:40,width:560,height:420}});
  await A.click('[data-claim="m1"]'); await A.waitForTimeout(1500); await A.evaluate(()=>window.__fbNotify()); await A.waitForTimeout(500);
  const after=await A.evaluate(()=>({food:game.state.resources.food, shards:game.state.heroes.gareth.fragments, gems:game.state.gems, applied:Object.keys(game.state.mailApplied||{}), badgeOn:document.getElementById('mailBadge').classList.contains('on'), btn:document.querySelector('#mailList .mc').textContent}));
  console.log('2. claimed ->', JSON.stringify(after));
  console.log('   ledger:', Object.keys(store).filter(k=>k.includes(uid+'/ledger/')).map(k=>store[k].item+' +'+store[k].delta+(store[k].balance!=null?' ='+store[k].balance:'')+' '+store[k].reason).join(' | '));
  const r2=JSON.parse(await call('claimMail', JSON.stringify({env:'test',id:'m1'}), JSON.stringify({uid,token:{firebase:{sign_in_provider:'password'}}})));
  await A.evaluate(()=>ksMailClaim('m1')); await A.waitForTimeout(1200);
  console.log('3. claim again -> dup', r2.data.dup, '| food still', await A.evaluate(()=>game.state.resources.food), '| ledger entries', Object.keys(store).filter(k=>k.includes(uid+'/ledger/')).length);
  console.log('   cloud save has items + marker:', JSON.stringify((({resources,heroes,mailApplied})=>({food:resources.food, shards:heroes.gareth.fragments, marker:Object.keys(mailApplied||{})}))(store['envs/test/players/'+uid+'/save/main'])));
  // crash-mid-claim recovery: server says claimed, save didn't get it
  const m2=C.makeMail('Gift','',{wood:777},'adm',Date.now()); m2.claimedAt=Date.now(); store['envs/test/players/'+uid+'/mail/m2']=m2;
  const w0=await A.evaluate(()=>game.state.resources.wood); await A.evaluate(()=>window.__fbNotify()); await A.waitForTimeout(1500);
  console.log('4. claimed-but-not-applied mail recovered: wood', w0, '->', await A.evaluate(()=>game.state.resources.wood));
  console.log('errs', errs); await b.close(); })();

const { chromium } = require('/home/claude/.npm-global/lib/node_modules/@playwright/mcp/node_modules/playwright');
const fs=require('fs'); const FAKE=fs.readFileSync('/home/claude/tests/fakefb.js','utf8'); const GAME=fs.readFileSync('/home/claude/game.html','utf8');
const OUT='/tmp/claude-0/-home-claude-kingdom-strategy/ea8aa5cd-2a55-5679-b734-73d165c6f3b7/scratchpad/';
const store={}; const call=require('/home/claude/tests/fnrunner.js')(store); const C=require('/home/claude/kingdom-strategy/functions/core.js');
(async () => { const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args: ['--no-sandbox'] });
  for (const [tag,vp] of [['phone',{width:390,height:844}],['pc',{width:1400,height:900}]]) {
    const ctx=await b.newContext({ viewport: vp, deviceScaleFactor: tag==='phone'?2:1 });
    await ctx.exposeFunction('__fbstore',(op,k,v)=>{ if(op==='set') store[k]=JSON.parse(v); else if(op==='del') delete store[k]; return JSON.stringify(store); });
    await ctx.exposeFunction('__fbcall', call);
    await ctx.route(/mojojo82\.github\.io/, r=> r.fulfill({status:200, contentType:'text/html', body:GAME}));
    await ctx.route(/gstatic\.com\/firebasejs\/.*firebase-app-compat\.js/, r=>r.fulfill({status:200, contentType:'application/javascript', body:FAKE}));
    await ctx.route(/gstatic\.com\/firebasejs\/.*(auth|firestore|functions)-compat\.js/, r=>r.fulfill({status:200, contentType:'application/javascript', body:''}));
    const p=await ctx.newPage(); const errs=[]; p.on('pageerror',e=>errs.push(e.message));
    await p.goto('https://mojojo82.github.io/kingdom-strategy/test/'); await p.waitForSelector('#ksAuth .box'); await p.fill('#ksE',tag+'@t.dev'); await p.fill('#ksP','secret123'); await p.click('#ksUp');
    await p.waitForSelector('#ksN',{timeout:15000}); await p.fill('#ksN',tag); await p.click('#ksGo'); await p.waitForTimeout(5000);
    const uid=await p.evaluate(()=>PLAYER_ID);
    const ns=await p.evaluate(()=>{ try{ setScreen('world'); }catch(e){} const b=document.getElementById('mapMailBtn'); return getComputedStyle(b).display+' '+b.querySelector('.mmi').textContent; });
    store['envs/test/players/'+uid+'/mail/m1']=C.makeMail('Gift','',{gems:5},'adm',Date.now()); await p.evaluate(()=>window.__fbNotify()); await p.waitForTimeout(800);
    const st=await p.evaluate(()=>{ const b=document.getElementById('mapMailBtn'), r=b.getBoundingClientRect(); const top=document.elementFromPoint(r.x+r.width/2, r.y+r.height/2); const cp=document.getElementById('chatPreview').getBoundingClientRect(), fb=document.getElementById('ksFbBadge').getBoundingClientRect(), nav=(document.querySelector('#bottomNav,.bottom-nav,#tabbar')||{getBoundingClientRect:()=>({top:9999})}).getBoundingClientRect(); return { aboveChat: r.bottom<=cp.top || cp.height===0, badgeAboveNav: fb.bottom<=nav.top, icon:b.querySelector('.mmi').textContent, badge:document.getElementById('mapMailBadge').textContent, rect:[r.x|0,r.y|0,r.width|0,r.height|0], clickable: b.contains(top) || top===b, topEl: top && (top.id||top.className) }; });
    await p.screenshot({path:OUT+'mapmail_'+tag+'.png'});
    await p.click('#mapMailBtn', {timeout:5000}); await p.waitForTimeout(300); const opened=await p.evaluate(()=>document.body.classList.contains('mail-open') && !!document.querySelector('#mailList [data-claim]'));
    console.log(tag, 'before mail:', ns, '| with mail:', JSON.stringify(st), '| opens inbox:', opened, errs);
    await ctx.close(); }
  await b.close(); })();

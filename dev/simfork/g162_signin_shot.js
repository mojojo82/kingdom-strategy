const { chromium } = require('/home/claude/.npm-global/lib/node_modules/@playwright/mcp/node_modules/playwright');
const fs=require('fs'); const FAKE=fs.readFileSync('/home/claude/tests/fakefb.js','utf8'); const GAME=fs.readFileSync('/home/claude/game.html','utf8');
const OUT='/tmp/claude-0/-home-claude-kingdom-strategy/ea8aa5cd-2a55-5679-b734-73d165c6f3b7/scratchpad/'; const store={};
(async () => { const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args: ['--no-sandbox'] });
  for (const [n,vp] of [['phone',{width:390,height:844}],['pc',{width:1400,height:900}]]) { const ctx=await b.newContext({ viewport:vp, deviceScaleFactor:2 });
    await ctx.exposeFunction('__fbstore',(op,k,v)=>{ if(op==='set') store[k]=JSON.parse(v); else if(op==='del') delete store[k]; return JSON.stringify(store); });
    await ctx.exposeFunction('__fbcall', async()=>'{}');
    await ctx.route(/mojojo82\.github\.io/, r=> r.fulfill({status:200, contentType:'text/html', body:GAME}));
    await ctx.route(/gstatic\.com\/firebasejs\/.*firebase-app-compat\.js/, r=>r.fulfill({status:200, contentType:'application/javascript', body:FAKE}));
    await ctx.route(/gstatic\.com\/firebasejs\/.*(auth|firestore|functions)-compat\.js/, r=>r.fulfill({status:200, contentType:'application/javascript', body:''}));
    const p=await ctx.newPage(); await p.goto('https://mojojo82.github.io/kingdom-strategy/'); await p.waitForSelector('#ksAuth .box'); await p.waitForTimeout(800);
    await p.screenshot({path:OUT+'signin_'+n+'.png'}); await ctx.close(); }
  await b.close(); })();

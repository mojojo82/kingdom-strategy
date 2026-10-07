const { chromium } = require('/home/claude/.npm-global/lib/node_modules/@playwright/mcp/node_modules/playwright');
const fs=require('fs'); const MOCK=fs.readFileSync('/home/claude/tests/mockdb.js','utf8');
const OUT='/tmp/claude-0/-home-claude-kingdom-strategy/ea8aa5cd-2a55-5679-b734-73d165c6f3b7/scratchpad/';
const store={}; const T0=1790000000000;
for (let i=0;i<350;i++) store['worldchat/'+(T0+i*60000)+'_px']={pid:'px',name:'Old Timer',text:'world msg #'+i,ts:T0+i*60000};
store['alliances/a1']={name:'Chatty',tag:'CHT',leader:'pC',joinMode:'open',minPower:0,minTH:1,memberCount:1};
store['alliances/a1/members/pC']={rank:5,name:'Cee',power:1,th:1}; store['allyindex/pC']={aid:'a1',tag:'CHT',rank:5};
for (let i=0;i<250;i++) store['alliances/a1/chat/'+(T0+i*60000)+'_px']={pid:'px',name:'Ally',text:'ally msg #'+i,ts:T0+i*60000};
(async () => { const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args: ['--no-sandbox'] });
  const ctx=await b.newContext({ viewport:{width:1400,height:900} });
  await ctx.exposeFunction('__store',(op,k,v)=>{ if(op==='set') store[k]=JSON.parse(v); else if(op==='del') delete store[k]; return JSON.stringify(store); });
  await ctx.addInitScript(`localStorage.setItem('kingdom_prototype_playerid_v1','pC');`+MOCK);
  const p=await ctx.newPage(); const errs=[]; p.on('pageerror',e=>errs.push(e.message)); await p.goto('file:///home/claude/game.html'); await p.waitForTimeout(4500);
  const state=()=>p.evaluate(()=>{ const el=document.getElementById('chatMessages'); const t=[...el.querySelectorAll('.chat-msg .chat-text')]; const vis=t.find(x=>{ const r=x.getBoundingClientRect(), R=el.getBoundingClientRect(); return r.top>=R.top; });
    return { n:t.length, first:t[0]&&t[0].textContent, last:t[t.length-1]&&t[t.length-1].textContent, header:(el.querySelector('.chat-older')||{}).textContent||'', topVisible: vis&&vis.textContent }; });
  async function scrollUpUntilDone(tag){ for (let k=0;k<6;k++){ const before=await state(); await p.evaluate(()=>{ const el=document.getElementById('chatMessages'); el.scrollTop=0; el.dispatchEvent(new Event('scroll')); }); await p.waitForTimeout(700); const s=await state(); console.log(tag,'scroll-up',k+1,'->',JSON.stringify({n:s.n,first:s.first,header:s.header,stillReading:s.topVisible,wasFirst:before.first})); if(/Start of chat/.test(s.header)) break; } }
  await p.evaluate(()=>{ chatTab='world'; renderWorldChat(); const el=document.getElementById('chatMessages'); el.scrollTop=el.scrollHeight; }); await p.waitForTimeout(400);
  console.log('world initial', JSON.stringify(await state()));
  await scrollUpUntilDone('world');
  await p.evaluate(()=>{ chatTab='alliance'; renderWorldChat(); const el=document.getElementById('chatMessages'); el.scrollTop=el.scrollHeight; }); await p.waitForTimeout(400);
  console.log('ally initial', JSON.stringify(await state()));
  await scrollUpUntilDone('ally');
  // new message still arrives live at the bottom after history loaded
  await p.evaluate(()=>{ chatTab='world'; renderWorldChat(); document.getElementById('worldChatInput').value='fresh one'; sendWorldChatMessage(); }); await p.waitForTimeout(600); await p.evaluate(()=>window.__mockNotify()); await p.waitForTimeout(500);
  const s=await state(); console.log('after new msg: total', s.n, 'last', s.last, '#250 present:', await p.evaluate(()=>getChatMessages().some(m=>m.text==='world msg #250')));
  await p.screenshot({path:OUT+'chat_older.png', clip:{x:0,y:60,width:340,height:420}});
  console.log('errs',errs); await b.close(); })();

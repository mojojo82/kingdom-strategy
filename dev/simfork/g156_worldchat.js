const { chromium } = require('/home/claude/.npm-global/lib/node_modules/@playwright/mcp/node_modules/playwright');
const fs=require('fs'); const MOCK=fs.readFileSync('/home/claude/tests/mockdb.js','utf8');
const OUT='/tmp/claude-0/-home-claude/ea8aa5cd-2a55-5679-b734-73d165c6f3b7/scratchpad/blur/';
const store={};
(async () => {
  const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args: ['--no-sandbox'] });
  const pages=[]; const errs=[];
  async function mk(pid,name,vp){ const ctx=await b.newContext({ viewport:vp });
    await ctx.exposeFunction('__store',(op,k,v)=>{ if(op==='set') store[k]=JSON.parse(v); else if(op==='del') delete store[k]; return JSON.stringify(store); });
    await ctx.addInitScript(`localStorage.setItem('kingdom_prototype_playerid_v1','${pid}');`+MOCK);
    const p=await ctx.newPage(); p.on('pageerror',e=>errs.push(pid+': '+e.message)); await p.goto('file:///home/claude/game.html'); await p.waitForTimeout(3500);
    await p.evaluate(n=>setPlayerName(n),name); pages.push(p); return p; }
  const A=await mk('pA','Alice',{width:1400,height:900}), B=await mk('pB','Bob',{width:430,height:932});
  const sync=async()=>{ for(const p of pages) await p.evaluate(()=>window.__mockNotify()); await A.waitForTimeout(300); };
  console.log('on', await A.evaluate(()=>WCHAT.on), await B.evaluate(()=>WCHAT.on));
  await A.evaluate(()=>{ document.getElementById('worldChatInput').value='Hello realm from Alice'; sendWorldChatMessage(); });
  await sync();
  await B.evaluate(()=>{ chatTab='world'; setScreen('more','chat'); document.getElementById('worldChatInput').value='Hi Alice, Bob here'; sendWorldChatMessage(); });
  await B.evaluate(()=>{ document.getElementById('worldChatInput').value='spam'; sendWorldChatMessage(); }); // within 1.5s -> blocked
  await B.waitForTimeout(1600); await B.evaluate(()=>shareTileToChat(game.state.homeTileId));
  await sync();
  for (const [n,p] of [['A',A],['B',B]]) console.log(n, await p.evaluate(()=>getChatMessages().map(m=>m.name+':'+m.text+(m.loc?'@'+m.loc:'')+(m.pid===PLAYER_ID?' (own)':''))));
  console.log('A DOM own flags', await A.evaluate(()=>[...document.querySelectorAll('#chatMessages .chat-msg')].map(e=>e.classList.contains('own')?1:0).join('')));
  console.log('docs', Object.keys(store).filter(k=>k.includes('worldchat')).length);
  await A.screenshot({path:OUT+'wc_pc.png', clip:{x:0,y:60,width:340,height:840}});
  await B.screenshot({path:OUT+'wc_phone.png'});
  console.log('errs',errs); await b.close();
})();

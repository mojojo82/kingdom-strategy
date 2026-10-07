const { chromium } = require('/home/claude/.npm-global/lib/node_modules/@playwright/mcp/node_modules/playwright');
const fs=require('fs'); const MOCK=fs.readFileSync('/home/claude/tests/mockdb.js','utf8');
const OUT='/tmp/claude-0/-home-claude/ea8aa5cd-2a55-5679-b734-73d165c6f3b7/scratchpad/prov/';
const store={};
(async () => {
  const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args: ['--no-sandbox'] });
  const pages=[]; const errs=[];
  async function mk(pid,name){ const ctx=await b.newContext({ viewport:{width:430,height:932} });
    await ctx.exposeFunction('__store',(op,k,v)=>{ if(op==='set') store[k]=JSON.parse(v); else if(op==='del') delete store[k]; return JSON.stringify(store); });
    await ctx.addInitScript(`localStorage.setItem('kingdom_prototype_playerid_v1','${pid}');`+MOCK);
    const p=await ctx.newPage(); p.on('pageerror',e=>errs.push(pid+': '+e.message)); await p.goto('file:///home/claude/game.html'); await p.waitForTimeout(3500);
    await p.evaluate(n=>{ try{ setPlayerName && setPlayerName(n);}catch(e){} },name); pages.push(p); return p; }
  const A=await mk('pA','Alice'), B=await mk('pB','Bob');
  const sync=async()=>{ for(const p of pages) await p.evaluate(()=>window.__mockNotify()); await A.waitForTimeout(300); };
  console.log('ids', await A.evaluate(()=>[PLAYER_ID, !!cloudDb, allySyncStarted]), await B.evaluate(()=>[PLAYER_ID, !!cloudDb, allySyncStarted]));
  // Alice creates
  console.log('create', await A.evaluate(()=>createAlliance('Iron Wolves','wolf')));
  await sync();
  console.log('A my', await A.evaluate(()=>JSON.stringify(ALLY.my)), 'B list', await B.evaluate(()=>Object.values(ALLY.list).map(a=>a.tag+':'+a.joinMode)));
  // Bob requests (approval)
  const aid = await B.evaluate(()=>Object.keys(ALLY.list)[0]);
  console.log('B join', await B.evaluate(a=>joinAlliance(a),aid)); await sync();
  console.log('A requests', await A.evaluate(()=>Object.keys(ALLY.requests)));
  console.log('A accept', await A.evaluate(()=>acceptJoinRequest('pB'))); await sync();
  console.log('B my', await B.evaluate(()=>JSON.stringify(ALLY.my)), 'members', await A.evaluate(()=>Object.entries(ALLY.members).map(([k,v])=>k+':R'+v.rank).join(',')));
  // promote, chat
  console.log('promote', await A.evaluate(()=>setMemberRank('pB',4))); await sync();
  console.log('B rank', await B.evaluate(()=>myRank()));
  await B.evaluate(()=>sendAllianceChat('hello wolves')); await sync();
  console.log('A chat', await A.evaluate(()=>ALLY.chat.map(c=>c.name+': '+c.text)));
  // settings by R4
  console.log('B settings', await B.evaluate(()=>saveAllianceSettings({joinMode:'open',minPower:5,minTH:1}))); await sync();
  console.log('mode', await A.evaluate(()=>ALLY.alliance && ALLY.alliance.joinMode+'/'+ALLY.alliance.minPower));
  // friendly fire: place Bob's city and check isAlly + card
  const bHome = await B.evaluate(()=>game.state.homeTileId);
  console.log('isAlly', await A.evaluate(h=>{ occupiedTileIds[h]='pB'; return isAlly('pB'); }, bHome));
  // ally burning + free extinguish
  await A.evaluate(h=>hitBase(h), bHome); await sync(); console.log('B burning before', await B.evaluate(h=>isBaseBurning(h), bHome), await A.evaluate(h=>isBaseBurning(h), bHome));
  const card = await A.evaluate(async h=>{ setScreen('world'); selectedTile=h; renderTileInfo(); await new Promise(r=>setTimeout(r,200)); return document.getElementById('tileinfo').textContent.replace(/\s+/g,' ').slice(0,200); }, bHome);
  console.log('ally card', card);
  await A.evaluate(()=>document.getElementById('ticAllyExt') && document.getElementById('ticAllyExt').click()); await sync();
  console.log('B burning after ally extinguish', await B.evaluate(h=>{ return isBaseBurning(h); }, bHome));
  // attack an ally via resolver -> no battle
  const rep = await A.evaluate(async h=>{ const m={id:4242,army:{infantry:10},tileId:h,action:'attack',status:'resolving',heroKeys:[],arriveAt:Date.now()}; await resolveMarchAgainstSharedWorld(m); return (game.state.battleReports.find(r=>r.marchId===4242)||{}).note; }, bHome);
  console.log('ally attack', rep);
  // UI screenshot of alliance panel for B (R4)
  await B.evaluate(()=>setScreen('more','alliance')); await B.waitForTimeout(300);
  await B.screenshot({path:OUT+'ally_panel.png'});
  await B.evaluate(()=>{ chatTab='alliance'; setScreen('more','chat'); renderWorldChat(); }); await B.waitForTimeout(300); await B.screenshot({path:OUT+'ally_chat.png'});
  // leave: Bob leaves, then Alice disbands
  console.log('B leave', await B.evaluate(()=>leaveAlliance())); await sync();
  console.log('A disband', await A.evaluate(()=>leaveAlliance())); await sync();
  console.log('after', await A.evaluate(()=>[JSON.stringify(ALLY.my), Object.keys(ALLY.list).length]), Object.keys(store).filter(k=>/allian|allyindex/.test(k)));
  console.log('errs', errs.slice(0,6)); await b.close();
})();

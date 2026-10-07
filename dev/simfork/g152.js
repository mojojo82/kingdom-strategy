const { chromium } = require('/home/claude/.npm-global/lib/node_modules/@playwright/mcp/node_modules/playwright');
const OUT='/tmp/claude-0/-home-claude/ea8aa5cd-2a55-5679-b734-73d165c6f3b7/scratchpad/prov/';
(async () => {
  const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args: ['--no-sandbox'] });
  const p = await b.newPage({ viewport: { width: 430, height: 932 } }); const errs=[]; p.on('pageerror',e=>errs.push(e.message));
  await p.goto('file:///home/claude/game.html'); await p.waitForTimeout(1500);
  console.log(await p.evaluate(async()=>{
    const out={};
    out.forms=game.state.formations.map(f=>f.name+(f.guard?'(G)':'')).join('|'); out.slots=game.marchSlots? game.marchSlots():'-';
    // math
    const t0=1e12; const r={hp:10000,hpT:t0,burnLeft:3000};
    out.burn=[0,60,3000*3,3000*3+3600].map(s=>{const h=baseHpAt(r,t0+s*1000);return Math.round(h.hp)+(h.burning?'B':'')}).join(',');
    // defender selection from own save
    game.state.troops.infantry=500; game.state.formations[3].troops={infantry:200,archer:0,cavalry:0};
    let save=JSON.parse(JSON.stringify(stateForOwnSave()));
    save.guardOn=false; out.off=JSON.stringify(defenderFromSave(save,{cityGuard:true}).undefended);
    save.guardOn=true; const d=defenderFromSave(save,{cityGuard:true}); out.on=JSON.stringify(d.army)+' und:'+!!d.undefended;
    const legacy=JSON.parse(JSON.stringify(save)); legacy.formations=legacy.formations.slice(0,3); delete legacy.guardOn; legacy.formations[0].troops={infantry:100}; out.legacy=JSON.stringify(defenderFromSave(legacy,{cityGuard:true}).army);
    // undefended attack outcome on a fake enemy city tile
    const tile='5,5'; occupiedTileIds[tile]='bot_x';
    const m={id:999,army:{infantry:50},tileId:tile,action:'attack',status:'resolving',heroKeys:[],arriveAt:Date.now()};
    await cityAttackOutcome(game,m,{army:{},heroKeys:[],undefended:true},'bot_x',()=>null);
    const rep=game.state.battleReports[0]; out.report=JSON.stringify({win:rep.win,und:rep.undefended,hit:rep.baseHit,left:rep.baseHpLeft});
    out.burning=isBaseBurning(tile);
    // zero it
    for(let i=0;i<10;i++){ const m2=Object.assign({},m,{id:1000+i}); await cityAttackOutcome(game,m2,{army:{},heroKeys:[],undefended:true},'bot_x',()=>null); }
    const r2=game.state.battleReports[0]; out.after10=JSON.stringify({left:r2.baseHpLeft,zero:r2.baseZeroed, hp:Math.round(baseHpNow(tile).hp), burning:isBaseBurning(tile)});
    // own base: hit, extinguish, repair
    game.state.gems=1000; const home=game.state.homeTileId; await hitBase(home);
    const b1=baseHpNow(home); extinguishMyBase(); const b2=baseHpNow(home); repairMyBase(); const b3=baseHpNow(home);
    out.own=[Math.round(b1.hp)+(b1.burning?'B':''),Math.round(b2.hp)+(b2.burning?'B':''),Math.round(b3.hp),game.state.gems].join(' -> ');
    // raid apply
    game.state.lastRaidApplied=0; applyRaidIfNew(Date.now()); out.raidNote=game.state.battleReports[0].note.slice(0,80);
    return JSON.stringify(out,null,1); }));
  // UI: formations screen + march buttons + own card
  await p.evaluate(()=>{ hitBase(game.state.homeTileId); setScreen('heroes'); });
  const ui = await p.evaluate(async()=>{ renderFormations(); const cards=[...document.querySelectorAll('.formation-card')].map(c=>c.querySelector('.formation-actions button:last-child').textContent);
    setScreen('world'); selectedTile=game.state.homeTileId; renderTileInfo(); await new Promise(r=>setTimeout(r,300));
    const card=document.getElementById('tileinfo').innerText.replace(/\s+/g,' ').slice(0,300);
    selectedTile='5,5'; renderTileInfo(); await new Promise(r=>setTimeout(r,300)); const btns=document.querySelectorAll('.formation-attack-btn').length;
    return {cards, card, attackBtns: btns}; });
  console.log(JSON.stringify(ui,null,1)); console.log(errs); await b.close();
})();

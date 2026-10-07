const { chromium } = require('/home/claude/.npm-global/lib/node_modules/@playwright/mcp/node_modules/playwright');
(async () => {
  const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args: ['--no-sandbox'] });
  const p = await b.newPage({ viewport: { width: 420, height: 800 } });
  const errs=[]; p.on('pageerror',e=>errs.push(e.message)); p.on('console',m=>{ if(m.type()==='error') errs.push('C:'+m.text()); });
  await p.goto('file:///home/claude/game.html'); await p.waitForTimeout(2500);
  const r = await p.evaluate(async () => {
    const store={}; const dbm={ doc(path){ return { get:async()=>({exists:path in store,data:()=>store[path]&&JSON.parse(JSON.stringify(store[path]))}), set:async d=>{store[path]=JSON.parse(JSON.stringify(d));}, update:async d=>{store[path]=Object.assign(store[path]||{},JSON.parse(JSON.stringify(d)));}, delete:async()=>{delete store[path];}, acquire:async()=>({acquired:true}) }; }, collection(){return {onSnapshot(){},get:async()=>({docs:[]})};} };
    cloudDb=dbm; PLAYER_ID='A'; worldMarchesReady=true;
    const st=game.state; const home=tileXY(st.homeTileId);
    const t=st.map.filter(x=>x.type==='npc'||x.type==='resource').sort((a,b)=>Math.hypot(a.x-home[0],a.y-home[1])-Math.hypot(b.x-home[0],b.y-home[1]))[0];
    const out={tile:t.id,type:t.type,garrisonBefore:t.garrison?JSON.stringify(t.garrison).length:0,amt:t.amountLeft};
    const k=Object.keys(TROOP_DEFS)[0];
    // player B's save (reuse this game's state as a stand-in) with troops
    const bs=JSON.parse(JSON.stringify(Object.assign({},st,{map:undefined}))); bs.troops[k]=500; store['players/B/save/main']=bs;
    const T=Date.now();
    worldMarches['B_1']={ownerId:'B',mid:1,tileId:t.id,homeTileId:st.homeTileId,action:t.type==='npc'?'attack':'gather',travelSec:300,arriveAt:T-120000,actionEnd:T-115000,returnAt:T+185000,army:{[k]:200},heroKeys:[],resolved:false};
    store['marches/B_1']=JSON.parse(JSON.stringify(worldMarches['B_1']));
    out.visibleAsShip=foreignMarchList(T).map(m=>m.status);
    lastForeignSweep=0; foreignResolveSweep(); await new Promise(r=>setTimeout(r,2500));
    const rec=store['marches/B_1']; out.rec={resolved:rec.resolved,by:rec.resolvedBy,loot:rec.result&&rec.result.loot,win:rec.report&&rec.report.win,armyAfter:rec.army,rep:!!rec.report};
    const t2=st.map.find(x=>x.id===t.id); out.amtAfter=t2.amountLeft; out.garrAfter=t2.garrison?1:0;
    out.chunk=Object.keys(store).filter(x=>x.includes('chunks'));
    // owner-side: A has its own outbound march already fought by B
    store['players/A']=1; 
    st.troops[k]=100; const res=game.sendMarch({[k]:50},t.id,t.type==='npc'?'attack':'gather',[]); const m=st.marches[0]; m.arriveAt=T-60000;
    worldMarches['A_'+m.id]={ownerId:'A',mid:m.id,tileId:t.id,homeTileId:st.homeTileId,action:m.action,travelSec:m.travelSec,arriveAt:m.arriveAt,actionEnd:m.arriveAt+5000,returnAt:m.arriveAt+5000+m.travelSec*1000,army:{[k]:40},heroKeys:[],resolved:true,resolvedBy:'B',result:{loot:{gold:7}},report:{marchId:m.id,win:true,woundedSent:{[k]:2},tileId:t.id}};
    game.tick(); processMarchResolutions(); await new Promise(r=>setTimeout(r,300));
    out.adopted={status:m.status,army:m.army[k],reportTop:st.battleReports[0]&&st.battleReports[0].marchId===m.id,wounded:st.wounded[k]};
    // publish own march
    const m2=game.sendMarch({[k]:10},t.id,t.type==='npc'?'attack':'gather',[]); syncMyMarchRecords(); await new Promise(r=>setTimeout(r,300)); out.myrec=Object.keys(store).filter(x=>x.startsWith('marches/A')); st.marches.length=0; syncMyMarchRecords(); await new Promise(r=>setTimeout(r,300)); out.afterHome=Object.keys(store).filter(x=>x.startsWith('marches/A'));
    return out;
  });
  console.log(JSON.stringify(r,null,1)); console.log(errs); await b.close();
})();

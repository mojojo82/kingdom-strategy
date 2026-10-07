const { chromium } = require('/home/claude/.npm-global/lib/node_modules/@playwright/mcp/node_modules/playwright');
(async () => {
  const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args: ['--no-sandbox'] });
  const p = await b.newPage({ viewport: { width: 420, height: 800 } });
  const errs=[]; p.on('pageerror',e=>errs.push(e.message));
  await p.goto('file:///home/claude/game.html'); await p.waitForTimeout(2500);
  const r = await p.evaluate(async () => {
    const store={}; cloudDb={ doc(path){ return { get:async()=>({exists:path in store,data:()=>store[path]&&JSON.parse(JSON.stringify(store[path]))}), set:async d=>{store[path]=JSON.parse(JSON.stringify(d));}, update:async d=>{store[path]=Object.assign(store[path]||{},JSON.parse(JSON.stringify(d)));}, delete:async()=>{delete store[path];}, acquire:async()=>({acquired:true}) }; }, collection(){return {onSnapshot(){},get:async()=>({docs:[]})};} };
    PLAYER_ID='A'; worldMarchesReady=true;
    const st=game.state; const k=Object.keys(TROOP_DEFS)[0];
    const bs=JSON.parse(JSON.stringify(Object.assign({},st,{map:undefined}))); bs.troops[k]=800; bs.formations=[]; store['players/B/save/main']=bs;
    const cs=JSON.parse(JSON.stringify(bs)); cs.troops[k]=100; store['players/C/save/main']=cs;
    const tl=st.map.find(x=>x.type==='empty'&&x.id!==st.homeTileId); occupiedTileIds[tl.id]='C';
    const T=Date.now(); const rec={ownerId:'B',mid:1,tileId:tl.id,homeTileId:st.homeTileId,action:'attack',travelSec:300,arriveAt:T-120000,actionEnd:T-115000,returnAt:T+185000,army:{[k]:600},heroKeys:[],resolved:false};
    worldMarches['B_1']=rec; store['marches/B_1']=JSON.parse(JSON.stringify(rec));
    lastForeignSweep=0; foreignResolveSweep(); await new Promise(r=>setTimeout(r,3000));
    const o=store['marches/B_1']; return {resolved:o.resolved,by:o.resolvedBy,win:o.report&&o.report.win,tileType:o.report&&o.report.tileType,atkLoss:o.report&&o.report.attackerLosses,armyAfter:o.army};
  });
  console.log(JSON.stringify(r)); console.log(errs); await b.close();
})();

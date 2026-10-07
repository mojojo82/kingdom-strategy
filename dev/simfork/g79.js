const { chromium } = require('/home/claude/.npm-global/lib/node_modules/@playwright/mcp/node_modules/playwright');
(async () => {
  const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args: ['--no-sandbox'] });
  const p = await b.newPage({ viewport: { width: 420, height: 800 } });
  const errs=[]; p.on('pageerror',e=>errs.push(e.message));
  await p.goto('file:///home/claude/game.html'); await p.waitForTimeout(2000);
  const r = await p.evaluate(async () => {
    const store={}; let snapCb=null;
    cloudDb={ doc(path){ return { set:async d=>{store[path]=JSON.parse(JSON.stringify(d));} }; }, collection(){return {onSnapshot(cb){snapCb=cb;}};} };
    PLAYER_ID='A'; terrainEnsure(); terrainPaint.code=1; terrainPaint.brush=1; terrainPaint.stroke=[]; terrainPaintAt(25,25); terrainPaintAt(45,5);
    terrainFlushCloud(); await new Promise(r=>setTimeout(r,200));
    const keys=Object.keys(store); const out={keys, len:store[keys[0]].s.length, nonzero:store[keys[0]].s.replace(/0/g,'').length};
    // another client's chunk arrives
    terrainArr.fill(0); startTerrainSync();
    const s=Array(400).fill('0'); s[0]='2'; s[21]='1';
    snapCb({docs:[{id:'3_3',exists:true,data:()=>({s:s.join(''),t:1})}]});
    out.applied=[terrainArr[60*200+60],terrainArr[61*200+61]];
    return out;
  });
  console.log(JSON.stringify(r),errs); await b.close();
})();
